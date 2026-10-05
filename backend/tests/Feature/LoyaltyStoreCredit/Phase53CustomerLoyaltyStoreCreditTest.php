<?php

namespace Tests\Feature\LoyaltyStoreCredit;

use App\Models\Account;
use App\Models\AccountGroup;
use App\Models\AccountingPeriod;
use App\Models\AuditLog;
use App\Models\Branch;
use App\Models\BusinessUnit;
use App\Models\Category;
use App\Models\Company;
use App\Models\Customer;
use App\Models\CustomerLedger;
use App\Models\CustomerPointLedger;
use App\Models\FiscalYear;
use App\Models\JournalEntry;
use App\Models\LoyaltySetting;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\PosSession;
use App\Models\PosTerminal;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Sale;
use App\Models\SalesReturn;
use App\Models\StoreCreditAccount;
use App\Models\StoreCreditTransaction;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\AccountMappingService;
use App\Services\AccountingService;
use App\Services\InventoryAccountingService;
use App\Services\InventoryService;
use App\Services\LoyaltyService;
use App\Services\PaymentService;
use App\Services\SalesReturnService;
use App\Services\SalesService;
use App\Services\StoreCreditService;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Tests\TestCase;

class Phase53CustomerLoyaltyStoreCreditTest extends TestCase
{
    use RefreshDatabase;

    protected Company $company;
    protected User $user;
    protected BusinessUnit $businessUnit;
    protected Branch $branch;
    protected Warehouse $warehouse;
    protected PosTerminal $terminal;
    protected PosSession $session;
    protected Product $product;
    protected ProductVariant $variant;
    protected Customer $customer;

    protected Account $arAccount;
    protected Account $salesRevenueAccount;
    protected Account $cogsAccount;
    protected Account $inventoryAssetAccount;
    protected Account $cashBankAccount;
    protected Account $loyaltyExpenseAccount;
    protected Account $storeCreditLiabilityAccount;

    protected AccountMappingService $mappingService;
    protected AccountingService $accountingService;
    protected InventoryAccountingService $inventoryAccountingService;
    protected InventoryService $inventoryService;
    protected PaymentService $paymentService;
    protected SalesService $salesService;
    protected SalesReturnService $salesReturnService;
    protected LoyaltyService $loyaltyService;
    protected StoreCreditService $storeCreditService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->mappingService = app(AccountMappingService::class);
        $this->accountingService = app(AccountingService::class);
        $this->inventoryAccountingService = app(InventoryAccountingService::class);
        $this->inventoryService = app(InventoryService::class);
        $this->paymentService = app(PaymentService::class);
        $this->salesService = app(SalesService::class);
        $this->salesReturnService = app(SalesReturnService::class);
        $this->loyaltyService = app(LoyaltyService::class);
        $this->storeCreditService = app(StoreCreditService::class);

