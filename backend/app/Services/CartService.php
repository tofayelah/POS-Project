<?php

namespace App\Services;

use App\Models\EcommerceCart;
use App\Models\EcommerceCartItem;
use App\Models\ProductVariant;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class CartService
{
    public function __construct(
        protected InventoryReservationService $reservationService,
        protected CouponService $couponService,
        protected ShippingService $shippingService,
        protected TaxCalculationService $taxCalculationService
    ) {}

    /**
     * Get or create a cart for a guest token or customer.
     */
    public function getOrCreateCart(
        int $companyId,
        ?int $storeId = null,
        ?int $customerId = null,
        ?string $guestToken = null
    ): EcommerceCart {
        if ($customerId) {
            $cart = EcommerceCart::where('company_id', $companyId)
                ->where('customer_id', $customerId)
                ->first();
            if (!$cart) {
                $cart = EcommerceCart::create([
                    'company_id' => $companyId,
                    'store_id' => $storeId,
                    'customer_id' => $customerId,
                    'expires_at' => Carbon::now()->addDays(7),
                ]);
            }
            return $cart;
        }

        $token = $guestToken ?: (string) Str::uuid();
        $cart = EcommerceCart::where('company_id', $companyId)
            ->where('guest_token', $token)
            ->first();

        if (!$cart) {
            $cart = EcommerceCart::create([
                'company_id' => $companyId,
                'store_id' => $storeId,
                'guest_token' => $token,
                'expires_at' => Carbon::now()->addDays(3),
            ]);
        }

        return $cart;
    }

    /**
     * Add an item to cart with stock validation.
     */
    public function addItem(
        int $companyId,
        int $cartId,
        int $variantId,
        float $quantity = 1.0
    ): EcommerceCart {
        if ($quantity <= 0) {
            throw new ConflictHttpException("Quantity must be greater than zero.");
        }

        return DB::transaction(function () use ($companyId, $cartId, $variantId, $quantity) {
            $cart = EcommerceCart::where('company_id', $companyId)->findOrFail($cartId);

            $variant = ProductVariant::with('product')->findOrFail($variantId);
            if ($variant->product->company_id !== $companyId) {
                throw new ConflictHttpException("Product does not belong to this store.");
            }

            if (!$variant->product->is_published || !in_array($variant->product->visibility, ['ECOMMERCE_ONLY', 'BOTH'])) {
                throw new ConflictHttpException("Product is not available for online purchase.");
            }

            $sellableQty = $this->reservationService->getSellableQuantity($companyId, $variant->id);
            $existingItem = EcommerceCartItem::where('cart_id', $cart->id)
                ->where('product_variant_id', $variant->id)
                ->first();

            $totalRequestedQty = ($existingItem ? (float)$existingItem->quantity : 0) + $quantity;
            if ($sellableQty < $totalRequestedQty) {
                throw new ConflictHttpException(
                    "Insufficient stock for '{$variant->variant_name}'. Only {$sellableQty} available."
                );
            }

            if ($existingItem) {
                $existingItem->quantity = $totalRequestedQty;
                $existingItem->unit_price_snapshot = (float) $variant->selling_price;
                $existingItem->save();
            } else {
                EcommerceCartItem::create([
                    'cart_id' => $cart->id,
                    'product_variant_id' => $variant->id,
                    'quantity' => $quantity,
                    'unit_price_snapshot' => (float) $variant->selling_price,
                ]);
            }

            return $cart->fresh('items.variant.product');
        });
    }

    /**
     * Update quantity of a cart item.
     */
    public function updateItemQuantity(
        int $companyId,
        int $cartId,
        int $itemId,
        float $quantity
    ): EcommerceCart {
        return DB::transaction(function () use ($companyId, $cartId, $itemId, $quantity) {
            $cart = EcommerceCart::where('company_id', $companyId)->findOrFail($cartId);
            $item = EcommerceCartItem::where('cart_id', $cart->id)->findOrFail($itemId);

            if ($quantity <= 0) {
                $item->delete();
            } else {
                $sellableQty = $this->reservationService->getSellableQuantity($companyId, $item->product_variant_id);
                if ($sellableQty < $quantity) {
                    throw new ConflictHttpException("Cannot update quantity. Only {$sellableQty} available.");
                }
                $item->quantity = $quantity;
                $item->save();
            }

            return $cart->fresh('items.variant.product');
        });
    }

    /**
     * Remove item from cart.
     */
    public function removeItem(int $companyId, int $cartId, int $itemId): EcommerceCart
    {
        $cart = EcommerceCart::where('company_id', $companyId)->findOrFail($cartId);
        EcommerceCartItem::where('cart_id', $cart->id)->where('id', $itemId)->delete();
        return $cart->fresh('items.variant.product');
    }

    /**
     * Clear all items in cart.
     */
    public function clearCart(int $companyId, int $cartId): EcommerceCart
    {
        $cart = EcommerceCart::where('company_id', $companyId)->findOrFail($cartId);
        EcommerceCartItem::where('cart_id', $cart->id)->delete();
        $cart->update(['coupon_code' => null, 'discount_amount' => 0]);
        return $cart->fresh('items');
    }

    /**
     * Merge guest cart into customer cart upon login.
     */
    public function mergeGuestCart(int $companyId, string $guestToken, int $customerId): EcommerceCart
    {
        return DB::transaction(function () use ($companyId, $guestToken, $customerId) {
            $guestCart = EcommerceCart::with('items')->where('company_id', $companyId)
                ->where('guest_token', $guestToken)
                ->first();

            $customerCart = $this->getOrCreateCart($companyId, null, $customerId);

            if ($guestCart && $guestCart->items->isNotEmpty()) {
                foreach ($guestCart->items as $gItem) {
                    $this->addItem($companyId, $customerCart->id, $gItem->product_variant_id, (float)$gItem->quantity);
                }
                $guestCart->delete();
            }

            return $customerCart->fresh('items.variant.product');
        });
    }

    /**
     * Calculate server-authoritative cart summary (subtotal, coupon, tax, grand total).
     */
    public function getCartSummary(int $companyId, EcommerceCart $cart, ?string $destinationDistrict = null): array
    {
        $items = EcommerceCartItem::with(['variant.product.category'])
            ->where('cart_id', $cart->id)
            ->get();

        $subtotal = 0.0;
        $taxTotal = 0.0;
        $itemsData = [];

        foreach ($items as $item) {
            $variant = $item->variant;
            $lineSubtotal = round((float)$item->quantity * (float)$variant->selling_price, 4);
            $subtotal += $lineSubtotal;

            // Calculate tax per line using Phase 10 TaxCalculationService
            $taxCalc = $this->taxCalculationService->calculateItemTax(
                companyId: $companyId,
                amount: $lineSubtotal,
                taxCategoryId: $variant->product->tax_category_id ?? null,
                isInclusive: false,
                transactionType: 'OUTPUT_VAT'
            );

            $lineTax = (float) ($taxCalc['tax_amount'] ?? 0);
            $taxTotal += $lineTax;

            $itemsData[] = [
                'id' => $item->id,
                'variant_id' => $variant->id,
                'product_name' => $variant->product->name,
                'variant_name' => $variant->variant_name,
                'sku' => $variant->sku,
                'image' => ($variant->product->images && count($variant->product->images) > 0) ? $variant->product->images[0] : null,
                'unit_price' => (float)$variant->selling_price,
                'quantity' => (float)$item->quantity,
                'line_subtotal' => $lineSubtotal,
                'line_tax' => $lineTax,
            ];
        }

        // Coupon calculation
        $discountAmount = 0.0;
        $couponDetails = null;
        if ($cart->coupon_code) {
            try {
                $couponRes = $this->couponService->validateCoupon(
                    $companyId,
                    $cart->coupon_code,
                    $subtotal,
                    $cart->customer_id
                );
                $discountAmount = (float)$couponRes['discount_amount'];
                $couponDetails = [
                    'code' => $couponRes['coupon']->code,
                    'discount_amount' => $discountAmount,
                ];
            } catch (\Exception $e) {
                // If coupon invalid now, clear it
                $cart->update(['coupon_code' => null, 'discount_amount' => 0]);
            }
        }

        // Shipping estimate
        $shippingCalc = $this->shippingService->calculateShipping(
            $companyId,
            1,
            $destinationDistrict ?? 'Dhaka',
            null,
            $subtotal
        );
        $shippingAmount = (float) $shippingCalc['shipping_amount'];

        $grandTotal = max(0, round($subtotal - $discountAmount + $taxTotal + $shippingAmount, 4));

        return [
            'cart_id' => $cart->id,
            'guest_token' => $cart->guest_token,
            'items_count' => count($itemsData),
            'total_units' => array_sum(array_column($itemsData, 'quantity')),
            'subtotal' => round($subtotal, 4),
            'discount_total' => round($discountAmount, 4),
            'coupon' => $couponDetails,
            'tax_total' => round($taxTotal, 4),
            'shipping_amount' => round($shippingAmount, 4),
            'grand_total' => round($grandTotal, 4),
            'currency' => 'BDT',
            'items' => $itemsData,
        ];
    }
}
