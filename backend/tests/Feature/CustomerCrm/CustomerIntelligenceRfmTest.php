<?php

namespace Tests\Feature\CustomerCrm;

use App\Models\Branch;
use App\Models\BusinessUnit;
use App\Models\Company;
use App\Models\Customer;
use App\Models\Role;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerIntelligenceRfmTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected Company $company;
    protected Branch $branch;
    protected Customer $loyalCustomer;
    protected Customer $atRiskCustomer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
        $this->seed(\Database\Seeders\CustomerPermissionsSeeder::class);
        $this->seed(\Database\Seeders\CustomerCrmPermissionsSeeder::class);

        $this->company = Company::factory()->create();

        $bu = BusinessUnit::create([
            'company_id' => $this->company->id,
            'name' => 'Main BU',
            'code' => 'BU-01',
        ]);

        $this->branch = Branch::create([
            'company_id' => $this->company->id,
            'business_unit_id' => $bu->id,
            'name' => 'Gulshan Outlet',
            'branch_code' => 'BR-01',
        ]);

        $this->adminUser = User::factory()->create();
        $this->adminUser->companies()->attach($this->company->id);
        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin']);
        $this->adminUser->roles()->attach($superAdminRole->id);

        $this->loyalCustomer = Customer::create([
            'company_id' => $this->company->id,
            'customer_code' => 'CUST-LOYAL',
            'name' => 'Kazi Farhan',
            'mobile' => '01711998877',
            'credit_limit' => 100000,
            'status' => 'ACTIVE',
        ]);

        $this->atRiskCustomer = Customer::create([
            'company_id' => $this->company->id,
            'customer_code' => 'CUST-ATRISK',
            'name' => 'Tariq Enterprise',
            'mobile' => '01911998877',
            'credit_limit' => 50000,
            'status' => 'ACTIVE',
        ]);

        // Create 3 recent sales for loyalCustomer
        for ($i = 1; $i <= 3; $i++) {
            Sale::create([
                'company_id' => $this->company->id,
                'branch_id' => $this->branch->id,
                'customer_id' => $this->loyalCustomer->id,
                'cashier_id' => $this->adminUser->id,
                'invoice_number' => 'INV-L-00' . $i,
                'sale_date' => now()->subDays($i * 5)->toDateString(),
                'status' => 'COMPLETED',
                'payment_status' => 'PAID',
                'subtotal' => 10000,
                'grand_total' => 10000,
                'paid_amount' => 10000,
                'due_amount' => 0,
                'created_by' => $this->adminUser->id,
            ]);
        }

        // Create 1 old sale for atRiskCustomer (90 days ago)
        Sale::create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->atRiskCustomer->id,
            'cashier_id' => $this->adminUser->id,
            'invoice_number' => 'INV-R-001',
            'sale_date' => now()->subDays(90)->toDateString(),
            'status' => 'COMPLETED',
            'payment_status' => 'PAID',
            'subtotal' => 25000,
            'grand_total' => 25000,
            'paid_amount' => 25000,
            'due_amount' => 0,
            'created_by' => $this->adminUser->id,
        ]);
    }

    public function test_can_recalculate_rfm_and_view_rfm_distribution()
    {
        $recalcResponse = $this->actingAs($this->adminUser)->postJson(
            '/api/v1/customer-intelligence/recalculate-rfm',
            [],
            ['X-Company-ID' => $this->company->id]
        );

        $recalcResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.processed', 2);

        $summaryResponse = $this->actingAs($this->adminUser)->getJson(
            '/api/v1/customer-intelligence/rfm-summary',
            ['X-Company-ID' => $this->company->id]
        );

        $summaryResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total_scored_customers', 2);
    }

    public function test_can_identify_at_risk_customers()
    {
        $response = $this->actingAs($this->adminUser)->getJson(
            '/api/v1/customer-intelligence/at-risk?days_threshold=60',
            ['X-Company-ID' => $this->company->id]
        );

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $customers = $response->json('data');
        $this->assertNotEmpty($customers);
        $this->assertEquals($this->atRiskCustomer->id, $customers[0]['id']);
        $this->assertGreaterThanOrEqual(89, $customers[0]['days_inactive']);
    }

    public function test_can_fetch_customer_clv_and_360_view()
    {
        // Test CLV endpoint
        $clvResponse = $this->actingAs($this->adminUser)->getJson(
            "/api/v1/customers/{$this->loyalCustomer->id}/clv",
            ['X-Company-ID' => $this->company->id]
        );

        $clvResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.customer_id', $this->loyalCustomer->id)
            ->assertJsonPath('data.total_orders', 3)
            ->assertJsonPath('data.total_spent', 30000);

        // Test Customer 360 endpoint
        $view360Response = $this->actingAs($this->adminUser)->getJson(
            "/api/v1/customers/{$this->loyalCustomer->id}/360",
            ['X-Company-ID' => $this->company->id]
        );

        $view360Response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.customer.id', $this->loyalCustomer->id)
            ->assertJsonPath('data.sales_summary.total_orders', 3)
            ->assertJsonPath('data.sales_summary.total_spent', 30000);
    }
}
