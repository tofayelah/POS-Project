<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Http\Controllers\Controller;
use App\Services\FinancialReportingAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinancialAnalyticsController extends Controller
{
    public function __construct(
        protected FinancialReportingAnalyticsService $analyticsService
    ) {}

    public function ratios(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $filters = [
            'start_date' => $request->query('start_date'),
            'end_date' => $request->query('end_date'),
        ];

        $ratios = $this->analyticsService->getFinancialRatios($companyId, $filters);

        return response()->json([
            'success' => true,
            'data' => $ratios,
        ]);
    }

    public function forecast(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $method = $request->query('method', 'MOVING_AVERAGE');
        $monthsAhead = $request->query('months_ahead') ? (int) $request->query('months_ahead') : 6;

        $forecast = $this->analyticsService->getDeterministicForecast($companyId, $method, $monthsAhead);

        return response()->json([
            'success' => true,
            'data' => $forecast,
        ]);
    }

    public function telemetry(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $telemetry = $this->analyticsService->getExecutiveDashboardTelemetry($companyId);

        return response()->json([
            'success' => true,
            'data' => $telemetry,
        ]);
    }
}
