<?php

namespace Tests\Feature\Procurement;

use App\Models\Company;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Role;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Supplier;
use App\Models\SupplierContract;
use App\Models\SupplierPriceAgreement;
use App\Models\User;
use App\Models\Warehouse;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProcurementPlanningAndPricingTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Company $company;
    protected Warehouse $warehouse;
    protected Supplier $supplier;
    protected Product $product;
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

        $this->warehouse = Warehouse::create([
            'company_id' => $this->company->id,
            'name' => 'Rajshahi Central Warehouse',
        ]);

        $this->supplier = Supplier::create([
            'company_id' => $this->company->id,
            'supplier_code' => 'SUP-PLAN-01',
            'name' => 'Rajshahi Agro Impex',
            'qualification_status' => 'QUALIFIED',
            'status' => 'ACTIVE',
            'agreed_lead_time_days' => 5,
            'min_order_qty' => 10,
        ]);

        $this->product = Product::create([
            'company_id' => $this->company->id,
            'name' => 'Mustard Oil 5L',
            'type' => 'STANDARD',
            'supplier_id' => $this->supplier->id,
            'safety_stock' => 15,
            'reorder_level' => 30,
        ]);

        $this->variant = ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'sku' => 'OIL-5L-01',
            'purchase_cost' => 1100,
            'cost_price' => 1100,
        ]);
    }

    public function test_can_create_supplier_contract_and_price_agreement()
    {
        $contractRes = $this->actingAs($this->user)->postJson(
            '/api/v1/supplier-contracts',
            [
                'supplier_id' => $this->supplier->id,
                'contract_number' => 'CNT-2026-001',
                'title' => 'Annual Edible Oil Supply Agreement',
                'status' => 'ACTIVE',
                'start_date' => now()->toDateString(),
                'end_date' => now()->addYear()->toDateString(),
                'contract_value' => 500000,
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $contractRes->assertStatus(201)
                    ->assertJsonPath('data.contract_number', 'CNT-2026-001');

        $contractId = $contractRes->json('data.id');

        // Add price agreement with discounted contract price (1020 BDT vs standard 1100 BDT)
        $agreementRes = $this->actingAs($this->user)->postJson(
            '/api/v1/supplier-price-agreements',
            [
                'supplier_id' => $this->supplier->id,
                'supplier_contract_id' => $contractId,
                'product_id' => $this->product->id,
                'product_variant_id' => $this->variant->id,
                'agreed_unit_price' => 1020,
                'min_order_quantity' => 10,
                'effective_date' => now()->toDateString(),
                'status' => 'ACTIVE',
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $agreementRes->assertStatus(201)
                     ->assertJsonPath('data.agreed_unit_price', '1020.0000');
    }

    public function test_price_priority_resolution_picks_price_agreement_over_default()
    {
        // Without agreement: resolves default 1100
        $res1 = $this->actingAs($this->user)->getJson(
            "/api/v1/procurement/resolve-price?supplier_id={$this->supplier->id}&product_variant_id={$this->variant->id}&quantity=10",
            ['X-Company-ID' => $this->company->id]
        );

        $res1->assertStatus(200)
             ->assertJsonPath('data.unit_price', 1100)
             ->assertJsonPath('data.source', 'VARIANT_DEFAULT');

        // Create active price agreement
        SupplierPriceAgreement::create([
            'company_id' => $this->company->id,
            'supplier_id' => $this->supplier->id,
            'product_id' => $this->product->id,
            'product_variant_id' => $this->variant->id,
            'agreed_unit_price' => 1050,
            'min_order_quantity' => 5,
            'effective_date' => now()->subDay()->toDateString(),
            'status' => 'ACTIVE',
        ]);

        // With agreement: resolves agreed price 1050
        $res2 = $this->actingAs($this->user)->getJson(
            "/api/v1/procurement/resolve-price?supplier_id={$this->supplier->id}&product_variant_id={$this->variant->id}&quantity=10",
            ['X-Company-ID' => $this->company->id]
        );

        $res2->assertStatus(200)
             ->assertJsonPath('data.unit_price', 1050)
             ->assertJsonPath('data.source', 'PRICE_AGREEMENT');
    }

    public function test_deterministic_replenishment_recommendations_and_requisition_generation()
    {
        // 1. Current stock is low: only 5 units in warehouse
        Inventory::create([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'product_id' => $this->product->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 5,
        ]);

        // 2. Open PO has 5 units incoming
        $po = PurchaseOrder::create([
            'company_id' => $this->company->id,
            'supplier_id' => $this->supplier->id,
            'warehouse_id' => $this->warehouse->id,
            'po_number' => 'PO-PLAN-OPEN',
            'order_date' => now()->subDays(2)->toDateString(),
            'status' => 'APPROVED',
        ]);

        PurchaseOrderItem::create([
            'purchase_order_id' => $po->id,
            'product_id' => $this->product->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 5,
            'unit_cost' => 1100,
            'line_total' => 5500,
            'received_quantity' => 0,
            'pending_quantity' => 5, // 5 incoming
        ]);

        // Total net available = 5 on hand + 5 incoming = 10 units <= reorder level (30)

        // 3. Sales history: 60 units sold over last 30 days => 2 units/day velocity
        $sale = Sale::create([
            'company_id' => $this->company->id,
            'cashier_id' => $this->user->id,
            'invoice_number' => 'INV-PLAN-01',
            'sale_date' => now()->subDays(5)->toDateString(),
            'status' => 'COMPLETED',
        ]);

        SaleItem::create([
            'sale_id' => $sale->id,
            'product_id' => $this->product->id,
            'product_variant_id' => $this->variant->id,
            'sku_snapshot' => $this->variant->sku,
            'product_name_snapshot' => $this->product->name,
            'quantity' => 60,
            'unit_price' => 1350,
            'discount' => 0,
            'tax' => 0,
            'line_total' => 81000,
        ]);

        // Get recommendations
        $recRes = $this->actingAs($this->user)->getJson(
            "/api/v1/procurement/recommendations?warehouse_id={$this->warehouse->id}&lookback_days=30&coverage_days=30",
            ['X-Company-ID' => $this->company->id]
        );

        $recRes->assertStatus(200)
               ->assertJsonPath('data.summary.items_needing_reorder', 1);

        $recItem = $recRes->json('data.recommendations.0');
        $this->assertEquals($this->variant->id, $recItem['product_variant_id']);
        $this->assertEquals(5, (float) $recItem['stock_on_hand']);
        $this->assertEquals(5, (float) $recItem['incoming_po_quantity']);
        $this->assertEquals(10, (float) $recItem['net_available']);
        $this->assertEquals(2.0, (float) $recItem['daily_sales_velocity']);
        $this->assertGreaterThan(0, (float) $recItem['recommended_quantity']);
        $this->assertNotEmpty($recItem['reason']);

        // 4. Generate Requisition with 1 click from recommendation
        $genRes = $this->actingAs($this->user)->postJson(
            '/api/v1/procurement/recommendations/create-requisition',
            [
                'warehouse_id' => $this->warehouse->id,
                'title' => 'Automated Oil Replenishment',
                'items' => [
                    [
                        'product_id' => $recItem['product_id'],
                        'product_variant_id' => $recItem['product_variant_id'],
                        'recommended_quantity' => $recItem['recommended_quantity'],
                        'unit_cost' => $recItem['unit_cost'],
                        'preferred_supplier_id' => $recItem['preferred_supplier_id'],
                        'reason' => $recItem['reason'],
                    ],
                ],
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $genRes->assertStatus(201)
               ->assertJsonPath('data.title', 'Automated Oil Replenishment')
               ->assertJsonPath('data.status', 'DRAFT')
               ->assertJsonPath('data.priority', 'HIGH');

        $this->assertDatabaseHas('purchase_requisitions', [
            'id' => $genRes->json('data.id'),
            'title' => 'Automated Oil Replenishment',
        ]);
    }

    public function test_procurement_dashboard_endpoint()
    {
        $response = $this->actingAs($this->user)->getJson(
            '/api/v1/procurement/dashboard',
            ['X-Company-ID' => $this->company->id]
        );

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'success',
                     'data' => [
                         'kpis' => [
                             'open_requisitions',
                             'pending_approval_requisitions',
                             'open_rfqs',
                             'pending_goods_receipts',
                             'active_contracts',
                             'expiring_contracts_count',
                             'items_needing_reorder',
                         ],
                         'expiring_contracts',
                         'top_suppliers',
                         'ppv_summary',
                     ],
                 ]);
    }
}
