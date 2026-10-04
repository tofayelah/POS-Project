<?php

namespace Tests\Feature\Purchase;

use App\Models\Company;
use App\Models\Inventory;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Purchase;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\SupplierLedger;
use App\Models\User;
use App\Services\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PurchaseTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $company;
    protected $supplier;
    protected $product;
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
            'name' => 'Test Supplier',
            'opening_balance' => 0
        ]);

        $this->product = Product::create([
            'company_id' => $this->company->id,
            'name' => 'Test Product'
        ]);

        $this->variant = ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'sku' => 'SKU-001'
        ]);
    }

    public function test_can_post_purchase_invoice()
    {
        $response = $this->actingAs($this->user)->postJson('/api/v1/purchases', [
            'supplier_id' => $this->supplier->id,
            'supplier_invoice_number' => 'INV-001',
            'invoice_date' => '2024-01-05',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'product_variant_id' => $this->variant->id,
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

    public function test_can_get_purchase_invoice_details()
    {
        $createResponse = $this->actingAs($this->user)->postJson('/api/v1/purchases', [
            'supplier_id' => $this->supplier->id,
            'supplier_invoice_number' => 'INV-SHOW-01',
            'invoice_date' => '2026-02-15',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 5,
                    'unit_cost' => 100
                ]
            ]
        ], ['X-Company-ID' => $this->company->id]);

        $createResponse->assertStatus(201);
        $id = $createResponse->json('data.id');

        $showResponse = $this->actingAs($this->user)->getJson("/api/v1/purchases/{$id}", ['X-Company-ID' => $this->company->id]);
        $showResponse->assertStatus(200)
                     ->assertJsonPath('data.id', $id)
                     ->assertJsonPath('data.supplier_invoice_number', 'INV-SHOW-01')
                     ->assertJsonPath('data.grand_total', '500.0000');
    }

    public function test_can_cancel_draft_purchase_invoice()
    {
        $createResponse = $this->actingAs($this->user)->postJson('/api/v1/purchases', [
            'supplier_id' => $this->supplier->id,
            'supplier_invoice_number' => 'INV-CANCEL-01',
            'invoice_date' => '2026-02-15',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 2,
                    'unit_cost' => 150
                ]
            ]
        ], ['X-Company-ID' => $this->company->id]);

        $createResponse->assertStatus(201);
        $id = $createResponse->json('data.id');

        $cancelResponse = $this->actingAs($this->user)->postJson("/api/v1/purchases/{$id}/cancel", [], ['X-Company-ID' => $this->company->id]);
        $cancelResponse->assertStatus(200)
                       ->assertJsonPath('data.status', 'CANCELLED');

        $this->assertDatabaseHas('purchases', [
            'id' => $id,
            'status' => 'CANCELLED',
        ]);
    }

    public function test_cannot_cancel_posted_purchase_invoice()
    {
        $createResponse = $this->actingAs($this->user)->postJson('/api/v1/purchases', [
            'supplier_id' => $this->supplier->id,
            'supplier_invoice_number' => 'INV-NOCANCEL-01',
            'invoice_date' => '2026-02-15',
            'post_immediately' => true,
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 1,
                    'unit_cost' => 200
                ]
            ]
        ], ['X-Company-ID' => $this->company->id]);

        $createResponse->assertStatus(201);
        $id = $createResponse->json('data.id');

        $cancelResponse = $this->actingAs($this->user)->postJson("/api/v1/purchases/{$id}/cancel", [], ['X-Company-ID' => $this->company->id]);
        $cancelResponse->assertStatus(409);
    }

    public function test_cannot_create_duplicate_supplier_invoice()
    {
        $payload = [
            'supplier_id' => $this->supplier->id,
            'supplier_invoice_number' => 'INV-DUP-99',
            'invoice_date' => '2026-02-15',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 3,
                    'unit_cost' => 50
                ]
            ]
        ];

        $first = $this->actingAs($this->user)->postJson('/api/v1/purchases', $payload, ['X-Company-ID' => $this->company->id]);
        $first->assertStatus(201);

        $second = $this->actingAs($this->user)->postJson('/api/v1/purchases', $payload, ['X-Company-ID' => $this->company->id]);
        $second->assertStatus(422)
               ->assertJsonPath('success', false);
    }

    public function test_purchase_invoice_totals_are_authoritative()
    {
        // Client attempts to pass arbitrary grand_total, backend calculates real totals from lines + tax + shipping
        $response = $this->actingAs($this->user)->postJson('/api/v1/purchases', [
            'supplier_id' => $this->supplier->id,
            'supplier_invoice_number' => 'INV-AUTH-01',
            'invoice_date' => '2026-02-15',
            'shipping_cost' => 50,
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 4,
                    'unit_cost' => 25, // 100
                    'discount' => 10,
                    'tax' => 5, // line total = 95
                ],
                [
                    'product_id' => $this->product->id,
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 2,
                    'unit_cost' => 50, // 100
                    'discount' => 0,
                    'tax' => 10, // line total = 110
                ]
            ]
        ], ['X-Company-ID' => $this->company->id]);

        $response->assertStatus(201);
        // subtotal = 200, discount = 10, tax = 15, shipping = 50 -> grand total = 200 - 10 + 15 + 50 = 255
        $response->assertJsonPath('data.subtotal', '200.0000')
                 ->assertJsonPath('data.discount_total', '10.0000')
                 ->assertJsonPath('data.tax_total', '15.0000')
                 ->assertJsonPath('data.shipping_cost', '50.0000')
                 ->assertJsonPath('data.grand_total', '255.0000');
    }

    public function test_purchase_invoice_does_not_modify_inventory_or_stock_movement()
    {
        // Ensure no stock movement or inventory is created when Purchase Invoice is created and posted
        $stockMovementCountBefore = StockMovement::count();
        $inventoryCountBefore = Inventory::count();

        $response = $this->actingAs($this->user)->postJson('/api/v1/purchases', [
            'supplier_id' => $this->supplier->id,
            'supplier_invoice_number' => 'INV-NO-INV-01',
            'invoice_date' => '2026-02-15',
            'post_immediately' => true,
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 50,
                    'unit_cost' => 20
                ]
            ]
        ], ['X-Company-ID' => $this->company->id]);

        $response->assertStatus(201);
        $this->assertEquals('POSTED', $response->json('data.status'));

        // Physical inventory and stock movements MUST remain strictly untouched
        $this->assertEquals($stockMovementCountBefore, StockMovement::count());
        $this->assertEquals($inventoryCountBefore, Inventory::count());
    }

    public function test_cross_company_purchase_invoice_isolation()
    {
        $companyB = Company::factory()->create();
        $foreignSupplier = Supplier::create([
            'company_id' => $companyB->id,
            'supplier_code' => 'SUP-B',
            'name' => 'Foreign Supplier',
            'opening_balance' => 0
        ]);

        // Attempt to create purchase in Company A using Company B's supplier
        $response = $this->actingAs($this->user)->postJson('/api/v1/purchases', [
            'supplier_id' => $foreignSupplier->id,
            'supplier_invoice_number' => 'INV-CROSS-01',
            'invoice_date' => '2026-02-15',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 1,
                    'unit_cost' => 10
                ]
            ]
        ], ['X-Company-ID' => $this->company->id]);

        $response->assertStatus(422)
                 ->assertJsonPath('success', false);
    }

    public function test_payment_allocation_updates_supplier_ledger()
    {
        // 1. Create and post invoice for 1000
        $createRes = $this->actingAs($this->user)->postJson('/api/v1/purchases', [
            'supplier_id' => $this->supplier->id,
            'supplier_invoice_number' => 'INV-LEDGER-01',
            'invoice_date' => '2026-02-15',
            'post_immediately' => true,
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 10,
                    'unit_cost' => 100
                ]
            ]
        ], ['X-Company-ID' => $this->company->id]);

        $purchaseId = $createRes->json('data.id');

        // Supplier ledger has 1 entry: PURCHASE with credit 1000, balance 1000
        $this->assertDatabaseHas('supplier_ledgers', [
            'supplier_id' => $this->supplier->id,
            'transaction_type' => 'PURCHASE',
            'credit' => 1000,
            'balance_after' => 1000
        ]);

        // 2. Create supplier payment of 600
        $paymentService = app(PaymentService::class);
        $payment = $paymentService->createPayment($this->company->id, [
            'amount' => 600.0,
            'payment_type' => 'SUPPLIER',
            'payment_method' => 'BANK_TRANSFER',
            'payment_date' => '2026-02-16',
            'idempotency_key' => 'PAY-IDEMP-' . Str::uuid(),
        ], $this->user->id);

        // 3. Allocate 600 to purchase invoice
        $paymentService->allocatePayment($this->company->id, $payment->id, [
            [
                'allocatable_type' => 'Purchase',
                'allocatable_id' => $purchaseId,
                'amount' => 600.0,
            ]
        ], $this->user->id);

        // Supplier ledger now has 2 entries: PURCHASE (+1000) and PAYMENT (-600), balance = 400
        $this->assertDatabaseHas('supplier_ledgers', [
            'supplier_id' => $this->supplier->id,
            'transaction_type' => 'PAYMENT',
            'debit' => 600,
            'balance_after' => 400
        ]);

        // Verify purchase reflects paid_amount = 600, due_amount = 400, payment_status = PARTIAL
        $purchase = Purchase::find($purchaseId);
        $this->assertEquals(600.0, (float) $purchase->paid_amount);
        $this->assertEquals(400.0, (float) $purchase->due_amount);
        $this->assertEquals('PARTIAL', $purchase->payment_status);
    }
}
