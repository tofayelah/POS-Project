<?php

namespace App\Http\Controllers;

use App\Models\EcommerceStore;
use App\Services\CatalogService;
use App\Services\EcommerceStoreService;
use App\Services\ShippingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StorefrontCatalogController extends Controller
{
    public function __construct(
        protected CatalogService $catalogService,
        protected EcommerceStoreService $storeService,
        protected ShippingService $shippingService
    ) {}

    protected function resolveStore(Request $request, string $storeCode): EcommerceStore
    {
        if (is_numeric($storeCode)) {
            $store = EcommerceStore::find((int) $storeCode);
            if ($store) {
                return $store;
            }
        }

        $store = EcommerceStore::where('code', $storeCode)->first();
        if ($store) {
            return $store;
        }

        $companyId = $request->header('X-Company-ID');
        if ($companyId) {
            return $this->storeService->getStore((int) $companyId, $storeCode);
        }

        throw new NotFoundHttpException("Store '{$storeCode}' not found.");
    }

    public function getStoreInfo(Request $request, string $storeCode): JsonResponse
    {
        $store = $this->resolveStore($request, $storeCode);
        return response()->json([
            'id' => $store->id,
            'code' => $store->code,
            'name' => $store->name,
            'currency' => $store->currency,
            'guest_checkout_enabled' => $store->guest_checkout_enabled,
            'cod_enabled' => $store->cod_enabled,
            'online_payment_enabled' => $store->online_payment_enabled,
            'settings' => $store->settings,
        ]);
    }

    public function getProducts(Request $request, string $storeCode): JsonResponse
    {
        $store = $this->resolveStore($request, $storeCode);
        $filters = $request->only([
            'category_id', 'brand_id', 'search', 'featured', 'new_arrival', 'best_seller',
            'sort_by', 'direction', 'per_page'
        ]);

        $paginator = $this->catalogService->getPublicProducts($store->company_id, $filters);
        return response()->json($paginator);
    }

    public function getProductDetail(Request $request, string $storeCode, string $slug): JsonResponse
    {
        $store = $this->resolveStore($request, $storeCode);
        $product = $this->catalogService->getPublicProductBySlug($store->company_id, $slug);
        return response()->json($product);
    }

    public function getCategories(Request $request, string $storeCode): JsonResponse
    {
        $store = $this->resolveStore($request, $storeCode);
        $categories = $this->catalogService->getCategories($store->company_id);
        return response()->json($categories);
    }

    public function getShippingMethods(Request $request, string $storeCode): JsonResponse
    {
        $store = $this->resolveStore($request, $storeCode);
        $district = $request->query('district');
        $subtotal = (float)$request->query('subtotal', 0);
        $methods = $this->shippingService->getAvailableMethods($store->company_id, $district, $subtotal);
        return response()->json($methods);
    }
}
