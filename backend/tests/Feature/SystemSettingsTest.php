<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Branch;
use App\Models\Company;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Setting;
use App\Models\User;
use App\Services\SystemSettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SystemSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected Company $companyA;
    protected Company $companyB;
    protected Branch $branchA;
    protected User $superAdmin;
    protected User $adminA;
    protected User $managerA;
    protected User $unauthorizedUser;
    protected SystemSettingsService $settingsService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->settingsService = app(SystemSettingsService::class);

        // Setup Companies
        $this->companyA = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Prime Retailers Dhaka',
            'code' => 'PRD-01',
            'country' => 'Bangladesh',
        ]);

        $this->companyB = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Apex Superstore Chittagong',
            'code' => 'ASC-02',
            'country' => 'Bangladesh',
        ]);

        // Setup Business Unit & Branch
        $businessUnit = \App\Models\BusinessUnit::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->companyA->id,
            'name' => 'Retail Division',
            'code' => 'RD-01',
        ]);

        $this->branchA = Branch::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->companyA->id,
            'business_unit_id' => $businessUnit->id,
            'name' => 'Gulshan Flagship',
            'code' => 'GUL-01',
        ]);

        // Roles
        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin']);
        $adminRole = Role::firstOrCreate(['name' => 'Admin']);
        $managerRole = Role::firstOrCreate(['name' => 'Manager']);
        $staffRole = Role::firstOrCreate(['name' => 'Cashier']);

        // Permissions
        $viewPerm = Permission::firstOrCreate(['name' => 'settings.view'], ['group' => 'settings']);
        $updatePerm = Permission::firstOrCreate(['name' => 'settings.update'], ['group' => 'settings']);
        $posPerm = Permission::firstOrCreate(['name' => 'settings.pos'], ['group' => 'settings']);
        $secPerm = Permission::firstOrCreate(['name' => 'settings.security'], ['group' => 'settings']);

        $superAdminRole->permissions()->syncWithoutDetaching([$viewPerm->id, $updatePerm->id, $posPerm->id, $secPerm->id]);
        $adminRole->permissions()->syncWithoutDetaching([$viewPerm->id, $updatePerm->id, $posPerm->id, $secPerm->id]);
        $managerRole->permissions()->syncWithoutDetaching([$viewPerm->id, $posPerm->id]);

        $storageViewPerm = Permission::firstOrCreate(['name' => 'storage_locations.view'], ['group' => 'organization']);
        $staffRole->permissions()->syncWithoutDetaching([$storageViewPerm->id]);

        // Users
        $this->superAdmin = User::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Super Admin User',
            'email' => 'super@retailcore.test',
            'password' => bcrypt('password123'),
            'status' => 'active',
            'company_id' => $this->companyA->id,
        ]);
        $this->superAdmin->roles()->attach($superAdminRole->id);

        $this->adminA = User::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Admin Company A',
            'email' => 'admin.a@retailcore.test',
            'password' => bcrypt('password123'),
            'status' => 'active',
            'company_id' => $this->companyA->id,
        ]);
        $this->adminA->roles()->attach($adminRole->id);

        $this->managerA = User::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Manager Company A',
            'email' => 'manager.a@retailcore.test',
            'password' => bcrypt('password123'),
            'status' => 'active',
            'company_id' => $this->companyA->id,
        ]);
        $this->managerA->roles()->attach($managerRole->id);

        $this->unauthorizedUser = User::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Cashier User',
            'email' => 'cashier@retailcore.test',
            'password' => bcrypt('password123'),
            'status' => 'active',
            'company_id' => $this->companyA->id,
        ]);
        $this->unauthorizedUser->roles()->attach($staffRole->id);
    }

    public function test_can_retrieve_all_20_settings_groups(): void
    {
        Sanctum::actingAs($this->adminA);

        $response = $this->withHeaders(['X-Company-ID' => $this->companyA->id])
            ->getJson('/api/v1/settings/groups');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $data = $response->json('data');
        $this->assertArrayHasKey('general', $data);
        $this->assertArrayHasKey('company', $data);
        $this->assertArrayHasKey('security', $data);
        $this->assertArrayHasKey('pos', $data);
        $this->assertArrayHasKey('sales', $data);
        $this->assertArrayHasKey('purchase', $data);
        $this->assertArrayHasKey('inventory', $data);
        $this->assertArrayHasKey('accounting', $data);
        $this->assertArrayHasKey('vat', $data);
        $this->assertArrayHasKey('payments', $data);
        $this->assertArrayHasKey('crm', $data);
        $this->assertArrayHasKey('hr', $data);
        $this->assertArrayHasKey('ecommerce', $data);
        $this->assertArrayHasKey('notifications', $data);
        $this->assertArrayHasKey('numbering', $data);
        $this->assertArrayHasKey('bi', $data);
        $this->assertArrayHasKey('maintenance', $data);
        $this->assertArrayHasKey('localization', $data);
        $this->assertArrayHasKey('audit', $data);
        $this->assertArrayHasKey('system', $data);
        $this->assertCount(20, $data);
    }

    public function test_can_read_group_with_bangladesh_defaults(): void
    {
        Sanctum::actingAs($this->adminA);

        $response = $this->withHeaders(['X-Company-ID' => $this->companyA->id])
            ->getJson('/api/v1/settings/general');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.group', 'general')
            ->assertJsonPath('data.settings.default_currency.value', 'BDT')
            ->assertJsonPath('data.settings.currency_symbol.value', '৳')
            ->assertJsonPath('data.settings.timezone.value', 'Asia/Dhaka');
    }

    public function test_can_update_group_settings_and_read_updated_values(): void
    {
        Sanctum::actingAs($this->adminA);

        $updateResponse = $this->withHeaders(['X-Company-ID' => $this->companyA->id])
            ->putJson('/api/v1/settings/pos', [
                'settings' => [
                    'receipt_size' => '58mm',
                    'allow_price_override' => true,
                    'max_discount_percentage' => 20.0,
                    'receipt_header_text' => 'Gulshan Store Special',
                ],
            ]);

        $updateResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.settings.receipt_size.value', '58mm')
            ->assertJsonPath('data.settings.allow_price_override.value', true)
            ->assertJsonPath('data.settings.max_discount_percentage.value', 20)
            ->assertJsonPath('data.settings.receipt_header_text.value', 'Gulshan Store Special');

        // Direct getter in service reflects updated values
        $this->assertEquals('58mm', $this->settingsService->get($this->companyA->id, 'pos', 'receipt_size'));
        $this->assertTrue($this->settingsService->get($this->companyA->id, 'pos', 'allow_price_override'));
    }

    public function test_tenant_isolation_company_b_does_not_see_company_a_changes(): void
    {
        Sanctum::actingAs($this->adminA);

        // Company A updates pos receipt_size to 58mm
        $this->withHeaders(['X-Company-ID' => $this->companyA->id])
            ->putJson('/api/v1/settings/pos', [
                'settings' => [
                    'receipt_size' => '58mm',
                ],
            ])
            ->assertStatus(200);

        // Create an admin belonging to Company B to verify tenant separation
        $adminRole = Role::where('name', 'Admin')->first();
        $adminB = User::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Admin Company B',
            'email' => 'admin.b@retailcore.test',
            'password' => bcrypt('password123'),
            'status' => 'active',
            'company_id' => $this->companyB->id,
        ]);
        $adminB->roles()->attach($adminRole->id);

        Sanctum::actingAs($adminB);

        // Company B queries pos settings and should still see default 80mm
        $responseB = $this->withHeaders(['X-Company-ID' => $this->companyB->id])
            ->getJson('/api/v1/settings/pos');

        $responseB->assertStatus(200)
            ->assertJsonPath('data.settings.receipt_size.value', '80mm');

        $this->assertEquals('80mm', $this->settingsService->get($this->companyB->id, 'pos', 'receipt_size'));
    }

    public function test_branch_isolation_setting_branch_override(): void
    {
        Sanctum::actingAs($this->adminA);

        // Set global receipt header
        $this->settingsService->set($this->companyA->id, 'pos', 'receipt_header_text', 'Global Company Header');

        // Set branch-specific receipt header
        $this->settingsService->set($this->companyA->id, 'pos', 'receipt_header_text', 'Gulshan Branch Header', null, $this->branchA->id);

        $globalHeader = $this->settingsService->get($this->companyA->id, 'pos', 'receipt_header_text');
        $branchHeader = $this->settingsService->get($this->companyA->id, 'pos', 'receipt_header_text', null, $this->branchA->id);

        $this->assertEquals('Global Company Header', $globalHeader);
        $this->assertEquals('Gulshan Branch Header', $branchHeader);
    }

    public function test_validation_prevents_invalid_values(): void
    {
        Sanctum::actingAs($this->adminA);

        // Invalid receipt size (must be 58mm, 80mm, or A4)
        $response = $this->withHeaders(['X-Company-ID' => $this->companyA->id])
            ->putJson('/api/v1/settings/pos', [
                'settings' => [
                    'receipt_size' => 'invalid_size_1000mm',
                ],
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonValidationErrors('receipt_size');

        // Invalid discount percentage (over 100%)
        $response2 = $this->withHeaders(['X-Company-ID' => $this->companyA->id])
            ->putJson('/api/v1/settings/pos', [
                'settings' => [
                    'max_discount_percentage' => 150.0,
                ],
            ]);

        $response2->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonValidationErrors('max_discount_percentage');
    }

    public function test_unauthorized_user_cannot_view_or_update_settings(): void
    {
        Sanctum::actingAs($this->unauthorizedUser);

        $viewResponse = $this->withHeaders(['X-Company-ID' => $this->companyA->id])
            ->getJson('/api/v1/settings/general');

        $viewResponse->assertStatus(403);

        $updateResponse = $this->withHeaders(['X-Company-ID' => $this->companyA->id])
            ->putJson('/api/v1/settings/general', [
                'settings' => ['company_name' => 'Hacked Company'],
            ]);

        $updateResponse->assertStatus(403);
    }

    public function test_manager_cannot_modify_critical_security_settings(): void
    {
        Sanctum::actingAs($this->managerA);

        // Manager lacks settings.security permission
        $response = $this->withHeaders(['X-Company-ID' => $this->companyA->id])
            ->putJson('/api/v1/settings/security', [
                'settings' => [
                    'session_timeout_minutes' => 30,
                ],
            ]);

        $response->assertStatus(403);
    }

    public function test_audit_log_created_with_sensitive_value_redaction(): void
    {
        Sanctum::actingAs($this->adminA);

        $this->withHeaders(['X-Company-ID' => $this->companyA->id])
            ->putJson('/api/v1/settings/notifications', [
                'settings' => [
                    'sms_sender_id' => 'MYBRAND',
                    'sms_gateway_api_key' => 'super_secret_token_12345',
                ],
            ])
            ->assertStatus(200);

        // Check AuditLog was created
        $auditLog = AuditLog::where('company_id', $this->companyA->id)
            ->where('event', 'SETTINGS_UPDATED')
            ->orderBy('id', 'desc')
            ->first();

        $this->assertNotNull($auditLog);

        // Verify sensitive key was redacted in audit logs
        $sensitiveLog = AuditLog::where('company_id', $this->companyA->id)
            ->where('event', 'SETTINGS_UPDATED')
            ->where('new_values->key', 'sms_gateway_api_key')
            ->first();

        $this->assertNotNull($sensitiveLog);
        $this->assertEquals('[REDACTED]', $sensitiveLog->new_values['value']);

        // And verify API response masks sensitive key
        $getResponse = $this->withHeaders(['X-Company-ID' => $this->companyA->id])
            ->getJson('/api/v1/settings/notifications');

        $this->assertEquals('••••••••', $getResponse->json('data.settings.sms_gateway_api_key.value'));
    }

    public function test_atomic_document_numbering_generation_and_preview(): void
    {
        Sanctum::actingAs($this->adminA);

        // Configure numbering
        $this->settingsService->set($this->companyA->id, 'numbering', 'sales_invoice_prefix', 'INV-2026-');
        $this->settingsService->set($this->companyA->id, 'numbering', 'sales_invoice_digits', 6);
        $this->settingsService->set($this->companyA->id, 'numbering', 'sales_invoice_sequence', 1);

        // Preview should show INV-2026-000001 without incrementing
        $previewResponse = $this->withHeaders(['X-Company-ID' => $this->companyA->id])
            ->postJson('/api/v1/settings/numbering/preview', [
                'type' => 'sales_invoice',
            ]);

        $previewResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.preview', 'INV-2026-000001');

        // First generated number
        $num1 = $this->settingsService->getNextDocumentNumber($this->companyA->id, 'sales_invoice');
        $this->assertEquals('INV-2026-000001', $num1);

        // Second generated number should atomically increment sequence
        $num2 = $this->settingsService->getNextDocumentNumber($this->companyA->id, 'sales_invoice');
        $this->assertEquals('INV-2026-000002', $num2);

        // Third generated number
        $num3 = $this->settingsService->getNextDocumentNumber($this->companyA->id, 'sales_invoice');
        $this->assertEquals('INV-2026-000003', $num3);

        // Preview should now show INV-2026-000004
        $previewAgain = $this->settingsService->previewDocumentNumber($this->companyA->id, 'sales_invoice');
        $this->assertEquals('INV-2026-000004', $previewAgain);
    }

    public function test_system_info_endpoint(): void
    {
        Sanctum::actingAs($this->adminA);

        $response = $this->withHeaders(['X-Company-ID' => $this->companyA->id])
            ->getJson('/api/v1/settings/system-info');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.system_name', 'RetailCore POS/ERP')
            ->assertJsonPath('data.api_version', 'v1');

        $this->assertNotEmpty($response->json('data.server_time'));
        $this->assertNotEmpty($response->json('data.laravel_version'));
    }
}