        // 1. Organization Setup
        $this->company = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Phase 5.3 Loyalty & Store Credit Corp',
            'code' => 'COMP-' . Str::random(5),
            'country' => 'Bangladesh',
        ]);

        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);

        $this->businessUnit = BusinessUnit::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'name' => 'Retail BU',
            'code' => 'BU-' . Str::random(5),
        ]);

        $this->branch = Branch::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'name' => 'Flagship Store',
            'code' => 'BR-' . Str::random(5),
        ]);

        $this->warehouse = Warehouse::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'branch_id' => $this->branch->id,
            'name' => 'Main Store Warehouse',
            'code' => 'WH-' . Str::random(5),
            'is_active' => true,
        ]);

        // 2. POS Terminal & Session Setup
        $this->terminal = PosTerminal::create([
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'branch_id' => $this->branch->id,
            'warehouse_id' => $this->warehouse->id,
            'terminal_code' => 'POS-T1',
            'terminal_name' => 'Checkout Counter 1',
            'status' => 'ACTIVE',
        ]);

        $this->session = PosSession::create([
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'branch_id' => $this->branch->id,
            'warehouse_id' => $this->warehouse->id,
            'pos_terminal_id' => $this->terminal->id,
            'cashier_id' => $this->user->id,
            'session_number' => 'SES-' . date('Ymd') . '-001',
            'opening_cash' => 5000.00,
            'status' => 'OPEN',
        ]);

        // 3. Catalog Setup
        $category = Category::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'name' => 'Electronics',
            'code' => 'CAT-' . Str::random(5),
        ]);

        $unit = Unit::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'name' => 'Pieces',
            'short_code' => 'PCS',
        ]);

        $this->product = Product::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'name' => 'Smart Watch Pro',
            'code' => 'PROD-' . Str::random(5),
            'status' => 'ACTIVE',
            'tax_rate' => 0.00,
        ]);

        $this->variant = ProductVariant::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'sku' => 'WATCH-PRO-BLK',
            'variant_name' => 'Black Edition',
            'cost_price' => 500.00,
            'selling_price' => 2000.00,
            'mrp' => 2000.00,
            'tax_rate' => 0.00,
            'status' => 'ACTIVE',
        ]);

        // Stock initial inventory (50 units @ ৳500)
        $this->inventoryService->stockIn(
            $this->company->id,
            $this->warehouse->id,
            $this->variant->id,
            50,
            500.00,
            'OPENING_STOCK',
            1,
            'INIT-001',
            'Initial Test Stock',
            null,
            $this->user->id
        );

        // 4. Customer
        $this->customer = Customer::create([
            'company_id' => $this->company->id,
            'customer_code' => 'CUST-53',
            'name' => 'Rahman VIP Customer',
            'mobile' => '01719998877',
            'credit_limit' => 20000.00,
            'points_balance' => 600.00,
            'status' => 'ACTIVE',
        ]);

        // 5. Fiscal Year & Accounting Period
        $year = date('Y');
        $fiscalYear = FiscalYear::create([
            'company_id' => $this->company->id,
            'name' => "FY {$year}",
            'start_date' => "{$year}-01-01",
            'end_date' => "{$year}-12-31",
            'status' => 'OPEN',
            'created_by' => $this->user->id,
        ]);

        AccountingPeriod::create([
            'company_id' => $this->company->id,
            'fiscal_year_id' => $fiscalYear->id,
            'name' => "Period {$year}-01 to {$year}-12",
            'start_date' => "{$year}-01-01",
            'end_date' => "{$year}-12-31",
            'status' => 'OPEN',
            'created_by' => $this->user->id,
        ]);

        // 6. Chart of Accounts & Mappings
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

        $grpRev = AccountGroup::create([
            'company_id' => $this->company->id,
            'name' => 'Revenue',
            'code' => '4000',
            'account_type' => 'REVENUE',
        ]);

        $grpExp = AccountGroup::create([
            'company_id' => $this->company->id,
            'name' => 'Operating Expense',
            'code' => '5000',
            'account_type' => 'EXPENSE',
        ]);

        $this->arAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpAsset->id,
            'account_code' => '1200',
            'account_name' => 'Accounts Receivable Control',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->salesRevenueAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpRev->id,
            'account_code' => '4100',
            'account_name' => 'General Sales Revenue',
            'account_type' => 'REVENUE',
            'normal_balance' => 'CREDIT',
            'is_active' => true,
        ]);

        $this->cashBankAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpAsset->id,
            'account_code' => '1010',
            'account_name' => 'Main Cash Drawer',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->inventoryAssetAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpAsset->id,
            'account_code' => '1300',
            'account_name' => 'Inventory Asset Account',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->cogsAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpExp->id,
            'account_code' => '5100',
            'account_name' => 'Cost of Goods Sold',
            'account_type' => 'EXPENSE',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->loyaltyExpenseAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpExp->id,
            'account_code' => '5200',
            'account_name' => 'Loyalty Reward Expense',
            'account_type' => 'EXPENSE',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->storeCreditLiabilityAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpLiab->id,
            'account_code' => '2150',
            'account_name' => 'Customer Store Credit Liability',
            'account_type' => 'LIABILITY',
            'normal_balance' => 'CREDIT',
            'is_active' => true,
        ]);

        // Enable accounting and configure mappings
        $this->mappingService->setAccountingEnabled($this->company->id, true);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_ACCOUNTS_RECEIVABLE, $this->arAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_SALES_REVENUE, $this->salesRevenueAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_CASH_BANK, $this->cashBankAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_INVENTORY_ASSET, $this->inventoryAssetAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_COGS, $this->cogsAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_LOYALTY_EXPENSE, $this->loyaltyExpenseAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_STORE_CREDIT_LIABILITY, $this->storeCreditLiabilityAccount->id);

        // 7. Payment Methods setup
        PaymentMethod::firstOrCreate(
            ['company_id' => $this->company->id, 'code' => 'CASH'],
            ['name' => 'Cash', 'type' => 'CASH', 'is_active' => true, 'sort_order' => 1]
        );
        PaymentMethod::firstOrCreate(
            ['company_id' => $this->company->id, 'code' => 'STORE_CREDIT'],
            ['name' => 'Store Credit', 'type' => 'CASH', 'is_active' => true, 'sort_order' => 2]
        );
        PaymentMethod::firstOrCreate(
            ['company_id' => $this->company->id, 'code' => 'POINT_REDEMPTION'],
            ['name' => 'Loyalty Point Redemption', 'type' => 'POINT', 'is_active' => true, 'sort_order' => 3]
        );

        // 8. Loyalty Program Configuration (Active, 1pt per 100 spent, 1pt = 1 BDT value, min 400 pts)
        LoyaltySetting::updateOrCreate(
            ['company_id' => $this->company->id],
            [
                'earning_spend_per_point' => 100.00,
                'earning_points_awarded' => 1.00,
                'redemption_point_value' => 1.00,
                'min_redemption_points' => 400.00,
                'is_active' => true,
                'disallow_earn_on_discount' => true,
                'disallow_earn_on_redemption' => true,
                'disallow_discount_with_redemption' => true,
            ]
        );
    }

    /**
     * Test 1: Store Credit Account creation and balance query.
     */
    public function test_store_credit_account_creation_and_balance_query(): void
    {
        $account = $this->storeCreditService->getOrCreateAccount($this->company->id, $this->customer->id);

        $this->assertNotNull($account);
        $this->assertEquals($this->company->id, $account->company_id);
        $this->assertEquals($this->customer->id, $account->customer_id);
        $this->assertEquals('ACTIVE', $account->status);
        $this->assertEquals(0.0000, (float) $account->current_balance);

        $balance = $this->storeCreditService->getBalance($this->company->id, $this->customer->id);
        $this->assertEquals(0.0000, $balance);
    }

    /**
     * Test 2: Store Credit issuance increases balance and logs audit trail.
     */
    public function test_store_credit_issuance_increases_balance_and_records_audit_log(): void
    {
        $transaction = $this->storeCreditService->issueCredit(
            $this->company->id,
            $this->customer->id,
            1500.00,
            'Promotion',
            null,
            'PROMO-2026',
            'VIP Welcome Store Credit',
            null,
            $this->user->id,
            'ISSUE'
        );

        $this->assertEquals(1500.00, (float) $transaction->amount);
        $this->assertEquals(0.00, (float) $transaction->balance_before);
        $this->assertEquals(1500.00, (float) $transaction->balance_after);
        $this->assertEquals('ISSUE', $transaction->type);

        $account = StoreCreditAccount::where('company_id', $this->company->id)
            ->where('customer_id', $this->customer->id)
            ->first();
        $this->assertEquals(1500.00, (float) $account->current_balance);

        // Verify Audit Log
        $audit = AuditLog::where('company_id', $this->company->id)
            ->where('event', 'STORE_CREDIT_ISSUED')
            ->where('auditable_id', $transaction->id)
            ->first();
        $this->assertNotNull($audit);
    }

    /**
     * Test 3: Store Credit redemption deducts balance and logs audit trail.
     */
    public function test_store_credit_redemption_deducts_balance_and_records_audit_log(): void
    {
        $this->storeCreditService->issueCredit($this->company->id, $this->customer->id, 1000.00, null, null, null, null, null, $this->user->id);

        $transaction = $this->storeCreditService->redeemCredit(
            $this->company->id,
            $this->customer->id,
            400.00,
            'Manual',
            null,
            'RED-001',
            'Partial redemption',
            $this->user->id
        );

        $this->assertEquals(-400.00, (float) $transaction->amount);
        $this->assertEquals(1000.00, (float) $transaction->balance_before);
        $this->assertEquals(600.00, (float) $transaction->balance_after);
        $this->assertEquals('REDEEM', $transaction->type);

        $currentBalance = $this->storeCreditService->getBalance($this->company->id, $this->customer->id);
        $this->assertEquals(600.00, $currentBalance);

        // Verify Audit Log
        $audit = AuditLog::where('company_id', $this->company->id)
            ->where('event', 'STORE_CREDIT_REDEEMED')
            ->where('auditable_id', $transaction->id)
            ->first();
        $this->assertNotNull($audit);
    }

    /**
     * Test 4: Store Credit redemption exceeding balance is blocked.
     */
    public function test_store_credit_redemption_exceeding_balance_is_blocked(): void
    {
        $this->storeCreditService->issueCredit($this->company->id, $this->customer->id, 200.00);

        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage('Insufficient store credit balance');

        $this->storeCreditService->redeemCredit($this->company->id, $this->customer->id, 500.00);
    }

    /**
     * Test 5: Store Credit Transaction is immutable (update blocked).
     */
    public function test_store_credit_transaction_is_immutable_updates_blocked(): void
    {
        $tx = $this->storeCreditService->issueCredit($this->company->id, $this->customer->id, 300.00);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Store credit transactions are immutable');

        $tx->amount = 999.00;
        $tx->save();
    }

    /**
     * Test 6: Store Credit Transaction is immutable (delete blocked).
     */
    public function test_store_credit_transaction_is_immutable_deletes_blocked(): void
    {
        $tx = $this->storeCreditService->issueCredit($this->company->id, $this->customer->id, 300.00);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Store credit transactions are immutable');

        $tx->delete();
    }

    /**
     * Test 7: Customer Point Ledger is immutable (update & delete blocked).
     */
    public function test_customer_point_ledger_is_immutable_updates_and_deletes_blocked(): void
    {
        $ledger = $this->loyaltyService->adjustPoints($this->company->id, $this->customer->id, 100, 'Test adjustment', $this->user->id);

        try {
            $ledger->points = 999;
            $ledger->save();
            $this->fail('Expected DomainException on updating point ledger');
        } catch (DomainException $e) {
            $this->assertStringContainsString('immutable', $e->getMessage());
        }

        try {
            $ledger->delete();
            $this->fail('Expected DomainException on deleting point ledger');
        } catch (DomainException $e) {
            $this->assertStringContainsString('immutable', $e->getMessage());
        }
    }

    /**
     * Test 8: POS checkout with multi-tender split: CASH + STORE_CREDIT + POINT_REDEMPTION.
     * Grand total: ৳4,000 (2 items @ ৳2,000).
     * Split: ৳1,000 Cash + ৳2,500 Store Credit + ৳500 Point Redemption (500 pts).
     */
    public function test_pos_checkout_with_store_credit_and_point_redemption_split_tender(): void
    {
        // Issue ৳2,500 Store Credit to customer
        $this->storeCreditService->issueCredit($this->company->id, $this->customer->id, 2500.00, null, null, null, null, null, $this->user->id);
        // Customer already has 600 loyalty points from setUp

        $saleData = [
            'pos_session_id' => $this->session->id,
            'pos_terminal_id' => $this->terminal->id,
            'customer_id' => $this->customer->id,
            'cashier_id' => $this->user->id,
            'invoice_number' => 'INV-SPLIT-53',
            'idempotency_key' => 'IDEMP-SPLIT-53-' . Str::uuid(),
            'sale_date' => date('Y-m-d'),
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 2,
                    'unit_price' => 2000.00,
                    'discount' => 0.00,
                ],
            ],
            'payments' => [
                ['method' => 'CASH', 'amount' => 1000.00],
                ['method' => 'STORE_CREDIT', 'amount' => 2500.00],
                ['method' => 'POINT_REDEMPTION', 'amount' => 500.00],
            ],
        ];

        $sale = $this->salesService->completeSale($this->company->id, $saleData);

        $this->assertEquals('COMPLETED', $sale->status);
        $this->assertEquals(4000.00, (float) $sale->grand_total);
        $this->assertEquals(4000.00, (float) $sale->paid_amount);
        $this->assertEquals(0.00, (float) $sale->due_amount);
        $this->assertEquals('PAID', $sale->payment_status);

        // Verify Store Credit was deducted
        $remainingStoreCredit = $this->storeCreditService->getBalance($this->company->id, $this->customer->id);
        $this->assertEquals(0.00, $remainingStoreCredit);

        // Verify Loyalty Points were deducted (600 - 500 = 100 pts)
        $this->customer->refresh();
        $this->assertEquals(100.00, (float) $this->customer->points_balance);

        // Verify General Ledger entries balance (debits == credits)
        $journals = JournalEntry::where('company_id', $this->company->id)
            ->where('source', 'PAYMENT')
            ->with('lines')
            ->get();

        $this->assertNotEmpty($journals);
        foreach ($journals as $journal) {
            $totalDebit = $journal->lines->sum('debit');
            $totalCredit = $journal->lines->sum('credit');
            $this->assertEqualsWithDelta($totalDebit, $totalCredit, 0.0001, "Journal #{$journal->id} is out of balance!");
        }

        // Verify Store Credit payment debited Store Credit Liability account (2150)
        $scJournal = JournalEntry::where('company_id', $this->company->id)
            ->where('source', 'PAYMENT')
            ->whereHas('lines', function ($q) {
                $q->where('account_id', $this->storeCreditLiabilityAccount->id);
            })
            ->first();
        $this->assertNotNull($scJournal, "Store Credit payment journal did not hit Store Credit Liability account!");
    }

    /**
     * Test 9: Sales Return with refund to Customer/Store Credit.
     */
    public function test_sales_return_with_customer_credit_refund_issues_store_credit(): void
    {
        // First create a standard sale paid in cash
        $saleData = [
            'pos_session_id' => $this->session->id,
            'pos_terminal_id' => $this->terminal->id,
            'customer_id' => $this->customer->id,
            'cashier_id' => $this->user->id,
            'invoice_number' => 'INV-RET-CUST-53',
            'idempotency_key' => 'IDEMP-RET-53-' . Str::uuid(),
            'sale_date' => date('Y-m-d'),
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 2,
                    'unit_price' => 2000.00,
                    'discount' => 0.00,
                ],
            ],
            'payments' => [
                ['method' => 'CASH', 'amount' => 4000.00],
            ],
        ];

        $sale = $this->salesService->completeSale($this->company->id, $saleData);
        $saleItem = $sale->items->first();

        // Initial store credit is 0
        $this->assertEquals(0.00, $this->storeCreditService->getBalance($this->company->id, $this->customer->id));

        // Process Return with refund method CUSTOMER_CREDIT
        $returnData = [
            'original_sale_id' => $sale->id,
            'reason' => 'Defective zipper',
            'items' => [
                [
                    'original_sale_item_id' => $saleItem->id,
                    'product_variant_id' => $this->variant->id,
                    'return_quantity' => 1,
                    'return_price' => 2000.00,
                    'condition' => 'DAMAGED',
                ],
            ],
            'refund_methods' => [
                ['method' => 'CUSTOMER_CREDIT', 'amount' => 2000.00],
            ],
            'processed_by' => $this->user->id,
        ];

        $salesReturn = $this->salesReturnService->processReturn($this->company->id, $returnData);

        $this->assertEquals('COMPLETED', $salesReturn->status);
        $this->assertEquals(2000.00, (float) $salesReturn->refund_total);

        // Verify Store Credit Account was credited
        $newStoreCreditBalance = $this->storeCreditService->getBalance($this->company->id, $this->customer->id);
        $this->assertEquals(2000.00, $newStoreCreditBalance);

        // Verify Store Credit Transaction record
        $scTx = StoreCreditTransaction::where('company_id', $this->company->id)
            ->where('customer_id', $this->customer->id)
            ->where('type', 'REFUND')
            ->first();
        $this->assertNotNull($scTx);
        $this->assertEquals(2000.00, (float) $scTx->amount);

        // Verify Customer Ledger adjustment
        $ledger = CustomerLedger::where('company_id', $this->company->id)
            ->where('customer_id', $this->customer->id)
            ->where('reference_type', 'SALES_RETURN')
            ->first();
        $this->assertNotNull($ledger);
        $this->assertEquals(2000.00, (float) $ledger->credit);
    }

    /**
     * Test 10: Proportional Loyalty Points Reversal on Sales Return.
     * Sale of ৳4,000 earns 40 points (1 pt per ৳100).
     * Partial return of 1 item (৳2,000 / 50%) must reverse 20 points.
     */
    public function test_sales_return_proportional_loyalty_points_reversal(): void
    {
        // Initial customer points balance: 600
        $initialPoints = (float) $this->customer->points_balance;

        $saleData = [
            'pos_session_id' => $this->session->id,
            'pos_terminal_id' => $this->terminal->id,
            'customer_id' => $this->customer->id,
            'cashier_id' => $this->user->id,
            'invoice_number' => 'INV-EARN-RET-53',
            'idempotency_key' => 'IDEMP-EARN-RET-' . Str::uuid(),
            'sale_date' => date('Y-m-d'),
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 2,
                    'unit_price' => 2000.00, // Grand total = 4000
                    'discount' => 0.00,
                ],
            ],
            'payments' => [
                ['method' => 'CASH', 'amount' => 4000.00],
            ],
        ];

        $sale = $this->salesService->completeSale($this->company->id, $saleData);

        // Verify 40 points earned
        $this->customer->refresh();
        $this->assertEquals($initialPoints + 40.0, (float) $this->customer->points_balance);

        $saleItem = $sale->items->first();

        // Return 1 item (৳2,000 = 50% of ৳4,000)
        $returnData = [
            'original_sale_id' => $sale->id,
            'reason' => 'Customer changed mind',
            'items' => [
                [
                    'original_sale_item_id' => $saleItem->id,
                    'product_variant_id' => $this->variant->id,
                    'return_quantity' => 1,
                    'return_price' => 2000.00,
                    'condition' => 'RESELLABLE',
                ],
            ],
            'refund_methods' => [
                ['method' => 'CASH', 'amount' => 2000.00],
            ],
            'processed_by' => $this->user->id,
        ];

        $this->salesReturnService->processReturn($this->company->id, $returnData);

        // Reversal of 50% of 40 points = 20 points
        $this->customer->refresh();
        $this->assertEquals($initialPoints + 20.0, (float) $this->customer->points_balance);

        // Verify REVERSAL entry in CustomerPointLedger
        $revLedger = CustomerPointLedger::where('company_id', $this->company->id)
            ->where('customer_id', $this->customer->id)
            ->where('transaction_type', 'REVERSAL')
            ->first();
        $this->assertNotNull($revLedger);
        $this->assertEquals(-20.00, (float) $revLedger->points);
    }

    /**
     * Test 11: Store Credit manual adjustments and floor zero guarantee.
     */
    public function test_store_credit_manual_adjustments_and_floor_zero(): void
    {
        // Positive adjustment
        $tx1 = $this->storeCreditService->adjustCredit($this->company->id, $this->customer->id, 500.00, 'Goodwill credit', $this->user->id);
        $this->assertEquals(500.00, (float) $tx1->balance_after);

        // Negative adjustment
        $tx2 = $this->storeCreditService->adjustCredit($this->company->id, $this->customer->id, -200.00, 'Correction', $this->user->id);
        $this->assertEquals(300.00, (float) $tx2->balance_after);

        // Attempt adjustment below zero must fail
        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage('Store credit balance cannot be reduced below zero');
        $this->storeCreditService->adjustCredit($this->company->id, $this->customer->id, -500.00, 'Invalid reduction', $this->user->id);
    }

    /**
     * Test 12: Store Credit API endpoints and multi-tenant isolation.
     */
    public function test_store_credit_api_endpoints_and_tenant_isolation(): void
    {
        $this->actingAs($this->user, 'sanctum');

        // Initial balance via API
        $response = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->getJson("/api/v1/customers/{$this->customer->id}/store-credit");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'customer_id' => $this->customer->id,
                    'account_status' => 'ACTIVE',
                    'current_balance' => 0,
                ],
            ]);

        // Issue credit via API
        $issueRes = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->postJson("/api/v1/customers/{$this->customer->id}/store-credit/issue", [
                'amount' => 750.00,
                'description' => 'Test API issue',
                'reference_number' => 'API-ISS-01',
            ]);

        $issueRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'current_balance' => 750,
                ],
            ]);

        // Query transactions via API
        $txRes = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->getJson("/api/v1/customers/{$this->customer->id}/store-credit/transactions");

        $txRes->assertStatus(200)
            ->assertJsonPath('data.total', 1);

        // Tenant Isolation: Create Company B and Customer B
        $companyB = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Competitor Corp',
            'code' => 'COMP-B',
            'country' => 'Bangladesh',
        ]);
        $customerB = Customer::create([
            'company_id' => $companyB->id,
            'customer_code' => 'CUST-B',
            'name' => 'Company B Customer',
            'status' => 'ACTIVE',
        ]);

        // Attempting to access Customer B from Company A header must 404
        $crossRes = $this->withHeaders(['X-Company-Id' => $this->company->id])
            ->getJson("/api/v1/customers/{$customerB->id}/store-credit");

        $crossRes->assertStatus(404);
    }
}
