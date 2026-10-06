<?php

namespace Tests\Feature\Procurement;

use App\Models\Company;
use App\Models\GoodsReceipt;
use App\Models\GoodsReceiptItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Role;
use App\Models\Supplier;
use App\Models\SupplierLedger;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\SupplierPerformanceService;
use App\Services\SupplierQualificationService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SupplierQualificationAndPerformanceTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Company $company;
    protected Supplier $supplier;
    protected Warehouse $warehouse;
    protected ProductVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\ProcurementPermissionsSeeder::class);

        $this->company = Company::factory()->create();
        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);

        $adminRole = Role::firstOrCreate(['name' => 'Admin']);
        $this->user->roles()->attach($adminRole->id);

        $this->supplier = Supplier::create([
            'company_id' => $this->company->id,
            'supplier_code' => 'SUP-QUAL-01',
            'name' => 'Bengal Impex Ltd',
            'qualification_status' => 'QUALIFIED',
            'status' => 'ACTIVE',
            'agreed_lead_time_days' => 5,
        ]);

        $this->warehouse = Warehouse::create([
            'company_id' => $this->company->id,
            'name' => 'Dhaka Central Warehouse',
        ]);

        $product = Product::create([
            'company_id' => $this->company->id,
            'name' => 'Test Hardware',
            'type' => 'STANDARD',
        ]);

        $this->variant = ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $product->id,
            'sku' => 'TEST-HW-001',
            'cost_price' => 500,
        ]);
    }

    public function test_can_update_supplier_qualification_status_with_valid_workflow()
    {
        $response = $this->actingAs($this->user)->postJson(
            "/api/v1/suppliers/{$this->supplier->id}/qualification",
            [
                'qualification_status' => 'SUSPENDED',
                'reason' => 'Quality audit pending',
                'notes' => 'Suspended until next ISO inspection',
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $response->assertStatus(200)
                 ->assertJsonPath('data.qualification_status', 'SUSPENDED')
                 ->assertJsonPath('data.block_reason', 'Quality audit pending');

        $this->assertDatabaseHas('suppliers', [
            'id' => $this->supplier->id,
            'qualification_status' => 'SUSPENDED',
        ]);

        // Verify audit log
        $this->assertDatabaseHas('audit_logs', [
            'event' => 'SUPPLIER_QUALIFICATION_CHANGED',
            'auditable_type' => Supplier::class,
            'auditable_id' => $this->supplier->id,
        ]);
    }

    public function test_blocking_supplier_requires_reason()
    {
        $response = $this->actingAs($this->user)->postJson(
            "/api/v1/suppliers/{$this->supplier->id}/qualification",
            [
                'qualification_status' => 'BLOCKED',
                // missing reason
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $response->assertStatus(422);
    }

    public function test_can_re_qualify_supplier_sets_qualified_at_and_user()
    {
        $this->supplier->update(['qualification_status' => 'PENDING_REVIEW']);

        $response = $this->actingAs($this->user)->postJson(
            "/api/v1/suppliers/{$this->supplier->id}/qualification",
            [
                'qualification_status' => 'QUALIFIED',
                'notes' => 'Full review passed',
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $response->assertStatus(200)
                 ->assertJsonPath('data.qualification_status', 'QUALIFIED');

        $this->supplier->refresh();
        $this->assertNotNull($this->supplier->qualified_at);
        $this->assertEquals($this->user->id, $this->supplier->qualified_by);
    }

    public function test_deterministic_supplier_performance_metrics_and_zero_financial_side_effects()
    {
        // Create 2 POs
        $po1 = PurchaseOrder::create([
            'company_id' => $this->company->id,
            'supplier_id' => $this->supplier->id,
            'warehouse_id' => $this->warehouse->id,
            'po_number' => 'PO-PERF-01',
            'order_date' => Carbon::now()->subDays(10)->toDateString(),
            'expected_date' => Carbon::now()->subDays(5)->toDateString(),
            'status' => 'FULLY_RECEIVED',
            'subtotal' => 5000,
            'grand_total' => 5000,
        ]);

        $poItem1 = PurchaseOrderItem::create([
            'purchase_order_id' => $po1->id,
            'product_id' => $this->variant->product_id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 10,
            'unit_cost' => 500,
            'line_total' => 5000,
            'received_quantity' => 10,
            'pending_quantity' => 0,
        ]);

        // Create Goods Receipt on-time (delivered on subDays(6) <= expected subDays(5))
        $gr = GoodsReceipt::create([
            'company_id' => $this->company->id,
            'supplier_id' => $this->supplier->id,
            'warehouse_id' => $this->warehouse->id,
            'purchase_order_id' => $po1->id,
            'receipt_number' => 'GR-PERF-01',
            'receipt_date' => Carbon::now()->subDays(6)->toDateString(),
            'status' => 'POSTED',
        ]);

        GoodsReceiptItem::create([
            'goods_receipt_id' => $gr->id,
            'purchase_order_item_id' => $poItem1->id,
            'product_id' => $this->variant->product_id,
            'product_variant_id' => $this->variant->id,
            'received_quantity' => 10,
            'unit_cost' => 500,
            'total_cost' => 5000,
        ]);

        $response = $this->actingAs($this->user)->getJson(
            "/api/v1/suppliers/{$this->supplier->id}/performance",
            ['X-Company-ID' => $this->company->id]
        );

        $response->assertStatus(200)
                 ->assertJsonPath('data.supplier_id', $this->supplier->id)
                 ->assertJsonPath('data.metrics.on_time_delivery_rate', 100)
                 ->assertJsonPath('data.metrics.fill_rate', 100)
                 ->assertJsonPath('data.metrics.total_orders_count', 1);

        // Verify zero financial mutations occurred during performance analysis
        $this->assertEquals(0, \App\Models\JournalEntry::count());
        $this->assertEquals(0, \App\Models\StockMovement::count());
    }

    public function test_can_recalculate_and_cache_supplier_score()
    {
        $response = $this->actingAs($this->user)->postJson(
            "/api/v1/suppliers/{$this->supplier->id}/recalculate-score",
            [],
            ['X-Company-ID' => $this->company->id]
        );

        $response->assertStatus(200)
                 ->assertJsonPath('success', true);

        $this->supplier->refresh();
        $this->assertNotNull($this->supplier->score_cached);
        $this->assertNotNull($this->supplier->last_evaluated_at);
    }

    public function test_company_supplier_rankings_endpoint()
    {
        $response = $this->actingAs($this->user)->getJson(
            '/api/v1/procurement/supplier-rankings',
            ['X-Company-ID' => $this->company->id]
        );

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'success',
                     'data' => [
                         '*' => ['id', 'name', 'code', 'score', 'otd_rate', 'fill_rate', 'total_spend'],
                     ],
                 ]);
    }
}
