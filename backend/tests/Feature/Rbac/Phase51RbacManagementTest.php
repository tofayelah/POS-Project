<?php

namespace Tests\Feature\Rbac;

use App\Models\AuditLog;
use App\Models\Company;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class Phase51RbacManagementTest extends TestCase
{
    use RefreshDatabase;

    protected Company $companyA;
    protected Company $companyB;
    protected User $superAdmin;
    protected User $adminUser;
    protected User $staffUser;
    protected User $otherTenantAdmin;

    protected Role $superAdminRole;
    protected Role $adminRole;
    protected Role $managerRole;
    protected Role $cashierRole;

    protected Permission $permRolesView;
    protected Permission $permRolesCreate;
    protected Permission $permRolesUpdate;
    protected Permission $permRolesDelete;
    protected Permission $permPermsView;
    protected Permission $permUsersView;
    protected Permission $permUsersUpdate;
    protected Permission $permPosView;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Companies
        $this->companyA = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Apex Retail Company A',
            'code' => 'P51-A',
            'country' => 'Bangladesh',
        ]);

        $this->companyB = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Trust Retail Company B',
            'code' => 'P51-B',
            'country' => 'Bangladesh',
        ]);

        // 2. Roles
        $this->superAdminRole = Role::firstOrCreate(['name' => 'Super Admin', 'description' => 'System Super Administrator']);
        $this->adminRole = Role::firstOrCreate(['name' => 'Admin', 'description' => 'Company Administrator']);
        $this->managerRole = Role::firstOrCreate(['name' => 'Manager', 'description' => 'Branch Manager']);
        $this->cashierRole = Role::firstOrCreate(['name' => 'Cashier', 'description' => 'POS Cashier']);

        // 3. Permissions
        $this->permRolesView = Permission::firstOrCreate(['name' => 'roles.view'], ['group' => 'roles']);
        $this->permRolesCreate = Permission::firstOrCreate(['name' => 'roles.create'], ['group' => 'roles']);
        $this->permRolesUpdate = Permission::firstOrCreate(['name' => 'roles.update'], ['group' => 'roles']);
        $this->permRolesDelete = Permission::firstOrCreate(['name' => 'roles.delete'], ['group' => 'roles']);
        $this->permPermsView = Permission::firstOrCreate(['name' => 'permissions.view'], ['group' => 'roles']);
        $this->permUsersView = Permission::firstOrCreate(['name' => 'users.view'], ['group' => 'users']);
        $this->permUsersUpdate = Permission::firstOrCreate(['name' => 'users.update'], ['group' => 'users']);
        $this->permPosView = Permission::firstOrCreate(['name' => 'pos.view'], ['group' => 'pos']);

        // 4. Users
        $this->superAdmin = User::factory()->create(['name' => 'Master Super Admin', 'email' => 'superadmin@pos.test']);
        $this->superAdmin->roles()->attach($this->superAdminRole->id);

        $this->adminUser = User::factory()->create(['name' => 'Company Admin A', 'email' => 'admin.a@pos.test']);
        $this->adminUser->companies()->attach($this->companyA->id);
        $this->adminUser->roles()->attach($this->adminRole->id);

        // Staff user has Cashier role with ONLY pos.view
        $this->cashierRole->permissions()->sync([$this->permPosView->id]);
        $this->staffUser = User::factory()->create(['name' => 'Staff Cashier A', 'email' => 'cashier.a@pos.test']);
        $this->staffUser->companies()->attach($this->companyA->id);
        $this->staffUser->roles()->attach($this->cashierRole->id);

        $this->otherTenantAdmin = User::factory()->create(['name' => 'Company Admin B', 'email' => 'admin.b@pos.test']);
        $this->otherTenantAdmin->companies()->attach($this->companyB->id);
        $this->otherTenantAdmin->roles()->attach($this->adminRole->id);
    }

    /**
     * 1. 401 unauthenticated check.
     */
    public function test_unauthenticated_request_is_rejected(): void
    {
        $response = $this->getJson('/api/v1/roles');
        $response->assertStatus(401);
    }

    /**
     * 2. Authorized user can list roles.
     */
    public function test_authorized_user_can_list_roles(): void
    {
        $response = $this->actingAs($this->superAdmin)->getJson('/api/v1/roles');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertNotEmpty($response->json('data'));
        $this->assertArrayHasKey('permissions_count', $response->json('data.0'));
        $this->assertArrayHasKey('users_count', $response->json('data.0'));
    }

    /**
     * 3. Unauthorized user cannot list roles (403).
     */
    public function test_unauthorized_user_cannot_list_roles(): void
    {
        $response = $this->actingAs($this->staffUser)->getJson('/api/v1/roles');
        $response->assertStatus(403);
    }

    /**
     * 4. Authorized user can create role.
     */
    public function test_authorized_user_can_create_role(): void
    {
        $payload = [
            'name' => 'Auditor',
            'description' => 'Financial Auditor',
            'permission_ids' => [$this->permPosView->id],
        ];

        $response = $this->actingAs($this->superAdmin)->postJson('/api/v1/roles', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Role created successfully.',
                'data' => [
                    'name' => 'Auditor',
                    'description' => 'Financial Auditor',
                ]
            ]);

        $this->assertDatabaseHas('roles', ['name' => 'Auditor']);
        $newRole = Role::where('name', 'Auditor')->first();
        $this->assertTrue($newRole->permissions->contains('id', $this->permPosView->id));

        // Audit log check
        $this->assertTrue(AuditLog::where('event', 'ROLE_CREATED')->where('auditable_id', $newRole->id)->exists());
    }

    /**
     * 5. Duplicate role name is rejected (422).
     */
    public function test_duplicate_role_name_is_rejected(): void
    {
        $payload = [
            'name' => 'Cashier',
            'description' => 'Duplicate Role',
        ];

        $response = $this->actingAs($this->superAdmin)->postJson('/api/v1/roles', $payload);
        $response->assertStatus(422);
    }

    /**
     * 6. Authorized user can update role.
     */
    public function test_authorized_user_can_update_role(): void
    {
        $role = Role::create(['name' => 'Supervisor', 'description' => 'Old description']);

        $response = $this->actingAs($this->superAdmin)->putJson("/api/v1/roles/{$role->id}", [
            'name' => 'Floor Supervisor',
            'description' => 'Updated description',
        ]);

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertEquals('Floor Supervisor', $role->fresh()->name);
        $this->assertEquals('Updated description', $role->fresh()->description);

        $this->assertTrue(AuditLog::where('event', 'ROLE_UPDATED')->where('auditable_id', $role->id)->exists());
    }

    /**
     * 7. System protected role "Super Admin" cannot be renamed.
     */
    public function test_super_admin_role_cannot_be_renamed(): void
    {
        $response = $this->actingAs($this->superAdmin)->putJson("/api/v1/roles/{$this->superAdminRole->id}", [
            'name' => 'Renamed Super Admin',
            'description' => 'Attempting rename',
        ]);

        $response->assertStatus(422)
            ->assertJson(['success' => false]);
    }

    /**
     * 8. Protected roles ("Super Admin", "Admin") cannot be deleted.
     */
    public function test_protected_roles_cannot_be_deleted(): void
    {
        $response1 = $this->actingAs($this->superAdmin)->deleteJson("/api/v1/roles/{$this->superAdminRole->id}");
        $response1->assertStatus(422);

        $response2 = $this->actingAs($this->superAdmin)->deleteJson("/api/v1/roles/{$this->adminRole->id}");
        $response2->assertStatus(422);
    }

    /**
     * 9. Role with assigned users cannot be deleted.
     */
    public function test_role_with_assigned_users_cannot_be_deleted(): void
    {
        $customRole = Role::create(['name' => 'Custom Role']);
        $this->staffUser->roles()->attach($customRole->id);

        $response = $this->actingAs($this->superAdmin)->deleteJson("/api/v1/roles/{$customRole->id}");

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => "Cannot delete role 'Custom Role' because it is assigned to 1 user(s). Reassign users first."
            ]);

        $this->assertDatabaseHas('roles', ['id' => $customRole->id]);
    }

    /**
     * 10. Role without users can be safely deleted.
     */
    public function test_safe_role_deletion(): void
    {
        $customRole = Role::create(['name' => 'Obsolete Role']);
        $customRole->permissions()->attach($this->permPosView->id);

        $response = $this->actingAs($this->superAdmin)->deleteJson("/api/v1/roles/{$customRole->id}");

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertDatabaseMissing('roles', ['id' => $customRole->id]);
        $this->assertDatabaseMissing('role_permission', ['role_id' => $customRole->id]);

        $this->assertTrue(AuditLog::where('event', 'ROLE_DELETED')->where('auditable_id', $customRole->id)->exists());
    }

    /**
     * 11. Permission list endpoint returns permissions grouped or flat.
     */
    public function test_permission_list_endpoint(): void
    {
        $response = $this->actingAs($this->superAdmin)->getJson('/api/v1/permissions?grouped=true');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertArrayHasKey('roles', $response->json('data'));
    }

    /**
     * 12. Role permissions sync works and validates permission IDs.
     */
    public function test_sync_role_permissions(): void
    {
        $role = Role::create(['name' => 'Store Assistant']);

        // Invalid permission ID should fail
        $invalidResp = $this->actingAs($this->superAdmin)->putJson("/api/v1/roles/{$role->id}/permissions", [
            'permission_ids' => [999999],
        ]);
        $invalidResp->assertStatus(422);

        // Valid sync
        $validResp = $this->actingAs($this->superAdmin)->putJson("/api/v1/roles/{$role->id}/permissions", [
            'permission_ids' => [$this->permPosView->id, $this->permRolesView->id],
        ]);

        $validResp->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertEquals(2, $role->fresh()->permissions()->count());

        $this->assertTrue(AuditLog::where('event', 'ROLE_PERMISSIONS_SYNCED')->where('auditable_id', $role->id)->exists());
    }

    /**
     * 13. User roles listing and synchronization.
     */
    public function test_user_roles_listing_and_sync(): void
    {
        $testUser = User::factory()->create();
        $testUser->companies()->attach($this->companyA->id);
        $testUser->roles()->attach($this->cashierRole->id);

        // Get user roles
        $listResp = $this->actingAs($this->adminUser)->getJson("/api/v1/users/{$testUser->id}/roles");
        $listResp->assertStatus(200)
            ->assertJson(['success' => true]);
        $this->assertCount(1, $listResp->json('data'));

        // Sync user roles to Manager
        $syncResp = $this->actingAs($this->adminUser)->putJson("/api/v1/users/{$testUser->id}/roles", [
            'role_ids' => [$this->managerRole->id],
        ]);

        $syncResp->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertTrue($testUser->fresh()->roles->contains('id', $this->managerRole->id));
        $this->assertFalse($testUser->fresh()->roles->contains('id', $this->cashierRole->id));

        $this->assertTrue(AuditLog::where('event', 'USER_ROLES_SYNCED')->where('auditable_id', $testUser->id)->exists());
    }

    /**
     * 14. Cross-company user role modification is rejected (403).
     */
    public function test_cross_company_user_role_modification_is_rejected(): void
    {
        $targetUserCompanyB = User::factory()->create();
        $targetUserCompanyB->companies()->attach($this->companyB->id);
        $targetUserCompanyB->roles()->attach($this->cashierRole->id);

        // Admin of Company A tries to modify roles for a user in Company B
        $response = $this->actingAs($this->adminUser)->putJson("/api/v1/users/{$targetUserCompanyB->id}/roles", [
            'role_ids' => [$this->managerRole->id],
        ]);

        $response->assertStatus(403);
    }

    /**
     * 15. Administrator lockout protection: cannot remove Super Admin from the only Super Admin.
     */
    public function test_cannot_remove_super_admin_from_only_super_admin(): void
    {
        // Try to remove Super Admin role from the only Super Admin
        $response = $this->actingAs($this->superAdmin)->putJson("/api/v1/users/{$this->superAdmin->id}/roles", [
            'role_ids' => [$this->cashierRole->id],
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'Cannot remove Super Admin role from the only remaining Super Admin user in the system.'
            ]);

        $this->assertTrue($this->superAdmin->fresh()->roles->contains('id', $this->superAdminRole->id));
    }
}
