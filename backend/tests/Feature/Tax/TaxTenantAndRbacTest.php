<?php

namespace Tests\Feature\Tax;

use App\Models\AuditLog;
use App\Models\Company;
use App\Models\Permission;
use App\Models\Role;
use App\Models\TaxCategory;
use App\Models\TaxPeriod;
use App\Models\TaxProfile;
use App\Models\TaxRule;
use App\Models\User;
use App\Services\TaxPeriodService;
use App\Services\TaxProfileService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaxTenantAndRbacTest extends TestCase
{
    use RefreshDatabase;

    protected Company $companyA;
    protected Company $companyB;
    protected User $userA;
    protected User $userB;
    protected User $restrictedUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
        $this->seed(\Database\Seeders\TaxPermissionsSeeder::class);

        $this->companyA = Company::factory()->create(['name' => 'Company A Retail']);
        $this->companyB = Company::factory()->create(['name' => 'Company B Mart']);

        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin']);

        // User A in Company A
        $this->userA = User::factory()->create();
        $this->userA->companies()->attach($this->companyA->id);
        $this->userA->roles()->attach($superAdminRole->id);

        // User B in Company B
        $this->userB = User::factory()->create();
        $this->userB->companies()->attach($this->companyB->id);
        $this->userB->roles()->attach($superAdminRole->id);

        // Restricted User in Company A (No Tax permissions)
        $this->restrictedUser = User::factory()->create();
        $this->restrictedUser->companies()->attach($this->companyA->id);
        $cashierRole = Role::firstOrCreate(['name' => 'Cashier']);
        $this->restrictedUser->roles()->attach($cashierRole->id);
    }

    public function test_multi_tenant_isolation_prevents_cross_tenant_tax_leakage()
    {
        // 1. Setup Tax Profile in Company A
        TaxProfile::create([
            'company_id' => $this->companyA->id,
            'legal_name' => 'Company A Legal Ltd',
            'trade_name' => 'Shop A',
            'bin' => '111111111-0101',
            'tin' => '111111111111',
            'taxpayer_type' => 'VAT_REGISTERED',
            'tax_jurisdiction' => 'BANGLADESH',
            'effective_from' => '2026-01-01',
            'status' => 'ACTIVE',
        ]);

        // Setup Tax Period in Company A
        $periodA = TaxPeriod::create([
            'company_id' => $this->companyA->id,
            'period_name' => 'October 2026 A',
            'period_start' => '2026-10-01',
            'period_end' => '2026-10-31',
            'status' => 'OPEN',
        ]);

        // 2. User B queries tax profile -> Should be null for Company B
        $resB = $this->actingAs($this->userB)->getJson(
            '/api/v1/tax/profile',
            ['X-Company-ID' => $this->companyB->id]
        );

        $resB->assertStatus(200);
        $this->assertNull($resB->json('data'), 'Company B should not see Company A tax profile');

        // 3. User B queries periods -> Must not see Company A period
        $periodsB = $this->actingAs($this->userB)->getJson(
            '/api/v1/tax/periods',
            ['X-Company-ID' => $this->companyB->id]
        );

        $periodsB->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonCount(0, 'data');

        // 4. User B cannot lock Company A period
        $crossLock = $this->actingAs($this->userB)->postJson(
            "/api/v1/tax/periods/{$periodA->id}/lock",
            [],
            ['X-Company-ID' => $this->companyB->id]
        );

        // Either 404 or 403 because it belongs to Company A
        $this->assertTrue(in_array($crossLock->status(), [403, 404]));
    }

    public function test_rbac_enforcement_blocks_unauthorized_users()
    {
        // Restricted User attempts to view tax profile -> 403
        $viewRes = $this->actingAs($this->restrictedUser)->getJson(
            '/api/v1/tax/profile',
            ['X-Company-ID' => $this->companyA->id]
        );
        $viewRes->assertStatus(403);

        // Restricted User attempts to create tax rule -> 403
        $ruleRes = $this->actingAs($this->restrictedUser)->postJson(
            '/api/v1/tax/rules',
            [
                'code' => 'UNAUTH_RULE',
                'name' => 'Unauthorized Rule',
            ],
            ['X-Company-ID' => $this->companyA->id]
        );
        $ruleRes->assertStatus(403);

        // Restricted User attempts to close period -> 403
        $closeRes = $this->actingAs($this->restrictedUser)->postJson(
            '/api/v1/tax/periods/1/close',
            [],
            ['X-Company-ID' => $this->companyA->id]
        );
        $closeRes->assertStatus(403);
    }

    public function test_audit_logs_record_tax_lifecycle_events()
    {
        $profileService = app(TaxProfileService::class);
        $periodService = app(TaxPeriodService::class);

        // 1. Create and Update Profile writes AuditLog
        $profileService->createOrUpdateProfile($this->companyA->id, [
            'legal_name' => 'Audited Taxpayer Ltd',
            'trade_name' => 'Audited Taxpayer Shop',
            'bin' => '999888777-0101',
            'tin' => '999888777111',
            'taxpayer_type' => 'VAT_REGISTERED',
            'tax_jurisdiction' => 'BANGLADESH',
            'effective_from' => '2026-01-01',
            'status' => 'ACTIVE',
        ], $this->userA->id);

        $this->assertDatabaseHas('audit_logs', [
            'company_id' => $this->companyA->id,
            'event' => 'TAX_PROFILE_CREATED',
        ]);

        $profileService->createOrUpdateProfile($this->companyA->id, [
            'legal_name' => 'Audited Taxpayer Ltd Updated',
        ], $this->userA->id);

        $this->assertDatabaseHas('audit_logs', [
            'company_id' => $this->companyA->id,
            'event' => 'TAX_PROFILE_UPDATED',
        ]);

        // 2. Lock and Close Period writes AuditLog
        $period = $periodService->createPeriod($this->companyA->id, [
            'period_name' => 'November 2026',
            'period_start' => '2026-11-01',
            'period_end' => '2026-11-30',
        ], $this->userA->id);

        $periodService->lockPeriod($this->companyA->id, $period->id, $this->userA->id);
        $this->assertDatabaseHas('audit_logs', [
            'company_id' => $this->companyA->id,
            'event' => 'TAX_PERIOD_LOCKED',
        ]);

        $periodService->closePeriod($this->companyA->id, $period->id, $this->userA->id);
        $this->assertDatabaseHas('audit_logs', [
            'company_id' => $this->companyA->id,
            'event' => 'TAX_PERIOD_CLOSED',
        ]);
    }
}
