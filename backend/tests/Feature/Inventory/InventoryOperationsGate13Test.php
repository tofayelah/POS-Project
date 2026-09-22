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
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Tests\TestCase;

class InventoryOperationsGate13Test extends TestCase
{
    use RefreshDatabase;

    protected InventoryService $service;
    protected Company $company;
    protected BusinessUnit $businessUnit;
    protected Warehouse $warehouseA;
    protected Warehouse $warehouseB;
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
            'name' => 'Gate13 Test Company',
            'code' => 'COMP-G13-' . Str::random(5),
            'country' => 'Bangladesh',
        ]);

        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);

        $this->businessUnit = BusinessUnit::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'name' => 'Main Business Unit',
            'code' => 'BU-G13-' . Str::random(5),
        ]);

        $this->warehouseA = Warehouse::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'name' => 'Source Warehouse A',
            'code' => 'WHA-' . Str::random(5),
        ]);

        $this->warehouseB = Warehouse::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'name' => 'Destination Warehouse B',
            'code' => 'WHB-' . Str::random(5),
        ]);

        $this->category = Category::create([
            'company_id' => $this->company->id,
            'name' => 'Electronics',
            'slug' => 'electronics-' . Str::random(5),
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
            'name' => 'Test Laptop',
            'product_type' => 'simple',
            'status' => 'active',
        ]);

        $this->variant = ProductVariant::create([
            'product_id' => $this->product->id,
            'sku' => 'LAPTOP-G13-' . Str::random(5),
            'variant_name' => 'Standard Edition',
            'cost_price' => 100.0000,
            'selling_price' => 150.0000,
            'wholesale_price' => 140.0000,
            'mrp' => 150.0000,
            'status' => 'active',
        ]);
    }

    // ==========================================
    // TRANSFER TESTS (1 - 14)
    // ==========================================

    /**
     * Test 1: Successful warehouse transfer updates quantities and creates movements.
     */
    public function test_successful_warehouse_transfer_updates_quantities_and_creates_movements(): void
    {
        // Setup initial stock in warehouseA: 100 units at cost 100
        $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 100.0,
            unitCost: 100.0,
            referenceType: 'Initial',
            referenceId: 1,
            referenceNumber: 'INIT-001',
            userId: $this->user->id
        );

        $result = $this->service->transferStock(
            companyId: $this->company->id,
            sourceWarehouseId: $this->warehouseA->id,
            destinationWarehouseId: $this->warehouseB->id,
            productVariantId: $this->variant->id,
            quantity: 40.0,
            referenceType: 'TransferOrder',
            referenceId: 101,
            referenceNumber: 'TRF-101',
            reason: 'Rebalancing inventory',
            notes: 'Transfer 40 units',
            userId: $this->user->id
        );

        $this->assertArrayHasKey('transfer_out', $result);
        $this->assertArrayHasKey('transfer_in', $result);
        $this->assertInstanceOf(StockMovement::class, $result['transfer_out']);
        $this->assertInstanceOf(StockMovement::class, $result['transfer_in']);

        // Check source inventory
        $invA = Inventory::where('warehouse_id', $this->warehouseA->id)
            ->where('product_variant_id', $this->variant->id)
            ->first();
        $this->assertEquals(60.0, (float) $invA->quantity);

        // Check destination inventory
        $invB = Inventory::where('warehouse_id', $this->warehouseB->id)
            ->where('product_variant_id', $this->variant->id)
            ->first();
        $this->assertEquals(40.0, (float) $invB->quantity);

        // Check movement types
        $this->assertEquals('TRANSFER_OUT', $result['transfer_out']->movement_type);
        $this->assertEquals('TRANSFER_IN', $result['transfer_in']->movement_type);
    }

    /**
     * Test 2: Same warehouse location transfer preserves total warehouse stock.
     */
    public function test_same_warehouse_location_transfer(): void
    {
        $loc1 = StorageLocation::create([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouseA->id,
            'code' => 'LOC-A1',
            'name' => 'Rack A1',
            'is_active' => true,
        ]);

        $loc2 = StorageLocation::create([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouseA->id,
            'code' => 'LOC-A2',
            'name' => 'Rack A2',
            'is_active' => true,
        ]);

        $batch = StockBatch::create([
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'variant_id' => $this->variant->id,
            'batch_no' => 'BATCH-SAME-WH',
            'unit_cost' => 100.0,
            'status' => 'ACTIVE',
        ]);

        // Stock in 50 units into loc1
        $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 50.0,
            unitCost: 100.0,
            referenceType: 'Initial',
            referenceId: 2,
            referenceNumber: 'INIT-002',
            stockBatchId: $batch->id,
            storageLocationId: $loc1->id,
            userId: $this->user->id
        );

        $result = $this->service->transferStock(
            companyId: $this->company->id,
            sourceWarehouseId: $this->warehouseA->id,
            destinationWarehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 20.0,
            referenceType: 'InternalMove',
            referenceId: 102,
            referenceNumber: 'INT-102',
            sourceStorageLocationId: $loc1->id,
            destinationStorageLocationId: $loc2->id,
            stockBatchId: $batch->id,
            userId: $this->user->id
        );

        // Overall warehouse inventory quantity must NOT change
        $invA = Inventory::where('warehouse_id', $this->warehouseA->id)
            ->where('product_variant_id', $this->variant->id)
            ->first();
        $this->assertEquals(50.0, (float) $invA->quantity);

        // Inventory batches must be updated per location
        $batchLoc1 = InventoryBatch::where('inventory_id', $invA->id)
            ->where('storage_location_id', $loc1->id)
            ->first();
        $this->assertEquals(30.0, (float) $batchLoc1->quantity);

        $batchLoc2 = InventoryBatch::where('inventory_id', $invA->id)
            ->where('storage_location_id', $loc2->id)
            ->first();
        $this->assertEquals(20.0, (float) $batchLoc2->quantity);
    }

    /**
     * Test 3: Storage location transfer updates inventory batches across warehouses.
     */
    public function test_storage_location_transfer_updates_inventory_batches(): void
    {
        $locA = StorageLocation::create([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouseA->id,
            'code' => 'LOC-WHA',
            'name' => 'Bay A',
            'is_active' => true,
        ]);

        $locB = StorageLocation::create([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouseB->id,
            'code' => 'LOC-WHB',
            'name' => 'Bay B',
            'is_active' => true,
        ]);

        $batch = StockBatch::create([
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'variant_id' => $this->variant->id,
            'batch_no' => 'BATCH-LOC-TRF',
            'unit_cost' => 80.0,
            'status' => 'ACTIVE',
        ]);

        $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 40.0,
            unitCost: 80.0,
            referenceType: 'Initial',
            referenceId: 3,
            referenceNumber: 'INIT-003',
            stockBatchId: $batch->id,
            storageLocationId: $locA->id,
            userId: $this->user->id
        );

        $this->service->transferStock(
            companyId: $this->company->id,
            sourceWarehouseId: $this->warehouseA->id,
            destinationWarehouseId: $this->warehouseB->id,
            productVariantId: $this->variant->id,
            quantity: 15.0,
            referenceType: 'TransferOrder',
            referenceId: 103,
            referenceNumber: 'TRF-103',
            sourceStorageLocationId: $locA->id,
            destinationStorageLocationId: $locB->id,
            stockBatchId: $batch->id,
            userId: $this->user->id
        );

        $invA = Inventory::where('warehouse_id', $this->warehouseA->id)->first();
        $invB = Inventory::where('warehouse_id', $this->warehouseB->id)->first();

        $batchA = InventoryBatch::where('inventory_id', $invA->id)->first();
        $batchB = InventoryBatch::where('inventory_id', $invB->id)->first();

        $this->assertEquals(25.0, (float) $batchA->quantity);
        $this->assertEquals(15.0, (float) $batchB->quantity);
        $this->assertEquals($locB->id, $batchB->storage_location_id);
    }

    /**
     * Test 4: Insufficient source stock rejects transfer.
     */
    public function test_insufficient_source_stock_rejects_transfer(): void
    {
        $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 10.0,
            unitCost: 50.0,
            referenceType: 'Initial',
            referenceId: 4,
            referenceNumber: 'INIT-004',
            userId: $this->user->id
        );

        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage('Insufficient stock in source warehouse');

        $this->service->transferStock(
            companyId: $this->company->id,
            sourceWarehouseId: $this->warehouseA->id,
            destinationWarehouseId: $this->warehouseB->id,
            productVariantId: $this->variant->id,
            quantity: 25.0,
            referenceType: 'TransferOrder',
            referenceId: 104,
            referenceNumber: 'TRF-104',
            userId: $this->user->id
        );
    }

    /**
     * Test 5: Cross-company source warehouse is rejected.
     */
    public function test_cross_company_source_warehouse_rejected(): void
    {
        $otherCompany = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Other Company',
            'code' => 'OTHER-01',
            'country' => 'Bangladesh',
        ]);

        $otherWarehouse = Warehouse::create([
            'company_id' => $otherCompany->id,
            'name' => 'Other Warehouse',
            'code' => 'OTH-WH',
        ]);

        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage('Source warehouse does not belong to the specified company.');

        $this->service->transferStock(
            companyId: $this->company->id,
            sourceWarehouseId: $otherWarehouse->id,
            destinationWarehouseId: $this->warehouseB->id,
            productVariantId: $this->variant->id,
            quantity: 10.0,
            referenceType: 'TransferOrder',
            referenceId: 105,
            referenceNumber: 'TRF-105',
            userId: $this->user->id
        );
    }

    /**
     * Test 6: Cross-company destination warehouse is rejected.
     */
    public function test_cross_company_destination_warehouse_rejected(): void
    {
        $otherCompany = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Other Company 2',
            'code' => 'OTHER-02',
            'country' => 'Bangladesh',
        ]);

        $otherWarehouse = Warehouse::create([
            'company_id' => $otherCompany->id,
            'name' => 'Other Warehouse 2',
            'code' => 'OTH-WH2',
        ]);

        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage('Destination warehouse does not belong to the specified company.');

        $this->service->transferStock(
            companyId: $this->company->id,
            sourceWarehouseId: $this->warehouseA->id,
            destinationWarehouseId: $otherWarehouse->id,
            productVariantId: $this->variant->id,
            quantity: 10.0,
            referenceType: 'TransferOrder',
            referenceId: 106,
            referenceNumber: 'TRF-106',
            userId: $this->user->id
        );
    }

    /**
     * Test 7: Cross-company stock batch is rejected.
     */
    public function test_cross_company_stock_batch_rejected(): void
    {
        $otherCompany = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Other Company 3',
            'code' => 'OTHER-03',
            'country' => 'Bangladesh',
        ]);

        $otherProduct = Product::create([
            'company_id' => $otherCompany->id,
            'name' => 'Other Product',
            'product_type' => 'simple',
            'status' => 'active',
        ]);

        $otherVariant = ProductVariant::create([
            'product_id' => $otherProduct->id,
            'sku' => 'OTH-SKU',
            'variant_name' => 'Standard',
            'status' => 'active',
        ]);

        $otherBatch = StockBatch::create([
            'company_id' => $otherCompany->id,
            'product_id' => $otherProduct->id,
            'variant_id' => $otherVariant->id,
            'batch_no' => 'OTHER-BATCH',
            'unit_cost' => 50.0,
            'status' => 'ACTIVE',
        ]);

        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage('Stock batch does not belong to the specified company.');

        $this->service->transferStock(
            companyId: $this->company->id,
            sourceWarehouseId: $this->warehouseA->id,
            destinationWarehouseId: $this->warehouseB->id,
            productVariantId: $this->variant->id,
            quantity: 10.0,
            referenceType: 'TransferOrder',
            referenceId: 107,
            referenceNumber: 'TRF-107',
            stockBatchId: $otherBatch->id,
            userId: $this->user->id
        );
    }

    /**
     * Test 8: Batch variant mismatch is rejected.
     */
    public function test_batch_variant_mismatch_rejected(): void
    {
        $product2 = Product::create([
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'name' => 'Second Product',
            'product_type' => 'simple',
            'status' => 'active',
        ]);

        $variant2 = ProductVariant::create([
            'product_id' => $product2->id,
            'sku' => 'LAPTOP-V2',
            'variant_name' => 'Pro Edition',
            'status' => 'active',
        ]);

        $batchV2 = StockBatch::create([
            'company_id' => $this->company->id,
            'product_id' => $product2->id,
            'variant_id' => $variant2->id,
            'batch_no' => 'BATCH-V2',
            'unit_cost' => 120.0,
            'status' => 'ACTIVE',
        ]);

        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage('Stock batch does not match the product variant.');

        $this->service->transferStock(
            companyId: $this->company->id,
            sourceWarehouseId: $this->warehouseA->id,
            destinationWarehouseId: $this->warehouseB->id,
            productVariantId: $this->variant->id, // Passing variant1 with batchV2
            quantity: 10.0,
            referenceType: 'TransferOrder',
            referenceId: 108,
            referenceNumber: 'TRF-108',
            stockBatchId: $batchV2->id,
            userId: $this->user->id
        );
    }

    /**
     * Test 9: Duplicate transfer idempotency returns existing movements without re-deducting.
     */
    public function test_duplicate_transfer_idempotency_returns_existing_movements(): void
    {
        $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 100.0,
            unitCost: 100.0,
            referenceType: 'Initial',
            referenceId: 9,
            referenceNumber: 'INIT-009',
            userId: $this->user->id
        );

        $res1 = $this->service->transferStock(
            companyId: $this->company->id,
            sourceWarehouseId: $this->warehouseA->id,
            destinationWarehouseId: $this->warehouseB->id,
            productVariantId: $this->variant->id,
            quantity: 30.0,
            referenceType: 'TransferOrder',
            referenceId: 999,
            referenceNumber: 'TRF-999',
            userId: $this->user->id
        );

        $invA1 = Inventory::where('warehouse_id', $this->warehouseA->id)->first();
        $this->assertEquals(70.0, (float) $invA1->quantity);

        // Repeat transfer call with identical non-zero reference
        $res2 = $this->service->transferStock(
            companyId: $this->company->id,
            sourceWarehouseId: $this->warehouseA->id,
            destinationWarehouseId: $this->warehouseB->id,
            productVariantId: $this->variant->id,
            quantity: 30.0,
            referenceType: 'TransferOrder',
            referenceId: 999,
            referenceNumber: 'TRF-999',
            userId: $this->user->id
        );

        $this->assertEquals($res1['transfer_out']->id, $res2['transfer_out']->id);
        $this->assertEquals($res1['transfer_in']->id, $res2['transfer_in']->id);

        $invA2 = Inventory::where('warehouse_id', $this->warehouseA->id)->first();
        $this->assertEquals(70.0, (float) $invA2->quantity); // Not decremented again!
    }

    /**
     * Test 10: Complete rollback on transfer failure.
     */
    public function test_transfer_rolls_back_completely_on_destination_failure(): void
    {
        $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 50.0,
            unitCost: 100.0,
            referenceType: 'Initial',
            referenceId: 10,
            referenceNumber: 'INIT-010',
            userId: $this->user->id
        );

        $invalidLoc = StorageLocation::create([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouseB->id,
            'code' => 'INACTIVE-LOC',
            'name' => 'Inactive Loc',
            'is_active' => false,
        ]);

        try {
            $this->service->transferStock(
                companyId: $this->company->id,
                sourceWarehouseId: $this->warehouseA->id,
                destinationWarehouseId: $this->warehouseB->id,
                productVariantId: $this->variant->id,
                quantity: 20.0,
                referenceType: 'TransferOrder',
                referenceId: 110,
                referenceNumber: 'TRF-110',
                destinationStorageLocationId: $invalidLoc->id,
                userId: $this->user->id
            );
            $this->fail('Expected ConflictHttpException was not thrown.');
        } catch (ConflictHttpException $e) {
            $this->assertStringContainsString('inactive', $e->getMessage());
        }

        // Source inventory must remain 50
        $invA = Inventory::where('warehouse_id', $this->warehouseA->id)->first();
        $this->assertEquals(50.0, (float) $invA->quantity);

        // No movements created
        $this->assertEquals(0, StockMovement::where('reference_number', 'TRF-110')->count());
    }

    /**
     * Test 11: Correct movement types TRANSFER_OUT and TRANSFER_IN created with details.
     */
    public function test_stock_movement_records_are_created_with_correct_transfer_types(): void
    {
        $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 40.0,
            unitCost: 65.0,
            referenceType: 'Initial',
            referenceId: 11,
            referenceNumber: 'INIT-011',
            userId: $this->user->id
        );

        $result = $this->service->transferStock(
            companyId: $this->company->id,
            sourceWarehouseId: $this->warehouseA->id,
            destinationWarehouseId: $this->warehouseB->id,
            productVariantId: $this->variant->id,
            quantity: 15.0,
            referenceType: 'TransferOrder',
            referenceId: 111,
            referenceNumber: 'TRF-111',
            reason: 'Store requisition',
            notes: 'Handled with care',
            userId: $this->user->id
        );

        $out = $result['transfer_out'];
        $in = $result['transfer_in'];

        $this->assertEquals('TRANSFER_OUT', $out->movement_type);
        $this->assertEquals($this->warehouseA->id, $out->warehouse_id);
        $this->assertEquals(15.0, (float) $out->quantity);
        $this->assertEquals(65.0, (float) $out->unit_cost);
        $this->assertEquals('Store requisition', $out->reason);

        $this->assertEquals('TRANSFER_IN', $in->movement_type);
        $this->assertEquals($this->warehouseB->id, $in->warehouse_id);
        $this->assertEquals(15.0, (float) $in->quantity);
        $this->assertEquals(65.0, (float) $in->unit_cost);
    }

    /**
     * Test 12: Audit log created for transfer.
     */
    public function test_audit_log_created_for_transfer(): void
    {
        $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 30.0,
            unitCost: 100.0,
            referenceType: 'Initial',
            referenceId: 12,
            referenceNumber: 'INIT-012',
            userId: $this->user->id
        );

        $this->service->transferStock(
            companyId: $this->company->id,
            sourceWarehouseId: $this->warehouseA->id,
            destinationWarehouseId: $this->warehouseB->id,
            productVariantId: $this->variant->id,
            quantity: 10.0,
            referenceType: 'TransferOrder',
            referenceId: 112,
            referenceNumber: 'TRF-112',
            userId: $this->user->id
        );

        $this->assertTrue(
            AuditLog::where('event', 'STOCK_TRANSFERRED')
                ->where('company_id', $this->company->id)
                ->exists()
        );
    }

    /**
     * Test 13: Destination moving average cost is correctly calculated using source cost.
     */
    public function test_destination_moving_average_cost_calculated_correctly(): void
    {
        // Warehouse A has 20 units @ 100.0
        $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 20.0,
            unitCost: 100.0,
            referenceType: 'StockIn',
            referenceId: 131,
            referenceNumber: 'IN-131',
            userId: $this->user->id
        );

        // Warehouse B already has 10 units @ 50.0 (total value = 500)
        $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseB->id,
            productVariantId: $this->variant->id,
            quantity: 10.0,
            unitCost: 50.0,
            referenceType: 'StockIn',
            referenceId: 132,
            referenceNumber: 'IN-132',
            userId: $this->user->id
        );

        // Transfer 10 units from A to B (source cost is 100.0)
        $this->service->transferStock(
            companyId: $this->company->id,
            sourceWarehouseId: $this->warehouseA->id,
            destinationWarehouseId: $this->warehouseB->id,
            productVariantId: $this->variant->id,
            quantity: 10.0,
            referenceType: 'TransferOrder',
            referenceId: 113,
            referenceNumber: 'TRF-113',
            userId: $this->user->id
        );

        $invB = Inventory::where('warehouse_id', $this->warehouseB->id)->first();

        // New qty = 10 + 10 = 20
        // New total value = 500 + (10 * 100) = 1500
        // New avg cost = 1500 / 20 = 75.0
        $this->assertEquals(20.0, (float) $invB->quantity);
        $this->assertEquals(75.0, (float) $invB->average_cost);
        $this->assertEquals(1500.0, (float) $invB->total_value);
    }

    /**
     * Test 14: Concurrent reverse transfers acquire locks in numerical order safely.
     */
    public function test_deadlock_free_concurrent_reverse_transfers(): void
    {
        // Setup initial stock in both warehouses
        $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 50.0,
            unitCost: 100.0,
            referenceType: 'Initial',
            referenceId: 141,
            referenceNumber: 'INIT-141',
            userId: $this->user->id
        );

        $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseB->id,
            productVariantId: $this->variant->id,
            quantity: 50.0,
            unitCost: 100.0,
            referenceType: 'Initial',
            referenceId: 142,
            referenceNumber: 'INIT-142',
            userId: $this->user->id
        );

        // Transfer A -> B
        $this->service->transferStock(
            companyId: $this->company->id,
            sourceWarehouseId: $this->warehouseA->id,
            destinationWarehouseId: $this->warehouseB->id,
            productVariantId: $this->variant->id,
            quantity: 20.0,
            referenceType: 'TransferOrder',
            referenceId: 1141,
            referenceNumber: 'TRF-A-TO-B',
            userId: $this->user->id
        );

        // Reverse transfer B -> A
        $this->service->transferStock(
            companyId: $this->company->id,
            sourceWarehouseId: $this->warehouseB->id,
            destinationWarehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 10.0,
            referenceType: 'TransferOrder',
            referenceId: 1142,
            referenceNumber: 'TRF-B-TO-A',
            userId: $this->user->id
        );

        $invA = Inventory::where('warehouse_id', $this->warehouseA->id)->first();
        $invB = Inventory::where('warehouse_id', $this->warehouseB->id)->first();

        // Warehouse A: 50 - 20 + 10 = 40
        // Warehouse B: 50 + 20 - 10 = 60
        $this->assertEquals(40.0, (float) $invA->quantity);
        $this->assertEquals(60.0, (float) $invB->quantity);
    }

    // ==========================================
    // ADJUSTMENT TESTS (15 - 26)
    // ==========================================

    /**
     * Test 15: Adjustment IN increases quantity and recalculates moving average cost.
     */
    public function test_successful_adjustment_in_increases_quantity_and_updates_moving_average(): void
    {
        // Initial stock: 10 units @ 50.0 (value = 500)
        $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 10.0,
            unitCost: 50.0,
            referenceType: 'Initial',
            referenceId: 15,
            referenceNumber: 'INIT-015',
            userId: $this->user->id
        );

        // Adjustment IN: 10 units @ 70.0
        $movement = $this->service->adjustmentIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 10.0,
            unitCost: 70.0,
            referenceType: 'PhysicalCount',
            referenceId: 215,
            referenceNumber: 'ADJ-IN-215',
            reason: 'Found extra inventory during physical count',
            userId: $this->user->id
        );

        $this->assertEquals('ADJUSTMENT_IN', $movement->movement_type);

        $inv = Inventory::where('warehouse_id', $this->warehouseA->id)->first();
        // New quantity: 20
        // New avg cost: (500 + 700) / 20 = 60.0
        $this->assertEquals(20.0, (float) $inv->quantity);
        $this->assertEquals(60.0, (float) $inv->average_cost);
        $this->assertEquals(1200.0, (float) $inv->total_value);
    }

    /**
     * Test 16: Adjustment OUT decreases quantity while preserving unit moving average cost.
     */
    public function test_successful_adjustment_out_decreases_quantity(): void
    {
        // Initial stock: 50 units @ 60.0
        $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 50.0,
            unitCost: 60.0,
            referenceType: 'Initial',
            referenceId: 16,
            referenceNumber: 'INIT-016',
            userId: $this->user->id
        );

        $movement = $this->service->adjustmentOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 20.0,
            referenceType: 'PhysicalCount',
            referenceId: 216,
            referenceNumber: 'ADJ-OUT-216',
            reason: 'Shrinkage discovered during audit',
            userId: $this->user->id
        );

        $this->assertEquals('ADJUSTMENT_OUT', $movement->movement_type);

        $inv = Inventory::where('warehouse_id', $this->warehouseA->id)->first();
        // Remaining qty: 30
        // Avg cost remains: 60.0
        $this->assertEquals(30.0, (float) $inv->quantity);
        $this->assertEquals(60.0, (float) $inv->average_cost);
        $this->assertEquals(1800.0, (float) $inv->total_value);
    }

    /**
     * Test 17: Adjustment OUT rejects insufficient stock (never creates negative inventory).
     */
    public function test_adjustment_out_rejects_insufficient_stock(): void
    {
        $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 10.0,
            unitCost: 50.0,
            referenceType: 'Initial',
            referenceId: 17,
            referenceNumber: 'INIT-017',
            userId: $this->user->id
        );

        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage('Insufficient stock in warehouse');

        $this->service->adjustmentOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 15.0, // Available is only 10
            referenceType: 'PhysicalCount',
            referenceId: 217,
            referenceNumber: 'ADJ-OUT-217',
            reason: 'Discrepancy write-off',
            userId: $this->user->id
        );
    }

    /**
     * Test 18: Negative or zero quantity is rejected on adjustments.
     */
    public function test_negative_or_zero_quantity_rejected_on_adjustment(): void
    {
        try {
            $this->service->adjustmentIn(
                companyId: $this->company->id,
                warehouseId: $this->warehouseA->id,
                productVariantId: $this->variant->id,
                quantity: 0.0,
                unitCost: 50.0,
                referenceType: 'Test',
                referenceId: 181,
                referenceNumber: 'REF-181',
                reason: 'Testing zero qty',
                userId: $this->user->id
            );
            $this->fail('Expected ConflictHttpException for zero quantity on adjustmentIn.');
        } catch (ConflictHttpException $e) {
            $this->assertStringContainsString('greater than zero', $e->getMessage());
        }

        try {
            $this->service->adjustmentOut(
                companyId: $this->company->id,
                warehouseId: $this->warehouseA->id,
                productVariantId: $this->variant->id,
                quantity: -5.0,
                referenceType: 'Test',
                referenceId: 182,
                referenceNumber: 'REF-182',
                reason: 'Testing negative qty',
                userId: $this->user->id
            );
            $this->fail('Expected ConflictHttpException for negative quantity on adjustmentOut.');
        } catch (ConflictHttpException $e) {
            $this->assertStringContainsString('greater than zero', $e->getMessage());
        }
    }

    /**
     * Test 19: Cross-company warehouse rejected on adjustment.
     */
    public function test_cross_company_warehouse_rejected_on_adjustment(): void
    {
        $otherCompany = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Foreign Corp',
            'code' => 'FC-001',
            'country' => 'Bangladesh',
        ]);

        $otherWarehouse = Warehouse::create([
            'company_id' => $otherCompany->id,
            'name' => 'Foreign Warehouse',
            'code' => 'FWH-01',
        ]);

        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage('Warehouse does not belong to the specified company.');

        $this->service->adjustmentIn(
            companyId: $this->company->id,
            warehouseId: $otherWarehouse->id,
            productVariantId: $this->variant->id,
            quantity: 10.0,
            unitCost: 50.0,
            referenceType: 'Test',
            referenceId: 219,
            referenceNumber: 'ADJ-219',
            reason: 'Test cross company',
            userId: $this->user->id
        );
    }

    /**
     * Test 20: Adjustment with batch and location correctly updates inventory batch.
     */
    public function test_adjustment_with_batch_and_location_updates_inventory_batch(): void
    {
        $loc = StorageLocation::create([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouseA->id,
            'code' => 'LOC-ADJ-20',
            'name' => 'Aisle 20',
            'is_active' => true,
        ]);

        // 1. Adjustment IN with new batch number
        $this->service->adjustmentIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 25.0,
            unitCost: 80.0,
            referenceType: 'BatchAdjustment',
            referenceId: 220,
            referenceNumber: 'ADJ-BATCH-220',
            reason: 'Initial batch count',
            userId: $this->user->id,
            batchNumber: 'BATCH-2026-X',
            storageLocationId: $loc->id
        );

        $batch = StockBatch::where('batch_no', 'BATCH-2026-X')->first();
        $this->assertNotNull($batch);

        $inv = Inventory::where('warehouse_id', $this->warehouseA->id)->first();
        $invBatch = InventoryBatch::where('inventory_id', $inv->id)
            ->where('stock_batch_id', $batch->id)
            ->first();

        $this->assertNotNull($invBatch);
        $this->assertEquals(25.0, (float) $invBatch->quantity);

        // 2. Adjustment OUT from that batch
        $this->service->adjustmentOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 10.0,
            referenceType: 'BatchAdjustment',
            referenceId: 221,
            referenceNumber: 'ADJ-BATCH-221',
            reason: 'Batch sample test removal',
            userId: $this->user->id,
            stockBatchId: $batch->id,
            storageLocationId: $loc->id
        );

        $this->assertEquals(15.0, (float) $invBatch->fresh()->quantity);
    }

    /**
     * Test 21: Batch variant mismatch rejected on adjustment.
     */
    public function test_batch_variant_mismatch_rejected_on_adjustment(): void
    {
        $product2 = Product::create([
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'name' => 'Different Product',
            'product_type' => 'simple',
            'status' => 'active',
        ]);

        $variant2 = ProductVariant::create([
            'product_id' => $product2->id,
            'sku' => 'LAPTOP-DIFF-VAR',
            'variant_name' => 'Gaming Edition',
            'status' => 'active',
        ]);

        $batchForV2 = StockBatch::create([
            'company_id' => $this->company->id,
            'product_id' => $product2->id,
            'variant_id' => $variant2->id,
            'batch_no' => 'BATCH-DIFF-V2',
            'unit_cost' => 200.0,
            'status' => 'ACTIVE',
        ]);

        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage('Stock batch does not match the product variant.');

        $this->service->adjustmentIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 5.0,
            unitCost: 100.0,
            referenceType: 'MismatchTest',
            referenceId: 221,
            referenceNumber: 'ADJ-221',
            reason: 'Mismatch check',
            userId: $this->user->id,
            stockBatchId: $batchForV2->id
        );
    }

    /**
     * Test 22: Duplicate adjustment idempotency prevents multiple applications.
     */
    public function test_duplicate_adjustment_idempotency(): void
    {
        $m1 = $this->service->adjustmentIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 30.0,
            unitCost: 50.0,
            referenceType: 'AnnualAudit',
            referenceId: 222,
            referenceNumber: 'AUDIT-222',
            reason: 'Audit surplus',
            userId: $this->user->id
        );

        $m2 = $this->service->adjustmentIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 30.0,
            unitCost: 50.0,
            referenceType: 'AnnualAudit',
            referenceId: 222,
            referenceNumber: 'AUDIT-222',
            reason: 'Audit surplus',
            userId: $this->user->id
        );

        $this->assertEquals($m1->id, $m2->id);

        $inv = Inventory::where('warehouse_id', $this->warehouseA->id)->first();
        $this->assertEquals(30.0, (float) $inv->quantity); // Not 60!
    }

    /**
     * Test 23: Complete rollback on adjustment error.
     */
    public function test_adjustment_rolls_back_on_error(): void
    {
        $this->service->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 20.0,
            unitCost: 100.0,
            referenceType: 'Initial',
            referenceId: 23,
            referenceNumber: 'INIT-023',
            userId: $this->user->id
        );

        $invalidLoc = StorageLocation::create([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouseA->id,
            'code' => 'INACT-LOC-23',
            'name' => 'Inactive Location 23',
            'is_active' => false,
        ]);

        try {
            $this->service->adjustmentOut(
                companyId: $this->company->id,
                warehouseId: $this->warehouseA->id,
                productVariantId: $this->variant->id,
                quantity: 10.0,
                referenceType: 'Test',
                referenceId: 223,
                referenceNumber: 'ADJ-223',
                reason: 'Test rollback',
                userId: $this->user->id,
                storageLocationId: $invalidLoc->id
            );
            $this->fail('Expected ConflictHttpException was not thrown.');
        } catch (ConflictHttpException $e) {
            $this->assertStringContainsString('inactive', $e->getMessage());
        }

        $inv = Inventory::where('warehouse_id', $this->warehouseA->id)->first();
        $this->assertEquals(20.0, (float) $inv->quantity);
        $this->assertEquals(0, StockMovement::where('reference_number', 'ADJ-223')->count());
    }

    /**
     * Test 24: Adjustment movements created with correct types and tracking values.
     */
    public function test_adjustment_movements_created_with_correct_types(): void
    {
        $in = $this->service->adjustmentIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 15.0,
            unitCost: 90.0,
            referenceType: 'Audit',
            referenceId: 224,
            referenceNumber: 'ADJ-224-IN',
            reason: 'Positive calibration',
            userId: $this->user->id
        );

        $this->assertEquals('ADJUSTMENT_IN', $in->movement_type);
        $this->assertEquals(0.0, (float) $in->quantity_before);
        $this->assertEquals(15.0, (float) $in->quantity_after);

        $out = $this->service->adjustmentOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 5.0,
            referenceType: 'Audit',
            referenceId: 225,
            referenceNumber: 'ADJ-225-OUT',
            reason: 'Negative calibration',
            userId: $this->user->id
        );

        $this->assertEquals('ADJUSTMENT_OUT', $out->movement_type);
        $this->assertEquals(15.0, (float) $out->quantity_before);
        $this->assertEquals(10.0, (float) $out->quantity_after);
    }

    /**
     * Test 25: Audit log created for adjustments.
     */
    public function test_audit_log_created_for_adjustments(): void
    {
        $this->service->adjustmentIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 10.0,
            unitCost: 100.0,
            referenceType: 'Audit',
            referenceId: 226,
            referenceNumber: 'ADJ-226',
            reason: 'Audit log verification',
            userId: $this->user->id
        );

        $this->assertTrue(
            AuditLog::where('event', 'STOCK_ADJUSTMENT_IN')
                ->where('company_id', $this->company->id)
                ->exists()
        );

        $this->service->adjustmentOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 5.0,
            referenceType: 'Audit',
            referenceId: 227,
            referenceNumber: 'ADJ-227',
            reason: 'Audit log verification out',
            userId: $this->user->id
        );

        $this->assertTrue(
            AuditLog::where('event', 'STOCK_ADJUSTMENT_OUT')
                ->where('company_id', $this->company->id)
                ->exists()
        );
    }

    /**
     * Test 26: Missing or blank reason is rejected on adjustments.
     */
    public function test_missing_reason_rejected_on_adjustment(): void
    {
        try {
            $this->service->adjustmentIn(
                companyId: $this->company->id,
                warehouseId: $this->warehouseA->id,
                productVariantId: $this->variant->id,
                quantity: 10.0,
                unitCost: 50.0,
                referenceType: 'Test',
                referenceId: 228,
                referenceNumber: 'REF-228',
                reason: '   ', // Blank whitespace
                userId: $this->user->id
            );
            $this->fail('Expected ConflictHttpException for blank reason on adjustmentIn.');
        } catch (ConflictHttpException $e) {
            $this->assertStringContainsString('mandatory', $e->getMessage());
        }

        try {
            $this->service->adjustmentOut(
                companyId: $this->company->id,
                warehouseId: $this->warehouseA->id,
                productVariantId: $this->variant->id,
                quantity: 5.0,
                referenceType: 'Test',
                referenceId: 229,
                referenceNumber: 'REF-229',
                reason: '', // Empty
                userId: $this->user->id
            );
            $this->fail('Expected ConflictHttpException for empty reason on adjustmentOut.');
        } catch (ConflictHttpException $e) {
            $this->assertStringContainsString('mandatory', $e->getMessage());
        }
    }
}
