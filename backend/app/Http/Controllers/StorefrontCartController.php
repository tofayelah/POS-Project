<?php

namespace App\Http\Controllers;

use App\Models\EcommerceStore;
use App\Services\CartService;
use App\Services\CouponService;
use App\Services\EcommerceStoreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StorefrontCartController extends Controller
{
    public function __construct(
        protected CartService $cartService,
        protected EcommerceStoreService $storeService,
        protected CouponService $couponService
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

    public function getCart(Request $request, string $storeCode): JsonResponse
    {
        $store = $this->resolveStore($request, $storeCode);
        $customerId = $request->user()?->customer?->id;
        $guestToken = $request->header('X-Guest-Token') ?? $request->query('guest_token');

        $cart = $this->cartService->getOrCreateCart($store->company_id, $store->id, $customerId, $guestToken);
        $summary = $this->cartService->getCartSummary($store->company_id, $cart, $request->query('district'));

        return response()->json($summary);
    }

    public function addItem(Request $request, string $storeCode): JsonResponse
    {
        $request->validate([
            'product_variant_id' => 'required|integer',
            'quantity' => 'required|numeric|min:0.0001',
        ]);

        $store = $this->resolveStore($request, $storeCode);
        $customerId = $request->user()?->customer?->id;
        $guestToken = $request->header('X-Guest-Token') ?? $request->input('guest_token');

        $cart = $this->cartService->getOrCreateCart($store->company_id, $store->id, $customerId, $guestToken);
        $this->cartService->addItem($store->company_id, $cart->id, (int)$request->input('product_variant_id'), (float)$request->input('quantity'));

        $summary = $this->cartService->getCartSummary($store->company_id, $cart->fresh());
        return response()->json($summary);
    }

    public function updateItem(Request $request, string $storeCode, int $itemId): JsonResponse
    {
        $request->validate(['quantity' => 'required|numeric']);

        $store = $this->resolveStore($request, $storeCode);
        $customerId = $request->user()?->customer?->id;
        $guestToken = $request->header('X-Guest-Token') ?? $request->input('guest_token');

        $cart = $this->cartService->getOrCreateCart($store->company_id, $store->id, $customerId, $guestToken);
        $this->cartService->updateItemQuantity($store->company_id, $cart->id, $itemId, (float)$request->input('quantity'));

        $summary = $this->cartService->getCartSummary($store->company_id, $cart->fresh());
        return response()->json($summary);
    }

    public function removeItem(Request $request, string $storeCode, int $itemId): JsonResponse
    {
        $store = $this->resolveStore($request, $storeCode);
        $customerId = $request->user()?->customer?->id;
        $guestToken = $request->header('X-Guest-Token') ?? $request->input('guest_token');

        $cart = $this->cartService->getOrCreateCart($store->company_id, $store->id, $customerId, $guestToken);
        $this->cartService->removeItem($store->company_id, $cart->id, $itemId);

        $summary = $this->cartService->getCartSummary($store->company_id, $cart->fresh());
        return response()->json($summary);
    }

    public function clearCart(Request $request, string $storeCode): JsonResponse
    {
        $store = $this->resolveStore($request, $storeCode);
        $customerId = $request->user()?->customer?->id;
        $guestToken = $request->header('X-Guest-Token') ?? $request->input('guest_token');

        $cart = $this->cartService->getOrCreateCart($store->company_id, $store->id, $customerId, $guestToken);
        $this->cartService->clearCart($store->company_id, $cart->id);

        $summary = $this->cartService->getCartSummary($store->company_id, $cart->fresh());
        return response()->json($summary);
    }

    public function applyCoupon(Request $request, string $storeCode): JsonResponse
    {
        $request->validate(['code' => 'required|string']);

        $store = $this->resolveStore($request, $storeCode);
        $customerId = $request->user()?->customer?->id;
        $guestToken = $request->header('X-Guest-Token') ?? $request->input('guest_token');

        $cart = $this->cartService->getOrCreateCart($store->company_id, $store->id, $customerId, $guestToken);
        $summary = $this->cartService->getCartSummary($store->company_id, $cart);

        $couponRes = $this->couponService->validateCoupon(
            $store->company_id,
            $request->input('code'),
            $summary['subtotal'],
            $customerId
        );

        $cart->update([
            'coupon_code' => $couponRes['coupon']->code,
            'discount_amount' => $couponRes['discount_amount'],
        ]);

        $newSummary = $this->cartService->getCartSummary($store->company_id, $cart->fresh());
        return response()->json($newSummary);
    }

    public function removeCoupon(Request $request, string $storeCode): JsonResponse
    {
        $store = $this->resolveStore($request, $storeCode);
        $customerId = $request->user()?->customer?->id;
        $guestToken = $request->header('X-Guest-Token') ?? $request->input('guest_token');

        $cart = $this->cartService->getOrCreateCart($store->company_id, $store->id, $customerId, $guestToken);
        $cart->update(['coupon_code' => null, 'discount_amount' => 0]);

        $summary = $this->cartService->getCartSummary($store->company_id, $cart->fresh());
        return response()->json($summary);
    }
}
