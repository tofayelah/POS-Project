<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Inventory;
use App\Models\StockMovement;
use App\Models\ProductVariant;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Illuminate\Support\Str;

class InventoryService
{
    /**
     * Process an inventory movement safely with locking.
     */
    public function processMovement(
        int $companyId,
        int $warehouseId,
        int $productVariantId,
        string $movementType, // OPENING_STOCK, STOCK_IN, STOCK_OUT, TRANSFER_OUT, TRANSFER_IN, ADJUSTMENT_IN, ADJUSTMENT_OUT, DAMAGE, LOSS
        float $quantity,
        float $unitCost = 0,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $referenceNumber = null,
        ?string $reason = null,
        ?string $notes = null,
        ?int $userId = null,
        bool $allowNegative = false
    ): StockMovement {
        return DB::transaction(function () use (
            $companyId, $warehouseId, $productVariantId, $movementType, $quantity, $unitCost,
            $referenceType, $referenceId, $referenceNumber, $reason, $notes, $userId, $allowNegative
        ) {
            $variant = ProductVariant::findOrFail($productVariantId);
            $productId = $variant->product_id;

            // Determine if movement is incoming or outgoing
            $isIncoming = in_array($movementType, ['OPENING_STOCK', 'STOCK_IN', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'RETURN_IN', 'RETURN_DAMAGED_IN']);
            
            if ($quantity <= 0) {
                throw new ConflictHttpException("Movement quantity must be greater than zero.");
            }
            
            // Get or create inventory position with lock
            $inventory = Inventory::firstOrCreate(
                [
                    'company_id' => $companyId,
                    'warehouse_id' => $warehouseId,
                    'product_variant_id' => $productVariantId,
                ],
                [
                    'product_id' => $productId,
                    'quantity' => 0,
                    'reserved_quantity' => 0,
                    'available_quantity' => 0,
                    'average_cost' => 0,
                    'total_value' => 0,
                ]
            );

            // Lock the row for update
            $inventory = Inventory::where('id', $inventory->id)->lockForUpdate()->first();

            $quantityBefore = $inventory->quantity;
            $quantityAfter = $isIncoming ? ($quantityBefore + $quantity) : ($quantityBefore - $quantity);

            if (!$isIncoming && !$allowNegative && $quantityAfter < 0) {
                throw new ConflictHttpException("Insufficient stock in warehouse for variant {$variant->sku}. Available: {$quantityBefore}, Requested: {$quantity}");
            }

            // Calculate moving average cost for incoming stock
            if ($isIncoming) {
                $currentTotalValue = $inventory->quantity * $inventory->average_cost;
                $incomingTotalValue = $quantity * $unitCost;
                $newTotalValue = $currentTotalValue + $incomingTotalValue;
                
                $inventory->average_cost = $quantityAfter > 0 ? ($newTotalValue / $quantityAfter) : 0;
            } else {
                // Outgoing stock uses current average cost (simplified)
                $unitCost = $inventory->average_cost;
            }

            $inventory->quantity = $quantityAfter;
            $inventory->available_quantity = $quantityAfter - $inventory->reserved_quantity;
            $inventory->total_value = $inventory->quantity * $inventory->average_cost;
            $inventory->save();

            // Create immutable movement
            $movement = StockMovement::create([
                'company_id' => $companyId,
                'warehouse_id' => $warehouseId,
                'product_id' => $productId,
                'product_variant_id' => $productVariantId,
                'movement_type' => $movementType,
                'quantity' => $quantity,
                'unit_cost' => $unitCost,
                'total_cost' => $quantity * $unitCost,
                'quantity_before' => $quantityBefore,
                'quantity_after' => $quantityAfter,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'reference_number' => $referenceNumber,
                'reason' => $reason,
                'notes' => $notes,
                'created_by' => $userId,
            ]);

            return $movement;
        });
    }

    public function addOpeningStock(array $data, ?int $userId): StockMovement
    {
        return DB::transaction(function () use ($data, $userId) {
            // Check if opening stock already exists for this position
            $existingMovement = StockMovement::where('company_id', $data['company_id'])
                ->where('warehouse_id', $data['warehouse_id'])
                ->where('product_variant_id', $data['product_variant_id'])
                ->where('movement_type', 'OPENING_STOCK')
                ->exists();

            if ($existingMovement) {
                throw new ConflictHttpException("Opening stock has already been recorded for this variant in this warehouse.");
            }

            $movement = $this->processMovement(
                companyId: $data['company_id'],
                warehouseId: $data['warehouse_id'],
                productVariantId: $data['product_variant_id'],
                movementType: 'OPENING_STOCK',
                quantity: $data['quantity'],
                unitCost: $data['unit_cost'] ?? 0,
                reason: $data['reason'] ?? 'Initial stock entry',
                notes: $data['notes'] ?? null,
                userId: $userId
            );

            AuditLog::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $data['company_id'],
                'user_id' => $userId,
                'event' => 'OPENING_STOCK_CREATED',
                'auditable_type' => StockMovement::class,
                'auditable_id' => $movement->id,
                'new_values' => [
                    'warehouse_id' => $movement->warehouse_id,
                    'variant_id' => $movement->product_variant_id,
                    'quantity' => $movement->quantity,
                ],
            ]);

            return $movement;
        });
    }

    public function adjustStock(array $data, ?int $userId): StockMovement
    {
        return DB::transaction(function () use ($data, $userId) {
            if (empty($data['reason'])) {
                throw new ConflictHttpException("Reason is mandatory for stock adjustments.");
            }

            $movementType = $data['type'] === 'add' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';

            $movement = $this->processMovement(
                companyId: $data['company_id'],
                warehouseId: $data['warehouse_id'],
                productVariantId: $data['product_variant_id'],
                movementType: $movementType,
                quantity: $data['quantity'],
                unitCost: $data['unit_cost'] ?? 0,
                reason: $data['reason'],
                notes: $data['notes'] ?? null,
                userId: $userId
            );

            AuditLog::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $data['company_id'],
                'user_id' => $userId,
                'event' => 'STOCK_ADJUSTED',
                'auditable_type' => StockMovement::class,
                'auditable_id' => $movement->id,
                'new_values' => [
                    'type' => $movementType,
                    'quantity' => $movement->quantity,
                    'reason' => $data['reason'],
                ],
            ]);

            return $movement;
        });
    }

    public function recordDamageLoss(array $data, ?int $userId): StockMovement
    {
        return DB::transaction(function () use ($data, $userId) {
            if (empty($data['reason'])) {
                throw new ConflictHttpException("Reason is mandatory for damage/loss.");
            }

            $movementType = $data['type'] === 'damage' ? 'DAMAGE' : 'LOSS';

            $movement = $this->processMovement(
                companyId: $data['company_id'],
                warehouseId: $data['warehouse_id'],
                productVariantId: $data['product_variant_id'],
                movementType: $movementType,
                quantity: $data['quantity'],
                reason: $data['reason'],
                notes: $data['notes'] ?? null,
                userId: $userId
            );

            AuditLog::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $data['company_id'],
                'user_id' => $userId,
                'event' => $movementType === 'DAMAGE' ? 'DAMAGE_RECORDED' : 'LOSS_RECORDED',
                'auditable_type' => StockMovement::class,
                'auditable_id' => $movement->id,
                'new_values' => [
                    'quantity' => $movement->quantity,
                    'reason' => $data['reason'],
                ],
            ]);

            return $movement;
        });
    }
}
