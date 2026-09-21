<?php

namespace Tests\Feature\Organization;

use App\Models\Branch;
use App\Models\BusinessUnit;
use App\Models\Category;
use App\Models\Company;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\Permission;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\StockBatch;
use App\Models\StorageLocation;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrganizationHierarchyTest extends TestCase
{
    use RefreshDatabase;

    private User $userA;
    private User $userB;

    private Company $companyA;
    private Company $companyB;

    private BusinessUnit $businessUnitA;
    private BusinessUnit $businessUnitB;

    private Branch $branchA;
    private Branch $branchB;

    private Warehouse $warehouseA;
    private Warehouse $warehouseA2;
    private Warehouse $warehouseB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createTestUsersAndPermissions();

        $this->companyA = Company::create([
            'name' => 'Apex Retail Group',
            'code' => 'APEX',
            'country' => 'BD',
        ]);

        $this->companyB = Company::create([
            'name' => 'Beta Retail Group',
            'code' => 'BETA',
            'country' => 'BD',
        ]);

        $this->businessUnitA = BusinessUnit::create([
            'company_id' => $this->companyA->id,
            'name' => 'Fashion Division',
            'code' => 'FASHION',
        ]);

        $this->businessUnitB = BusinessUnit::create([
            'company_id' => $this->companyB->id,
            'name' => 'Home Division',
            'code' => 'HOME',
        ]);

        $this->branchA = Branch::create([
            'company_id' => $this->companyA->id,
            'business_unit_id' => $this->businessUnitA->id,
            'name' => 'Gulshan Flagship',
            'code' => 'GLS-01',
        ]);

        $this->branchB = Branch::create([
            'company_id' => $this->companyB->id,
            'business_unit_id' => $this->businessUnitB->id,
            'name' => 'Dhanmondi Branch',
            'code' => 'DHA-01',
        ]);

        $this->warehouseA = Warehouse::create([
            'company_id' => $this->companyA->id,
            'business_unit_id' => $this->businessUnitA->id,
            'branch_id' => $this->branchA->id,
            'name' => 'Gulshan Store Warehouse',
            'code' => 'GLS-WH',
            'warehouse_type' => 'BRANCH',
        ]);

        $this->warehouseA2 = Warehouse::create([
            'company_id' => $this->companyA->id,
            'business_unit_id' => $this->businessUnitA->id,
            'branch_id' => $this->branchA->id,
            'name' => 'Gulshan Secondary Warehouse',
            'code' => 'GLS-WH-2',
            'warehouse_type' => 'BRANCH',
        ]);

        $this->warehouseB = Warehouse::create([
            'company_id' => $this->companyB->id,
            'business_unit_id' => $this->businessUnitB->id,
            'branch_id' => $this->branchB->id,
            'name' => 'Dhanmondi Store Warehouse',
            'code' => 'DHA-WH',
            'warehouse_type' => 'BRANCH',
        ]);
    }

    private function createTestUsersAndPermissions(): void
    {
        $viewPermission = Permission::firstOrCreate(
            ['name' => 'storage_locations.view'],
            ['group' => 'organization']
        );

        $createPermission = Permission::firstOrCreate(
            ['name' => 'storage_locations.create'],
            ['group' => 'organization']
        );

        $updatePermission = Permission::firstOrCreate(
            ['name' => 'storage_locations.update'],
            ['group' => 'organization']
        );

        $deletePermission = Permission::firstOrCreate(
            ['name' => 'storage_locations.delete'],
            ['group' => 'organization']
        );

        $role = Role::firstOrCreate([
            'name' => 'Admin',
        ]);

        $role->permissions()->syncWithoutDetaching([
            $viewPermission->id,
            $createPermission->id,
            $updatePermission->id,
            $deletePermission->id,
        ]);

        $this->userA = User::create([
            'name' => 'Admin A',
            'email' => 'admin-a-' . uniqid() . '@test.local',
            'password' => bcrypt('password123'),
        ]);

        $this->userB = User::create([
            'name' => 'Admin B',
            'email' => 'admin-b-' . uniqid() . '@test.local',
            'password' => bcrypt('password123'),
        ]);

        $this->userA->roles()->attach($role->id);
        $this->userB->roles()->attach($role->id);
    }

    private function createHierarchyFixture(): array
    {
        $company = $this->companyA;

        $businessUnit = $this->businessUnitA;

        $branch = $this->branchA;

        $warehouse = $this->warehouseA;

        $storageLocation = StorageLocation::create([
            'company_id' => $company->id,
            'warehouse_id' => $warehouse->id,
            'code' => 'AISLE-A1-' . uniqid(),
            'name' => 'Aisle A Rack 1',
            'description' => 'Top shelf for premium apparel',
            'is_active' => true,
        ]);

        return compact(
            'company',
            'businessUnit',
            'branch',
            'warehouse',
            'storageLocation'
        );
    }

    // -------------------------------------------------------------------------
    // Organization Hierarchy Tests
    // -------------------------------------------------------------------------

    public function test_company_has_business_units(): void
    {
        $f = $this->createHierarchyFixture();

        $this->assertTrue(
            $f['company']->businessUnits->contains($f['businessUnit'])
        );
    }

    public function test_company_has_branches(): void
    {
        $f = $this->createHierarchyFixture();

        $this->assertTrue(
            $f['company']->branches->contains($f['branch'])
        );
    }

    public function test_company_has_warehouses(): void
    {
        $f = $this->createHierarchyFixture();

        $this->assertTrue(
            $f['company']->warehouses->contains($f['warehouse'])
        );
    }

    public function test_company_has_storage_locations(): void
    {
        $f = $this->createHierarchyFixture();

        $this->assertTrue(
            $f['company']->storageLocations->contains($f['storageLocation'])
        );
    }

    public function test_business_unit_belongs_to_company(): void
    {
        $f = $this->createHierarchyFixture();

        $this->assertEquals(
            $f['company']->id,
            $f['businessUnit']->company->id
        );
    }

    public function test_business_unit_has_branches(): void
    {
        $f = $this->createHierarchyFixture();

        $this->assertTrue(
            $f['businessUnit']->branches->contains($f['branch'])
        );
    }

    public function test_business_unit_has_warehouses(): void
    {
        $f = $this->createHierarchyFixture();

        $this->assertTrue(
            $f['businessUnit']->warehouses->contains($f['warehouse'])
        );
    }

    public function test_branch_belongs_to_company(): void
    {
        $f = $this->createHierarchyFixture();

        $this->assertEquals(
            $f['company']->id,
            $f['branch']->company->id
        );
    }

    public function test_branch_belongs_to_business_unit(): void
    {
        $f = $this->createHierarchyFixture();

        $this->assertEquals(
            $f['businessUnit']->id,
            $f['branch']->businessUnit->id
        );
    }

    public function test_branch_has_warehouses(): void
    {
        $f = $this->createHierarchyFixture();

        $this->assertTrue(
            $f['branch']->warehouses->contains($f['warehouse'])
        );
    }

    public function test_warehouse_belongs_to_company(): void
    {
        $f = $this->createHierarchyFixture();

        $this->assertEquals(
            $f['company']->id,
            $f['warehouse']->company->id
        );
    }

    public function test_warehouse_belongs_to_business_unit(): void
    {
        $f = $this->createHierarchyFixture();

        $this->assertEquals(
            $f['businessUnit']->id,
            $f['warehouse']->businessUnit->id
        );
    }

    public function test_warehouse_belongs_to_branch(): void
    {
        $f = $this->createHierarchyFixture();

        $this->assertEquals(
            $f['branch']->id,
            $f['warehouse']->branch->id
        );
    }

    public function test_warehouse_has_storage_locations(): void
    {
        $f = $this->createHierarchyFixture();

        $this->assertTrue(
            $f['warehouse']->storageLocations->contains($f['storageLocation'])
        );
    }

    public function test_storage_location_belongs_to_company_and_warehouse(): void
    {
        $f = $this->createHierarchyFixture();

        $this->assertEquals(
            $f['company']->id,
            $f['storageLocation']->company->id
        );

        $this->assertEquals(
            $f['warehouse']->id,
            $f['storageLocation']->warehouse->id
        );
    }

    // -------------------------------------------------------------------------
    // Delete Safety Tests
    // -------------------------------------------------------------------------

    public function test_delete_blocked_when_inventory_exists(): void
    {
        $company = $this->companyA;
        $warehouse = $this->warehouseA;

        $storageLocation = StorageLocation::create([
            'company_id' => $company->id,
            'warehouse_id' => $warehouse->id,
            'code' => 'DELETE-BLOCK-' . uniqid(),
            'name' => 'Delete Block Location',
            'is_active' => true,
        ]);

        $category = Category::query()->first();
        $unit = Unit::query()->first();

        $this->assertNotNull(
            $category,
            'Delete safety test requires at least one category in the test database.'
        );

        $this->assertNotNull(
            $unit,
            'Delete safety test requires at least one unit in the test database.'
        );

        $product = Product::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'company_id' => $company->id,
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'name' => 'Delete Safety Product',
            'slug' => 'delete-safety-' . uniqid(),
            'product_type' => 'simple',
            'has_variants' => true,
            'status' => 'active',
        ]);

        $variant = ProductVariant::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'product_id' => $product->id,
            'sku' => 'DEL-' . strtoupper(uniqid()),
            'variant_name' => 'Default',
            'cost_price' => 100,
            'selling_price' => 120,
            'wholesale_price' => 110,
            'mrp' => 120,
            'attribute_signature' => 'delete-' . uniqid(),
            'status' => 'active',
        ]);

        $inventory = Inventory::create([
            'company_id' => $company->id,
            'warehouse_id' => $warehouse->id,
            'product_id' => $product->id,
            'product_variant_id' => $variant->id,
            'quantity' => 10,
            'reserved_quantity' => 0,
            'available_quantity' => 10,
            'average_cost' => 100,
            'total_value' => 1000,
        ]);

        $stockBatch = StockBatch::create([
            'company_id' => $company->id,
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'batch_no' => 'BATCH-' . strtoupper(uniqid()),
            'unit_cost' => 100,
            'status' => 'ACTIVE',
        ]);

        InventoryBatch::create([
            'inventory_id' => $inventory->id,
            'stock_batch_id' => $stockBatch->id,
            'storage_location_id' => $storageLocation->id,
            'quantity' => 10,
        ]);

        $response = $this->actingAs($this->userA)
            ->withHeaders([
                'X-Company-ID' => $company->id,
            ])
            ->deleteJson(
                "/api/v1/storage-locations/{$storageLocation->id}"
            );

        $response->assertStatus(422);

        $this->assertDatabaseHas('storage_locations', [
            'id' => $storageLocation->id,
        ]);
    }

    public function test_delete_allowed_when_inventory_is_zero(): void
    {
        $company = $this->companyA;
        $warehouse = $this->warehouseA;

        $storageLocation = StorageLocation::create([
            'company_id' => $company->id,
            'warehouse_id' => $warehouse->id,
            'code' => 'DELETE-OK-' . uniqid(),
            'name' => 'Delete Allowed Location',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->userA)
            ->withHeaders([
                'X-Company-ID' => $company->id,
            ])
            ->deleteJson(
                "/api/v1/storage-locations/{$storageLocation->id}"
            );

        $response->assertStatus(200);

        $this->assertDatabaseMissing('storage_locations', [
            'id' => $storageLocation->id,
        ]);
    }
}