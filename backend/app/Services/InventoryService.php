<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Company;
use App\Models\Inventory;
use App\Models\StockMovement;
use App\Models\ProductVariant;
use App\Models\StorageLocation;
use App\Models\StockBatch;
use App\Models\InventoryBatch;
use App\Models\Warehouse;
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
        bool $allowNegative = false,
        ?int $storageLocationId = null,
        ?int $stockBatchId = null
    ): StockMovement {
        return DB::transaction(function () use (
            $companyId, $warehouseId, $productVariantId, $movementType, $quantity, $unitCost,
            $referenceType, $referenceId, $referenceNumber, $reason, $notes, $userId, $allowNegative,
            $storageLocationId, $stockBatchId
        ) {
            $variant = ProductVariant::with('product')->findOrFail($productVariantId);
            $productId = $variant->product_id;
            
            // 1 & 2. Variant and Product company scope
            if (!$variant->product || $variant->product->company_id !== $companyId) {
                throw new ConflictHttpException("Product variant does not belong to the specified company.");
            }

            // 3. Warehouse company scope
            $warehouse = \App\Models\Warehouse::find($warehouseId);
            if (!$warehouse || $warehouse->company_id !== $companyId) {
                throw new ConflictHttpException("Warehouse does not belong to the specified company.");
            }

            // 4. Validate Storage Location
            if ($storageLocationId) {
                $location = StorageLocation::find($storageLocationId);
                if (!$location || $location->warehouse_id !== $warehouseId || $location->company_id !== $companyId) {
                    throw new ConflictHttpException("Storage location does not belong to the specified warehouse or company.");
                }
            }

            // 5. Validate Stock Batch
            if ($stockBatchId) {
                $batch = StockBatch::find($stockBatchId);
                if (!$batch || $batch->variant_id !== $productVariantId || $batch->company_id !== $companyId) {
                    throw new ConflictHttpException("Stock batch does not belong to the specified product variant or company.");
                }
            }

            // Idempotency Check
            if ($referenceType && $referenceId) {
                $exists = StockMovement::where('company_id', $companyId)
                    ->where('movement_type', $movementType)
                    ->where('reference_type', $referenceType)
                    ->where('reference_id', $referenceId)
                    ->exists();
                if ($exists) {
                    throw new ConflictHttpException("A movement with this reference already exists.");
                }
            }

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

            // Handle granular InventoryBatch tracking
            if ($stockBatchId || $storageLocationId) {
                if (!$stockBatchId) {
                    throw new ConflictHttpException("Stock batch is required when granular location tracking is used.");
                }
                $invBatch = InventoryBatch::firstOrCreate([
                    'inventory_id' => $inventory->id,
                    'stock_batch_id' => $stockBatchId,
                    'storage_location_id' => $storageLocationId,
                ], [
                    'quantity' => 0
                ]);
                $invBatch = InventoryBatch::where('id', $invBatch->id)->lockForUpdate()->first();
                $invQuantityAfter = $isIncoming ? ($invBatch->quantity + $quantity) : ($invBatch->quantity - $quantity);
                if (!$isIncoming && !$allowNegative && $invQuantityAfter < 0) {
                    throw new ConflictHttpException("Insufficient stock in the specified batch/location.");
                }
                $invBatch->quantity = $invQuantityAfter;
                $invBatch->save();
            }


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
                'storage_location_id' => $storageLocationId,
                'stock_batch_id' => $stockBatchId,
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
                userId: $userId,
                allowNegative: false,
                storageLocationId: $data['storage_location_id'] ?? null,
                stockBatchId: $data['stock_batch_id'] ?? null
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
                userId: $userId,
                allowNegative: false,
                storageLocationId: $data['storage_location_id'] ?? null,
                stockBatchId: $data['stock_batch_id'] ?? null
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
                userId: $userId,
                allowNegative: false,
                storageLocationId: $data['storage_location_id'] ?? null,
                stockBatchId: $data['stock_batch_id'] ?? null
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

    /**
     * Deduct stock for sales, exchange out, and other outbound operations.
     * Compliant with Phase 3 Gate 1.1 requirements.
     */
    public function stockOut(
        int $companyId,
        int $warehouseId,
        int $productVariantId,
        float $quantity,
        string $referenceType,
        int $referenceId,
        string $referenceNumber,
        ?string $reason = null,
        ?string $notes = null,
        ?int $userId = null,
        ?int $stockBatchId = null,
        ?int $storageLocationId = null
    ): StockMovement {
        return DB::transaction(function () use (
            $companyId, $warehouseId, $productVariantId, $quantity,
            $referenceType, $referenceId, $referenceNumber,
            $reason, $notes, $userId, $stockBatchId, $storageLocationId
        ) {
            if ($quantity <= 0) {
                throw new ConflictHttpException("Stock-out quantity must be greater than zero.");
            }

            // A. Company validation
            $company = Company::find($companyId);
            if (!$company) {
                throw new ConflictHttpException("Company does not exist.");
            }

            // B. Warehouse validation
            $warehouse = Warehouse::find($warehouseId);
            if (!$warehouse || $warehouse->company_id !== $companyId) {
                throw new ConflictHttpException("Warehouse does not belong to the specified company.");
            }

            // C. Product Variant validation
            $variant = ProductVariant::with('product')->find($productVariantId);
            if (!$variant || !$variant->product || $variant->product->company_id !== $companyId) {
                throw new ConflictHttpException("Product variant does not belong to the specified company.");
            }
            $productId = $variant->product_id;

            // D. Stock Batch validation (when supplied)
            $batch = null;
            if ($stockBatchId !== null) {
                $batch = StockBatch::find($stockBatchId);
                if (!$batch) {
                    throw new ConflictHttpException("Stock batch does not exist.");
                }
                if ($batch->company_id !== $companyId) {
                    throw new ConflictHttpException("Stock batch does not belong to the specified company.");
                }
                if ($batch->variant_id !== $productVariantId) {
                    throw new ConflictHttpException("Stock batch does not belong to the specified product variant.");
                }
                if ($batch->product_id !== $productId) {
                    throw new ConflictHttpException("Stock batch product does not match the product variant.");
                }
                if ($batch->status && !in_array(strtoupper($batch->status), ['ACTIVE', 'AVAILABLE'])) {
                    throw new ConflictHttpException("Stock batch is not active or available for stock-out.");
                }
            }

            // E. Storage Location validation (when supplied)
            $location = null;
            if ($storageLocationId !== null) {
                $location = StorageLocation::find($storageLocationId);
                if (!$location) {
                    throw new ConflictHttpException("Storage location does not exist.");
                }
                if ($location->warehouse_id !== $warehouseId) {
                    throw new ConflictHttpException("Storage location does not belong to the specified warehouse.");
                }
                if ($location->company_id !== $companyId) {
                    throw new ConflictHttpException("Storage location does not belong to the specified company.");
                }
                if (isset($location->is_active) && !$location->is_active) {
                    throw new ConflictHttpException("Storage location is inactive.");
                }
            }

            // If storage location is supplied without a stock batch
            if ($storageLocationId !== null && $stockBatchId === null) {
                throw new ConflictHttpException("Stock batch is required when storage location tracking is used.");
            }

            // Movement type matches reference type (e.g. SALE, EXCHANGE_OUT, STOCK_OUT)
            $movementType = $referenceType;

            // Idempotency: duplicate protection for non-null reference where reference_id != 0
            if (!empty($referenceType) && !empty($referenceId) && $referenceId !== 0) {
                $existing = StockMovement::where('company_id', $companyId)
                    ->where('movement_type', $movementType)
                    ->where('reference_type', $referenceType)
                    ->where('reference_id', $referenceId)
                    ->where('product_variant_id', $productVariantId)
                    ->first();

                if ($existing) {
                    return $existing;
                }
            }

            // Lock and retrieve Inventory
            $inventory = Inventory::where('company_id', $companyId)
                ->where('warehouse_id', $warehouseId)
                ->where('product_variant_id', $productVariantId)
                ->lockForUpdate()
                ->first();

            $quantityBefore = $inventory ? (float) $inventory->quantity : 0.0;
            $quantityAfter = $quantityBefore - $quantity;

            if (!$inventory || $quantityAfter < 0) {
                throw new ConflictHttpException("Insufficient stock in warehouse for variant {$variant->sku}. Available: {$quantityBefore}, Requested: {$quantity}");
            }

            // Determine unit cost
            $unitCost = (float) $inventory->average_cost;
            if ($unitCost <= 0 && $batch && $batch->unit_cost > 0) {
                $unitCost = (float) $batch->unit_cost;
            }
            if ($unitCost <= 0 && isset($variant->cost_price) && $variant->cost_price > 0) {
                $unitCost = (float) $variant->cost_price;
            }
            if ($unitCost <= 0 && isset($variant->cost) && $variant->cost > 0) {
                $unitCost = (float) $variant->cost;
            }

            $totalCost = $quantity * $unitCost;

            // Update InventoryBatch if stockBatchId is supplied
            if ($stockBatchId !== null) {
                $invBatchQuery = InventoryBatch::where('inventory_id', $inventory->id)
                    ->where('stock_batch_id', $stockBatchId);

                if ($storageLocationId !== null) {
                    $invBatchQuery->where('storage_location_id', $storageLocationId);
                } else {
                    $invBatchQuery->whereNull('storage_location_id');
                }

                $invBatch = $invBatchQuery->lockForUpdate()->first();

                if (!$invBatch) {
                    throw new ConflictHttpException("No inventory batch record found for the specified batch and location.");
                }

                $batchQtyBefore = (float) $invBatch->quantity;
                if ($batchQtyBefore < $quantity) {
                    throw new ConflictHttpException("Insufficient stock in the specified batch/location. Available: {$batchQtyBefore}, Requested: {$quantity}");
                }

                $invBatch->quantity = $batchQtyBefore - $quantity;
                $invBatch->save();
            }

            // Update Inventory
            $inventory->quantity = $quantityAfter;
            $inventory->available_quantity = $quantityAfter - (float) $inventory->reserved_quantity;
            $inventory->total_value = $inventory->quantity * $inventory->average_cost;
            $inventory->save();

            // Create immutable StockMovement
            $movement = StockMovement::create([
                'company_id' => $companyId,
                'warehouse_id' => $warehouseId,
                'product_id' => $productId,
                'product_variant_id' => $productVariantId,
                'movement_type' => $movementType,
                'quantity' => $quantity,
                'unit_cost' => $unitCost,
                'total_cost' => $totalCost,
                'quantity_before' => $quantityBefore,
                'quantity_after' => $quantityAfter,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'reference_number' => $referenceNumber,
                'reason' => $reason,
                'notes' => $notes,
                'created_by' => $userId,
                'storage_location_id' => $storageLocationId,
                'stock_batch_id' => $stockBatchId,
            ]);

            return $movement;
        });
    }
}
