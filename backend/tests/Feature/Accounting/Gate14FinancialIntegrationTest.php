<?php

namespace Tests\Feature\Accounting;

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
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Purchase;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Sale;
use App\Models\Setting;
use App\Models\StockMovement;
use App\Models\Supplier;
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
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Tests\TestCase;

class Gate14FinancialIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected Company $company;
    protected User $user;
    protected Warehouse $warehouseA;
    protected Warehouse $warehouseB;
    protected Product $product;
    protected ProductVariant $variant;

    protected FiscalYear $fiscalYear;
    protected AccountingPeriod $accountingPeriod;

    protected Account $inventoryAssetAccount;
    protected Account $inventoryAdjustmentAccount;
    protected Account $accountsPayableAccount;
    protected Account $accountsReceivableAccount;
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

        // 1. Core Organization Setup
        $this->company = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Gate 1.4 Financial Test Corp',
            'code' => 'G14-COMP-' . Str::random(5),
            'country' => 'Bangladesh',
        ]);

        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);

        $bu = BusinessUnit::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'name' => 'Main BU',
            'code' => 'BU-' . Str::random(5),
        ]);

        $branch = Branch::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $bu->id,
            'name' => 'Main Branch',
            'code' => 'BR-' . Str::random(5),
        ]);

        $this->warehouseA = Warehouse::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $bu->id,
            'branch_id' => $branch->id,
            'name' => 'Warehouse Alpha',
            'code' => 'WH-A-' . Str::random(5),
            'is_active' => true,
        ]);

        $this->warehouseB = Warehouse::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $bu->id,
            'branch_id' => $branch->id,
            'name' => 'Warehouse Beta',
            'code' => 'WH-B-' . Str::random(5),
            'is_active' => true,
        ]);

        // 2. Catalog Setup
        $cat = Category::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'name' => 'General Cat',
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
            'name' => 'Integration Item',
            'code' => 'PROD-' . Str::random(5),
            'type' => 'STANDARD',
            'is_active' => true,
        ]);

        $this->variant = ProductVariant::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'sku' => 'SKU-G14-' . Str::random(5),
            'name' => 'Standard Variant',
            'is_active' => true,
        ]);

        // 3. Fiscal Year & Period Setup (Open for 2026)
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

        // 4. Accounts & Groups Setup
        $grpAsset = AccountGroup::create([
            'company_id' => $this->company->id,
            'name' => 'Current Assets',
            'code' => '1000',
            'account_type' => 'ASSET',
        ]);

        $grpLiab = AccountGroup::create([
            'company_id' => $this->company->id,
            'name' => 'Current Liabilities',
            'code' => '2000',
            'account_type' => 'LIABILITY',
        ]);

        $grpExp = AccountGroup::create([
            'company_id' => $this->company->id,
            'name' => 'Operating Expenses',
            'code' => '5000',
            'account_type' => 'EXPENSE',
        ]);

        $this->inventoryAssetAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpAsset->id,
            'account_code' => '1500',
            'account_name' => 'Merchandise Inventory Asset',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->inventoryAdjustmentAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpExp->id,
            'account_code' => '5050',
            'account_name' => 'Inventory Discrepancy / Adjustment',
            'account_type' => 'EXPENSE',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->accountsPayableAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpLiab->id,
            'account_code' => '2000',
            'account_name' => 'Accounts Payable Clearing',
            'account_type' => 'LIABILITY',
            'normal_balance' => 'CREDIT',
            'is_active' => true,
        ]);

        $this->accountsReceivableAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpAsset->id,
            'account_code' => '1200',
            'account_name' => 'Accounts Receivable Control',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->cashBankAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpAsset->id,
            'account_code' => '1010',
            'account_name' => 'Main Operating Cash Account',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        // 5. Explicit Account Mappings
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_INVENTORY_ASSET, $this->inventoryAssetAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_INVENTORY_ADJUSTMENT, $this->inventoryAdjustmentAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_ACCOUNTS_PAYABLE, $this->accountsPayableAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_AP_CLEARING, $this->accountsPayableAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_ACCOUNTS_RECEIVABLE, $this->accountsReceivableAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_CASH_BANK, $this->cashBankAccount->id);

        // 6. Enable Automated Accounting
        $this->mappingService->setAccountingEnabled($this->company->id, true);
    }

    /**
     * Test 1: Mapping an inactive account throws ConflictHttpException.
     */
    public function test_account_mapping_requires_active_account()
    {
        $this->inventoryAssetAccount->is_active = false;
        $this->inventoryAssetAccount->save();

        $this->expectException(ConflictHttpException::class);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_INVENTORY_ASSET, $this->inventoryAssetAccount->id);
    }

    /**
     * Test 2: Accessing unmapped role throws ConflictHttpException.
     */
    public function test_account_mapping_missing_throws_exception()
    {
        $this->expectException(ConflictHttpException::class);
        $this->mappingService->getAccount($this->company->id, 'non_existent_role');
    }

    /**
     * Test 3: Setting valid mapping persists and resolves correctly.
     */
    public function test_account_mapping_persists_and_resolves_correctly()
    {
        $resolved = $this->mappingService->getAccount($this->company->id, AccountMappingService::ROLE_INVENTORY_ASSET);
        $this->assertNotNull($resolved);
        $this->assertEquals($this->inventoryAssetAccount->id, $resolved->id);
        $this->assertTrue($this->mappingService->isConfigured($this->company->id, AccountMappingService::ROLE_INVENTORY_ASSET));
    }

    /**
     * Test 4: When accounting is disabled, stock adjustment succeeds with ZERO journals created.
     */
    public function test_accounting_disabled_by_default_creates_zero_journals_on_adjustment_in()
    {
        $this->mappingService->setAccountingEnabled($this->company->id, false);

        $movement = $this->inventoryService->adjustmentIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 10.0,
            unitCost: 25.0,
            referenceType: 'PhysicalCount',
            referenceId: 101,
            referenceNumber: 'ADJ-IN-101',
            reason: 'Found unexpected extra boxes',
            userId: $this->user->id
        );

        $this->assertNotNull($movement);
        $this->assertEquals(10.0, (float)$movement->quantity);
        $this->assertEquals(0, JournalEntry::where('company_id', $this->company->id)->count());
    }

    /**
     * Test 5: Stock adjustment IN posts balanced journal entry when accounting is enabled.
     */
    public function test_adjustment_in_posts_balanced_journal_when_enabled()
    {
        $movement = $this->inventoryService->adjustmentIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 10.0,
            unitCost: 15.0, // Total = 150.00
            referenceType: 'CycleCount',
            referenceId: 201,
            referenceNumber: 'ADJ-IN-201',
            reason: 'Inventory reconciliation',
            userId: $this->user->id
        );

        $this->assertNotNull($movement);

        $journal = JournalEntry::where('company_id', $this->company->id)
            ->where('reference_type', 'StockMovement')
            ->where('reference_id', $movement->id)
            ->first();

        $this->assertNotNull($journal);
        $this->assertEquals('POSTED', $journal->status);
        $this->assertEquals("INV-ADJ-{$movement->id}", $journal->idempotency_key);

        $lines = $journal->lines;
        $this->assertCount(2, $lines);

        $debitLine = $lines->firstWhere('account_id', $this->inventoryAssetAccount->id);
        $creditLine = $lines->firstWhere('account_id', $this->inventoryAdjustmentAccount->id);

        $this->assertNotNull($debitLine);
        $this->assertEquals(150.0, (float)$debitLine->debit);
        $this->assertEquals(0.0, (float)$debitLine->credit);

        $this->assertNotNull($creditLine);
        $this->assertEquals(0.0, (float)$creditLine->debit);
        $this->assertEquals(150.0, (float)$creditLine->credit);
    }

    /**
     * Test 6: Re-posting same adjustment movement does not create duplicate journal (idempotency).
     */
    public function test_adjustment_in_idempotent_journal_posting()
    {
        $movement = $this->inventoryService->adjustmentIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 5.0,
            unitCost: 20.0,
            referenceType: 'InitialAudit',
            referenceId: 301,
            referenceNumber: 'ADJ-IN-301',
            reason: 'Initial recount',
            userId: $this->user->id
        );

        $journalCountBefore = JournalEntry::where('company_id', $this->company->id)->count();
        $this->assertEquals(1, $journalCountBefore);

        // Manually invoke postAdjustmentIn with identical movement
        $reJournal = $this->inventoryAccountingService->postAdjustmentIn($movement, $this->user->id);

        $this->assertNotNull($reJournal);
        $journalCountAfter = JournalEntry::where('company_id', $this->company->id)->count();
        $this->assertEquals(1, $journalCountAfter);
    }

    /**
     * Test 7: Stock adjustment OUT posts balanced journal entry (DR Adjustment, CR Asset).
     */
    public function test_adjustment_out_posts_balanced_journal_when_enabled()
    {
        // First add stock
        $this->inventoryService->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 20.0,
            unitCost: 10.0,
            referenceType: 'InitialStock',
            referenceId: 401,
            referenceNumber: 'STK-IN-401',
            userId: $this->user->id
        );

        $movement = $this->inventoryService->adjustmentOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 4.0, // 4 * 10 = 40 total cost
            referenceType: 'AuditShrinkage',
            referenceId: 402,
            referenceNumber: 'ADJ-OUT-402',
            reason: 'Damaged during inspection',
            userId: $this->user->id
        );

        $this->assertNotNull($movement);

        $journal = JournalEntry::where('company_id', $this->company->id)
            ->where('reference_type', 'StockMovement')
            ->where('reference_id', $movement->id)
            ->first();

        $this->assertNotNull($journal);
        $this->assertEquals('POSTED', $journal->status);

        $lines = $journal->lines;
        $this->assertCount(2, $lines);

        $debitLine = $lines->firstWhere('account_id', $this->inventoryAdjustmentAccount->id);
        $creditLine = $lines->firstWhere('account_id', $this->inventoryAssetAccount->id);

        $this->assertNotNull($debitLine);
        $this->assertEquals(40.0, (float)$debitLine->debit);

        $this->assertNotNull($creditLine);
        $this->assertEquals(40.0, (float)$creditLine->credit);
    }

    /**
     * Test 8: Adjustment with zero unit cost does not post zero-value journal.
     */
    public function test_adjustment_out_zero_cost_does_not_post_journal()
    {
        // Add stock at zero cost
        $this->inventoryService->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 10.0,
            unitCost: 0.0,
            referenceType: 'Gift',
            referenceId: 501,
            referenceNumber: 'STK-IN-501',
            userId: $this->user->id
        );

        $journalCountBefore = JournalEntry::where('company_id', $this->company->id)->count();

        $movement = $this->inventoryService->adjustmentOut(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 2.0,
            referenceType: 'ZeroCostAudit',
            referenceId: 502,
            referenceNumber: 'ADJ-OUT-502',
            reason: 'Zero cost adjustment',
            userId: $this->user->id
        );

        $this->assertNotNull($movement);
        $journalCountAfter = JournalEntry::where('company_id', $this->company->id)->count();
        $this->assertEquals($journalCountBefore, $journalCountAfter);
    }

    /**
     * Test 9: If fiscal period is CLOSED, adjustment throws ConflictHttpException and rolls back inventory.
     */
    public function test_adjustment_fails_and_rolls_back_inventory_if_fiscal_period_closed()
    {
        $this->accountingPeriod->status = 'CLOSED';
        $this->accountingPeriod->save();

        $movementCountBefore = StockMovement::where('company_id', $this->company->id)->count();
        $inventoryBefore = Inventory::where('company_id', $this->company->id)
            ->where('warehouse_id', $this->warehouseA->id)
            ->where('product_variant_id', $this->variant->id)
            ->first();
        $qtyBefore = $inventoryBefore ? (float)$inventoryBefore->quantity : 0.0;

        try {
            $this->inventoryService->adjustmentIn(
                companyId: $this->company->id,
                warehouseId: $this->warehouseA->id,
                productVariantId: $this->variant->id,
                quantity: 10.0,
                unitCost: 20.0,
                referenceType: 'ClosedPeriodAudit',
                referenceId: 601,
                referenceNumber: 'ADJ-IN-601',
                reason: 'Should fail due to closed period',
                userId: $this->user->id
            );
            $this->fail("Expected ConflictHttpException was not thrown.");
        } catch (ConflictHttpException $e) {
            $this->assertStringContainsString('CLOSED', $e->getMessage());
        }

        // Verify total rollback
        $movementCountAfter = StockMovement::where('company_id', $this->company->id)->count();
        $this->assertEquals($movementCountBefore, $movementCountAfter);

        $inventoryAfter = Inventory::where('company_id', $this->company->id)
            ->where('warehouse_id', $this->warehouseA->id)
            ->where('product_variant_id', $this->variant->id)
            ->first();
        $qtyAfter = $inventoryAfter ? (float)$inventoryAfter->quantity : 0.0;
        $this->assertEquals($qtyBefore, $qtyAfter);
    }

    /**
     * Test 10: If account mapping is missing, adjustment throws ConflictHttpException and rolls back inventory.
     */
    public function test_adjustment_fails_and_rolls_back_inventory_if_mapping_missing()
    {
        // Delete inventory_asset mapping
        Setting::where('company_id', $this->company->id)
            ->where('group', 'accounting_mapping')
            ->where('key', AccountMappingService::ROLE_INVENTORY_ASSET)
            ->delete();

        $movementCountBefore = StockMovement::where('company_id', $this->company->id)->count();

        try {
            $this->inventoryService->adjustmentIn(
                companyId: $this->company->id,
                warehouseId: $this->warehouseA->id,
                productVariantId: $this->variant->id,
                quantity: 5.0,
                unitCost: 30.0,
                referenceType: 'MissingMappingAudit',
                referenceId: 701,
                referenceNumber: 'ADJ-IN-701',
                reason: 'Should fail due to missing mapping',
                userId: $this->user->id
            );
            $this->fail("Expected ConflictHttpException was not thrown.");
        } catch (ConflictHttpException $e) {
            $this->assertStringContainsString('not configured', $e->getMessage());
        }

        // Verify rollback
        $this->assertEquals($movementCountBefore, StockMovement::where('company_id', $this->company->id)->count());
    }

    /**
     * Test 11: Purchase goods receipt posts balanced journal entry (DR Inventory Asset, CR Accounts Payable).
     */
    public function test_purchase_goods_receipt_posts_journal_when_enabled()
    {
        $supplier = Supplier::create([
            'company_id' => $this->company->id,
            'supplier_code' => 'SUP-' . Str::random(4),
            'name' => 'Tech Supplies Ltd',
        ]);

        $po = PurchaseOrder::create([
            'company_id' => $this->company->id,
            'supplier_id' => $supplier->id,
            'warehouse_id' => $this->warehouseA->id,
            'po_number' => 'PO-' . Str::random(6),
            'order_date' => '2026-02-01',
            'status' => 'APPROVED',
        ]);

        $poItem = PurchaseOrderItem::create([
            'purchase_order_id' => $po->id,
            'product_id' => $this->product->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 10,
            'pending_quantity' => 10,
            'unit_cost' => 50.0,
            'subtotal' => 500.0,
            'line_total' => 500.0,
        ]);

        $receipt = GoodsReceipt::create([
            'company_id' => $this->company->id,
            'supplier_id' => $supplier->id,
            'purchase_order_id' => $po->id,
            'warehouse_id' => $this->warehouseA->id,
            'receipt_number' => 'GR-' . Str::random(6),
            'receipt_date' => '2026-02-02',
            'status' => 'DRAFT',
        ]);

        GoodsReceiptItem::create([
            'goods_receipt_id' => $receipt->id,
            'purchase_order_item_id' => $poItem->id,
            'product_id' => $this->product->id,
            'product_variant_id' => $this->variant->id,
            'received_quantity' => 8,
            'unit_cost' => 50.0, // 8 * 50 = 400.0
            'total_cost' => 400.0,
        ]);

        $postedReceipt = $this->purchaseService->postGoodsReceipt($receipt->id, $this->user->id);

        $this->assertEquals('POSTED', $postedReceipt->status);

        $journal = JournalEntry::where('company_id', $this->company->id)
            ->where('reference_type', 'GoodsReceipt')
            ->where('reference_id', $receipt->id)
            ->first();

        $this->assertNotNull($journal);
        $this->assertEquals('POSTED', $journal->status);
        $this->assertEquals("PURCHASE-GR-{$receipt->id}", $journal->idempotency_key);

        $debitLine = $journal->lines->firstWhere('account_id', $this->inventoryAssetAccount->id);
        $creditLine = $journal->lines->firstWhere('account_id', $this->accountsPayableAccount->id);

        $this->assertNotNull($debitLine);
        $this->assertEquals(400.0, (float)$debitLine->debit);

        $this->assertNotNull($creditLine);
        $this->assertEquals(400.0, (float)$creditLine->credit);
    }

    /**
     * Test 12: Goods receipt idempotency prevents duplicate journal entry.
     */
    public function test_purchase_goods_receipt_idempotent_journal_posting()
    {
        $supplier = Supplier::create([
            'company_id' => $this->company->id,
            'supplier_code' => 'SUP-IDEMP',
            'name' => 'Idempotent Supplier',
        ]);

        $po = PurchaseOrder::create([
            'company_id' => $this->company->id,
            'supplier_id' => $supplier->id,
            'warehouse_id' => $this->warehouseA->id,
            'po_number' => 'PO-IDEMP',
            'order_date' => '2026-02-01',
            'status' => 'APPROVED',
        ]);

        $poItem = PurchaseOrderItem::create([
            'purchase_order_id' => $po->id,
            'product_id' => $this->product->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 5,
            'pending_quantity' => 5,
            'unit_cost' => 10.0,
            'subtotal' => 50.0,
            'line_total' => 50.0,
        ]);

        $receipt = GoodsReceipt::create([
            'company_id' => $this->company->id,
            'supplier_id' => $supplier->id,
            'purchase_order_id' => $po->id,
            'warehouse_id' => $this->warehouseA->id,
            'receipt_number' => 'GR-IDEMP-01',
            'receipt_date' => '2026-02-02',
            'status' => 'DRAFT',
        ]);

        GoodsReceiptItem::create([
            'goods_receipt_id' => $receipt->id,
            'purchase_order_item_id' => $poItem->id,
            'product_id' => $this->product->id,
            'product_variant_id' => $this->variant->id,
            'received_quantity' => 5,
            'unit_cost' => 10.0,
            'total_cost' => 50.0,
        ]);

        $this->purchaseService->postGoodsReceipt($receipt->id, $this->user->id);

        $countBefore = JournalEntry::where('company_id', $this->company->id)->count();
        $this->assertEquals(1, $countBefore);

        // Call postPurchaseReceipt directly again
        $this->inventoryAccountingService->postPurchaseReceipt($receipt->fresh(), $this->user->id);

        $countAfter = JournalEntry::where('company_id', $this->company->id)->count();
        $this->assertEquals(1, $countAfter);
    }

    /**
     * Test 13: Stock transfer between warehouses is strictly neutral (zero P&L/expense journals).
     */
    public function test_stock_transfer_is_strictly_neutral()
    {
        // Seed stock in warehouse A
        $this->inventoryService->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseA->id,
            productVariantId: $this->variant->id,
            quantity: 30.0,
            unitCost: 12.0,
            referenceType: 'TransferSeed',
            referenceId: 801,
            referenceNumber: 'SEED-801',
            userId: $this->user->id
        );

        $journalCountBefore = JournalEntry::where('company_id', $this->company->id)->count();

        // Perform transfer
        $result = $this->inventoryService->transferStock(
            companyId: $this->company->id,
            sourceWarehouseId: $this->warehouseA->id,
            destinationWarehouseId: $this->warehouseB->id,
            productVariantId: $this->variant->id,
            quantity: 10.0,
            referenceType: 'WarehouseTransfer',
            referenceId: 802,
            referenceNumber: 'XFER-802',
            userId: $this->user->id
        );

        $this->assertArrayHasKey('transfer_out', $result);
        $this->assertArrayHasKey('transfer_in', $result);

        // Transfers produce NO P&L or expense journal entries
        $journalCountAfter = JournalEntry::where('company_id', $this->company->id)->count();
        $this->assertEquals($journalCountBefore, $journalCountAfter);

        // Service postTransfer explicitly returns null
        $this->assertNull($this->inventoryAccountingService->postTransfer($result['transfer_out'], $result['transfer_in']));
    }

    /**
     * Test 14: Customer payment creation posts single General Ledger entry (DR Cash/Bank, CR AR).
     */
    public function test_customer_payment_posts_single_gl_journal()
    {
        $payment = $this->paymentService->createPayment(
            $this->company->id,
            [
                'amount' => 500.0,
                'payment_type' => 'CUSTOMER',
                'payment_method' => 'CASH',
                'reference_number' => 'CUST-PAY-001',
            ],
            $this->user->id
        );

        $this->assertNotNull($payment);
        $this->assertEquals('COMPLETED', $payment->status);

        $journal = JournalEntry::where('company_id', $this->company->id)
            ->where('reference_type', 'Payment')
            ->where('reference_id', $payment->id)
            ->first();

        $this->assertNotNull($journal);
        $this->assertEquals('POSTED', $journal->status);
        $this->assertEquals("PAYMENT-{$payment->id}", $journal->idempotency_key);

        $debitLine = $journal->lines->firstWhere('account_id', $this->cashBankAccount->id);
        $creditLine = $journal->lines->firstWhere('account_id', $this->accountsReceivableAccount->id);

        $this->assertNotNull($debitLine);
        $this->assertEquals(500.0, (float)$debitLine->debit);

        $this->assertNotNull($creditLine);
        $this->assertEquals(500.0, (float)$creditLine->credit);
    }

    /**
     * Test 15: Supplier payment creation posts single General Ledger entry (DR AP, CR Cash/Bank).
     */
    public function test_supplier_payment_posts_single_gl_journal()
    {
        $payment = $this->paymentService->createPayment(
            $this->company->id,
            [
                'amount' => 350.0,
                'payment_type' => 'SUPPLIER',
                'payment_method' => 'BANK_TRANSFER',
                'reference_number' => 'SUPP-PAY-001',
            ],
            $this->user->id
        );

        $this->assertNotNull($payment);
        $this->assertEquals('COMPLETED', $payment->status);

        $journal = JournalEntry::where('company_id', $this->company->id)
            ->where('reference_type', 'Payment')
            ->where('reference_id', $payment->id)
            ->first();

        $this->assertNotNull($journal);
        $this->assertEquals('POSTED', $journal->status);

        $debitLine = $journal->lines->firstWhere('account_id', $this->accountsPayableAccount->id);
        $creditLine = $journal->lines->firstWhere('account_id', $this->cashBankAccount->id);

        $this->assertNotNull($debitLine);
        $this->assertEquals(350.0, (float)$debitLine->debit);

        $this->assertNotNull($creditLine);
        $this->assertEquals(350.0, (float)$creditLine->credit);
    }

    /**
     * Test 16: Payment creation with zero or negative amount is rejected.
     */
    public function test_payment_creation_zero_or_negative_amount_rejected()
    {
        $this->expectException(ConflictHttpException::class);
        $this->paymentService->createPayment(
            $this->company->id,
            [
                'amount' => 0.0,
                'payment_type' => 'CUSTOMER',
                'payment_method' => 'CASH',
            ],
            $this->user->id
        );
    }

    /**
     * Test 17: Allocating payment to a Sale updates paid_amount, due_amount, and payment_status.
     */
    public function test_payment_allocation_to_sale_updates_due_amount()
    {
        $sale = Sale::create([
            'company_id' => $this->company->id,
            'cashier_id' => $this->user->id,
            'invoice_number' => 'INV-TEST-001',
            'sale_date' => '2026-03-01',
            'status' => 'COMPLETED',
            'subtotal' => 200.0,
            'discount_total' => 0.0,
            'tax_total' => 0.0,
            'grand_total' => 200.0,
            'paid_amount' => 0.0,
            'due_amount' => 200.0,
            'payment_status' => 'DUE',
        ]);

        $payment = $this->paymentService->createPayment(
            $this->company->id,
            [
                'amount' => 150.0,
                'payment_type' => 'CUSTOMER',
                'payment_method' => 'CASH',
            ],
            $this->user->id
        );

        $allocations = $this->paymentService->allocatePayment(
            $this->company->id,
            $payment->id,
            [
                [
                    'allocatable_type' => Sale::class,
                    'allocatable_id' => $sale->id,
                    'amount' => 150.0,
                ]
            ],
            $this->user->id
        );

        $this->assertCount(1, $allocations);

        $sale->refresh();
        $this->assertEquals(150.0, (float)$sale->paid_amount);
        $this->assertEquals(50.0, (float)$sale->due_amount);
        $this->assertEquals('PARTIAL', $sale->payment_status);
    }

    /**
     * Test 18: Payment allocation is strictly subledger-only and never posts duplicate GL journals.
     */
    public function test_payment_allocation_is_subledger_only_no_duplicate_gl()
    {
        $sale = Sale::create([
            'company_id' => $this->company->id,
            'cashier_id' => $this->user->id,
            'invoice_number' => 'INV-TEST-002',
            'sale_date' => '2026-03-01',
            'status' => 'COMPLETED',
            'grand_total' => 100.0,
            'paid_amount' => 0.0,
            'due_amount' => 100.0,
            'payment_status' => 'DUE',
        ]);

        $payment = $this->paymentService->createPayment(
            $this->company->id,
            [
                'amount' => 100.0,
                'payment_type' => 'CUSTOMER',
                'payment_method' => 'CASH',
            ],
            $this->user->id
        );

        // Payment creation posted exactly 1 GL journal
        $journalCountBefore = JournalEntry::where('company_id', $this->company->id)->count();

        $this->paymentService->allocatePayment(
            $this->company->id,
            $payment->id,
            [
                [
                    'allocatable_type' => Sale::class,
                    'allocatable_id' => $sale->id,
                    'amount' => 100.0,
                ]
            ],
            $this->user->id
        );

        // Verify subledger allocation exists
        $this->assertEquals(1, PaymentAllocation::where('payment_id', $payment->id)->count());

        // Verify GL journal count did NOT change
        $journalCountAfter = JournalEntry::where('company_id', $this->company->id)->count();
        $this->assertEquals($journalCountBefore, $journalCountAfter);

        $sale->refresh();
        $this->assertEquals('PAID', $sale->payment_status);
        $this->assertEquals(0.0, (float)$sale->due_amount);
    }

    /**
     * Test 19: Payment allocation exceeding payment total amount is rejected.
     */
    public function test_payment_allocation_exceeding_payment_amount_rejected()
    {
        $sale = Sale::create([
            'company_id' => $this->company->id,
            'cashier_id' => $this->user->id,
            'invoice_number' => 'INV-TEST-003',
            'sale_date' => '2026-03-01',
            'status' => 'COMPLETED',
            'grand_total' => 200.0,
            'paid_amount' => 0.0,
            'due_amount' => 200.0,
            'payment_status' => 'DUE',
        ]);

        $payment = $this->paymentService->createPayment(
            $this->company->id,
            [
                'amount' => 50.0,
                'payment_type' => 'CUSTOMER',
                'payment_method' => 'CASH',
            ],
            $this->user->id
        );

        $this->expectException(ConflictHttpException::class);
        $this->paymentService->allocatePayment(
            $this->company->id,
            $payment->id,
            [
                [
                    'allocatable_type' => Sale::class,
                    'allocatable_id' => $sale->id,
                    'amount' => 75.0, // Exceeds 50.0
                ]
            ],
            $this->user->id
        );
    }

    /**
     * Test 20: Payment allocation exceeding document outstanding balance is rejected.
     */
    public function test_payment_allocation_exceeding_sale_due_amount_rejected()
    {
        $sale = Sale::create([
            'company_id' => $this->company->id,
            'cashier_id' => $this->user->id,
            'invoice_number' => 'INV-TEST-004',
            'sale_date' => '2026-03-01',
            'status' => 'COMPLETED',
            'grand_total' => 60.0,
            'paid_amount' => 0.0,
            'due_amount' => 60.0,
            'payment_status' => 'DUE',
        ]);

        $payment = $this->paymentService->createPayment(
            $this->company->id,
            [
                'amount' => 200.0,
                'payment_type' => 'CUSTOMER',
                'payment_method' => 'CASH',
            ],
            $this->user->id
        );

        $this->expectException(ConflictHttpException::class);
        $this->paymentService->allocatePayment(
            $this->company->id,
            $payment->id,
            [
                [
                    'allocatable_type' => Sale::class,
                    'allocatable_id' => $sale->id,
                    'amount' => 80.0, // Exceeds 60.0 due
                ]
            ],
            $this->user->id
        );
    }

    /**
     * Test 21: Cross-company document allocation is rejected.
     */
    public function test_payment_allocation_cross_company_rejected()
    {
        $foreignCompany = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Foreign Corp',
            'code' => 'FOR-' . Str::random(5),
            'country' => 'Bangladesh',
        ]);

        $foreignSale = Sale::create([
            'company_id' => $foreignCompany->id,
            'cashier_id' => $this->user->id,
            'invoice_number' => 'INV-FOREIGN-001',
            'sale_date' => '2026-03-01',
            'status' => 'COMPLETED',
            'grand_total' => 100.0,
            'paid_amount' => 0.0,
            'due_amount' => 100.0,
            'payment_status' => 'DUE',
        ]);

        $payment = $this->paymentService->createPayment(
            $this->company->id,
            [
                'amount' => 100.0,
                'payment_type' => 'CUSTOMER',
                'payment_method' => 'CASH',
            ],
            $this->user->id
        );

        $this->expectException(ConflictHttpException::class);
        $this->paymentService->allocatePayment(
            $this->company->id,
            $payment->id,
            [
                [
                    'allocatable_type' => Sale::class,
                    'allocatable_id' => $foreignSale->id,
                    'amount' => 100.0,
                ]
            ],
            $this->user->id
        );
    }

    /**
     * Test 22: Concurrent journal idempotency race condition handling.
     */
    public function test_concurrent_payment_or_journal_idempotency_race_handling()
    {
        $data = [
            'journal_date' => '2026-03-15',
            'description' => 'Concurrent race test journal',
            'idempotency_key' => 'RACE-KEY-' . Str::random(8),
            'lines' => [
                [
                    'account_id' => $this->inventoryAssetAccount->id,
                    'debit' => 100.0,
                    'credit' => 0.0,
                ],
                [
                    'account_id' => $this->inventoryAdjustmentAccount->id,
                    'debit' => 0.0,
                    'credit' => 100.0,
                ],
            ],
        ];

        // First execution creates the journal
        $journal1 = $this->accountingService->postAutomatedJournal($this->company->id, $data, $this->user->id);
        $this->assertNotNull($journal1);

        // Second execution with identical idempotency key returns the existing journal
        $journal2 = $this->accountingService->postAutomatedJournal($this->company->id, $data, $this->user->id);
        $this->assertNotNull($journal2);
        $this->assertEquals($journal1->id, $journal2->id);

        $this->assertEquals(1, JournalEntry::where('company_id', $this->company->id)->where('idempotency_key', $data['idempotency_key'])->count());
    }

    /**
     * Test 23: PaymentController store, show, and index REST API endpoints.
     */
    public function test_payment_api_store_and_index()
    {
        $response = $this->actingAs($this->user)->postJson('/api/v1/payments', [
            'amount' => 120.50,
            'payment_type' => 'CUSTOMER',
            'payment_method' => 'CASH',
            'reference_number' => 'API-PAY-001',
        ], [
            'X-Company-Id' => $this->company->id,
            'Idempotency-Key' => 'API-PAY-KEY-' . Str::random(8),
        ]);

        $response->assertStatus(201);
        $response->assertJson(['success' => true]);
        $paymentId = $response->json('data.id');

        $showResponse = $this->actingAs($this->user)->getJson("/api/v1/payments/{$paymentId}", ['X-Company-Id' => $this->company->id]);
        $showResponse->assertStatus(200);
        $showResponse->assertJson(['success' => true, 'data' => ['id' => $paymentId]]);

        $indexResponse = $this->actingAs($this->user)->getJson('/api/v1/payments', ['X-Company-Id' => $this->company->id]);
        $indexResponse->assertStatus(200);
        $indexResponse->assertJson(['success' => true]);
    }

    /**
     * Test 24: PaymentController allocate REST API endpoint.
     */
    public function test_payment_api_allocate()
    {
        $sale = Sale::create([
            'company_id' => $this->company->id,
            'cashier_id' => $this->user->id,
            'invoice_number' => 'INV-API-001',
            'sale_date' => '2026-03-01',
            'status' => 'COMPLETED',
            'grand_total' => 200.0,
            'paid_amount' => 0.0,
            'due_amount' => 200.0,
            'payment_status' => 'DUE',
        ]);

        $payment = $this->paymentService->createPayment(
            $this->company->id,
            [
                'amount' => 100.0,
                'payment_type' => 'CUSTOMER',
                'payment_method' => 'CASH',
            ],
            $this->user->id
        );

        $response = $this->actingAs($this->user)->postJson("/api/v1/payments/{$payment->id}/allocate", [
            'allocations' => [
                [
                    'allocatable_type' => Sale::class,
                    'allocatable_id' => $sale->id,
                    'amount' => 100.0,
                ]
            ]
        ], ['X-Company-Id' => $this->company->id]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        $sale->refresh();
        $this->assertEquals('PARTIAL', $sale->payment_status);
        $this->assertEquals(100.0, (float)$sale->paid_amount);
        $this->assertEquals(100.0, (float)$sale->due_amount);
    }

    /**
     * Test 25: API payment creation requires Idempotency-Key header.
     */
    public function test_api_payment_creation_requires_idempotency_key()
    {
        $response = $this->actingAs($this->user)->postJson('/api/v1/payments', [
            'amount' => 50.00,
            'payment_type' => 'CUSTOMER',
            'payment_method' => 'CASH',
        ], ['X-Company-Id' => $this->company->id]);

        $response->assertStatus(422);
        $response->assertJson([
            'success' => false,
            'message' => 'The Idempotency-Key header is required for payment creation.',
        ]);
    }

    /**
     * Test 26: API payment creation accepts body fallback for idempotency_key.
     */
    public function test_api_payment_creation_accepts_body_fallback()
    {
        $key = 'BODY-KEY-' . Str::random(10);
        $response = $this->actingAs($this->user)->postJson('/api/v1/payments', [
            'amount' => 75.00,
            'payment_type' => 'CUSTOMER',
            'payment_method' => 'CASH',
            'idempotency_key' => $key,
        ], ['X-Company-Id' => $this->company->id]);

        $response->assertStatus(201);
        $response->assertJson(['success' => true]);
        $this->assertEquals($key, $response->json('data.idempotency_key'));
    }

    /**
     * Test 27: Idempotent replay with same key returns existing payment without double posting.
     */
    public function test_payment_idempotent_replay_prevents_double_posting()
    {
        $key = 'REPLAY-KEY-' . Str::random(10);

        // First call: fresh creation (201)
        $res1 = $this->actingAs($this->user)->postJson('/api/v1/payments', [
            'amount' => 250.00,
            'payment_type' => 'CUSTOMER',
            'payment_method' => 'CASH',
        ], [
            'X-Company-Id' => $this->company->id,
            'Idempotency-Key' => $key,
        ]);

        $res1->assertStatus(201);
        $paymentId1 = $res1->json('data.id');

        // Second call with same key: replay (200)
        $res2 = $this->actingAs($this->user)->postJson('/api/v1/payments', [
            'amount' => 250.00,
            'payment_type' => 'CUSTOMER',
            'payment_method' => 'CASH',
        ], [
            'X-Company-Id' => $this->company->id,
            'Idempotency-Key' => $key,
        ]);

        $res2->assertStatus(200);
        $res2->assertJson([
            'success' => true,
            'message' => 'Payment retrieved from idempotent request',
        ]);
        $paymentId2 = $res2->json('data.id');

        $this->assertEquals($paymentId1, $paymentId2);

        // Assert strictly 1 payment in DB
        $this->assertEquals(1, Payment::where('company_id', $this->company->id)->where('idempotency_key', $key)->count());

        // Assert strictly 1 journal entry in DB
        $this->assertEquals(1, JournalEntry::where('company_id', $this->company->id)->where('reference_type', 'Payment')->where('reference_id', $paymentId1)->count());
    }

    /**
     * Test 28: Same key with different payload returns 409 Conflict.
     */
    public function test_payment_idempotency_payload_mismatch_returns_409()
    {
        $key = 'MISMATCH-KEY-' . Str::random(10);

        $res1 = $this->actingAs($this->user)->postJson('/api/v1/payments', [
            'amount' => 100.00,
            'payment_type' => 'CUSTOMER',
            'payment_method' => 'CASH',
        ], [
            'X-Company-Id' => $this->company->id,
            'Idempotency-Key' => $key,
        ]);
        $res1->assertStatus(201);

        // Same key, different amount -> 409
        $res2 = $this->actingAs($this->user)->postJson('/api/v1/payments', [
            'amount' => 200.00,
            'payment_type' => 'CUSTOMER',
            'payment_method' => 'CASH',
        ], [
            'X-Company-Id' => $this->company->id,
            'Idempotency-Key' => $key,
        ]);
        $res2->assertStatus(409);
        $res2->assertJson([
            'success' => false,
            'message' => "Payload mismatch for idempotency key '{$key}'.",
        ]);

        // Same key, different type -> 409
        $res3 = $this->actingAs($this->user)->postJson('/api/v1/payments', [
            'amount' => 100.00,
            'payment_type' => 'SUPPLIER',
            'payment_method' => 'CASH',
        ], [
            'X-Company-Id' => $this->company->id,
            'Idempotency-Key' => $key,
        ]);
        $res3->assertStatus(409);
    }

    /**
     * Test 29: Payment creation rolls back completely if accounting posting fails.
     */
    public function test_payment_creation_atomic_rollback_on_accounting_failure()
    {
        // Close the accounting period so journal posting must fail
        $this->accountingPeriod->status = 'CLOSED';
        $this->accountingPeriod->save();

        $key = 'ROLLBACK-KEY-' . Str::random(10);

        $this->expectException(ConflictHttpException::class);
        try {
            $this->paymentService->createPayment(
                $this->company->id,
                [
                    'amount' => 100.0,
                    'payment_type' => 'CUSTOMER',
                    'payment_method' => 'CASH',
                    'idempotency_key' => $key,
                ],
                $this->user->id
            );
        } finally {
            $this->accountingPeriod->status = 'OPEN';
            $this->accountingPeriod->save();

            // Assert payment record was rolled back
            $this->assertEquals(0, Payment::where('company_id', $this->company->id)->where('idempotency_key', $key)->count());
        }
    }

    /**
     * Test 30: Genuine multi-process concurrent payment creation.
     */
    public function test_genuine_multiprocess_payment_concurrency()
    {
        // 1. Commit existing setup transaction so data is visible to separate processes
        \Illuminate\Support\Facades\DB::commit();

        $workerPath = base_path('tests/Feature/Accounting/payment_concurrency_worker.php');
        $this->assertFileExists($workerPath);

        $phpBinary = PHP_BINARY;
        $key = 'CONC-PROC-' . Str::random(10);
        $amount = 175.50;

        $cmd1 = [
            $phpBinary,
            $workerPath,
            (string)$this->company->id,
            $key,
            (string)$amount,
            'CUSTOMER',
            (string)$this->user->id,
        ];

        $cmd2 = [
            $phpBinary,
            $workerPath,
            (string)$this->company->id,
            $key,
            (string)$amount,
            'CUSTOMER',
            (string)$this->user->id,
        ];

        // Launch both processes in parallel
        $p1 = proc_open($cmd1, [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ], $pipes1, base_path(), null);

        $p2 = proc_open($cmd2, [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ], $pipes2, base_path(), null);

        $this->assertIsResource($p1);
        $this->assertIsResource($p2);

        $out1 = stream_get_contents($pipes1[1]);
        $err1 = stream_get_contents($pipes1[2]);
        fclose($pipes1[0]); fclose($pipes1[1]); fclose($pipes1[2]);
        $exitCode1 = proc_close($p1);

        $out2 = stream_get_contents($pipes2[1]);
        $err2 = stream_get_contents($pipes2[2]);
        fclose($pipes2[0]); fclose($pipes2[1]); fclose($pipes2[2]);
        $exitCode2 = proc_close($p2);

        $res1 = json_decode(trim($out1), true);
        $res2 = json_decode(trim($out2), true);

        $this->assertEquals(0, $exitCode1, "Process 1 stderr: {$err1}, stdout: {$out1}");
        $this->assertEquals(0, $exitCode2, "Process 2 stderr: {$err2}, stdout: {$out2}");

        $this->assertIsArray($res1, "Invalid JSON from Process 1: {$out1}");
        $this->assertIsArray($res2, "Invalid JSON from Process 2: {$out2}");

        $this->assertEquals('success', $res1['status'] ?? null, "Process 1 failed: " . json_encode($res1));
        $this->assertEquals('success', $res2['status'] ?? null, "Process 2 failed: " . json_encode($res2));

        // Both processes MUST resolve to the exact same Payment ID
        $this->assertEquals($res1['payment_id'], $res2['payment_id']);

        // Assert strictly 1 Payment record exists in database
        $paymentCount = Payment::where('company_id', $this->company->id)->where('idempotency_key', $key)->count();
        $this->assertEquals(1, $paymentCount);

        // Assert strictly 1 JournalEntry exists in database for this payment
        $journalCount = JournalEntry::where('company_id', $this->company->id)
            ->where('reference_type', 'Payment')
            ->where('reference_id', $res1['payment_id'])
            ->count();
        $this->assertEquals(1, $journalCount);

        // Assert strictly 1 set of lines (Cash debit, AR credit)
        $journal = JournalEntry::where('company_id', $this->company->id)
            ->where('reference_type', 'Payment')
            ->where('reference_id', $res1['payment_id'])
            ->first();
        $this->assertNotNull($journal);
        $this->assertCount(2, $journal->lines);

        $debitLine = $journal->lines->firstWhere('account_id', $this->cashBankAccount->id);
        $creditLine = $journal->lines->firstWhere('account_id', $this->accountsReceivableAccount->id);

        $this->assertNotNull($debitLine);
        $this->assertNotNull($creditLine);
        $this->assertEquals($amount, (float)$debitLine->debit);
        $this->assertEquals($amount, (float)$creditLine->credit);
    }
}
