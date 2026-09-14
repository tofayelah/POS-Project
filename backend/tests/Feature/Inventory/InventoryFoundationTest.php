<?php

namespace Tests\Feature\Inventory;

use App\Models\Company;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockMovement;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryFoundationTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Company $company;
    protected Warehouse $warehouse;
    protected Product $product;
    protected ProductVariant $variant;
    protected InventoryService $service;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->company = Company::create(['name' => 'Test Company']);
        $this->warehouse = Warehouse::create([
            'company_id' => $this->company->id,
            'name' => 'Main Warehouse',
            'code' => 'MAIN',
        ]);
        
        $this->user = User::create([
            'name' => 'Admin',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'company_id' => $this->company->id,
        ]);
        
        $this->product = Product::create([
            'company_id' => $this->company->id,
            'name' => 'Test Product',
            'product_type' => 'simple',
            'status' => 'active',
            'base_price' => 100
        ]);
        
        $this->variant = ProductVariant::create([
            'product_id' => $this->product->id,
            'sku' => 'TEST-001',
            'price' => 100,
            'cost' => 50,
            'attribute_signature' => 'default'
        ]);

        $this->service = app(InventoryService::class);
    }

    public function test_opening_stock_creates_movement_and_inventory()
    {
        $movement = $this->service->addOpeningStock([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 100,
            'unit_cost' => 50,
            'reason' => 'Initial upload'
        ], $this->user->id);

        $this->assertEquals(100, $movement->quantity);
        $this->assertEquals('OPENING_STOCK', $movement->movement_type);
        $this->assertEquals(0, $movement->quantity_before);
        $this->assertEquals(100, $movement->quantity_after);

        $inventory = Inventory::where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant->id)
            ->first();

        $this->assertNotNull($inventory);
        $this->assertEquals(100, $inventory->quantity);
        $this->assertEquals(50, $inventory->average_cost);
    }

    public function test_prevent_duplicate_opening_stock()
    {
        $this->service->addOpeningStock([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 100,
            'unit_cost' => 50
        ], $this->user->id);

        $this->expectException(\Symfony\Component\HttpKernel\Exception\ConflictHttpException::class);

        $this->service->addOpeningStock([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 50,
            'unit_cost' => 50
        ], $this->user->id);
    }

    public function test_negative_stock_prevention()
    {
        $this->service->addOpeningStock([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 10,
            'unit_cost' => 50
        ], $this->user->id);

        $this->expectException(\Symfony\Component\HttpKernel\Exception\ConflictHttpException::class);

        // Attempt to remove 15, should fail
        $this->service->adjustStock([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'product_variant_id' => $this->variant->id,
            'type' => 'subtract',
            'quantity' => 15,
            'reason' => 'test'
        ], $this->user->id);
    }

    public function test_stock_adjustment()
    {
        $this->service->addOpeningStock([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 100,
            'unit_cost' => 50
        ], $this->user->id);

        $this->service->adjustStock([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'product_variant_id' => $this->variant->id,
            'type' => 'subtract',
            'quantity' => 10,
            'reason' => 'Inventory count missing'
        ], $this->user->id);

        $inventory = Inventory::where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant->id)
            ->first();

        $this->assertEquals(90, $inventory->quantity);
    }

    public function test_moving_average_cost_calculation()
    {
        $this->service->addOpeningStock([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 100, // 100 units
            'unit_cost' => 10  // Total value = 1000
        ], $this->user->id);

        $this->service->adjustStock([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'product_variant_id' => $this->variant->id,
            'type' => 'add',
            'quantity' => 100, // 100 units
            'unit_cost' => 20, // Total value = 2000
            'reason' => 'Added stock'
        ], $this->user->id);

        $inventory = Inventory::where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant->id)
            ->first();

        // 200 units, Total value = 3000, average cost should be 15
        $this->assertEquals(200, $inventory->quantity);
        $this->assertEquals(15, $inventory->average_cost);
    }
}
