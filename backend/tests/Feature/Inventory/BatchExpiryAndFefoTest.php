<?php

namespace Tests\Feature\Inventory;

use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Company;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockBatch;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Tests\TestCase;

class BatchExpiryAndFefoTest extends TestCase
{
    use RefreshDatabase;

    protected Company $company;
    protected User $user;
    protected Warehouse $warehouse;
    protected Product $product;
    protected ProductVariant $variant;
    protected InventoryService $inventoryService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
        $this->seed(\Database\Seeders\InventoryPermissionsSeeder::class);

        $this->company = Company::create([
            'name' => 'Batch Test Corp',
            'email' => 'batch@corp.com',
            'currency' => 'USD',
        ]);

        $this->user = User::factory()->create([
            'company_id' => $this->company->id,
        ]);
        $role = \App\Models\Role::where('name', 'Super Admin')->first();
        $this->user->roles()->attach($role->id);

        $this->warehouse = Warehouse::create([
            'company_id' => $this->company->id,
            'name' => 'Batch Warehouse',
            'code' => 'WH-BATCH',
            'status' => 'active',
        ]);

        $category = Category::create([
            'company_id' => $this->company->id,
            'name' => 'Pharma',
        ]);

        $unit = Unit::create([
            'company_id' => $this->company->id,
            'name' => 'Box',
            'short_code' => 'BOX',
        ]);

        $this->product = Product::create([
            'company_id' => $this->company->id,
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'name' => 'Medicine A',
            'product_type' => 'simple',
            'status' => 'active',
        ]);

        $this->variant = ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'sku' => 'SKU-MED-001',
            'variant_name' => '100mg',
            'cost_price' => 10,
            'selling_price' => 25,
            'status' => 'active',
        ]);

        $this->inventoryService = app(InventoryService::class);
    }

    public function test_fefo_operational_consumption_consumes_earliest_expiring_batch_first()
    {
        // Batch 1: expires in 10 days, qty = 20
        $batch1 = StockBatch::create([
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'variant_id' => $this->variant->id,
            'batch_no' => 'BATCH-EXP-EARLY',
            'mfg_date' => now()->subDays(20),
            'exp_date' => now()->addDays(10),
            'unit_cost' => 10,
            'status' => 'ACTIVE',
        ]);

        // Batch 2: expires in 60 days, qty = 30
        $batch2 = StockBatch::create([
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'variant_id' => $this->variant->id,
            'batch_no' => 'BATCH-EXP-LATE',
            'mfg_date' => now()->subDays(5),
            'exp_date' => now()->addDays(60),
            'unit_cost' => 10,
            'status' => 'ACTIVE',
        ]);

        // Stock in both batches
        $this->inventoryService->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 20,
            unitCost: 10,
            referenceType: 'MANUAL',
            referenceId: 1,
            referenceNumber: 'IN-001',
            userId: $this->user->id,
            stockBatchId: $batch1->id
        );

        $this->inventoryService->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 30,
            unitCost: 10,
            referenceType: 'MANUAL',
            referenceId: 2,
            referenceNumber: 'IN-002',
            userId: $this->user->id,
            stockBatchId: $batch2->id
        );

        $this->assertEquals(50, Inventory::where('warehouse_id', $this->warehouse->id)->first()->quantity);

        // Stock out 25 units without specifying a batch -> FEFO should consume all 20 of batch1 and 5 of batch2
        $this->inventoryService->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 25,
            referenceType: 'SALE',
            referenceId: 101,
            referenceNumber: 'SALE-001',
            userId: $this->user->id
        );

        // Verify remaining batch quantities
        $ib1 = InventoryBatch::where('stock_batch_id', $batch1->id)->first();
        $this->assertEquals(0, (float) $ib1->quantity);

        $ib2 = InventoryBatch::where('stock_batch_id', $batch2->id)->first();
        $this->assertEquals(25, (float) $ib2->quantity);

        // Total inventory should be 25
        $inv = Inventory::where('warehouse_id', $this->warehouse->id)->first();
        $this->assertEquals(25, (float) $inv->quantity);
    }

    public function test_cannot_stock_out_blocked_batch()
    {
        $batch = StockBatch::create([
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'variant_id' => $this->variant->id,
            'batch_no' => 'BATCH-BLOCKED',
            'exp_date' => now()->addDays(90),
            'status' => 'ACTIVE',
        ]);

        $this->inventoryService->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 10,
            unitCost: 10,
            referenceType: 'MANUAL',
            referenceId: 201,
            referenceNumber: 'IN-201',
            userId: $this->user->id,
            stockBatchId: $batch->id
        );

        $batch->update(['status' => 'BLOCKED']);

        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage('BLOCKED');

        $this->inventoryService->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 5,
            referenceType: 'SALE',
            referenceId: 102,
            referenceNumber: 'SALE-002',
            userId: $this->user->id,
            stockBatchId: $batch->id
        );
    }

    public function test_cannot_stock_out_expired_batch()
    {
        $batch = StockBatch::create([
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'variant_id' => $this->variant->id,
            'batch_no' => 'BATCH-EXPIRED',
            'exp_date' => now()->addDay(),
            'status' => 'ACTIVE',
        ]);

        $this->inventoryService->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 10,
            unitCost: 10,
            referenceType: 'MANUAL',
            referenceId: 202,
            referenceNumber: 'IN-202',
            userId: $this->user->id,
            stockBatchId: $batch->id
        );

        $batch->update(['exp_date' => now()->subDay()]);

        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage('EXPIRED');

        $this->inventoryService->stockOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            quantity: 5,
            referenceType: 'SALE',
            referenceId: 103,
            referenceNumber: 'SALE-003',
            userId: $this->user->id,
            stockBatchId: $batch->id
        );
    }

    public function test_batch_status_toggle_and_audit_logging()
    {
        $this->actingAs($this->user);

        $batch = StockBatch::create([
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'variant_id' => $this->variant->id,
            'batch_no' => 'BATCH-TOGGLE',
            'status' => 'ACTIVE',
        ]);

        $response = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->postJson("/api/v1/stock-batches/{$batch->id}/status", [
                'status' => 'BLOCKED',
                'reason' => 'Quality quarantine',
            ]);

        $response->assertStatus(200);
        $this->assertEquals('BLOCKED', $response->json('data.status'));

        // Verify AuditLog
        $log = AuditLog::where('company_id', $this->company->id)
            ->where('event', 'BATCH_BLOCKED')
            ->where('auditable_id', $batch->id)
            ->first();

        $this->assertNotNull($log);
        $this->assertEquals('BLOCKED', $log->new_values['status']);
    }

    public function test_expiry_report_endpoint()
    {
        $this->actingAs($this->user);

        // 1 expired batch
        StockBatch::create([
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'variant_id' => $this->variant->id,
            'batch_no' => 'BATCH-REP-EXP',
            'exp_date' => now()->subDays(5),
            'status' => 'ACTIVE',
        ]);

        // 1 near expiry batch (15 days)
        StockBatch::create([
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'variant_id' => $this->variant->id,
            'batch_no' => 'BATCH-REP-NEAR',
            'exp_date' => now()->addDays(15),
            'status' => 'ACTIVE',
        ]);

        // 1 safe batch (120 days)
        StockBatch::create([
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'variant_id' => $this->variant->id,
            'batch_no' => 'BATCH-REP-SAFE',
            'exp_date' => now()->addDays(120),
            'status' => 'ACTIVE',
        ]);

        $response = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->getJson('/api/v1/stock-batches/expiry-report?days=30');

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('data.summary.expired_count'));
        $this->assertEquals(1, $response->json('data.summary.near_expiry_count'));
    }
}
