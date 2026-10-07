<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Company;
use App\Models\Customer;
use App\Models\EcommerceCart;
use App\Models\EcommerceCartItem;
use App\Models\EcommerceStore;
use App\Models\Inventory;
use App\Models\ProductVariant;
use App\Models\Sale;
use App\Models\SaleItem;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class EcommerceCheckoutService
{
    public function __construct(
        protected EcommerceStoreService $storeService,
        protected CartService $cartService,
        protected InventoryReservationService $reservationService,
        protected CouponService $couponService,
        protected ShippingService $shippingService,
        protected TaxCalculationService $taxCalculationService,
        protected TaxPostingService $taxPostingService,
        protected PaymentGatewayService $paymentGatewayService,
        protected PaymentService $paymentService,
        protected LoyaltyService $loyaltyService,
        protected StoreCreditService $storeCreditService
    ) {}

    /**
     * Generate unique concurrency-safe order number for company.
     */
    public function generateOrderNumber(int $companyId, string $prefix = 'EC-'): string
    {
        $year = date('Y');
        $lastSale = Sale::where('company_id', $companyId)
            ->where('channel', 'ECOMMERCE')
            ->lockForUpdate()
            ->orderBy('id', 'desc')
            ->first();

        $nextSeq = 1;
        if ($lastSale && !empty($lastSale->order_number)) {
            $parts = explode('-', $lastSale->order_number);
            $lastNum = end($parts);
            if (is_numeric($lastNum)) {
                $nextSeq = intval($lastNum) + 1;
            }
        }

        return $prefix . $year . '-' . str_pad($nextSeq, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Atomic E-Commerce Checkout and Order Creation.
     */
    public function checkout(int $companyId, array $data, ?int $userId = null): Sale
    {
        return DB::transaction(function () use ($companyId, $data, $userId) {
            $idempotencyKey = $data['idempotency_key'] ?? null;
            if ($idempotencyKey) {
                $existingSale = Sale::where('company_id', $companyId)
                    ->where('idempotency_key', $idempotencyKey)
                    ->first();
                if ($existingSale) {
                    return $existingSale->load(['items', 'customer', 'shipments']);
                }
            }

            $store = $this->storeService->getStore($companyId, $data['store_code'] ?? null);
            $warehouseId = $data['warehouse_id'] ?? $store->default_warehouse_id;
            $branchId = $data['branch_id'] ?? $store->default_branch_id;

            if (!$warehouseId) {
                $fallbackWh = \App\Models\Warehouse::where('company_id', $companyId)->first();
                $warehouseId = $fallbackWh?->id;
            }

            // 1. Resolve Customer (Authenticated or Guest)
            $customer = null;
            if (!empty($data['customer_id'])) {
                $customer = Customer::where('company_id', $companyId)->findOrFail($data['customer_id']);
            } else {
                // Guest checkout
                if (!$store->guest_checkout_enabled) {
                    throw new ConflictHttpException("Guest checkout is not permitted. Please log in or register.");
                }

                $mobile = trim($data['customer_mobile'] ?? '');
                $name = trim($data['customer_name'] ?? 'Online Customer');
                if (empty($mobile)) {
                    throw new ConflictHttpException("Customer mobile number is required.");
                }

                $customer = Customer::where('company_id', $companyId)
                    ->where('mobile', $mobile)
                    ->first();

                if (!$customer) {
                    $customer = Customer::create([
                        'company_id' => $companyId,
                        'customer_code' => 'CUST-EC-' . date('Ymd') . '-' . rand(1000, 9999),
                        'name' => $name,
                        'mobile' => $mobile,
                        'email' => $data['customer_email'] ?? null,
                        'address' => $data['shipping_address']['address_line_1'] ?? null,
                        'city' => $data['shipping_address']['city'] ?? 'Dhaka',
                        'status' => 'ACTIVE',
                    ]);
                }
            }

            // 2. Resolve Cart Items
            $items = [];
            $cart = null;
            if (!empty($data['cart_id'])) {
                $cart = EcommerceCart::with('items.variant.product')
                    ->where('company_id', $companyId)
                    ->findOrFail($data['cart_id']);
                if ($cart->items->isEmpty()) {
                    throw new ConflictHttpException("Cannot checkout with an empty cart.");
                }
                foreach ($cart->items as $cItem) {
                    $items[] = [
                        'product_variant_id' => $cItem->product_variant_id,
                        'quantity' => (float)$cItem->quantity,
                    ];
                }
            } elseif (!empty($data['items'])) {
                $items = $data['items'];
            } else {
                throw new ConflictHttpException("No order items provided.");
            }

            // 3. Server-Authoritative Price & Stock Recalculation
            $subtotal = 0.0;
            $itemsCalculation = [];
            foreach ($items as $item) {
                $variantId = (int)$item['product_variant_id'];
                $qty = (float)$item['quantity'];
                if ($qty <= 0) {
                    throw new ConflictHttpException("Item quantity must be greater than zero.");
                }

                $variant = ProductVariant::with('product')
                    ->where('id', $variantId)
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($variant->product->company_id !== $companyId) {
                    throw new ConflictHttpException("Product does not belong to this company.");
                }

                $unitPrice = (float) $variant->selling_price;
                $lineSubtotal = round($qty * $unitPrice, 4);
                $subtotal += $lineSubtotal;

                // Tax calculation per item via Phase 10 engine
                $taxRes = $this->taxCalculationService->calculateItemTax(
                    companyId: $companyId,
                    amount: $lineSubtotal,
                    taxCategoryId: $variant->product->tax_category_id ?? null,
                    isInclusive: false,
                    transactionType: 'OUTPUT_VAT'
                );

                $lineTax = (float)($taxRes['tax_amount'] ?? 0);

                $itemsCalculation[] = [
                    'variant' => $variant,
                    'quantity' => $qty,
                    'unit_price' => $unitPrice,
                    'line_subtotal' => $lineSubtotal,
                    'line_tax' => $lineTax,
                    'unit_cost' => (float)($variant->cost_price ?? 0),
                    'tax_res' => $taxRes,
                ];
            }

            // 4. Coupons & Discounts
            $discountTotal = 0.0;
            $appliedCoupon = null;
            $couponCode = $data['coupon_code'] ?? ($cart?->coupon_code);
            if ($couponCode) {
                $couponRes = $this->couponService->validateCoupon(
                    companyId: $companyId,
                    code: $couponCode,
                    orderSubtotal: $subtotal,
                    customerId: $customer->id
                );
                $discountTotal = (float)$couponRes['discount_amount'];
                $appliedCoupon = $couponRes['coupon'];
            }

            // 5. Shipping Calculation
            $destinationDistrict = $data['shipping_address']['district'] ?? $data['shipping_address']['city'] ?? 'Dhaka';
            $shippingMethodId = (int)($data['shipping_method_id'] ?? 1);
            $shippingRes = $this->shippingService->calculateShipping(
                companyId: $companyId,
                shippingMethodId: $shippingMethodId,
                district: $destinationDistrict,
                subtotal: $subtotal
            );
            $shippingAmount = (float)$shippingRes['shipping_amount'];

            // 6. Total Tax & Grand Total
            $taxTotal = array_sum(array_column($itemsCalculation, 'line_tax'));
            $grandTotal = max(0, round($subtotal - $discountTotal + $taxTotal + $shippingAmount, 4));

            // 7. Generate Numbers
            $orderNumber = $this->generateOrderNumber($companyId, $store->order_prefix ?? 'EC-');
            $invoiceNumber = 'INV-' . $orderNumber;

            // 8. Create Authoritative Sale Record
            $paymentMethod = strtoupper($data['payment_method'] ?? 'COD');
            $saleStatus = ($paymentMethod === 'COD') ? 'COMPLETED' : 'DRAFT';
            $paymentStatus = ($paymentMethod === 'COD') ? 'DUE' : 'DUE';

            $sale = Sale::create([
                'company_id' => $companyId,
                'business_unit_id' => null,
                'branch_id' => $branchId,
                'warehouse_id' => $warehouseId,
                'customer_id' => $customer->id,
                'cashier_id' => $userId, // null for online customer checkout
                'channel' => 'ECOMMERCE',
                'invoice_number' => $invoiceNumber,
                'order_number' => $orderNumber,
                'idempotency_key' => $idempotencyKey,
                'sale_date' => Carbon::now()->toDateString(),
                'status' => $saleStatus,
                'payment_status' => $paymentStatus,
                'fulfillment_status' => 'UNFULFILLED',
                'subtotal' => $subtotal,
                'discount_total' => $discountTotal,
                'tax_total' => $taxTotal,
                'shipping_amount' => $shippingAmount,
                'shipping_method_id' => $shippingMethodId,
                'grand_total' => $grandTotal,
                'paid_amount' => 0.0,
                'due_amount' => $grandTotal,
                'shipping_address_snapshot' => $data['shipping_address'] ?? null,
                'billing_address_snapshot' => $data['billing_address'] ?? $data['shipping_address'] ?? null,
                'delivery_notes' => $data['delivery_notes'] ?? null,
                'created_by' => $userId,
            ]);

            // 9. Create Sale Items & Reserve Inventory
            foreach ($itemsCalculation as $calc) {
                $variant = $calc['variant'];
                $qty = $calc['quantity'];

                // Create reservation atomically
                if ($warehouseId) {
                    $this->reservationService->reserveStock(
                        companyId: $companyId,
                        warehouseId: $warehouseId,
                        variantId: $variant->id,
                        quantity: $qty,
                        saleId: $sale->id,
                        ttlMinutes: 1440, // 24 hours
                        userId: $userId
                    );
                }

                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $variant->product_id,
                    'product_variant_id' => $variant->id,
                    'sku_snapshot' => $variant->sku,
                    'barcode_snapshot' => $variant->primaryBarcode?->barcode,
                    'product_name_snapshot' => $variant->product->name,
                    'variant_description_snapshot' => $variant->variant_name,
                    'quantity' => $qty,
                    'unit_price' => $calc['unit_price'],
                    'discount' => 0,
                    'tax' => $calc['line_tax'],
                    'line_total' => round($calc['line_subtotal'] + $calc['line_tax'], 4),
                    'unit_cost_snapshot' => $calc['unit_cost'],
                    'total_cost_snapshot' => round($calc['unit_cost'] * $qty, 4),
                ]);
            }

            // 10. Record Coupon Usage
            if ($appliedCoupon) {
                $this->couponService->recordUsage(
                    companyId: $companyId,
                    couponId: $appliedCoupon->id,
                    saleId: $sale->id,
                    discountAmount: $discountTotal,
                    customerId: $customer->id
                );
            }

            // 11. Handle Payment Gateway / Payment Intent
            $this->paymentGatewayService->initiatePayment(
                companyId: $companyId,
                saleId: $sale->id,
                gateway: $paymentMethod,
                amount: $grandTotal,
                idempotencyKey: $idempotencyKey
            );

            // If paying with Store Credit
            if ($paymentMethod === 'STORE_CREDIT') {
                $balance = $this->storeCreditService->getBalance($companyId, $customer->id);
                if ($balance < $grandTotal) {
                    throw new ConflictHttpException("Insufficient store credit balance. Available: ৳{$balance}");
                }

                $this->storeCreditService->redeemCredit(
                    companyId: $companyId,
                    customerId: $customer->id,
                    amount: $grandTotal,
                    referenceType: 'Sale',
                    referenceId: $sale->id,
                    referenceNumber: $sale->invoice_number,
                    description: 'Payment for online order ' . $sale->order_number,
                    userId: $userId
                );

                // Create canonical payment
                $payment = $this->paymentService->createPayment(
                    companyId: $companyId,
                    data: [
                        'amount' => $grandTotal,
                        'payment_type' => 'CUSTOMER',
                        'payment_method' => 'STORE_CREDIT',
                        'reference_number' => $sale->invoice_number,
                        'branch_id' => $branchId,
                        'idempotency_key' => 'SC-ORDER-' . $sale->id,
                    ],
                    userId: $userId
                );

                $this->paymentService->allocatePayment(
                    companyId: $companyId,
                    paymentId: $payment->id,
                    allocationsData: [
                        [
                            'allocatable_type' => 'Sale',
                            'allocatable_id' => $sale->id,
                            'amount' => $grandTotal,
                        ]
                    ],
                    userId: $userId
                );

                $sale->update([
                    'status' => 'COMPLETED',
                    'payment_status' => 'PAID',
                    'paid_amount' => $grandTotal,
                    'due_amount' => 0.0,
                ]);
            }

            // 12. Post Tax Transaction via Phase 10 engine
            $this->taxPostingService->postSaleTax(
                companyId: $companyId,
                sale: $sale,
                taxCalculation: [
                    'taxable_amount' => $subtotal - $discountTotal,
                    'tax_amount' => $taxTotal,
                    'sd_amount' => 0,
                    'at_amount' => 0,
                    'total_tax_amount' => $taxTotal,
                    'is_inclusive' => false,
                ],
                userId: $userId
            );

            // 13. Clear cart if exists
            if ($cart) {
                $this->cartService->clearCart($companyId, $cart->id);
            }

            AuditLog::log(
                $companyId,
                $userId,
                'ECOMMERCE_ORDER_CREATED',
                $sale->id,
                'Sale',
                "Created E-Commerce Order {$sale->order_number} for customer {$customer->name} (Total: ৳{$grandTotal}, Method: {$paymentMethod})."
            );

            return $sale->fresh(['items', 'customer', 'shipments', 'onlinePaymentTransactions']);
        });
    }
}
