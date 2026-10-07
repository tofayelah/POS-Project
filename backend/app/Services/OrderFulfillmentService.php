<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\InventoryReservation;
use App\Models\Sale;
use App\Models\Shipment;
use App\Models\ShipmentItem;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class OrderFulfillmentService
{
    public function __construct(
        protected InventoryReservationService $reservationService,
        protected CouponService $couponService,
        protected PaymentService $paymentService
    ) {}

    /**
     * Create a shipment and allocate items for picking/packing.
     */
    public function createShipment(
        int $companyId,
        int $saleId,
        array $data,
        ?int $userId = null
    ): Shipment {
        return DB::transaction(function () use ($companyId, $saleId, $data, $userId) {
            $sale = Sale::with(['items', 'reservations'])
                ->where('company_id', $companyId)
                ->lockForUpdate()
                ->findOrFail($saleId);

            if (in_array($sale->fulfillment_status, ['SHIPPED', 'DELIVERED', 'CANCELLED'])) {
                throw new ConflictHttpException("Cannot create shipment for order in '{$sale->fulfillment_status}' status.");
            }

            $shipmentNumber = 'SHP-' . date('Ymd') . '-' . rand(1000, 9999);

            $shipment = Shipment::create([
                'company_id' => $companyId,
                'sale_id' => $sale->id,
                'warehouse_id' => $sale->warehouse_id,
                'shipping_method_id' => $sale->shipping_method_id,
                'shipment_number' => $shipmentNumber,
                'tracking_number' => $data['tracking_number'] ?? null,
                'carrier_name' => $data['carrier_name'] ?? 'Steadfast Courier',
                'status' => Shipment::STATUS_PENDING,
                'shipping_cost' => (float)($sale->shipping_amount ?? 0),
                'notes' => $data['notes'] ?? null,
                'created_by' => $userId,
            ]);

            foreach ($sale->items as $saleItem) {
                ShipmentItem::create([
                    'shipment_id' => $shipment->id,
                    'sale_item_id' => $saleItem->id,
                    'product_variant_id' => $saleItem->product_variant_id,
                    'quantity' => (float) $saleItem->quantity,
                ]);
            }

            $sale->update(['fulfillment_status' => 'ALLOCATED']);

            AuditLog::log(
                $companyId,
                $userId,
                'SHIPMENT_CREATED',
                $shipment->id,
                'Shipment',
                "Created shipment {$shipment->shipment_number} for Order #{$sale->order_number}."
            );

            return $shipment->load('items');
        });
    }

    /**
     * Advance shipment to PACKED / SHIPPED status, consuming reservations.
     */
    public function markAsShipped(
        int $companyId,
        int $shipmentId,
        ?string $trackingNumber = null,
        ?int $userId = null
    ): Shipment {
        return DB::transaction(function () use ($companyId, $shipmentId, $trackingNumber, $userId) {
            $shipment = Shipment::where('company_id', $companyId)->lockForUpdate()->findOrFail($shipmentId);
            $sale = Sale::with('reservations')->where('company_id', $companyId)->lockForUpdate()->findOrFail($shipment->sale_id);

            if ($shipment->status === Shipment::STATUS_SHIPPED) {
                return $shipment;
            }

            $shipment->status = Shipment::STATUS_SHIPPED;
            $shipment->shipped_at = Carbon::now();
            if ($trackingNumber) {
                $shipment->tracking_number = $trackingNumber;
                $sale->tracking_number = $trackingNumber;
            }
            $shipment->save();

            // Consume all active inventory reservations for this sale -> triggers physical StockMovement (STOCK_OUT)
            foreach ($sale->reservations as $res) {
                if (in_array($res->status, [InventoryReservation::STATUS_RESERVED, InventoryReservation::STATUS_ALLOCATED])) {
                    $this->reservationService->consumeReservation(
                        companyId: $companyId,
                        reservationId: $res->id,
                        userId: $userId,
                        referenceNumber: $sale->invoice_number
                    );
                }
            }

            $sale->fulfillment_status = 'SHIPPED';
            $sale->save();

            AuditLog::log(
                $companyId,
                $userId,
                'SHIPMENT_DISPATCHED',
                $shipment->id,
                'Shipment',
                "Dispatched shipment {$shipment->shipment_number} (Tracking: {$shipment->tracking_number}) for Order #{$sale->order_number}."
            );

            return $shipment;
        });
    }

    /**
     * Mark shipment as DELIVERED, collecting COD if applicable.
     */
    public function markAsDelivered(int $companyId, int $shipmentId, ?int $userId = null): Shipment
    {
        return DB::transaction(function () use ($companyId, $shipmentId, $userId) {
            $shipment = Shipment::where('company_id', $companyId)->lockForUpdate()->findOrFail($shipmentId);
            $sale = Sale::where('company_id', $companyId)->lockForUpdate()->findOrFail($shipment->sale_id);

            $shipment->status = Shipment::STATUS_DELIVERED;
            $shipment->delivered_at = Carbon::now();
            $shipment->save();

            $sale->fulfillment_status = 'DELIVERED';

            // If COD and unpaid, settle payment via canonical PaymentService
            if ($sale->payment_status !== 'PAID' && (float)$sale->due_amount > 0) {
                $payment = $this->paymentService->createPayment(
                    companyId: $companyId,
                    data: [
                        'amount' => (float)$sale->due_amount,
                        'payment_type' => 'CUSTOMER',
                        'payment_method' => 'CASH',
                        'reference_number' => 'COD-' . $shipment->shipment_number,
                        'branch_id' => $sale->branch_id,
                        'idempotency_key' => 'COD-DELIVERY-' . $shipment->id,
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
                            'amount' => (float)$sale->due_amount,
                        ]
                    ],
                    userId: $userId
                );

                $sale->payment_status = 'PAID';
                $sale->paid_amount = (float)$sale->grand_total;
                $sale->due_amount = 0.0;
            }

            $sale->save();

            AuditLog::log(
                $companyId,
                $userId,
                'SHIPMENT_DELIVERED',
                $shipment->id,
                'Shipment',
                "Delivered shipment {$shipment->shipment_number} for Order #{$sale->order_number}."
            );

            return $shipment;
        });
    }

    /**
     * Cancel an order and safely release inventory reservations.
     */
    public function cancelOrder(int $companyId, int $saleId, ?string $reason = null, ?int $userId = null): Sale
    {
        return DB::transaction(function () use ($companyId, $saleId, $reason, $userId) {
            $sale = Sale::with('reservations')->where('company_id', $companyId)->lockForUpdate()->findOrFail($saleId);

            if (in_array($sale->fulfillment_status, ['SHIPPED', 'DELIVERED'])) {
                throw new ConflictHttpException("Cannot cancel an order that has already been shipped. Please initiate a Sales Return instead.");
            }

            // Release all active inventory reservations
            foreach ($sale->reservations as $res) {
                $this->reservationService->releaseReservation($companyId, $res->id, $reason, $userId);
            }

            // Release coupon usage
            $this->couponService->releaseUsage($companyId, $sale->id);

            $sale->status = 'VOIDED';
            $sale->fulfillment_status = 'CANCELLED';
            $sale->notes = ($sale->notes ? $sale->notes . "\n" : '') . "Cancelled: " . ($reason ?? 'User cancellation');
            $sale->save();

            AuditLog::log(
                $companyId,
                $userId,
                'ECOMMERCE_ORDER_CANCELLED',
                $sale->id,
                'Sale',
                "Cancelled order {$sale->order_number}. Reason: {$reason}."
            );

            return $sale;
        });
    }
}
