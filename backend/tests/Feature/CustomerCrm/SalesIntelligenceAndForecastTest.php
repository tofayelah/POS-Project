<?php

namespace Tests\Feature\CustomerCrm;

use App\Models\Branch;
use App\Models\BusinessUnit;
use App\Models\Company;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SalesIntelligenceAndForecastTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $salesperson;
    protected Company $company;
    protected Branch $branch;
    protected Warehouse $warehouse;
    protected Customer $customer;
    protected ProductVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
        $this->seed(\Database\Seeders\CustomerPermissionsSeeder::class);
        $this->seed(\Database\Seeders\CustomerCrmPermissionsSeeder::class);

        $this->company = Company::factory()->create();

        $bu = BusinessUnit::create([
            'company_id' => $this->company->id,
            'name' => 'Intelligence BU',
            'code' => 'IBU-01',
        ]);

        $this->branch = Branch::create([
            'company_id' => $this->company->id,
            'business_unit_id' => $bu->id,
            'name' => 'Banani Hub',
            'branch_code' => 'BN-01',
        ]);

        $this->warehouse = Warehouse::create([
            'company_id' => $this->company->id,
            'name' => 'Central Retail Warehouse',
        ]);

        $this->adminUser = User::factory()->create();
        $this->adminUser->companies()->attach($this->company->id);
        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin']);
        $this->adminUser->roles()->attach($superAdminRole->id);

        $this->salesperson = User::factory()->create(['name' => 'Zubair Hossain']);
        $this->salesperson->companies()->attach($this->company->id);

        $this->customer = Customer::create([
            'company_id' => $this->company->id,
            'customer_code' => 'CUST-SI-01',
            'name' => 'Prime Enterprise',
            'mobile' => '01700112233',
            'status' => 'ACTIVE',
        ]);

        $product = Product::create([
            'company_id' => $this->company->id,
            'name' => 'Cotton Polo Shirt',
            'type' => 'STANDARD',
        ]);

        $this->variant = ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $product->id,
            'sku' => 'CPS-L-NAVY',
            'cost_price' => 400,
            'selling_price' => 850,
        ]);

        // Create completed sales across the last 30 days
        for ($i = 1; $i <= 5; $i++) {
            $sale = Sale::create([
                'company_id' => $this->company->id,
                'branch_id' => $this->branch->id,
                'customer_id' => $this->customer->id,
                'cashier_id' => $this->adminUser->id,
                'salesperson_id' => $this->salesperson->id,
                'invoice_number' => 'INV-SI-' . str_pad((string) $i, 3, '0', STR_PAD_LEFT),
                'sale_date' => now()->subDays($i * 4)->toDateString(),
                'status' => 'COMPLETED',
                'payment_status' => 'PAID',
                'subtotal' => 8500,
                'grand_total' => 8500,
                'paid_amount' => 8500,
                'due_amount' => 0,
                'created_by' => $this->adminUser->id,
            ]);

            SaleItem::create([
                'sale_id' => $sale->id,
                'product_id' => $this->variant->product_id,
                'product_variant_id' => $this->variant->id,
                'sku_snapshot' => $this->variant->sku,
                'product_name_snapshot' => 'Cotton Polo Shirt',
                'quantity' => 10,
                'unit_price' => 850,
                'line_total' => 8500,
            ]);
        }
    }

    public function test_sales_intelligence_dashboard_and_breakdowns()
    {
        // Test dashboard endpoint
        $dashResponse = $this->actingAs($this->adminUser)->getJson(
            '/api/v1/sales-intelligence/dashboard',
            ['X-Company-ID' => $this->company->id]
        );

        $dashResponse->assertStatus(200)
            ->assertJsonPath('success', true);

        // Test sales by customer
        $custResponse = $this->actingAs($this->adminUser)->getJson(
            '/api/v1/sales-intelligence/by-customer',
            ['X-Company-ID' => $this->company->id]
        );

        $custResponse->assertStatus(200)
            ->assertJsonPath('success', true);
        $this->assertNotEmpty($custResponse->json('data'));

        // Test sales by salesperson
        $spResponse = $this->actingAs($this->adminUser)->getJson(
            '/api/v1/sales-intelligence/salespersons',
            ['X-Company-ID' => $this->company->id]
        );

        $spResponse->assertStatus(200)
            ->assertJsonPath('success', true);
        $this->assertNotEmpty($spResponse->json('data'));
        $this->assertEquals($this->salesperson->id, $spResponse->json('data.0.salesperson_id'));
    }

    public function test_demand_forecasting_and_reorder_recommendations()
    {
        $forecastResponse = $this->actingAs($this->adminUser)->getJson(
            '/api/v1/sales-intelligence/demand-forecast?history_days=30&forecast_days=30',
            ['X-Company-ID' => $this->company->id]
        );

        $forecastResponse->assertStatus(200)
            ->assertJsonPath('success', true);

        $forecasts = $forecastResponse->json('data');
        $this->assertNotEmpty($forecasts);
        $this->assertEquals($this->variant->id, $forecasts[0]['product_variant_id']);
        $this->assertGreaterThan(0, $forecasts[0]['average_daily_sales']);

        // Test reorder recommendations endpoint
        $reorderResponse = $this->actingAs($this->adminUser)->getJson(
            '/api/v1/sales-intelligence/reorder-recommendations?lead_time_days=7&buffer_days=14',
            ['X-Company-ID' => $this->company->id]
        );

        $reorderResponse->assertStatus(200)
            ->assertJsonPath('success', true);
    }
}
