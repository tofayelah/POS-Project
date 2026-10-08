<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Company;
use App\Models\Customer;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Role;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BiAnalyticsPhase13Test extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Company $company;
    protected Branch $branch;
    protected Warehouse $warehouse;
    protected Product $product;
    protected Customer $customer;
    protected Supplier $supplier;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
        $this->seed(\Database\Seeders\BiPermissionsSeeder::class);

        $this->company = Company::factory()->create();

        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);
        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin']);
        $this->user->roles()->attach($superAdmin->id);

        $bu = \App\Models\BusinessUnit::create([
            'company_id' => $this->company->id,
            'name' => 'Main BU',
            'code' => 'BU-01',
        ]);

        $this->branch = Branch::create([
            'company_id' => $this->company->id,
            'business_unit_id' => $bu->id,
            'name' => 'Gulshan Flagship',
            'code' => 'BR-01',
            'branch_code' => 'BR-01',
            'is_active' => true,
        ]);

        $this->warehouse = Warehouse::create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'name' => 'Main Warehouse',
            'code' => 'WH-01',
            'is_active' => true,
        ]);

        $category = Category::create([
            'company_id' => $this->company->id,
            'name' => 'Beverages',
            'code' => 'BEV',
        ]);

        $this->product = Product::create([
            'company_id' => $this->company->id,
            'category_id' => $category->id,
            'name' => 'Organic Green Tea',
            'sku' => 'TEA-001',
            'cost_price' => 150.00,
            'selling_price' => 250.00,
            'reorder_level' => 10,
        ]);

        $variant = \App\Models\ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'sku' => 'TEA-001-V',
            'cost_price' => 150.00,
            'selling_price' => 250.00,
        ]);

        $this->customer = Customer::create([
            'company_id' => $this->company->id,
            'customer_code' => 'CUST-001',
            'name' => 'Rahim Chowdhury',
            'mobile' => '01711111111',
            'current_balance' => 5000,
            'rfm_segment' => 'CHAMPIONS',
        ]);

        $this->supplier = Supplier::create([
            'company_id' => $this->company->id,
            'supplier_code' => 'SUPP-001',
            'name' => 'Tea Valley Ltd',
            'mobile' => '01811111111',
            'current_balance' => 15000,
        ]);

        // Seed an inventory row
        Inventory::create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'warehouse_id' => $this->warehouse->id,
            'product_id' => $this->product->id,
            'product_variant_id' => $variant->id,
            'quantity' => 50,
            'average_cost' => 150.00,
            'total_value' => 7500.00,
            'reorder_point' => 10,
        ]);

        // Seed a completed sale
        $sale = Sale::create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'warehouse_id' => $this->warehouse->id,
            'customer_id' => $this->customer->id,
            'cashier_id' => $this->user->id,
            'invoice_number' => 'INV-2026-001',
            'sale_date' => Carbon::today()->toDateString(),
            'status' => 'COMPLETED',
            'subtotal' => 2500,
            'discount_total' => 100,
            'tax_total' => 120,
            'grand_total' => 2520,
            'paid_amount' => 2520,
            'due_amount' => 0,
            'payment_status' => 'PAID',
            'channel' => 'POS',
            'fulfillment_status' => 'FULFILLED',
        ]);

        SaleItem::create([
            'sale_id' => $sale->id,
            'product_id' => $this->product->id,
            'product_variant_id' => $variant->id,
            'sku_snapshot' => 'TEA-001-V',
            'product_name_snapshot' => 'Organic Green Tea',
            'quantity' => 10,
            'unit_price' => 250.00,
            'discount' => 100.00,
            'tax' => 120.00,
            'line_total' => 2520.00,
            'unit_cost_snapshot' => 150.00,
            'total_cost_snapshot' => 1500.00,
        ]);

        // Seed a purchase
        Purchase::create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'supplier_id' => $this->supplier->id,
            'supplier_invoice_number' => 'PO-SUPP-001',
            'invoice_date' => Carbon::today()->toDateString(),
            'status' => 'POSTED',
            'grand_total' => 15000,
            'tax_total' => 0,
        ]);
    }

    public function test_executive_dashboard_endpoint(): void
    {
        $response = $this->actingAs($this->user)
            ->withHeaders(['X-Company-Id' => $this->company->id])
            ->getJson('/api/v1/bi/dashboard/executive');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'status',
            'data' => [
                'period' => ['start_date', 'end_date'],
                'primary_kpis' => [
                    'revenue',
                    'gross_sales',
                    'net_sales',
                    'gross_profit',
                    'gross_margin_pct',
                    'inventory_value',
                    'working_capital',
                ],
                'sales_kpis' => [
                    'today_sales',
                    'mtd_sales',
                    'units_sold',
                    'transactions',
                    'aov',
                ],
                'daily_trend',
                'top_products',
                'top_branches',
                'channel_breakdown',
            ],
        ]);

        $this->assertEquals(2520.0, $response->json('data.primary_kpis.revenue'));
        $this->assertEquals(1500.0, $response->json('data.primary_kpis.cogs'));
        $this->assertEquals(1020.0, $response->json('data.primary_kpis.gross_profit'));
    }

    public function test_executive_sales_kpis_endpoint(): void
    {
        $response = $this->actingAs($this->user)
            ->withHeaders(['X-Company-Id' => $this->company->id])
            ->getJson('/api/v1/bi/dashboard/sales');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'status',
            'data' => [
                'today_sales',
                'mtd_sales',
                'ytd_sales',
                'aov',
                'units_sold',
                'transactions',
            ],
        ]);
    }

    public function test_specialized_domain_endpoints(): void
    {
        $endpoints = [
            '/api/v1/bi/sales',
            '/api/v1/bi/profitability',
            '/api/v1/bi/inventory',
            '/api/v1/bi/procurement',
            '/api/v1/bi/customer',
            '/api/v1/bi/supplier',
            '/api/v1/bi/pos',
            '/api/v1/bi/ecommerce',
            '/api/v1/bi/finance',
            '/api/v1/bi/vat',
            '/api/v1/bi/branch',
            '/api/v1/bi/product',
            '/api/v1/bi/channel',
            '/api/v1/bi/salesperson',
        ];

        foreach ($endpoints as $url) {
            $resp = $this->actingAs($this->user)
                ->withHeaders(['X-Company-Id' => $this->company->id])
                ->getJson($url);

            $this->assertEquals(200, $resp->status(), "Failed on endpoint: {$url}");
            $this->assertEquals('success', $resp->json('status'));
        }
    }

    public function test_inventory_abc_and_aging_analysis(): void
    {
        $resp = $this->actingAs($this->user)
            ->withHeaders(['X-Company-Id' => $this->company->id])
            ->getJson('/api/v1/bi/inventory');

        $resp->assertStatus(200);
        $resp->assertJsonStructure([
            'status',
            'data' => [
                'summary' => [
                    'total_valuation',
                    'total_units',
                    'total_skus',
                    'turnover_ratio',
                ],
                'abc_analysis' => [
                    'class_a',
                    'class_b',
                    'class_c',
                ],
                'aging_buckets',
                'reorder_alerts',
            ],
        ]);

        $this->assertEquals(7500.0, $resp->json('data.summary.total_valuation'));
        $this->assertEquals(50.0, $resp->json('data.summary.total_units'));
    }

    public function test_bi_alerts_lifecycle(): void
    {
        // 1. Evaluate alerts
        $evalResp = $this->actingAs($this->user)
            ->withHeaders(['X-Company-Id' => $this->company->id])
            ->postJson('/api/v1/bi/alerts/evaluate');

        $evalResp->assertStatus(200);

        // 2. List active alerts
        $listResp = $this->actingAs($this->user)
            ->withHeaders(['X-Company-Id' => $this->company->id])
            ->getJson('/api/v1/bi/alerts');

        $listResp->assertStatus(200);
        $alerts = $listResp->json('data');

        if (!empty($alerts)) {
            $alertId = $alerts[0]['id'];

            // 3. Acknowledge alert
            $ackResp = $this->actingAs($this->user)
                ->withHeaders(['X-Company-Id' => $this->company->id])
                ->postJson("/api/v1/bi/alerts/{$alertId}/acknowledge");

            $ackResp->assertStatus(200);
            $this->assertEquals('ACKNOWLEDGED', $ackResp->json('data.status'));

            // 4. Resolve alert
            $resResp = $this->actingAs($this->user)
                ->withHeaders(['X-Company-Id' => $this->company->id])
                ->postJson("/api/v1/bi/alerts/{$alertId}/resolve");

            $resResp->assertStatus(200);
            $this->assertEquals('RESOLVED', $resResp->json('data.status'));
        }
    }

    public function test_report_builder_and_saved_reports(): void
    {
        // 1. Catalog
        $catResp = $this->actingAs($this->user)
            ->withHeaders(['X-Company-Id' => $this->company->id])
            ->getJson('/api/v1/bi/reports/catalog');

        $catResp->assertStatus(200);
        $this->assertArrayHasKey('sales', $catResp->json('data'));

        // 2. Execute Dynamic Query
        $execResp = $this->actingAs($this->user)
            ->withHeaders(['X-Company-Id' => $this->company->id])
            ->postJson('/api/v1/bi/reports/execute', [
                'dataset' => 'sales',
                'dimensions' => ['date', 'branch'],
                'metrics' => ['orders_count', 'net_sales'],
            ]);

        $execResp->assertStatus(200);
        $this->assertEquals('sales', $execResp->json('data.dataset'));

        // 3. Export CSV
        $exportResp = $this->actingAs($this->user)
            ->withHeaders(['X-Company-Id' => $this->company->id])
            ->postJson('/api/v1/bi/reports/export', [
                'dataset' => 'sales',
                'dimensions' => ['date'],
                'metrics' => ['net_sales'],
                'format' => 'csv',
            ]);

        $exportResp->assertStatus(200);
        $this->assertStringContainsString('date,net_sales', $exportResp->getContent());

        // 4. Save Custom Report
        $saveResp = $this->actingAs($this->user)
            ->withHeaders(['X-Company-Id' => $this->company->id])
            ->postJson('/api/v1/bi/reports/saved', [
                'name' => 'Monthly Sales by Branch',
                'dataset' => 'sales',
                'dimensions' => ['month', 'branch'],
                'metrics' => ['orders_count', 'net_sales'],
                'chart_type' => 'bar',
            ]);

        $saveResp->assertStatus(201);
        $reportId = $saveResp->json('data.id');

        // 5. Run Saved Report
        $runResp = $this->actingAs($this->user)
            ->withHeaders(['X-Company-Id' => $this->company->id])
            ->getJson("/api/v1/bi/reports/saved/{$reportId}/run");

        $runResp->assertStatus(200);

        // 6. Delete Saved Report
        $delResp = $this->actingAs($this->user)
            ->withHeaders(['X-Company-Id' => $this->company->id])
            ->deleteJson("/api/v1/bi/reports/saved/{$reportId}");

        $delResp->assertStatus(200);
    }

    public function test_dashboard_preferences(): void
    {
        $saveResp = $this->actingAs($this->user)
            ->withHeaders(['X-Company-Id' => $this->company->id])
            ->postJson('/api/v1/bi/dashboard/preferences/executive', [
                'widget_order' => ['primary_kpis', 'sales_kpis', 'daily_trend'],
                'hidden_widgets' => ['channel_breakdown'],
            ]);

        $saveResp->assertStatus(200);

        $getResp = $this->actingAs($this->user)
            ->withHeaders(['X-Company-Id' => $this->company->id])
            ->getJson('/api/v1/bi/dashboard/preferences/executive');

        $getResp->assertStatus(200);
        $this->assertEquals(['primary_kpis', 'sales_kpis', 'daily_trend'], $getResp->json('data.widget_order'));
    }
}
