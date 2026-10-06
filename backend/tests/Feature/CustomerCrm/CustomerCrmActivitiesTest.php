<?php

namespace Tests\Feature\CustomerCrm;

use App\Models\Company;
use App\Models\Customer;
use App\Models\CustomerActivity;
use App\Models\CustomerComplaint;
use App\Models\CustomerOpportunity;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerCrmActivitiesTest extends TestCase
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
            'customer_code' => 'CUST-CRM-01',
            'name' => 'Meghna Distributors',
            'mobile' => '01811223344',
            'status' => 'ACTIVE',
        ]);
    }

    public function test_can_create_and_complete_crm_activity()
    {
        $response = $this->actingAs($this->adminUser)->postJson(
            '/api/v1/crm/activities',
            [
                'customer_id' => $this->customer->id,
                'activity_type' => 'CALL',
                'subject' => 'Monthly catalog discussion',
                'description' => 'Discussed upcoming Ramadan seasonal discount packages',
                'priority' => 'HIGH',
                'due_date' => now()->addDays(2)->toDateString(),
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.activity_type', 'CALL')
            ->assertJsonPath('data.status', 'OPEN');

        $activityId = $response->json('data.id');

        // Complete activity
        $completeResponse = $this->actingAs($this->adminUser)->postJson(
            "/api/v1/crm/activities/{$activityId}/complete",
            [],
            ['X-Company-ID' => $this->company->id]
        );

        $completeResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'COMPLETED');
    }

    public function test_can_log_and_resolve_complaint()
    {
        $response = $this->actingAs($this->adminUser)->postJson(
            '/api/v1/crm/complaints',
            [
                'customer_id' => $this->customer->id,
                'category' => 'PACKAGING',
                'priority' => 'HIGH',
                'subject' => 'Damaged carton received',
                'description' => 'Two outer boxes arrived torn during transit',
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'OPEN');

        $complaintId = $response->json('data.id');

        $resolveResponse = $this->actingAs($this->adminUser)->postJson(
            "/api/v1/crm/complaints/{$complaintId}/resolve",
            [
                'resolution_notes' => 'Courier audited and replacement items dispatched under RMA-402',
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $resolveResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'RESOLVED');
    }

    public function test_can_manage_opportunity_pipeline()
    {
        $response = $this->actingAs($this->adminUser)->postJson(
            '/api/v1/crm/opportunities',
            [
                'customer_id' => $this->customer->id,
                'title' => 'Annual Supplies Contract 2027',
                'expected_value' => 500000,
                'probability_pct' => 40,
                'stage' => 'PROPOSAL',
                'expected_close_date' => now()->addMonths(2)->toDateString(),
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.stage', 'PROPOSAL');

        $oppId = $response->json('data.id');

        $updateResponse = $this->actingAs($this->adminUser)->putJson(
            "/api/v1/crm/opportunities/{$oppId}",
            [
                'stage' => 'WON',
                'probability_pct' => 100,
                'notes' => 'Contract signed by MD',
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $updateResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.stage', 'WON')
            ->assertJsonPath('data.probability_pct', 100);
    }

    public function test_timeline_and_crm_dashboard()
    {
        // Create an activity, a complaint, and an opportunity
        CustomerActivity::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'activity_type' => 'MEETING',
            'subject' => 'Annual Review',
            'activity_at' => now(),
            'created_by' => $this->adminUser->id,
            'status' => 'COMPLETED',
        ]);

        CustomerComplaint::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'complaint_number' => 'CMP-001',
            'category' => 'SERVICE',
            'priority' => 'MEDIUM',
            'subject' => 'Late delivery',
            'description' => 'Delivery was 2 hours late',
            'status' => 'OPEN',
            'created_by' => $this->adminUser->id,
        ]);

        CustomerOpportunity::create([
            'company_id' => $this->company->id,
            'customer_id' => $this->customer->id,
            'title' => 'Q4 Wholesale Expansion',
            'estimated_value' => 120000,
            'stage' => 'CONTACTED',
            'probability' => 30,
            'created_by' => $this->adminUser->id,
        ]);

        // Customer timeline
        $timelineResponse = $this->actingAs($this->adminUser)->getJson(
            "/api/v1/customers/{$this->customer->id}/timeline",
            ['X-Company-ID' => $this->company->id]
        );

        $timelineResponse->assertStatus(200)
            ->assertJsonPath('success', true);
        $this->assertGreaterThanOrEqual(3, count($timelineResponse->json('data')));

        // CRM dashboard
        $dashboardResponse = $this->actingAs($this->adminUser)->getJson(
            '/api/v1/crm/dashboard',
            ['X-Company-ID' => $this->company->id]
        );

        $dashboardResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.complaints.open', 1)
            ->assertJsonPath('data.opportunities.count', 1);
    }
}
