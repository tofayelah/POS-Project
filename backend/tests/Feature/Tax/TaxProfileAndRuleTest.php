<?php

namespace Tests\Feature\Tax;

use App\Models\Company;
use App\Models\Role;
use App\Models\TaxCategory;
use App\Models\TaxProfile;
use App\Models\TaxRegistration;
use App\Models\TaxRule;
use App\Models\User;
use App\Services\TaxRuleService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaxProfileAndRuleTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Company $company;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
        $this->seed(\Database\Seeders\TaxPermissionsSeeder::class);

        $this->company = Company::factory()->create();

        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);
        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin']);
        $this->user->roles()->attach($superAdminRole->id);
    }

    public function test_can_create_and_update_tax_profile()
    {
        // 1. Initial GET profile is empty or null
        $getRes = $this->actingAs($this->user)->getJson(
            '/api/v1/tax/profile',
            ['X-Company-ID' => $this->company->id]
        );
        $getRes->assertStatus(200);

        // 2. Update / Create Tax Profile
        $profilePayload = [
            'legal_name' => 'RetailCore Bangladesh Pvt Ltd',
            'trade_name' => 'RetailCore Superstore',
            'bin' => '123456789-0101',
            'tin' => '987654321012',
            'vat_registration_number' => 'VRN-BD-2026',
            'taxpayer_type' => 'VAT_REGISTERED',
            'tax_jurisdiction' => 'BANGLADESH',
            'tax_circle' => 'Circle-15 (Dhanmondi)',
            'tax_zone' => 'Zone-03 (Dhaka)',
            'commissionerate' => 'Customs, Excise & VAT Commissionerate (Dhaka South)',
            'effective_from' => '2026-01-01',
            'status' => 'ACTIVE',
            'address' => 'House 42, Road 11, Dhanmondi, Dhaka 1209',
            'contact_email' => 'tax@retailcore.com.bd',
            'contact_phone' => '+8801700000000',
        ];

        $updateRes = $this->actingAs($this->user)->putJson(
            '/api/v1/tax/profile',
            $profilePayload,
            ['X-Company-ID' => $this->company->id]
        );

        $updateRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.bin', '123456789-0101')
            ->assertJsonPath('data.legal_name', 'RetailCore Bangladesh Pvt Ltd');

        $this->assertDatabaseHas('tax_profiles', [
            'company_id' => $this->company->id,
            'bin' => '123456789-0101',
            'tax_zone' => 'Zone-03 (Dhaka)',
        ]);
    }

    public function test_can_manage_tax_registrations()
    {
        // 1. Create a profile first
        $profile = TaxProfile::create([
            'company_id' => $this->company->id,
            'legal_name' => 'RetailCore BD',
            'trade_name' => 'RetailCore',
            'bin' => '112233445-0101',
            'tin' => '998877665544',
            'taxpayer_type' => 'VAT_REGISTERED',
            'tax_jurisdiction' => 'BANGLADESH',
            'effective_from' => '2026-01-01',
            'status' => 'ACTIVE',
        ]);

        // 2. Add Tax Registration
        $regResponse = $this->actingAs($this->user)->postJson(
            '/api/v1/tax/registrations',
            [
                'tax_profile_id' => $profile->id,
                'registration_type' => 'VAT',
                'registration_number' => '112233445-0101',
                'issuing_authority' => 'National Board of Revenue (NBR)',
                'source_reference' => 'Mushak-2.1 Form Submission #4412',
                'issue_date' => '2026-01-01',
                'effective_date' => '2026-01-01',
                'status' => 'ACTIVE',
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $regResponse->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.registration_type', 'VAT')
            ->assertJsonPath('data.registration_number', '112233445-0101');

        $regId = $regResponse->json('data.id');

        // 3. List registrations
        $listRes = $this->actingAs($this->user)->getJson(
            '/api/v1/tax/registrations',
            ['X-Company-ID' => $this->company->id]
        );
        $listRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data');

        // 4. Delete registration
        $delRes = $this->actingAs($this->user)->deleteJson(
            "/api/v1/tax/registrations/{$regId}",
            [],
            ['X-Company-ID' => $this->company->id]
        );
        $delRes->assertStatus(200);

        $this->assertDatabaseMissing('tax_registrations', ['id' => $regId]);
    }

    public function test_can_manage_tax_categories_and_rules()
    {
        // 1. Create Tax Category
        $catResponse = $this->actingAs($this->user)->postJson(
            '/api/v1/tax/categories',
            [
                'name' => 'Standard Rate Goods',
                'code' => 'STANDARD_GOODS',
                'description' => 'General retail goods subject to 15% standard VAT',
                'is_active' => true,
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $catResponse->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.code', 'STANDARD_GOODS');

        $categoryId = $catResponse->json('data.id');

        // 2. Create Tax Rule with Components
        $ruleResponse = $this->actingAs($this->user)->postJson(
            '/api/v1/tax/rules',
            [
                'tax_category_id' => $categoryId,
                'code' => 'VAT_15_STD',
                'name' => 'Standard VAT 15%',
                'description' => 'Standard retail supply rate',
                'rate' => 15.0000,
                'calculation_method' => 'PERCENTAGE',
                'base_method' => 'NET_AMOUNT',
                'inclusive_allowed' => true,
                'exclusive_allowed' => true,
                'priority' => 10,
                'effective_from' => '2026-01-01',
                'legal_reference' => 'First Schedule, VAT and SD Act 2012',
                'status' => 'ACTIVE',
                'components' => [
                    [
                        'code' => 'OUTPUT_VAT_15',
                        'name' => 'Output VAT 15%',
                        'type' => 'OUTPUT_VAT',
                        'rate' => 15.0000,
                        'sequence' => 1,
                    ],
                ],
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $ruleResponse->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.code', 'VAT_15_STD')
            ->assertJsonPath('data.rate', 15);

        $ruleId = $ruleResponse->json('data.id');

        // 3. Test Rule Service Effective Date Resolution
        $ruleService = app(TaxRuleService::class);
        $resolvedRule = $ruleService->getEffectiveRule($this->company->id, $categoryId, null, null, '2026-06-15');
        $this->assertNotNull($resolvedRule);
        $this->assertEquals('VAT_15_STD', $resolvedRule->code);
        $this->assertEquals(15.0, (float) $resolvedRule->rate);

        // Before effective date should return null
        $pastRule = $ruleService->getEffectiveRule($this->company->id, $categoryId, null, null, '2025-12-31');
        $this->assertNull($pastRule);

        // 4. Toggle Rule Status
        $toggleResponse = $this->actingAs($this->user)->patchJson(
            "/api/v1/tax/rules/{$ruleId}/status",
            ['status' => 'INACTIVE'],
            ['X-Company-ID' => $this->company->id]
        );

        $toggleResponse->assertStatus(200)
            ->assertJsonPath('data.status', 'INACTIVE');

        $this->assertDatabaseHas('tax_rules', [
            'id' => $ruleId,
            'status' => 'INACTIVE',
        ]);
    }

    public function test_zero_rated_and_exempt_categories_behave_correctly()
    {
        $ruleService = app(TaxRuleService::class);

        // Create Zero-Rated Rule (0%)
        $zeroCat = TaxCategory::create([
            'company_id' => $this->company->id,
            'name' => 'Export Zero Rated',
            'code' => 'ZERO_RATED',
            'is_active' => true,
        ]);
        $ruleService->createRule($this->company->id, [
            'tax_category_id' => $zeroCat->id,
            'code' => 'VAT_ZERO',
            'name' => 'Zero Rated Export',
            'rate' => 0.0000,
            'calculation_method' => 'PERCENTAGE',
            'base_method' => 'NET_AMOUNT',
            'effective_from' => '2026-01-01',
            'status' => 'ACTIVE',
        ]);

        $resolvedZero = $ruleService->getEffectiveRule($this->company->id, $zeroCat->id, null, null, '2026-10-01');
        $this->assertNotNull($resolvedZero);
        $this->assertEquals(0.0, (float) $resolvedZero->rate);

        // Create Exempt Category
        $exemptCat = TaxCategory::create([
            'company_id' => $this->company->id,
            'name' => 'Exempt Essential Goods',
            'code' => 'EXEMPT_GOODS',
            'is_active' => true,
        ]);
        $ruleService->createRule($this->company->id, [
            'tax_category_id' => $exemptCat->id,
            'code' => 'VAT_EXEMPT',
            'name' => 'Statutory Exemption',
            'rate' => 0.0000,
            'calculation_method' => 'PERCENTAGE',
            'base_method' => 'NET_AMOUNT',
            'effective_from' => '2026-01-01',
            'status' => 'ACTIVE',
        ]);

        $resolvedExempt = $ruleService->getEffectiveRule($this->company->id, $exemptCat->id, null, null, '2026-10-01');
        $this->assertNotNull($resolvedExempt);
        $this->assertEquals(0.0, (float) $resolvedExempt->rate);
    }
}
