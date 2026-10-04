<?php

namespace Tests\Feature\Purchase;

use App\Models\Account;
use App\Models\Company;
use App\Models\GoodsReceipt;
use App\Models\GoodsReceiptItem;
use App\Models\Inventory;
use App\Models\JournalEntry;
use App\Models\JournalLine;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\SupplierLedger;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Tests\TestCase;

class PurchaseReconciliationTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Company $company;
    protected Supplier $supplier;
    protected Warehouse $warehouse;
    protected Product $product;
    protected ProductVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->company = Company::factory()->create();
        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);

        $this->supplier = Supplier::create([
            'company_id' => $this->company->id,
            'supplier_code' => 'SUP-REC-01',
            'name' => 'Reconciliation Supplier Ltd',
            'opening_balance' => 0.00,
        ]);

        $this->warehouse = Warehouse::create([
            'company_id' => $this->company->id,
            'name' => 'Central Depot',
        ]);

        $this->product = Product::create([
            'company_id' => $this->company->id,
            'name' => 'Standard Item A',
            'type' => 'STANDARD',
        ]);

        $this->variant = ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'sku' => 'SKU-REC-A1',
        ]);
    }

    /**
     * Test 1: Full End-to-End lifecycle reconciliation:
     * PO (Approved) -> Goods Receipt (Posted) -> Inventory Asset & Stock ->
     * Purchase Invoice (Posted) -> AP Liability -> 0 Inventory Delta ->
     * Supplier Ledger -> Supplier Payment -> Allocation -> Settlement
     */
    public function test_full_purchase_to_settlement_reconciliation_lifecycle()
    {
        // 1. Create Purchase Order for 10 units @ 100 = 1,000
        $po = PurchaseOrder::create([
            'company_id' => $this->company->id,
            'supplier_id' => $this->supplier->id,
            'warehouse_id' => $this->warehouse->id,
            'po_number' => 'PO-RECON-001',
            'order_date' => '2026-03-01',
            'status' => 'APPROVED',
        ]);

        $poItem = PurchaseOrderItem::create([
            'purchase_order_id' => $po->id,
            'product_id' => $this->product->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 10,
            'unit_cost' => 100.00,
            'line_total' => 1000.00,
            'pending_quantity' => 10,
            'received_quantity' => 0,
        ]);

        // 2. Post Goods Receipt for 6 units (partial) @ 100 = 600
        $grResponse = $this->actingAs($this->user)->postJson('/api/v1/goods-receipts', [
            'purchase_order_id' => $po->id,
            'receipt_number' => 'GR-RECON-001',
            'receipt_date' => '2026-03-02',
            'items' => [
                [
                    'purchase_order_item_id' => $poItem->id,
                    'received_quantity' => 6,
                ]
            ]
        ], ['X-Company-ID' => $this->company->id]);
        $grResponse->assertStatus(201);
        $grId = $grResponse->json('data.id');

        $postGrResponse = $this->actingAs($this->user)->postJson("/api/v1/goods-receipts/{$grId}/post", [], ['X-Company-ID' => $this->company->id]);
        $postGrResponse->assertStatus(200);

        // Verify PO partial receipt reconciliation: 10 ordered, 6 received, 4 pending
        $po->refresh();
        $poItem->refresh();
        $this->assertEquals('PARTIALLY_RECEIVED', $po->status);
        $this->assertEquals(6, (float) $poItem->received_quantity);
        $this->assertEquals(4, (float) $poItem->pending_quantity);

        // Verify Inventory received: 6 units in warehouse
        $stockMovementGrCount = StockMovement::where('reference_type', 'GoodsReceipt')->where('reference_id', $grId)->count();
        $this->assertEquals(1, $stockMovementGrCount);

        $inventoryRecord = Inventory::where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant->id)
            ->first();
        $this->assertNotNull($inventoryRecord);
        $this->assertEquals(6, (float) $inventoryRecord->quantity);
        $this->assertEquals(100.00, (float) $inventoryRecord->average_cost);

        $stockCountBeforeInvoice = StockMovement::count();
        $inventoryQtyBeforeInvoice = (float) $inventoryRecord->quantity;

        // 3. Create and Post Purchase Invoice for 6 received units @ 100 = 600
        $invResponse = $this->actingAs($this->user)->postJson('/api/v1/purchases', [
            'supplier_id' => $this->supplier->id,
            'purchase_order_id' => $po->id,
            'goods_receipt_id' => $grId,
            'warehouse_id' => $this->warehouse->id,
            'supplier_invoice_number' => 'INV-RECON-001',
            'invoice_date' => '2026-03-03',
            'post_immediately' => true,
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 6,
                    'unit_cost' => 100.00,
                ]
            ]
        ], ['X-Company-ID' => $this->company->id]);

        $invResponse->assertStatus(201);
        $invResponse->assertJsonPath('data.status', 'POSTED');
        $purchaseId = $invResponse->json('data.id');

        // CRITICAL INVARIANT: Purchase Invoice creates 0 stock movements and 0 inventory delta
        $this->assertEquals($stockCountBeforeInvoice, StockMovement::count());
        $inventoryRecord->refresh();
        $this->assertEquals($inventoryQtyBeforeInvoice, (float) $inventoryRecord->quantity);

        // Verify Supplier Ledger credit entry: +600 payable, balance = 600
        $this->assertDatabaseHas('supplier_ledgers', [
            'company_id' => $this->company->id,
            'supplier_id' => $this->supplier->id,
            'transaction_type' => 'PURCHASE',
            'reference_id' => $purchaseId,
            'credit' => 600.00,
            'balance_after' => 600.00,
        ]);

        // Verify Purchase invoice outstanding state
        $purchase = Purchase::find($purchaseId);
        $this->assertEquals(600.00, (float) $purchase->grand_total);
        $this->assertEquals(0.00, (float) $purchase->paid_amount);
        $this->assertEquals(600.00, (float) $purchase->due_amount);
        $this->assertEquals('DUE', $purchase->payment_status);

        // 4. Create Supplier Payment for 400.00 and Allocate to Purchase
        $paymentService = app(PaymentService::class);
        $payment1 = $paymentService->createPayment($this->company->id, [
            'amount' => 400.00,
            'payment_type' => 'SUPPLIER',
            'payment_method' => 'BANK_TRANSFER',
            'payment_date' => '2026-03-04',
            'idempotency_key' => 'RECON-PAY-1-' . Str::uuid(),
        ], $this->user->id);

        $paymentService->allocatePayment($this->company->id, $payment1->id, [
            [
                'allocatable_type' => 'Purchase',
                'allocatable_id' => $purchaseId,
                'amount' => 400.00,
            ]
        ], $this->user->id);

        // Verify Supplier Ledger debit entry: 400.00 payment, balance = 200.00
        $this->assertDatabaseHas('supplier_ledgers', [
            'company_id' => $this->company->id,
            'supplier_id' => $this->supplier->id,
            'transaction_type' => 'PAYMENT',
            'debit' => 400.00,
            'balance_after' => 200.00,
        ]);

        // Verify Purchase invoice is now PARTIAL: paid = 400, due = 200
        $purchase->refresh();
        $this->assertEquals(400.00, (float) $purchase->paid_amount);
        $this->assertEquals(200.00, (float) $purchase->due_amount);
        $this->assertEquals('PARTIAL', $purchase->payment_status);

        // 5. Query Supplier Balance endpoint: verifies exact balance 200.00
        $balanceRes = $this->actingAs($this->user)->getJson("/api/v1/suppliers/{$this->supplier->id}/balance", ['X-Company-ID' => $this->company->id]);
        $balanceRes->assertStatus(200);
        $this->assertEquals(600.00, (float) $balanceRes->json('data.total_purchases'));
        $this->assertEquals(400.00, (float) $balanceRes->json('data.total_paid'));
        $this->assertEquals(200.00, (float) $balanceRes->json('data.balance'));

        // 6. Query Supplier Payables Report: verifies match
        $payablesRes = $this->actingAs($this->user)->getJson('/api/v1/reports/supplier-payables', ['X-Company-ID' => $this->company->id]);
        $payablesRes->assertStatus(200);
        $supplierData = collect($payablesRes->json('data'))->firstWhere('id', $this->supplier->id);
        $this->assertNotNull($supplierData);
        $this->assertEquals(600.00, (float) $supplierData['total_purchases']);
        $this->assertEquals(400.00, (float) $supplierData['total_paid']);
        $this->assertEquals(200.00, (float) $supplierData['balance']);

        // 7. Query Purchases Report: verifies totals and line match
        $purchaseReportRes = $this->actingAs($this->user)->getJson('/api/v1/reports/purchases', ['X-Company-ID' => $this->company->id]);
        $purchaseReportRes->assertStatus(200);
        $this->assertEquals(600.00, (float) $purchaseReportRes->json('summary.total_gross_purchases'));
        $this->assertEquals(400.00, (float) $purchaseReportRes->json('summary.total_paid'));
        $this->assertEquals(200.00, (float) $purchaseReportRes->json('summary.total_due'));

        // 8. Make final settlement payment of 200.00
        $payment2 = $paymentService->createPayment($this->company->id, [
            'amount' => 200.00,
            'payment_type' => 'SUPPLIER',
            'payment_method' => 'CASH',
            'payment_date' => '2026-03-05',
            'idempotency_key' => 'RECON-PAY-2-' . Str::uuid(),
        ], $this->user->id);

        $paymentService->allocatePayment($this->company->id, $payment2->id, [
            [
                'allocatable_type' => 'Purchase',
                'allocatable_id' => $purchaseId,
                'amount' => 200.00,
            ]
        ], $this->user->id);

        // Fully settled verification:
        $purchase->refresh();
        $this->assertEquals(600.00, (float) $purchase->paid_amount);
        $this->assertEquals(0.00, (float) $purchase->due_amount);
        $this->assertEquals('PAID', $purchase->payment_status);

        $finalBalanceRes = $this->actingAs($this->user)->getJson("/api/v1/suppliers/{$this->supplier->id}/balance", ['X-Company-ID' => $this->company->id]);
        $finalBalanceRes->assertStatus(200);
        $this->assertEquals(600.00, (float) $finalBalanceRes->json('data.total_purchases'));
        $this->assertEquals(600.00, (float) $finalBalanceRes->json('data.total_paid'));
        $this->assertEquals(0.00, (float) $finalBalanceRes->json('data.balance'));

        // Check chronological ledger statement
        $ledgerRes = $this->actingAs($this->user)->getJson("/api/v1/reports/suppliers/{$this->supplier->id}/ledger", ['X-Company-ID' => $this->company->id]);
        $ledgerRes->assertStatus(200);
        $ledgerItems = $ledgerRes->json('data');
        $this->assertCount(3, $ledgerItems); // 1 PURCHASE, 2 PAYMENT entries
        $lastEntry = end($ledgerItems);
        $this->assertEquals(0.00, (float) $lastEntry['balance_after']);
    }

    /**
     * Test 2: Over-allocation rejection:
     * Attempting to allocate more than the invoice due balance fails with conflict exception.
     */
    public function test_cannot_over_allocate_payment_beyond_invoice_due()
    {
        $response = $this->actingAs($this->user)->postJson('/api/v1/purchases', [
            'supplier_id' => $this->supplier->id,
            'supplier_invoice_number' => 'INV-OVER-01',
            'invoice_date' => '2026-03-01',
            'post_immediately' => true,
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 2,
                    'unit_cost' => 100.00, // Grand total = 200.00
                ]
            ]
        ], ['X-Company-ID' => $this->company->id]);
        $purchaseId = $response->json('data.id');

        $paymentService = app(PaymentService::class);
        $payment = $paymentService->createPayment($this->company->id, [
            'amount' => 500.00,
            'payment_type' => 'SUPPLIER',
            'payment_method' => 'BANK_TRANSFER',
            'payment_date' => '2026-03-02',
            'idempotency_key' => 'OVER-PAY-' . Str::uuid(),
        ], $this->user->id);

        $this->expectException(ConflictHttpException::class);
        $paymentService->allocatePayment($this->company->id, $payment->id, [
            [
                'allocatable_type' => 'Purchase',
                'allocatable_id' => $purchaseId,
                'amount' => 250.00, // Exceeds 200.00
            ]
        ], $this->user->id);
    }

    /**
     * Test 3: Multi-invoice allocation reconciliation:
     * Single payment allocated across multiple invoices for the same supplier.
     */
    public function test_multi_invoice_payment_allocation_reconciliation()
    {
        // Invoice 1: 300.00
        $inv1 = $this->actingAs($this->user)->postJson('/api/v1/purchases', [
            'supplier_id' => $this->supplier->id,
            'supplier_invoice_number' => 'INV-MULTI-1',
            'invoice_date' => '2026-03-01',
            'post_immediately' => true,
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 3,
                    'unit_cost' => 100.00,
                ]
            ]
        ], ['X-Company-ID' => $this->company->id])->json('data.id');

        // Invoice 2: 400.00
        $inv2 = $this->actingAs($this->user)->postJson('/api/v1/purchases', [
            'supplier_id' => $this->supplier->id,
            'supplier_invoice_number' => 'INV-MULTI-2',
            'invoice_date' => '2026-03-02',
            'post_immediately' => true,
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 4,
                    'unit_cost' => 100.00,
                ]
            ]
        ], ['X-Company-ID' => $this->company->id])->json('data.id');

        // Total payables = 700.00
        // Single Payment of 500.00: 300.00 -> Inv 1 (Full), 200.00 -> Inv 2 (Partial)
        $paymentService = app(PaymentService::class);
        $payment = $paymentService->createPayment($this->company->id, [
            'amount' => 500.00,
            'payment_type' => 'SUPPLIER',
            'payment_method' => 'BANK_TRANSFER',
            'payment_date' => '2026-03-03',
            'idempotency_key' => 'MULTI-PAY-' . Str::uuid(),
        ], $this->user->id);

        $paymentService->allocatePayment($this->company->id, $payment->id, [
            [
                'allocatable_type' => 'Purchase',
                'allocatable_id' => $inv1,
                'amount' => 300.00,
            ],
            [
                'allocatable_type' => 'Purchase',
                'allocatable_id' => $inv2,
                'amount' => 200.00,
            ]
        ], $this->user->id);

        // Verify Inv 1: PAID (0 due)
        $p1 = Purchase::find($inv1);
        $this->assertEquals('PAID', $p1->payment_status);
        $this->assertEquals(0.00, (float) $p1->due_amount);

        // Verify Inv 2: PARTIAL (200 due)
        $p2 = Purchase::find($inv2);
        $this->assertEquals('PARTIAL', $p2->payment_status);
        $this->assertEquals(200.00, (float) $p2->due_amount);

        // Verify Supplier balance = 200.00
        $balanceRes = $this->actingAs($this->user)->getJson("/api/v1/suppliers/{$this->supplier->id}/balance", ['X-Company-ID' => $this->company->id]);
        $balanceRes->assertStatus(200);
        $this->assertEquals(700.00, (float) $balanceRes->json('data.total_purchases'));
        $this->assertEquals(500.00, (float) $balanceRes->json('data.total_paid'));
        $this->assertEquals(200.00, (float) $balanceRes->json('data.balance'));
    }

    /**
     * Test 4: Cross-company tenant security in purchase reconciliation:
     * Invoices, suppliers, balances, and reports are completely isolated by company.
     */
    public function test_cross_company_tenant_isolation_in_reconciliation()
    {
        $companyB = Company::factory()->create();
        $userB = User::factory()->create();
        $userB->companies()->attach($companyB->id);

        $supplierB = Supplier::create([
            'company_id' => $companyB->id,
            'supplier_code' => 'SUP-B-99',
            'name' => 'Company B Supplier',
            'opening_balance' => 0.00,
        ]);

        // Create invoice in Company A
        $invA = $this->actingAs($this->user)->postJson('/api/v1/purchases', [
            'supplier_id' => $this->supplier->id,
            'supplier_invoice_number' => 'INV-TENANT-A',
            'invoice_date' => '2026-03-01',
            'post_immediately' => true,
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 1,
                    'unit_cost' => 500.00,
                ]
            ]
        ], ['X-Company-ID' => $this->company->id])->json('data.id');

        // User B cannot access Company A invoice
        $unauthRes = $this->actingAs($userB)->getJson("/api/v1/purchases/{$invA}", ['X-Company-ID' => $companyB->id]);
        $unauthRes->assertStatus(404);

        // User B cannot view Company A supplier balance
        $unauthBalRes = $this->actingAs($userB)->getJson("/api/v1/suppliers/{$this->supplier->id}/balance", ['X-Company-ID' => $companyB->id]);
        $unauthBalRes->assertStatus(404);

        // User B's reports do not include Company A's purchases
        $reportB = $this->actingAs($userB)->getJson('/api/v1/reports/purchases', ['X-Company-ID' => $companyB->id]);
        $reportB->assertStatus(200);
        $this->assertEquals(0, (int) $reportB->json('summary.total_purchases'));
        $this->assertEquals(0.00, (float) $reportB->json('summary.total_gross_purchases'));
    }

    /**
     * Test 5: Idempotent posting:
     * Posting an already posted purchase invoice returns the existing record without duplicate ledger entries.
     */
    public function test_purchase_invoice_posting_is_idempotent()
    {
        $response = $this->actingAs($this->user)->postJson('/api/v1/purchases', [
            'supplier_id' => $this->supplier->id,
            'supplier_invoice_number' => 'INV-IDEMP-01',
            'invoice_date' => '2026-03-01',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 1,
                    'unit_cost' => 300.00,
                ]
            ]
        ], ['X-Company-ID' => $this->company->id]);
        $purchaseId = $response->json('data.id');

        // First post
        $post1 = $this->actingAs($this->user)->postJson("/api/v1/purchases/{$purchaseId}/post", [], ['X-Company-ID' => $this->company->id]);
        $post1->assertStatus(200);

        $ledgerCountAfterFirst = SupplierLedger::where('reference_type', 'Purchase')->where('reference_id', $purchaseId)->count();
        $this->assertEquals(1, $ledgerCountAfterFirst);

        // Second post (idempotency check)
        $post2 = $this->actingAs($this->user)->postJson("/api/v1/purchases/{$purchaseId}/post", [], ['X-Company-ID' => $this->company->id]);
        $post2->assertStatus(200);

        $ledgerCountAfterSecond = SupplierLedger::where('reference_type', 'Purchase')->where('reference_id', $purchaseId)->count();
        $this->assertEquals(1, $ledgerCountAfterSecond); // Still exactly 1 entry
    }
}
