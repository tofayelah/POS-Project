<?php

namespace Tests\Feature\Pos;

use App\Models\Account;
use App\Models\AccountGroup;
use App\Models\AccountingPeriod;
use App\Models\AuditLog;
use App\Models\Branch;
use App\Models\BusinessUnit;
use App\Models\Category;
use App\Models\Company;
use App\Models\Customer;
use App\Models\FiscalYear;
use App\Models\Permission;
use App\Models\PosCashMovement;
use App\Models\PosSession;
use App\Models\PosTerminal;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\Sale;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\AccountMappingService;
use App\Services\AccountingService;
use App\Services\InventoryService;
use App\Services\PosShiftService;
use App\Services\SalesReturnService;
use App\Services\SalesService;
use App\Services\StoreCreditService;
use DomainException;
use Exception;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class Phase54PosShiftManagementTest extends TestCase
{
    use RefreshDatabase;

    protected Company $company;
    protected Company $otherCompany;
    protected User $cashier;
    protected User $supervisor;
    protected User $otherCashier;
    protected BusinessUnit $businessUnit;
    protected Branch $branch;
    protected Branch $otherBranch;
    protected Warehouse $warehouse;
    protected PosTerminal $terminal;
    protected PosTerminal $otherTerminal;
    protected Product $product;
    protected ProductVariant $variant;
    protected Customer $customer;

    protected PosShiftService $shiftService;
    protected SalesService $salesService;
    protected SalesReturnService $salesReturnService;
    protected StoreCreditService $storeCreditService;
    protected AccountingService $accountingService;
    protected AccountMappingService $mappingService;
    protected InventoryService $inventoryService;

    protected Account $cashBankAccount;
    protected Account $operatingExpenseAccount;
    protected Account $otherIncomeAccount;
    protected Account $arAccount;
    protected Account $salesRevenueAccount;
    protected Account $cogsAccount;
    protected Account $inventoryAssetAccount;

    protected function setUp(): void
    {
        parent::setUp();

        $this->shiftService = app(PosShiftService::class);
        $this->salesService = app(SalesService::class);
        $this->salesReturnService = app(SalesReturnService::class);
        $this->storeCreditService = app(StoreCreditService::class);
        $this->accountingService = app(AccountingService::class);
        $this->mappingService = app(AccountMappingService::class);
        $this->inventoryService = app(InventoryService::class);

        // 1. Company Setup
        $this->company = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'RetailCore Shift Corp',
            'code' => 'COMP-SH-' . Str::random(4),
            'country' => 'Bangladesh',
        ]);

        $this->otherCompany = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Other Tenant Corp',
            'code' => 'COMP-OT-' . Str::random(4),
            'country' => 'Bangladesh',
        ]);

        // 2. Roles & Permissions Setup
        $permList = [
            'pos.view', 'pos.open_session', 'pos.close_session',
            'pos_shifts.view', 'pos_shifts.open', 'pos_shifts.close',
            'pos_shifts.cash_in', 'pos_shifts.cash_out', 'pos_shifts.reconcile',
            'pos_shifts.approve_variance', 'sales.view', 'sales.complete',
            'sales_return.view', 'sales_return.create',
            'store_credit.view', 'store_credit.issue', 'store_credit.redeem',
        ];
        foreach ($permList as $pName) {
            Permission::firstOrCreate(['name' => $pName], ['group' => 'pos']);
        }

        $cashierRole = Role::firstOrCreate(['name' => 'Cashier']);
        $cashierPerms = Permission::whereIn('name', [
            'pos.view', 'pos.open_session', 'pos.close_session',
            'pos_shifts.view', 'pos_shifts.open', 'pos_shifts.close',
            'pos_shifts.cash_in', 'pos_shifts.cash_out', 'pos_shifts.reconcile',
            'sales.view', 'sales.complete', 'sales_return.view', 'sales_return.create',
            'store_credit.view', 'store_credit.redeem',
        ])->pluck('id');
        $cashierRole->permissions()->syncWithoutDetaching($cashierPerms);

        $supervisorRole = Role::firstOrCreate(['name' => 'Manager']);
        $supervisorRole->permissions()->syncWithoutDetaching(Permission::pluck('id'));

        $this->cashier = User::factory()->create(['name' => 'Main Cashier']);
        $this->cashier->companies()->attach($this->company->id);
        $this->cashier->roles()->attach($cashierRole->id);

        $this->supervisor = User::factory()->create(['name' => 'Store Supervisor']);
        $this->supervisor->companies()->attach($this->company->id);
        $this->supervisor->roles()->attach($supervisorRole->id);

        $this->otherCashier = User::factory()->create(['name' => 'Other Tenant User']);
        $this->otherCashier->companies()->attach($this->otherCompany->id);
        $this->otherCashier->roles()->attach($cashierRole->id);

        // 3. Organization Units & Branches
        $this->businessUnit = BusinessUnit::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'name' => 'Retail BU',
            'code' => 'BU-' . Str::random(4),
        ]);

        $this->branch = Branch::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'name' => 'Dhanmondi Branch',
            'code' => 'BR-DHAN',
        ]);

        $this->otherBranch = Branch::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'name' => 'Gulshan Branch',
            'code' => 'BR-GUL',
        ]);

        // Restrict cashier explicitly to Dhanmondi Branch
        $this->cashier->branches()->attach($this->branch->id);

        $this->warehouse = \App\Models\Warehouse::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'branch_id' => $this->branch->id,
            'name' => 'Branch Warehouse',
            'code' => 'WH-' . Str::random(4),
            'is_active' => true,
        ]);

        // 4. POS Terminals
        $this->terminal = PosTerminal::create([
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'branch_id' => $this->branch->id,
            'warehouse_id' => $this->warehouse->id,
            'terminal_code' => 'POS-DHAN-01',
            'terminal_name' => 'Counter 1',
            'status' => 'ACTIVE',
        ]);

        $this->otherTerminal = PosTerminal::create([
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'branch_id' => $this->branch->id,
            'warehouse_id' => $this->warehouse->id,
            'terminal_code' => 'POS-DHAN-02',
            'terminal_name' => 'Counter 2',
            'status' => 'ACTIVE',
        ]);

        // 5. Product & Customer Setup
        $category = Category::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'name' => 'Retail Goods',
            'code' => 'CAT-' . Str::random(4),
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
            'name' => 'Smart Watch',
            'code' => 'PRD-' . Str::random(4),
            'status' => 'ACTIVE',
            'tax_rate' => 0.00,
        ]);

        $this->variant = ProductVariant::create([
            'uuid' => (string) Str::uuid(),
            'product_id' => $this->product->id,
            'sku' => 'SKU-WATCH-01',
            'variant_name' => 'Standard Black',
            'cost_price' => 2000.00,
            'selling_price' => 3000.00,
            'status' => 'ACTIVE',
        ]);

        $this->customer = Customer::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'customer_code' => 'CUST-' . Str::random(6),
            'name' => 'Tariq Hasan',
            'mobile' => '01711' . rand(100000, 999999),
            'status' => 'active',
        ]);

        // 6. Accounting Setup
        $fiscalYear = FiscalYear::create([
            'company_id' => $this->company->id,
            'name' => 'FY 2026',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'status' => 'OPEN',
            'created_by' => $this->cashier->id,
        ]);

        AccountingPeriod::create([
            'company_id' => $this->company->id,
            'fiscal_year_id' => $fiscalYear->id,
            'name' => 'Period 2026-10',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'status' => 'OPEN',
            'created_by' => $this->cashier->id,
        ]);

        $grpAsset = AccountGroup::create([
            'company_id' => $this->company->id,
            'name' => 'Current Assets',
            'code' => '1000',
            'account_type' => 'ASSET',
        ]);

        $grpExp = AccountGroup::create([
            'company_id' => $this->company->id,
            'name' => 'Operating Expense',
            'code' => '5000',
            'account_type' => 'EXPENSE',
        ]);

        $grpRev = AccountGroup::create([
            'company_id' => $this->company->id,
            'name' => 'Revenue',
            'code' => '4000',
            'account_type' => 'REVENUE',
        ]);

        $this->cashBankAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpAsset->id,
            'account_code' => '1010',
            'account_name' => 'Cash in Drawer / Bank',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->operatingExpenseAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpExp->id,
            'account_code' => '5010',
            'account_name' => 'Operating Expense',
            'account_type' => 'EXPENSE',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->otherIncomeAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpRev->id,
            'account_code' => '4090',
            'account_name' => 'Cash Overage Income',
            'account_type' => 'REVENUE',
            'normal_balance' => 'CREDIT',
            'is_active' => true,
        ]);

        $this->arAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpAsset->id,
            'account_code' => '1020',
            'account_name' => 'Accounts Receivable',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->salesRevenueAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpRev->id,
            'account_code' => '4010',
            'account_name' => 'Sales Revenue',
            'account_type' => 'REVENUE',
            'normal_balance' => 'CREDIT',
            'is_active' => true,
        ]);

        $this->cogsAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpExp->id,
            'account_code' => '5001',
            'account_name' => 'Cost of Goods Sold',
            'account_type' => 'EXPENSE',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->inventoryAssetAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpAsset->id,
            'account_code' => '1030',
            'account_name' => 'Inventory Asset',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_CASH_BANK, $this->cashBankAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_OPERATING_EXPENSE, $this->operatingExpenseAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_OTHER_INCOME, $this->otherIncomeAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_CASH_SHORTAGE, $this->operatingExpenseAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_CASH_OVERAGE, $this->otherIncomeAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_ACCOUNTS_RECEIVABLE, $this->arAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_SALES_REVENUE, $this->salesRevenueAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_COGS, $this->cogsAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_INVENTORY_ASSET, $this->inventoryAssetAccount->id);

        $this->mappingService->setAccountingEnabled($this->company->id, true);

        // 7. Initial Stock
        $this->inventoryService->stockIn(
            $this->company->id,
            $this->warehouse->id,
            $this->variant->id,
            100,
            2000.00,
            'OPENING_STOCK',
            1,
            'INIT-STOCK-001',
            'Opening stock for test',
            null,
            $this->cashier->id
        );
    }

    /**
     * Helper to complete a sale under a session.
     */
    protected function createSaleHelper(PosSession $session, array $payments, float $qty = 1.0): Sale
    {
        $unitPrice = (float) $this->variant->selling_price;

        $formattedPayments = [];
        foreach ($payments as $p) {
            $formattedPayments[] = [
                'method' => $p['payment_method'] ?? $p['method'],
                'amount' => (float) $p['amount'],
                'transaction_ref' => $p['transaction_ref'] ?? null,
                'card_type' => $p['card_type'] ?? null,
            ];
        }

        return $this->salesService->completeSale($this->company->id, [
            'pos_session_id' => $session->id,
            'pos_terminal_id' => $session->pos_terminal_id,
            'branch_id' => $session->branch_id,
            'warehouse_id' => $session->warehouse_id,
            'cashier_id' => $session->cashier_id,
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => $qty,
                    'unit_price' => $unitPrice,
                ],
            ],
            'payments' => $formattedPayments,
        ]);
    }

    /**
     * Tests 1-4: Shift Opening, Duplicate Blockage, Opening Float & Active Shift Query
     */
    public function test_01_to_04_shift_opening_and_active_retrieval(): void
    {
        // 1. Open Shift
        $shift = $this->shiftService->openShift($this->company->id, $this->terminal->id, $this->cashier->id, 5000.00, 'Morning float');
        $this->assertInstanceOf(PosSession::class, $shift);
        $this->assertEquals('OPEN', $shift->status);
        $this->assertEquals(5000.00, (float) $shift->opening_cash);
        $this->assertStringStartsWith('SES-', $shift->session_number);

        // 2. Duplicate Active Shift on Same Terminal Blocked
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Terminal already has an open session');
        $this->shiftService->openShift($this->company->id, $this->terminal->id, $this->supervisor->id, 2000.00);
    }

    public function test_03_opening_cash_cannot_be_negative(): void
    {
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Opening cash float cannot be negative');
        $this->shiftService->openShift($this->company->id, $this->terminal->id, $this->cashier->id, -500.00);
    }

    public function test_04_active_shift_retrieval_and_duplicate_cashier_blocked(): void
    {
        $shift = $this->shiftService->openShift($this->company->id, $this->terminal->id, $this->cashier->id, 1000.00);

        // Active shift retrieval
        $current = $this->shiftService->getCurrentShift($this->company->id, $this->cashier->id);
        $this->assertNotNull($current);
        $this->assertEquals($shift->id, $current->id);

        // Duplicate shift for same cashier on another terminal blocked
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Cashier already has an open session');
        $this->shiftService->openShift($this->company->id, $this->otherTerminal->id, $this->cashier->id, 2000.00);
    }

    /**
     * Tests 5-7: Cash In, Cash Out, and Unauthorized Drawer Negative Cash Out
     */
    public function test_05_to_07_cash_in_cash_out_and_unauthorized_drop(): void
    {
        $shift = $this->shiftService->openShift($this->company->id, $this->terminal->id, $this->cashier->id, 2000.00);

        // 5. Cash In
        $cashIn = $this->shiftService->cashIn($this->company->id, $shift->id, $this->cashier->id, [
            'amount' => 1500.00,
            'reason' => 'Replenished change float',
            'reference' => 'CIN-VOUCHER-01',
        ]);
        $this->assertInstanceOf(PosCashMovement::class, $cashIn);
        $this->assertEquals('CASH_IN', $cashIn->type);
        $this->assertEquals(1500.00, (float) $cashIn->amount);

        // 6. Cash Out
        $cashOut = $this->shiftService->cashOut($this->company->id, $shift->id, $this->cashier->id, [
            'amount' => 800.00,
            'reason' => 'Store tea & cleaning expense',
            'reference' => 'COUT-EXP-01',
        ]);
        $this->assertEquals('CASH_OUT', $cashOut->type);
        $this->assertEquals(800.00, (float) $cashOut->amount);

        // Expected cash now: 2000 + 1500 - 800 = 2700
        $calc = $this->shiftService->calculateExpectedCash($this->company->id, $shift->id);
        $this->assertEquals(2700.00, (float) $calc['expected_cash']);

        // 7. Unauthorized Cash Out exceeding drawer cash (attempting 3000 when only 2700 available)
        try {
            $this->shiftService->cashOut($this->company->id, $shift->id, $this->cashier->id, [
                'amount' => 3000.00,
                'reason' => 'Excessive withdrawal',
            ]);
            $this->fail('Excessive cash out should have thrown DomainException');
        } catch (DomainException $e) {
            $this->assertStringContainsString('exceeds current estimated drawer cash', $e->getMessage());
        }
    }

    /**
     * Tests 8-14: Expected Cash, Actual Cash, Variances (Balanced, Short, Over), Closing & Immutability
     */
    public function test_08_to_14_closing_variances_and_immutability(): void
    {
        // 8-10. Balanced Closing
        $shift1 = $this->shiftService->openShift($this->company->id, $this->terminal->id, $this->cashier->id, 5000.00);
        $closedShift1 = $this->shiftService->closeShift($this->company->id, $shift1->id, $this->cashier->id, 5000.00, 'Balanced close');
        $this->assertEquals('CLOSED', $closedShift1->status);
        $this->assertEquals('BALANCED', $closedShift1->variance_status);
        $this->assertEquals(0.00, (float) $closedShift1->cash_difference);

        // 14. Closed shift immutability: updates prohibited
        try {
            $closedShift1->update(['opening_cash' => 9999.00]);
            $this->fail('Closed shift update should have thrown DomainException');
        } catch (DomainException $e) {
            $this->assertStringContainsString('Closed POS sessions are immutable', $e->getMessage());
        }

        // 11. Short Variance Closing
        $shift2 = $this->shiftService->openShift($this->company->id, $this->terminal->id, $this->cashier->id, 5000.00);
        $closedShift2 = $this->shiftService->closeShift($this->company->id, $shift2->id, $this->cashier->id, 4800.00, 'Short by 200');
        $this->assertEquals('SHORT', $closedShift2->variance_status);
        $this->assertEquals(-200.00, (float) $closedShift2->cash_difference);

        // 12. Over Variance Closing
        $shift3 = $this->shiftService->openShift($this->company->id, $this->terminal->id, $this->cashier->id, 5000.00);
        $closedShift3 = $this->shiftService->closeShift($this->company->id, $shift3->id, $this->cashier->id, 5150.00, 'Excess by 150');
        $this->assertEquals('OVER', $closedShift3->variance_status);
        $this->assertEquals(150.00, (float) $closedShift3->cash_difference);
    }

    /**
     * Tests 15-21: POS Sales Tenders & Drawer Segmentation
     */
    public function test_15_to_21_pos_sales_tender_segmentation(): void
    {
        $shift = $this->shiftService->openShift($this->company->id, $this->terminal->id, $this->cashier->id, 10000.00);

        // 16. CASH Sale (৳3000) -> Affects Drawer
        $this->createSaleHelper($shift, [
            ['payment_method' => 'CASH', 'amount' => 3000.00],
        ]);

        // 17. CARD Sale (৳3000) -> Does NOT affect physical drawer cash
        $this->createSaleHelper($shift, [
            ['payment_method' => 'CARD', 'amount' => 3000.00, 'card_type' => 'VISA'],
        ]);

        // 18. BKASH Sale (৳3000) -> Does NOT affect physical drawer cash
        $this->createSaleHelper($shift, [
            ['payment_method' => 'BKASH', 'amount' => 3000.00, 'transaction_ref' => 'TRXBKASH01'],
        ]);

        // 19. NAGAD Sale (৳3000) -> Does NOT affect physical drawer cash
        $this->createSaleHelper($shift, [
            ['payment_method' => 'NAGAD', 'amount' => 3000.00, 'transaction_ref' => 'TRXNAGAD01'],
        ]);

        // 20. Store Credit Sale (৳3000) -> Does NOT affect physical drawer cash
        $this->storeCreditService->issueCredit($this->company->id, $this->customer->id, 5000.00, 'Preloaded store credit');
        $this->createSaleHelper($shift, [
            ['payment_method' => 'STORE_CREDIT', 'amount' => 3000.00],
        ]);

        // 21. Multi-tender Sale: Cash ৳1000 + Card ৳1000 + Store Credit ৳1000 = ৳3000
        $this->createSaleHelper($shift, [
            ['payment_method' => 'CASH', 'amount' => 1000.00],
            ['payment_method' => 'CARD', 'amount' => 1000.00],
            ['payment_method' => 'STORE_CREDIT', 'amount' => 1000.00],
        ]);

        // Check authoritative calculation:
        // Opening (10000) + Cash Sales (3000 + 1000 = 4000) = 14000
        $calc = $this->shiftService->calculateExpectedCash($this->company->id, $shift->id);
        $this->assertEquals(4000.00, (float) $calc['cash_sales']);
        $this->assertEquals(14000.00, (float) $calc['expected_cash']);

        // Check tender summary in reconciliation
        $recon = $this->shiftService->getShiftReconciliation($this->company->id, $shift->id);
        $this->assertEquals(4000.00, $recon['non_cash']['card_total']); // 3000 + 1000
        $this->assertEquals(3000.00, $recon['non_cash']['bkash_total']);
        $this->assertEquals(3000.00, $recon['non_cash']['nagad_total']);
        $this->assertEquals(4000.00, $recon['non_cash']['store_credit_total']); // 3000 + 1000
    }

    /**
     * Tests 22-23: Sales Return Cash Refund vs Store Credit Refund
     */
    public function test_22_to_23_sales_returns_drawer_impact(): void
    {
        $shift = $this->shiftService->openShift($this->company->id, $this->terminal->id, $this->cashier->id, 10000.00);

        // Sale 1: Cash sale ৳6000 (2 items @ 3000)
        $sale = $this->createSaleHelper($shift, [
            ['payment_method' => 'CASH', 'amount' => 6000.00],
        ], 2.0);

        // 22. Cash refund of 1 item (৳3000) -> MUST reduce physical drawer cash
        $saleItem = $sale->items->first();
        $this->salesReturnService->processReturn($this->company->id, [
            'original_sale_id' => $sale->id,
            'pos_session_id' => $shift->id,
            'pos_terminal_id' => $shift->pos_terminal_id,
            'processed_by' => $this->cashier->id,
            'return_type' => 'REFUND',
            'items' => [
                [
                    'original_sale_item_id' => $saleItem->id,
                    'return_quantity' => 1,
                    'condition' => 'RESELLABLE',
                ],
            ],
            'refund_methods' => [
                ['method' => 'CASH', 'amount' => 3000.00],
            ],
        ]);

        $calc = $this->shiftService->calculateExpectedCash($this->company->id, $shift->id);
        $this->assertEquals(3000.00, (float) $calc['cash_refunds']);
        // Expected: 10000 opening + 6000 cash sales - 3000 cash refunds = 13000
        $this->assertEquals(13000.00, (float) $calc['expected_cash']);

        // 23. Return with Store Credit refund -> does NOT reduce physical cash
        $sale2 = $this->createSaleHelper($shift, [
            ['payment_method' => 'CASH', 'amount' => 3000.00],
        ], 1.0);
        $saleItem2 = $sale2->items->first();

        $this->salesReturnService->processReturn($this->company->id, [
            'original_sale_id' => $sale2->id,
            'pos_session_id' => $shift->id,
            'pos_terminal_id' => $shift->pos_terminal_id,
            'processed_by' => $this->cashier->id,
            'return_type' => 'STORE_CREDIT',
            'items' => [
                [
                    'original_sale_item_id' => $saleItem2->id,
                    'return_quantity' => 1,
                    'condition' => 'RESELLABLE',
                ],
            ],
            'refund_methods' => [
                ['method' => 'CUSTOMER_CREDIT', 'amount' => 3000.00],
            ],
        ]);

        $calc2 = $this->shiftService->calculateExpectedCash($this->company->id, $shift->id);
        // Cash refunds still 3000 (from previous cash return), Store credit return added 0 to cash_refunds
        $this->assertEquals(3000.00, (float) $calc2['cash_refunds']);
        // Expected: 10000 + 6000 + 3000 - 3000 = 16000
        $this->assertEquals(16000.00, (float) $calc2['expected_cash']);
    }

    /**
     * Tests 24-29: Accounting GL Integration (Cash In, Cash Out, Variances, Balanced Journals, No Duplicate GL)
     */
    public function test_24_to_29_accounting_journals_and_balance(): void
    {
        $shift = $this->shiftService->openShift($this->company->id, $this->terminal->id, $this->cashier->id, 5000.00);

        // 24. Cash In GL
        $this->shiftService->cashIn($this->company->id, $shift->id, $this->cashier->id, [
            'amount' => 1000.00,
            'reason' => 'Vault float replenish',
        ]);

        // 25. Cash Out GL
        $this->shiftService->cashOut($this->company->id, $shift->id, $this->cashier->id, [
            'amount' => 500.00,
            'reason' => 'Courier delivery petty cash',
        ]);

        // 26. Close with Shortage (Expected 5500, Counted 5300 -> Short 200)
        $this->shiftService->closeShift($this->company->id, $shift->id, $this->cashier->id, 5300.00, 'Short 200');

        // 28. Verify balanced journals
        $journals = DB::table('journal_entries')
            ->where('company_id', $this->company->id)
            ->where('source', 'POS')
            ->get();

        $this->assertGreaterThanOrEqual(3, $journals->count());

        foreach ($journals as $journal) {
            $lines = DB::table('journal_entry_lines')->where('journal_entry_id', $journal->id)->get();
            $debits = $lines->sum('debit');
            $credits = $lines->sum('credit');
            $this->assertEquals($debits, $credits, "Journal ID {$journal->id} is unbalanced!");
            $this->assertEquals('POSTED', $journal->status);
        }

        // 29. Verify no duplicate GL
        $shortageJournals = DB::table('journal_entries')
            ->where('company_id', $this->company->id)
            ->where('idempotency_key', "POS-SHIFT-SHORT-{$shift->id}")
            ->count();
        $this->assertEquals(1, $shortageJournals);
    }

    /**
     * Tests 30-33: AuditLog Events
     */
    public function test_30_to_33_audit_log_events(): void
    {
        $shift = $this->shiftService->openShift($this->company->id, $this->terminal->id, $this->cashier->id, 5000.00);
        $this->assertDatabaseHas('audit_logs', [
            'company_id' => $this->company->id,
            'event' => 'POS_SHIFT_OPENED',
            'auditable_id' => $shift->id,
        ]);

        $cin = $this->shiftService->cashIn($this->company->id, $shift->id, $this->cashier->id, [
            'amount' => 1000.00,
            'reason' => 'Audited cash in',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'company_id' => $this->company->id,
            'event' => 'POS_SHIFT_CASH_IN',
            'auditable_id' => $cin->id,
        ]);

        $cout = $this->shiftService->cashOut($this->company->id, $shift->id, $this->cashier->id, [
            'amount' => 500.00,
            'reason' => 'Audited cash out',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'company_id' => $this->company->id,
            'event' => 'POS_SHIFT_CASH_OUT',
            'auditable_id' => $cout->id,
        ]);

        $this->shiftService->closeShift($this->company->id, $shift->id, $this->cashier->id, 5500.00);
        $this->assertDatabaseHas('audit_logs', [
            'company_id' => $this->company->id,
            'event' => 'POS_SHIFT_CLOSED',
            'auditable_id' => $shift->id,
        ]);
    }

    /**
     * Tests 34-39: RBAC, 401, 403, Cross-Company, Cross-Branch, Cross-Terminal Isolation
     */
    public function test_34_to_39_security_and_tenant_branch_isolation(): void
    {
        // 35. 401 Unauthenticated
        $this->getJson('/api/v1/pos/sessions/current')->assertStatus(401);

        // 36. 403 Cashier cannot approve variance without supervisor permission
        $shift = $this->shiftService->openShift($this->company->id, $this->terminal->id, $this->cashier->id, 5000.00);
        $this->shiftService->closeShift($this->company->id, $shift->id, $this->cashier->id, 4800.00);

        $this->actingAs($this->cashier)
            ->postJson("/api/v1/pos/sessions/{$shift->id}/approve-variance")
            ->assertStatus(403);

        // Supervisor can approve variance
        $this->actingAs($this->supervisor)
            ->postJson("/api/v1/pos/sessions/{$shift->id}/approve-variance", ['notes' => 'Authorized shortage'])
            ->assertStatus(200)
            ->assertJsonPath('data.variance_approved_by', $this->supervisor->id);

        // 37. Cross-Company Isolation: User from company B cannot view company A's shift
        $this->actingAs($this->otherCashier)
            ->withHeaders(['X-Company-ID' => (string) $this->otherCompany->id])
            ->getJson("/api/v1/pos/sessions/{$shift->id}")
            ->assertStatus(404);

        // 38. Cross-Branch Isolation: Cashier assigned only to Dhanmondi cannot open Counter in Gulshan Branch
        $gulshanTerminal = PosTerminal::create([
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'branch_id' => $this->otherBranch->id,
            'terminal_code' => 'POS-GUL-01',
            'terminal_name' => 'Gulshan Counter',
            'status' => 'ACTIVE',
        ]);

        try {
            $this->shiftService->openShift($this->company->id, $gulshanTerminal->id, $this->cashier->id, 1000.00);
            $this->fail('Cashier should not be able to open terminal in unauthorized branch');
        } catch (DomainException $e) {
            $this->assertStringContainsString('Cashier does not have access to this terminal\'s branch', $e->getMessage());
        }
    }

    /**
     * Tests 40-44: Concurrency Protection, Payment Total & Financial Invariants
     */
    public function test_40_to_44_concurrency_and_financial_invariants(): void
    {
        // 40. Concurrent opening attempts: opening twice on same terminal blocked
        $shift = $this->shiftService->openShift($this->company->id, $this->terminal->id, $this->cashier->id, 5000.00);

        try {
            $this->shiftService->openShift($this->company->id, $this->terminal->id, $this->supervisor->id, 5000.00);
            $this->fail('Concurrent open on same terminal should fail');
        } catch (DomainException $e) {
            $this->assertStringContainsString('Terminal already has an open session', $e->getMessage());
        }

        // 41. Concurrent close attempts: second close fails with 422 / DomainException
        $this->shiftService->closeShift($this->company->id, $shift->id, $this->cashier->id, 5000.00);

        try {
            $this->shiftService->closeShift($this->company->id, $shift->id, $this->cashier->id, 5000.00);
            $this->fail('Second close attempt on closed shift should fail');
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            $this->assertTrue(true);
        }

        // 42-44. Financial & Expected Cash Invariants across fresh shift
        $shift2 = $this->shiftService->openShift($this->company->id, $this->terminal->id, $this->cashier->id, 20000.00);

        // Multiple cash & split tender sales
        $sale1 = $this->createSaleHelper($shift2, [['payment_method' => 'CASH', 'amount' => 3000.00]]);
        $sale2 = $this->createSaleHelper($shift2, [
            ['payment_method' => 'CASH', 'amount' => 1500.00],
            ['payment_method' => 'CARD', 'amount' => 1500.00],
        ]);

        $this->shiftService->cashIn($this->company->id, $shift2->id, $this->cashier->id, ['amount' => 5000.00, 'reason' => 'Float addition']);
        $this->shiftService->cashOut($this->company->id, $shift2->id, $this->cashier->id, ['amount' => 2000.00, 'reason' => 'Store drop']);

        $expected = $this->shiftService->calculateExpectedCash($this->company->id, $shift2->id);

        // Invariant: Expected Cash = 20000 + 4500 (3000+1500) + 5000 - 2000 = 27500
        $this->assertEquals(27500.00, (float) $expected['expected_cash']);

        // Payment Total Invariant: sale2 payments match invoice total
        $this->assertEquals(3000.00, (float) $sale2->payments->sum('amount'));

        // Close shift balanced
        $closed = $this->shiftService->closeShift($this->company->id, $shift2->id, $this->cashier->id, 27500.00);
        $this->assertEquals('BALANCED', $closed->variance_status);
        $this->assertEquals(0.00, (float) $closed->cash_difference);
    }
}
