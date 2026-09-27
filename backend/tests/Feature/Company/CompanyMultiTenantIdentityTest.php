<?php

namespace Tests\Feature\Company;

use Tests\TestCase;
use App\Models\User;
use App\Models\Company;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

class CompanyMultiTenantIdentityTest extends TestCase
{
    use RefreshDatabase;

    protected User $userA;
    protected User $userB;
    protected Company $companyA;
    protected Company $companyB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->companyA = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Trust Bond Trading',
            'legal_name' => 'Trust Bond Trading LLC',
            'code' => 'TBT-01',
            'phone' => '+880 1711-111111',
            'email' => 'info@trustbond.test',
            'website' => 'https://trustbond.test',
            'address' => 'Suite 500, Trade Tower, Motijheel, Dhaka',
            'country' => 'Bangladesh',
            'currency_code' => 'BDT',
            'timezone' => 'Asia/Dhaka',
            'vat_registration' => 'BIN-98765432101',
            'tax_number' => 'BIN-98765432101',
            'status' => 'active',
        ]);

        $this->companyB = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'ABC Fashion Ltd.',
            'legal_name' => 'ABC Fashion & Apparel Limited',
            'code' => 'ABC-02',
            'phone' => '+880 1822-222222',
            'email' => 'contact@abcfashion.test',
            'website' => 'https://abcfashion.test',
            'address' => 'Plot 12, Road 5, Banani, Dhaka',
            'country' => 'Bangladesh',
            'currency_code' => 'BDT',
            'timezone' => 'Asia/Dhaka',
            'vat_registration' => 'BIN-12345678902',
            'tax_number' => 'BIN-12345678902',
            'status' => 'active',
        ]);

        $role = Role::firstOrCreate(['name' => 'Admin']);

        $this->userA = User::factory()->create(['name' => 'User Company A']);
        $this->userA->companies()->attach($this->companyA->id);
        $this->userA->roles()->attach($role->id);

        $this->userB = User::factory()->create(['name' => 'User Company B']);
        $this->userB->companies()->attach($this->companyB->id);
        $this->userB->roles()->attach($role->id);
    }

    /**
     * T01 - Company profile returns active company identity
     */
    public function test_company_profile_returns_active_company(): void
    {
        $response = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => (string) $this->companyA->id])
            ->getJson('/api/v1/company');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $this->companyA->id,
                    'name' => 'Trust Bond Trading',
                    'legal_name' => 'Trust Bond Trading LLC',
                    'phone' => '+880 1711-111111',
                    'email' => 'info@trustbond.test',
                    'website' => 'https://trustbond.test',
                    'address' => 'Suite 500, Trade Tower, Motijheel, Dhaka',
                    'vat_registration' => 'BIN-98765432101',
                    'tax_number' => 'BIN-98765432101',
                ]
            ]);
    }

    /**
     * T02 - Multi-tenant isolation: Company A user cannot access Company B profile
     */
    public function test_company_a_cannot_access_company_b_profile(): void
    {
        $response = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => (string) $this->companyB->id])
            ->getJson('/api/v1/company');

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'message' => 'Forbidden: You do not have access to this company.'
            ]);
    }

    /**
     * T03 - Company update changes only active company and keeps Company B untouched
     */
    public function test_company_update_changes_only_active_company(): void
    {
        $updatePayload = [
            'name' => 'Trust Bond Global Solutions',
            'legal_name' => 'Trust Bond Global Corp',
            'phone' => '+880 1799-999999',
            'email' => 'global@trustbond.test',
            'website' => 'https://global.trustbond.test',
            'address' => 'Floor 10, City Center, Dhaka',
            'vat_registration' => 'BIN-55555555555',
        ];

        $response = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => (string) $this->companyA->id])
            ->putJson('/api/v1/company', $updatePayload);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $this->companyA->id,
                    'name' => 'Trust Bond Global Solutions',
                    'website' => 'https://global.trustbond.test',
                    'vat_registration' => 'BIN-55555555555',
                    'tax_number' => 'BIN-55555555555',
                ]
            ]);

        // Verify Company A changed in database
        $this->companyA->refresh();
        $this->assertEquals('Trust Bond Global Solutions', $this->companyA->name);
        $this->assertEquals('BIN-55555555555', $this->companyA->vat_registration);

        // Verify Company B remains completely untouched
        $this->companyB->refresh();
        $this->assertEquals('ABC Fashion Ltd.', $this->companyB->name);
        $this->assertEquals('BIN-12345678902', $this->companyB->vat_registration);
    }

    /**
     * T04 - Multi-tenant isolation: Company A user cannot update Company B profile
     */
    public function test_company_a_cannot_update_company_b_profile(): void
    {
        $response = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => (string) $this->companyB->id])
            ->putJson('/api/v1/company', ['name' => 'Hacked Company Name']);

        $response->assertStatus(403);

        $this->companyB->refresh();
        $this->assertEquals('ABC Fashion Ltd.', $this->companyB->name);
    }

    /**
     * T05 - Validation: Company name is required and cannot become empty
     */
    public function test_company_name_validation_requires_non_empty_string(): void
    {
        $response = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => (string) $this->companyA->id])
            ->putJson('/api/v1/company', ['name' => '   ']);

        $response->assertStatus(422);

        $this->companyA->refresh();
        $this->assertEquals('Trust Bond Trading', $this->companyA->name);
    }

    /**
     * T06 - Index returns only companies the user is authorized to access
     */
    public function test_index_returns_only_authorized_companies_for_tenant_user(): void
    {
        $response = $this->actingAs($this->userA)
            ->getJson('/api/v1/companies');

        $response->assertStatus(200);
        $companies = collect($response->json('data'));

        $this->assertTrue($companies->contains('id', $this->companyA->id));
        $this->assertFalse($companies->contains('id', $this->companyB->id));
    }
}
