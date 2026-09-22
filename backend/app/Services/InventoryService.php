<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Company;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\ProductVariant;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\StorageLocation;
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

    /**
     * Process stock-out with scope validation, locking, idempotency, and batch/location handling.
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
        if ($quantity <= 0) {
            throw new ConflictHttpException("Movement quantity must be greater than zero.");
        }

        return DB::transaction(function () use (
            $companyId,
            $warehouseId,
            $productVariantId,
            $quantity,
            $referenceType,
            $referenceId,
            $referenceNumber,
            $reason,
            $notes,
            $userId,
            $stockBatchId,
            $storageLocationId
        ) {
            // H. Idempotency: For non-zero reference_id, do not deduct stock twice
            if ($referenceId !== 0) {
                $existingMovement = StockMovement::where('company_id', $companyId)
                    ->where('movement_type', 'STOCK_OUT')
                    ->where('reference_type', $referenceType)
                    ->where('reference_id', $referenceId)
                    ->where('product_variant_id', $productVariantId)
                    ->first();

                if ($existingMovement) {
                    return $existingMovement;
                }
            }

            // B. Scope validation
            // 1. Warehouse belongs to company
            $warehouse = Warehouse::where('id', $warehouseId)
                ->where('company_id', $companyId)
                ->first();

            if (!$warehouse) {
                throw new ConflictHttpException("Warehouse not found or does not belong to company.");
            }

            // 2. ProductVariant belongs to the correct product/company scope
            $variant = ProductVariant::with('product')->find($productVariantId);
            if (!$variant || !$variant->product || (int) $variant->product->company_id !== $companyId) {
                throw new ConflictHttpException("Product variant not found or does not belong to company.");
            }
            $productId = $variant->product_id;

            // 3. If stockBatchId is supplied:
            if ($stockBatchId !== null) {
                $stockBatch = StockBatch::find($stockBatchId);
                if (!$stockBatch) {
                    throw new ConflictHttpException("Stock batch not found.");
                }
                if ((int) $stockBatch->company_id !== $companyId) {
                    throw new ConflictHttpException("Stock batch does not belong to company.");
                }
                if ((int) $stockBatch->variant_id !== $productVariantId) {
                    throw new ConflictHttpException("Stock batch does not match the requested product variant.");
                }
            }

            // 4. If storageLocationId is supplied:
            if ($storageLocationId !== null) {
                $storageLocation = StorageLocation::find($storageLocationId);
                if (!$storageLocation) {
                    throw new ConflictHttpException("Storage location not found.");
                }
                if ((int) $storageLocation->company_id !== $companyId) {
                    throw new ConflictHttpException("Storage location does not belong to company.");
                }
                if ((int) $storageLocation->warehouse_id !== $warehouseId) {
                    throw new ConflictHttpException("Storage location does not belong to the requested warehouse.");
                }
            }

            // D. Inventory locking
            $inventory = Inventory::where('company_id', $companyId)
                ->where('warehouse_id', $warehouseId)
                ->where('product_variant_id', $productVariantId)
                ->lockForUpdate()
                ->first();

            if (!$inventory || (float) $inventory->quantity < $quantity) {
                $available = $inventory ? (float) $inventory->quantity : 0.0;
                throw new ConflictHttpException("Insufficient stock in warehouse for variant {$variant->sku}. Available: {$available}, Requested: {$quantity}");
            }

            // E & J. Batch/location handling & InventoryBatch update
            if ($stockBatchId !== null) {
                $batchQuery = InventoryBatch::where('inventory_id', $inventory->id)
                    ->where('stock_batch_id', $stockBatchId);

                if ($storageLocationId !== null) {
                    $batchQuery->where('storage_location_id', $storageLocationId);
                } else {
                    $batchQuery->whereNull('storage_location_id');
                }

                $inventoryBatch = $batchQuery->lockForUpdate()->first();

                if (!$inventoryBatch) {
                    throw new ConflictHttpException("Matching inventory batch not found for the requested variant/batch and location.");
                }

                if ((float) $inventoryBatch->quantity < $quantity) {
                    throw new ConflictHttpException("Insufficient batch stock. Available: {$inventoryBatch->quantity}, Requested: {$quantity}");
                }

                $inventoryBatch->quantity = (float) $inventoryBatch->quantity - $quantity;
                $inventoryBatch->save();
            }

            // F. Unit cost
            $unitCost = 0.0;
            if ((float) $inventory->average_cost > 0) {
                $unitCost = (float) $inventory->average_cost;
            } elseif (isset($inventory->average_unit_cost) && (float) $inventory->average_unit_cost > 0) {
                $unitCost = (float) $inventory->average_unit_cost;
            } elseif ((float) $variant->cost_price > 0) {
                $unitCost = (float) $variant->cost_price;
            }
            $totalCost = $quantity * $unitCost;

            // Update Inventory position
            $quantityBefore = (float) $inventory->quantity;
            $quantityAfter = $quantityBefore - $quantity;

            $inventory->quantity = $quantityAfter;
            $inventory->available_quantity = $quantityAfter - (float) $inventory->reserved_quantity;
            $inventory->total_value = $quantityAfter * (float) $inventory->average_cost;
            $inventory->save();

            // G. Create StockMovement
            $movement = StockMovement::create([
                'company_id' => $companyId,
                'business_unit_id' => $warehouse->business_unit_id,
                'branch_id' => $warehouse->branch_id,
                'warehouse_id' => $warehouseId,
                'product_id' => $productId,
                'product_variant_id' => $productVariantId,
                'movement_type' => 'STOCK_OUT',
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
                'stock_batch_id' => $stockBatchId,
                'storage_location_id' => $storageLocationId,
            ]);

            return $movement;
        });
    }


    /**
     * Receive purchased inventory / stock in.
     * Phase 3 Gate 1.2.
     *
     * Uses a transaction-level PostgreSQL advisory lock per
     * company + warehouse + product variant to prevent the
     * first-inventory-row and stock-batch creation race.
     */
    public function stockIn(
        int $companyId,
        int $warehouseId,
        int $productVariantId,
        float $quantity,
        float $unitCost,
        string $referenceType,
        int $referenceId,
        string $referenceNumber,
        ?string $reason = null,
        ?string $notes = null,
        ?int $userId = null,
        ?int $stockBatchId = null,
        ?string $batchNumber = null,
        ?int $storageLocationId = null
    ): StockMovement {
        return DB::transaction(function () use (
            $companyId,
            $warehouseId,
            $productVariantId,
            $quantity,
            $unitCost,
            $referenceType,
            $referenceId,
            $referenceNumber,
            $reason,
            $notes,
            $userId,
            $stockBatchId,
            $batchNumber,
            $storageLocationId
        ) {
            // 1. Input validation
            if ($quantity <= 0) {
                throw new ConflictHttpException(
                    "Stock-in quantity must be greater than zero."
                );
            }

            if ($unitCost < 0) {
                throw new ConflictHttpException(
                    "Unit cost cannot be negative."
                );
            }

            // 2. Company validation
            $company = Company::find($companyId);

            if (!$company) {
                throw new ConflictHttpException(
                    "Company does not exist."
                );
            }

            // 3. Warehouse validation
            $warehouse = Warehouse::where('id', $warehouseId)
                ->where('company_id', $companyId)
                ->first();

            if (!$warehouse) {
                throw new ConflictHttpException(
                    "Warehouse does not belong to the specified company."
                );
            }

            // 4. Product Variant & Product validation
            $variant = ProductVariant::with('product')
                ->find($productVariantId);

            if (
                !$variant ||
                !$variant->product ||
                $variant->product->company_id !== $companyId
            ) {
                throw new ConflictHttpException(
                    "Product variant does not belong to the specified company."
                );
            }

            $productId = $variant->product_id;

            // 5. Storage Location validation
            if ($storageLocationId !== null) {
                $location = StorageLocation::find($storageLocationId);

                if (!$location) {
                    throw new ConflictHttpException(
                        "Storage location does not exist."
                    );
                }

                if ($location->company_id !== $companyId) {
                    throw new ConflictHttpException(
                        "Storage location does not belong to the specified company."
                    );
                }

                if ($location->warehouse_id !== $warehouseId) {
                    throw new ConflictHttpException(
                        "Storage location does not belong to the specified warehouse."
                    );
                }

                if (
                    isset($location->is_active) &&
                    !$location->is_active
                ) {
                    throw new ConflictHttpException(
                        "Storage location is inactive."
                    );
                }
            }

            // 6. PostgreSQL transaction-level advisory lock.
            // This serializes stock-in operations for the same
            // company + warehouse + variant, including the case
            // where the Inventory row does not yet exist.
            $lockKey = sprintf(
                'retailcore-stock-in:%d:%d:%d',
                $companyId,
                $warehouseId,
                $productVariantId
            );

            $lockHash = sprintf(
                '%u',
                crc32($lockKey)
            );

            DB::select(
                'SELECT pg_advisory_xact_lock(?)',
                [(int) $lockHash]
            );

            // 7. Get / create Inventory position and lock it
            $inventory = Inventory::where('company_id', $companyId)
                ->where('warehouse_id', $warehouseId)
                ->where('product_variant_id', $productVariantId)
                ->lockForUpdate()
                ->first();

            if (!$inventory) {
                $inventory = Inventory::create([
                    'company_id' => $companyId,
                    'business_unit_id' => $warehouse->business_unit_id ?? null,
                    'branch_id' => $warehouse->branch_id ?? null,
                    'warehouse_id' => $warehouseId,
                    'product_id' => $productId,
                    'product_variant_id' => $productVariantId,
                    'quantity' => 0,
                    'reserved_quantity' => 0,
                    'available_quantity' => 0,
                    'average_cost' => $unitCost,
                    'total_value' => 0,
                ]);

                $inventory = Inventory::where('id', $inventory->id)
                    ->lockForUpdate()
                    ->first();
            }

            // 8. Idempotency check under the same variant lock
            if (
                !empty($referenceType) &&
                !empty($referenceId) &&
                $referenceId !== 0
            ) {
                $existing = StockMovement::where('company_id', $companyId)
                    ->where('movement_type', 'STOCK_IN')
                    ->where('reference_type', $referenceType)
                    ->where('reference_id', $referenceId)
                    ->where('product_variant_id', $productVariantId)
                    ->first();

                if ($existing) {
                    return $existing;
                }
            }

            // 9. Stock Batch logic
            $batch = null;

            if ($stockBatchId !== null) {
                $batch = StockBatch::where('id', $stockBatchId)
                    ->lockForUpdate()
                    ->first();

                if (!$batch) {
                    throw new ConflictHttpException(
                        "Stock batch does not exist."
                    );
                }

                if ($batch->company_id !== $companyId) {
                    throw new ConflictHttpException(
                        "Stock batch does not belong to the specified company."
                    );
                }

                if ($batch->variant_id !== $productVariantId) {
                    throw new ConflictHttpException(
                        "Stock batch does not belong to the specified product variant."
                    );
                }

                if ($batch->product_id !== $productId) {
                    throw new ConflictHttpException(
                        "Stock batch product does not match the product variant."
                    );
                }

                if (
                    $batchNumber !== null &&
                    $batch->batch_no !== $batchNumber
                ) {
                    throw new ConflictHttpException(
                        "Batch number conflicts with the specified stock batch."
                    );
                }
            } elseif ($batchNumber !== null) {
                // Because the variant advisory lock is already held,
                // stock-in calls through this service cannot race here.
                $batch = StockBatch::where('company_id', $companyId)
                    ->where('variant_id', $productVariantId)
                    ->where('batch_no', $batchNumber)
                    ->lockForUpdate()
                    ->first();

                if ($batch) {
                    if ($batch->product_id !== $productId) {
                        throw new ConflictHttpException(
                            "Existing stock batch product does not match product variant."
                        );
                    }

                    $stockBatchId = $batch->id;
                } else {
                    $batch = StockBatch::create([
                        'company_id' => $companyId,
                        'product_id' => $productId,
                        'variant_id' => $productVariantId,
                        'batch_no' => $batchNumber,
                        'unit_cost' => $unitCost,
                        'status' => 'ACTIVE',
                    ]);

                    $stockBatchId = $batch->id;
                }
            }

            // 10. Moving average cost
            $oldQuantity = (float) $inventory->quantity;
            $oldAverageCost = (float) $inventory->average_cost;
            $receivedQuantity = (float) $quantity;
            $receivedUnitCost = (float) $unitCost;

            $newQuantity = $oldQuantity + $receivedQuantity;

            if ($oldQuantity <= 0) {
                $newAverageCost = $receivedUnitCost;
            } else {
                $newAverageCost =
                    (
                        ($oldQuantity * $oldAverageCost) +
                        ($receivedQuantity * $receivedUnitCost)
                    ) / $newQuantity;
            }

            $inventory->quantity = $newQuantity;
            $inventory->available_quantity =
                $newQuantity - (float) $inventory->reserved_quantity;
            $inventory->average_cost = $newAverageCost;
            $inventory->total_value = $newQuantity * $newAverageCost;
            $inventory->save();

            // 11. Update / create InventoryBatch
            if ($stockBatchId !== null) {
                $invBatchQuery = InventoryBatch::where(
                    'inventory_id',
                    $inventory->id
                )->where(
                    'stock_batch_id',
                    $stockBatchId
                );

                if ($storageLocationId !== null) {
                    $invBatchQuery->where(
                        'storage_location_id',
                        $storageLocationId
                    );
                } else {
                    $invBatchQuery->whereNull(
                        'storage_location_id'
                    );
                }

                $invBatch = $invBatchQuery
                    ->lockForUpdate()
                    ->first();

                if ($invBatch) {
                    $invBatch->quantity =
                        (float) $invBatch->quantity + $quantity;

                    $invBatch->save();
                } else {
                    $invBatch = InventoryBatch::create([
                        'inventory_id' => $inventory->id,
                        'stock_batch_id' => $stockBatchId,
                        'storage_location_id' => $storageLocationId,
                        'quantity' => $quantity,
                    ]);
                }
            }

            // 12. Create immutable StockMovement
            $movement = StockMovement::create([
                'company_id' => $companyId,
                'business_unit_id' => $warehouse->business_unit_id ?? null,
                'branch_id' => $warehouse->branch_id ?? null,
                'warehouse_id' => $warehouseId,
                'product_id' => $productId,
                'product_variant_id' => $productVariantId,
                'movement_type' => 'STOCK_IN',
                'quantity' => $quantity,
                'unit_cost' => $unitCost,
                'total_cost' => $quantity * $unitCost,
                'quantity_before' => $oldQuantity,
                'quantity_after' => $newQuantity,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'reference_number' => $referenceNumber,
                'reason' => $reason,
                'notes' => $notes,
                'created_by' => $userId,
                'stock_batch_id' => $stockBatchId,
                'storage_location_id' => $storageLocationId,
            ]);

            // 13. Audit log
            AuditLog::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $companyId,
                'user_id' => $userId,
                'event' => 'STOCK_IN_RECEIVED',
                'auditable_type' => StockMovement::class,
                'auditable_id' => $movement->id,
                'new_values' => [
                    'warehouse_id' => $warehouseId,
                    'variant_id' => $productVariantId,
                    'quantity' => $quantity,
                    'unit_cost' => $unitCost,
                    'reference_type' => $referenceType,
                    'reference_id' => $referenceId,
                    'reference_number' => $referenceNumber,
                ],
            ]);

            return $movement;
        });
    }

    /**
     * Acquire a transaction-level PostgreSQL advisory lock for inventory operations.
     */
    protected function acquireInventoryLock(int $companyId, int $warehouseId, int $productVariantId): void
    {
        $lockKey = sprintf('retailcore-inv:%d:%d:%d', $companyId, $warehouseId, $productVariantId);
        $lockHash = sprintf('%u', crc32($lockKey));
        DB::select('SELECT pg_advisory_xact_lock(?)', [(int) $lockHash]);
    }

    /**
     * Transfer stock atomically between warehouses or storage locations.
     * Phase 3 Gate 1.3.
     */
    public function transferStock(
        int $companyId,
        int $sourceWarehouseId,
        int $destinationWarehouseId,
        int $productVariantId,
        float $quantity,
        string $referenceType,
        int $referenceId,
        string $referenceNumber,
        ?int $sourceStorageLocationId = null,
        ?int $destinationStorageLocationId = null,
        ?int $stockBatchId = null,
        ?string $reason = null,
        ?string $notes = null,
        ?int $userId = null
    ): array {
        if ($quantity <= 0) {
            throw new ConflictHttpException("Transfer quantity must be greater than zero.");
        }

        $isSameWarehouse = ($sourceWarehouseId === $destinationWarehouseId);

        if ($isSameWarehouse) {
            if ($sourceStorageLocationId === null || $destinationStorageLocationId === null) {
                throw new ConflictHttpException("Source and destination storage locations are required for same-warehouse transfers.");
            }
            if ($sourceStorageLocationId === $destinationStorageLocationId) {
                throw new ConflictHttpException("Source and destination storage locations cannot be the same.");
            }
        }

        return DB::transaction(function () use (
            $companyId,
            $sourceWarehouseId,
            $destinationWarehouseId,
            $productVariantId,
            $quantity,
            $referenceType,
            $referenceId,
            $referenceNumber,
            $sourceStorageLocationId,
            $destinationStorageLocationId,
            $stockBatchId,
            $reason,
            $notes,
            $userId,
            $isSameWarehouse
        ) {
            // 1. Company validation
            $company = Company::find($companyId);
            if (!$company) {
                throw new ConflictHttpException("Company does not exist.");
            }

            // 2. Source warehouse validation
            $sourceWarehouse = Warehouse::where('id', $sourceWarehouseId)
                ->where('company_id', $companyId)
                ->first();
            if (!$sourceWarehouse) {
                throw new ConflictHttpException("Source warehouse does not belong to the specified company.");
            }

            // 3. Destination warehouse validation
            $destinationWarehouse = Warehouse::where('id', $destinationWarehouseId)
                ->where('company_id', $companyId)
                ->first();
            if (!$destinationWarehouse) {
                throw new ConflictHttpException("Destination warehouse does not belong to the specified company.");
            }

            // 4. Product Variant & Product validation
            $variant = ProductVariant::with('product')->find($productVariantId);
            if (!$variant || !$variant->product || (int) $variant->product->company_id !== $companyId) {
                throw new ConflictHttpException("Product variant does not belong to the specified company.");
            }
            $productId = $variant->product_id;

            // 5. Source storage location validation
            if ($sourceStorageLocationId !== null) {
                $srcLoc = StorageLocation::find($sourceStorageLocationId);
                if (!$srcLoc || (int) $srcLoc->company_id !== $companyId || (int) $srcLoc->warehouse_id !== $sourceWarehouseId) {
                    throw new ConflictHttpException("Source storage location is invalid or does not belong to the source warehouse.");
                }
                if (isset($srcLoc->is_active) && !$srcLoc->is_active) {
                    throw new ConflictHttpException("Source storage location is inactive.");
                }
            }

            // 6. Destination storage location validation
            if ($destinationStorageLocationId !== null) {
                $destLoc = StorageLocation::find($destinationStorageLocationId);
                if (!$destLoc || (int) $destLoc->company_id !== $companyId || (int) $destLoc->warehouse_id !== $destinationWarehouseId) {
                    throw new ConflictHttpException("Destination storage location is invalid or does not belong to the destination warehouse.");
                }
                if (isset($destLoc->is_active) && !$destLoc->is_active) {
                    throw new ConflictHttpException("Destination storage location is inactive.");
                }
            }

            // 7. Stock batch validation
            if ($stockBatchId !== null) {
                $batch = StockBatch::find($stockBatchId);
                if (!$batch || (int) $batch->company_id !== $companyId) {
                    throw new ConflictHttpException("Stock batch does not belong to the specified company.");
                }
                if ((int) $batch->variant_id !== $productVariantId || (int) $batch->product_id !== $productId) {
                    throw new ConflictHttpException("Stock batch does not match the product variant.");
                }
            }

            // 8. Advisory lock acquisition in deterministic numerical order
            if (!$isSameWarehouse) {
                $firstWh = min($sourceWarehouseId, $destinationWarehouseId);
                $secondWh = max($sourceWarehouseId, $destinationWarehouseId);
                $this->acquireInventoryLock($companyId, $firstWh, $productVariantId);
                $this->acquireInventoryLock($companyId, $secondWh, $productVariantId);
            } else {
                $this->acquireInventoryLock($companyId, $sourceWarehouseId, $productVariantId);
            }

            // 9. Idempotency check under lock for non-zero referenceId
            if (!empty($referenceType) && !empty($referenceId) && $referenceId !== 0) {
                $existingOut = StockMovement::where('company_id', $companyId)
                    ->where('movement_type', 'TRANSFER_OUT')
                    ->where('reference_type', $referenceType)
                    ->where('reference_id', $referenceId)
                    ->where('product_variant_id', $productVariantId)
                    ->first();

                $existingIn = StockMovement::where('company_id', $companyId)
                    ->where('movement_type', 'TRANSFER_IN')
                    ->where('reference_type', $referenceType)
                    ->where('reference_id', $referenceId)
                    ->where('product_variant_id', $productVariantId)
                    ->first();

                if ($existingOut && $existingIn) {
                    return [
                        'transfer_out' => $existingOut,
                        'transfer_in' => $existingIn,
                    ];
                }

                if ($existingOut || $existingIn) {
                    throw new ConflictHttpException("Incomplete transfer detected for reference. Incomplete transfer state cannot be accepted.");
                }
            }

            // 10. Source Inventory lock & sufficiency check
            $sourceInventory = Inventory::where('company_id', $companyId)
                ->where('warehouse_id', $sourceWarehouseId)
                ->where('product_variant_id', $productVariantId)
                ->lockForUpdate()
                ->first();

            if (!$sourceInventory || (float) $sourceInventory->quantity < $quantity) {
                $available = $sourceInventory ? (float) $sourceInventory->quantity : 0.0;
                throw new ConflictHttpException("Insufficient stock in source warehouse for variant {$variant->sku}. Available: {$available}, Requested: {$quantity}");
            }

            // 11. Source Batch verification and lock
            $srcInvBatch = null;
            if ($stockBatchId !== null) {
                $srcBatchQuery = InventoryBatch::where('inventory_id', $sourceInventory->id)
                    ->where('stock_batch_id', $stockBatchId);

                if ($sourceStorageLocationId !== null) {
                    $srcBatchQuery->where('storage_location_id', $sourceStorageLocationId);
                } else {
                    $srcBatchQuery->whereNull('storage_location_id');
                }

                $srcInvBatch = $srcBatchQuery->lockForUpdate()->first();

                if (!$srcInvBatch || (float) $srcInvBatch->quantity < $quantity) {
                    $batchAvail = $srcInvBatch ? (float) $srcInvBatch->quantity : 0.0;
                    throw new ConflictHttpException("Insufficient batch stock in source location. Available: {$batchAvail}, Requested: {$quantity}");
                }
            }

            // 12. Destination Inventory lock or create
            if (!$isSameWarehouse) {
                $destInventory = Inventory::where('company_id', $companyId)
                    ->where('warehouse_id', $destinationWarehouseId)
                    ->where('product_variant_id', $productVariantId)
                    ->lockForUpdate()
                    ->first();

                if (!$destInventory) {
                    $destInventory = Inventory::create([
                        'company_id' => $companyId,
                        'business_unit_id' => $destinationWarehouse->business_unit_id ?? null,
                        'branch_id' => $destinationWarehouse->branch_id ?? null,
                        'warehouse_id' => $destinationWarehouseId,
                        'product_id' => $productId,
                        'product_variant_id' => $productVariantId,
                        'quantity' => 0,
                        'reserved_quantity' => 0,
                        'available_quantity' => 0,
                        'average_cost' => (float) $sourceInventory->average_cost,
                        'total_value' => 0,
                    ]);

                    $destInventory = Inventory::where('id', $destInventory->id)
                        ->lockForUpdate()
                        ->first();
                }
            } else {
                $destInventory = $sourceInventory;
            }

            // 13. Cost calculation from source moving average cost
            $sourceUnitCost = 0.0;
            if ((float) $sourceInventory->average_cost > 0) {
                $sourceUnitCost = (float) $sourceInventory->average_cost;
            } elseif (isset($sourceInventory->average_unit_cost) && (float) $sourceInventory->average_unit_cost > 0) {
                $sourceUnitCost = (float) $sourceInventory->average_unit_cost;
            } elseif ((float) $variant->cost_price > 0) {
                $sourceUnitCost = (float) $variant->cost_price;
            }
            $totalCost = $quantity * $sourceUnitCost;

            // 14. Update Positions
            if (!$isSameWarehouse) {
                // Deduct source
                $srcQtyBefore = (float) $sourceInventory->quantity;
                $srcQtyAfter = $srcQtyBefore - $quantity;
                $sourceInventory->quantity = $srcQtyAfter;
                $sourceInventory->available_quantity = $srcQtyAfter - (float) $sourceInventory->reserved_quantity;
                $sourceInventory->total_value = $srcQtyAfter * (float) $sourceInventory->average_cost;
                $sourceInventory->save();

                // Add destination with moving average
                $destQtyBefore = (float) $destInventory->quantity;
                $destOldAvgCost = (float) $destInventory->average_cost;
                $destQtyAfter = $destQtyBefore + $quantity;

                if ($destQtyBefore <= 0) {
                    $destNewAvgCost = $sourceUnitCost;
                } else {
                    $destNewAvgCost = (($destQtyBefore * $destOldAvgCost) + ($quantity * $sourceUnitCost)) / $destQtyAfter;
                }

                $destInventory->quantity = $destQtyAfter;
                $destInventory->available_quantity = $destQtyAfter - (float) $destInventory->reserved_quantity;
                $destInventory->average_cost = $destNewAvgCost;
                $destInventory->total_value = $destQtyAfter * $destNewAvgCost;
                $destInventory->save();
            } else {
                // Same warehouse: total warehouse quantity and average cost remain unchanged
                $srcQtyBefore = (float) $sourceInventory->quantity;
                $srcQtyAfter = $srcQtyBefore;
                $destQtyBefore = $srcQtyBefore;
                $destQtyAfter = $srcQtyBefore;
            }

            // 15. Update InventoryBatch records
            if ($stockBatchId !== null) {
                // Source batch deduct
                $srcInvBatch->quantity = (float) $srcInvBatch->quantity - $quantity;
                $srcInvBatch->save();

                // Destination batch add
                $destBatchQuery = InventoryBatch::where('inventory_id', $destInventory->id)
                    ->where('stock_batch_id', $stockBatchId);

                if ($destinationStorageLocationId !== null) {
                    $destBatchQuery->where('storage_location_id', $destinationStorageLocationId);
                } else {
                    $destBatchQuery->whereNull('storage_location_id');
                }

                $destInvBatch = $destBatchQuery->lockForUpdate()->first();

                if ($destInvBatch) {
                    $destInvBatch->quantity = (float) $destInvBatch->quantity + $quantity;
                    $destInvBatch->save();
                } else {
                    InventoryBatch::create([
                        'inventory_id' => $destInventory->id,
                        'stock_batch_id' => $stockBatchId,
                        'storage_location_id' => $destinationStorageLocationId,
                        'quantity' => $quantity,
                    ]);
                }
            }

            // 16. Create TRANSFER_OUT movement
            $transferOut = StockMovement::create([
                'company_id' => $companyId,
                'business_unit_id' => $sourceWarehouse->business_unit_id ?? null,
                'branch_id' => $sourceWarehouse->branch_id ?? null,
                'warehouse_id' => $sourceWarehouseId,
                'product_id' => $productId,
                'product_variant_id' => $productVariantId,
                'movement_type' => 'TRANSFER_OUT',
                'quantity' => $quantity,
                'unit_cost' => $sourceUnitCost,
                'total_cost' => $totalCost,
                'quantity_before' => $srcQtyBefore,
                'quantity_after' => $srcQtyAfter,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'reference_number' => $referenceNumber,
                'reason' => $reason,
                'notes' => $notes,
                'created_by' => $userId,
                'stock_batch_id' => $stockBatchId,
                'storage_location_id' => $sourceStorageLocationId,
            ]);

            // 17. Create TRANSFER_IN movement
            $transferIn = StockMovement::create([
                'company_id' => $companyId,
                'business_unit_id' => $destinationWarehouse->business_unit_id ?? null,
                'branch_id' => $destinationWarehouse->branch_id ?? null,
                'warehouse_id' => $destinationWarehouseId,
                'product_id' => $productId,
                'product_variant_id' => $productVariantId,
                'movement_type' => 'TRANSFER_IN',
                'quantity' => $quantity,
                'unit_cost' => $sourceUnitCost,
                'total_cost' => $totalCost,
                'quantity_before' => $destQtyBefore,
                'quantity_after' => $destQtyAfter,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'reference_number' => $referenceNumber,
                'reason' => $reason,
                'notes' => $notes,
                'created_by' => $userId,
                'stock_batch_id' => $stockBatchId,
                'storage_location_id' => $destinationStorageLocationId,
            ]);

            // 18. Audit Log
            AuditLog::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $companyId,
                'user_id' => $userId,
                'event' => 'STOCK_TRANSFERRED',
                'auditable_type' => StockMovement::class,
                'auditable_id' => $transferOut->id,
                'new_values' => [
                    'source_warehouse_id' => $sourceWarehouseId,
                    'destination_warehouse_id' => $destinationWarehouseId,
                    'variant_id' => $productVariantId,
                    'quantity' => $quantity,
                    'unit_cost' => $sourceUnitCost,
                    'reference_type' => $referenceType,
                    'reference_id' => $referenceId,
                    'reference_number' => $referenceNumber,
                    'source_location_id' => $sourceStorageLocationId,
                    'destination_location_id' => $destinationStorageLocationId,
                    'stock_batch_id' => $stockBatchId,
                ],
            ]);

            return [
                'transfer_out' => $transferOut,
                'transfer_in' => $transferIn,
            ];
        });
    }

    /**
     * Positive stock adjustment / correction.
     * Phase 3 Gate 1.3.
     */
    public function adjustmentIn(
        int $companyId,
        int $warehouseId,
        int $productVariantId,
        float $quantity,
        float $unitCost,
        string $referenceType,
        int $referenceId,
        string $referenceNumber,
        string $reason,
        ?string $notes = null,
        ?int $userId = null,
        ?int $stockBatchId = null,
        ?string $batchNumber = null,
        ?int $storageLocationId = null
    ): StockMovement {
        if ($quantity <= 0) {
            throw new ConflictHttpException("Adjustment quantity must be greater than zero.");
        }

        if ($unitCost < 0) {
            throw new ConflictHttpException("Unit cost cannot be negative.");
        }

        if (empty(trim($reason))) {
            throw new ConflictHttpException("Reason is mandatory for stock adjustment.");
        }

        return DB::transaction(function () use (
            $companyId,
            $warehouseId,
            $productVariantId,
            $quantity,
            $unitCost,
            $referenceType,
            $referenceId,
            $referenceNumber,
            $reason,
            $notes,
            $userId,
            $stockBatchId,
            $batchNumber,
            $storageLocationId
        ) {
            $company = Company::find($companyId);
            if (!$company) {
                throw new ConflictHttpException("Company does not exist.");
            }

            $warehouse = Warehouse::where('id', $warehouseId)
                ->where('company_id', $companyId)
                ->first();
            if (!$warehouse) {
                throw new ConflictHttpException("Warehouse does not belong to the specified company.");
            }

            $variant = ProductVariant::with('product')->find($productVariantId);
            if (!$variant || !$variant->product || (int) $variant->product->company_id !== $companyId) {
                throw new ConflictHttpException("Product variant does not belong to the specified company.");
            }
            $productId = $variant->product_id;

            if ($storageLocationId !== null) {
                $location = StorageLocation::find($storageLocationId);
                if (!$location || (int) $location->company_id !== $companyId || (int) $location->warehouse_id !== $warehouseId) {
                    throw new ConflictHttpException("Storage location does not belong to the specified warehouse.");
                }
                if (isset($location->is_active) && !$location->is_active) {
                    throw new ConflictHttpException("Storage location is inactive.");
                }
            }

            // Advisory lock
            $this->acquireInventoryLock($companyId, $warehouseId, $productVariantId);

            // Inventory row lock or create
            $inventory = Inventory::where('company_id', $companyId)
                ->where('warehouse_id', $warehouseId)
                ->where('product_variant_id', $productVariantId)
                ->lockForUpdate()
                ->first();

            if (!$inventory) {
                $inventory = Inventory::create([
                    'company_id' => $companyId,
                    'business_unit_id' => $warehouse->business_unit_id ?? null,
                    'branch_id' => $warehouse->branch_id ?? null,
                    'warehouse_id' => $warehouseId,
                    'product_id' => $productId,
                    'product_variant_id' => $productVariantId,
                    'quantity' => 0,
                    'reserved_quantity' => 0,
                    'available_quantity' => 0,
                    'average_cost' => $unitCost,
                    'total_value' => 0,
                ]);

                $inventory = Inventory::where('id', $inventory->id)
                    ->lockForUpdate()
                    ->first();
            }

            // Idempotency
            if (!empty($referenceType) && !empty($referenceId) && $referenceId !== 0) {
                $existing = StockMovement::where('company_id', $companyId)
                    ->where('movement_type', 'ADJUSTMENT_IN')
                    ->where('reference_type', $referenceType)
                    ->where('reference_id', $referenceId)
                    ->where('product_variant_id', $productVariantId)
                    ->first();

                if ($existing) {
                    return $existing;
                }
            }

            // Batch handling
            $batch = null;
            if ($stockBatchId !== null) {
                $batch = StockBatch::where('id', $stockBatchId)->lockForUpdate()->first();
                if (!$batch) {
                    throw new ConflictHttpException("Stock batch does not exist.");
                }
                if ((int) $batch->company_id !== $companyId) {
                    throw new ConflictHttpException("Stock batch does not belong to the specified company.");
                }
                if ((int) $batch->variant_id !== $productVariantId || (int) $batch->product_id !== $productId) {
                    throw new ConflictHttpException("Stock batch does not match the product variant.");
                }
                if ($batchNumber !== null && $batch->batch_no !== $batchNumber) {
                    throw new ConflictHttpException("Batch number conflicts with the specified stock batch.");
                }
            } elseif ($batchNumber !== null) {
                $batch = StockBatch::where('company_id', $companyId)
                    ->where('variant_id', $productVariantId)
                    ->where('batch_no', $batchNumber)
                    ->lockForUpdate()
                    ->first();

                if ($batch) {
                    if ((int) $batch->product_id !== $productId) {
                        throw new ConflictHttpException("Existing stock batch product does not match product variant.");
                    }
                    $stockBatchId = $batch->id;
                } else {
                    $batch = StockBatch::create([
                        'company_id' => $companyId,
                        'product_id' => $productId,
                        'variant_id' => $productVariantId,
                        'batch_no' => $batchNumber,
                        'unit_cost' => $unitCost,
                        'status' => 'ACTIVE',
                    ]);
                    $stockBatchId = $batch->id;
                }
            }

            // Moving average cost
            $oldQuantity = (float) $inventory->quantity;
            $oldAverageCost = (float) $inventory->average_cost;
            $receivedQuantity = (float) $quantity;
            $receivedUnitCost = (float) $unitCost;

            $newQuantity = $oldQuantity + $receivedQuantity;

            if ($oldQuantity <= 0) {
                $newAverageCost = $receivedUnitCost;
            } else {
                $newAverageCost = (($oldQuantity * $oldAverageCost) + ($receivedQuantity * $receivedUnitCost)) / $newQuantity;
            }

            $inventory->quantity = $newQuantity;
            $inventory->available_quantity = $newQuantity - (float) $inventory->reserved_quantity;
            $inventory->average_cost = $newAverageCost;
            $inventory->total_value = $newQuantity * $newAverageCost;
            $inventory->save();

            // InventoryBatch
            if ($stockBatchId !== null) {
                $invBatchQuery = InventoryBatch::where('inventory_id', $inventory->id)
                    ->where('stock_batch_id', $stockBatchId);

                if ($storageLocationId !== null) {
                    $invBatchQuery->where('storage_location_id', $storageLocationId);
                } else {
                    $invBatchQuery->whereNull('storage_location_id');
                }

                $invBatch = $invBatchQuery->lockForUpdate()->first();

                if ($invBatch) {
                    $invBatch->quantity = (float) $invBatch->quantity + $quantity;
                    $invBatch->save();
                } else {
                    InventoryBatch::create([
                        'inventory_id' => $inventory->id,
                        'stock_batch_id' => $stockBatchId,
                        'storage_location_id' => $storageLocationId,
                        'quantity' => $quantity,
                    ]);
                }
            }

            // Movement
            $movement = StockMovement::create([
                'company_id' => $companyId,
                'business_unit_id' => $warehouse->business_unit_id ?? null,
                'branch_id' => $warehouse->branch_id ?? null,
                'warehouse_id' => $warehouseId,
                'product_id' => $productId,
                'product_variant_id' => $productVariantId,
                'movement_type' => 'ADJUSTMENT_IN',
                'quantity' => $quantity,
                'unit_cost' => $unitCost,
                'total_cost' => $quantity * $unitCost,
                'quantity_before' => $oldQuantity,
                'quantity_after' => $newQuantity,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'reference_number' => $referenceNumber,
                'reason' => $reason,
                'notes' => $notes,
                'created_by' => $userId,
                'stock_batch_id' => $stockBatchId,
                'storage_location_id' => $storageLocationId,
            ]);

            // Audit Log
            AuditLog::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $companyId,
                'user_id' => $userId,
                'event' => 'STOCK_ADJUSTMENT_IN',
                'auditable_type' => StockMovement::class,
                'auditable_id' => $movement->id,
                'new_values' => [
                    'warehouse_id' => $warehouseId,
                    'variant_id' => $productVariantId,
                    'quantity' => $quantity,
                    'unit_cost' => $unitCost,
                    'reason' => $reason,
                    'reference_type' => $referenceType,
                    'reference_id' => $referenceId,
                    'reference_number' => $referenceNumber,
                ],
            ]);

            return $movement;
        });
    }

    /**
     * Negative stock adjustment / correction.
     * Phase 3 Gate 1.3.
     */
    public function adjustmentOut(
        int $companyId,
        int $warehouseId,
        int $productVariantId,
        float $quantity,
        string $referenceType,
        int $referenceId,
        string $referenceNumber,
        string $reason,
        ?string $notes = null,
        ?int $userId = null,
        ?int $stockBatchId = null,
        ?int $storageLocationId = null
    ): StockMovement {
        if ($quantity <= 0) {
            throw new ConflictHttpException("Adjustment quantity must be greater than zero.");
        }

        if (empty(trim($reason))) {
            throw new ConflictHttpException("Reason is mandatory for stock adjustment.");
        }

        return DB::transaction(function () use (
            $companyId,
            $warehouseId,
            $productVariantId,
            $quantity,
            $referenceType,
            $referenceId,
            $referenceNumber,
            $reason,
            $notes,
            $userId,
            $stockBatchId,
            $storageLocationId
        ) {
            $company = Company::find($companyId);
            if (!$company) {
                throw new ConflictHttpException("Company does not exist.");
            }

            $warehouse = Warehouse::where('id', $warehouseId)
                ->where('company_id', $companyId)
                ->first();
            if (!$warehouse) {
                throw new ConflictHttpException("Warehouse does not belong to the specified company.");
            }

            $variant = ProductVariant::with('product')->find($productVariantId);
            if (!$variant || !$variant->product || (int) $variant->product->company_id !== $companyId) {
                throw new ConflictHttpException("Product variant does not belong to the specified company.");
            }
            $productId = $variant->product_id;

            if ($storageLocationId !== null) {
                $location = StorageLocation::find($storageLocationId);
                if (!$location || (int) $location->company_id !== $companyId || (int) $location->warehouse_id !== $warehouseId) {
                    throw new ConflictHttpException("Storage location does not belong to the specified warehouse.");
                }
                if (isset($location->is_active) && !$location->is_active) {
                    throw new ConflictHttpException("Storage location is inactive.");
                }
            }

            if ($stockBatchId !== null) {
                $batch = StockBatch::find($stockBatchId);
                if (!$batch || (int) $batch->company_id !== $companyId) {
                    throw new ConflictHttpException("Stock batch does not belong to the specified company.");
                }
                if ((int) $batch->variant_id !== $productVariantId || (int) $batch->product_id !== $productId) {
                    throw new ConflictHttpException("Stock batch does not match the product variant.");
                }
            }

            // Advisory lock
            $this->acquireInventoryLock($companyId, $warehouseId, $productVariantId);

            // Idempotency
            if (!empty($referenceType) && !empty($referenceId) && $referenceId !== 0) {
                $existing = StockMovement::where('company_id', $companyId)
                    ->where('movement_type', 'ADJUSTMENT_OUT')
                    ->where('reference_type', $referenceType)
                    ->where('reference_id', $referenceId)
                    ->where('product_variant_id', $productVariantId)
                    ->first();

                if ($existing) {
                    return $existing;
                }
            }

            // Inventory lock & sufficiency check
            $inventory = Inventory::where('company_id', $companyId)
                ->where('warehouse_id', $warehouseId)
                ->where('product_variant_id', $productVariantId)
                ->lockForUpdate()
                ->first();

            if (!$inventory || (float) $inventory->quantity < $quantity) {
                $available = $inventory ? (float) $inventory->quantity : 0.0;
                throw new ConflictHttpException("Insufficient stock in warehouse for variant {$variant->sku}. Available: {$available}, Requested: {$quantity}");
            }

            // InventoryBatch check & deduct
            if ($stockBatchId !== null) {
                $batchQuery = InventoryBatch::where('inventory_id', $inventory->id)
                    ->where('stock_batch_id', $stockBatchId);

                if ($storageLocationId !== null) {
                    $batchQuery->where('storage_location_id', $storageLocationId);
                } else {
                    $batchQuery->whereNull('storage_location_id');
                }

                $inventoryBatch = $batchQuery->lockForUpdate()->first();

                if (!$inventoryBatch || (float) $inventoryBatch->quantity < $quantity) {
                    $batchAvail = $inventoryBatch ? (float) $inventoryBatch->quantity : 0.0;
                    throw new ConflictHttpException("Insufficient batch stock for adjustment out. Available: {$batchAvail}, Requested: {$quantity}");
                }

                $inventoryBatch->quantity = (float) $inventoryBatch->quantity - $quantity;
                $inventoryBatch->save();
            }

            // Unit cost from average cost (preserved)
            $unitCost = 0.0;
            if ((float) $inventory->average_cost > 0) {
                $unitCost = (float) $inventory->average_cost;
            } elseif (isset($inventory->average_unit_cost) && (float) $inventory->average_unit_cost > 0) {
                $unitCost = (float) $inventory->average_unit_cost;
            } elseif ((float) $variant->cost_price > 0) {
                $unitCost = (float) $variant->cost_price;
            }
            $totalCost = $quantity * $unitCost;

            $quantityBefore = (float) $inventory->quantity;
            $quantityAfter = $quantityBefore - $quantity;

            $inventory->quantity = $quantityAfter;
            $inventory->available_quantity = $quantityAfter - (float) $inventory->reserved_quantity;
            $inventory->total_value = $quantityAfter * (float) $inventory->average_cost;
            $inventory->save();

            // Movement
            $movement = StockMovement::create([
                'company_id' => $companyId,
                'business_unit_id' => $warehouse->business_unit_id ?? null,
                'branch_id' => $warehouse->branch_id ?? null,
                'warehouse_id' => $warehouseId,
                'product_id' => $productId,
                'product_variant_id' => $productVariantId,
                'movement_type' => 'ADJUSTMENT_OUT',
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
                'stock_batch_id' => $stockBatchId,
                'storage_location_id' => $storageLocationId,
            ]);

            // Audit Log
            AuditLog::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $companyId,
                'user_id' => $userId,
                'event' => 'STOCK_ADJUSTMENT_OUT',
                'auditable_type' => StockMovement::class,
                'auditable_id' => $movement->id,
                'new_values' => [
                    'warehouse_id' => $warehouseId,
                    'variant_id' => $productVariantId,
                    'quantity' => $quantity,
                    'unit_cost' => $unitCost,
                    'reason' => $reason,
                    'reference_type' => $referenceType,
                    'reference_id' => $referenceId,
                    'reference_number' => $referenceNumber,
                ],
            ]);

            return $movement;
        });
    }
}
