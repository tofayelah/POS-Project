<?php

namespace Tests\Feature\Inventory;

use App\Models\BusinessUnit;
use App\Models\Category;
use App\Models\Company;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\StorageLocation;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Tests\TestCase;

class InventoryCoreGate1Test extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Company $company;
    protected Warehouse $warehouse;
    protected Product $product;
    protected ProductVariant $variant;
    protected Inventory $inventory;
    protected InventoryService $inventoryService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Test Company',
            'code' => 'COMP-GATE1-001',
            'country' => 'Bangladesh',
        ]);

        $businessUnit = BusinessUnit::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'name' => 'Test BU',
            'code' => 'BU-GATE1-001',
        ]);

        $this->warehouse = Warehouse::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $businessUnit->id,
            'name' => 'Gate1 Warehouse',
            'code' => 'WH-GATE1-001',
        ]);

        $this->user = User::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Test Admin',
            'email' => 'gate1admin@test.com',
            'password' => bcrypt('password'),
            'company_id' => $this->company->id,
        ]);

        $category = Category::create([
            'company_id' => $this->company->id,
            'name' => 'Gate1 Category',
            'slug' => 'gate1-category',
        ]);

        $unit = Unit::create([
            'company_id' => $this->company->id,
            'name' => 'Gate1 Unit',
            'short_code' => 'PCS',
        ]);

        $this->product = Product::create([
            'company_id' => $this->company->id,
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'name' => 'Gate1 Product',
            'product_type' => 'simple',
            'status' => 'active',
        ]);

        $this->variant = ProductVariant::create([
            'product_id' => $this->product->id,
            'sku' => 'SKU-GATE1-001',
            'variant_name' => 'Standard',
            'cost_price' => 50.0000,
            'selling_price' => 100.0000,
            'wholesale_price' => 90.0000,
            'mrp' => 100.0000,
            'status' => 'active',
        ]);

        $this->inventory = Inventory::create([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'product_id' => $this->product->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 100,
            'reserved_quantity' => 0,
            'available_quantity' => 100,
            'average_cost' => 50,
            'total_value' => 5000,
        ]);

        $this->inventoryService = app(InventoryService::class);
    }

    public function test_successful_stock_out_creates_stock_movement(): void
    {
        $movement = $this->inventoryService->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 10,
            referenceType: 'SALE',
            referenceId: 101,
            referenceNumber: 'SALE-101',
            reason: 'Customer sale',
            notes: 'Test notes',
            userId: $this->user->id
        );

        $this->assertInstanceOf(StockMovement::class, $movement);
        $this->assertEquals('STOCK_OUT', $movement->movement_type);
        $this->assertEquals(10, $movement->quantity);
        $this->assertEquals(100, $movement->quantity_before);
        $this->assertEquals(90, $movement->quantity_after);
        $this->assertEquals('SALE', $movement->reference_type);
        $this->assertEquals(101, $movement->reference_id);
        $this->assertEquals('SALE-101', $movement->reference_number);
        $this->assertDatabaseHas('stock_movements', [
            'id' => $movement->id,
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'product_variant_id' => $this->variant->id,
            'movement_type' => 'STOCK_OUT',
            'quantity' => 10,
        ]);
    }

    public function test_successful_stock_out_decreases_inventory_quantity(): void
    {
        $this->inventoryService->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 35,
            referenceType: 'SALE',
            referenceId: 102,
            referenceNumber: 'SALE-102',
            userId: $this->user->id
        );

        $this->inventory->refresh();
        $this->assertEquals(65, $this->inventory->quantity);
        $this->assertEquals(65, $this->inventory->available_quantity);
        $this->assertEquals(3250, $this->inventory->total_value);
    }

    public function test_successful_stock_out_decreases_inventory_batch_quantity(): void
    {
        $stockBatch = StockBatch::create([
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'variant_id' => $this->variant->id,
            'batch_no' => 'BATCH-001',
            'unit_cost' => 50,
            'status' => 'ACTIVE',
        ]);

        $inventoryBatch = InventoryBatch::create([
            'inventory_id' => $this->inventory->id,
            'stock_batch_id' => $stockBatch->id,
            'storage_location_id' => null,
            'quantity' => 50,
        ]);

        $this->inventoryService->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 20,
            referenceType: 'SALE',
            referenceId: 103,
            referenceNumber: 'SALE-103',
            userId: $this->user->id,
            stockBatchId: $stockBatch->id
        );

        $inventoryBatch->refresh();
        $this->assertEquals(30, $inventoryBatch->quantity);
    }

    public function test_returned_movement_has_correct_unit_cost(): void
    {
        $this->inventory->update([
            'average_cost' => 75.50,
            'total_value' => 7550,
        ]);

        $movement = $this->inventoryService->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 4,
            referenceType: 'SALE',
            referenceId: 104,
            referenceNumber: 'SALE-104',
            userId: $this->user->id
        );

        $this->assertEquals(75.50, (float) $movement->unit_cost);
        $this->assertEquals(302.00, (float) $movement->total_cost);
        $this->assertEquals(75.50, (float) $movement['unit_cost']);
    }

    public function test_insufficient_warehouse_stock_is_rejected(): void
    {
        $this->expectException(ConflictHttpException::class);

        $this->inventoryService->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 150,
            referenceType: 'SALE',
            referenceId: 105,
            referenceNumber: 'SALE-105',
            userId: $this->user->id
        );
    }

    public function test_insufficient_batch_stock_is_rejected(): void
    {
        $stockBatch = StockBatch::create([
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'variant_id' => $this->variant->id,
            'batch_no' => 'BATCH-LOW',
            'unit_cost' => 50,
            'status' => 'ACTIVE',
        ]);

        InventoryBatch::create([
            'inventory_id' => $this->inventory->id,
            'stock_batch_id' => $stockBatch->id,
            'storage_location_id' => null,
            'quantity' => 15,
        ]);

        $this->expectException(ConflictHttpException::class);

        $this->inventoryService->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 25,
            referenceType: 'SALE',
            referenceId: 106,
            referenceNumber: 'SALE-106',
            userId: $this->user->id,
            stockBatchId: $stockBatch->id
        );
    }

    public function test_cross_company_warehouse_is_rejected(): void
    {
        $companyB = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Other Company',
            'code' => 'COMP-OTHER-001',
            'country' => 'Bangladesh',
        ]);

        $buB = BusinessUnit::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $companyB->id,
            'name' => 'Other BU',
            'code' => 'BU-OTHER-001',
        ]);

        $warehouseB = Warehouse::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $companyB->id,
            'business_unit_id' => $buB->id,
            'name' => 'Other Warehouse',
            'code' => 'WH-OTHER-001',
        ]);

        $this->expectException(ConflictHttpException::class);

        $this->inventoryService->stockOut(
            companyId: $this->company->id,
            warehouseId: $warehouseB->id,
            productVariantId: $this->variant->id,
            quantity: 10,
            referenceType: 'SALE',
            referenceId: 107,
            referenceNumber: 'SALE-107',
            userId: $this->user->id
        );
    }

    public function test_cross_company_batch_is_rejected(): void
    {
        $companyB = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Batch Company',
            'code' => 'COMP-BATCH-001',
            'country' => 'Bangladesh',
        ]);

        $categoryB = Category::create([
            'company_id' => $companyB->id,
            'name' => 'Batch Cat',
            'slug' => 'batch-cat',
        ]);

        $unitB = Unit::create([
            'company_id' => $companyB->id,
            'name' => 'Batch Unit',
            'short_code' => 'BCS',
        ]);

        $productB = Product::create([
            'company_id' => $companyB->id,
            'category_id' => $categoryB->id,
            'unit_id' => $unitB->id,
            'name' => 'Batch Product',
            'product_type' => 'simple',
            'status' => 'active',
        ]);

        $variantB = ProductVariant::create([
            'product_id' => $productB->id,
            'sku' => 'SKU-BATCH-002',
            'variant_name' => 'Standard',
            'cost_price' => 50,
            'selling_price' => 100,
            'wholesale_price' => 90,
            'mrp' => 100,
            'status' => 'active',
        ]);

        $batchB = StockBatch::create([
            'company_id' => $companyB->id,
            'product_id' => $productB->id,
            'variant_id' => $variantB->id,
            'batch_no' => 'BATCH-CROSS-CO',
            'unit_cost' => 50,
            'status' => 'ACTIVE',
        ]);

        $this->expectException(ConflictHttpException::class);

        $this->inventoryService->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 5,
            referenceType: 'SALE',
            referenceId: 108,
            referenceNumber: 'SALE-108',
            userId: $this->user->id,
            stockBatchId: $batchB->id
        );
    }

    public function test_cross_warehouse_storage_location_is_rejected(): void
    {
        $warehouse2 = Warehouse::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $this->warehouse->business_unit_id,
            'name' => 'Second Warehouse',
            'code' => 'WH-2ND',
        ]);

        $locationInWh2 = StorageLocation::create([
            'company_id' => $this->company->id,
            'warehouse_id' => $warehouse2->id,
            'code' => 'LOC-WH2-01',
            'name' => 'Shelf 1',
            'is_active' => true,
        ]);

        $this->expectException(ConflictHttpException::class);

        $this->inventoryService->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 5,
            referenceType: 'SALE',
            referenceId: 109,
            referenceNumber: 'SALE-109',
            userId: $this->user->id,
            storageLocationId: $locationInWh2->id
        );
    }

    public function test_invalid_product_variant_is_rejected(): void
    {
        $this->expectException(ConflictHttpException::class);

        $this->inventoryService->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: 9999999,
            quantity: 5,
            referenceType: 'SALE',
            referenceId: 110,
            referenceNumber: 'SALE-110',
            userId: $this->user->id
        );
    }

    public function test_invalid_stock_batch_is_rejected(): void
    {
        $otherProduct = Product::create([
            'company_id' => $this->company->id,
            'category_id' => $this->product->category_id,
            'unit_id' => $this->product->unit_id,
            'name' => 'Other Product',
            'product_type' => 'simple',
            'status' => 'active',
        ]);

        $otherVariant = ProductVariant::create([
            'product_id' => $otherProduct->id,
            'sku' => 'SKU-OTHER-VARIANT',
            'variant_name' => 'Large',
            'cost_price' => 60,
            'selling_price' => 120,
            'wholesale_price' => 100,
            'mrp' => 120,
            'status' => 'active',
        ]);

        $batchForOtherVariant = StockBatch::create([
            'company_id' => $this->company->id,
            'product_id' => $otherProduct->id,
            'variant_id' => $otherVariant->id,
            'batch_no' => 'BATCH-OTHER-VAR',
            'unit_cost' => 60,
            'status' => 'ACTIVE',
        ]);

        $this->expectException(ConflictHttpException::class);

        $this->inventoryService->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 5,
            referenceType: 'SALE',
            referenceId: 111,
            referenceNumber: 'SALE-111',
            userId: $this->user->id,
            stockBatchId: $batchForOtherVariant->id
        );
    }

    public function test_duplicate_non_zero_reference_is_idempotent(): void
    {
        $firstMovement = $this->inventoryService->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 15,
            referenceType: 'SALE',
            referenceId: 112,
            referenceNumber: 'SALE-112',
            userId: $this->user->id
        );

        $this->inventory->refresh();
        $this->assertEquals(85, $this->inventory->quantity);

        $secondMovement = $this->inventoryService->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 15,
            referenceType: 'SALE',
            referenceId: 112,
            referenceNumber: 'SALE-112',
            userId: $this->user->id
        );

        $this->assertEquals($firstMovement->id, $secondMovement->id);

        $this->inventory->refresh();
        $this->assertEquals(85, $this->inventory->quantity);

        $count = StockMovement::where('company_id', $this->company->id)
            ->where('reference_type', 'SALE')
            ->where('reference_id', 112)
            ->count();
        $this->assertEquals(1, $count);
    }

    public function test_stock_movement_update_or_delete_is_rejected(): void
    {
        $movement = $this->inventoryService->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 10,
            referenceType: 'SALE',
            referenceId: 113,
            referenceNumber: 'SALE-113',
            userId: $this->user->id
        );

        // Verify update is rejected
        $updateFailed = false;
        try {
            $movement->update(['notes' => 'Tampered notes']);
        } catch (\RuntimeException $e) {
            $updateFailed = true;
            $this->assertStringContainsString('immutable', $e->getMessage());
        }
        $this->assertTrue($updateFailed, 'StockMovement update should have thrown a RuntimeException');

        // Verify delete is rejected
        $deleteFailed = false;
        try {
            $movement->delete();
        } catch (\RuntimeException $e) {
            $deleteFailed = true;
            $this->assertStringContainsString('immutable', $e->getMessage());
        }
        $this->assertTrue($deleteFailed, 'StockMovement delete should have thrown a RuntimeException');
    }

    public function test_transaction_rollback_restores_state_after_forced_failure(): void
    {
        $stockBatch = StockBatch::create([
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'variant_id' => $this->variant->id,
            'batch_no' => 'BATCH-ROLLBACK',
            'unit_cost' => 50,
            'status' => 'ACTIVE',
        ]);

        $inventoryBatch = InventoryBatch::create([
            'inventory_id' => $this->inventory->id,
            'stock_batch_id' => $stockBatch->id,
            'storage_location_id' => null,
            'quantity' => 50,
        ]);

        // Force an exception during creation of StockMovement inside transaction
        StockMovement::creating(function ($model) {
            if ($model->notes === 'TRIGGER_FORCED_ROLLBACK') {
                throw new \RuntimeException('Simulated failure during transaction');
            }
        });

        $failed = false;
        try {
            $this->inventoryService->stockOut(
                companyId: $this->company->id,
                warehouseId: $this->warehouse->id,
                productVariantId: $this->variant->id,
                quantity: 20,
                referenceType: 'SALE',
                referenceId: 114,
                referenceNumber: 'SALE-114',
                notes: 'TRIGGER_FORCED_ROLLBACK',
                userId: $this->user->id,
                stockBatchId: $stockBatch->id
            );
        } catch (\RuntimeException $e) {
            $failed = true;
            $this->assertEquals('Simulated failure during transaction', $e->getMessage());
        }

        $this->assertTrue($failed, 'Expected transaction to throw RuntimeException');

        // Verify inventory state was restored
        $this->inventory->refresh();
        $this->assertEquals(100, $this->inventory->quantity);

        // Verify inventory batch state was restored
        $inventoryBatch->refresh();
        $this->assertEquals(50, $inventoryBatch->quantity);

        // Verify no StockMovement was persisted
        $movementExists = StockMovement::where('reference_id', 114)->exists();
        $this->assertFalse($movementExists);
    }
}
