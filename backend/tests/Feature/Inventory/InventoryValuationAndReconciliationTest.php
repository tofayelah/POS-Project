<?php

namespace Tests\Feature\Inventory;

use App\Models\AuditLog;
use App\Models\Barcode;
use App\Models\Category;
use App\Models\Company;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryValuationAndReconciliationTest extends TestCase
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
            'name' => 'Valuation Corp',
            'email' => 'val@corp.com',
            'currency' => 'USD',
        ]);

        $this->user = User::factory()->create([
            'company_id' => $this->company->id,
        ]);
        $role = \App\Models\Role::where('name', 'Super Admin')->first();
        $this->user->roles()->attach($role->id);

        $this->warehouse = Warehouse::create([
            'company_id' => $this->company->id,
            'name' => 'Main Val Warehouse',
            'code' => 'WH-VAL',
            'status' => 'active',
        ]);

        $category = Category::create([
            'company_id' => $this->company->id,
            'name' => 'Electronics',
        ]);

        $unit = Unit::create([
            'company_id' => $this->company->id,
            'name' => 'Piece',
            'short_code' => 'PCS',
        ]);

        $this->product = Product::create([
            'company_id' => $this->company->id,
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'name' => 'Smart Watch',
            'product_type' => 'simple',
            'status' => 'active',
            'reorder_level' => 15,
            'reorder_quantity' => 20,
        ]);

        $this->variant = ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'sku' => 'SKU-WATCH-01',
            'variant_name' => 'Black',
            'cost_price' => 50,
            'selling_price' => 120,
            'status' => 'active',
        ]);

        $this->inventoryService = app(InventoryService::class);

        // Add 10 units at cost 50
        $this->inventoryService->addOpeningStock([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 10,
            'unit_cost' => 50,
        ], $this->user->id);
    }

    public function test_inventory_valuation_report()
    {
        $this->actingAs($this->user);

        $response = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->getJson('/api/v1/reports/inventory/valuation');

        $response->assertStatus(200);
        $summary = $response->json('summary');
        $this->assertEquals(1, $summary['total_items']);
        $this->assertEquals(10, $summary['total_units']);
        $this->assertEquals(500, $summary['total_cost_value']); // 10 * 50
        $this->assertEquals(1200, $summary['total_retail_value']); // 10 * 120
        $this->assertEquals(700, $summary['total_potential_profit']); // 1200 - 500
    }

    public function test_inventory_reconciliation_healthy_and_audit_logging()
    {
        $this->actingAs($this->user);

        $response = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->getJson('/api/v1/reports/inventory/reconciliation');

        $response->assertStatus(200);
        $this->assertEquals('HEALTHY', $response->json('data.status'));
        $this->assertEquals(0, $response->json('data.discrepancies_count'));

        // Verify AuditLog was recorded
        $log = AuditLog::where('company_id', $this->company->id)
            ->where('event', 'INVENTORY_RECONCILIATION_RUN')
            ->first();
        $this->assertNotNull($log);
    }

    public function test_inventory_reconciliation_detects_manual_balance_discrepancy()
    {
        $this->actingAs($this->user);

        // Artificially manipulate inventory balance directly without stock movement
        $inv = Inventory::where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant->id)
            ->first();
        $inv->update(['quantity' => 999]);

        $response = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->getJson('/api/v1/reports/inventory/reconciliation');

        $response->assertStatus(200);
        $this->assertEquals('DISCREPANCIES_FOUND', $response->json('data.status'));
        $this->assertGreaterThan(0, $response->json('data.discrepancies_count'));
    }

    public function test_barcode_lookup_endpoint()
    {
        $this->actingAs($this->user);

        // Create barcode record
        Barcode::create([
            'company_id' => $this->company->id,
            'product_variant_id' => $this->variant->id,
            'barcode' => '8901234567890',
            'is_primary' => true,
            'status' => 'active',
        ]);

        // 1. Lookup by Barcode model code
        $res1 = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->getJson('/api/v1/inventory/barcode-lookup/8901234567890');

        $res1->assertStatus(200);
        $this->assertEquals('SKU-WATCH-01', $res1->json('data.variant.sku'));
        $this->assertEquals(10, $res1->json('data.total_on_hand'));

        // 2. Lookup by SKU fallback
        $res2 = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->getJson('/api/v1/inventory/barcode-lookup/SKU-WATCH-01');

        $res2->assertStatus(200);
        $this->assertEquals('SKU-WATCH-01', $res2->json('data.variant.sku'));

        // 3. Unknown barcode returns 404
        $res3 = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->getJson('/api/v1/inventory/barcode-lookup/NON_EXISTENT_999');

        $res3->assertStatus(404);
    }

    public function test_reorder_alerts_endpoint()
    {
        $this->actingAs($this->user);

        // On-hand is 10, product reorder_level is 15 -> should trigger alert
        $response = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->getJson('/api/v1/inventory/reorder-alerts');

        $response->assertStatus(200);
        $this->assertGreaterThan(0, $response->json('count'));
        $item = $response->json('data.0');
        $this->assertEquals('SKU-WATCH-01', $item['sku']);
        $this->assertEquals(10, $item['on_hand_quantity']);
        $this->assertEquals(15, $item['reorder_point']);
    }
}
