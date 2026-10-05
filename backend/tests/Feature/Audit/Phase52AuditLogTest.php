<?php

namespace Tests\Feature\Audit;

use App\Models\AuditLog;
use App\Models\Company;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Phase52AuditLogTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $authorizedAdminA;
    protected User $unauthorizedUserA;
    protected User $adminCompanyB;
    protected Company $companyA;
    protected Company $companyB;
    protected Role $adminRole;
    protected Role $staffRole;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Setup Permissions
        $auditPermission = Permission::firstOrCreate(['name' => 'audit_logs.view'], ['group' => 'audit']);
        $userViewPerm = Permission::firstOrCreate(['name' => 'users.view'], ['group' => 'users']);

        // 2. Setup Roles
        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin']);
        $superAdminRole->permissions()->syncWithoutDetaching([$auditPermission->id, $userViewPerm->id]);

        $this->adminRole = Role::firstOrCreate(['name' => 'Admin']);
        $this->adminRole->permissions()->syncWithoutDetaching([$auditPermission->id, $userViewPerm->id]);

        $otherPerm = Permission::firstOrCreate(['name' => 'products.view'], ['group' => 'products']);
        $this->staffRole = Role::firstOrCreate(['name' => 'Staff']);
        $this->staffRole->permissions()->sync([$otherPerm->id]);

        // 3. Setup Companies
        $this->companyA = Company::create([
            'name' => 'Company Alpha',
            'code' => 'ALPHA',
            'email' => 'alpha@test.com',
            'status' => 'active',
        ]);

        $this->companyB = Company::create([
            'name' => 'Company Beta',
            'code' => 'BETA',
            'email' => 'beta@test.com',
            'status' => 'active',
        ]);

        // 4. Setup Users
        $this->superAdmin = User::factory()->create([
            'name' => 'Root Super Admin',
            'email' => 'root@retailcore.test',
            'company_id' => $this->companyA->id,
        ]);
        $this->superAdmin->roles()->sync([$superAdminRole->id]);
        $this->superAdmin->companies()->sync([$this->companyA->id, $this->companyB->id]);

        $this->authorizedAdminA = User::factory()->create([
            'name' => 'Admin Alpha',
            'email' => 'admin.alpha@retailcore.test',
            'company_id' => $this->companyA->id,
        ]);
        $this->authorizedAdminA->roles()->sync([$this->adminRole->id]);
        $this->authorizedAdminA->companies()->sync([$this->companyA->id]);

        $this->unauthorizedUserA = User::factory()->create([
            'name' => 'Staff Alpha',
            'email' => 'staff.alpha@retailcore.test',
            'company_id' => $this->companyA->id,
        ]);
        $this->unauthorizedUserA->roles()->sync([$this->staffRole->id]);
        $this->unauthorizedUserA->companies()->sync([$this->companyA->id]);

        $this->adminCompanyB = User::factory()->create([
            'name' => 'Admin Beta',
            'email' => 'admin.beta@retailcore.test',
            'company_id' => $this->companyB->id,
        ]);
        $this->adminCompanyB->roles()->sync([$this->adminRole->id]);
        $this->adminCompanyB->companies()->sync([$this->companyB->id]);
    }

    public function test_01_unauthenticated_user_receives_401(): void
    {
        $response = $this->getJson('/api/v1/audit-logs');
        $response->assertStatus(401);
    }

    public function test_02_unauthorized_user_receives_403(): void
    {
        $response = $this->actingAs($this->unauthorizedUserA)->getJson('/api/v1/audit-logs');
        $response->assertStatus(403);
    }

    public function test_03_authorized_user_can_list_audit_logs(): void
    {
        AuditLog::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'company_id' => $this->companyA->id,
            'user_id' => $this->authorizedAdminA->id,
            'event' => 'CUSTOMER_CREATED',
            'auditable_type' => 'App\\Models\\Customer',
            'auditable_id' => 10,
            'new_values' => ['name' => 'John Doe'],
            'ip_address' => '127.0.0.1',
        ]);

        $response = $this->actingAs($this->authorizedAdminA)->getJson('/api/v1/audit-logs');
        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => ['id', 'uuid', 'company_id', 'user_id', 'event', 'auditable_type', 'auditable_id', 'created_at']
                ],
                'meta' => ['current_page', 'per_page', 'total', 'last_page']
            ]);

        $this->assertCount(1, $response->json('data'));
    }

    public function test_04_tenant_isolation_enforced(): void
    {
        // Company A record
        AuditLog::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'company_id' => $this->companyA->id,
            'user_id' => $this->authorizedAdminA->id,
            'event' => 'ROLE_CREATED',
            'auditable_type' => 'App\\Models\\Role',
            'auditable_id' => 1,
            'new_values' => ['name' => 'Store Cashier'],
        ]);

        // Company B record
        AuditLog::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'company_id' => $this->companyB->id,
            'user_id' => $this->adminCompanyB->id,
            'event' => 'ROLE_CREATED',
            'auditable_type' => 'App\\Models\\Role',
            'auditable_id' => 2,
            'new_values' => ['name' => 'Warehouse Lead'],
        ]);

        // Admin of Company A can only see Company A logs
        $responseA = $this->actingAs($this->authorizedAdminA)->getJson('/api/v1/audit-logs');
        $responseA->assertStatus(200);
        $this->assertCount(1, $responseA->json('data'));
        $this->assertEquals($this->companyA->id, $responseA->json('data.0.company_id'));

        // Admin of Company B can only see Company B logs
        $responseB = $this->actingAs($this->adminCompanyB)->getJson('/api/v1/audit-logs');
        $responseB->assertStatus(200);
        $this->assertCount(1, $responseB->json('data'));
        $this->assertEquals($this->companyB->id, $responseB->json('data.0.company_id'));

        // Super Admin can see all logs
        $responseSuper = $this->actingAs($this->superAdmin)->getJson('/api/v1/audit-logs');
        $responseSuper->assertStatus(200);
        $this->assertCount(2, $responseSuper->json('data'));
    }

    public function test_05_cross_tenant_query_parameter_injection_rejected(): void
    {
        // Admin A tries to pass company_id = company B
        $response = $this->actingAs($this->authorizedAdminA)->getJson('/api/v1/audit-logs?company_id=' . $this->companyB->id);
        $response->assertStatus(403)
            ->assertJsonPath('success', false);
    }

    public function test_06_pagination_works(): void
    {
        for ($i = 1; $i <= 15; $i++) {
            AuditLog::create([
                'uuid' => (string) \Illuminate\Support\Str::uuid(),
                'company_id' => $this->companyA->id,
                'user_id' => $this->authorizedAdminA->id,
                'event' => "CUSTOMER_CREATED_{$i}",
            ]);
        }

        $response = $this->actingAs($this->authorizedAdminA)->getJson('/api/v1/audit-logs?per_page=5&page=2');
        $response->assertStatus(200)
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.per_page', 5)
            ->assertJsonPath('meta.total', 15)
            ->assertJsonPath('meta.last_page', 3);

        $this->assertCount(5, $response->json('data'));
    }

    public function test_07_search_filter_works(): void
    {
        AuditLog::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'company_id' => $this->companyA->id,
            'user_id' => $this->authorizedAdminA->id,
            'event' => 'JOURNAL_POSTED',
            'auditable_type' => 'App\\Models\\JournalEntry',
            'auditable_id' => 101,
            'ip_address' => '192.168.1.50',
        ]);

        AuditLog::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'company_id' => $this->companyA->id,
            'user_id' => $this->authorizedAdminA->id,
            'event' => 'CUSTOMER_CREATED',
            'auditable_type' => 'App\\Models\\Customer',
            'auditable_id' => 202,
            'ip_address' => '10.0.0.1',
        ]);

        // Search by IP
        $resIp = $this->actingAs($this->authorizedAdminA)->getJson('/api/v1/audit-logs?search=192.168.1.50');
        $resIp->assertStatus(200);
        $this->assertCount(1, $resIp->json('data'));
        $this->assertEquals('JOURNAL_POSTED', $resIp->json('data.0.event'));

        // Search by event name
        $resEvent = $this->actingAs($this->authorizedAdminA)->getJson('/api/v1/audit-logs?search=CUSTOMER');
        $resEvent->assertStatus(200);
        $this->assertCount(1, $resEvent->json('data'));
        $this->assertEquals('CUSTOMER_CREATED', $resEvent->json('data.0.event'));
    }

    public function test_08_action_and_module_filters(): void
    {
        AuditLog::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'company_id' => $this->companyA->id,
            'user_id' => $this->authorizedAdminA->id,
            'event' => 'ROLE_PERMISSIONS_SYNCED',
            'auditable_type' => 'App\\Models\\Role',
            'auditable_id' => 5,
        ]);

        AuditLog::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'company_id' => $this->companyA->id,
            'user_id' => $this->authorizedAdminA->id,
            'event' => 'JOURNAL_POSTED',
            'auditable_type' => 'App\\Models\\JournalEntry',
            'auditable_id' => 12,
        ]);

        // Filter by action
        $resAction = $this->actingAs($this->authorizedAdminA)->getJson('/api/v1/audit-logs?action=ROLE_PERMISSIONS_SYNCED');
        $resAction->assertStatus(200);
        $this->assertCount(1, $resAction->json('data'));
        $this->assertEquals('ROLE_PERMISSIONS_SYNCED', $resAction->json('data.0.event'));

        // Filter by module
        $resModule = $this->actingAs($this->authorizedAdminA)->getJson('/api/v1/audit-logs?module=JournalEntry');
        $resModule->assertStatus(200);
        $this->assertCount(1, $resModule->json('data'));
        $this->assertEquals('JOURNAL_POSTED', $resModule->json('data.0.event'));
    }

    public function test_09_user_filter_works(): void
    {
        $secondUser = User::factory()->create([
            'company_id' => $this->companyA->id,
            'name' => 'Second User',
        ]);
        $secondUser->companies()->sync([$this->companyA->id]);

        AuditLog::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'company_id' => $this->companyA->id,
            'user_id' => $this->authorizedAdminA->id,
            'event' => 'ACTION_ONE',
        ]);

        AuditLog::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'company_id' => $this->companyA->id,
            'user_id' => $secondUser->id,
            'event' => 'ACTION_TWO',
        ]);

        $res = $this->actingAs($this->authorizedAdminA)->getJson('/api/v1/audit-logs?user_id=' . $secondUser->id);
        $res->assertStatus(200);
        $this->assertCount(1, $res->json('data'));
        $this->assertEquals('ACTION_TWO', $res->json('data.0.event'));
    }

    public function test_10_date_range_filter_and_validation(): void
    {
        $logPast = AuditLog::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'company_id' => $this->companyA->id,
            'user_id' => $this->authorizedAdminA->id,
            'event' => 'LOG_PAST',
        ]);
        $logPast->created_at = now()->subDays(10);
        $logPast->saveQuietly();

        $logRecent = AuditLog::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'company_id' => $this->companyA->id,
            'user_id' => $this->authorizedAdminA->id,
            'event' => 'LOG_RECENT',
        ]);
        $logRecent->created_at = now();
        $logRecent->saveQuietly();

        // Valid date range (last 2 days)
        $dateFrom = now()->subDays(2)->toDateString();
        $dateTo = now()->toDateString();
        $resRange = $this->actingAs($this->authorizedAdminA)->getJson("/api/v1/audit-logs?date_from={$dateFrom}&date_to={$dateTo}");
        $resRange->assertStatus(200);
        $this->assertCount(1, $resRange->json('data'));
        $this->assertEquals('LOG_RECENT', $resRange->json('data.0.event'));

        // Invalid date range (date_from > date_to)
        $resInvalid = $this->actingAs($this->authorizedAdminA)->getJson("/api/v1/audit-logs?date_from={$dateTo}&date_to={$dateFrom}");
        $resInvalid->assertStatus(422)
            ->assertJsonValidationErrors(['date_to']);
    }

    public function test_11_detail_endpoint_and_cross_tenant_rejection(): void
    {
        $logA = AuditLog::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'company_id' => $this->companyA->id,
            'user_id' => $this->authorizedAdminA->id,
            'event' => 'USER_ROLES_SYNCED',
            'auditable_type' => 'App\\Models\\User',
            'auditable_id' => $this->authorizedAdminA->id,
            'new_values' => ['roles' => ['Admin']],
            'ip_address' => '10.10.10.10',
            'user_agent' => 'RetailCore POS Terminal 01',
        ]);

        $logB = AuditLog::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'company_id' => $this->companyB->id,
            'user_id' => $this->adminCompanyB->id,
            'event' => 'COMPANY_B_EVENT',
        ]);

        // Authorized detail access
        $resA = $this->actingAs($this->authorizedAdminA)->getJson('/api/v1/audit-logs/' . $logA->id);
        $resA->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.event', 'USER_ROLES_SYNCED')
            ->assertJsonPath('data.user_agent', 'RetailCore POS Terminal 01');

        // Cross-tenant detail access returns 404
        $resCross = $this->actingAs($this->authorizedAdminA)->getJson('/api/v1/audit-logs/' . $logB->id);
        $resCross->assertStatus(404);
    }

    public function test_12_sensitive_data_is_redacted(): void
    {
        $log = AuditLog::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'company_id' => $this->companyA->id,
            'user_id' => $this->authorizedAdminA->id,
            'event' => 'USER_UPDATED',
            'old_values' => [
                'name' => 'Old Name',
                'password' => 'secret_hash_value',
                'token' => 'plain_text_token_123',
            ],
            'new_values' => [
                'name' => 'New Name',
                'password' => 'new_secret_hash',
                'api_key' => 'secret_api_key_abc',
            ],
        ]);

        $res = $this->actingAs($this->authorizedAdminA)->getJson('/api/v1/audit-logs/' . $log->id);
        $res->assertStatus(200);

        $oldValues = $res->json('data.old_values');
        $newValues = $res->json('data.new_values');

        $this->assertEquals('Old Name', $oldValues['name']);
        $this->assertEquals('********', $oldValues['password']);
        $this->assertEquals('********', $oldValues['token']);

        $this->assertEquals('New Name', $newValues['name']);
        $this->assertEquals('********', $newValues['password']);
        $this->assertEquals('********', $newValues['api_key']);
    }

    public function test_13_audit_records_are_immutable_via_api(): void
    {
        $log = AuditLog::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'company_id' => $this->companyA->id,
            'user_id' => $this->authorizedAdminA->id,
            'event' => 'IMMUTABLE_LOG',
        ]);

        // POST rejected with 405
        $this->actingAs($this->authorizedAdminA)
            ->postJson('/api/v1/audit-logs', ['event' => 'FAKE'])
            ->assertStatus(405);

        // PUT rejected with 405
        $this->actingAs($this->authorizedAdminA)
            ->putJson('/api/v1/audit-logs/' . $log->id, ['event' => 'MUTATED'])
            ->assertStatus(405);

        // DELETE rejected with 405
        $this->actingAs($this->authorizedAdminA)
            ->deleteJson('/api/v1/audit-logs/' . $log->id)
            ->assertStatus(405);
    }

    public function test_14_audit_records_are_immutable_at_model_layer(): void
    {
        $log = AuditLog::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'company_id' => $this->companyA->id,
            'user_id' => $this->authorizedAdminA->id,
            'event' => 'TEST_EVENT',
        ]);

        $this->expectException(\DomainException::class);
        $log->update(['event' => 'ALTERED_EVENT']);
    }

    public function test_15_arbitrary_sort_injection_is_sanitized(): void
    {
        AuditLog::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'company_id' => $this->companyA->id,
            'user_id' => $this->authorizedAdminA->id,
            'event' => 'SORT_ONE',
        ]);

        // Malicious sort param - safely defaults to created_at
        $res = $this->actingAs($this->authorizedAdminA)->getJson('/api/v1/audit-logs?sort=non_existent_column;DROP TABLE users;--&direction=INVALID');
        $res->assertStatus(200);
        $this->assertCount(1, $res->json('data'));
    }
}
