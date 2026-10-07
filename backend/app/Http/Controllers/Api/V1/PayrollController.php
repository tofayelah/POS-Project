<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PayrollItem;
use App\Models\PayrollPeriod;
use App\Models\PayrollRun;
use App\Services\PaymentService;
use App\Services\PayrollCalculationService;
use App\Services\PayrollPostingService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class PayrollController extends Controller
{
    public function __construct(
        protected PayrollCalculationService $calculationService,
        protected PayrollPostingService $postingService,
        protected PaymentService $paymentService
    ) {}

    // Payroll Periods
    public function listPeriods(Request $request): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $periods = $this->calculationService->listPeriods($companyId);

        return response()->json([
            'success' => true,
            'data' => $periods,
        ]);
    }

    public function periods(Request $request): JsonResponse
    {
        return $this->listPeriods($request);
    }

    public function createPeriod(Request $request): JsonResponse
    {
        $data = $request->all();
        $start = $data['period_start'] ?? $data['start_date'] ?? null;
        $end = $data['period_end'] ?? $data['end_date'] ?? null;

        $request->merge([
            'period_start' => $start,
            'period_end' => $end,
        ]);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'period_start' => 'required|date',
            'period_end' => 'required|date|after_or_equal:period_start',
            'payment_due_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $companyId = (int) $request->attributes->get('company_id');
        $period = $this->calculationService->createPeriod($companyId, $validated, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Payroll period created successfully.',
            'data' => $period,
        ], 201);
    }

    public function storePeriod(Request $request): JsonResponse
    {
        return $this->createPeriod($request);
    }

    // Payroll Runs
    public function listRuns(Request $request): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $runs = PayrollRun::where('company_id', $companyId)
            ->with(['period', 'journalEntry'])
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $runs,
        ]);
    }

    public function runs(Request $request): JsonResponse
    {
        return $this->listRuns($request);
    }

    public function createRun(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'payroll_period_id' => 'required|integer|exists:payroll_periods,id',
        ]);

        $companyId = (int) $request->attributes->get('company_id');
        $period = PayrollPeriod::where('company_id', $companyId)->findOrFail($validated['payroll_period_id']);

        $count = PayrollRun::where('company_id', $companyId)->count() + 1;
        $runNumber = 'PAYROLL-' . Carbon::parse($period->period_start)->format('Ym') . '-' . str_pad($count, 3, '0', STR_PAD_LEFT);

        $run = PayrollRun::create([
            'company_id' => $companyId,
            'payroll_period_id' => $period->id,
            'run_number' => $runNumber,
            'status' => 'DRAFT',
            'calculated_by' => $request->user()?->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Payroll run initialized.',
            'data' => $run->load('period'),
        ], 201);
    }

    public function showRun(Request $request, int $id): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $run = PayrollRun::where('company_id', $companyId)
            ->with([
                'period',
                'journalEntry.lines.account',
                'items.employee.department',
                'items.employee.designation',
                'items.employee.branch',
                'calculator',
                'approver',
                'poster',
            ])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $run,
        ]);
    }

    public function calculate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'payroll_period_id' => 'required|integer',
            'branch_id' => 'nullable|integer',
            'department_id' => 'nullable|integer',
            'bonus_amounts' => 'nullable|array',
        ]);

        $companyId = (int) $request->attributes->get('company_id');
        $run = $this->calculationService->calculatePayroll($companyId, $validated['payroll_period_id'], $validated, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Payroll calculated successfully.',
            'data' => $run,
        ]);
    }

    public function calculateRun(Request $request, int $id): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $run = PayrollRun::where('company_id', $companyId)->findOrFail($id);

        $calculatedRun = $this->calculationService->calculatePayroll(
            $companyId,
            $run->payroll_period_id,
            $request->all(),
            $request->user()?->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Payroll calculated successfully.',
            'data' => $calculatedRun,
        ]);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $run = $this->calculationService->approvePayroll($companyId, $id, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Payroll approved successfully.',
            'data' => $run,
        ]);
    }

    public function approveRun(Request $request, int $id): JsonResponse
    {
        return $this->approve($request, $id);
    }

    public function post(Request $request, int $id): JsonResponse
    {
        $idempotencyKey = $request->header('X-Idempotency-Key') ?? $request->input('idempotency_key');
        $companyId = (int) $request->attributes->get('company_id');

        $run = $this->postingService->postPayroll($companyId, $id, $request->user()->id, $idempotencyKey);

        return response()->json([
            'success' => true,
            'message' => 'Payroll posted to General Ledger successfully.',
            'data' => $run,
        ]);
    }

    public function postRun(Request $request, int $id): JsonResponse
    {
        return $this->post($request, $id);
    }

    public function pay(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string|in:CASH,CARD,BANK_TRANSFER,MOBILE_BANKING',
            'payroll_item_id' => 'nullable|integer',
            'reference_number' => 'nullable|string|max:100',
        ]);

        $companyId = (int) $request->attributes->get('company_id');
        $run = PayrollRun::where('company_id', $companyId)->lockForUpdate()->findOrFail($id);

        if ($run->status !== 'POSTED') {
            throw new ConflictHttpException("Cannot disburse salary payment for an unposted payroll run.");
        }

        $amount = (float) $validated['amount'];
        if ($amount > ((float) $run->total_outstanding + 0.0001)) {
            throw new ConflictHttpException("Payment amount exceeds outstanding payroll payable.");
        }

        // If specific item
        if (!empty($validated['payroll_item_id'])) {
            $item = PayrollItem::where('payroll_run_id', $run->id)->findOrFail($validated['payroll_item_id']);
            $item->paid_amount += $amount;
            $item->due_amount = max(0, (float) $item->due_amount - $amount);
            $item->payment_status = $item->due_amount <= 0.0001 ? 'PAID' : 'PARTIAL';
            $item->save();
        }

        $run->total_paid += $amount;
        $run->total_outstanding = max(0, (float) $run->total_outstanding - $amount);
        if ($run->total_outstanding <= 0.0001) {
            $run->status = 'PAID';
            $run->period->update(['status' => 'PAID']);
        }
        $run->save();

        return response()->json([
            'success' => true,
            'message' => 'Salary payment recorded successfully.',
            'data' => $run->fresh(['items', 'period']),
        ]);
    }

    public function settlePayout(Request $request, int $id): JsonResponse
    {
        return $this->pay($request, $id);
    }
}
