<?php

namespace App\Http\Controllers;

use App\Models\EcommerceStore;
use App\Models\Sale;
use App\Services\EcommerceCheckoutService;
use App\Services\EcommerceStoreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StorefrontCheckoutController extends Controller
{
    public function __construct(
        protected EcommerceCheckoutService $checkoutService,
        protected EcommerceStoreService $storeService
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

    public function checkout(Request $request, string $storeCode): JsonResponse
    {
        $store = $this->resolveStore($request, $storeCode);

        $request->validate([
            'payment_method' => 'required|string',
            'shipping_address' => 'required|array',
            'shipping_address.recipient_name' => 'required|string',
            'shipping_address.mobile' => 'required|string',
            'shipping_address.address_line_1' => 'required|string',
            'shipping_address.city' => 'required|string',
        ]);

        $data = $request->all();
        $data['store_code'] = $storeCode;

        // If authenticated user
        if ($request->user() && $request->user()->customer) {
            $data['customer_id'] = $request->user()->customer->id;
        }

        $userId = $request->user()?->id;
        $sale = $this->checkoutService->checkout($store->company_id, $data, $userId);

        return response()->json([
            'order_id' => $sale->id,
            'order_number' => $sale->order_number,
            'invoice_number' => $sale->invoice_number,
            'grand_total' => (float)$sale->grand_total,
            'subtotal' => (float)$sale->subtotal,
            'tax_total' => (float)$sale->tax_total,
            'shipping_amount' => (float)$sale->shipping_amount,
            'discount_total' => (float)$sale->discount_total,
            'payment_status' => $sale->payment_status,
            'fulfillment_status' => $sale->fulfillment_status,
            'payment_method' => $sale->onlinePaymentTransactions->first()?->gateway ?? 'COD',
            'tracking_number' => $sale->tracking_number,
        ], 201);
    }

    public function trackOrder(Request $request, string $storeCode, string $orderNumber): JsonResponse
    {
        $store = $this->resolveStore($request, $storeCode);

        $sale = Sale::with(['items.product', 'shipments.shippingMethod', 'onlinePaymentTransactions'])
            ->where('company_id', $store->company_id)
            ->where(function ($q) use ($orderNumber) {
                $q->where('order_number', $orderNumber)
                    ->orWhere('invoice_number', $orderNumber);
            })
            ->firstOrFail();

        return response()->json([
            'order_number' => $sale->order_number,
            'invoice_number' => $sale->invoice_number,
            'sale_date' => $sale->sale_date,
            'status' => $sale->status,
            'payment_status' => $sale->payment_status,
            'fulfillment_status' => $sale->fulfillment_status,
            'shipping_amount' => (float)$sale->shipping_amount,
            'grand_total' => (float)$sale->grand_total,
            'tracking_number' => $sale->tracking_number,
            'shipping_address' => $sale->shipping_address_snapshot,
            'shipments' => $sale->shipments->map(function ($s) {
                return [
                    'shipment_number' => $s->shipment_number,
                    'carrier' => $s->carrier_name,
                    'status' => $s->status,
                    'tracking_number' => $s->tracking_number,
                    'shipped_at' => $s->shipped_at?->toIso8601String(),
                    'delivered_at' => $s->delivered_at?->toIso8601String(),
                ];
            }),
            'items' => $sale->items->map(function ($item) {
                return [
                    'product_name' => $item->product_name_snapshot,
                    'variant_name' => $item->variant_description_snapshot,
                    'quantity' => (float)$item->quantity,
                    'unit_price' => (float)$item->unit_price,
                    'line_total' => (float)$item->line_total,
                ];
            }),
        ]);
    }
}
