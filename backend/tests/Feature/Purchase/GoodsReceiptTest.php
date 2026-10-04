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

    public function test_can_get_next_receipt_number()
    {
        $response = $this->actingAs($this->user)->getJson('/api/v1/goods-receipts/next-number', [
            'X-Company-ID' => $this->company->id
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $nextNumber = $response->json('data.receipt_number');
        $year = date('Y');
        $this->assertMatchesRegularExpression("/^GR-{$year}-\\d{4}$/", $nextNumber);
    }

    public function test_can_get_goods_receipt_details()
    {
        $receipt = GoodsReceipt::create([
            'company_id' => $this->company->id,
            'supplier_id' => $this->po->supplier_id,
            'warehouse_id' => $this->po->warehouse_id,
            'purchase_order_id' => $this->po->id,
            'receipt_number' => 'GR-DETAIL-001',
            'receipt_date' => '2024-01-05',
            'status' => 'DRAFT',
            'created_by' => $this->user->id,
        ]);

        GoodsReceiptItem::create([
            'goods_receipt_id' => $receipt->id,
            'purchase_order_item_id' => $this->poItem->id,
            'product_id' => $this->poItem->product_id,
            'product_variant_id' => $this->poItem->product_variant_id,
            'received_quantity' => 4,
            'unit_cost' => 100,
            'total_cost' => 400,
        ]);

        $response = $this->actingAs($this->user)->getJson("/api/v1/goods-receipts/{$receipt->id}", [
            'X-Company-ID' => $this->company->id
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $receipt->id)
            ->assertJsonPath('data.receipt_number', 'GR-DETAIL-001')
            ->assertJsonPath('data.items.0.received_quantity', '4.0000');
    }

    public function test_can_cancel_draft_goods_receipt()
    {
        $receipt = GoodsReceipt::create([
            'company_id' => $this->company->id,
            'supplier_id' => $this->po->supplier_id,
            'warehouse_id' => $this->po->warehouse_id,
            'purchase_order_id' => $this->po->id,
            'receipt_number' => 'GR-CANCEL-001',
            'receipt_date' => '2024-01-05',
            'status' => 'DRAFT',
            'created_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)->postJson("/api/v1/goods-receipts/{$receipt->id}/cancel", [], [
            'X-Company-ID' => $this->company->id
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'CANCELLED');

        $this->assertDatabaseHas('goods_receipts', [
            'id' => $receipt->id,
            'status' => 'CANCELLED',
        ]);
    }

    public function test_cannot_receive_against_draft_or_cancelled_po()
    {
        $draftPo = PurchaseOrder::create([
            'company_id' => $this->company->id,
            'supplier_id' => $this->po->supplier_id,
            'warehouse_id' => $this->po->warehouse_id,
            'po_number' => 'PO-DRAFT-999',
            'order_date' => '2024-01-01',
            'status' => 'DRAFT'
        ]);

        $draftItem = PurchaseOrderItem::create([
            'purchase_order_id' => $draftPo->id,
            'product_id' => $this->poItem->product_id,
            'product_variant_id' => $this->poItem->product_variant_id,
            'quantity' => 10,
            'unit_cost' => 100,
            'line_total' => 1000,
            'pending_quantity' => 10
        ]);

        $response = $this->actingAs($this->user)->postJson('/api/v1/goods-receipts', [
            'purchase_order_id' => $draftPo->id,
            'receipt_number' => 'GR-FAIL-001',
            'receipt_date' => '2024-01-02',
            'items' => [
                [
                    'purchase_order_item_id' => $draftItem->id,
                    'received_quantity' => 5
                ]
            ]
        ], ['X-Company-ID' => $this->company->id]);

        $response->assertStatus(422);
    }

    public function test_cross_company_goods_receipt_isolation()
    {
        $otherCompany = Company::factory()->create();
        $otherUser = User::factory()->create();
        $otherUser->companies()->attach($otherCompany->id);

        $response = $this->actingAs($otherUser)->getJson("/api/v1/goods-receipts/{$this->po->id}", [
            'X-Company-ID' => $otherCompany->id
        ]);

        $response->assertStatus(404);
    }
}
