const fs = require('fs');
let code = fs.readFileSync('backend/app/Services/InventoryService.php', 'utf8');

// I need to add validations and idempotency check.
// Let's replace the beginning of processMovement.

const oldStart = `            $variant = ProductVariant::findOrFail($productVariantId);
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
            }`;

const newStart = `            $variant = ProductVariant::with('product')->findOrFail($productVariantId);
            $productId = $variant->product_id;
            
            // 1 & 2. Variant and Product company scope
            if (!$variant->product || $variant->product->company_id !== $companyId) {
                throw new ConflictHttpException("Product variant does not belong to the specified company.");
            }

            // 3. Warehouse company scope
            $warehouse = \\App\\Models\\Warehouse::find($warehouseId);
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
            }`;

code = code.replace(oldStart, newStart);

fs.writeFileSync('backend/app/Services/InventoryService.php', code);
