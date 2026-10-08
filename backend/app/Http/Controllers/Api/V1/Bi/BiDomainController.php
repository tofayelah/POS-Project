<?php

namespace App\Http\Controllers\Api\V1\Bi;

use App\Http\Controllers\Controller;
use App\Services\Bi\BiAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BiDomainController extends Controller
{
    public function __construct(
        protected BiAnalyticsService $biAnalytics
    ) {}

    protected function getCompanyId(Request $request): int
    {
        return $request->attributes->get('company_id') ?? auth()->user()->company_id;
    }

    public function sales(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $filters = $request->only(['date_from', 'date_to', 'branch_id', 'channel', 'warehouse_id', 'business_unit_id']);
        return response()->json([
            'status' => 'success',
            'data' => $this->biAnalytics->getSalesBi($companyId, $filters),
        ]);
    }

    public function profitability(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $filters = $request->only(['date_from', 'date_to', 'branch_id', 'channel']);
        return response()->json([
            'status' => 'success',
            'data' => $this->biAnalytics->getProfitabilityBi($companyId, $filters),
        ]);
    }

    public function inventory(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $filters = $request->only(['branch_id', 'warehouse_id']);
        return response()->json([
            'status' => 'success',
            'data' => $this->biAnalytics->getInventoryBi($companyId, $filters),
        ]);
    }

    public function procurement(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $filters = $request->only(['date_from', 'date_to', 'branch_id']);
        return response()->json([
            'status' => 'success',
            'data' => $this->biAnalytics->getProcurementBi($companyId, $filters),
        ]);
    }

    public function customer(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        return response()->json([
            'status' => 'success',
            'data' => $this->biAnalytics->getCustomerBi($companyId),
        ]);
    }

    public function supplier(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        return response()->json([
            'status' => 'success',
            'data' => $this->biAnalytics->getSupplierBi($companyId),
        ]);
    }

    public function pos(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $filters = $request->only(['date_from', 'date_to', 'branch_id']);
        return response()->json([
            'status' => 'success',
            'data' => $this->biAnalytics->getPosBi($companyId, $filters),
        ]);
    }

    public function ecommerce(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $filters = $request->only(['date_from', 'date_to']);
        return response()->json([
            'status' => 'success',
            'data' => $this->biAnalytics->getEcommerceBi($companyId, $filters),
        ]);
    }

    public function hr(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        return response()->json([
            'status' => 'success',
            'data' => $this->biAnalytics->getHrBi($companyId),
        ]);
    }

    public function finance(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $filters = $request->only(['date_from', 'date_to']);
        return response()->json([
            'status' => 'success',
            'data' => $this->biAnalytics->getFinanceBi($companyId, $filters),
        ]);
    }

    public function vat(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $filters = $request->only(['date_from', 'date_to']);
        return response()->json([
            'status' => 'success',
            'data' => $this->biAnalytics->getVatBi($companyId, $filters),
        ]);
    }

    public function branch(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $filters = $request->only(['date_from', 'date_to']);
        return response()->json([
            'status' => 'success',
            'data' => $this->biAnalytics->getBranchBi($companyId, $filters),
        ]);
    }

    public function product(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $filters = $request->only(['date_from', 'date_to']);
        return response()->json([
            'status' => 'success',
            'data' => $this->biAnalytics->getProductBi($companyId, $filters),
        ]);
    }

    public function channel(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $filters = $request->only(['date_from', 'date_to']);
        return response()->json([
            'status' => 'success',
            'data' => $this->biAnalytics->getChannelBi($companyId, $filters),
        ]);
    }

    public function salesperson(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $filters = $request->only(['date_from', 'date_to']);
        return response()->json([
            'status' => 'success',
            'data' => $this->biAnalytics->getSalespersonBi($companyId, $filters),
        ]);
    }
}
