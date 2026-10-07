<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Inventory;
use App\Models\InventoryReservation;
use App\Models\ProductVariant;
use App\Models\Warehouse;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class InventoryReservationService
{
    public function __construct(
        protected InventoryService $inventoryService
    ) {}

    /**
     * Reserve inventory for an e-commerce order atomically with row locking.
     */
    public function reserveStock(
        int $companyId,
        int $warehouseId,
        int $variantId,
        float $quantity,
        ?int $saleId = null,
        ?string $token = null,
        int $ttlMinutes = 60,
        ?int $userId = null
    ): InventoryReservation {
        if ($quantity <= 0) {
            throw new ConflictHttpException("Reservation quantity must be greater than zero.");
        }

        return DB::transaction(function () use (
            $companyId, $warehouseId, $variantId, $quantity, $saleId, $token, $ttlMinutes, $userId
        ) {
            $warehouse = Warehouse::where('company_id', $companyId)->find($warehouseId);
            if (!$warehouse || $warehouse->status === 'inactive') {
                throw new ConflictHttpException("Warehouse is inactive or invalid.");
            }

            $variant = ProductVariant::where('id', $variantId)->first();
            if (!$variant) {
                throw new NotFoundHttpException("Product variant not found.");
            }

            // Lock the inventory row
            $inventory = Inventory::where('company_id', $companyId)
                ->where('warehouse_id', $warehouseId)
                ->where('product_variant_id', $variantId)
                ->lockForUpdate()
                ->first();

            if (!$inventory) {
                // Initialize inventory if not existing yet
                $inventory = Inventory::create([
                    'company_id' => $companyId,
                    'warehouse_id' => $warehouseId,
                    'product_id' => $variant->product_id,
                    'product_variant_id' => $variantId,
                    'quantity' => 0,
                    'reserved_quantity' => 0,
                    'available_quantity' => 0,
                    'average_cost' => (float)$variant->cost_price,
                    'total_value' => 0,
                ]);
                $inventory = Inventory::where('id', $inventory->id)->lockForUpdate()->first();
            }

            $currentAvailable = (float) $inventory->available_quantity;
            if ($currentAvailable < $quantity) {
                throw new ConflictHttpException(
                    "Insufficient sellable stock for variant '{$variant->sku}'. Available: {$currentAvailable}, Requested: {$quantity}"
                );
            }

            // Update reserved and available quantities
            $inventory->reserved_quantity = (float) $inventory->reserved_quantity + $quantity;
            $inventory->available_quantity = (float) $inventory->quantity - (float) $inventory->reserved_quantity;
            $inventory->save();

            $reservation = InventoryReservation::create([
                'company_id' => $companyId,
                'warehouse_id' => $warehouseId,
                'product_variant_id' => $variantId,
                'sale_id' => $saleId,
                'reservation_token' => $token,
                'quantity' => $quantity,
                'status' => InventoryReservation::STATUS_RESERVED,
                'expires_at' => Carbon::now()->addMinutes($ttlMinutes),
            ]);

            AuditLog::log(
                $companyId,
                $userId,
                'INVENTORY_RESERVED',
                $reservation->id,
                'InventoryReservation',
                "Reserved {$quantity} units for variant {$variant->sku} in warehouse {$warehouse->name}."
            );

            return $reservation;
        });
    }

    /**
     * Release an active reservation and restore available quantity.
     */
    public function releaseReservation(
        int $companyId,
        int $reservationId,
        ?string $reason = null,
        ?int $userId = null
    ): bool {
        return DB::transaction(function () use ($companyId, $reservationId, $reason, $userId) {
            $reservation = InventoryReservation::where('company_id', $companyId)
                ->lockForUpdate()
                ->find($reservationId);

            if (!$reservation) {
                throw new NotFoundHttpException("Reservation not found.");
            }

            if (!in_array($reservation->status, [InventoryReservation::STATUS_RESERVED, InventoryReservation::STATUS_ALLOCATED])) {
                return false; // Already released or consumed
            }

            $inventory = Inventory::where('company_id', $companyId)
                ->where('warehouse_id', $reservation->warehouse_id)
                ->where('product_variant_id', $reservation->product_variant_id)
                ->lockForUpdate()
                ->first();

            if ($inventory) {
                $qty = (float) $reservation->quantity;
                $inventory->reserved_quantity = max(0, (float) $inventory->reserved_quantity - $qty);
                $inventory->available_quantity = (float) $inventory->quantity - (float) $inventory->reserved_quantity;
                $inventory->save();
            }

            $reservation->status = InventoryReservation::STATUS_RELEASED;
            $reservation->released_at = Carbon::now();
            $reservation->notes = $reason ?? 'Released reservation';
            $reservation->save();

            AuditLog::log(
                $companyId,
                $userId,
                'INVENTORY_RESERVATION_RELEASED',
                $reservation->id,
                'InventoryReservation',
                "Released reservation #{$reservation->id} for {$reservation->quantity} units."
            );

            return true;
        });
    }

    /**
     * Consume a reservation upon shipment and trigger canonical StockMovement.
     */
    public function consumeReservation(
        int $companyId,
        int $reservationId,
        ?int $userId = null,
        ?string $referenceNumber = null
    ): bool {
        return DB::transaction(function () use ($companyId, $reservationId, $userId, $referenceNumber) {
            $reservation = InventoryReservation::where('company_id', $companyId)
                ->lockForUpdate()
                ->find($reservationId);

            if (!$reservation) {
                throw new NotFoundHttpException("Reservation not found.");
            }

            if ($reservation->status === InventoryReservation::STATUS_CONSUMED) {
                return true;
            }

            $inventory = Inventory::where('company_id', $companyId)
                ->where('warehouse_id', $reservation->warehouse_id)
                ->where('product_variant_id', $reservation->product_variant_id)
                ->lockForUpdate()
                ->first();

            if ($inventory) {
                $qty = (float) $reservation->quantity;
                $inventory->reserved_quantity = max(0, (float) $inventory->reserved_quantity - $qty);
                $inventory->save();
            }

            $reservation->status = InventoryReservation::STATUS_CONSUMED;
            $reservation->consumed_at = Carbon::now();
            $reservation->save();

            // Perform canonical physical movement through authoritative InventoryService
            $this->inventoryService->processMovement(
                companyId: $companyId,
                warehouseId: $reservation->warehouse_id,
                productVariantId: $reservation->product_variant_id,
                movementType: 'STOCK_OUT',
                quantity: (float) $reservation->quantity,
                unitCost: (float) ($inventory?->average_cost ?? 0),
                referenceType: 'Sale',
                referenceId: $reservation->sale_id,
                referenceNumber: $referenceNumber,
                reason: 'E-commerce order fulfillment',
                userId: $userId
            );

            AuditLog::log(
                $companyId,
                $userId,
                'INVENTORY_RESERVATION_CONSUMED',
                $reservation->id,
                'InventoryReservation',
                "Consumed reservation #{$reservation->id} and processed STOCK_OUT for sale #{$reservation->sale_id}."
            );

            return true;
        });
    }

    /**
     * Release all expired reservations for a company.
     */
    public function releaseExpiredReservations(int $companyId): int
    {
        $expired = InventoryReservation::where('company_id', $companyId)
            ->where('status', InventoryReservation::STATUS_RESERVED)
            ->where('expires_at', '<', Carbon::now())
            ->get();

        $count = 0;
        foreach ($expired as $res) {
            if ($this->releaseReservation($companyId, $res->id, 'Automatic expiration')) {
                $count++;
            }
        }

        return $count;
    }

    /**
     * Get sellable (available) quantity for a variant in a warehouse or company-wide.
     */
    public function getSellableQuantity(int $companyId, int $variantId, ?int $warehouseId = null): float
    {
        $query = Inventory::where('company_id', $companyId)
            ->where('product_variant_id', $variantId);

        if ($warehouseId) {
            $query->where('warehouse_id', $warehouseId);
        }

        return (float) max(0, $query->sum('available_quantity'));
    }
}
