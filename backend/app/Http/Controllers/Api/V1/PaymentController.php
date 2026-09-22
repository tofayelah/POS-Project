<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Services\PaymentService;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class PaymentController extends Controller
{
    public function __construct(
        protected PaymentService $paymentService
    ) {}

    protected function getCompanyId(Request $request): int
    {
        $companyId = $request->attributes->get('company_id')
            ?? $request->header('X-Company-Id')
            ?? ($request->user() ? $request->user()->company_id : null);

        if (!$companyId) {
            throw new ConflictHttpException("Company context is required.");
        }

        return (int) $companyId;
    }

    public function index(Request $request)
    {
        $companyId = $this->getCompanyId($request);

        $query = Payment::where('company_id', $companyId)
            ->with(['allocations']);

        if ($request->has('payment_type')) {
            $query->where('payment_type', strtoupper($request->payment_type));
        }

        if ($request->has('payment_method')) {
            $query->where('payment_method', strtoupper($request->payment_method));
        }

        if ($request->has('status')) {
            $query->where('status', strtoupper($request->status));
        }

        $payments = $query->orderBy('id', 'desc')->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data' => $payments,
        ]);
    }

    public function store(Request $request)
    {
        $companyId = $this->getCompanyId($request);

        $idempotencyKey = $request->header('Idempotency-Key') ?? $request->input('idempotency_key');
        if (empty($idempotencyKey) || !is_string($idempotencyKey) || trim($idempotencyKey) === '') {
            return response()->json([
                'success' => false,
                'message' => 'The Idempotency-Key header is required for payment creation.',
            ], 422);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'payment_type' => 'required|string|in:CUSTOMER,SUPPLIER,customer,supplier',
            'payment_method' => 'required|string',
            'payment_number' => 'nullable|string|max:100',
            'payment_date' => 'nullable|date',
            'reference_number' => 'nullable|string|max:150',
            'branch_id' => 'nullable|integer',
        ]);

        $validated['idempotency_key'] = trim($idempotencyKey);
        $validated['payment_type'] = strtoupper($validated['payment_type']);
        $validated['payment_method'] = strtoupper($validated['payment_method']);

        try {
            $payment = $this->paymentService->createPayment(
                $companyId,
                $validated,
                $request->user()?->id
            );

            $status = $payment->wasRecentlyCreated ? 201 : 200;
            $message = $payment->wasRecentlyCreated ? 'Payment created successfully' : 'Payment retrieved from idempotent request';

            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => $payment->load('allocations'),
            ], $status);
        } catch (ConflictHttpException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 409);
        }
    }

    public function show(Request $request, $id)
    {
        $companyId = $this->getCompanyId($request);

        $payment = Payment::where('company_id', $companyId)
            ->with(['allocations'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $payment,
        ]);
    }

    public function allocate(Request $request, $id)
    {
        $companyId = $this->getCompanyId($request);

        $validated = $request->validate([
            'allocations' => 'required|array|min:1',
            'allocations.*.allocatable_type' => 'required|string',
            'allocations.*.allocatable_id' => 'required|integer',
            'allocations.*.amount' => 'required|numeric|min:0.01',
        ]);

        $this->paymentService->allocatePayment(
            $companyId,
            (int) $id,
            $validated['allocations'],
            $request->user()?->id
        );

        $payment = Payment::where('company_id', $companyId)
            ->with(['allocations'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Payment allocated successfully',
            'data' => $payment,
        ]);
    }
}
