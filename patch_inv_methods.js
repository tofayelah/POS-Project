const fs = require('fs');
let code = fs.readFileSync('backend/app/Services/InventoryService.php', 'utf8');

code = code.replace(
    /unitCost: \$data\['unit_cost'\] \?\? 0,\s*reason: \$data\['reason'\] \?\? 'Initial stock entry',\s*notes: \$data\['notes'\] \?\? null,\s*userId: \$userId/g,
    `unitCost: $data['unit_cost'] ?? 0,
                reason: $data['reason'] ?? 'Initial stock entry',
                notes: $data['notes'] ?? null,
                userId: $userId,
                allowNegative: false,
                storageLocationId: $data['storage_location_id'] ?? null,
                stockBatchId: $data['stock_batch_id'] ?? null`
);

code = code.replace(
    /unitCost: \$data\['unit_cost'\] \?\? 0,\s*reason: \$data\['reason'\],\s*notes: \$data\['notes'\] \?\? null,\s*userId: \$userId/g,
    `unitCost: $data['unit_cost'] ?? 0,
                reason: $data['reason'],
                notes: $data['notes'] ?? null,
                userId: $userId,
                allowNegative: false,
                storageLocationId: $data['storage_location_id'] ?? null,
                stockBatchId: $data['stock_batch_id'] ?? null`
);

code = code.replace(
    /quantity: \$data\['quantity'\],\s*reason: \$data\['reason'\],\s*notes: \$data\['notes'\] \?\? null,\s*userId: \$userId/g,
    `quantity: $data['quantity'],
                reason: $data['reason'],
                notes: $data['notes'] ?? null,
                userId: $userId,
                allowNegative: false,
                storageLocationId: $data['storage_location_id'] ?? null,
                stockBatchId: $data['stock_batch_id'] ?? null`
);

fs.writeFileSync('backend/app/Services/InventoryService.php', code);
