<?php

namespace Tests\Feature\Organization;

use Tests\TestCase;
use App\Models\User;
use App\Models\Company;
use App\Models\BusinessUnit;
use App\Models\Branch;
use App\Models\Warehouse;
use App\Models\StorageLocation;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

class OrganizationTenantManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $userA;
    protected User $userB;
    protected User $multiTenantUser;

    protected Company $companyA;
    protected Company $companyB;

    protected BusinessUnit $businessUnitA;
    protected BusinessUnit $businessUnitB;

    protected Branch $branchA;
    protected Branch $branchB;

    protected Warehouse $warehouseA;
    protected Warehouse $warehouseB;

    protected StorageLocation $storageLocationA;
    protected StorageLocation $storageLocationB;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Roles & Permissions setup
        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin']);
        $adminRole = Role::firstOrCreate(['name' => 'Admin']);
        $managerRole = Role::firstOrCreate(['name' => 'Manager']);

        $permissions = [
            'companies.view',
            'companies.create',
            'companies.update',
            'users.view',
            'users.create',
            'users.update',
            'users.delete',
            'users.company_access',
            'roles.view',
            'business_units.view',
            'business_units.create',
            'business_units.update',
            'business_units.delete',
            'branches.view',
            'branches.create',
            'branches.update',
            'branches.delete',
            'warehouses.view',
            'warehouses.create',
            'warehouses.update',
            'warehouses.delete',
            'storage_locations.view',
            'storage_locations.create',
            'storage_locations.update',
            'storage_locations.delete',
        ];

        foreach ($permissions as $perm) {
            $p = Permission::firstOrCreate(['name' => $perm], ['group' => 'organization']);
            $superAdminRole->permissions()->syncWithoutDetaching([$p->id]);
            $adminRole->permissions()->syncWithoutDetaching([$p->id]);
            if (str_ends_with($perm, '.view')) {
                $managerRole->permissions()->syncWithoutDetaching([$p->id]);
            }
        }

        // 2. Companies
        $this->companyA = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Alpha Corporation',
            'legal_name' => 'Alpha Corp Ltd.',
            'code' => 'ALPHA-01',
            'country' => 'Bangladesh',
            'currency_code' => 'BDT',
            'timezone' => 'Asia/Dhaka',
            'status' => 'active',
        ]);

        $this->companyB = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Beta Enterprises',
            'legal_name' => 'Beta Ent Ltd.',
            'code' => 'BETA-02',
            'country' => 'Bangladesh',
            'currency_code' => 'BDT',
            'timezone' => 'Asia/Dhaka',
            'status' => 'active',
        ]);

        // 3. Users
        $this->superAdmin = User::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Global Super Admin',
            'email' => 'superadmin@retailcore.test',
            'password' => bcrypt('password123'),
            'status' => 'active',
        ]);
        $this->superAdmin->roles()->attach($superAdminRole->id);

        $this->userA = User::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Admin Alpha',
            'email' => 'admin.alpha@retailcore.test',
            'password' => bcrypt('password123'),
            'status' => 'active',
        ]);
        $this->userA->roles()->attach($adminRole->id);
        $this->userA->companies()->attach($this->companyA->id);

        $this->userB = User::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Admin Beta',
            'email' => 'admin.beta@retailcore.test',
            'password' => bcrypt('password123'),
            'status' => 'active',
        ]);
        $this->userB->roles()->attach($adminRole->id);
        $this->userB->companies()->attach($this->companyB->id);

        $this->multiTenantUser = User::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Dual Tenant User',
            'email' => 'dual@retailcore.test',
            'password' => bcrypt('password123'),
            'status' => 'active',
        ]);
        $this->multiTenantUser->roles()->attach($managerRole->id);
        $this->multiTenantUser->companies()->attach([$this->companyA->id, $this->companyB->id]);

        // 4. Business Units
        $this->businessUnitA = BusinessUnit::create([
            'company_id' => $this->companyA->id,
            'name' => 'Alpha Retail BU',
            'code' => 'A-BU',
            'status' => 'active',
        ]);

        $this->businessUnitB = BusinessUnit::create([
            'company_id' => $this->companyB->id,
            'name' => 'Beta Wholesale BU',
            'code' => 'B-BU',
            'status' => 'active',
        ]);

        // 5. Branches
        $this->branchA = Branch::create([
            'company_id' => $this->companyA->id,
            'business_unit_id' => $this->businessUnitA->id,
            'name' => 'Alpha Main Branch',
            'code' => 'A-BR-01',
            'status' => 'active',
        ]);

        $this->branchB = Branch::create([
            'company_id' => $this->companyB->id,
            'business_unit_id' => $this->businessUnitB->id,
            'name' => 'Beta Main Branch',
            'code' => 'B-BR-01',
            'status' => 'active',
        ]);

        // 6. Warehouses
        $this->warehouseA = Warehouse::create([
            'company_id' => $this->companyA->id,
            'business_unit_id' => $this->businessUnitA->id,
            'branch_id' => $this->branchA->id,
            'name' => 'Alpha Central Warehouse',
            'code' => 'A-WH-01',
            'status' => 'active',
        ]);

        $this->warehouseB = Warehouse::create([
            'company_id' => $this->companyB->id,
            'business_unit_id' => $this->businessUnitB->id,
            'branch_id' => $this->branchB->id,
            'name' => 'Beta Central Warehouse',
            'code' => 'B-WH-01',
            'status' => 'active',
        ]);

        // 7. Storage Locations
        $this->storageLocationA = StorageLocation::create([
            'company_id' => $this->companyA->id,
            'warehouse_id' => $this->warehouseA->id,
            'code' => 'LOC-A1',
            'name' => 'Alpha Shelf 1',
            'is_active' => true,
        ]);

        $this->storageLocationB = StorageLocation::create([
            'company_id' => $this->companyB->id,
            'warehouse_id' => $this->warehouseB->id,
            'code' => 'LOC-B1',
            'name' => 'Beta Shelf 1',
            'is_active' => true,
        ]);
    }

    /**
     * 1. Super Admin can access authorized companies.
     */
    public function test_super_admin_can_access_authorized_companies(): void
    {
        $response = $this->actingAs($this->superAdmin)->getJson('/api/v1/companies');
        $response->assertStatus(200);

        $companies = collect($response->json('data'));
        $this->assertTrue($companies->contains('id', $this->companyA->id));
        $this->assertTrue($companies->contains('id', $this->companyB->id));

        // Super admin can view specific company details
        $resA = $this->actingAs($this->superAdmin)->getJson("/api/v1/companies/{$this->companyA->id}");
        $resA->assertStatus(200)->assertJsonPath('data.name', 'Alpha Corporation');

        $resB = $this->actingAs($this->superAdmin)->getJson("/api/v1/companies/{$this->companyB->id}");
        $resB->assertStatus(200)->assertJsonPath('data.name', 'Beta Enterprises');
    }

    /**
     * 2. Unauthorized user cannot access another company.
     */
    public function test_unauthorized_user_cannot_access_another_company(): void
    {
        // User A attempts to view Company B by route param
        $response = $this->actingAs($this->userA)->getJson("/api/v1/companies/{$this->companyB->id}");
        $response->assertStatus(403);

        // User A attempts to access Company B via X-Company-ID header
        $headerResponse = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => (string) $this->companyB->id])
            ->getJson('/api/v1/company');
        $headerResponse->assertStatus(403);
    }

    /**
     * 3. User-company assignment works.
     */
    public function test_user_company_assignment_works(): void
    {
        $newUser = User::create([
            'name' => 'New Staff',
            'email' => 'staff@retailcore.test',
            'password' => bcrypt('password123'),
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->userA)->postJson("/api/v1/companies/{$this->companyA->id}/users", [
            'user_id' => $newUser->id,
            'role' => 'Manager',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('user_company_access', [
            'user_id' => $newUser->id,
            'company_id' => $this->companyA->id,
        ]);
        $this->assertTrue($newUser->fresh()->hasCompanyAccess($this->companyA->id));
    }

    /**
     * 4. User retains other company assignments upon assignment and removal.
     */
    public function test_user_retains_other_company_assignments(): void
    {
        $this->assertTrue($this->multiTenantUser->hasCompanyAccess($this->companyA->id));
        $this->assertTrue($this->multiTenantUser->hasCompanyAccess($this->companyB->id));

        // Admin A removes multiTenantUser from Company A
        $response = $this->actingAs($this->userA)->deleteJson(
            "/api/v1/companies/{$this->companyA->id}/users/{$this->multiTenantUser->id}"
        );
        $response->assertStatus(200);

        // Verify removed from Company A
        $this->assertDatabaseMissing('user_company_access', [
            'user_id' => $this->multiTenantUser->id,
            'company_id' => $this->companyA->id,
        ]);

        // Verify still present in Company B
        $this->assertDatabaseHas('user_company_access', [
            'user_id' => $this->multiTenantUser->id,
            'company_id' => $this->companyB->id,
        ]);
        $this->assertTrue($this->multiTenantUser->fresh()->hasCompanyAccess($this->companyB->id));
    }

    /**
     * 5. Business Unit company isolation.
     */
    public function test_business_unit_company_isolation(): void
    {
        // User A listing business units only gets Company A BUs
        $response = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => (string) $this->companyA->id])
            ->getJson('/api/v1/business-units');
        $response->assertStatus(200);

        $bus = collect($response->json('data'));
        $this->assertTrue($bus->contains('id', $this->businessUnitA->id));
        $this->assertFalse($bus->contains('id', $this->businessUnitB->id));

        // Direct access to Company B's BU is denied (403 or 404)
        $directResponse = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => (string) $this->companyA->id])
            ->getJson("/api/v1/business-units/{$this->businessUnitB->id}");
        $this->assertContains($directResponse->status(), [403, 404]);
    }

    /**
     * 6. Branch company isolation.
     */
    public function test_branch_company_isolation(): void
    {
        // User A listing branches only gets Company A branches
        $response = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => (string) $this->companyA->id])
            ->getJson('/api/v1/branches');
        $response->assertStatus(200);

        $branches = collect($response->json('data'));
        $this->assertTrue($branches->contains('id', $this->branchA->id));
        $this->assertFalse($branches->contains('id', $this->branchB->id));

        // Direct access to Company B's Branch is denied (403 or 404)
        $directResponse = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => (string) $this->companyA->id])
            ->getJson("/api/v1/branches/{$this->branchB->id}");
        $this->assertContains($directResponse->status(), [403, 404]);
    }

    /**
     * 7. Warehouse company isolation.
     */
    public function test_warehouse_company_isolation(): void
    {
        // User A listing warehouses only gets Company A warehouses
        $response = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => (string) $this->companyA->id])
            ->getJson('/api/v1/warehouses');
        $response->assertStatus(200);

        $warehouses = collect($response->json('data'));
        $this->assertTrue($warehouses->contains('id', $this->warehouseA->id));
        $this->assertFalse($warehouses->contains('id', $this->warehouseB->id));

        // Direct access to Company B's Warehouse is denied (403 or 404)
        $directResponse = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => (string) $this->companyA->id])
            ->getJson("/api/v1/warehouses/{$this->warehouseB->id}");
        $this->assertContains($directResponse->status(), [403, 404]);
    }

    /**
     * 8. Storage Location company isolation.
     */
    public function test_storage_location_company_isolation(): void
    {
        // User A listing storage locations only gets Company A storage locations
        $response = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => (string) $this->companyA->id])
            ->getJson('/api/v1/storage-locations');
        $response->assertStatus(200);

        $locations = collect($response->json('data'));
        $this->assertTrue($locations->contains('id', $this->storageLocationA->id));
        $this->assertFalse($locations->contains('id', $this->storageLocationB->id));

        // Direct access to Company B's location is denied (403 or 404)
        $directResponse = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => (string) $this->companyA->id])
            ->getJson("/api/v1/storage-locations/{$this->storageLocationB->id}");
        $this->assertContains($directResponse->status(), [403, 404]);
    }

    /**
     * 9. Invalid parent relationship is rejected.
     */
    public function test_invalid_parent_relationship_is_rejected(): void
    {
        // Attempt to create Branch in Company A pointing to Company B's Business Unit
        $branchResponse = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => (string) $this->companyA->id])
            ->postJson('/api/v1/branches', [
                'business_unit_id' => $this->businessUnitB->id, // Belongs to Company B!
                'name' => 'Cross BU Branch',
                'code' => 'CROSS-BR',
            ]);
        $this->assertContains($branchResponse->status(), [403, 422]);

        // Attempt to create Warehouse in Company A pointing to Company B's Branch
        $whResponse = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => (string) $this->companyA->id])
            ->postJson('/api/v1/warehouses', [
                'business_unit_id' => $this->businessUnitA->id,
                'branch_id' => $this->branchB->id, // Belongs to Company B!
                'name' => 'Cross Branch Warehouse',
                'code' => 'CROSS-WH',
            ]);
        $this->assertContains($whResponse->status(), [403, 422]);

        // Attempt to update Warehouse in Company A to link with Company B's Branch
        $updateWhResponse = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => (string) $this->companyA->id])
            ->putJson("/api/v1/warehouses/{$this->warehouseA->id}", [
                'branch_id' => $this->branchB->id,
            ]);
        $this->assertContains($updateWhResponse->status(), [403, 422]);
    }

    /**
     * 10. Unauthorized mutation returns 403.
     */
    public function test_unauthorized_mutation_returns_403(): void
    {
        $targetUser = User::create([
            'name' => 'Candidate User',
            'email' => 'candidate@retailcore.test',
            'password' => bcrypt('password123'),
        ]);

        // User B attempts to assign user to Company A
        $response = $this->actingAs($this->userB)->postJson(
            "/api/v1/companies/{$this->companyA->id}/users",
            ['user_id' => $targetUser->id]
        );
        $response->assertStatus(403);

        // User B attempts to remove user from Company A
        $delResponse = $this->actingAs($this->userB)->deleteJson(
            "/api/v1/companies/{$this->companyA->id}/users/{$this->userA->id}"
        );
        $delResponse->assertStatus(403);

        // User B attempts to update Company A
        $updateResponse = $this->actingAs($this->userB)->putJson(
            "/api/v1/companies/{$this->companyA->id}",
            ['name' => 'Malicious Rename']
        );
        $updateResponse->assertStatus(403);
    }

    /**
     * 11. Company switching does not leak data.
     */
    public function test_company_switching_does_not_leak_data(): void
    {
        // 1. Dual tenant user scoped to Company A
        $resA_BU = $this->actingAs($this->multiTenantUser)
            ->withHeaders(['X-Company-ID' => (string) $this->companyA->id])
            ->getJson('/api/v1/business-units');
        $resA_BU->assertStatus(200);
        $buListA = collect($resA_BU->json('data'));
        $this->assertTrue($buListA->contains('id', $this->businessUnitA->id));
        $this->assertFalse($buListA->contains('id', $this->businessUnitB->id));

        $resA_WH = $this->actingAs($this->multiTenantUser)
            ->withHeaders(['X-Company-ID' => (string) $this->companyA->id])
            ->getJson('/api/v1/warehouses');
        $resA_WH->assertStatus(200);
        $whListA = collect($resA_WH->json('data'));
        $this->assertTrue($whListA->contains('id', $this->warehouseA->id));
        $this->assertFalse($whListA->contains('id', $this->warehouseB->id));

        // 2. Dual tenant user switches scope to Company B
        $resB_BU = $this->actingAs($this->multiTenantUser)
            ->withHeaders(['X-Company-ID' => (string) $this->companyB->id])
            ->getJson('/api/v1/business-units');
        $resB_BU->assertStatus(200);
        $buListB = collect($resB_BU->json('data'));
        $this->assertFalse($buListB->contains('id', $this->businessUnitA->id));
        $this->assertTrue($buListB->contains('id', $this->businessUnitB->id));

        $resB_WH = $this->actingAs($this->multiTenantUser)
            ->withHeaders(['X-Company-ID' => (string) $this->companyB->id])
            ->getJson('/api/v1/warehouses');
        $resB_WH->assertStatus(200);
        $whListB = collect($resB_WH->json('data'));
        $this->assertFalse($whListB->contains('id', $this->warehouseA->id));
        $this->assertTrue($whListB->contains('id', $this->warehouseB->id));
    }
}
