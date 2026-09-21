<?php

namespace Tests\Feature\Inventory;

use App\Models\Company;
use App\Models\User;
use App\Models\Warehouse;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StorageLocation;
use App\Models\StockBatch;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\StockMovement;
use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Illuminate\Support\Str;
use Tests\TestCase;

class InventoryCoreGate1Test extends TestCase
{
    use RefreshDatabase;

    protected InventoryService $service;
    protected Company $company;
    protected Warehouse $warehouse;
    protected Product $product;
    protected ProductVariant $variant;
    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(InventoryService::class);
        $this->company = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Apex Retail Ltd',
            'code' => 'APEX-' . Str::random(5),
            'country' => 'Bangladesh',
        ]);
        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);
        $this->warehouse = Warehouse::create([
            'company_id' => $this->company->id,
            'name' => 'Main Warehouse',
            'code' => 'MAIN',
        ]);
        
        $this->product = Product::create([
            'company_id' => $this->company->id,
            'name' => 'Standard Item',
            'product_type' => 'simple',
        ]);
        $this->variant = ProductVariant::create([
            'product_id' => $this->product->id,
            'sku' => 'SKU-TEST-001',
            'variant_name' => 'Default Variant',
            'cost_price' => 50.0000,
            'selling_price' => 100.0000,
        ]);
    }

    /**
     * 1. stock out creates StockMovement
     */
    public function test_stock_out_creates_stock_movement()
    {
        $this->service->addOpeningStock([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 50,
            'unit_cost' => 50,
        ], $this->user->id);

        $movement = $this->service->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 10,
            referenceType: 'SALE',
            referenceId: 101,
            referenceNumber: 'INV-101',
            reason: 'POS Sale',
            notes: 'Counter 1',
            userId: $this->user->id
        );

        $this->assertInstanceOf(StockMovement::class, $movement);
        $this->assertEquals($this->company->id, $movement->company_id);
        $this->assertEquals($this->warehouse->id, $movement->warehouse_id);
        $this->assertEquals($this->product->id, $movement->product_id);
        $this->assertEquals($this->variant->id, $movement->product_variant_id);
        $this->assertEquals('SALE', $movement->movement_type);
        $this->assertEquals(10, $movement->quantity);
        $this->assertEquals(50, $movement->quantity_before);
        $this->assertEquals(40, $movement->quantity_after);
        $this->assertEquals('SALE', $movement->reference_type);
        $this->assertEquals(101, $movement->reference_id);
        $this->assertEquals('INV-101', $movement->reference_number);
    }

    /**
     * 2. stock out decreases Inventory quantity
     */
    public function test_stock_out_decreases_inventory_quantity()
    {
        $this->service->addOpeningStock([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 100,
            'unit_cost' => 50,
        ], $this->user->id);

        $this->service->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 35,
            referenceType: 'SALE',
            referenceId: 102,
            referenceNumber: 'INV-102'
        );

        $inventory = Inventory::where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant->id)
            ->first();

        $this->assertNotNull($inventory);
        $this->assertEquals(65, $inventory->quantity);
        $this->assertEquals(65, $inventory->available_quantity);
    }

    /**
     * 3. stock out decreases InventoryBatch quantity
     */
    public function test_stock_out_decreases_inventory_batch_quantity()
    {
        $location = StorageLocation::create([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'code' => 'LOC-A1',
            'name' => 'Rack A1',
            'is_active' => true,
        ]);

        $batch = StockBatch::create([
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'variant_id' => $this->variant->id,
            'batch_no' => 'BATCH-2026-001',
            'unit_cost' => 50,
            'status' => 'ACTIVE',
        ]);

        $this->service->processMovement(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            movementType: 'OPENING_STOCK',
            quantity: 40,
            unitCost: 50,
            storageLocationId: $location->id,
            stockBatchId: $batch->id
        );

        $movement = $this->service->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 15,
            referenceType: 'SALE',
            referenceId: 103,
            referenceNumber: 'INV-103',
            stockBatchId: $batch->id,
            storageLocationId: $location->id
        );

        $this->assertEquals($batch->id, $movement->stock_batch_id);
        $this->assertEquals($location->id, $movement->storage_location_id);

        $invBatch = InventoryBatch::where('stock_batch_id', $batch->id)
            ->where('storage_location_id', $location->id)
            ->first();

        $this->assertNotNull($invBatch);
        $this->assertEquals(25, $invBatch->quantity);

        $inventory = Inventory::where('product_variant_id', $this->variant->id)->first();
        $this->assertEquals(25, $inventory->quantity);
    }

    /**
     * 4. stock out returns correct unit cost
     */
    public function test_stock_out_returns_correct_unit_cost()
    {
        $this->service->addOpeningStock([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 50,
            'unit_cost' => 45.50,
        ], $this->user->id);

        $movement = $this->service->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 5,
            referenceType: 'SALE',
            referenceId: 104,
            referenceNumber: 'INV-104'
        );

        $this->assertEquals(45.50, (float) $movement->unit_cost);
        $this->assertEquals(45.50, (float) $movement['unit_cost']);
        $this->assertEquals(227.50, (float) $movement->total_cost);
    }

    /**
     * 5. stock out rejects insufficient warehouse stock
     */
    public function test_stock_out_rejects_insufficient_warehouse_stock()
    {
        $this->service->addOpeningStock([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 10,
            'unit_cost' => 50,
        ], $this->user->id);

        $this->expectException(ConflictHttpException::class);

        $this->service->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 20, // Only 10 available
            referenceType: 'SALE',
            referenceId: 105,
            referenceNumber: 'INV-105'
        );
    }

    /**
     * 6. stock out rejects insufficient batch stock
     */
    public function test_stock_out_rejects_insufficient_batch_stock()
    {
        $location = StorageLocation::create([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'code' => 'LOC-B1',
            'name' => 'Rack B1',
        ]);

        $batch = StockBatch::create([
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'variant_id' => $this->variant->id,
            'batch_no' => 'BATCH-LIMIT-01',
            'unit_cost' => 50,
            'status' => 'ACTIVE',
        ]);

        // Global inventory 50, batch inventory 10
        $this->service->processMovement(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            movementType: 'OPENING_STOCK',
            quantity: 40,
            unitCost: 50
        );
        $this->service->processMovement(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            movementType: 'STOCK_IN',
            quantity: 10,
            unitCost: 50,
            storageLocationId: $location->id,
            stockBatchId: $batch->id
        );

        $this->expectException(ConflictHttpException::class);

        // Attempting to stock out 15 from batch with only 10
        $this->service->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 15,
            referenceType: 'SALE',
            referenceId: 106,
            referenceNumber: 'INV-106',
            stockBatchId: $batch->id,
            storageLocationId: $location->id
        );
    }

    /**
     * 7. cross-company warehouse is rejected
     */
    public function test_cross_company_warehouse_is_rejected()
    {
        $companyB = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Company B',
            'code' => 'COMP-B-' . Str::random(5),
            'country' => 'Bangladesh',
        ]);
        $warehouseB = Warehouse::create([
            'company_id' => $companyB->id,
            'name' => 'Warehouse B',
            'code' => 'WH-B',
        ]);

        $this->expectException(ConflictHttpException::class);

        $this->service->stockOut(
            companyId: $this->company->id, // Company A
            warehouseId: $warehouseB->id,  // Warehouse in Company B
            productVariantId: $this->variant->id,
            quantity: 5,
            referenceType: 'SALE',
            referenceId: 107,
            referenceNumber: 'INV-107'
        );
    }

    /**
     * 8. cross-company stock batch is rejected
     */
    public function test_cross_company_stock_batch_is_rejected()
    {
        $companyB = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Company B',
            'code' => 'COMP-B-' . Str::random(5),
            'country' => 'Bangladesh',
        ]);
        $productB = Product::create([
            'company_id' => $companyB->id,
            'name' => 'Product B',
            'product_type' => 'simple',
        ]);
        $variantB = ProductVariant::create([
            'product_id' => $productB->id,
            'sku' => 'SKU-B-001',
            'variant_name' => 'Default Variant',
        ]);
        $batchB = StockBatch::create([
            'company_id' => $companyB->id,
            'product_id' => $productB->id,
            'variant_id' => $variantB->id,
            'batch_no' => 'BATCH-COMP-B',
        ]);

        $this->expectException(ConflictHttpException::class);

        $this->service->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 5,
            referenceType: 'SALE',
            referenceId: 108,
            referenceNumber: 'INV-108',
            stockBatchId: $batchB->id
        );
    }

    /**
     * 9. cross-warehouse storage location is rejected
     */
    public function test_cross_warehouse_storage_location_is_rejected()
    {
        $warehouse2 = Warehouse::create([
            'company_id' => $this->company->id,
            'name' => 'Secondary Warehouse',
            'code' => 'SEC',
        ]);
        $locationInW2 = StorageLocation::create([
            'company_id' => $this->company->id,
            'warehouse_id' => $warehouse2->id,
            'code' => 'W2-LOC-1',
            'name' => 'Location in W2',
        ]);
        $batch = StockBatch::create([
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'variant_id' => $this->variant->id,
            'batch_no' => 'BATCH-W1',
        ]);

        $this->expectException(ConflictHttpException::class);

        $this->service->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id, // Using W1
            productVariantId: $this->variant->id,
            quantity: 5,
            referenceType: 'SALE',
            referenceId: 109,
            referenceNumber: 'INV-109',
            stockBatchId: $batch->id,
            storageLocationId: $locationInW2->id // Location belongs to W2
        );
    }

    /**
     * 10. invalid variant/batch relationship is rejected
     */
    public function test_invalid_variant_batch_relationship_is_rejected()
    {
        $product2 = Product::create([
            'company_id' => $this->company->id,
            'name' => 'Second Product',
            'product_type' => 'simple',
        ]);
        $variant2 = ProductVariant::create([
            'product_id' => $product2->id,
            'sku' => 'SKU-002',
            'variant_name' => 'Variant 2',
        ]);
        $batchForVariant2 = StockBatch::create([
            'company_id' => $this->company->id,
            'product_id' => $product2->id,
            'variant_id' => $variant2->id,
            'batch_no' => 'BATCH-V2',
        ]);

        $this->expectException(ConflictHttpException::class);

        $this->service->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id, // variant 1
            quantity: 5,
            referenceType: 'SALE',
            referenceId: 110,
            referenceNumber: 'INV-110',
            stockBatchId: $batchForVariant2->id // Batch belongs to variant 2
        );
    }

    /**
     * 11. duplicate/idempotent stock-out does not deduct twice
     */
    public function test_duplicate_idempotent_stock_out_does_not_deduct_twice()
    {
        $this->service->addOpeningStock([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 50,
            'unit_cost' => 50,
        ], $this->user->id);

        $move1 = $this->service->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 10,
            referenceType: 'SALE',
            referenceId: 999,
            referenceNumber: 'INV-999'
        );

        $inventoryAfterFirst = Inventory::where('product_variant_id', $this->variant->id)->first();
        $this->assertEquals(40, $inventoryAfterFirst->quantity);

        // Duplicate call with identical business reference
        $move2 = $this->service->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 10,
            referenceType: 'SALE',
            referenceId: 999,
            referenceNumber: 'INV-999'
        );

        // Verify stock was not deducted again
        $inventoryAfterSecond = Inventory::where('product_variant_id', $this->variant->id)->first();
        $this->assertEquals(40, $inventoryAfterSecond->quantity);
        $this->assertEquals($move1->id, $move2->id);
    }

    /**
     * 12. StockMovement cannot be updated
     */
    public function test_stock_movement_cannot_be_updated()
    {
        $this->service->addOpeningStock([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 50,
            'unit_cost' => 50,
        ], $this->user->id);

        $movement = $this->service->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 10,
            referenceType: 'SALE',
            referenceId: 112,
            referenceNumber: 'INV-112'
        );

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('immutable');

        $movement->update(['quantity' => 999]);
    }

    /**
     * 13. StockMovement cannot be deleted
     */
    public function test_stock_movement_cannot_be_deleted()
    {
        $this->service->addOpeningStock([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 50,
            'unit_cost' => 50,
        ], $this->user->id);

        $movement = $this->service->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 10,
            referenceType: 'SALE',
            referenceId: 113,
            referenceNumber: 'INV-113'
        );

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('immutable');

        $movement->delete();
    }

    /**
     * 14. transaction rolls back InventoryBatch and StockMovement on failure
     */
    public function test_transaction_rolls_back_inventory_batch_and_movement_on_failure()
    {
        // 1. Setup warehouse stock: 50
        $this->service->addOpeningStock([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 50,
            'unit_cost' => 50,
        ], $this->user->id);

        // 2. Setup Batch B with 10 units
        $location = StorageLocation::create([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'code' => 'ROLL-LOC',
            'name' => 'Rollback Loc',
        ]);
        $batch = StockBatch::create([
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'variant_id' => $this->variant->id,
            'batch_no' => 'B-ROLLBACK',
        ]);

        $this->service->processMovement(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            movementType: 'STOCK_IN',
            quantity: 10,
            unitCost: 50,
            storageLocationId: $location->id,
            stockBatchId: $batch->id
        );

        // Warehouse total is now 60 (50 + 10). Batch has 10.
        $initialMovementsCount = StockMovement::count();
        $exceptionThrown = false;

        try {
            // Attempt to stock out 20 units against Batch B (which only has 10).
            // Warehouse has 60 so warehouse check would pass if done alone, but batch check must fail and roll back everything!
            $this->service->stockOut(
                companyId: $this->company->id,
                warehouseId: $this->warehouse->id,
                productVariantId: $this->variant->id,
                quantity: 20,
                referenceType: 'SALE',
                referenceId: 114,
                referenceNumber: 'INV-114',
                stockBatchId: $batch->id,
                storageLocationId: $location->id
            );
        } catch (ConflictHttpException $e) {
            $exceptionThrown = true;
            $this->assertStringContainsString("Insufficient stock in the specified batch/location", $e->getMessage());
        }

        $this->assertTrue($exceptionThrown, 'Expected ConflictHttpException was not thrown.');

        // Assert rollback: Global inventory remains 60
        $inventory = Inventory::where('product_variant_id', $this->variant->id)->first();
        $this->assertEquals(60, $inventory->quantity, 'Warehouse inventory must be rolled back');

        // Assert rollback: Batch inventory remains 10
        $invBatch = InventoryBatch::where('stock_batch_id', $batch->id)->first();
        $this->assertEquals(10, $invBatch->quantity, 'Batch inventory must be rolled back');

        // Assert rollback: No StockMovement created
        $this->assertEquals($initialMovementsCount, StockMovement::count(), 'No StockMovement must remain after rollback');
    }
}
