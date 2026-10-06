<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\SalesIntelligenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SalesIntelligenceController extends Controller
{
    public function __construct(
        protected SalesIntelligenceService $salesIntelligenceService
    ) {}

    public function dashboard(Request $request): JsonResponse
    {
        $this->authorize('sales_intelligence.view');
        $companyId = $request->attributes->get('company_id');

        $startDate = $request->input('start_date', now()->subDays(30)->toDateString());
        $endDate = $request->input('end_date', now()->toDateString());
        $filters = [
            'date_from' => $startDate,
            'date_to' => $endDate,
        ];

        $customerSales = $this->salesIntelligenceService->getSalesByCustomer($companyId, array_merge($filters, ['limit' => 5]));
        $branchSales = $this->salesIntelligenceService->getSalesByBranch($companyId, $filters);
        $topProducts = $this->salesIntelligenceService->getSalesByProduct($companyId, array_merge($filters, ['limit' => 5]));
        $salespeople = $this->salesIntelligenceService->getSalespersonPerformance($companyId, $filters);
        $returns = $this->salesIntelligenceService->getSalesReturnAnalysis($companyId, $filters);

        return response()->json([
            'success' => true,
            'data' => [
                'period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                ],
                'top_customers' => $customerSales,
                'branch_breakdown' => $branchSales,
                'top_products' => $topProducts,
                'salesperson_leaderboard' => $salespeople,
                'return_metrics' => $returns,
            ],
        ]);
    }

    public function salesByCustomer(Request $request): JsonResponse
    {
        $this->authorize('sales_intelligence.view');
        $companyId = $request->attributes->get('company_id');

        $filters = [
            'date_from' => $request->input('start_date', now()->subDays(30)->toDateString()),
            'date_to' => $request->input('end_date', now()->toDateString()),
            'limit' => (int) $request->input('limit', 20),
        ];
        if ($request->filled('branch_id')) {
            $filters['branch_id'] = (int) $request->input('branch_id');
        }

        $data = $this->salesIntelligenceService->getSalesByCustomer($companyId, $filters);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function salesByBranch(Request $request): JsonResponse
    {
        $this->authorize('sales_intelligence.view');
        $companyId = $request->attributes->get('company_id');

        $filters = [
            'date_from' => $request->input('start_date', now()->subDays(30)->toDateString()),
            'date_to' => $request->input('end_date', now()->toDateString()),
        ];

        $data = $this->salesIntelligenceService->getSalesByBranch($companyId, $filters);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function salesByProduct(Request $request): JsonResponse
    {
        $this->authorize('sales_intelligence.view');
        $companyId = $request->attributes->get('company_id');

        $filters = [
            'date_from' => $request->input('start_date', now()->subDays(30)->toDateString()),
            'date_to' => $request->input('end_date', now()->toDateString()),
            'limit' => (int) $request->input('limit', 20),
        ];

        $data = $this->salesIntelligenceService->getSalesByProduct($companyId, $filters);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function salespersonPerformance(Request $request): JsonResponse
    {
        $this->authorize('sales_intelligence.view');
        $companyId = $request->attributes->get('company_id');

        $filters = [
            'date_from' => $request->input('start_date', now()->subDays(30)->toDateString()),
            'date_to' => $request->input('end_date', now()->toDateString()),
        ];

        $data = $this->salesIntelligenceService->getSalespersonPerformance($companyId, $filters);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function returnsAnalysis(Request $request): JsonResponse
    {
        $this->authorize('sales_intelligence.view');
        $companyId = $request->attributes->get('company_id');

        $filters = [
            'date_from' => $request->input('start_date', now()->subDays(30)->toDateString()),
            'date_to' => $request->input('end_date', now()->toDateString()),
        ];

        $data = $this->salesIntelligenceService->getSalesReturnAnalysis($companyId, $filters);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function demandForecast(Request $request): JsonResponse
    {
        $this->authorize('sales_intelligence.view');
        $companyId = $request->attributes->get('company_id');

        $forecastDays = (int) $request->input('forecast_days', 30);
        $productId = $request->filled('product_id') ? (int) $request->input('product_id') : null;

        $data = $this->salesIntelligenceService->getDemandForecast($companyId, $productId, $forecastDays);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function reorderRecommendations(Request $request): JsonResponse
    {
        $this->authorize('sales_intelligence.view');
        $companyId = $request->attributes->get('company_id');

        $leadTimeDays = (int) $request->input('lead_time_days', 7);
        $bufferDays = (int) $request->input('buffer_days', 14);

        $data = $this->salesIntelligenceService->getProcurementDemandIntegration($companyId, $leadTimeDays, $bufferDays);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }
}
