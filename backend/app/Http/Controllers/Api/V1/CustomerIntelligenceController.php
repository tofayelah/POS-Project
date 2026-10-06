<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Services\CustomerIntelligenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerIntelligenceController extends Controller
{
    public function __construct(
        protected CustomerIntelligenceService $intelligenceService
    ) {}

    public function show360(Request $request, int $id): JsonResponse
    {
        $this->authorize('customer_intelligence.view');
        $companyId = $request->attributes->get('company_id');

        $profile = $this->intelligenceService->getCustomer360View($companyId, $id);

        return response()->json([
            'success' => true,
            'data' => $profile,
        ]);
    }

    public function rfmSummary(Request $request): JsonResponse
    {
        $this->authorize('customer_intelligence.view');
        $companyId = $request->attributes->get('company_id');

        $distribution = $this->intelligenceService->getCompanyRfmDistribution($companyId);

        return response()->json([
            'success' => true,
            'data' => $distribution,
        ]);
    }

    public function recalculateRfm(Request $request): JsonResponse
    {
        $this->authorize('customer_intelligence.manage');
        $companyId = $request->attributes->get('company_id');

        $result = $this->intelligenceService->recalculateCompanyRfm($companyId);

        return response()->json([
            'success' => true,
            'message' => "RFM scores recalculated for {$result['processed']} customers",
            'data' => $result,
        ]);
    }

    public function atRiskCustomers(Request $request): JsonResponse
    {
        $this->authorize('customer_intelligence.view');
        $companyId = $request->attributes->get('company_id');

        $daysThreshold = (int) $request->input('days_threshold', 60);
        $atRisk = $this->intelligenceService->getAtRiskCustomers($companyId, $daysThreshold);

        return response()->json([
            'success' => true,
            'data' => $atRisk,
        ]);
    }

    public function customerClv(Request $request, int $id): JsonResponse
    {
        $this->authorize('customer_intelligence.view');
        $companyId = $request->attributes->get('company_id');

        $customer = Customer::where('company_id', $companyId)->findOrFail($id);
        $clv = $this->intelligenceService->calculateCustomerLifetimeValue($customer);

        return response()->json([
            'success' => true,
            'data' => $clv,
        ]);
    }
}
