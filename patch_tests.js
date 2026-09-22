const fs = require('fs');

const testCode = `<?php

namespace Tests\\Feature\\Inventory;

use App\\Models\\Company;
use App\\Models\\User;
use App\\Models\\Warehouse;
use App\\Models\\Product;
use App\\Models\\ProductVariant;
use App\\Models\\StorageLocation;
use App\\Models\\StockBatch;
use App\\Models\\Inventory;
use App\\Models\\InventoryBatch;
use App\\Models\\StockMovement;
use App\\Services\\InventoryService;
use Illuminate\\Foundation\\Testing\\RefreshDatabase;
use Symfony\\Component\\HttpKernel\\Exception\\ConflictHttpException;
use Illuminate\\Validation\\ValidationException;
use Tests\\TestCase;

class InventoryCoreGate1Test extends TestCase
{
    use RefreshDatabase;

    protected InventoryService $service;
    protected Company $company;
    protected Warehouse $warehouse;
    protected ProductVariant $variant;
    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(InventoryService::class);
        $this->company = Company::factory()->create();
        $this->user = User::factory()->create(['company_id' => $this->company->id]);
        $this->warehouse = Warehouse::create(['company_id' => $this->company->id, 'name' => 'Main', 'code' => 'MAIN']);
        
        $product = Product::create(['company_id' => $this->company->id, 'name' => 'Prod 1', 'product_type' => 'STANDARD']);
        $this->variant = ProductVariant::create(['product_id' => $product->id, 'sku' => 'SKU-1', 'variant_name' => 'Base']);
    }

    public function test_can_process_movement_without_batch_or_location()
    {
        $movement = $this->service->processMovement(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            movementType: 'OPENING_STOCK',
            quantity: 10,
            unitCost: 5
        );

        $this->assertEquals(10, $movement->quantity);
        $this->assertNull($movement->storage_location_id);
        $this->assertNull($movement->stock_batch_id);

        $inventory = Inventory::where('product_variant_id', $this->variant->id)->first();
        $this->assertEquals(10, $inventory->quantity);
    }

    public function test_rejects_negative_stock()
    {
        $this->expectException(ConflictHttpException::class);
        $this->service->processMovement(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            movementType: 'STOCK_OUT',
            quantity: 10,
            unitCost: 5
        );
    }

    public function test_processes_with_location_and_batch()
    {
        $location = StorageLocation::create(['warehouse_id' => $this->warehouse->id, 'company_id' => $this->company->id, 'name' => 'A1', 'code' => 'A1']);
        $batch = StockBatch::create(['company_id' => $this->company->id, 'product_id' => $this->variant->product_id, 'variant_id' => $this->variant->id, 'batch_no' => 'B001']);

        $movement = $this->service->processMovement(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            movementType: 'OPENING_STOCK',
            quantity: 20,
            unitCost: 5,
            storageLocationId: $location->id,
            stockBatchId: $batch->id
        );

        $this->assertEquals(20, $movement->quantity);
        $this->assertEquals($location->id, $movement->storage_location_id);
        
        $invBatch = InventoryBatch::where('stock_batch_id', $batch->id)->first();
        $this->assertNotNull($invBatch);
        $this->assertEquals(20, $invBatch->quantity);
    }

    public function test_multi_company_storage_location_boundary()
    {
        $companyB = Company::factory()->create();
        $warehouseB = Warehouse::create(['company_id' => $companyB->id, 'name' => 'B Main', 'code' => 'BMAIN']);

        $response = $this->actingAs($this->user)->postJson('/api/v1/storage-locations', [
            'warehouse_id' => $warehouseB->id,
            'code' => 'A2',
            'name' => 'A2',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['warehouse_id']);
    }

    public function test_stock_batch_product_variant_hierarchy()
    {
        $productB = Product::create(['company_id' => $this->company->id, 'name' => 'Prod B', 'product_type' => 'STANDARD']);
        $variantB = ProductVariant::create(['product_id' => $productB->id, 'sku' => 'SKU-2', 'variant_name' => 'Base']);

        $response = $this->actingAs($this->user)->postJson('/api/v1/stock-batches', [
            'product_id' => $this->variant->product_id, // Product A
            'variant_id' => $variantB->id, // Variant B
            'batch_no' => 'B002',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['variant_id']);
    }

    public function test_inventory_controller_company_boundary()
    {
        $companyB = Company::factory()->create();
        $warehouseB = Warehouse::create(['company_id' => $companyB->id, 'name' => 'B Main', 'code' => 'BMAIN']);

        $response = $this->actingAs($this->user)->postJson('/api/v1/inventory/opening-stock', [
            'warehouse_id' => $warehouseB->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 10,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['warehouse_id']);
    }

    public function test_inventory_service_company_validation()
    {
        $companyB = Company::factory()->create();
        $productB = Product::create(['company_id' => $companyB->id, 'name' => 'Prod B', 'product_type' => 'STANDARD']);
        $variantB = ProductVariant::create(['product_id' => $productB->id, 'sku' => 'SKU-2', 'variant_name' => 'Base']);

        $this->expectException(ConflictHttpException::class);
        $this->service->processMovement(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $variantB->id, // variant belongs to company B
            movementType: 'OPENING_STOCK',
            quantity: 10,
            unitCost: 5
        );
    }

    public function test_storage_location_warehouse_mismatch()
    {
        $warehouse2 = Warehouse::create(['company_id' => $this->company->id, 'name' => 'W2', 'code' => 'W2']);
        $location = StorageLocation::create(['warehouse_id' => $warehouse2->id, 'company_id' => $this->company->id, 'name' => 'W2-A', 'code' => 'W2-A']);

        $this->expectException(ConflictHttpException::class);
        $this->service->processMovement(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id, // Using W1
            productVariantId: $this->variant->id,
            movementType: 'OPENING_STOCK',
            quantity: 10,
            unitCost: 5,
            storageLocationId: $location->id // Location is in W2
        );
    }

    public function test_stock_batch_variant_mismatch()
    {
        $product2 = Product::create(['company_id' => $this->company->id, 'name' => 'Prod 2', 'product_type' => 'STANDARD']);
        $variant2 = ProductVariant::create(['product_id' => $product2->id, 'sku' => 'SKU-2', 'variant_name' => 'Base']);
        $batch = StockBatch::create(['company_id' => $this->company->id, 'product_id' => $product2->id, 'variant_id' => $variant2->id, 'batch_no' => 'B002']);

        $this->expectException(ConflictHttpException::class);
        $this->service->processMovement(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            movementType: 'OPENING_STOCK',
            quantity: 10,
            unitCost: 5,
            storageLocationId: null,
            stockBatchId: $batch->id // Batch is for variant2
        );
    }

    public function test_location_without_batch_rejected()
    {
        $location = StorageLocation::create(['warehouse_id' => $this->warehouse->id, 'company_id' => $this->company->id, 'name' => 'A1', 'code' => 'A1']);
        
        $this->expectException(ConflictHttpException::class);
        $this->service->processMovement(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            movementType: 'OPENING_STOCK',
            quantity: 10,
            unitCost: 5,
            storageLocationId: $location->id,
            stockBatchId: null // Missing batch
        );
    }

    public function test_movement_idempotency()
    {
        $this->service->processMovement(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            movementType: 'STOCK_IN',
            quantity: 10,
            unitCost: 5,
            referenceType: 'PO',
            referenceId: 999
        );

        $this->expectException(ConflictHttpException::class);
        $this->service->processMovement(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            movementType: 'STOCK_IN',
            quantity: 10,
            unitCost: 5,
            referenceType: 'PO',
            referenceId: 999
        );
    }

    public function test_stock_movement_immutability()
    {
        $movement = $this->service->processMovement(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            movementType: 'OPENING_STOCK',
            quantity: 10,
            unitCost: 5
        );

        $this->expectException(\\Exception::class);
        $this->expectExceptionMessage('immutable');
        
        $movement->update(['quantity' => 50]);
    }

    public function test_stock_movement_delete_immutability()
    {
        $movement = $this->service->processMovement(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            movementType: 'OPENING_STOCK',
            quantity: 10,
            unitCost: 5
        );

        $this->expectException(\\Exception::class);
        $this->expectExceptionMessage('immutable');
        
        $movement->delete();
    }
}
`;

fs.writeFileSync('backend/tests/Feature/Inventory/InventoryCoreGate1Test.php', testCode);
