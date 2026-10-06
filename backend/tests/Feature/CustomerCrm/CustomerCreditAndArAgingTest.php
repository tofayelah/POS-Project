<?php

namespace Tests\Feature\CustomerCrm;

use App\Models\Company;
use App\Models\Customer;
use App\Models\CustomerCreditRequest;
use App\Models\CustomerLedger;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerCreditAndArAgingTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected Company $company;
    protected Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
        $this->seed(\Database\Seeders\CustomerPermissionsSeeder::class);
        $this->seed(\Database\Seeders\CustomerCrmPermissionsSeeder::class);

        $this->company = Company::factory()->create();

        $this->adminUser = User::factory()->create();
        $this->adminUser->companies()->attach($this->company->id);
        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin']);
        $this->adminUser->roles()->attach($superAdminRole->id);

        $this->customer = Customer::create([
            'company_id' => $this->company->id,
            'customer_code' => 'CUST-001',
            'name' => 'Dhaka Traders Ltd',
            'company_name' => 'Dhaka Traders Ltd Corp',
            'contact_person' => 'Mr. Rafiqul Islam',
            'customer_type' => 'CORPORATE',
            'mobile' => '01711000001',
            'credit_limit' => 50000,
            'credit_days' => 30,
            'credit_status' => 'APPROVED',
            'status' => 'ACTIVE',
        ]);
    }

    public function test_can_request_credit_limit_increase()
    {
        $response = $this->actingAs($this->adminUser)->postJson(
            "/api/v1/customers/{$this->customer->id}/request-credit",
            [
                'requested_credit_limit' => 100000,
                'requested_credit_days' => 45,
                'reason' => 'Business expansion and bulk monthly orders',
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'PENDING')
            ->assertJsonPath('data.requested_credit_limit', '100000.0000')
            ->assertJsonPath('data.requested_credit_days', 45);

        $this->assertDatabaseHas('customer_credit_requests', [
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'status' => 'PENDING',
        ]);
    }

    public function test_can_approve_credit_request_and_updates_customer()
    {
        $req = CustomerCreditRequest::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'requested_credit_limit' => 75000,
            'requested_credit_days' => 40,
            'reason' => 'Seasonal surge',
            'requested_by' => $this->adminUser->id,
            'status' => 'PENDING',
        ]);

        $response = $this->actingAs($this->adminUser)->postJson(
            "/api/v1/customer-credit-requests/{$req->id}/approve",
            ['notes' => 'Approved after credit evaluation'],
            ['X-Company-ID' => $this->company->id]
        );

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'APPROVED');

        $this->customer->refresh();
        $this->assertEquals(75000, (float) $this->customer->credit_limit);
        $this->assertEquals(40, (int) $this->customer->credit_days);
    }

    public function test_can_reject_credit_request()
    {
        $req = CustomerCreditRequest::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'requested_credit_limit' => 200000,
            'requested_credit_days' => 90,
            'reason' => 'High risk request',
            'requested_by' => $this->adminUser->id,
            'status' => 'PENDING',
        ]);

        $response = $this->actingAs($this->adminUser)->postJson(
            "/api/v1/customer-credit-requests/{$req->id}/reject",
            ['rejection_reason' => 'Financial risk profile too high'],
            ['X-Company-ID' => $this->company->id]
        );

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'REJECTED');

        $this->customer->refresh();
        $this->assertEquals(50000, (float) $this->customer->credit_limit);
    }

    public function test_can_toggle_credit_hold_status()
    {
        $response = $this->actingAs($this->adminUser)->postJson(
            "/api/v1/customers/{$this->customer->id}/credit-hold",
            [
                'status' => 'ON_HOLD',
                'reason' => 'Pending overdue invoice settlement',
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.credit_status', 'ON_HOLD')
            ->assertJsonPath('data.credit_hold_reason', 'Pending overdue invoice settlement');

        $this->customer->refresh();
        $this->assertEquals('ON_HOLD', $this->customer->credit_status);
    }

    public function test_credit_summary_and_ar_aging_buckets()
    {
        // Add a ledger entry dated 45 days ago (31-60 days bucket)
        CustomerLedger::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'transaction_type' => 'SALE',
            'debit' => 15000,
            'credit' => 0,
            'balance_before' => 0,
            'balance_after' => 15000,
            'transaction_date' => now()->subDays(45)->toDateString(),
            'due_date' => now()->subDays(15)->toDateString(),
            'reference_type' => Customer::class,
            'reference_id' => $this->customer->id,
            'reference_number' => 'INV-001',
            'description' => 'Credit Sale Invoice 001',
            'created_by' => $this->adminUser->id,
        ]);

        // Add a current ledger entry (0-30 days bucket)
        CustomerLedger::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'transaction_type' => 'SALE',
            'debit' => 5000,
            'credit' => 0,
            'balance_before' => 15000,
            'balance_after' => 20000,
            'transaction_date' => now()->subDays(5)->toDateString(),
            'due_date' => now()->addDays(25)->toDateString(),
            'reference_type' => Customer::class,
            'reference_id' => $this->customer->id,
            'reference_number' => 'INV-002',
            'description' => 'Credit Sale Invoice 002',
            'created_by' => $this->adminUser->id,
        ]);

        // Check credit summary endpoint
        $summaryResponse = $this->actingAs($this->adminUser)->getJson(
            "/api/v1/customers/{$this->customer->id}/credit-summary",
            ['X-Company-ID' => $this->company->id]
        );

        $summaryResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.credit_limit', 50000)
            ->assertJsonPath('data.outstanding_balance', 20000)
            ->assertJsonPath('data.available_credit', 30000);

        // Check customer aging endpoint
        $agingResponse = $this->actingAs($this->adminUser)->getJson(
            "/api/v1/customers/{$this->customer->id}/aging",
            ['X-Company-ID' => $this->company->id]
        );

        $agingResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total_outstanding', 20000);

        // Check customer statement endpoint
        $statementResponse = $this->actingAs($this->adminUser)->getJson(
            "/api/v1/customers/{$this->customer->id}/statement",
            ['X-Company-ID' => $this->company->id]
        );

        $statementResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.closing_balance', 20000);
    }
}
