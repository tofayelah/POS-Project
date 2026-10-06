<?php

namespace Tests\Feature\Inventory;

use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Company;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockCount;
use App\Models\StockMovement;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\InventoryService;
use App\Services\StockCountService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PhysicalStockCountTest extends TestCase
{
    use RefreshDatabase;

    protected Company $company;
    protected User $user;
    protected Warehouse $warehouse;
    protected Product $product;
    protected ProductVariant $variant1;
    protected ProductVariant $variant2;
    protected InventoryService $inventoryService;
    protected StockCountService $stockCountService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
        $this->seed(\Database\Seeders\InventoryPermissionsSeeder::class);

        $this->company = Company::create([
            'name' => 'Inventory Count Corp',
            'email' => 'count@corp.com',
            'currency' => 'USD',
        ]);

        $this->user = User::factory()->create([
            'company_id' => $this->company->id,
        ]);
        $role = \App\Models\Role::where('name', 'Super Admin')->first();
        $this->user->roles()->attach($role->id);

        $this->warehouse = Warehouse::create([
            'company_id' => $this->company->id,
            'name' => 'Main Warehouse',
            'code' => 'WH-MAIN',
            'status' => 'active',
        ]);

        $category = Category::create([
            'company_id' => $this->company->id,
            'name' => 'General',
        ]);

        $unit = Unit::create([
            'company_id' => $this->company->id,
            'name' => 'Piece',
            'short_code' => 'PCS',
        ]);

        $this->product = Product::create([
            'company_id' => $this->company->id,
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'name' => 'Count Product',
            'product_type' => 'simple',
            'status' => 'active',
        ]);

        $this->variant1 = ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'sku' => 'SKU-CNT-001',
            'variant_name' => 'Variant 1',
            'cost_price' => 20,
            'selling_price' => 40,
            'status' => 'active',
        ]);

        $product2 = Product::create([
            'company_id' => $this->company->id,
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'name' => 'Count Product 2',
            'product_type' => 'simple',
            'status' => 'active',
        ]);

        $this->variant2 = ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $product2->id,
            'sku' => 'SKU-CNT-002',
            'variant_name' => 'Variant 2',
            'cost_price' => 50,
            'selling_price' => 100,
            'status' => 'active',
        ]);

        $this->inventoryService = app(InventoryService::class);
        $this->stockCountService = app(StockCountService::class);

        // Add initial stock: variant1 = 50, variant2 = 30
        $this->inventoryService->addOpeningStock([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'product_variant_id' => $this->variant1->id,
            'quantity' => 50,
            'unit_cost' => 20,
        ], $this->user->id);

        $this->inventoryService->addOpeningStock([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'product_variant_id' => $this->variant2->id,
            'quantity' => 30,
            'unit_cost' => 50,
        ], $this->user->id);
    }

    public function test_complete_stock_count_lifecycle_with_variances_posting()
    {
        $this->actingAs($this->user);

        // 1. Create Stock Count (DRAFT)
        $response = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->postJson('/api/v1/inventory/stock-counts', [
                'warehouse_id' => $this->warehouse->id,
                'count_type' => 'FULL',
                'description' => 'Annual full inventory count',
            ]);

        $response->assertStatus(201);
        $countId = $response->json('data.id');
        $this->assertEquals('DRAFT', $response->json('data.status'));
        $this->assertCount(2, $response->json('data.items'));

        // 2. Start Stock Count (COUNTING)
        $startResponse = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->postJson("/api/v1/inventory/stock-counts/{$countId}/start");
        $startResponse->assertStatus(200);
        $this->assertEquals('COUNTING', $startResponse->json('data.status'));

        // 3. Update counted quantities:
        // variant1 counted 55 (+5 surplus)
        // variant2 counted 28 (-2 shortage)
        $items = $response->json('data.items');
        $item1 = collect($items)->firstWhere('product_variant_id', $this->variant1->id);
        $item2 = collect($items)->firstWhere('product_variant_id', $this->variant2->id);

        $itemsPayload = [
            'items' => [
                [
                    'id' => $item1['id'],
                    'product_variant_id' => $this->variant1->id,
                    'counted_quantity' => 55,
                    'notes' => 'Found 5 extra units',
                ],
                [
                    'id' => $item2['id'],
                    'product_variant_id' => $this->variant2->id,
                    'counted_quantity' => 28,
                    'notes' => '2 damaged units removed',
                ],
            ],
        ];

        $updateResponse = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->putJson("/api/v1/inventory/stock-counts/{$countId}/items", $itemsPayload);
        $updateResponse->assertStatus(200);

        // 4. Submit count
        $submitResponse = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->postJson("/api/v1/inventory/stock-counts/{$countId}/submit");
        $submitResponse->assertStatus(200);
        $this->assertEquals('SUBMITTED', $submitResponse->json('data.status'));

        // 5. Review count
        $reviewResponse = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->postJson("/api/v1/inventory/stock-counts/{$countId}/review");
        $reviewResponse->assertStatus(200);
        $this->assertEquals('REVIEWED', $reviewResponse->json('data.status'));

        // 6. Approve count
        $approveResponse = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->postJson("/api/v1/inventory/stock-counts/{$countId}/approve");
        $approveResponse->assertStatus(200);
        $this->assertEquals('APPROVED', $approveResponse->json('data.status'));

        // 7. Post count -> generates adjustments atomically
        $postResponse = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->postJson("/api/v1/inventory/stock-counts/{$countId}/post");
        $postResponse->assertStatus(200);
        $this->assertEquals('POSTED', $postResponse->json('data.status'));

        // Verify updated inventory positions:
        $inv1 = Inventory::where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant1->id)
            ->first();
        $this->assertEquals(55, (float) $inv1->quantity);

        $inv2 = Inventory::where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant2->id)
            ->first();
        $this->assertEquals(28, (float) $inv2->quantity);

        // Verify stock movements created
        $movements = StockMovement::where('reference_type', StockCount::class)
            ->where('reference_id', $countId)
            ->get();
        $this->assertCount(2, $movements);

        $inMovement = $movements->firstWhere('movement_type', 'ADJUSTMENT_IN');
        $this->assertNotNull($inMovement);
        $this->assertEquals(5, (float) $inMovement->quantity);

        $outMovement = $movements->firstWhere('movement_type', 'ADJUSTMENT_OUT');
        $this->assertNotNull($outMovement);
        $this->assertEquals(2, (float) $outMovement->quantity);

        // Verify AuditLog entries
        $logs = AuditLog::where('company_id', $this->company->id)
            ->whereIn('event', [
                'STOCK_COUNT_CREATED',
                'STOCK_COUNT_SUBMITTED',
                'STOCK_COUNT_APPROVED',
                'STOCK_COUNT_POSTED',
            ])
            ->pluck('event');

        $this->assertTrue($logs->contains('STOCK_COUNT_CREATED'));
        $this->assertTrue($logs->contains('STOCK_COUNT_SUBMITTED'));
        $this->assertTrue($logs->contains('STOCK_COUNT_APPROVED'));
        $this->assertTrue($logs->contains('STOCK_COUNT_POSTED'));
    }

    public function test_cancel_stock_count()
    {
        $this->actingAs($this->user);

        $response = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->postJson('/api/v1/inventory/stock-counts', [
                'warehouse_id' => $this->warehouse->id,
                'count_type' => 'PARTIAL',
                'items' => [
                    ['product_variant_id' => $this->variant1->id],
                ],
            ]);

        $countId = $response->json('data.id');

        $cancelResponse = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->postJson("/api/v1/inventory/stock-counts/{$countId}/cancel", [
                'reason' => 'Duplicate count created accidentally',
            ]);

        $cancelResponse->assertStatus(200);
        $this->assertEquals('CANCELLED', $cancelResponse->json('data.status'));

        // Cannot start or post a cancelled count
        $startResponse = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->postJson("/api/v1/inventory/stock-counts/{$countId}/start");
        $startResponse->assertStatus(409);
    }
}
