<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Purchase;
use App\Models\PurchaseOrder;
use App\Models\PurchaseRequisition;
use App\Models\Rfq;
use App\Models\Supplier;
use App\Models\SupplierContract;
use App\Services\ProcurementPriceService;
use App\Services\ProcurementRecommendationService;
use App\Services\ProcurementThreeWayMatchService;
use App\Services\SupplierPerformanceService;
use Carbon\Carbon;
use Illuminate\Http\Request;

class ProcurementAnalyticsController extends Controller
{
    protected ProcurementThreeWayMatchService $matchService;
    protected ProcurementPriceService $priceService;
    protected ProcurementRecommendationService $recommendationService;
    protected SupplierPerformanceService $performanceService;

    public function __construct(
        ProcurementThreeWayMatchService $matchService,
        ProcurementPriceService $priceService,
        ProcurementRecommendationService $recommendationService,
        SupplierPerformanceService $performanceService
    ) {
        $this->matchService = $matchService;
        $this->priceService = $priceService;
        $this->recommendationService = $recommendationService;
        $this->performanceService = $performanceService;
    }

    public function dashboard(Request $request)
    {
        $companyId = $request->attributes->get('company_id');

        // Counts
        $openRequisitionsCount = PurchaseRequisition::where('company_id', $companyId)
            ->whereIn('status', ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW'])
            ->count();

        $pendingApprovalRequisitions = PurchaseRequisition::where('company_id', $companyId)
            ->where('status', 'SUBMITTED')
            ->count();

        $openRfqsCount = Rfq::where('company_id', $companyId)
            ->whereIn('status', ['DRAFT', 'SENT', 'UNDER_EVALUATION'])
            ->count();

        $pendingReceiptOrders = PurchaseOrder::where('company_id', $companyId)
            ->whereIn('status', ['APPROVED', 'PARTIALLY_RECEIVED'])
            ->count();

        $activeContractsCount = SupplierContract::where('company_id', $companyId)
            ->where('status', 'ACTIVE')
            ->count();

        // Expiring contracts (within 30 days)
        $today = Carbon::now()->toDateString();
        $in30Days = Carbon::now()->addDays(30)->toDateString();
        $expiringContracts = SupplierContract::with('supplier')
            ->where('company_id', $companyId)
            ->where('status', 'ACTIVE')
            ->whereBetween('end_date', [$today, $in30Days])
            ->get();

        // Top suppliers by reliability score
        $supplierRankings = array_slice($this->performanceService->getCompanySupplierRankings($companyId), 0, 5);

        // Recent PPV Summary (last 30 days)
        $ppvSummary = $this->priceService->getCompanyPpvSummary($companyId, 30);

        // Replenishment preview count
        $recs = $this->recommendationService->generateRecommendations($companyId);
        $reorderNeededCount = $recs['summary']['items_needing_reorder'] ?? 0;

        return response()->json([
            'success' => true,
            'data' => [
                'kpis' => [
                    'open_requisitions' => $openRequisitionsCount,
                    'pending_approval_requisitions' => $pendingApprovalRequisitions,
                    'open_rfqs' => $openRfqsCount,
                    'pending_goods_receipts' => $pendingReceiptOrders,
                    'active_contracts' => $activeContractsCount,
                    'expiring_contracts_count' => $expiringContracts->count(),
                    'items_needing_reorder' => $reorderNeededCount,
                ],
                'expiring_contracts' => $expiringContracts,
                'top_suppliers' => $supplierRankings,
                'ppv_summary' => [
                    'total_unfavorable' => $ppvSummary['total_unfavorable_ppv'],
                    'total_favorable' => $ppvSummary['total_favorable_ppv'],
                    'net_ppv' => $ppvSummary['net_ppv'],
                    'status' => $ppvSummary['summary_status'],
                ],
            ],
        ]);
    }

    public function threeWayMatch(Request $request, $purchaseId)
    {
        $companyId = $request->attributes->get('company_id');
        $purchase = Purchase::with(['purchaseOrder.items', 'goodsReceipt.items', 'items.product', 'items.variant'])
            ->where('company_id', $companyId)
            ->findOrFail($purchaseId);

        $tolerance = (float) $request->get('tolerance', 0.0);
        $result = $this->matchService->auditThreeWayMatch($purchase, $tolerance);

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    public function matchExceptions(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $limit = (int) $request->get('limit', 50);

        $result = $this->matchService->getCompanyMatchExceptions($companyId, $limit);

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    public function ppvSummary(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $periodDays = (int) $request->get('period_days', 90);

        $result = $this->priceService->getCompanyPpvSummary($companyId, $periodDays);

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    public function recommendations(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $warehouseId = $request->filled('warehouse_id') ? (int) $request->warehouse_id : null;
        $lookbackDays = (int) $request->get('lookback_days', 30);
        $coverageDays = (int) $request->get('coverage_days', 30);

        $result = $this->recommendationService->generateRecommendations(
            $companyId,
            $warehouseId,
            $lookbackDays,
            $coverageDays
        );

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    public function createRequisitionFromRecommendations(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $user = $request->user();

        $validated = $request->validate([
            'warehouse_id' => 'required|exists:warehouses,id',
            'title' => 'nullable|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.product_variant_id' => 'required|exists:product_variants,id',
            'items.*.recommended_quantity' => 'required|numeric|min:0.0001',
            'items.*.unit_cost' => 'nullable|numeric|min:0',
            'items.*.preferred_supplier_id' => 'nullable|exists:suppliers,id',
            'items.*.reason' => 'nullable|string',
        ]);

        try {
            $requisition = $this->recommendationService->createRequisitionFromRecommendations(
                $validated['items'],
                (int) $validated['warehouse_id'],
                $user,
                $companyId,
                $validated['title'] ?? null
            );

            return response()->json([
                'success' => true,
                'message' => "Requisition #{$requisition->requisition_no} generated from recommendations.",
                'data' => $requisition,
            ], 201);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }
}
