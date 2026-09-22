<?php

namespace Tests\Feature\Organization;

use App\Models\BusinessUnit;
use App\Models\Company;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\Permission;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\StockBatch;
use App\Models\StorageLocation;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StorageLocationTest extends TestCase
{
    use RefreshDatabase;

    private Company $companyA;
    private Company $companyB;
    private Warehouse $warehouseA1;
    private Warehouse $warehouseA2;
    private Warehouse $warehouseB1;
    private User $userA;
    private User $userB;

    protected function setUp(): void
    {
        parent::setUp();

        $permissions = [
            'storage_locations.view',
            'storage_locations.create',
            'storage_locations.update',
            'storage_locations.delete',
        ];

        foreach ($permissions as $p) {
            Permission::firstOrCreate(['name' => $p], ['group' => 'organization']);
        }

        $adminRole = Role::firstOrCreate(['name' => 'Admin']);
        $adminRole->permissions()->syncWithoutDetaching(
            Permission::whereIn('name', $permissions)->pluck('id')
        );

        // Setup Company A
        $this->companyA = Company::create([
            'name' => 'Company Alpha',
            'code' => 'ALPHA',
            'country' => 'BD',
        ]);

        $buA = BusinessUnit::create([
            'company_id' => $this->companyA->id,
            'name' => 'Alpha BU',
            'code' => 'ALPHA-BU',
        ]);

        $this->warehouseA1 = Warehouse::create([
            'company_id' => $this->companyA->id,
            'business_unit_id' => $buA->id,
            'name' => 'Alpha Central WH',
            'code' => 'WH-A1',
        ]);

        $this->warehouseA2 = Warehouse::create([
            'company_id' => $this->companyA->id,
            'business_unit_id' => $buA->id,
            'name' => 'Alpha Branch WH',
            'code' => 'WH-A2',
        ]);

        $this->userA = User::create([
            'name' => 'User Alpha',
            'email' => 'user.alpha@test.com',
            'password' => bcrypt('password123'),
        ]);
        $this->userA->roles()->attach($adminRole->id);
        $this->userA->companies()->attach($this->companyA->id);

        // Setup Company B
        $this->companyB = Company::create([
            'name' => 'Company Beta',
            'code' => 'BETA',
            'country' => 'BD',
        ]);

        $buB = BusinessUnit::create([
            'company_id' => $this->companyB->id,
            'name' => 'Beta BU',
            'code' => 'BETA-BU',
        ]);

        $this->warehouseB1 = Warehouse::create([
            'company_id' => $this->companyB->id,
            'business_unit_id' => $buB->id,
            'name' => 'Beta Central WH',
            'code' => 'WH-B1',
        ]);

        $this->userB = User::create([
            'name' => 'User Beta',
            'email' => 'user.beta@test.com',
            'password' => bcrypt('password123'),
        ]);
        $this->userB->roles()->attach($adminRole->id);
        $this->userB->companies()->attach($this->companyB->id);
    }

    public function test_can_list_and_filter_storage_locations_in_own_company(): void
    {
        StorageLocation::create([
            'company_id' => $this->companyA->id,
            'warehouse_id' => $this->warehouseA1->id,
            'code' => 'RACK-01',
            'name' => 'Rack 1',
            'is_active' => true,
        ]);

        StorageLocation::create([
            'company_id' => $this->companyA->id,
            'warehouse_id' => $this->warehouseA2->id,
            'code' => 'RACK-02',
            'name' => 'Rack 2',
            'is_active' => false,
        ]);

        // User A fetches all locations
        $response = $this->actingAs($this->userA)->getJson('/api/v1/storage-locations', [
            'X-Company-ID' => $this->companyA->id,
        ]);

        $response->assertStatus(200);
        $response->assertJsonCount(2, 'data');

        // Filter by warehouse
        $responseFilterWH = $this->actingAs($this->userA)->getJson('/api/v1/storage-locations?warehouse_id=' . $this->warehouseA1->id, [
            'X-Company-ID' => $this->companyA->id,
        ]);
        $responseFilterWH->assertStatus(200);
        $responseFilterWH->assertJsonCount(1, 'data');
        $this->assertEquals('RACK-01', $responseFilterWH->json('data.0.code'));

        // Filter by is_active
        $responseFilterActive = $this->actingAs($this->userA)->getJson('/api/v1/storage-locations?is_active=1', [
            'X-Company-ID' => $this->companyA->id,
        ]);
        $responseFilterActive->assertStatus(200);
        $responseFilterActive->assertJsonCount(1, 'data');
        $this->assertEquals('RACK-01', $responseFilterActive->json('data.0.code'));
    }

    public function test_multi_company_isolation_cannot_view_or_access_other_company_locations(): void
    {
        $locB = StorageLocation::create([
            'company_id' => $this->companyB->id,
            'warehouse_id' => $this->warehouseB1->id,
            'code' => 'BETA-LOC',
            'name' => 'Beta Location',
            'is_active' => true,
        ]);

        // User A attempts to view Location B directly
        $response = $this->actingAs($this->userA)->getJson('/api/v1/storage-locations/' . $locB->id, [
            'X-Company-ID' => $this->companyA->id,
        ]);
        $response->assertStatus(404);

        // User A attempts to switch company context to Company B
        $responseSwitch = $this->actingAs($this->userA)->getJson('/api/v1/storage-locations', [
            'X-Company-ID' => $this->companyB->id,
        ]);
        $responseSwitch->assertStatus(403);
    }

    public function test_cannot_create_location_with_duplicate_code_in_same_warehouse(): void
    {
        StorageLocation::create([
            'company_id' => $this->companyA->id,
            'warehouse_id' => $this->warehouseA1->id,
            'code' => 'BIN-100',
            'name' => 'Bin 100',
        ]);

        $payload = [
            'warehouse_id' => $this->warehouseA1->id,
            'code' => 'BIN-100',
            'name' => 'Duplicate Bin',
        ];

        $response = $this->actingAs($this->userA)->postJson('/api/v1/storage-locations', $payload, [
            'X-Company-ID' => $this->companyA->id,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('code');
    }

    public function test_same_code_allowed_in_different_warehouses(): void
    {
        // First in Warehouse A1
        $loc1 = StorageLocation::create([
            'company_id' => $this->companyA->id,
            'warehouse_id' => $this->warehouseA1->id,
            'code' => 'BIN-100',
            'name' => 'Bin 100 in WH1',
        ]);
        $this->assertNotNull($loc1->id);

        // Same code in Warehouse A2
        $payload = [
            'warehouse_id' => $this->warehouseA2->id,
            'code' => 'BIN-100',
            'name' => 'Bin 100 in WH2',
            'description' => 'Secondary bin location',
        ];

        $response = $this->actingAs($this->userA)->postJson('/api/v1/storage-locations', $payload, [
            'X-Company-ID' => $this->companyA->id,
        ]);

        $response->assertStatus(201);
        $this->assertEquals('BIN-100', $response->json('data.code'));
        $this->assertEquals($this->warehouseA2->id, $response->json('data.warehouse_id'));
    }

    public function test_warehouse_ownership_validation_cannot_create_with_warehouse_from_other_company(): void
    {
        $payload = [
            'warehouse_id' => $this->warehouseB1->id, // Belongs to Company B!
            'code' => 'CROSS-WH',
            'name' => 'Cross Company Attempt',
        ];

        $response = $this->actingAs($this->userA)->postJson('/api/v1/storage-locations', $payload, [
            'X-Company-ID' => $this->companyA->id,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('warehouse_id');
    }

    public function test_can_update_storage_location(): void
    {
        $location = StorageLocation::create([
            'company_id' => $this->companyA->id,
            'warehouse_id' => $this->warehouseA1->id,
            'code' => 'ZONE-A',
            'name' => 'Zone Alpha',
            'is_active' => true,
        ]);

        $updatePayload = [
            'name' => 'Zone Alpha Updated',
            'description' => 'Updated rack notes',
            'is_active' => false,
        ];

        $response = $this->actingAs($this->userA)->putJson('/api/v1/storage-locations/' . $location->id, $updatePayload, [
            'X-Company-ID' => $this->companyA->id,
        ]);

        $response->assertStatus(200);
        $this->assertEquals('Zone Alpha Updated', $response->json('data.name'));
        $this->assertFalse($response->json('data.is_active'));
        $this->assertEquals('Updated rack notes', $response->json('data.description'));
    }

    public function test_delete_safety_cannot_delete_location_with_active_inventory(): void
    {
        $location = StorageLocation::create([
            'company_id' => $this->companyA->id,
            'warehouse_id' => $this->warehouseA1->id,
            'code' => 'ACTIVE-STOCK-LOC',
            'name' => 'Active Stock Location',
            'is_active' => true,
        ]);

        $product = Product::create([
            'company_id' => $this->companyA->id,
            'name' => 'Inventory Product',
            'product_type' => 'simple',
            'status' => 'active',
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'ACT-001',
            'variant_name' => 'Standard Item',
        ]);

        $inventory = Inventory::create([
            'company_id' => $this->companyA->id,
            'warehouse_id' => $this->warehouseA1->id,
            'product_id' => $product->id,
            'product_variant_id' => $variant->id,
            'quantity_on_hand' => 15,
            'quantity_available' => 15,
        ]);

        $stockBatch = StockBatch::create([
            'company_id' => $this->companyA->id,
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'batch_no' => 'BATCH-2026-001',
            'unit_cost' => 50,
            'status' => 'ACTIVE',
        ]);

        InventoryBatch::create([
            'inventory_id' => $inventory->id,
            'stock_batch_id' => $stockBatch->id,
            'storage_location_id' => $location->id,
            'quantity' => 15,
        ]);

        // Attempt delete
        $response = $this->actingAs($this->userA)->deleteJson('/api/v1/storage-locations/' . $location->id, [], [
            'X-Company-ID' => $this->companyA->id,
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'success' => false,
            'message' => 'Cannot delete storage location with active inventory.',
        ]);

        // Verify still in database
        $this->assertDatabaseHas('storage_locations', ['id' => $location->id]);
    }

    public function test_delete_safety_can_delete_location_when_inventory_is_zero(): void
    {
        $location = StorageLocation::create([
            'company_id' => $this->companyA->id,
            'warehouse_id' => $this->warehouseA1->id,
            'code' => 'EMPTY-LOC',
            'name' => 'Empty Location',
            'is_active' => true,
        ]);

        $product = Product::create([
            'company_id' => $this->companyA->id,
            'name' => 'Zero Stock Product',
            'product_type' => 'simple',
            'status' => 'active',
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'ZERO-001',
            'variant_name' => 'Zero Item',
        ]);

        $inventory = Inventory::create([
            'company_id' => $this->companyA->id,
            'warehouse_id' => $this->warehouseA1->id,
            'product_id' => $product->id,
            'product_variant_id' => $variant->id,
            'quantity_on_hand' => 0,
            'quantity_available' => 0,
        ]);

        $stockBatch = StockBatch::create([
            'company_id' => $this->companyA->id,
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'batch_no' => 'BATCH-ZERO-001',
            'unit_cost' => 50,
            'status' => 'DEPLETED',
        ]);

        InventoryBatch::create([
            'inventory_id' => $inventory->id,
            'stock_batch_id' => $stockBatch->id,
            'storage_location_id' => $location->id,
            'quantity' => 0, // Zero active inventory!
        ]);

        // Attempt delete
        $response = $this->actingAs($this->userA)->deleteJson('/api/v1/storage-locations/' . $location->id, [], [
            'X-Company-ID' => $this->companyA->id,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'Storage location deleted successfully.',
        ]);

        // Verify deleted from database
        $this->assertDatabaseMissing('storage_locations', ['id' => $location->id]);
    }
}
