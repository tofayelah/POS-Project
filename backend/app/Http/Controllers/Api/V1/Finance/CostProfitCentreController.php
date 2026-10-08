<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Http\Controllers\Controller;
use App\Models\CostCentre;
use App\Models\ProfitCentre;
use App\Services\CostProfitCentreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CostProfitCentreController extends Controller
{
    public function __construct(
        protected CostProfitCentreService $costProfitService
    ) {}

    // Cost Centres
    public function indexCostCentres(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $tree = $this->costProfitService->getCostCentresTree($companyId);

        return response()->json([
            'success' => true,
            'data' => $tree,
        ]);
    }

    public function storeCostCentre(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $validated = $request->validate([
            'code' => 'required|string|max:50',
            'name' => 'required|string|max:255',
            'parent_id' => 'nullable|exists:cost_centres,id',
            'description' => 'nullable|string',
            'status' => 'nullable|string|in:ACTIVE,INACTIVE',
            'manager_id' => 'nullable|exists:users,id',
        ]);

        $cc = $this->costProfitService->createCostCentre($companyId, $validated, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Cost centre created successfully',
            'data' => $cc,
        ], 201);
    }

    public function costCentreExpenseReport(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $filters = [
            'start_date' => $request->query('start_date'),
            'end_date' => $request->query('end_date'),
        ];

        $report = $this->costProfitService->getCostCentreExpenseReport($companyId, $filters);

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    // Profit Centres
    public function indexProfitCentres(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $list = $this->costProfitService->getProfitCentres($companyId);

        return response()->json([
            'success' => true,
            'data' => $list,
        ]);
    }

    public function storeProfitCentre(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $validated = $request->validate([
            'code' => 'required|string|max:50',
            'name' => 'required|string|max:255',
            'type' => 'nullable|string|in:RETAIL,WHOLESALE,ECOMMERCE,B2B,BRANCH,BUSINESS_UNIT',
            'business_unit_id' => 'nullable|exists:business_units,id',
            'branch_id' => 'nullable|exists:branches,id',
            'description' => 'nullable|string',
            'status' => 'nullable|string|in:ACTIVE,INACTIVE',
            'manager_id' => 'nullable|exists:users,id',
        ]);

        $pc = $this->costProfitService->createProfitCentre($companyId, $validated, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Profit centre created successfully',
            'data' => $pc,
        ], 201);
    }

    public function profitCentrePerformanceReport(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $filters = [
            'start_date' => $request->query('start_date'),
            'end_date' => $request->query('end_date'),
        ];

        $report = $this->costProfitService->getProfitCentrePerformanceReport($companyId, $filters);

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }
}
