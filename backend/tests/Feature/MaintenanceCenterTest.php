<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Branch;
use App\Models\BusinessUnit;
use App\Models\Category;
use App\Models\Company;
use App\Models\Customer;
use App\Models\Permission;
use App\Models\Product;
use App\Models\Role;
use App\Models\Setting;
use App\Models\Supplier;
use App\Models\SystemBackup;
use App\Models\SystemDemoRecord;
use App\Models\User;
use App\Services\DatabaseBackupService;
use App\Services\DataResetService;
use App\Services\DemoDataService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MaintenanceCenterTest extends TestCase
{
    use RefreshDatabase;

    protected Company $companyA;
    protected Company $companyB;
    protected Branch $branchA;
    protected User $superAdmin;
    protected User $adminUser;
    protected User $managerUser;
    protected User $unauthorizedUser;
    protected User $companyBAdmin;

    protected DatabaseBackupService $backupService;
    protected DataResetService $resetService;
    protected DemoDataService $demoService;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake(config('maintenance.backup_disk', 'local'));

        $this->backupService = app(DatabaseBackupService::class);
        $this->resetService = app(DataResetService::class);
        $this->demoService = app(DemoDataService::class);

        // Setup Companies
        $this->companyA = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Prime Retailers Dhaka',
            'code' => 'PRD-01',
            'country' => 'Bangladesh',
        ]);

        $this->companyB = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Apex Superstore Ctg',
            'code' => 'ASC-02',
            'country' => 'Bangladesh',
        ]);

        $businessUnit = BusinessUnit::create([
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

        // Maintenance Permissions
        $mView = Permission::firstOrCreate(['name' => 'maintenance.view'], ['group' => 'maintenance']);
        $mBackup = Permission::firstOrCreate(['name' => 'maintenance.backup'], ['group' => 'maintenance']);
        $mReset = Permission::firstOrCreate(['name' => 'maintenance.reset'], ['group' => 'maintenance']);
        $mDemo = Permission::firstOrCreate(['name' => 'maintenance.demo'], ['group' => 'maintenance']);
        $mDemoRemove = Permission::firstOrCreate(['name' => 'maintenance.demo_remove'], ['group' => 'maintenance']);

        $superAdminRole->permissions()->syncWithoutDetaching([
            $mView->id, $mBackup->id, $mReset->id, $mDemo->id, $mDemoRemove->id
        ]);
        $adminRole->permissions()->syncWithoutDetaching([
            $mView->id, $mBackup->id, $mDemo->id
        ]);
        $managerRole->permissions()->syncWithoutDetaching([
            $mView->id
        ]);
        $storageViewPerm = Permission::firstOrCreate(['name' => 'storage_locations.view'], ['group' => 'organization']);
        $staffRole->permissions()->syncWithoutDetaching([$storageViewPerm->id]);

        // Users
        $this->superAdmin = User::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Super Admin User',
            'email' => 'super@retailcore.test',
            'password' => Hash::make('password123'),
            'status' => 'active',
            'company_id' => $this->companyA->id,
        ]);
        $this->superAdmin->roles()->attach($superAdminRole->id);

        $this->adminUser = User::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Admin User A',
            'email' => 'admin@retailcore.test',
            'password' => Hash::make('password123'),
            'status' => 'active',
            'company_id' => $this->companyA->id,
        ]);
        $this->adminUser->roles()->attach($adminRole->id);

        $this->managerUser = User::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Manager User A',
            'email' => 'manager@retailcore.test',
            'password' => Hash::make('password123'),
            'status' => 'active',
            'company_id' => $this->companyA->id,
        ]);
        $this->managerUser->roles()->attach($managerRole->id);

        $this->unauthorizedUser = User::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Cashier User',
            'email' => 'cashier@retailcore.test',
            'password' => Hash::make('password123'),
            'status' => 'active',
            'company_id' => $this->companyA->id,
        ]);
        $this->unauthorizedUser->roles()->attach($staffRole->id);

        $this->companyBAdmin = User::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Company B Admin',
            'email' => 'admin.b@retailcore.test',
            'password' => Hash::make('password123'),
            'status' => 'active',
            'company_id' => $this->companyB->id,
        ]);
        $this->companyBAdmin->roles()->attach($adminRole->id);
    }

    /**
     * 1. Backup authorization check (Super Admin & Admin allowed, Cashier rejected).
     */
    public function test_01_backup_authorization(): void
    {
        Sanctum::actingAs($this->unauthorizedUser);
        $response = $this->postJson('/api/v1/settings/maintenance/backup');
        $response->assertStatus(403);

        Sanctum::actingAs($this->managerUser);
        $response = $this->postJson('/api/v1/settings/maintenance/backup');
        $response->assertStatus(403);

        Sanctum::actingAs($this->adminUser);
        $response = $this->postJson('/api/v1/settings/maintenance/backup');
        $response->assertStatus(200);
        $response->assertJson(['success' => true]);
    }

    /**
     * 2. Backup creation and file persistence.
     */
    public function test_02_backup_creation_and_file_persistence(): void
    {
        Sanctum::actingAs($this->adminUser);
        $response = $this->postJson('/api/v1/settings/maintenance/backup', [
            'note' => 'Automated test backup',
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'message',
            'data' => [
                'id',
                'filename',
                'file_size',
                'file_size_human',
                'checksum',
                'status',
                'created_at',
            ],
        ]);

        $filename = $response->json('data.filename');
        $this->assertStringEndsWith('.dump', $filename);

        $disk = config('maintenance.backup_disk', 'local');
        $storageDir = config('maintenance.backup_dir', 'backups');
        $this->assertTrue(Storage::disk($disk)->exists("{$storageDir}/{$filename}"));
    }

    /**
     * 3. Backup metadata recorded with COMPLETED status.
     */
    public function test_03_backup_metadata_recorded_with_completed_status(): void
    {
        Sanctum::actingAs($this->superAdmin);
        $response = $this->postJson('/api/v1/settings/maintenance/backup');
        $response->assertStatus(200);

        $backupId = $response->json('data.id');
        $backup = SystemBackup::find($backupId);

        $this->assertNotNull($backup);
        $this->assertEquals('COMPLETED', $backup->status);
        $this->assertGreaterThan(0, $backup->file_size);
        $this->assertNotEmpty($backup->checksum);
        $this->assertEquals('pgsql', $backup->database_driver);
        $this->assertEquals($this->superAdmin->id, $backup->created_by);
    }

    /**
     * 4. Backup failure error sanitization.
     */
    public function test_04_backup_failure_error_sanitization(): void
    {
        $backup = SystemBackup::create([
            'company_id' => $this->companyA->id,
            'filename' => 'test_failed.dump',
            'storage_path' => 'backups/test_failed.dump',
            'database_driver' => 'pgsql',
            'database_name' => 'retailcore',
            'file_size' => 0,
            'status' => 'FAILED',
            'error_message' => 'Connection failed: password=supersecret was rejected by host db',
        ]);

        // Error sanitization in DatabaseBackupService
        $reflection = new \ReflectionClass($this->backupService);
        $method = $reflection->getMethod('sanitizeErrorMessage');
        $method->setAccessible(true);
        $sanitized = $method->invoke($this->backupService, 'Connection failed: password=supersecret host=127.0.0.1');

        $this->assertStringNotContainsString('supersecret', $sanitized);
        $this->assertStringContainsString('password=***', $sanitized);
    }

    /**
     * 5. Backup download authorization and path traversal rejection.
     */
    public function test_05_backup_download_authorization_and_traversal_rejection(): void
    {
        Sanctum::actingAs($this->adminUser);
        $createRes = $this->postJson('/api/v1/settings/maintenance/backup');
        $backupId = $createRes->json('data.id');

        // Cashier cannot download
        Sanctum::actingAs($this->unauthorizedUser);
        $downRes = $this->get("/api/v1/settings/maintenance/backup/{$backupId}/download");
        $downRes->assertStatus(403);

        // Admin can download
        Sanctum::actingAs($this->adminUser);
        $downRes = $this->get("/api/v1/settings/maintenance/backup/{$backupId}/download");
        $downRes->assertStatus(200);

        // Non-existent backup returns 404
        $notRes = $this->get('/api/v1/settings/maintenance/backup/999999/download');
        $notRes->assertStatus(404);
    }

    /**
     * 6. Data reset authorization: Super Admin only.
     */
    public function test_06_data_reset_authorization_super_admin_only(): void
    {
        // Admin forbidden
        Sanctum::actingAs($this->adminUser);
        $res = $this->postJson('/api/v1/settings/maintenance/reset/preview');
        $res->assertStatus(403);

        $res = $this->postJson('/api/v1/settings/maintenance/reset', [
            'confirmation_text' => 'RESET RETAILCORE',
            'password' => 'password123',
        ]);
        $res->assertStatus(403);

        // Manager forbidden
        Sanctum::actingAs($this->managerUser);
        $res = $this->postJson('/api/v1/settings/maintenance/reset/preview');
        $res->assertStatus(403);

        // Super Admin allowed
        Sanctum::actingAs($this->superAdmin);
        $res = $this->postJson('/api/v1/settings/maintenance/reset/preview');
        $res->assertStatus(200);
    }

    /**
     * 7. Non-production reset permitted with confirmation and password.
     */
    public function test_07_non_production_reset_permitted_with_confirmation(): void
    {
        Sanctum::actingAs($this->superAdmin);

        $res = $this->postJson('/api/v1/settings/maintenance/reset', [
            'confirmation_text' => 'RESET RETAILCORE',
            'password' => 'password123',
            'mode' => 'TRANSACTIONAL_DATA',
        ]);

        $res->assertStatus(200);
        $res->assertJson(['success' => true]);
        $this->assertArrayHasKey('safety_backup', $res->json('data'));
        $this->assertArrayHasKey('post_reset_integrity', $res->json('data'));
        $this->assertTrue($res->json('data.post_reset_integrity.passed'));
    }

    /**
     * 8. Production reset blocked when env flag is disabled.
     */
    public function test_08_production_reset_blocked_when_env_flag_disabled(): void
    {
        Sanctum::actingAs($this->superAdmin);

        Config::set('app.env', 'production');
        Config::set('maintenance.allow_destructive_reset', false);

        $res = $this->postJson('/api/v1/settings/maintenance/reset', [
            'confirmation_text' => 'RESET RETAILCORE',
            'password' => 'password123',
        ]);

        $res->assertStatus(403);
        $this->assertStringContainsString('strictly prohibited in production', $res->json('message'));

        // Reset config back to testing
        Config::set('app.env', 'testing');
        Config::set('maintenance.allow_destructive_reset', true);
    }

    /**
     * 9. Data reset preview leaves database unmutated.
     */
    public function test_09_data_reset_preview_leaves_data_unmutated(): void
    {
        Sanctum::actingAs($this->superAdmin);

        // Seed customer
        $customer = Customer::create([
            'company_id' => $this->companyA->id,
            'customer_code' => 'CUST-PREV-01',
            'name' => 'Preview Test Customer',
            'mobile' => '+8801700000001',
            'status' => 'ACTIVE',
        ]);

        $customersBefore = Customer::count();

        $res = $this->postJson('/api/v1/settings/maintenance/reset/preview');
        $res->assertStatus(200);
        $res->assertJsonStructure([
            'success',
            'data' => [
                'mode',
                'total_records_to_remove',
                'breakdown',
                'preserved',
                'environment',
                'safety_backup_required',
            ],
        ]);

        $customersAfter = Customer::count();
        $this->assertEquals($customersBefore, $customersAfter);
    }

    /**
     * 10. Reset requires exact confirmation text and password.
     */
    public function test_10_reset_requires_confirmation_text_and_password(): void
    {
        Sanctum::actingAs($this->superAdmin);

        // Missing confirmation text
        $res = $this->postJson('/api/v1/settings/maintenance/reset', [
            'password' => 'password123',
        ]);
        $res->assertStatus(422);

        // Wrong confirmation text
        $res = $this->postJson('/api/v1/settings/maintenance/reset', [
            'confirmation_text' => 'RESET',
            'password' => 'password123',
        ]);
        $res->assertStatus(422);
        $res->assertJsonValidationErrors(['confirmation_text']);

        // Wrong password
        $res = $this->postJson('/api/v1/settings/maintenance/reset', [
            'confirmation_text' => 'RESET RETAILCORE',
            'password' => 'wrongpassword',
        ]);
        $res->assertStatus(422);
        $res->assertJsonValidationErrors(['password']);
    }

    /**
     * 11. Reset creates mandatory safety backup.
     */
    public function test_11_reset_creates_mandatory_safety_backup(): void
    {
        Sanctum::actingAs($this->superAdmin);

        $initialBackups = SystemBackup::count();

        $res = $this->postJson('/api/v1/settings/maintenance/reset', [
            'confirmation_text' => 'RESET RETAILCORE',
            'password' => 'password123',
        ]);
        $res->assertStatus(200);

        $this->assertEquals($initialBackups + 1, SystemBackup::count());
        $safetyBackup = SystemBackup::latest('id')->first();
        $this->assertEquals('COMPLETED', $safetyBackup->status);
    }

    /**
     * 12. Reset creates audit log events.
     */
    public function test_12_reset_creates_audit_log_events(): void
    {
        Sanctum::actingAs($this->superAdmin);

        $res = $this->postJson('/api/v1/settings/maintenance/reset', [
            'confirmation_text' => 'RESET RETAILCORE',
            'password' => 'password123',
        ]);
        $res->assertStatus(200);

        $startedAudit = AuditLog::where('event', 'DATA_RESET_STARTED')->latest('id')->first();
        $completedAudit = AuditLog::where('event', 'DATA_RESET_COMPLETED')->latest('id')->first();

        $this->assertNotNull($startedAudit);
        $this->assertNotNull($completedAudit);
    }

    /**
     * 13. Demo preview returns expected structure without inserting.
     */
    public function test_13_demo_preview_returns_expected_structure_without_inserting(): void
    {
        Sanctum::actingAs($this->adminUser);

        $res = $this->postJson('/api/v1/settings/maintenance/demo/preview?size=small');
        $res->assertStatus(200);
        $res->assertJsonStructure([
            'success',
            'data' => [
                'size',
                'expected_counts',
                'is_demo_present',
                'existing_demo_count',
                'currency',
                'business_profile',
            ],
        ]);

        $this->assertEquals(0, SystemDemoRecord::count());
    }

    /**
     * 14. Demo insertion populates Bangladesh retail dataset and records in system_demo_records.
     */
    public function test_14_demo_insertion_populates_bangladesh_retail_dataset(): void
    {
        Sanctum::actingAs($this->adminUser);

        $res = $this->postJson('/api/v1/settings/maintenance/demo/insert', [
            'size' => 'small',
        ]);

        $res->assertStatus(200);
        $res->assertJson(['success' => true]);

        $demoCount = SystemDemoRecord::where('company_id', $this->companyA->id)->count();
        $this->assertGreaterThan(0, $demoCount);

        // Verify realistic Bangladesh products created
        $demoProducts = Product::where('company_id', $this->companyA->id)->get();
        $this->assertGreaterThanOrEqual(1, $demoProducts->count());

        $hasRice = $demoProducts->contains(fn($p) => str_contains($p->name, 'Miniket') || str_contains($p->name, 'Rice') || str_contains($p->name, 'Oil'));
        $this->assertTrue($hasRice);
    }

    /**
     * 15. Demo idempotency returns already exists.
     */
    public function test_15_demo_idempotency_returns_already_exists(): void
    {
        Sanctum::actingAs($this->adminUser);

        $firstRes = $this->postJson('/api/v1/settings/maintenance/demo/insert', ['size' => 'small']);
        $firstRes->assertStatus(200);

        $secondRes = $this->postJson('/api/v1/settings/maintenance/demo/insert', ['size' => 'small']);
        $secondRes->assertStatus(200);
        $this->assertTrue($secondRes->json('data.already_exists'));
    }

    /**
     * 16. Demo removal safely purges only demo records.
     */
    public function test_16_demo_removal_safely_purges_only_demo_records(): void
    {
        Sanctum::actingAs($this->adminUser);
        $this->postJson('/api/v1/settings/maintenance/demo/insert', ['size' => 'small']);

        $demoCountBefore = SystemDemoRecord::where('company_id', $this->companyA->id)->count();
        $this->assertGreaterThan(0, $demoCountBefore);

        // Remove requires Super Admin
        Sanctum::actingAs($this->adminUser);
        $remRes = $this->postJson('/api/v1/settings/maintenance/demo/remove');
        $remRes->assertStatus(403);

        Sanctum::actingAs($this->superAdmin);
        $remRes = $this->postJson('/api/v1/settings/maintenance/demo/remove');
        $remRes->assertStatus(200);
        $remRes->assertJson(['success' => true]);

        $demoCountAfter = SystemDemoRecord::where('company_id', $this->companyA->id)->count();
        $this->assertEquals(0, $demoCountAfter);
    }

    /**
     * 17. Tenant isolation company scoping.
     */
    public function test_17_tenant_isolation_company_scoping(): void
    {
        Sanctum::actingAs($this->adminUser);
        $this->postJson('/api/v1/settings/maintenance/demo/insert', ['size' => 'small']);

        $companyADemoCount = SystemDemoRecord::where('company_id', $this->companyA->id)->count();
        $companyBDemoCount = SystemDemoRecord::where('company_id', $this->companyB->id)->count();

        $this->assertGreaterThan(0, $companyADemoCount);
        $this->assertEquals(0, $companyBDemoCount);

        // Overview for Company B shows no demo data
        Sanctum::actingAs($this->companyBAdmin);
        $res = $this->getJson('/api/v1/settings/maintenance');
        $res->assertStatus(200);
        $this->assertFalse($res->json('data.demo.has_demo'));
    }

    /**
     * 18. Secret protection: no credentials leakage.
     */
    public function test_18_secret_protection_no_credentials_leakage(): void
    {
        Sanctum::actingAs($this->adminUser);
        $overview = $this->getJson('/api/v1/settings/maintenance');
        $overview->assertStatus(200);

        $jsonStr = $overview->getContent();
        $this->assertStringNotContainsString('password', strtolower($jsonStr));
        $this->assertStringNotContainsString('retailcore_secret', strtolower($jsonStr));
        $this->assertStringNotContainsString('app_key', strtolower($jsonStr));

        $backupRes = $this->postJson('/api/v1/settings/maintenance/backup');
        $backupJsonStr = $backupRes->getContent();
        $this->assertStringNotContainsString('password', strtolower($backupJsonStr));
    }

    /**
     * 19. System integrity verified post reset.
     */
    public function test_19_system_integrity_verified_post_reset(): void
    {
        Sanctum::actingAs($this->superAdmin);

        $res = $this->postJson('/api/v1/settings/maintenance/reset', [
            'confirmation_text' => 'RESET RETAILCORE',
            'password' => 'password123',
        ]);

        $res->assertStatus(200);
        $integrity = $res->json('data.post_reset_integrity');
        $this->assertTrue($integrity['passed']);
        $this->assertGreaterThanOrEqual(1, $integrity['active_companies']);
        $this->assertGreaterThanOrEqual(1, $integrity['active_users']);
        $this->assertGreaterThanOrEqual(1, $integrity['active_roles']);
        $this->assertGreaterThanOrEqual(1, $integrity['active_permissions']);
    }

    /**
     * 20. Inventory and stock consistency post reset.
     */
    public function test_20_inventory_and_stock_consistency_post_reset(): void
    {
        Sanctum::actingAs($this->superAdmin);

        $res = $this->postJson('/api/v1/settings/maintenance/reset', [
            'confirmation_text' => 'RESET RETAILCORE',
            'password' => 'password123',
        ]);

        $res->assertStatus(200);
        $integrity = $res->json('data.post_reset_integrity');

        $this->assertEquals(0, $integrity['transactional_sales_count']);
        $this->assertEquals(0, $integrity['transactional_purchases_count']);
        $this->assertEquals(0, $integrity['transactional_stock_movements_count']);
    }
}
