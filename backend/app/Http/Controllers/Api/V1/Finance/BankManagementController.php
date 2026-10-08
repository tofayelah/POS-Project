<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use App\Models\BankStatement;
use App\Models\BankReconciliation;
use App\Services\BankReconciliationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BankManagementController extends Controller
{
    public function __construct(
        protected BankReconciliationService $bankReconciliationService
    ) {}

    // Bank Accounts
    public function indexAccounts(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $accounts = BankAccount::where('company_id', $companyId)
            ->with(['glAccount:id,account_code,account_name', 'creator:id,name'])
            ->get();

        return response()->json([
            'success' => true,
            'data' => $accounts,
        ]);
    }

    public function storeAccount(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $validated = $request->validate([
            'bank_name' => 'required|string|max:255',
            'branch_name' => 'nullable|string|max:255',
            'account_name' => 'required|string|max:255',
            'account_number_masked' => 'required|string|max:50',
            'routing_number' => 'nullable|string|max:50',
            'swift_bic' => 'nullable|string|max:50',
            'currency' => 'nullable|string|max:10',
            'opening_balance' => 'nullable|numeric',
            'account_id' => 'nullable|exists:accounts,id',
        ]);

        $account = $this->bankReconciliationService->createBankAccount($companyId, $validated, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Bank account created successfully',
            'data' => $account,
        ], 201);
    }

    // Bank Statements
    public function indexStatements(Request $request, int $bankAccountId): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $statements = BankStatement::where('company_id', $companyId)
            ->where('bank_account_id', $bankAccountId)
            ->with(['importer:id,name'])
            ->withCount('lines')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $statements,
        ]);
    }

    public function importStatement(Request $request, int $bankAccountId): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $validated = $request->validate([
            'statement_identifier' => 'nullable|string|max:100',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'opening_balance' => 'required|numeric',
            'closing_balance' => 'required|numeric',
            'lines' => 'required|array|min:1',
            'lines.*.transaction_date' => 'required|date',
            'lines.*.value_date' => 'nullable|date',
            'lines.*.description' => 'required|string',
            'lines.*.reference_number' => 'nullable|string|max:100',
            'lines.*.cheque_number' => 'nullable|string|max:50',
            'lines.*.debit' => 'nullable|numeric|min:0',
            'lines.*.credit' => 'nullable|numeric|min:0',
            'lines.*.balance' => 'nullable|numeric',
        ]);

        $statement = $this->bankReconciliationService->importBankStatement($companyId, $bankAccountId, $validated, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Bank statement imported successfully',
            'data' => $statement,
        ], 201);
    }

    // Reconciliations
    public function indexReconciliations(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $recons = BankReconciliation::where('company_id', $companyId)
            ->with(['bankAccount', 'bankStatement', 'completedBy:id,name'])
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $recons,
        ]);
    }

    public function startReconciliation(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $validated = $request->validate([
            'bank_account_id' => 'required|exists:bank_accounts,id',
            'bank_statement_id' => 'nullable|exists:bank_statements,id',
            'reconciliation_date' => 'required|date',
        ]);

        $recon = $this->bankReconciliationService->startReconciliation(
            $companyId,
            (int) $validated['bank_account_id'],
            isset($validated['bank_statement_id']) ? (int) $validated['bank_statement_id'] : null,
            $validated['reconciliation_date'],
            $request->user()->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Reconciliation started',
            'data' => $recon,
        ], 201);
    }

    public function autoMatch(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $result = $this->bankReconciliationService->runAutoMatch($companyId, $id, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => "Auto-match completed: {$result['matched_count']} lines matched",
            'data' => $result,
        ]);
    }

    public function manualMatch(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $validated = $request->validate([
            'bank_statement_line_id' => 'required|exists:bank_statement_lines,id',
            'journal_entry_line_id' => 'nullable|exists:journal_entry_lines,id',
        ]);

        $match = $this->bankReconciliationService->matchManually(
            $companyId,
            $id,
            (int) $validated['bank_statement_line_id'],
            isset($validated['journal_entry_line_id']) ? (int) $validated['journal_entry_line_id'] : null,
            $request->user()->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Manual match recorded',
            'data' => $match,
        ]);
    }

    public function finalize(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $validated = $request->validate([
            'notes' => 'nullable|string',
        ]);

        $recon = $this->bankReconciliationService->finalizeReconciliation($companyId, $id, $validated['notes'] ?? null, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Bank reconciliation finalized successfully',
            'data' => $recon,
        ]);
    }
}
