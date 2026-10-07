<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Coupon;
use App\Models\EcommerceCategory;
use App\Models\EcommerceStore;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\Sale;
use App\Models\Shipment;
use App\Models\ShippingMethod;
use App\Services\CatalogService;
use App\Services\CouponService;
use App\Services\EcommerceReportingService;
use App\Services\EcommerceReturnService;
use App\Services\EcommerceStoreService;
use App\Services\OrderFulfillmentService;
use App\Services\ShippingService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminEcommerceController extends Controller
{
    public function __construct(
        protected EcommerceStoreService $storeService,
        protected CatalogService $catalogService,
        protected OrderFulfillmentService $fulfillmentService,
        protected EcommerceReturnService $returnService,
        protected CouponService $couponService,
        protected ShippingService $shippingService,
        protected EcommerceReportingService $reportingService
    ) {}

    protected function getCompanyId(Request $request): int
    {
        return (int) ($request->header('X-Company-ID') ?? $request->user()?->company_id ?? 1);
    }

    // 1. Store Settings
    public function getStore(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $store = $this->storeService->getStore($companyId);
        return response()->json($store);
    }

    public function updateStore(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $store = $this->storeService->updateStore($companyId, $id, $request->all(), $request->user()?->id);
        return response()->json($store);
    }

    // 2. Orders Management
    public function getOrders(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $query = Sale::with(['customer', 'items', 'shipments', 'onlinePaymentTransactions'])
            ->where('company_id', $companyId)
            ->where('channel', 'ECOMMERCE');

        if ($request->query('status')) {
            $query->where('status', $request->query('status'));
        }
        if ($request->query('fulfillment_status')) {
            $query->where('fulfillment_status', $request->query('fulfillment_status'));
        }
        if ($request->query('search')) {
            $term = $request->query('search');
            $query->where(function ($q) use ($term) {
                $q->where('order_number', 'ilike', "%{$term}%")
                    ->orWhere('invoice_number', 'ilike', "%{$term}%")
                    ->orWhereHas('customer', function ($cq) use ($term) {
                        $cq->where('name', 'ilike', "%{$term}%")
                            ->orWhere('mobile', 'ilike', "%{$term}%");
                    });
            });
        }

        $perPage = min(100, max(1, (int)$request->query('per_page', 20)));
        $orders = $query->orderBy('id', 'desc')->paginate($perPage);

        return response()->json($orders);
    }

    public function getOrderDetail(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $order = Sale::with([
            'customer',
            'items.product',
            'items.variant',
            'shipments.items',
            'onlinePaymentTransactions',
            'couponUsages.coupon',
            'reservations'
        ])
            ->where('company_id', $companyId)
            ->findOrFail($id);

        return response()->json($order);
    }

    public function cancelOrder(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $reason = $request->input('reason', 'Admin cancellation');
        $order = $this->fulfillmentService->cancelOrder($companyId, $id, $reason, $request->user()?->id);
        return response()->json($order);
    }

    // 3. Fulfillment & Shipments
    public function createShipment(Request $request, int $orderId): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $shipment = $this->fulfillmentService->createShipment($companyId, $orderId, $request->all(), $request->user()?->id);
        return response()->json($shipment, 201);
    }

    public function markShipped(Request $request, int $shipmentId): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $trackingNumber = $request->input('tracking_number');
        $shipment = $this->fulfillmentService->markAsShipped($companyId, $shipmentId, $trackingNumber, $request->user()?->id);
        return response()->json($shipment);
    }

    public function markDelivered(Request $request, int $shipmentId): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $shipment = $this->fulfillmentService->markAsDelivered($companyId, $shipmentId, $request->user()?->id);
        return response()->json($shipment);
    }

    // 4. Catalog Management
    public function getCatalog(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $query = Product::with(['category', 'brand', 'variants'])
            ->where('company_id', $companyId);

        if ($request->query('published') !== null) {
            $isPublished = filter_var($request->query('published'), FILTER_VALIDATE_BOOLEAN);
            $query->where('is_published', $isPublished);
        }

        if ($request->query('search')) {
            $term = $request->query('search');
            $query->where('name', 'ilike', "%{$term}%");
        }

        $perPage = min(100, max(1, (int)$request->query('per_page', 20)));
        $products = $query->orderBy('sort_order', 'asc')->orderBy('id', 'desc')->paginate($perPage);

        return response()->json($products);
    }

    public function updateCatalogPublishing(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $product = $this->catalogService->updateCatalogPublishing($companyId, $id, $request->all(), $request->user()?->id);
        return response()->json($product);
    }

    // 5. Categories
    public function getCategories(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $categories = $this->catalogService->getCategories($companyId);
        return response()->json($categories);
    }

    public function createCategory(Request $request): JsonResponse
    {
        $request->validate(['name' => 'required|string|max:150']);
        $companyId = $this->getCompanyId($request);
        $category = $this->catalogService->createCategory($companyId, $request->all(), $request->user()?->id);
        return response()->json($category, 201);
    }

    // 6. Coupons
    public function getCoupons(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $coupons = Coupon::where('company_id', $companyId)->orderBy('id', 'desc')->get();
        return response()->json($coupons);
    }

    public function createCoupon(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'required|string|max:50',
            'discount_value' => 'required|numeric|min:0.0001',
        ]);

        $companyId = $this->getCompanyId($request);
        $coupon = $this->couponService->createCoupon($companyId, $request->all(), $request->user()?->id);
        return response()->json($coupon, 201);
    }

    // 7. Shipping Methods
    public function getShippingMethods(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $methods = ShippingMethod::with('rates.zone')->where('company_id', $companyId)->get();
        return response()->json($methods);
    }

    public function createShippingMethod(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:150',
            'code' => 'required|string|max:50',
        ]);

        $companyId = $this->getCompanyId($request);
        $method = ShippingMethod::create([
            'company_id' => $companyId,
            'name' => $request->input('name'),
            'code' => strtoupper($request->input('code')),
            'carrier_name' => $request->input('carrier_name'),
            'estimated_days' => $request->input('estimated_days'),
            'is_active' => $request->input('is_active', true),
        ]);

        return response()->json($method, 201);
    }

    // 8. Reviews Moderation
    public function getReviews(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $reviews = ProductReview::with(['product', 'customer', 'approver'])
            ->where('company_id', $companyId)
            ->orderBy('id', 'desc')
            ->paginate(20);

        return response()->json($reviews);
    }

    public function updateReviewStatus(Request $request, int $id): JsonResponse
    {
        $request->validate(['status' => 'required|in:APPROVED,REJECTED,PENDING']);
        $companyId = $this->getCompanyId($request);

        $review = ProductReview::where('company_id', $companyId)->findOrFail($id);
        $review->update([
            'status' => $request->input('status'),
            'moderation_notes' => $request->input('moderation_notes'),
            'approved_by' => $request->user()?->id,
            'approved_at' => Carbon::now(),
        ]);

        return response()->json($review);
    }

    // 9. Overview Reports & Dashboard
    public function getReportsOverview(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $data = $this->reportingService->getOverviewKPIs(
            $companyId,
            $request->query('start_date'),
            $request->query('end_date')
        );
        return response()->json($data);
    }
}
