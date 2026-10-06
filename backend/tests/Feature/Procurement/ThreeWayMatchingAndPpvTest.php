<?php

namespace Tests\Feature\Procurement;

use App\Models\Company;
use App\Models\GoodsReceipt;
use App\Models\GoodsReceiptItem;
use App\Models\JournalEntry;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Role;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ThreeWayMatchingAndPpvTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Company $company;
    protected Warehouse $warehouse;
    protected Supplier $supplier;
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
            'name' => 'Bogra Depot',
        ]);

        $this->supplier = Supplier::create([
            'company_id' => $this->company->id,
            'supplier_code' => 'SUP-3WAY-01',
            'name' => 'Bogra Commodities Ltd',
            'qualification_status' => 'QUALIFIED',
            'status' => 'ACTIVE',
        ]);

        $product = Product::create([
            'company_id' => $this->company->id,
            'name' => 'Granular Salt 50kg',
            'type' => 'STANDARD',
        ]);

        $this->variant = ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $product->id,
            'sku' => 'SALT-50KG',
            'cost_price' => 800,
        ]);
    }

    public function test_exact_three_way_match_returns_matched_status_and_no_exceptions()
    {
        // 1. PO: 10 bags @ 800 BDT
        $po = PurchaseOrder::create([
            'company_id' => $this->company->id,
            'supplier_id' => $this->supplier->id,
            'warehouse_id' => $this->warehouse->id,
            'po_number' => 'PO-3W-001',
            'order_date' => '2026-09-01',
            'status' => 'FULLY_RECEIVED',
            'grand_total' => 8000,
        ]);

        $poItem = PurchaseOrderItem::create([
            'purchase_order_id' => $po->id,
            'product_id' => $this->variant->product_id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 10,
            'unit_cost' => 800,
            'line_total' => 8000,
            'received_quantity' => 10,
            'pending_quantity' => 0,
        ]);

        // 2. GR: 10 bags received
        $gr = GoodsReceipt::create([
            'company_id' => $this->company->id,
            'supplier_id' => $this->supplier->id,
            'warehouse_id' => $this->warehouse->id,
            'purchase_order_id' => $po->id,
            'receipt_number' => 'GR-3W-001',
            'receipt_date' => '2026-09-03',
            'status' => 'POSTED',
        ]);

        GoodsReceiptItem::create([
            'goods_receipt_id' => $gr->id,
            'purchase_order_item_id' => $poItem->id,
            'product_id' => $this->variant->product_id,
            'product_variant_id' => $this->variant->id,
            'received_quantity' => 10,
            'unit_cost' => 800,
            'total_cost' => 8000,
        ]);

        // 3. Invoice: 10 bags @ 800 BDT
        $purchase = Purchase::create([
            'company_id' => $this->company->id,
            'supplier_id' => $this->supplier->id,
            'warehouse_id' => $this->warehouse->id,
            'purchase_order_id' => $po->id,
            'goods_receipt_id' => $gr->id,
            'supplier_invoice_number' => 'INV-3W-001',
            'invoice_date' => '2026-09-04',
            'status' => 'POSTED',
            'subtotal' => 8000,
            'grand_total' => 8000,
        ]);

        PurchaseItem::create([
            'purchase_id' => $purchase->id,
            'product_id' => $this->variant->product_id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 10,
            'unit_cost' => 800,
            'line_total' => 8000,
        ]);

        $response = $this->actingAs($this->user)->getJson(
            "/api/v1/procurement/three-way-match/{$purchase->id}",
            ['X-Company-ID' => $this->company->id]
        );

        $response->assertStatus(200)
                 ->assertJsonPath('data.match_status', 'MATCHED')
                 ->assertJsonPath('data.has_exceptions', false);

        // Financial & Inventory Invariance
        $this->assertEquals(0, JournalEntry::count());
        $this->assertEquals(0, StockMovement::count());
    }

    public function test_detects_over_invoiced_quantity_exception()
    {
        $po = PurchaseOrder::create([
            'company_id' => $this->company->id,
            'supplier_id' => $this->supplier->id,
            'warehouse_id' => $this->warehouse->id,
            'po_number' => 'PO-3W-002',
            'order_date' => '2026-09-01',
            'status' => 'PARTIALLY_RECEIVED',
            'grand_total' => 8000,
        ]);

        $poItem = PurchaseOrderItem::create([
            'purchase_order_id' => $po->id,
            'product_id' => $this->variant->product_id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 10,
            'unit_cost' => 800,
            'line_total' => 8000,
            'received_quantity' => 5, // Only 5 received
            'pending_quantity' => 5,
        ]);

        $gr = GoodsReceipt::create([
            'company_id' => $this->company->id,
            'supplier_id' => $this->supplier->id,
            'warehouse_id' => $this->warehouse->id,
            'purchase_order_id' => $po->id,
            'receipt_number' => 'GR-3W-002',
            'receipt_date' => '2026-09-03',
            'status' => 'POSTED',
        ]);

        GoodsReceiptItem::create([
            'goods_receipt_id' => $gr->id,
            'purchase_order_item_id' => $poItem->id,
            'product_id' => $this->variant->product_id,
            'product_variant_id' => $this->variant->id,
            'received_quantity' => 5,
            'unit_cost' => 800,
            'total_cost' => 4000,
        ]);

        // Invoice bills for 8 bags, but only 5 received!
        $purchase = Purchase::create([
            'company_id' => $this->company->id,
            'supplier_id' => $this->supplier->id,
            'warehouse_id' => $this->warehouse->id,
            'purchase_order_id' => $po->id,
            'goods_receipt_id' => $gr->id,
            'supplier_invoice_number' => 'INV-3W-002',
            'invoice_date' => '2026-09-04',
            'status' => 'POSTED',
            'subtotal' => 6400,
            'grand_total' => 6400,
        ]);

        PurchaseItem::create([
            'purchase_id' => $purchase->id,
            'product_id' => $this->variant->product_id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 8,
            'unit_cost' => 800,
            'line_total' => 6400,
        ]);

        $response = $this->actingAs($this->user)->getJson(
            "/api/v1/procurement/three-way-match/{$purchase->id}",
            ['X-Company-ID' => $this->company->id]
        );

        $response->assertStatus(200)
                 ->assertJsonPath('data.match_status', 'EXCEPTION')
                 ->assertJsonPath('data.has_exceptions', true);

        $exceptions = $response->json('data.exceptions');
        $types = array_column($exceptions, 'type');
        $this->assertContains('OVER_INVOICED_QTY', $types);
    }

    public function test_detects_price_mismatch_and_purchase_price_variance()
    {
        // PO price is 800 BDT
        $po = PurchaseOrder::create([
            'company_id' => $this->company->id,
            'supplier_id' => $this->supplier->id,
            'warehouse_id' => $this->warehouse->id,
            'po_number' => 'PO-3W-003',
            'order_date' => now()->subDays(5)->toDateString(),
            'status' => 'FULLY_RECEIVED',
            'grand_total' => 8000,
        ]);

        $poItem = PurchaseOrderItem::create([
            'purchase_order_id' => $po->id,
            'product_id' => $this->variant->product_id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 10,
            'unit_cost' => 800,
            'line_total' => 8000,
            'received_quantity' => 10,
            'pending_quantity' => 0,
        ]);

        $gr = GoodsReceipt::create([
            'company_id' => $this->company->id,
            'supplier_id' => $this->supplier->id,
            'warehouse_id' => $this->warehouse->id,
            'purchase_order_id' => $po->id,
            'receipt_number' => 'GR-3W-003',
            'receipt_date' => now()->subDays(3)->toDateString(),
            'status' => 'POSTED',
        ]);

        GoodsReceiptItem::create([
            'goods_receipt_id' => $gr->id,
            'purchase_order_item_id' => $poItem->id,
            'product_id' => $this->variant->product_id,
            'product_variant_id' => $this->variant->id,
            'received_quantity' => 10,
            'unit_cost' => 800,
            'total_cost' => 8000,
        ]);

        // Invoice price is 850 BDT (+50 BDT unfavorable variance)
        $purchase = Purchase::create([
            'company_id' => $this->company->id,
            'supplier_id' => $this->supplier->id,
            'warehouse_id' => $this->warehouse->id,
            'purchase_order_id' => $po->id,
            'goods_receipt_id' => $gr->id,
            'supplier_invoice_number' => 'INV-3W-003',
            'invoice_date' => now()->subDays(2)->toDateString(),
            'status' => 'POSTED',
            'subtotal' => 8500,
            'grand_total' => 8500,
        ]);

        PurchaseItem::create([
            'purchase_id' => $purchase->id,
            'product_id' => $this->variant->product_id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 10,
            'unit_cost' => 850,
            'line_total' => 8500,
        ]);

        // 1. Check 3-way match price exception
        $matchRes = $this->actingAs($this->user)->getJson(
            "/api/v1/procurement/three-way-match/{$purchase->id}",
            ['X-Company-ID' => $this->company->id]
        );

        $matchRes->assertStatus(200)
                 ->assertJsonPath('data.match_status', 'EXCEPTION');

        $exceptions = $matchRes->json('data.exceptions');
        $types = array_column($exceptions, 'type');
        $this->assertContains('PRICE_MISMATCH', $types);

        // 2. Check company PPV summary
        $ppvRes = $this->actingAs($this->user)->getJson(
            '/api/v1/procurement/ppv-summary?period_days=30',
            ['X-Company-ID' => $this->company->id]
        );

        $ppvRes->assertStatus(200)
               ->assertJsonPath('data.total_unfavorable_ppv', 500) // (850 - 800) * 10 = 500
               ->assertJsonPath('data.summary_status', 'UNFAVORABLE');
    }

    public function test_match_exceptions_list_endpoint()
    {
        $response = $this->actingAs($this->user)->getJson(
            '/api/v1/procurement/match-exceptions',
            ['X-Company-ID' => $this->company->id]
        );

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'success',
                     'data' => [
                         'total_audited',
                         'exceptions_found',
                         'audits',
                     ],
                 ]);
    }
}
