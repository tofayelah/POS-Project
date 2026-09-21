<?php

namespace Tests\Feature\Organization;

use App\Models\Branch;
use App\Models\BusinessUnit;
use App\Models\Company;
use App\Models\Permission;
use App\Models\Role;
use App\Models\StorageLocation;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class OrganizationHierarchyTest extends TestCase
{
    use RefreshDatabase;

    protected Company $companyA;
    protected Company $companyB;
    protected User $userA;
    protected User $userB;
    protected BusinessUnit $buA;
    protected Branch $branchA;
    protected Warehouse $warehouseA;
    protected Warehouse $warehouseA2;
    protected BusinessUnit $buB;
    protected Branch $branchB;
    protected Warehouse $warehouseB;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Create permissions
        $permissions = [
            'business_units.view', 'business_units.create', 'business_units.update', 'business_units.delete',
            'branches.view', 'branches.create', 'branches.update', 'branches.delete',
            'warehouses.view', 'warehouses.create', 'warehouses.update', 'warehouses.delete',
            'storage_locations.view', 'storage_locations.create', 'storage_locations.update', 'storage_locations.delete',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'group' => 'organization']);
        }

        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin']);
        $superAdminRole->permissions()->sync(Permission::all());

        // 2. Setup Company A hierarchy
        $this->companyA = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Company A',
            'code' => 'COMP-A',
            'country' => 'BD',
            'currency_code' => 'BDT',
            'timezone' => 'Asia/Dhaka',
            'status' => 'active',
        ]);

        $this->buA = BusinessUnit::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->companyA->id,
            'name' => 'BU A1',
            'code' => 'BU-A1',
            'status' => 'active',
        ]);

        $this->branchA = Branch::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->companyA->id,
            'business_unit_id' => $this->buA->id,
            'name' => 'Branch A1',
            'code' => 'BR-A1',
            'status' => 'active',
        ]);

        $this->warehouseA = Warehouse::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->companyA->id,
            'business_unit_id' => $this->buA->id,
            'branch_id' => $this->branchA->id,
            'name' => 'Warehouse A1',
            'code' => 'WH-A1',
            'warehouse_type' => 'BRANCH',
            'status' => 'active',
        ]);

        $this->warehouseA2 = Warehouse::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->companyA->id,
            'business_unit_id' => $this->buA->id,
            'branch_id' => $this->branchA->id,
            'name' => 'Warehouse A2',
            'code' => 'WH-A2',
            'warehouse_type' => 'BRANCH',
            'status' => 'active',
        ]);

        $this->userA = User::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'User Company A',
            'email' => 'admin.a@retailcore.test',
            'password' => bcrypt('password123'),
            'status' => 'active',
        ]);
        $this->userA->roles()->attach($superAdminRole->id);
        $this->userA->companies()->attach($this->companyA->id);

        // 3. Setup Company B hierarchy
        $this->companyB = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Company B',
            'code' => 'COMP-B',
            'country' => 'BD',
            'currency_code' => 'BDT',
            'timezone' => 'Asia/Dhaka',
            'status' => 'active',
        ]);

        $this->buB = BusinessUnit::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->companyB->id,
            'name' => 'BU B1',
            'code' => 'BU-B1',
            'status' => 'active',
        ]);

        $this->branchB = Branch::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->companyB->id,
            'business_unit_id' => $this->buB->id,
            'name' => 'Branch B1',
            'code' => 'BR-B1',
            'status' => 'active',
        ]);

        $this->warehouseB = Warehouse::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->companyB->id,
            'business_unit_id' => $this->buB->id,
            'branch_id' => $this->branchB->id,
            'name' => 'Warehouse B1',
            'code' => 'WH-B1',
            'warehouse_type' => 'BRANCH',
            'status' => 'active',
        ]);

        $this->userB = User::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'User Company B',
            'email' => 'admin.b@retailcore.test',
            'password' => bcrypt('password123'),
            'status' => 'active',
        ]);
        $this->userB->roles()->attach($superAdminRole->id);
        $this->userB->companies()->attach($this->companyB->id);
    }

    /**
     * Test Company -> BusinessUnit relationship.
     */
    public function test_company_to_business_unit_relationship(): void
    {
        $this->assertTrue($this->companyA->businessUnits->contains($this->buA));
        $this->assertEquals($this->companyA->id, $this->buA->company->id);
    }

    /**
     * Test BusinessUnit -> Branch relationship.
     */
    public function test_business_unit_to_branch_relationship(): void
    {
        $this->assertTrue($this->buA->branches->contains($this->branchA));
        $this->assertEquals($this->buA->id, $this->branchA->businessUnit->id);
    }

    /**
     * Test Branch -> Warehouse relationship.
     */
    public function test_branch_to_warehouse_relationship(): void
    {
        $this->assertTrue($this->branchA->warehouses->contains($this->warehouseA));
        $this->assertEquals($this->branchA->id, $this->warehouseA->branch->id);
    }

    /**
     * Test Warehouse -> StorageLocation relationship.
     */
    public function test_warehouse_to_storage_location_relationship(): void
    {
        $location = StorageLocation::create([
            'company_id' => $this->companyA->id,
            'warehouse_id' => $this->warehouseA->id,
            'code' => 'SHELF-A1',
            'name' => 'Shelf A1 Top',
            'is_active' => true,
        ]);

        $this->assertTrue($this->warehouseA->storageLocations->contains($location));
        $this->assertEquals($this->warehouseA->id, $location->warehouse->id);
        $this->assertEquals($this->companyA->id, $location->company->id);
    }

    /**
     * Company isolation: Company A cannot read Company B's Business Unit.
     */
    public function test_company_a_cannot_read_company_b_business_unit(): void
    {
        $response = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => $this->companyA->id])
            ->getJson("/api/v1/business-units/{$this->buB->id}");

        $response->assertStatus(404);
    }

    /**
     * Company isolation: Company A cannot read Company B's Branch.
     */
    public function test_company_a_cannot_read_company_b_branch(): void
    {
        $response = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => $this->companyA->id])
            ->getJson("/api/v1/branches/{$this->branchB->id}");

        $response->assertStatus(404);
    }

    /**
     * Company isolation: Company A cannot read Company B's Warehouse.
     */
    public function test_company_a_cannot_read_company_b_warehouse(): void
    {
        $response = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => $this->companyA->id])
            ->getJson("/api/v1/warehouses/{$this->warehouseB->id}");

        $response->assertStatus(404);
    }

    /**
     * Company isolation: Company A cannot read Company B's Storage Location.
     */
    public function test_company_a_cannot_read_company_b_storage_location(): void
    {
        $locationB = StorageLocation::create([
            'company_id' => $this->companyB->id,
            'warehouse_id' => $this->warehouseB->id,
            'code' => 'BIN-B1',
            'name' => 'Bin B1',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => $this->companyA->id])
            ->getJson("/api/v1/storage-locations/{$locationB->id}");

        $response->assertStatus(404);
    }

    /**
     * Company isolation: Company A cannot create storage location under Company B's warehouse.
     */
    public function test_company_a_cannot_create_storage_location_under_company_b_warehouse(): void
    {
        $response = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => $this->companyA->id])
            ->postJson('/api/v1/storage-locations', [
                'warehouse_id' => $this->warehouseB->id,
                'code' => 'BIN-HACK',
                'name' => 'Cross-Company Bin',
            ]);

        // Rejected either by FormRequest validation (exists rule scoped to company) or controller check
        $this->assertContains($response->status(), [422, 404]);
    }

    /**
     * Company isolation: Company A cannot update storage location to Company B's warehouse.
     */
    public function test_company_a_cannot_update_location_to_company_b_warehouse(): void
    {
        $locationA = StorageLocation::create([
            'company_id' => $this->companyA->id,
            'warehouse_id' => $this->warehouseA->id,
            'code' => 'BIN-A1',
            'name' => 'Bin A1',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => $this->companyA->id])
            ->putJson("/api/v1/storage-locations/{$locationA->id}", [
                'warehouse_id' => $this->warehouseB->id,
            ]);

        $this->assertContains($response->status(), [422, 404]);
    }

    /**
     * Warehouse branch / business unit consistency validation.
     */
    public function test_warehouse_branch_must_belong_to_same_business_unit(): void
    {
        // Branch B belongs to BU B, try creating warehouse with BU A + Branch B
        $response = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => $this->companyA->id])
            ->postJson('/api/v1/warehouses', [
                'business_unit_id' => $this->buA->id,
                'branch_id' => $this->branchB->id,
                'name' => 'Inconsistent Warehouse',
                'code' => 'WH-INCONSISTENT',
            ]);

        $this->assertContains($response->status(), [422, 404]);
    }

    /**
     * Storage location warehouse / company consistency validation.
     */
    public function test_storage_location_creation_succeeds_for_valid_warehouse(): void
    {
        $response = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => $this->companyA->id])
            ->postJson('/api/v1/storage-locations', [
                'warehouse_id' => $this->warehouseA->id,
                'code' => 'ZONE-A1',
                'name' => 'Zone A1 Storage',
                'is_active' => true,
            ]);

        $response->assertStatus(201);
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('data.code', 'ZONE-A1');
        $this->assertDatabaseHas('storage_locations', [
            'company_id' => $this->companyA->id,
            'warehouse_id' => $this->warehouseA->id,
            'code' => 'ZONE-A1',
        ]);
    }

    /**
     * Duplicate storage location code within the same warehouse is rejected.
     */
    public function test_duplicate_storage_location_code_within_same_warehouse_rejected(): void
    {
        StorageLocation::create([
            'company_id' => $this->companyA->id,
            'warehouse_id' => $this->warehouseA->id,
            'code' => 'RACK-01',
            'name' => 'First Rack',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => $this->companyA->id])
            ->postJson('/api/v1/storage-locations', [
                'warehouse_id' => $this->warehouseA->id,
                'code' => 'RACK-01',
                'name' => 'Duplicate Rack',
            ]);

        $response->assertStatus(422);
    }

    /**
     * Same storage location code is allowed across different warehouses.
     */
    public function test_same_location_code_allowed_in_different_warehouses(): void
    {
        StorageLocation::create([
            'company_id' => $this->companyA->id,
            'warehouse_id' => $this->warehouseA->id,
            'code' => 'RACK-COMMON',
            'name' => 'Rack in Warehouse 1',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => $this->companyA->id])
            ->postJson('/api/v1/storage-locations', [
                'warehouse_id' => $this->warehouseA2->id,
                'code' => 'RACK-COMMON',
                'name' => 'Rack in Warehouse 2',
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('storage_locations', [
            'warehouse_id' => $this->warehouseA2->id,
            'code' => 'RACK-COMMON',
        ]);
    }

    /**
     * Storage location activation / deactivation.
     */
    public function test_storage_location_activation_and_deactivation(): void
    {
        $location = StorageLocation::create([
            'company_id' => $this->companyA->id,
            'warehouse_id' => $this->warehouseA->id,
            'code' => 'DEACT-01',
            'name' => 'Active Location',
            'is_active' => true,
        ]);

        // Deactivate
        $response = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => $this->companyA->id])
            ->putJson("/api/v1/storage-locations/{$location->id}", [
                'is_active' => false,
            ]);

        $response->assertStatus(200);
        $response->assertJsonPath('data.is_active', false);
        $this->assertDatabaseHas('storage_locations', [
            'id' => $location->id,
            'is_active' => false,
        ]);

        // Reactivate
        $responseReactivate = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => $this->companyA->id])
            ->putJson("/api/v1/storage-locations/{$location->id}", [
                'is_active' => true,
            ]);

        $responseReactivate->assertStatus(200);
        $responseReactivate->assertJsonPath('data.is_active', true);
        $this->assertDatabaseHas('storage_locations', [
            'id' => $location->id,
            'is_active' => true,
        ]);
    }

    /**
     * Test delete is blocked when the storage location has positive inventory.
     */
    public function test_storage_location_delete_blocked_when_positive_inventory_exists(): void
    {
        $location = StorageLocation::create([
            'company_id' => $this->companyA->id,
            'warehouse_id' => $this->warehouseA->id,
            'code' => 'DEL-BLOCK-01',
            'name' => 'Delete Blocked Location',
            'is_active' => true,
        ]);

        $category = \App\Models\Category::create([
            'company_id' => $this->companyA->id,
            'name' => 'Delete Test Category',
            'status' => 'active',
            'sort_order' => 0,
        ]);

        $unit = \App\Models\Unit::create([
            'company_id' => $this->companyA->id,
            'name' => 'Delete Test Unit',
            'short_code' => 'DTU',
            'decimal_allowed' => false,
            'status' => 'active',
        ]);

        $product = \App\Models\Product::create([
            'company_id' => $this->companyA->id,
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'name' => 'Delete Test Product',
            'slug' => 'delete-test-product-' . Str::random(8),
            'product_type' => 'simple',
            'has_variants' => false,
            'tax_rate' => 0,
            'tax_type' => 'exclusive',
            'reorder_level' => 0,
            'status' => 'active',
        ]);

        $variant = \App\Models\ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'DEL-SKU-' . Str::random(8),
            'variant_name' => 'Default',
            'cost_price' => 100,
            'selling_price' => 150,
            'wholesale_price' => 140,
            'mrp' => 150,
            'status' => 'active',
            'attribute_signature' => '',
        ]);

        $inventory = \App\Models\Inventory::create([
            'company_id' => $this->companyA->id,
            'warehouse_id' => $this->warehouseA->id,
            'product_id' => $product->id,
            'product_variant_id' => $variant->id,
            'quantity' => 10,
            'reserved_quantity' => 0,
            'available_quantity' => 10,
            'average_cost' => 100,
            'total_value' => 1000,
        ]);

        $stockBatch = \App\Models\StockBatch::create([
            'company_id' => $this->companyA->id,
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'batch_no' => 'DEL-BATCH-01-' . Str::random(6),
            'unit_cost' => 100,
            'status' => 'ACTIVE',
        ]);

        \App\Models\InventoryBatch::create([
            'inventory_id' => $inventory->id,
            'stock_batch_id' => $stockBatch->id,
            'storage_location_id' => $location->id,
            'quantity' => 10,
        ]);

        $response = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => $this->companyA->id])
            ->deleteJson("/api/v1/storage-locations/{$location->id}");

        $response->assertStatus(422);

        $this->assertDatabaseHas('storage_locations', [
            'id' => $location->id,
        ]);
    }

    /**
     * Test delete is allowed when the storage location has no positive inventory.
     */
    public function test_storage_location_delete_allowed_when_no_positive_inventory_exists(): void
    {
        $location = StorageLocation::create([
            'company_id' => $this->companyA->id,
            'warehouse_id' => $this->warehouseA->id,
            'code' => 'DEL-ALLOW-01',
            'name' => 'Delete Allowed Location',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->userA)
            ->withHeaders(['X-Company-ID' => $this->companyA->id])
            ->deleteJson("/api/v1/storage-locations/{$location->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('storage_locations', [
            'id' => $location->id,
        ]);
    }
}
