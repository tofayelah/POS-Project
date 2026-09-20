const fs = require('fs');
let code = fs.readFileSync('backend/app/Services/InventoryService.php', 'utf8');

const targetStr = '$inventory->save();';
const batchTrackingLogic = `

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

code = code.replace(targetStr, targetStr + batchTrackingLogic);
fs.writeFileSync('backend/app/Services/InventoryService.php', code);
