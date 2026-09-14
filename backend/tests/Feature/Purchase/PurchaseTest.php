<?php

namespace Tests\Feature\Purchase;

use App\Models\Company;
use App\Models\PurchaseOrder;
use App\Models\Purchase;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchaseTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $company;
    protected $supplier;

    protected function setUp(): void
    {
        parent::setUp();
        $this->company = Company::factory()->create();
        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);
        
        $this->supplier = Supplier::create([
            'company_id' => $this->company->id,
            'supplier_code' => 'SUP-01',
            'name' => 'Test Supplier',
            'opening_balance' => 0
        ]);
    }

    public function test_can_post_purchase_invoice()
    {
        $product = Product::create([
            'company_id' => $this->company->id,
            'name' => 'Test Product'
        ]);
        $variant = ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $product->id,
            'sku' => 'SKU-001'
        ]);

        $response = $this->actingAs($this->user)->postJson('/api/v1/purchases', [
            'supplier_id' => $this->supplier->id,
            'supplier_invoice_number' => 'INV-001',
            'invoice_date' => '2024-01-05',
            'grand_total' => 500,
            'items' => [
                [
                    'product_id' => $product->id,
                    'product_variant_id' => $variant->id,
                    'quantity' => 10,
                    'unit_cost' => 50
                ]
            ]
        ], ['X-Company-ID' => $this->company->id]);
        
        $response->assertStatus(201);
        $purchaseId = $response->json('data.id');
        
        $postResponse = $this->actingAs($this->user)->postJson("/api/v1/purchases/{$purchaseId}/post", [], ['X-Company-ID' => $this->company->id]);
        
        $postResponse->assertStatus(200)
                     ->assertJsonPath('data.status', 'POSTED');
                     
        $this->assertDatabaseHas('supplier_ledgers', [
            'company_id' => $this->company->id,
            'supplier_id' => $this->supplier->id,
            'transaction_type' => 'PURCHASE',
            'credit' => 500
        ]);
    }
}
