const fs = require('fs');
let code = fs.readFileSync('backend/app/Services/InventoryService.php', 'utf8');

const validationLogic = `
            $variant = ProductVariant::findOrFail($productVariantId);
            $productId = $variant->product_id;

            // Validate Storage Location
            if ($storageLocationId) {
                $location = StorageLocation::find($storageLocationId);
                if (!$location || $location->warehouse_id !== $warehouseId) {
                    throw new ConflictHttpException("Storage location does not belong to the specified warehouse.");
                }
            }

            // Validate Stock Batch
            if ($stockBatchId) {
                $batch = StockBatch::find($stockBatchId);
                if (!$batch || $batch->variant_id !== $productVariantId) {
                    throw new ConflictHttpException("Stock batch does not belong to the specified product variant.");
                }
            }
`;

code = code.replace(
    /(\$variant = ProductVariant::findOrFail\(\$productVariantId\);\s*\$productId = \$variant->product_id;)/,
    validationLogic.trim()
);

const batchTrackingLogic = `
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
`;

code = code.replace(
    /(\$inventory->total_value = \$inventory->quantity \* \$inventory->average_cost;\s*\$inventory->save();)/,
    batchTrackingLogic.trim()
);

const stockMovementLogic = `
                'reason' => $reason,
                'notes' => $notes,
                'created_by' => $userId,
                'storage_location_id' => $storageLocationId,
                'stock_batch_id' => $stockBatchId,
            ]);
`;

code = code.replace(
    /(\s*'reason' => \$reason,\s*'notes' => \$notes,\s*'created_by' => \$userId,\s*\]\);)/,
    stockMovementLogic
);

fs.writeFileSync('backend/app/Services/InventoryService.php', code);
