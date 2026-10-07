<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\EmployeeAdvanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeAdvanceController extends Controller
{
    public function __construct(
        protected EmployeeAdvanceService $advanceService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $advances = $this->advanceService->listAdvances($companyId, $request->all());

        return response()->json([
            'success' => true,
            'data' => $advances,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|integer|exists:employees,id',
            'amount' => 'required|numeric|min:0.01',
            'request_date' => 'nullable|date',
            'reason' => 'nullable|string|max:500',
        ]);

        $companyId = (int) $request->attributes->get('company_id');
        $advance = $this->advanceService->createAdvance($companyId, $validated, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Advance requested successfully.',
            'data' => $advance,
        ], 201);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $advance = $this->advanceService->approveAdvance($companyId, $id, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Advance approved successfully.',
            'data' => $advance,
        ]);
    }

    public function disburse(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'payment_method' => 'nullable|string|max:50',
        ]);

        $companyId = (int) $request->attributes->get('company_id');
        $advance = $this->advanceService->disburseAdvance($companyId, $id, $validated, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Advance disbursed successfully and posted to General Ledger.',
            'data' => $advance,
        ]);
    }
}
