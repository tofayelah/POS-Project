<?php

namespace Tests\Feature\Inventory;

use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Company;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StorageLocation;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WarehouseAndLocationHierarchyTest extends TestCase
{
    use RefreshDatabase;

    protected Company $company;
    protected User $user;
    protected Warehouse $warehouse;
    protected Product $product;
    protected ProductVariant $variant;
    protected InventoryService $inventoryService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
        $this->seed(\Database\Seeders\InventoryPermissionsSeeder::class);

        $this->company = Company::create([
            'name' => 'Hierarchy Test Corp',
            'email' => 'hier@corp.com',
            'currency' => 'USD',
        ]);

        $this->user = User::factory()->create([
            'company_id' => $this->company->id,
        ]);
        $role = \App\Models\Role::where('name', 'Super Admin')->first();
        $this->user->roles()->attach($role->id);

        $this->warehouse = Warehouse::create([
            'company_id' => $this->company->id,
            'name' => 'Central Hub',
            'code' => 'WH-HUB',
            'status' => 'active',
        ]);

        $category = Category::create([
            'company_id' => $this->company->id,
            'name' => 'Standard',
        ]);

        $unit = Unit::create([
            'company_id' => $this->company->id,
            'name' => 'Unit',
            'short_code' => 'UNT',
        ]);

        $this->product = Product::create([
            'company_id' => $this->company->id,
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'name' => 'Item X',
            'product_type' => 'simple',
            'status' => 'active',
        ]);

        $this->variant = ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'sku' => 'SKU-ITEM-X',
            'variant_name' => 'Default',
            'cost_price' => 10,
            'selling_price' => 20,
            'status' => 'active',
        ]);

        $this->inventoryService = app(InventoryService::class);
    }

    public function test_storage_location_hierarchy_and_cyclic_prevention()
    {
        $this->actingAs($this->user);

        // 1. Create Zone (Parent)
        $zoneRes = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->postJson('/api/v1/storage-locations', [
                'warehouse_id' => $this->warehouse->id,
                'name' => 'Zone A',
                'code' => 'ZONE-A',
                'type' => 'ZONE',
                'capacity' => 1000,
            ]);

        $zoneRes->assertStatus(201);
        $zoneId = $zoneRes->json('data.id');

        // 2. Create Aisle (Child of Zone A)
        $aisleRes = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->postJson('/api/v1/storage-locations', [
                'warehouse_id' => $this->warehouse->id,
                'name' => 'Aisle 1',
                'code' => 'AISLE-1',
                'type' => 'AISLE',
                'parent_id' => $zoneId,
                'capacity' => 200,
            ]);

        $aisleRes->assertStatus(201);
        $aisleId = $aisleRes->json('data.id');

        // 3. Cyclic prevention: trying to set Zone A's parent as Aisle 1 should fail
        $cycleRes = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->putJson("/api/v1/storage-locations/{$zoneId}", [
                'parent_id' => $aisleId,
            ]);

        $cycleRes->assertStatus(422);

        // 4. Deleting parent when child exists should fail
        $deleteParentRes = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->deleteJson("/api/v1/storage-locations/{$zoneId}");

        $deleteParentRes->assertStatus(422);
    }

    public function test_warehouse_cannot_be_deleted_when_stock_or_movements_exist()
    {
        $this->actingAs($this->user);

        // Add stock
        $this->inventoryService->addOpeningStock([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 15,
            'unit_cost' => 10,
        ], $this->user->id);

        $response = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->deleteJson("/api/v1/warehouses/{$this->warehouse->id}");

        $response->assertStatus(422);
    }

    public function test_inactive_warehouse_blocks_inventory_transactions()
    {
        $this->actingAs($this->user);

        // Deactivate warehouse
        $this->warehouse->update(['status' => 'inactive']);

        $response = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->postJson('/api/v1/inventory/opening-stock', [
                'company_id' => $this->company->id,
                'warehouse_id' => $this->warehouse->id,
                'product_variant_id' => $this->variant->id,
                'quantity' => 10,
                'unit_cost' => 10,
            ]);

        $response->assertStatus(409);
    }
}
