<?php

namespace Tests\Feature\Inventory;

use App\Models\Company;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\InventoryService;
use App\Services\TransferService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StockTransferTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Company $company;
    protected Warehouse $warehouseA;
    protected Warehouse $warehouseB;
    protected Product $product;
    protected ProductVariant $variant;
    protected InventoryService $inventoryService;
    protected TransferService $transferService;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->company = Company::create(['name' => 'Test Company']);
        
        $this->warehouseA = Warehouse::create([
            'company_id' => $this->company->id,
            'name' => 'Source Warehouse',
            'code' => 'SRC',
        ]);
        
        $this->warehouseB = Warehouse::create([
            'company_id' => $this->company->id,
            'name' => 'Destination Warehouse',
            'code' => 'DST',
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

        $this->inventoryService = app(InventoryService::class);
        $this->transferService = app(TransferService::class);

        // Add 100 stock to source warehouse
        $this->inventoryService->addOpeningStock([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouseA->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 100,
            'unit_cost' => 50
        ], $this->user->id);
    }

    public function test_complete_transfer_flow()
    {
        // 1. Create Transfer
        $transfer = $this->transferService->createTransfer([
            'company_id' => $this->company->id,
            'source_warehouse_id' => $this->warehouseA->id,
            'destination_warehouse_id' => $this->warehouseB->id,
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 40
                ]
            ]
        ], $this->user->id);

        $this->assertEquals('DRAFT', $transfer->status);

        // 2. Submit
        $transfer = $this->transferService->submitTransfer($transfer, $this->user->id);
        $this->assertEquals('PENDING_APPROVAL', $transfer->status);

        // 3. Approve
        $transfer = $this->transferService->approveTransfer($transfer, $this->user->id);
        $this->assertEquals('APPROVED', $transfer->status);

        // 4. Ship (should decrease source stock)
        $transfer = $this->transferService->shipTransfer($transfer, $this->user->id);
        $this->assertEquals('IN_TRANSIT', $transfer->status);
        
        $sourceInventory = Inventory::where('warehouse_id', $this->warehouseA->id)->first();
        $this->assertEquals(60, $sourceInventory->quantity);

        // 5. Receive (should increase dest stock)
        $transfer = $this->transferService->receiveTransfer($transfer, [
            [
                'item_id' => $transfer->items->first()->id,
                'received_quantity' => 40
            ]
        ], $this->user->id);
        
        $this->assertEquals('RECEIVED', $transfer->status);

        $destInventory = Inventory::where('warehouse_id', $this->warehouseB->id)->first();
        $this->assertNotNull($destInventory);
        $this->assertEquals(40, $destInventory->quantity);
    }

    public function test_cannot_ship_without_stock()
    {
        $transfer = $this->transferService->createTransfer([
            'company_id' => $this->company->id,
            'source_warehouse_id' => $this->warehouseA->id,
            'destination_warehouse_id' => $this->warehouseB->id,
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 150 // We only have 100
                ]
            ]
        ], $this->user->id);

        $transfer = $this->transferService->submitTransfer($transfer, $this->user->id);
        $transfer = $this->transferService->approveTransfer($transfer, $this->user->id);

        $this->expectException(\Symfony\Component\HttpKernel\Exception\ConflictHttpException::class);
        $this->transferService->shipTransfer($transfer, $this->user->id);
    }
}
