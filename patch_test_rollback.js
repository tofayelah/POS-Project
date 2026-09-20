const fs = require('fs');
let code = fs.readFileSync('backend/tests/Feature/Inventory/InventoryCoreGate1Test.php', 'utf8');

const testMethod = `    public function test_transaction_rolls_back_inventory_batch_and_movement_on_failure()
    {
        // 1. Setup global inventory: 50 items (no batch)
        $this->service->processMovement(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            movementType: 'OPENING_STOCK',
            quantity: 50,
            unitCost: 5
        );

        // 2. Setup Batch B with 10 items
        $location = StorageLocation::create(['warehouse_id' => $this->warehouse->id, 'company_id' => $this->company->id, 'name' => 'Loc1', 'code' => 'L1']);
        $batch = StockBatch::create(['company_id' => $this->company->id, 'product_id' => $this->variant->product_id, 'variant_id' => $this->variant->id, 'batch_no' => 'B-ROLLBACK']);
        
        $this->service->processMovement(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            movementType: 'STOCK_IN',
            quantity: 10,
            unitCost: 5,
            referenceType: 'PO',
            referenceId: 1,
            storageLocationId: $location->id,
            stockBatchId: $batch->id
        );

        $initialMovementsCount = StockMovement::count();
        $exceptionThrown = false;

        try {
            // 3. Attempt to STOCK_OUT 20 items from Batch B
            // Global inventory is 60 (50+10), so global deduction to 40 passes and saves.
            // But Batch B only has 10, so batch deduction goes to -10 and throws ConflictHttpException.
            $this->service->processMovement(
                companyId: $this->company->id,
                warehouseId: $this->warehouse->id,
                productVariantId: $this->variant->id,
                movementType: 'STOCK_OUT',
                quantity: 20,
                unitCost: 5,
                storageLocationId: $location->id,
                stockBatchId: $batch->id
            );
        } catch (ConflictHttpException $e) {
            $exceptionThrown = true;
            $this->assertStringContainsString("Insufficient stock in the specified batch/location.", $e->getMessage());
        }

        $this->assertTrue($exceptionThrown, 'Expected ConflictHttpException was not thrown.');

        // 4. Assert Rollback occurred correctly
        $inventory = Inventory::where('product_variant_id', $this->variant->id)->first();
        $this->assertEquals(60, $inventory->quantity, 'Global inventory should remain unchanged due to rollback');

        $invBatch = InventoryBatch::where('stock_batch_id', $batch->id)->first();
        $this->assertEquals(10, $invBatch->quantity, 'Batch inventory should remain unchanged');

        $this->assertEquals($initialMovementsCount, StockMovement::count(), 'No stock movement should have been created');
    }
}
`;

code = code.replace(/}\s*$/, testMethod);

fs.writeFileSync('backend/tests/Feature/Inventory/InventoryCoreGate1Test.php', code);
