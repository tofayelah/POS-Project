<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\BudgetControl;
use App\Services\BudgetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BudgetController extends Controller
{
    public function __construct(
        protected BudgetService $budgetService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $fiscalYearId = $request->query('fiscal_year_id');

        $query = Budget::where('company_id', $companyId)
            ->with(['fiscalYear', 'approver:id,name', 'creator:id,name'])
            ->orderBy('id', 'desc');

        if ($fiscalYearId) {
            $query->where('fiscal_year_id', $fiscalYearId);
        }

        return response()->json([
            'success' => true,
            'data' => $query->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $validated = $request->validate([
            'fiscal_year_id' => 'required|exists:fiscal_years,id',
            'name' => 'required|string|max:255',
            'budget_type' => 'nullable|string|in:ORIGINAL,REVISED,FORECAST,FINAL',
            'version' => 'nullable|integer|min:1',
            'notes' => 'nullable|string',
            'lines' => 'nullable|array',
            'lines.*.account_id' => 'required|exists:accounts,id',
            'lines.*.amount' => 'required|numeric|min:0',
            'lines.*.cost_centre_id' => 'nullable|exists:cost_centres,id',
            'lines.*.profit_centre_id' => 'nullable|exists:profit_centres,id',
            'lines.*.accounting_period_id' => 'nullable|exists:accounting_periods,id',
            'lines.*.notes' => 'nullable|string',
        ]);

        $budget = $this->budgetService->createBudget($companyId, $validated, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Budget created successfully',
            'data' => $budget,
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $budget = Budget::where('company_id', $companyId)
            ->with(['lines.account', 'lines.costCentre', 'lines.profitCentre', 'lines.accountingPeriod', 'fiscalYear', 'approver', 'creator'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $budget,
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'budget_type' => 'nullable|string|in:ORIGINAL,REVISED,FORECAST,FINAL',
            'lines' => 'nullable|array',
            'lines.*.account_id' => 'required|exists:accounts,id',
            'lines.*.amount' => 'required|numeric|min:0',
            'lines.*.cost_centre_id' => 'nullable|exists:cost_centres,id',
            'lines.*.profit_centre_id' => 'nullable|exists:profit_centres,id',
            'lines.*.accounting_period_id' => 'nullable|exists:accounting_periods,id',
            'lines.*.notes' => 'nullable|string',
        ]);

        $budget = $this->budgetService->updateBudget($companyId, $id, $validated, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Budget updated successfully',
            'data' => $budget,
        ]);
    }

    public function submit(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $budget = $this->budgetService->submitBudget($companyId, $id, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Budget submitted for review',
            'data' => $budget,
        ]);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $budget = $this->budgetService->approveBudget($companyId, $id, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Budget approved successfully',
            'data' => $budget,
        ]);
    }

    public function activate(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $budget = $this->budgetService->activateBudget($companyId, $id, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Budget activated successfully',
            'data' => $budget,
        ]);
    }

    public function close(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $budget = $this->budgetService->closeBudget($companyId, $id, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Budget closed successfully',
            'data' => $budget,
        ]);
    }

    public function revise(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $revised = $this->budgetService->createRevisedVersion($companyId, $id, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Revised budget created successfully',
            'data' => $revised,
        ], 201);
    }

    public function budgetVsActual(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $filters = [
            'start_date' => $request->query('start_date'),
            'end_date' => $request->query('end_date'),
        ];

        $report = $this->budgetService->getBudgetVsActual($companyId, $id, $filters);

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    // Budget Controls
    public function getControls(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $controls = BudgetControl::where('company_id', $companyId)
            ->with(['account:id,account_code,account_name', 'costCentre:id,code,name'])
            ->get();

        return response()->json([
            'success' => true,
            'data' => $controls,
        ]);
    }

    public function storeControl(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $validated = $request->validate([
            'account_id' => 'nullable|exists:accounts,id',
            'cost_centre_id' => 'nullable|exists:cost_centres,id',
            'control_action' => 'required|in:ALLOW,WARNING,APPROVAL_REQUIRED,BLOCK',
            'threshold_percentage' => 'required|numeric|min:1|max:500',
            'is_active' => 'boolean',
        ]);

        $validated['company_id'] = $companyId;
        $validated['created_by'] = $request->user()->id;

        $control = BudgetControl::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Budget control rule configured',
            'data' => $control,
        ], 201);
    }

    public function checkControl(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $validated = $request->validate([
            'account_id' => 'required|exists:accounts,id',
            'cost_centre_id' => 'nullable|exists:cost_centres,id',
            'amount' => 'required|numeric|min:0.01',
        ]);

        $result = $this->budgetService->checkBudgetControl(
            $companyId,
            (int) $validated['account_id'],
            isset($validated['cost_centre_id']) ? (int) $validated['cost_centre_id'] : null,
            (float) $validated['amount']
        );

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }
}
