<?php

namespace Tests\Feature\Purchase;

use App\Models\Company;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use App\Models\GoodsReceipt;
use App\Models\GoodsReceiptItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GoodsReceiptTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $company;
    protected $po;
    protected $poItem;

    protected function setUp(): void
    {
        parent::setUp();
        $this->company = Company::factory()->create();
        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);
        
        $supplier = Supplier::create([
            'company_id' => $this->company->id,
            'supplier_code' => 'SUP-01',
            'name' => 'Test Supplier'
        ]);
        
        $warehouse = Warehouse::create([
            'company_id' => $this->company->id,
            'name' => 'Main Warehouse'
        ]);
        
        $product = Product::create([
            'company_id' => $this->company->id,
            'name' => 'Test Product',
            'type' => 'STANDARD'
        ]);
        
        $variant = ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $product->id,
            'sku' => 'SKU-001'
        ]);

        $this->po = PurchaseOrder::create([
            'company_id' => $this->company->id,
            'supplier_id' => $supplier->id,
            'warehouse_id' => $warehouse->id,
            'po_number' => 'PO-100',
            'order_date' => '2024-01-01',
            'status' => 'APPROVED'
        ]);

        $this->poItem = PurchaseOrderItem::create([
            'purchase_order_id' => $this->po->id,
            'product_id' => $variant->product_id,
            'product_variant_id' => $variant->id,
            'quantity' => 10,
            'unit_cost' => 100,
            'line_total' => 1000,
            'pending_quantity' => 10
        ]);
    }

    public function test_can_post_goods_receipt()
    {
        $response = $this->actingAs($this->user)->postJson('/api/v1/goods-receipts', [
            'purchase_order_id' => $this->po->id,
            'receipt_number' => 'GR-001',
            'receipt_date' => '2024-01-02',
            'items' => [
                [
                    'purchase_order_item_id' => $this->poItem->id,
                    'received_quantity' => 5
                ]
            ]
        ], ['X-Company-ID' => $this->company->id]);
        
        $response->assertStatus(201);
        $receiptId = $response->json('data.id');
        
        $postResponse = $this->actingAs($this->user)->postJson("/api/v1/goods-receipts/{$receiptId}/post", [], ['X-Company-ID' => $this->company->id]);
        
        $postResponse->assertStatus(200)
                     ->assertJsonPath('data.status', 'POSTED');
                     
        // Check PO is partially received
        $this->assertDatabaseHas('purchase_orders', [
            'id' => $this->po->id,
            'status' => 'PARTIALLY_RECEIVED'
        ]);
        
        // Check pending quantity updated
        $this->assertDatabaseHas('purchase_order_items', [
            'id' => $this->poItem->id,
            'pending_quantity' => 5,
            'received_quantity' => 5
        ]);
        
        // Check Inventory updated
        $this->assertDatabaseHas('inventories', [
            'company_id' => $this->company->id,
            'product_variant_id' => $this->poItem->product_variant_id,
            'quantity' => 5
        ]);
        
        // Check Stock Movement created
        $this->assertDatabaseHas('stock_movements', [
            'company_id' => $this->company->id,
            'movement_type' => 'STOCK_IN',
            'quantity' => 5
        ]);
    }
    
    public function test_cannot_over_receive()
    {
        $response = $this->actingAs($this->user)->postJson('/api/v1/goods-receipts', [
            'purchase_order_id' => $this->po->id,
            'receipt_number' => 'GR-002',
            'receipt_date' => '2024-01-02',
            'items' => [
                [
                    'purchase_order_item_id' => $this->poItem->id,
                    'received_quantity' => 15 // Only 10 pending
                ]
            ]
        ], ['X-Company-ID' => $this->company->id]);
        
        $receiptId = $response->json('data.id');
        
        $postResponse = $this->actingAs($this->user)->postJson("/api/v1/goods-receipts/{$receiptId}/post", [], ['X-Company-ID' => $this->company->id]);
        
        $postResponse->assertStatus(409); // Conflict HTTP Exception
    }
}
