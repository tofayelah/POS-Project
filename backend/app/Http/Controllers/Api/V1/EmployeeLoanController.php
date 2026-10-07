<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\EmployeeLoanService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeLoanController extends Controller
{
    public function __construct(
        protected EmployeeLoanService $loanService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $loans = $this->loanService->listLoans($companyId, $request->all());

        return response()->json([
            'success' => true,
            'data' => $loans,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|integer|exists:employees,id',
            'principal_amount' => 'required|numeric|min:0.01',
            'installment_count' => 'required|integer|min:1|max:120',
            'interest_rate_percent' => 'nullable|numeric|min:0|max:100',
            'start_date' => 'nullable|date',
        ]);

        $companyId = (int) $request->attributes->get('company_id');
        $loan = $this->loanService->createLoan($companyId, $validated, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Loan approved successfully.',
            'data' => $loan,
        ], 201);
    }

    public function disburse(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'payment_method' => 'nullable|string|max:50',
        ]);

        $companyId = (int) $request->attributes->get('company_id');
        $loan = $this->loanService->disburseLoan($companyId, $id, $validated, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Loan disbursed successfully and posted to General Ledger.',
            'data' => $loan,
        ]);
    }
}
