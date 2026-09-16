<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SetCurrentCompanyScopeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // create super admin role
        Role::firstOrCreate(['name' => 'Super Admin']);
    }

    public function test_authorized_user_requests_authorized_company()
    {
        $company = Company::factory()->create();
        $user = User::factory()->create();
        $user->companies()->attach($company->id);

        $response = $this->actingAs($user)->getJson('/api/v1/business-units', [
            'X-Company-ID' => $company->id
        ]);

        // Assuming business units is a valid route, it should return 200 (or empty data if no bu)
        $response->assertStatus(200);
    }

    public function test_authorized_user_changes_x_company_id_to_unauthorized_company()
    {
        $company1 = Company::factory()->create();
        $company2 = Company::factory()->create(); // unauthorized company

        $user = User::factory()->create();
        $user->companies()->attach($company1->id);

        $response = $this->actingAs($user)->getJson('/api/v1/business-units', [
            'X-Company-ID' => $company2->id
        ]);

        $response->assertStatus(403);
        $response->assertJson(['message' => 'Forbidden: You do not have access to this company.']);
    }

    public function test_authorized_user_submits_unauthorized_company_id_query_parameter()
    {
        $company1 = Company::factory()->create();
        $company2 = Company::factory()->create();

        $user = User::factory()->create();
        $user->companies()->attach($company1->id);

        $response = $this->actingAs($user)->getJson('/api/v1/business-units?company_id=' . $company2->id);

        $response->assertStatus(403);
    }

    public function test_user_has_no_company_access_but_requests_specific_company()
    {
        $company = Company::factory()->create();
        $user = User::factory()->create();
        // User has no company attached

        $response = $this->actingAs($user)->getJson('/api/v1/business-units', [
            'X-Company-ID' => $company->id
        ]);

        $response->assertStatus(403);
    }

    public function test_unauthenticated_request_behaves_correctly()
    {
        $company = Company::factory()->create();
        // Trying to access an authenticated route without token
        $response = $this->getJson('/api/v1/business-units', [
            'X-Company-ID' => $company->id
        ]);

        // Sanctum should block it
        $response->assertStatus(401);
    }

    public function test_super_admin_can_access_any_company()
    {
        $company = Company::factory()->create();
        $user = User::factory()->create();
        $role = Role::where('name', 'Super Admin')->first();
        $user->roles()->attach($role->id);

        $response = $this->actingAs($user)->getJson('/api/v1/business-units', [
            'X-Company-ID' => $company->id
        ]);

        $response->assertStatus(200);
    }
}
