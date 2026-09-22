<?php

namespace Tests\Feature\Inventory;

use App\Models\AuditLog;
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
use App\Models\User;
use App\Models\Unit;
use App\Models\Warehouse;
use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Tests\TestCase;

class InventoryInGate12Test extends TestCase
{
    use RefreshDatabase;

    protected InventoryService $service;
    protected Company $company;
    protected BusinessUnit $businessUnit;
    protected Warehouse $warehouse;
    protected Product $product;
    protected ProductVariant $variant;
    protected User $user;
    protected Category $category;
    protected Unit $unit;

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

        $this->businessUnit = BusinessUnit::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'name' => 'Main Business Unit',
            'code' => 'BU-MAIN-' . Str::random(5),
        ]);

        $this->warehouse = Warehouse::create([
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'name' => 'Main Warehouse',
            'code' => 'WH-MAIN',
        ]);

        $this->category = Category::create([
            'company_id' => $this->company->id,
            'name' => 'General Category',
        ]);

        $this->unit = Unit::create([
            'company_id' => $this->company->id,
            'name' => 'Piece',
            'short_code' => 'PCS',
        ]);

        $this->product = Product::create([
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'name' => 'Standard Product',
            'product_type' => 'simple',
            'status' => 'active',
        ]);

        $this->variant = ProductVariant::create([
            'product_id' => $this->product->id,
            'sku' => 'SKU-GATE12-001',
            'variant_name' => 'Default Variant',
            'cost_price' => 50.00,
            'selling_price' => 100.00,
        ]);
    }

    public function test_successful_stock_in_creates_stock_movement(): void
    {
        $movement = $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 100,
            unitCost: 15.50,
            referenceType: 'PURCHASE_RECEIPT',
            referenceId: 1001,
            referenceNumber: 'PO-2026-001',
            reason: 'Purchase order receiving',
            notes: 'Batch received in full',
            userId: $this->user->id
        );

        $this->assertInstanceOf(StockMovement::class, $movement);
        $this->assertEquals('STOCK_IN', $movement->movement_type);
        $this->assertEquals(100, (float) $movement->quantity);
        $this->assertEquals(15.50, (float) $movement->unit_cost);
        $this->assertEquals(1550.00, (float) $movement->total_cost);
        $this->assertEquals(0, (float) $movement->quantity_before);
        $this->assertEquals(100, (float) $movement->quantity_after);

        $this->assertDatabaseHas('stock_movements', [
            'id' => $movement->id,
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'product_variant_id' => $this->variant->id,
            'movement_type' => 'STOCK_IN',
            'quantity' => 100.0000,
            'unit_cost' => 15.5000,
            'total_cost' => 1550.0000,
            'reference_type' => 'PURCHASE_RECEIPT',
            'reference_id' => 1001,
            'reference_number' => 'PO-2026-001',
        ]);
    }

    public function test_successful_stock_in_increases_inventory_quantity(): void
    {
        $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 100,
            unitCost: 10.00,
            referenceType: 'PURCHASE_RECEIPT',
            referenceId: 1002,
            referenceNumber: 'PO-2026-002'
        );

        $inventory = Inventory::where('company_id', $this->company->id)
            ->where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant->id)
            ->first();

        $this->assertNotNull($inventory);
        $this->assertEquals(100, (float) $inventory->quantity);
        $this->assertEquals(100, (float) $inventory->available_quantity);

        $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 50,
            unitCost: 10.00,
            referenceType: 'PURCHASE_RECEIPT',
            referenceId: 1003,
            referenceNumber: 'PO-2026-003'
        );

        $inventory->refresh();
        $this->assertEquals(150, (float) $inventory->quantity);
        $this->assertEquals(150, (float) $inventory->available_quantity);
    }

    public function test_stock_in_calculates_moving_average_cost(): void
    {
        $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 100,
            unitCost: 10.00,
            referenceType: 'PURCHASE_RECEIPT',
            referenceId: 2001,
            referenceNumber: 'PO-COST-01'
        );

        $inventory = Inventory::where('company_id', $this->company->id)
            ->where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant->id)
            ->first();

        $this->assertEquals(10.00, (float) $inventory->average_cost);
        $this->assertEquals(1000.00, (float) $inventory->total_value);

        $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 100,
            unitCost: 20.00,
            referenceType: 'PURCHASE_RECEIPT',
            referenceId: 2002,
            referenceNumber: 'PO-COST-02'
        );

        $inventory->refresh();
        $this->assertEquals(200, (float) $inventory->quantity);
        $this->assertEquals(15.00, (float) $inventory->average_cost);
        $this->assertEquals(3000.00, (float) $inventory->total_value);
    }

    public function test_stock_in_creates_stock_batch_when_batch_number_supplied(): void
    {
        $movement = $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 60,
            unitCost: 25.00,
            referenceType: 'PURCHASE_RECEIPT',
            referenceId: 3001,
            referenceNumber: 'PO-BATCH-01',
            batchNumber: 'BATCH-2026-A1'
        );

        $this->assertNotNull($movement->stock_batch_id);

        $this->assertDatabaseHas('stock_batches', [
            'id' => $movement->stock_batch_id,
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'variant_id' => $this->variant->id,
            'batch_no' => 'BATCH-2026-A1',
            'unit_cost' => 25.0000,
            'status' => 'ACTIVE',
        ]);
    }

    public function test_stock_in_creates_inventory_batch(): void
    {
        $movement = $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 80,
            unitCost: 30.00,
            referenceType: 'PURCHASE_RECEIPT',
            referenceId: 4001,
            referenceNumber: 'PO-INV-BATCH-01',
            batchNumber: 'BATCH-2026-B1'
        );

        $inventory = Inventory::where('company_id', $this->company->id)
            ->where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant->id)
            ->first();

        $this->assertDatabaseHas('inventory_batches', [
            'inventory_id' => $inventory->id,
            'stock_batch_id' => $movement->stock_batch_id,
            'storage_location_id' => null,
            'quantity' => 80.0000,
        ]);
    }

    public function test_stock_in_assigns_storage_location(): void
    {
        $location = StorageLocation::create([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'name' => 'Rack A - Shelf 1',
            'code' => 'LOC-A1',
            'is_active' => true,
        ]);

        $movement = $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 40,
            unitCost: 12.00,
            referenceType: 'PURCHASE_RECEIPT',
            referenceId: 5001,
            referenceNumber: 'PO-LOC-01',
            batchNumber: 'BATCH-2026-LOC1',
            storageLocationId: $location->id
        );

        $this->assertEquals($location->id, $movement->storage_location_id);

        $inventory = Inventory::where('company_id', $this->company->id)
            ->where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant->id)
            ->first();

        $this->assertDatabaseHas('inventory_batches', [
            'inventory_id' => $inventory->id,
            'stock_batch_id' => $movement->stock_batch_id,
            'storage_location_id' => $location->id,
            'quantity' => 40.0000,
        ]);
    }

    public function test_existing_stock_batch_is_increased(): void
    {
        $movement1 = $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 50,
            unitCost: 20.00,
            referenceType: 'PURCHASE_RECEIPT',
            referenceId: 6001,
            referenceNumber: 'PO-REPEAT-01',
            batchNumber: 'BATCH-REPEAT-1'
        );

        $movement2 = $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 30,
            unitCost: 20.00,
            referenceType: 'PURCHASE_RECEIPT',
            referenceId: 6002,
            referenceNumber: 'PO-REPEAT-02',
            batchNumber: 'BATCH-REPEAT-1'
        );

        $this->assertEquals($movement1->stock_batch_id, $movement2->stock_batch_id);

        $this->assertEquals(
            1,
            StockBatch::where('batch_no', 'BATCH-REPEAT-1')->count()
        );

        $inventory = Inventory::where('company_id', $this->company->id)
            ->where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant->id)
            ->first();

        $invBatch = InventoryBatch::where('inventory_id', $inventory->id)
            ->where('stock_batch_id', $movement1->stock_batch_id)
            ->first();

        $this->assertNotNull($invBatch);
        $this->assertEquals(80.0000, (float) $invBatch->quantity);
    }

    public function test_duplicate_non_zero_reference_is_idempotent(): void
    {
        $movement1 = $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 100,
            unitCost: 15.00,
            referenceType: 'PURCHASE_RECEIPT',
            referenceId: 7001,
            referenceNumber: 'PO-IDEM-01'
        );

        $inventory = Inventory::where('company_id', $this->company->id)
            ->where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant->id)
            ->first();

        $this->assertEquals(100, (float) $inventory->quantity);

        $movement2 = $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 100,
            unitCost: 15.00,
            referenceType: 'PURCHASE_RECEIPT',
            referenceId: 7001,
            referenceNumber: 'PO-IDEM-01'
        );

        $this->assertEquals($movement1->id, $movement2->id);

        $inventory->refresh();
        $this->assertEquals(100, (float) $inventory->quantity);
        $this->assertEquals(
            1,
            StockMovement::where('reference_id', 7001)->count()
        );
    }

    public function test_insufficient_or_invalid_input_is_rejected(): void
    {
        $this->expectException(ConflictHttpException::class);

        $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 0,
            unitCost: 10.00,
            referenceType: 'PURCHASE_RECEIPT',
            referenceId: 8001,
            referenceNumber: 'PO-FAIL-01'
        );
    }

    public function test_negative_unit_cost_is_rejected(): void
    {
        $this->expectException(ConflictHttpException::class);

        $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 10,
            unitCost: -5.00,
            referenceType: 'PURCHASE_RECEIPT',
            referenceId: 8002,
            referenceNumber: 'PO-FAIL-02'
        );
    }

    public function test_cross_company_warehouse_is_rejected(): void
    {
        $otherCompany = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Other Corp',
            'code' => 'OTHER-' . Str::random(5),
            'country' => 'Bangladesh',
        ]);

        $otherBu = BusinessUnit::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $otherCompany->id,
            'name' => 'Other BU',
            'code' => 'BU-OTHER-' . Str::random(5),
        ]);

        $otherWarehouse = Warehouse::create([
            'company_id' => $otherCompany->id,
            'business_unit_id' => $otherBu->id,
            'name' => 'Foreign Warehouse',
            'code' => 'WH-FOR',
        ]);

        $this->expectException(ConflictHttpException::class);

        $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $otherWarehouse->id,
            productVariantId: $this->variant->id,
            quantity: 10,
            unitCost: 10.00,
            referenceType: 'PURCHASE_RECEIPT',
            referenceId: 9001,
            referenceNumber: 'PO-CROSS-01'
        );
    }

    public function test_cross_company_batch_is_rejected(): void
    {
        $otherCompany = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Foreign Company',
            'code' => 'FC-' . Str::random(5),
            'country' => 'Bangladesh',
        ]);

        $otherCategory = Category::create([
            'company_id' => $otherCompany->id,
            'name' => 'Foreign Category',
        ]);

        $otherUnit = Unit::create([
            'company_id' => $otherCompany->id,
            'name' => 'Foreign Unit',
            'short_code' => 'FPCS',
        ]);

        $otherProduct = Product::create([
            'company_id' => $otherCompany->id,
            'category_id' => $otherCategory->id,
            'unit_id' => $otherUnit->id,
            'name' => 'Foreign Product',
            'product_type' => 'simple',
        ]);

        $otherVariant = ProductVariant::create([
            'product_id' => $otherProduct->id,
            'sku' => 'FOR-SKU-01',
            'variant_name' => 'Foreign Variant',
            'cost_price' => 10.00,
            'selling_price' => 20.00,
        ]);

        $otherBatch = StockBatch::create([
            'company_id' => $otherCompany->id,
            'product_id' => $otherProduct->id,
            'variant_id' => $otherVariant->id,
            'batch_no' => 'FOR-BATCH-99',
            'unit_cost' => 10.00,
            'status' => 'ACTIVE',
        ]);

        $this->expectException(ConflictHttpException::class);

        $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 10,
            unitCost: 10.00,
            referenceType: 'PURCHASE_RECEIPT',
            referenceId: 9101,
            referenceNumber: 'PO-CROSS-02',
            stockBatchId: $otherBatch->id
        );
    }

    public function test_cross_warehouse_storage_location_is_rejected(): void
    {
        $warehouse2 = Warehouse::create([
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'name' => 'Second Warehouse',
            'code' => 'WH-2',
        ]);

        $location2 = StorageLocation::create([
            'company_id' => $this->company->id,
            'warehouse_id' => $warehouse2->id,
            'name' => 'Warehouse 2 Rack B',
            'code' => 'WH2-RACK-B',
            'is_active' => true,
        ]);

        $this->expectException(ConflictHttpException::class);

        $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 10,
            unitCost: 10.00,
            referenceType: 'PURCHASE_RECEIPT',
            referenceId: 9201,
            referenceNumber: 'PO-CROSS-LOC',
            batchNumber: 'BATCH-CROSS-LOC',
            storageLocationId: $location2->id
        );
    }

    public function test_batch_variant_mismatch_is_rejected(): void
    {
        $product2 = Product::create([
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'name' => 'Second Product',
            'product_type' => 'simple',
        ]);

        $variant2 = ProductVariant::create([
            'product_id' => $product2->id,
            'sku' => 'SKU-GATE12-002',
            'variant_name' => 'Variant 2',
            'cost_price' => 50.00,
            'selling_price' => 100.00,
        ]);

        $batchForVariant2 = StockBatch::create([
            'company_id' => $this->company->id,
            'product_id' => $product2->id,
            'variant_id' => $variant2->id,
            'batch_no' => 'BATCH-VAR2-01',
            'unit_cost' => 50.00,
            'status' => 'ACTIVE',
        ]);

        $this->expectException(ConflictHttpException::class);

        $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 10,
            unitCost: 50.00,
            referenceType: 'PURCHASE_RECEIPT',
            referenceId: 9301,
            referenceNumber: 'PO-MISMATCH-01',
            stockBatchId: $batchForVariant2->id
        );
    }

    public function test_transaction_rolls_back_on_forced_failure(): void
    {
        StockMovement::creating(function ($model) {
            if ($model->reference_number === 'PO-ROLLBACK-01') {
                throw new \Exception("Simulated mid-transaction failure");
            }
        });

        try {
            $this->service->stockIn(
                companyId: $this->company->id,
                warehouseId: $this->warehouse->id,
                productVariantId: $this->variant->id,
                quantity: 10,
                unitCost: 10.00,
                referenceType: 'PURCHASE_RECEIPT',
                referenceId: 9401,
                referenceNumber: 'PO-ROLLBACK-01',
                batchNumber: 'BATCH-ROLLBACK-01'
            );
        } catch (\Exception $e) {
            $this->assertEquals(
                "Simulated mid-transaction failure",
                $e->getMessage()
            );
        }

        $this->assertEquals(0, Inventory::count());
        $this->assertEquals(0, InventoryBatch::count());
        $this->assertEquals(0, StockBatch::count());
        $this->assertEquals(0, StockMovement::count());
        $this->assertEquals(
            0,
            AuditLog::where('event', 'STOCK_IN_RECEIVED')->count()
        );
    }

    public function test_stock_in_without_batch_still_updates_inventory(): void
    {
        $movement = $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 50,
            unitCost: 12.00,
            referenceType: 'PURCHASE_RECEIPT',
            referenceId: 9501,
            referenceNumber: 'PO-NOBATCH-01'
        );

        $this->assertNull($movement->stock_batch_id);

        $inventory = Inventory::where('company_id', $this->company->id)
            ->where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant->id)
            ->first();

        $this->assertNotNull($inventory);
        $this->assertEquals(50, (float) $inventory->quantity);
        $this->assertEquals(0, StockBatch::count());
        $this->assertEquals(0, InventoryBatch::count());
    }
}