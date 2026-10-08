<?php

namespace App\Http\Controllers\Api\V1\Bi;

use App\Http\Controllers\Controller;
use App\Services\Bi\BiAnalyticsService;
use App\Services\Bi\BiReportBuilderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BiDashboardController extends Controller
{
    public function __construct(
        protected BiAnalyticsService $biAnalytics,
        protected BiReportBuilderService $reportBuilder
    ) {}

    /**
     * Get Executive Management Dashboard metrics.
     */
    public function executive(Request $request): JsonResponse
    {
        $companyId = $request->attributes->get('company_id') ?? auth()->user()->company_id;
        $filters = $request->only([
            'date_from', 'date_to', 'branch_id', 'warehouse_id', 'business_unit_id', 'channel'
        ]);

        $data = $this->biAnalytics->getExecutiveDashboard($companyId, $filters);

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * Get Executive Sales KPIs.
     */
    public function sales(Request $request): JsonResponse
    {
        $companyId = $request->attributes->get('company_id') ?? auth()->user()->company_id;
        $filters = $request->only(['date_from', 'date_to', 'branch_id', 'channel']);

        $data = $this->biAnalytics->getExecutiveDashboard($companyId, $filters)['sales_kpis'];

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * Get dashboard personalization preferences for current user.
     */
    public function getPreferences(Request $request, string $dashboardKey = 'executive'): JsonResponse
    {
        $companyId = $request->attributes->get('company_id') ?? auth()->user()->company_id;
        $userId = auth()->id();

        $pref = $this->reportBuilder->getDashboardPreference($companyId, $userId, $dashboardKey);

        return response()->json([
            'status' => 'success',
            'data' => $pref,
        ]);
    }

    /**
     * Save dashboard personalization preferences for current user.
     */
    public function savePreferences(Request $request, string $dashboardKey = 'executive'): JsonResponse
    {
        $companyId = $request->attributes->get('company_id') ?? auth()->user()->company_id;
        $userId = auth()->id();

        $validated = $request->validate([
            'widget_order' => 'nullable|array',
            'hidden_widgets' => 'nullable|array',
            'custom_filters' => 'nullable|array',
        ]);

        $pref = $this->reportBuilder->saveDashboardPreference($companyId, $userId, $dashboardKey, $validated);

        return response()->json([
            'status' => 'success',
            'data' => $pref,
            'message' => 'Dashboard preferences saved successfully.',
        ]);
    }
}
