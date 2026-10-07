<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\HrmDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HrmDashboardController extends Controller
{
    public function __construct(
        protected HrmDashboardService $dashboardService
    ) {}

    public function hrDashboard(Request $request): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $data = $this->dashboardService->getHrDashboard($companyId);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function payrollDashboard(Request $request): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $data = $this->dashboardService->getPayrollDashboard($companyId);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }
}
