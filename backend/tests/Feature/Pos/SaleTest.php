<?php

namespace Tests\Feature\Pos;

use App\Models\Account;
use App\Models\AccountGroup;
use App\Models\AccountingPeriod;
use App\Models\Branch;
use App\Models\BusinessUnit;
use App\Models\Category;
use App\Models\Company;
use App\Models\Customer;
use App\Models\CustomerLedger;
use App\Models\FiscalYear;
use App\Models\JournalEntry;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\PosSession;
use App\Models\PosTerminal;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalePayment;
use App\Models\StockMovement;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\AccountMappingService;
use App\Services\AccountingService;
use App\Services\InventoryAccountingService;
use App\Services\InventoryService;
use App\Services\PaymentService;
use App\Services\SalesService;
use Exception;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class SaleTest extends TestCase
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

    protected FiscalYear $fiscalYear;
    protected AccountingPeriod $accountingPeriod;

    protected Account $arAccount;
    protected Account $salesRevenueAccount;
    protected Account $vatPayableAccount;
    protected Account $cogsAccount;
    protected Account $inventoryAssetAccount;
    protected Account $cashBankAccount;
    protected Account $apAccount;

    protected AccountMappingService $mappingService;
    protected AccountingService $accountingService;
    protected InventoryAccountingService $inventoryAccountingService;
    protected InventoryService $inventoryService;
    protected PaymentService $paymentService;
    protected SalesService $salesService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->mappingService = app(AccountMappingService::class);
        $this->accountingService = app(AccountingService::class);
        $this->inventoryAccountingService = app(InventoryAccountingService::class);
        $this->inventoryService = app(InventoryService::class);
        $this->paymentService = app(PaymentService::class);
        $this->salesService = app(SalesService::class);

        // 1. Organization Setup
        $this->company = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'POS RetailCore Corp',
            'code' => 'COMP-' . Str::random(5),
            'country' => 'Bangladesh',
        ]);

        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);

        $this->businessUnit = BusinessUnit::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'name' => 'Retail Division',
            'code' => 'BU-' . Str::random(5),
        ]);

        $this->branch = Branch::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'name' => 'Dhaka Flagship Store',
            'code' => 'BR-' . Str::random(5),
        ]);

        $this->warehouse = Warehouse::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'branch_id' => $this->branch->id,
            'name' => 'Main Outlet Warehouse',
            'code' => 'WH-' . Str::random(5),
            'is_active' => true,
        ]);

        // 2. POS Terminal & Session Setup
        $this->terminal = PosTerminal::create([
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'branch_id' => $this->branch->id,
            'warehouse_id' => $this->warehouse->id,
            'terminal_code' => 'POS-01',
            'terminal_name' => 'Counter 1 POS',
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
            'name' => 'Apparel',
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
            'name' => 'Premium Cotton Shirt',
            'code' => 'PROD-' . Str::random(5),
            'status' => 'ACTIVE',
            'tax_rate' => 10.00, // 10% VAT
        ]);

        $this->variant = ProductVariant::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'sku' => 'SHIRT-BLU-L',
            'variant_name' => 'Blue / Large',
            'cost_price' => 400.00,
            'selling_price' => 1000.00,
            'mrp' => 1000.00,
            'tax_rate' => 10.00, // 10% VAT
            'status' => 'ACTIVE',
        ]);

        // 4. Fiscal Year & Period (OPEN for 2026)
        $year = date('Y');
        $this->fiscalYear = FiscalYear::create([
            'company_id' => $this->company->id,
            'name' => "FY {$year}",
            'start_date' => "{$year}-01-01",
            'end_date' => "{$year}-12-31",
            'status' => 'OPEN',
            'created_by' => $this->user->id,
        ]);

        $this->accountingPeriod = AccountingPeriod::create([
            'company_id' => $this->company->id,
            'fiscal_year_id' => $this->fiscalYear->id,
            'name' => "Period {$year}-01 to {$year}-12",
            'start_date' => "{$year}-01-01",
            'end_date' => "{$year}-12-31",
            'status' => 'OPEN',
            'created_by' => $this->user->id,
        ]);

        // 5. Chart of Accounts Setup
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
            'name' => 'Cost of Sales',
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
            'account_code' => '4010',
            'account_name' => 'Retail Sales Revenue',
            'account_type' => 'REVENUE',
            'normal_balance' => 'CREDIT',
            'is_active' => true,
        ]);

        $this->vatPayableAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpLiab->id,
            'account_code' => '2020',
            'account_name' => 'VAT Payable Control',
            'account_type' => 'LIABILITY',
            'normal_balance' => 'CREDIT',
            'is_active' => true,
        ]);

        $this->cogsAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpExp->id,
            'account_code' => '5010',
            'account_name' => 'Cost of Goods Sold',
            'account_type' => 'EXPENSE',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
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

        $this->cashBankAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpAsset->id,
            'account_code' => '1010',
            'account_name' => 'Cash in Drawer / Bank Account',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->apAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpLiab->id,
            'account_code' => '2010',
            'account_name' => 'Accounts Payable',
            'account_type' => 'LIABILITY',
            'normal_balance' => 'CREDIT',
            'is_active' => true,
        ]);

        // 6. Map All Accounting Roles
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_ACCOUNTS_RECEIVABLE, $this->arAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_SALES_REVENUE, $this->salesRevenueAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_VAT_PAYABLE, $this->vatPayableAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_COGS, $this->cogsAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_INVENTORY_ASSET, $this->inventoryAssetAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_CASH_BANK, $this->cashBankAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_ACCOUNTS_PAYABLE, $this->apAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_AP_CLEARING, $this->apAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_INVENTORY_ADJUSTMENT, $this->cogsAccount->id);

        // 7. Seed Initial Inventory in Warehouse (50 units @ 400.00 cost)
        $this->inventoryService->stockIn(
            $this->company->id,
            $this->warehouse->id,
            $this->variant->id,
            50,
            400.00,
            'OPENING_STOCK',
            1,
            'INIT-STOCK-001',
            'Opening stock for test',
            null,
            $this->user->id
        );
    }

    /**
     * Test 1: Full POS sale workflow with Payment v2, split payments, COGS, and automated accounting journals.
     */
    public function test_can_complete_sale_idempotently_with_payments_v2_and_accounting()
    {
        $this->mappingService->setAccountingEnabled($this->company->id, true);

        // Qty: 2 @ 1000 = 2000, Item Discount: 200 => Taxable: 1800 => VAT (10%): 180 => Grand Total: 1980
        $payload = [
            'pos_session_id' => $this->session->id,
            'cashier_id' => $this->user->id,
            'customer_id' => null, // Walk-in, but paying in full
            'idempotency_key' => 'SALE-IDEMP-TEST-001',
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 2,
                    'unit_price' => 1000.00,
                    'discount' => 200.00,
                    'tax' => 180.00,
                ],
            ],
            'sale_discount' => 0,
            'payments' => [
                [
                    'method' => 'CASH',
                    'amount' => 1000.00,
                ],
                [
                    'method' => 'CARD',
                    'amount' => 980.00,
                    'reference_number' => 'CARD-AUTH-112233',
                ],
            ],
        ];

        $sale = $this->salesService->completeSale($this->company->id, $payload);

        // Assert Sale Model
        $this->assertInstanceOf(Sale::class, $sale);
        $this->assertEquals('COMPLETED', $sale->status);
        $this->assertEquals(2000.00, (float) $sale->subtotal);
        $this->assertEquals(200.00, (float) $sale->discount_total);
        $this->assertEquals(180.00, (float) $sale->tax_total);
        $this->assertEquals(1980.00, (float) $sale->grand_total);
        $this->assertEquals(1980.00, (float) $sale->paid_amount);
        $this->assertEquals(0.00, (float) $sale->due_amount);
        $this->assertEquals('PAID', $sale->payment_status);

        // Assert Sale Items
        $this->assertCount(1, $sale->items);
        $item = $sale->items->first();
        $this->assertEquals(2, (float) $item->quantity);
        $this->assertEquals(1000.00, (float) $item->unit_price);
        $this->assertEquals(200.00, (float) $item->discount);
        $this->assertEquals(180.00, (float) $item->tax);
        $this->assertEquals(1980.00, (float) $item->line_total);
        $this->assertEquals(400.00, (float) $item->unit_cost_snapshot);
        $this->assertEquals(800.00, (float) $item->total_cost_snapshot);

        // Assert Stock Movement
        $movements = StockMovement::where('company_id', $this->company->id)
            ->where('reference_type', 'SALE')
            ->where('reference_id', $sale->id)
            ->get();
        $this->assertCount(1, $movements);
        $movement = $movements->first();
        $this->assertEquals(2, (float) $movement->quantity);
        $this->assertEquals(400.00, (float) $movement->unit_cost);

        // Assert Authoritative Payment v2
        $payments = Payment::where('company_id', $this->company->id)->get();
        $this->assertCount(2, $payments);
        $this->assertEquals(1000.00, (float) $payments[0]->amount);
        $this->assertEquals('CASH', $payments[0]->payment_method);
        $this->assertEquals('CUSTOMER', $payments[0]->payment_type);
        $this->assertEquals(980.00, (float) $payments[1]->amount);
        $this->assertEquals('CARD', $payments[1]->payment_method);
        $this->assertEquals('CUSTOMER', $payments[1]->payment_type);

        // Assert Polymorphic Payment Allocations
        $allocations = PaymentAllocation::where('allocatable_type', Sale::class)
            ->where('allocatable_id', $sale->id)
            ->get();
        $this->assertCount(2, $allocations);
        $this->assertEquals(1980.00, (float) $allocations->sum('amount'));

        // Assert Legacy SalePayment Records for POS Shift Reconciliation
        $salePayments = SalePayment::where('sale_id', $sale->id)->get();
        $this->assertCount(2, $salePayments);
        $this->assertEquals(1980.00, (float) $salePayments->sum('amount'));

        // Assert General Ledger Journals:
        // 1. Sale Invoice Journal (DR AR 1980, CR Revenue 1800, CR VAT 180)
        $saleJournal = JournalEntry::where('company_id', $this->company->id)
            ->where('reference_type', 'Sale')
            ->where('reference_id', $sale->id)
            ->where('idempotency_key', "SALE-INV-{$sale->id}")
            ->first();
        $this->assertNotNull($saleJournal);
        $this->assertEquals('POSTED', $saleJournal->status);
        $this->assertEquals('SALES', $saleJournal->source);

        $saleLines = $saleJournal->lines;
        $this->assertCount(3, $saleLines);

        $arLine = $saleLines->firstWhere('account_id', $this->arAccount->id);
        $this->assertNotNull($arLine);
        $this->assertEquals(1980.00, (float) $arLine->debit);
        $this->assertEquals(0.00, (float) $arLine->credit);

        $revLine = $saleLines->firstWhere('account_id', $this->salesRevenueAccount->id);
        $this->assertNotNull($revLine);
        $this->assertEquals(0.00, (float) $revLine->debit);
        $this->assertEquals(1800.00, (float) $revLine->credit);

        $vatLine = $saleLines->firstWhere('account_id', $this->vatPayableAccount->id);
        $this->assertNotNull($vatLine);
        $this->assertEquals(0.00, (float) $vatLine->debit);
        $this->assertEquals(180.00, (float) $vatLine->credit);

        $this->assertEquals($saleLines->sum('debit'), $saleLines->sum('credit'));

        // 2. COGS Journal (DR COGS 800, CR Inventory Asset 800)
        $cogsJournal = JournalEntry::where('company_id', $this->company->id)
            ->where('reference_type', 'Sale')
            ->where('reference_id', $sale->id)
            ->where('idempotency_key', "SALE-COGS-{$sale->id}")
            ->first();
        $this->assertNotNull($cogsJournal);
        $this->assertEquals('POSTED', $cogsJournal->status);

        $cogsLines = $cogsJournal->lines;
        $this->assertCount(2, $cogsLines);
        $drCogs = $cogsLines->firstWhere('account_id', $this->cogsAccount->id);
        $crAsset = $cogsLines->firstWhere('account_id', $this->inventoryAssetAccount->id);
        $this->assertEquals(800.00, (float) $drCogs->debit);
        $this->assertEquals(800.00, (float) $crAsset->credit);
        $this->assertEquals($cogsLines->sum('debit'), $cogsLines->sum('credit'));

        // 3. Payment Journals (DR Cash/Bank, CR AR)
        foreach ($payments as $p) {
            $pJournal = JournalEntry::where('company_id', $this->company->id)
                ->where('reference_type', 'Payment')
                ->where('reference_id', $p->id)
                ->first();
            $this->assertNotNull($pJournal);
            $this->assertEquals('POSTED', $pJournal->status);
            $this->assertEquals((float) $p->amount, (float) $pJournal->lines->sum('debit'));
            $this->assertEquals((float) $p->amount, (float) $pJournal->lines->sum('credit'));
        }

        // Test Idempotency: replay same request
        $replaySale = $this->salesService->completeSale($this->company->id, $payload);
        $this->assertEquals($sale->id, $replaySale->id);
        $this->assertEquals(1, Sale::where('company_id', $this->company->id)->count());
        $this->assertEquals(2, Payment::where('company_id', $this->company->id)->count());
        $this->assertEquals(2, PaymentAllocation::where('allocatable_id', $sale->id)->count());
        $this->assertEquals(1, StockMovement::where('reference_type', 'SALE')->where('reference_id', $sale->id)->count());
        $this->assertEquals(4, JournalEntry::where('company_id', $this->company->id)->count()); // 1 Sale + 1 COGS + 2 Payments
    }

    /**
     * Test 2: When accounting is disabled, sale completes safely without creating journal entries.
     */
    public function test_sale_completes_gracefully_when_accounting_disabled()
    {
        $this->mappingService->setAccountingEnabled($this->company->id, false);

        $payload = [
            'pos_session_id' => $this->session->id,
            'cashier_id' => $this->user->id,
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 1,
                    'unit_price' => 1000.00,
                    'discount' => 0,
                    'tax' => 100.00,
                ],
            ],
            'payments' => [
                [
                    'method' => 'CASH',
                    'amount' => 1100.00,
                ],
            ],
        ];

        $sale = $this->salesService->completeSale($this->company->id, $payload);

        $this->assertInstanceOf(Sale::class, $sale);
        $this->assertEquals('COMPLETED', $sale->status);
        $this->assertEquals(1100.00, (float) $sale->grand_total);
        $this->assertEquals('PAID', $sale->payment_status);

        // Assert 0 Journal entries created
        $journalCount = JournalEntry::where('company_id', $this->company->id)->count();
        $this->assertEquals(0, $journalCount);

        // Payments and allocations are still recorded
        $this->assertEquals(1, Payment::where('company_id', $this->company->id)->count());
        $this->assertEquals(1, PaymentAllocation::where('allocatable_id', $sale->id)->count());
    }

    /**
     * Test 3: Tax calculation is strictly server-authoritative; client cannot forge or bypass tax.
     */
    public function test_server_authoritative_tax_calculation_overrides_client_tax()
    {
        $this->mappingService->setAccountingEnabled($this->company->id, true);

        // Client attempts to pass tax = 0 even though variant tax_rate is 10%
        $payload = [
            'pos_session_id' => $this->session->id,
            'cashier_id' => $this->user->id,
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 2,
                    'unit_price' => 500.00, // Total: 1000
                    'discount' => 0,
                    'tax' => 0, // Client tries to cheat tax
                ],
            ],
            'payments' => [
                [
                    'method' => 'CASH',
                    'amount' => 1100.00, // 1000 + 10% VAT (100)
                ],
            ],
        ];

        $sale = $this->salesService->completeSale($this->company->id, $payload);

        // Server calculated tax: 10% of 1000 = 100.00
        $this->assertEquals(100.00, (float) $sale->tax_total);
        $this->assertEquals(1100.00, (float) $sale->grand_total);
        $this->assertEquals('PAID', $sale->payment_status);

        // Verify VAT line in journal
        $saleJournal = JournalEntry::where('company_id', $this->company->id)
            ->where('idempotency_key', "SALE-INV-{$sale->id}")
            ->first();
        $vatLine = $saleJournal->lines->firstWhere('account_id', $this->vatPayableAccount->id);
        $this->assertEquals(100.00, (float) $vatLine->credit);
    }

    /**
     * Test 4: Walk-in customers cannot have an unpaid due balance.
     */
    public function test_sale_blocks_walkin_customer_with_due_balance()
    {
        $payload = [
            'pos_session_id' => $this->session->id,
            'cashier_id' => $this->user->id,
            'customer_id' => null, // Walk-in
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 1,
                    'unit_price' => 1000.00,
                ],
            ],
            'payments' => [
                [
                    'method' => 'CASH',
                    'amount' => 500.00, // Partial payment
                ],
            ],
        ];

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('Walk-in customers cannot have a due balance.');

        $this->salesService->completeSale($this->company->id, $payload);
    }

    /**
     * Test 5: Registered customer can have a due balance recorded in customer ledger.
     */
    public function test_sale_allows_credit_for_registered_customer_and_posts_to_ledger()
    {
        $this->mappingService->setAccountingEnabled($this->company->id, false);

        $customer = Customer::create([
            'company_id' => $this->company->id,
            'customer_code' => 'CUST-001',
            'name' => 'Corporate Client Ltd',
            'credit_limit' => 50000.00,
            'status' => 'ACTIVE',
        ]);

        // Qty: 2 @ 1000 = 2000, 10% tax = 200 => Grand Total: 2200
        // Paid: 1200 => Due: 1000
        $payload = [
            'pos_session_id' => $this->session->id,
            'cashier_id' => $this->user->id,
            'customer_id' => $customer->id,
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 2,
                    'unit_price' => 1000.00,
                ],
            ],
            'payments' => [
                [
                    'method' => 'CASH',
                    'amount' => 1200.00,
                ],
            ],
        ];

        $sale = $this->salesService->completeSale($this->company->id, $payload);

        $this->assertEquals(2200.00, (float) $sale->grand_total);
        $this->assertEquals(1200.00, (float) $sale->paid_amount);
        $this->assertEquals(1000.00, (float) $sale->due_amount);
        $this->assertEquals('PARTIAL', $sale->payment_status);

        // Verify customer ledger DEBIT
        $ledger = CustomerLedger::where('customer_id', $customer->id)
            ->where('reference_id', $sale->id)
            ->first();
        $this->assertNotNull($ledger);
        $this->assertEquals('SALE', $ledger->transaction_type);
        $this->assertEquals(1000.00, (float) $ledger->debit);
        $this->assertEquals(1000.00, (float) $ledger->balance_after);
    }

    /**
     * Test 6: Cash overpayment calculates change and only allocates exact payable to payment record.
     */
    public function test_sale_handles_cash_overpayment_change_correctly()
    {
        $this->mappingService->setAccountingEnabled($this->company->id, true);

        // Grand Total: 1100 (1000 + 100 tax)
        // Cash tendered: 1500 (Customer handed 1500, Cashier returns 400 change)
        $payload = [
            'pos_session_id' => $this->session->id,
            'cashier_id' => $this->user->id,
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 1,
                    'unit_price' => 1000.00,
                ],
            ],
            'payments' => [
                [
                    'method' => 'CASH',
                    'amount' => 1500.00,
                ],
            ],
        ];

        $sale = $this->salesService->completeSale($this->company->id, $payload);

        $this->assertEquals(1100.00, (float) $sale->grand_total);
        $this->assertEquals(1100.00, (float) $sale->paid_amount);
        $this->assertEquals(0.00, (float) $sale->due_amount);
        $this->assertEquals('PAID', $sale->payment_status);

        // Authoritative Payment allocated to sale should be exactly 1100.00
        $payment = Payment::where('company_id', $this->company->id)->first();
        $this->assertEquals(1100.00, (float) $payment->amount);

        $allocation = PaymentAllocation::where('payment_id', $payment->id)->first();
        $this->assertEquals(1100.00, (float) $allocation->amount);
    }
}
