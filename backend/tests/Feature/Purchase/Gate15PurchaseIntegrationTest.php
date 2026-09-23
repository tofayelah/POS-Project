<?php

namespace Tests\Feature\Purchase;

use App\Models\Account;
use App\Models\AccountGroup;
use App\Models\AccountingPeriod;
use App\Models\AuditLog;
use App\Models\Branch;
use App\Models\BusinessUnit;
use App\Models\Category;
use App\Models\Company;
use App\Models\FiscalYear;
use App\Models\GoodsReceipt;
use App\Models\GoodsReceiptItem;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Setting;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\StorageLocation;
use App\Models\Supplier;
use App\Models\SupplierLedger;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\AccountingService;
use App\Services\AccountMappingService;
use App\Services\InventoryAccountingService;
use App\Services\InventoryService;
use App\Services\PaymentService;
use App\Services\PurchaseService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Tests\TestCase;

class Gate15PurchaseIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected Company $company;
    protected User $user;
    protected BusinessUnit $businessUnit;
    protected Branch $branch;
    protected Warehouse $warehouse;
    protected StorageLocation $storageLocation;
    protected StockBatch $stockBatch;
    protected Supplier $supplier;
    protected Product $product;
    protected ProductVariant $variant;

    protected FiscalYear $fiscalYear;
    protected AccountingPeriod $accountingPeriod;

    protected Account $inventoryAssetAccount;
    protected Account $apClearingAccount;
    protected Account $accountsPayableAccount;
    protected Account $cashBankAccount;

    protected AccountMappingService $mappingService;
    protected AccountingService $accountingService;
    protected InventoryAccountingService $inventoryAccountingService;
    protected InventoryService $inventoryService;
    protected PaymentService $paymentService;
    protected PurchaseService $purchaseService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->mappingService = app(AccountMappingService::class);
        $this->accountingService = app(AccountingService::class);
        $this->inventoryAccountingService = app(InventoryAccountingService::class);
        $this->inventoryService = app(InventoryService::class);
        $this->paymentService = app(PaymentService::class);
        $this->purchaseService = app(PurchaseService::class);

        // 1. Organization Setup
        $this->company = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Gate 1.5 Procurement Corp',
            'code' => 'G15-COMP-' . Str::random(5),
            'country' => 'Bangladesh',
        ]);

        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);

        $this->businessUnit = BusinessUnit::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'name' => 'Procurement BU',
            'code' => 'BU-' . Str::random(5),
        ]);

        $this->branch = Branch::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'name' => 'Central Hub Branch',
            'code' => 'BR-' . Str::random(5),
        ]);

        $this->warehouse = Warehouse::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'branch_id' => $this->branch->id,
            'name' => 'Central Receiving Warehouse',
            'code' => 'WH-' . Str::random(5),
            'is_active' => true,
        ]);

        $this->storageLocation = StorageLocation::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'code' => 'AISLE-01-BAY-02',
            'name' => 'Bulk Receiving Bay 2',
            'is_active' => true,
        ]);

        // 2. Catalog Setup
        $cat = Category::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'name' => 'Hardware Materials',
            'code' => 'CAT-' . Str::random(5),
        ]);

        $unit = Unit::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'name' => 'Piece',
            'short_code' => 'PCS',
        ]);

        $this->product = Product::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'category_id' => $cat->id,
            'unit_id' => $unit->id,
            'name' => 'Precision Industrial Bolt',
            'code' => 'PROD-' . Str::random(5),
            'type' => 'STANDARD',
            'is_active' => true,
        ]);

        $this->variant = ProductVariant::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'sku' => 'SKU-BOLT-M8',
            'name' => 'M8 x 50mm Bolt',
            'is_active' => true,
        ]);

        $this->stockBatch = StockBatch::create([
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'variant_id' => $this->variant->id,
            'batch_no' => 'BATCH-G15-001',
            'mfg_date' => '2026-01-01',
            'exp_date' => '2027-12-31',
            'unit_cost' => 25.0,
            'status' => 'ACTIVE',
        ]);

        // 3. Supplier Setup
        $this->supplier = Supplier::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'supplier_code' => 'SUP-AP-001',
            'name' => 'Apex Steel Supplies Ltd',
            'opening_balance' => 0,
            'is_active' => true,
        ]);

        // 4. Fiscal Year & Accounting Period Setup (Open for 2026)
        $this->fiscalYear = FiscalYear::create([
            'company_id' => $this->company->id,
            'name' => 'FY 2026',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'status' => 'OPEN',
            'created_by' => $this->user->id,
        ]);

        $this->accountingPeriod = AccountingPeriod::create([
            'company_id' => $this->company->id,
            'fiscal_year_id' => $this->fiscalYear->id,
            'name' => 'Period 2026-01 to 2026-12',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'status' => 'OPEN',
            'created_by' => $this->user->id,
        ]);

        // 5. Chart of Accounts Setup
        $assetGroup = AccountGroup::create([
            'company_id' => $this->company->id,
            'name' => 'Current Assets',
            'code' => '1000',
            'account_type' => 'ASSET',
        ]);

        $liabGroup = AccountGroup::create([
            'company_id' => $this->company->id,
            'name' => 'Current Liabilities',
            'code' => '2000',
            'account_type' => 'LIABILITY',
        ]);

        $this->inventoryAssetAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $assetGroup->id,
            'account_code' => '1500',
            'account_name' => 'Inventory Asset',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->apClearingAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $liabGroup->id,
            'account_code' => '2050',
            'account_name' => 'Goods Received Not Invoiced (AP Clearing)',
            'account_type' => 'LIABILITY',
            'normal_balance' => 'CREDIT',
            'is_active' => true,
        ]);

        $this->accountsPayableAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $liabGroup->id,
            'account_code' => '2000',
            'account_name' => 'Trade Accounts Payable',
            'account_type' => 'LIABILITY',
            'normal_balance' => 'CREDIT',
            'is_active' => true,
        ]);

        $this->cashBankAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $assetGroup->id,
            'account_code' => '1000',
            'account_name' => 'Corporate Operating Bank Account',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        // 6. Explicit Account Mappings
        $this->mappingService->setAccountingEnabled($this->company->id, true);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_INVENTORY_ASSET, $this->inventoryAssetAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_AP_CLEARING, $this->apClearingAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_ACCOUNTS_PAYABLE, $this->accountsPayableAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_CASH_BANK, $this->cashBankAccount->id);
    }

    /**
     * Helper to create an approved Purchase Order.
     */
    protected function createApprovedPurchaseOrder(float $quantity = 100, float $unitCost = 25.0): PurchaseOrder
    {
        $po = PurchaseOrder::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'supplier_id' => $this->supplier->id,
            'warehouse_id' => $this->warehouse->id,
            'po_number' => 'PO-' . strtoupper(Str::random(6)),
            'order_date' => '2026-02-01',
            'status' => 'APPROVED',
            'approved_by' => $this->user->id,
            'approved_at' => now(),
            'grand_total' => $quantity * $unitCost,
            'subtotal' => $quantity * $unitCost,
        ]);

        PurchaseOrderItem::create([
            'purchase_order_id' => $po->id,
            'product_id' => $this->product->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => $quantity,
            'unit_cost' => $unitCost,
            'line_total' => $quantity * $unitCost,
            'received_quantity' => 0,
            'pending_quantity' => $quantity,
        ]);

        return $po;
    }

    /**
     * Helper to create a Draft Goods Receipt.
     */
    protected function createDraftGoodsReceipt(
        PurchaseOrder $po,
        float $receivedQty = 100,
        float $unitCost = 25.0,
        ?int $locationId = null,
        ?int $batchId = null,
        ?string $batchNumber = null
    ): GoodsReceipt {
        $poItem = $po->items()->first();

        $gr = GoodsReceipt::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'supplier_id' => $po->supplier_id,
            'warehouse_id' => $po->warehouse_id,
            'purchase_order_id' => $po->id,
            'receipt_number' => 'GR-' . strtoupper(Str::random(6)),
            'receipt_date' => '2026-02-05',
            'status' => 'DRAFT',
            'created_by' => $this->user->id,
        ]);

        GoodsReceiptItem::create([
            'goods_receipt_id' => $gr->id,
            'purchase_order_item_id' => $poItem->id,
            'product_id' => $poItem->product_id,
            'product_variant_id' => $poItem->product_variant_id,
            'received_quantity' => $receivedQty,
            'unit_cost' => $unitCost,
            'total_cost' => $receivedQty * $unitCost,
            'storage_location_id' => $locationId,
            'stock_batch_id' => $batchId,
            'batch_number' => $batchNumber,
            'expiry_date' => '2027-12-31',
        ]);

        return $gr;
    }

    // =========================================================================
    // SCENARIOS 01 - 04: VALIDATION & PO STATUS
    // =========================================================================

    public function test_01_goods_receipt_requires_approved_purchase_order()
    {
        $po = $this->createApprovedPurchaseOrder(50, 10);
        $gr = $this->createDraftGoodsReceipt($po, 50, 10);

        $posted = $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);
        $this->assertEquals('POSTED', $posted->status);
    }

    public function test_02_draft_po_cannot_be_received()
    {
        $po = $this->createApprovedPurchaseOrder(50, 10);
        $po->update(['status' => 'DRAFT']);

        $gr = $this->createDraftGoodsReceipt($po, 50, 10);

        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage("Purchase Order must be APPROVED or PARTIALLY_RECEIVED to post a receipt.");

        $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);
    }

    public function test_03_cancelled_po_cannot_be_received()
    {
        $po = $this->createApprovedPurchaseOrder(50, 10);
        $po->update(['status' => 'CANCELLED']);

        $gr = $this->createDraftGoodsReceipt($po, 50, 10);

        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage("Purchase Order must be APPROVED or PARTIALLY_RECEIVED to post a receipt.");

        $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);
    }

    public function test_04_goods_receipt_prevents_over_receiving()
    {
        $po = $this->createApprovedPurchaseOrder(50, 10);
        $gr = $this->createDraftGoodsReceipt($po, 60, 10); // Attempting to receive 60 against 50 pending

        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage("Cannot over-receive item.");

        $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);
    }

    // =========================================================================
    // SCENARIOS 05 - 08: INVENTORY POSITION & STOCK MOVEMENTS
    // =========================================================================

    public function test_05_successful_goods_receipt_increases_inventory()
    {
        $po = $this->createApprovedPurchaseOrder(100, 20.0);
        $gr = $this->createDraftGoodsReceipt($po, 100, 20.0);

        $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);

        $inv = Inventory::where('company_id', $this->company->id)
            ->where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant->id)
            ->first();

        $this->assertNotNull($inv);
        $this->assertEquals(100.0, (float) $inv->quantity);
        $this->assertEquals(20.0, (float) $inv->average_cost);
        $this->assertEquals(2000.0, (float) $inv->total_value);
    }

    public function test_06_moving_average_cost_is_correct()
    {
        // First receipt: 100 units @ $20.00
        $po1 = $this->createApprovedPurchaseOrder(100, 20.0);
        $gr1 = $this->createDraftGoodsReceipt($po1, 100, 20.0);
        $this->purchaseService->postGoodsReceipt($gr1->id, $this->user->id);

        // Second receipt: 100 units @ $30.00
        // New average cost = (100 * 20 + 100 * 30) / 200 = 5000 / 200 = 25.00
        $po2 = $this->createApprovedPurchaseOrder(100, 30.0);
        $gr2 = $this->createDraftGoodsReceipt($po2, 100, 30.0);
        $this->purchaseService->postGoodsReceipt($gr2->id, $this->user->id);

        $inv = Inventory::where('company_id', $this->company->id)
            ->where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant->id)
            ->first();

        $this->assertEquals(200.0, (float) $inv->quantity);
        $this->assertEquals(25.0, (float) $inv->average_cost);
        $this->assertEquals(5000.0, (float) $inv->total_value);
    }

    public function test_07_stock_movement_is_created_correctly()
    {
        $po = $this->createApprovedPurchaseOrder(40, 15.0);
        $gr = $this->createDraftGoodsReceipt($po, 40, 15.0);

        $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);

        $movement = StockMovement::where('company_id', $this->company->id)
            ->where('reference_type', 'GoodsReceipt')
            ->where('reference_id', $gr->id)
            ->first();

        $this->assertNotNull($movement);
        $this->assertEquals('STOCK_IN', $movement->movement_type);
        $this->assertEquals(40.0, (float) $movement->quantity);
        $this->assertEquals(15.0, (float) $movement->unit_cost);
        $this->assertEquals(600.0, (float) $movement->total_cost);
        $this->assertEquals($gr->receipt_number, $movement->reference_number);
    }

    public function test_08_stock_movement_remains_immutable()
    {
        $po = $this->createApprovedPurchaseOrder(25, 10.0);
        $gr = $this->createDraftGoodsReceipt($po, 25, 10.0);
        $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);

        $movement = StockMovement::where('reference_type', 'GoodsReceipt')
            ->where('reference_id', $gr->id)
            ->first();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage("StockMovement records are immutable and cannot be updated.");

        $movement->quantity = 999;
        $movement->save();
    }

    // =========================================================================
    // SCENARIOS 09 - 13: BATCH, LOCATION, PO PROGRESSION
    // =========================================================================

    public function test_09_batch_receiving_updates_stock_batch_and_inventory_batch()
    {
        $po = $this->createApprovedPurchaseOrder(50, 12.0);
        $gr = $this->createDraftGoodsReceipt(
            po: $po,
            receivedQty: 50,
            unitCost: 12.0,
            batchId: $this->stockBatch->id,
            batchNumber: 'BATCH-G15-001'
        );

        $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);

        $inv = Inventory::where('product_variant_id', $this->variant->id)->first();
        $invBatch = InventoryBatch::where('inventory_id', $inv->id)
            ->where('stock_batch_id', $this->stockBatch->id)
            ->first();

        $this->assertNotNull($invBatch);
        $this->assertEquals(50.0, (float) $invBatch->quantity);
    }

    public function test_10_storage_location_receiving_updates_correct_location()
    {
        $po = $this->createApprovedPurchaseOrder(75, 10.0);
        $gr = $this->createDraftGoodsReceipt(
            po: $po,
            receivedQty: 75,
            unitCost: 10.0,
            locationId: $this->storageLocation->id
        );

        $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);

        $movement = StockMovement::where('reference_id', $gr->id)->first();
        $this->assertEquals($this->storageLocation->id, $movement->storage_location_id);
    }

    public function test_11_goods_receipt_updates_po_received_quantity()
    {
        $po = $this->createApprovedPurchaseOrder(100, 10.0);
        $gr = $this->createDraftGoodsReceipt($po, 40, 10.0);

        $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);

        $poItem = $po->items()->first()->fresh();
        $this->assertEquals(40.0, (float) $poItem->received_quantity);
        $this->assertEquals(60.0, (float) $poItem->pending_quantity);
    }

    public function test_12_partial_receipt_sets_partially_received()
    {
        $po = $this->createApprovedPurchaseOrder(100, 10.0);
        $gr = $this->createDraftGoodsReceipt($po, 30, 10.0);

        $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);

        $po->refresh();
        $this->assertEquals('PARTIALLY_RECEIVED', $po->status);
    }

    public function test_13_complete_receipt_sets_fully_received()
    {
        $po = $this->createApprovedPurchaseOrder(100, 10.0);
        $gr = $this->createDraftGoodsReceipt($po, 100, 10.0);

        $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);

        $po->refresh();
        $this->assertEquals('FULLY_RECEIVED', $po->status);
    }

    // =========================================================================
    // SCENARIOS 14 - 19: ACCOUNTING & FISCAL PERIOD CONTROLS
    // =========================================================================

    public function test_14_accounting_enabled_posts_dr_inventory_asset_cr_ap_clearing()
    {
        $po = $this->createApprovedPurchaseOrder(100, 25.0);
        $gr = $this->createDraftGoodsReceipt($po, 100, 25.0);

        $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);

        $journal = JournalEntry::where('company_id', $this->company->id)
            ->where('reference_type', 'GoodsReceipt')
            ->where('reference_id', $gr->id)
            ->first();

        $this->assertNotNull($journal);
        $this->assertEquals('PURCHASE-GR-' . $gr->id, $journal->idempotency_key);
        $this->assertEquals('POSTED', $journal->status);

        $debitLine = $journal->lines()->where('account_id', $this->inventoryAssetAccount->id)->first();
        $creditLine = $journal->lines()->where('account_id', $this->apClearingAccount->id)->first();

        $this->assertNotNull($debitLine);
        $this->assertNotNull($creditLine);
        $this->assertEquals(2500.0, (float) $debitLine->debit);
        $this->assertEquals(0.0, (float) $debitLine->credit);
        $this->assertEquals(0.0, (float) $creditLine->debit);
        $this->assertEquals(2500.0, (float) $creditLine->credit);
    }

    public function test_15_goods_receipt_journal_is_balanced()
    {
        $po = $this->createApprovedPurchaseOrder(80, 12.5);
        $gr = $this->createDraftGoodsReceipt($po, 80, 12.5);

        $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);

        $journal = JournalEntry::where('reference_id', $gr->id)->first();
        $totalDebit = (float) $journal->lines()->sum('debit');
        $totalCredit = (float) $journal->lines()->sum('credit');
        $this->assertEquals(1000.0, $totalDebit);
        $this->assertEquals(1000.0, $totalCredit);
        $this->assertTrue(abs($totalDebit - $totalCredit) < 0.0001);
    }

    public function test_16_missing_ap_clearing_mapping_fails_atomically()
    {
        // Unmap AP clearing
        Setting::where('company_id', $this->company->id)
            ->where('group', 'accounting_mapping')
            ->where('key', AccountMappingService::ROLE_AP_CLEARING)
            ->delete();

        $po = $this->createApprovedPurchaseOrder(50, 10.0);
        $gr = $this->createDraftGoodsReceipt($po, 50, 10.0);

        try {
            $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);
            $this->fail("Expected ConflictHttpException due to missing AP Clearing mapping.");
        } catch (ConflictHttpException $e) {
            $this->assertStringContainsString("ap_clearing", $e->getMessage());
        }

        // Verify total transaction rollback: receipt is still DRAFT, inventory not added
        $gr->refresh();
        $this->assertEquals('DRAFT', $gr->status);
        $this->assertNull(Inventory::where('company_id', $this->company->id)->first());
        $this->assertEquals(0, StockMovement::count());
        $this->assertEquals(0, JournalEntry::count());
    }

    public function test_17_closed_accounting_period_fails_atomically()
    {
        // Close the accounting period
        $this->accountingPeriod->update(['status' => 'CLOSED']);

        $po = $this->createApprovedPurchaseOrder(50, 10.0);
        $gr = $this->createDraftGoodsReceipt($po, 50, 10.0);

        try {
            $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);
            $this->fail("Expected ConflictHttpException due to closed accounting period.");
        } catch (ConflictHttpException $e) {
            $this->assertStringContainsString("period", strtolower($e->getMessage()));
        }

        // Verify total transaction rollback
        $gr->refresh();
        $this->assertEquals('DRAFT', $gr->status);
        $this->assertEquals(0, StockMovement::count());
        $this->assertEquals(0, JournalEntry::count());
    }

    public function test_18_closed_fiscal_year_fails_atomically()
    {
        // Close the fiscal year
        $this->fiscalYear->update(['status' => 'CLOSED']);

        $po = $this->createApprovedPurchaseOrder(50, 10.0);
        $gr = $this->createDraftGoodsReceipt($po, 50, 10.0);

        try {
            $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);
            $this->fail("Expected ConflictHttpException due to closed fiscal year.");
        } catch (ConflictHttpException $e) {
            $this->assertStringContainsString("fiscal year", strtolower($e->getMessage()));
        }

        // Verify total transaction rollback
        $gr->refresh();
        $this->assertEquals('DRAFT', $gr->status);
        $this->assertEquals(0, StockMovement::count());
        $this->assertEquals(0, JournalEntry::count());
    }

    public function test_19_accounting_disabled_creates_no_journal_entry()
    {
        // Disable auto posting
        $this->mappingService->setAccountingEnabled($this->company->id, false);

        $po = $this->createApprovedPurchaseOrder(50, 10.0);
        $gr = $this->createDraftGoodsReceipt($po, 50, 10.0);

        $posted = $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);

        $this->assertEquals('POSTED', $posted->status);
        // Inventory and StockMovement exist
        $this->assertEquals(1, StockMovement::count());
        // Zero GL journal entries
        $this->assertEquals(0, JournalEntry::count());
    }

    // =========================================================================
    // SCENARIOS 20 - 24: IDEMPOTENCY & PURCHASE INVOICE
    // =========================================================================

    public function test_20_goods_receipt_idempotency_prevents_duplicate_inventory()
    {
        $po = $this->createApprovedPurchaseOrder(100, 10.0);
        $gr = $this->createDraftGoodsReceipt($po, 100, 10.0);

        $res1 = $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);
        $res2 = $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);

        $this->assertEquals('POSTED', $res1->status);
        $this->assertEquals('POSTED', $res2->status);

        // Inventory is exactly 100, not 200
        $inv = Inventory::where('product_variant_id', $this->variant->id)->first();
        $this->assertEquals(100.0, (float) $inv->quantity);

        // Only 1 stock movement
        $this->assertEquals(1, StockMovement::where('reference_id', $gr->id)->count());
    }

    public function test_21_goods_receipt_idempotency_prevents_duplicate_journal()
    {
        $po = $this->createApprovedPurchaseOrder(100, 10.0);
        $gr = $this->createDraftGoodsReceipt($po, 100, 10.0);

        $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);
        $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);

        // Exactly 1 JournalEntry
        $this->assertEquals(1, JournalEntry::where('reference_id', $gr->id)->count());
    }

    public function test_22_purchase_invoice_posts_dr_ap_clearing_cr_accounts_payable()
    {
        $purchase = Purchase::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'supplier_id' => $this->supplier->id,
            'supplier_invoice_number' => 'INV-AP-999',
            'invoice_date' => '2026-02-10',
            'grand_total' => 2500.0,
            'status' => 'DRAFT',
            'created_by' => $this->user->id,
        ]);

        $this->purchaseService->postPurchaseInvoice($purchase->id, $this->user->id);

        $journal = JournalEntry::where('company_id', $this->company->id)
            ->where('reference_type', 'Purchase')
            ->where('reference_id', $purchase->id)
            ->first();

        $this->assertNotNull($journal);
        $this->assertEquals('PURCHASE-INV-' . $purchase->id, $journal->idempotency_key);

        $debitLine = $journal->lines()->where('account_id', $this->apClearingAccount->id)->first();
        $creditLine = $journal->lines()->where('account_id', $this->accountsPayableAccount->id)->first();

        $this->assertNotNull($debitLine);
        $this->assertNotNull($creditLine);
        $this->assertEquals(2500.0, (float) $debitLine->debit);
        $this->assertEquals(2500.0, (float) $creditLine->credit);
    }

    public function test_23_purchase_invoice_updates_supplier_ledger_correctly()
    {
        $purchase = Purchase::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'supplier_id' => $this->supplier->id,
            'supplier_invoice_number' => 'INV-SUP-101',
            'invoice_date' => '2026-02-10',
            'grand_total' => 1500.0,
            'status' => 'DRAFT',
            'created_by' => $this->user->id,
        ]);

        $this->purchaseService->postPurchaseInvoice($purchase->id, $this->user->id);

        $ledger = SupplierLedger::where('company_id', $this->company->id)
            ->where('supplier_id', $this->supplier->id)
            ->where('reference_id', $purchase->id)
            ->first();

        $this->assertNotNull($ledger);
        $this->assertEquals('PURCHASE', $ledger->transaction_type);
        $this->assertEquals(1500.0, (float) $ledger->credit);
        $this->assertEquals(0.0, (float) $ledger->debit);
        $this->assertEquals(1500.0, (float) $ledger->balance_after);
    }

    public function test_24_repeated_invoice_posting_does_not_duplicate_ledger()
    {
        $purchase = Purchase::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'supplier_id' => $this->supplier->id,
            'supplier_invoice_number' => 'INV-SUP-102',
            'invoice_date' => '2026-02-10',
            'grand_total' => 800.0,
            'status' => 'DRAFT',
            'created_by' => $this->user->id,
        ]);

        $this->purchaseService->postPurchaseInvoice($purchase->id, $this->user->id);
        $this->purchaseService->postPurchaseInvoice($purchase->id, $this->user->id);

        // Exactly 1 SupplierLedger record
        $this->assertEquals(1, SupplierLedger::where('reference_id', $purchase->id)->count());
        // Exactly 1 JournalEntry
        $this->assertEquals(1, JournalEntry::where('reference_id', $purchase->id)->count());
    }

    // =========================================================================
    // SCENARIOS 25 - 27: SUPPLIER PAYMENT & ALLOCATION
    // =========================================================================

    public function test_25_supplier_payment_creates_correct_accounting()
    {
        $paymentData = [
            'amount' => 1500.0,
            'payment_type' => 'SUPPLIER',
            'payment_method' => 'BANK_TRANSFER',
            'payment_date' => '2026-02-15',
            'idempotency_key' => 'IDEMP-PAY-' . Str::uuid(),
        ];

        $payment = $this->paymentService->createPayment($this->company->id, $paymentData, $this->user->id);

        $journal = JournalEntry::where('reference_type', 'Payment')
            ->where('reference_id', $payment->id)
            ->first();

        $this->assertNotNull($journal);

        // Debit: Accounts Payable, Credit: Cash / Bank
        $debitLine = $journal->lines()->where('account_id', $this->accountsPayableAccount->id)->first();
        $creditLine = $journal->lines()->where('account_id', $this->cashBankAccount->id)->first();

        $this->assertNotNull($debitLine);
        $this->assertNotNull($creditLine);
        $this->assertEquals(1500.0, (float) $debitLine->debit);
        $this->assertEquals(1500.0, (float) $creditLine->credit);
    }

    public function test_26_payment_allocation_reconciles_purchase_outstanding()
    {
        $purchase = Purchase::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'supplier_id' => $this->supplier->id,
            'supplier_invoice_number' => 'INV-ALLOC-001',
            'invoice_date' => '2026-02-10',
            'grand_total' => 2000.0,
            'status' => 'POSTED',
            'created_by' => $this->user->id,
        ]);

        $payment = $this->paymentService->createPayment($this->company->id, [
            'amount' => 2000.0,
            'payment_type' => 'SUPPLIER',
            'payment_method' => 'CASH',
            'idempotency_key' => 'IDEMP-PAY-' . Str::uuid(),
        ], $this->user->id);

        $this->assertEquals(2000.0, $purchase->due_amount);
        $this->assertEquals('DUE', $purchase->payment_status);

        // Allocate 1200
        $this->paymentService->allocatePayment($this->company->id, $payment->id, [
            [
                'allocatable_type' => 'Purchase',
                'allocatable_id' => $purchase->id,
                'amount' => 1200.0,
            ]
        ], $this->user->id);

        $purchase->refresh();
        $this->assertEquals(1200.0, $purchase->paid_amount);
        $this->assertEquals(800.0, $purchase->due_amount);
        $this->assertEquals('PARTIAL', $purchase->payment_status);

        // Allocate remaining 800
        $this->paymentService->allocatePayment($this->company->id, $payment->id, [
            [
                'allocatable_type' => 'Purchase',
                'allocatable_id' => $purchase->id,
                'amount' => 800.0,
            ]
        ], $this->user->id);

        $purchase->refresh();
        $this->assertEquals(2000.0, $purchase->paid_amount);
        $this->assertEquals(0.0, $purchase->due_amount);
        $this->assertEquals('PAID', $purchase->payment_status);
    }

    public function test_27_payment_allocation_cannot_exceed_purchase_balance()
    {
        $purchase = Purchase::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'supplier_id' => $this->supplier->id,
            'supplier_invoice_number' => 'INV-ALLOC-002',
            'invoice_date' => '2026-02-10',
            'grand_total' => 1000.0,
            'status' => 'POSTED',
            'created_by' => $this->user->id,
        ]);

        $payment = $this->paymentService->createPayment($this->company->id, [
            'amount' => 2000.0,
            'payment_type' => 'SUPPLIER',
            'payment_method' => 'CASH',
            'idempotency_key' => 'IDEMP-PAY-' . Str::uuid(),
        ], $this->user->id);

        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage("exceeds outstanding document balance");

        // Attempting to allocate 1500 to a 1000 document
        $this->paymentService->allocatePayment($this->company->id, $payment->id, [
            [
                'allocatable_type' => 'Purchase',
                'allocatable_id' => $purchase->id,
                'amount' => 1500.0,
            ]
        ], $this->user->id);
    }

    // =========================================================================
    // SCENARIOS 28 - 31: MULTI-TENANT ISOLATION
    // =========================================================================

    public function test_28_cross_company_purchase_isolation()
    {
        $companyB = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Foreign Corp B',
            'code' => 'COMP-B-' . Str::random(5),
            'country' => 'Bangladesh',
        ]);

        $poB = PurchaseOrder::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $companyB->id,
            'supplier_id' => $this->supplier->id,
            'warehouse_id' => $this->warehouse->id,
            'po_number' => 'PO-FOREIGN',
            'order_date' => '2026-02-01',
            'status' => 'APPROVED',
            'grand_total' => 100,
            'subtotal' => 100,
        ]);

        // Attempting to create GR for Company A linked to Company B's PO
        $gr = GoodsReceipt::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'supplier_id' => $this->supplier->id,
            'warehouse_id' => $this->warehouse->id,
            'purchase_order_id' => $poB->id,
            'receipt_number' => 'GR-CROSS',
            'receipt_date' => '2026-02-05',
            'status' => 'DRAFT',
            'created_by' => $this->user->id,
        ]);

        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage("Purchase Order company mismatch.");

        $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);
    }

    public function test_29_cross_company_warehouse_isolation()
    {
        $companyB = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Foreign Corp B',
            'code' => 'COMP-B-' . Str::random(5),
            'country' => 'Bangladesh',
        ]);

        $foreignWarehouse = Warehouse::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $companyB->id,
            'name' => 'Foreign Warehouse',
            'code' => 'WH-FOR-' . Str::random(5),
            'is_active' => true,
        ]);

        $po = $this->createApprovedPurchaseOrder(50, 10);
        $gr = $this->createDraftGoodsReceipt($po, 50, 10);
        $gr->update(['warehouse_id' => $foreignWarehouse->id]);

        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage("Warehouse does not belong to the receipt's company.");

        $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);
    }

    public function test_30_cross_company_storage_location_isolation()
    {
        $companyB = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Foreign Corp B',
            'code' => 'COMP-B-' . Str::random(5),
            'country' => 'Bangladesh',
        ]);

        $foreignWarehouse = Warehouse::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $companyB->id,
            'name' => 'Foreign Warehouse B',
            'code' => 'WH-B-' . Str::random(5),
            'is_active' => true,
        ]);

        $foreignLocation = StorageLocation::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $companyB->id,
            'warehouse_id' => $foreignWarehouse->id,
            'code' => 'FOR-LOC-01',
            'name' => 'Foreign Location',
            'is_active' => true,
        ]);

        $po = $this->createApprovedPurchaseOrder(50, 10);
        $gr = $this->createDraftGoodsReceipt($po, 50, 10, locationId: $foreignLocation->id);

        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage("Storage location #{$foreignLocation->id} does not belong to warehouse");

        $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);
    }

    public function test_31_cross_company_stock_batch_isolation()
    {
        $companyB = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Foreign Corp B',
            'code' => 'COMP-B-' . Str::random(5),
            'country' => 'Bangladesh',
        ]);

        $foreignBatch = StockBatch::create([
            'company_id' => $companyB->id,
            'product_id' => $this->product->id,
            'variant_id' => $this->variant->id,
            'batch_no' => 'FOREIGN-BATCH-001',
            'status' => 'ACTIVE',
        ]);

        $po = $this->createApprovedPurchaseOrder(50, 10);
        $gr = $this->createDraftGoodsReceipt($po, 50, 10, batchId: $foreignBatch->id);

        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage("Stock batch #{$foreignBatch->id} does not belong to product");

        $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);
    }

    // =========================================================================
    // SCENARIOS 32 - 35: CONCURRENCY, ROLLBACK ATOMICITY, AUDIT
    // =========================================================================

    public function test_32_concurrent_goods_receipt_posting_does_not_double_receive()
    {
        $po = $this->createApprovedPurchaseOrder(100, 20.0);
        $gr = $this->createDraftGoodsReceipt($po, 100, 20.0);

        // Simulate two sequential attempts or racing callers
        $first = $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);
        $second = $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);

        $this->assertEquals('POSTED', $first->status);
        $this->assertEquals('POSTED', $second->status);

        // Quantity in warehouse is strictly 100, not 200
        $inv = Inventory::where('product_variant_id', $this->variant->id)->first();
        $this->assertEquals(100.0, (float) $inv->quantity);

        // Exactly 1 StockMovement
        $this->assertEquals(1, StockMovement::where('reference_id', $gr->id)->count());
    }

    public function test_33_failure_during_accounting_rolls_back_inventory()
    {
        // Close period so accounting fails
        $this->accountingPeriod->update(['status' => 'CLOSED']);

        $po = $this->createApprovedPurchaseOrder(100, 20.0);
        $gr = $this->createDraftGoodsReceipt($po, 100, 20.0);

        $this->assertNull(Inventory::where('product_variant_id', $this->variant->id)->first());

        try {
            $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);
            $this->fail("Expected ConflictHttpException from accounting failure.");
        } catch (ConflictHttpException $e) {
            // Expected
        }

        // Inventory must be rolled back (null)
        $this->assertNull(Inventory::where('product_variant_id', $this->variant->id)->first());
        $this->assertEquals(0, StockMovement::count());

        // PO status and received quantity must be untouched
        $poItem = $po->items()->first()->fresh();
        $this->assertEquals(0.0, (float) $poItem->received_quantity);
        $this->assertEquals(100.0, (float) $poItem->pending_quantity);
        $this->assertEquals('APPROVED', $po->fresh()->status);
    }

    public function test_34_failure_during_inventory_rolls_back_accounting()
    {
        $po = $this->createApprovedPurchaseOrder(100, 20.0);
        // Request 150 to cause inventory over-receive failure
        $gr = $this->createDraftGoodsReceipt($po, 150, 20.0);

        try {
            $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);
            $this->fail("Expected over-receive exception.");
        } catch (ConflictHttpException $e) {
            // Expected
        }

        // No journal entry created
        $this->assertEquals(0, JournalEntry::count());
        $this->assertEquals(0, StockMovement::count());
    }

    public function test_35_audit_log_is_created_once_for_successful_posting()
    {
        $po = $this->createApprovedPurchaseOrder(50, 10.0);
        $gr = $this->createDraftGoodsReceipt($po, 50, 10.0);

        $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);

        $auditCount = AuditLog::where('company_id', $this->company->id)
            ->where('event', 'GOODS_RECEIPT_POSTED')
            ->where('auditable_type', GoodsReceipt::class)
            ->where('auditable_id', $gr->id)
            ->count();

        $this->assertEquals(1, $auditCount);

        // Post again (idempotent call)
        $this->purchaseService->postGoodsReceipt($gr->id, $this->user->id);

        $auditCountAfter = AuditLog::where('company_id', $this->company->id)
            ->where('event', 'GOODS_RECEIPT_POSTED')
            ->where('auditable_type', GoodsReceipt::class)
            ->where('auditable_id', $gr->id)
            ->count();

        $this->assertEquals(1, $auditCountAfter);
    }
}
