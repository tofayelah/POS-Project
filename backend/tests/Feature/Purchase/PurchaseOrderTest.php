<?php

namespace Tests\Feature\Purchase;

use App\Models\Company;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchaseOrderTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $company;
    protected $supplier;
    protected $warehouse;
    protected $variant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->company = Company::factory()->create();
        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);
        
        $this->supplier = Supplier::create([
            'company_id' => $this->company->id,
            'supplier_code' => 'SUP-01',
            'name' => 'Test Supplier'
        ]);
        
        $this->warehouse = Warehouse::create([
            'company_id' => $this->company->id,
            'name' => 'Main Warehouse'
        ]);
        
        $product = Product::create([
            'company_id' => $this->company->id,
            'name' => 'Test Product',
            'type' => 'STANDARD'
        ]);
        
        $this->variant = ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $product->id,
            'sku' => 'SKU-001'
        ]);
    }

    public function test_can_create_purchase_order()
    {
        $response = $this->actingAs($this->user)->postJson('/api/v1/purchase-orders', [
            'supplier_id' => $this->supplier->id,
            'warehouse_id' => $this->warehouse->id,
            'po_number' => 'PO-001',
            'order_date' => '2024-01-01',
            'items' => [
                [
                    'product_id' => $this->variant->product_id,
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 10,
                    'unit_cost' => 150.5
                ]
            ]
        ], ['X-Company-ID' => $this->company->id]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.status', 'DRAFT')
                 ->assertJsonPath('data.grand_total', '1505.0000');
    }

    public function test_can_approve_purchase_order()
    {
        $response = $this->actingAs($this->user)->postJson('/api/v1/purchase-orders', [
            'supplier_id' => $this->supplier->id,
            'warehouse_id' => $this->warehouse->id,
            'po_number' => 'PO-002',
            'order_date' => '2024-01-01',
            'items' => [
                [
                    'product_id' => $this->variant->product_id,
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 10,
                    'unit_cost' => 150.5
                ]
            ]
        ], ['X-Company-ID' => $this->company->id]);
        
        $poId = $response->json('data.id');

        $approveResponse = $this->actingAs($this->user)->postJson("/api/v1/purchase-orders/{$poId}/approve", [], ['X-Company-ID' => $this->company->id]);

        $approveResponse->assertStatus(200)
                        ->assertJsonPath('data.status', 'APPROVED');
    }
}
