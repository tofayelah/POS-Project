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
use App\Models\StockMovement;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\AccountMappingService;
use App\Services\AccountingService;
use App\Services\CustomerLedgerService;
use App\Services\InventoryAccountingService;
use App\Services\InventoryService;
use App\Services\PaymentService;
use App\Services\SalesService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Tests\TestCase;

class SalesReconciliationTest extends TestCase
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
    protected CustomerLedgerService $customerLedgerService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->mappingService = app(AccountMappingService::class);
        $this->accountingService = app(AccountingService::class);
        $this->inventoryAccountingService = app(InventoryAccountingService::class);
        $this->inventoryService = app(InventoryService::class);
        $this->paymentService = app(PaymentService::class);
        $this->salesService = app(SalesService::class);
        $this->customerLedgerService = app(CustomerLedgerService::class);

        // 1. Organization Setup
        $this->company = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'RetailCore Sales Corp',
            'code' => 'COMP-SALES',
            'country' => 'Bangladesh',
        ]);

        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);

        $this->businessUnit = BusinessUnit::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'name' => 'Retail Division',
            'code' => 'BU-RETAIL',
        ]);

        $this->branch = Branch::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'name' => 'Gulshan Flagship Store',
            'code' => 'BR-GULSHAN',
        ]);

        $this->warehouse = Warehouse::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'branch_id' => $this->branch->id,
            'name' => 'Gulshan Central Warehouse',
            'code' => 'WH-GULSHAN',
            'is_active' => true,
        ]);

        // 2. POS Terminal & Session
        $this->terminal = PosTerminal::create([
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'branch_id' => $this->branch->id,
            'warehouse_id' => $this->warehouse->id,
            'terminal_code' => 'POS-01',
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
            'name' => 'Fashion Apparel',
            'code' => 'CAT-FASHION',
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
            'name' => 'Executive Oxford Shirt',
            'code' => 'PROD-OXFORD',
            'status' => 'ACTIVE',
            'tax_rate' => 10.00, // 10% VAT
        ]);

        $this->variant = ProductVariant::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'sku' => 'SHIRT-OXF-WHT',
            'variant_name' => 'White / Regular',
            'cost_price' => 400.00,
            'selling_price' => 1000.00,
            'mrp' => 1000.00,
            'tax_rate' => 10.00, // 10% VAT
            'status' => 'ACTIVE',
        ]);

        // 4. Customer with Credit Limit
        $this->customer = Customer::create([
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'customer_code' => 'CUST-RECON-001',
            'name' => 'Corporate Client Rahman',
            'mobile' => '+8801700000001',
            'email' => 'rahman@client.corp',
            'credit_limit' => 20000.00,
            'opening_balance' => 0.00,
            'status' => 'ACTIVE',
            'created_by' => $this->user->id,
        ]);

        // 5. Fiscal Year & Accounting Setup
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

        // Mappings
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_ACCOUNTS_RECEIVABLE, $this->arAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_SALES_REVENUE, $this->salesRevenueAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_VAT_PAYABLE, $this->vatPayableAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_COGS, $this->cogsAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_INVENTORY_ASSET, $this->inventoryAssetAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_CASH_BANK, $this->cashBankAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_ACCOUNTS_PAYABLE, $this->apAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_AP_CLEARING, $this->apAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_INVENTORY_ADJUSTMENT, $this->cogsAccount->id);
        $this->mappingService->setAccountingEnabled($this->company->id, true);

        // 6. Seed Initial Stock: 50 units @ 400.00 cost
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
     * Test 1: Full End-to-End Sales Lifecycle:
     * Customer -> POS Sale (Credit) -> Inventory Out -> Moving Average COGS ->
     * Revenue & VAT GL -> AR GL -> Customer Ledger -> Customer Payment ->
     * Payment Allocation -> Customer Ledger Settlement -> Balance Reconciliation
     */
    public function test_full_sales_reconciliation_lifecycle_credit_sale_to_settlement()
    {
        // 1. Complete Sale: 5 units @ 1000 = 5000 subtotal + 10% VAT (500) = 5500 grand total
        // Customer pays 1500 CASH tender at checkout. Remaining due = 4000
        $saleData = [
            'pos_session_id' => $this->session->id,
            'customer_id' => $this->customer->id,
            'cashier_id' => $this->user->id,
            'sale_date' => date('Y-m-d'),
            'idempotency_key' => 'SALE-RECON-E2E-001',
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 5,
                    'unit_price' => 1000.00,
                    'discount_amount' => 0.00,
                    'tax_rate' => 10.00,
                ]
            ],
            'payments' => [
                [
                    'method' => 'CASH',
                    'amount' => 1500.00,
                ]
            ]
        ];

        $sale = $this->salesService->completeSale($this->company->id, $saleData);

        // A. Assert Sale document
        $this->assertEquals('COMPLETED', $sale->status);
        $this->assertEquals(5000.00, (float) $sale->subtotal);
        $this->assertEquals(500.00, (float) $sale->tax_total);
        $this->assertEquals(5500.00, (float) $sale->grand_total);
        $this->assertEquals(1500.00, (float) $sale->paid_amount);
        $this->assertEquals(4000.00, (float) $sale->due_amount);
        $this->assertEquals('PARTIAL', $sale->payment_status);

        // B. Assert Inventory Stock-Out & Moving Average
        $inventory = \App\Models\Inventory::where('company_id', $this->company->id)
            ->where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant->id)
            ->first();
        $this->assertNotNull($inventory);
        $this->assertEquals(45, (float) $inventory->quantity); // 50 - 5 = 45
        $this->assertEquals(400.00, (float) $inventory->average_cost);

        $stockMovement = StockMovement::where('company_id', $this->company->id)
            ->where('reference_type', 'SALE')
            ->where('reference_id', $sale->id)
            ->first();
        $this->assertNotNull($stockMovement);
        $this->assertEquals('STOCK_OUT', $stockMovement->movement_type);
        $this->assertEquals(5, (float) $stockMovement->quantity);
        $this->assertEquals(50, (float) $stockMovement->quantity_before);
        $this->assertEquals(45, (float) $stockMovement->quantity_after);
        $this->assertEquals(400.00, (float) $stockMovement->unit_cost);
        $this->assertEquals(2000.00, (float) $stockMovement->total_cost);

        // C. Assert Balanced General Ledger Journals
        // Journal 1: Sale Invoice (DR AR 5500 / CR Sales Revenue 5000 / CR VAT Payable 500)
        $invoiceJournal = JournalEntry::where('company_id', $this->company->id)
            ->where('reference_type', 'Sale')
            ->where('reference_id', $sale->id)
            ->where('idempotency_key', "SALE-INV-{$sale->id}")
            ->with('lines')
            ->first();
        $this->assertNotNull($invoiceJournal);
        $this->assertEquals(5500.00, (float) $invoiceJournal->lines->sum('debit'));
        $this->assertEquals(5500.00, (float) $invoiceJournal->lines->sum('credit'));

        $arDebit = $invoiceJournal->lines->where('account_id', $this->arAccount->id)->first();
        $this->assertNotNull($arDebit);
        $this->assertEquals(5500.00, (float) $arDebit->debit);

        $revCredit = $invoiceJournal->lines->where('account_id', $this->salesRevenueAccount->id)->first();
        $this->assertNotNull($revCredit);
        $this->assertEquals(5000.00, (float) $revCredit->credit);

        $vatCredit = $invoiceJournal->lines->where('account_id', $this->vatPayableAccount->id)->first();
        $this->assertNotNull($vatCredit);
        $this->assertEquals(500.00, (float) $vatCredit->credit);

        // Journal 2: Sale COGS (DR COGS 2000 / CR Inventory Asset 2000)
        $cogsJournal = JournalEntry::where('company_id', $this->company->id)
            ->where('reference_type', 'Sale')
            ->where('reference_id', $sale->id)
            ->where('idempotency_key', "SALE-COGS-{$sale->id}")
            ->with('lines')
            ->first();
        $this->assertNotNull($cogsJournal);
        $this->assertEquals(2000.00, (float) $cogsJournal->lines->sum('debit'));
        $this->assertEquals(2000.00, (float) $cogsJournal->lines->sum('credit'));

        $cogsLine = $cogsJournal->lines->where('account_id', $this->cogsAccount->id)->first();
        $this->assertEquals(2000.00, (float) $cogsLine->debit);
        $assetLine = $cogsJournal->lines->where('account_id', $this->inventoryAssetAccount->id)->first();
        $this->assertEquals(2000.00, (float) $assetLine->credit);

        // Journal 3: Checkout Cash Payment (DR Cash 1500 / CR AR 1500)
        $checkoutPayment = Payment::where('company_id', $this->company->id)
            ->where('payment_type', 'CUSTOMER')
            ->where('amount', 1500.00)
            ->first();
        $this->assertNotNull($checkoutPayment);

        $payJournal = JournalEntry::where('company_id', $this->company->id)
            ->where('reference_type', 'Payment')
            ->where('reference_id', $checkoutPayment->id)
            ->with('lines')
            ->first();
        $this->assertNotNull($payJournal);
        $this->assertEquals(1500.00, (float) $payJournal->lines->sum('debit'));
        $this->assertEquals(1500.00, (float) $payJournal->lines->sum('credit'));

        // D. Assert Customer Ledger for Due Balance
        $ledgers = CustomerLedger::where('company_id', $this->company->id)
            ->where('customer_id', $this->customer->id)
            ->get();
        $this->assertCount(1, $ledgers);
        $saleLedger = $ledgers->first();
        $this->assertEquals('SALE', $saleLedger->transaction_type);
        $this->assertEquals(4000.00, (float) $saleLedger->debit);
        $this->assertEquals(0.00, (float) $saleLedger->credit);
        $this->assertEquals(4000.00, (float) $saleLedger->balance_after);

        // E. Assert Customer Balance API
        $this->actingAs($this->user);
        $balRes = $this->withHeaders(['X-Company-ID' => $this->company->id])
            ->getJson("/api/v1/customers/{$this->customer->id}/balance");
        $balRes->assertStatus(200);
        $balRes->assertJson([
            'success' => true,
            'data' => [
                'customer_id' => $this->customer->id,
                'total_sales' => 5500.00,
                'total_paid' => 1500.00,
                'balance' => 4000.00,
            ]
        ]);

        // F. Assert Customer Receivables Report API
        $recRes = $this->withHeaders(['X-Company-ID' => $this->company->id])
            ->getJson('/api/v1/reports/customer-receivables');
        $recRes->assertStatus(200);
        $recRes->assertJson([
            'success' => true,
            'summary' => [
                'total_receivables' => 4000.00,
            ]
        ]);

        // G. Assert Sales Report API
        $salesReportRes = $this->withHeaders(['X-Company-ID' => $this->company->id])
            ->getJson('/api/v1/reports/sales');
        $salesReportRes->assertStatus(200);
        $salesReportRes->assertJson([
            'success' => true,
            'summary' => [
                'total_sales' => 1,
                'total_gross_sales' => 5500.00,
                'total_subtotal' => 5000.00,
                'total_net_sales' => 5000.00,
                'total_tax' => 500.00,
                'total_paid' => 1500.00,
                'total_due' => 4000.00,
            ]
        ]);

        // =====================================================================
        // PART 2: Post-Checkout Settlement Payment (4000.00)
        // =====================================================================
        $settlementPayment = $this->paymentService->createPayment($this->company->id, [
            'amount' => 4000.00,
            'payment_type' => 'CUSTOMER',
            'payment_method' => 'BANK',
            'branch_id' => $this->branch->id,
            'payment_date' => date('Y-m-d'),
            'idempotency_key' => 'SETTLE-PAY-4000',
        ], $this->user->id);

        $this->assertEquals(4000.00, (float) $settlementPayment->amount);

        // Assert Settlement Payment GL Journal (DR Bank 4000 / CR AR 4000)
        $settleJournal = JournalEntry::where('company_id', $this->company->id)
            ->where('reference_type', 'Payment')
            ->where('reference_id', $settlementPayment->id)
            ->with('lines')
            ->first();
        $this->assertNotNull($settleJournal);
        $this->assertEquals(4000.00, (float) $settleJournal->lines->sum('debit'));
        $this->assertEquals(4000.00, (float) $settleJournal->lines->sum('credit'));

        // Allocate settlement payment to the Sale
        $allocations = $this->paymentService->allocatePayment($this->company->id, $settlementPayment->id, [
            [
                'allocatable_type' => 'Sale',
                'allocatable_id' => $sale->id,
                'amount' => 4000.00,
            ]
        ], $this->user->id);

        $this->assertCount(1, $allocations);

        // Assert Sale is now fully PAID
        $sale->refresh();
        $this->assertEquals(5500.00, (float) $sale->paid_amount);
        $this->assertEquals(0.00, (float) $sale->due_amount);
        $this->assertEquals('PAID', $sale->payment_status);

        // Assert Customer Ledger updated with PAYMENT credit of 4000
        $ledgersAfter = CustomerLedger::where('company_id', $this->company->id)
            ->where('customer_id', $this->customer->id)
            ->orderBy('id', 'asc')
            ->get();
        $this->assertCount(2, $ledgersAfter);
        $settleLedger = $ledgersAfter->last();
        $this->assertEquals('PAYMENT', $settleLedger->transaction_type);
        $this->assertEquals(0.00, (float) $settleLedger->debit);
        $this->assertEquals(4000.00, (float) $settleLedger->credit);
        $this->assertEquals(0.00, (float) $settleLedger->balance_after);

        // Assert Customer Balance API reports 0 balance
        $balResFinal = $this->withHeaders(['X-Company-ID' => $this->company->id])
            ->getJson("/api/v1/customers/{$this->customer->id}/balance");
        $balResFinal->assertStatus(200);
        $balResFinal->assertJson([
            'success' => true,
            'data' => [
                'customer_id' => $this->customer->id,
                'total_sales' => 5500.00,
                'total_paid' => 5500.00,
                'balance' => 0.00,
            ]
        ]);

        // Assert Receivables report reports 0 total_receivables
        $recResFinal = $this->withHeaders(['X-Company-ID' => $this->company->id])
            ->getJson('/api/v1/reports/customer-receivables');
        $recResFinal->assertStatus(200);
        $recResFinal->assertJson([
            'success' => true,
            'summary' => [
                'total_receivables' => 0.00,
            ]
        ]);

        // Assert Sales Report reports 0 total_due
        $salesReportResFinal = $this->withHeaders(['X-Company-ID' => $this->company->id])
            ->getJson('/api/v1/reports/sales');
        $salesReportResFinal->assertStatus(200);
        $salesReportResFinal->assertJson([
            'success' => true,
            'summary' => [
                'total_gross_sales' => 5500.00,
                'total_paid' => 5500.00,
                'total_due' => 0.00,
            ]
        ]);

        // =====================================================================
        // PART 3: Mathematical Reconciliation
        // =====================================================================
        // Total DR AR posted = 5500.00 (from invoice)
        // Total CR AR posted = 1500.00 (checkout) + 4000.00 (settlement) = 5500.00
        // Net AR in General Ledger = 0.00!
        $arJournalLines = \App\Models\JournalEntryLine::where('account_id', $this->arAccount->id)->get();
        $totalArDebits = (float) $arJournalLines->sum('debit');
        $totalArCredits = (float) $arJournalLines->sum('credit');
        $this->assertEquals(5500.00, $totalArDebits);
        $this->assertEquals(5500.00, $totalArCredits);
        $this->assertEquals(0.00, round($totalArDebits - $totalArCredits, 4));

        // Customer Ledger Balance = 0.00!
        $currentCustomerBalance = $this->customerLedgerService->postTransaction(
            $this->company->id,
            $this->customer->id,
            'ADJUSTMENT',
            0,
            0,
            date('Y-m-d'),
            null,
            null,
            null,
            'Zero adjustment probe'
        )->balance_after;
        $this->assertEquals(0.00, (float) $currentCustomerBalance);
    }

    /**
     * Test 2: Cash overpayment change calculation:
     * Handed 2000 cash for 1100 grand total -> paid_amount = 1100, change = 900, due = 0.
     */
    public function test_cash_overpayment_change_calculation_reconciliation()
    {
        $saleData = [
            'pos_session_id' => $this->session->id,
            'customer_id' => $this->customer->id,
            'cashier_id' => $this->user->id,
            'sale_date' => date('Y-m-d'),
            'idempotency_key' => 'SALE-CHANGE-001',
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 1,
                    'unit_price' => 1000.00,
                    'tax_rate' => 10.00, // 100 VAT -> 1100 total
                ]
            ],
            'payments' => [
                [
                    'method' => 'CASH',
                    'amount' => 2000.00, // Customer handed 2000 tk note
                ]
            ]
        ];

        $sale = $this->salesService->completeSale($this->company->id, $saleData);

        // Paid amount must record exactly 1100 (tender capped at grand total)
        $this->assertEquals(1100.00, (float) $sale->grand_total);
        $this->assertEquals(1100.00, (float) $sale->paid_amount);
        $this->assertEquals(0.00, (float) $sale->due_amount);
        $this->assertEquals('PAID', $sale->payment_status);

        // No due ledger entry created
        $ledgerCount = CustomerLedger::where('company_id', $this->company->id)
            ->where('customer_id', $this->customer->id)
            ->count();
        $this->assertEquals(0, $ledgerCount);
    }

    /**
     * Test 3: Split payment overpayment is strictly rejected with 409 Conflict.
     */
    public function test_split_digital_overpayment_is_rejected()
    {
        $this->expectException(ConflictHttpException::class);

        $saleData = [
            'pos_session_id' => $this->session->id,
            'customer_id' => $this->customer->id,
            'cashier_id' => $this->user->id,
            'sale_date' => date('Y-m-d'),
            'idempotency_key' => 'SALE-OVERPAY-SPLIT-001',
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 1,
                    'unit_price' => 1000.00,
                    'tax_rate' => 10.00, // 1100 total
                ]
            ],
            'payments' => [
                [
                    'method' => 'CASH',
                    'amount' => 600.00,
                ],
                [
                    'method' => 'CARD',
                    'amount' => 600.00, // Total 1200 > 1100
                ]
            ]
        ];

        $this->salesService->completeSale($this->company->id, $saleData);
    }

    /**
     * Test 4: Insufficient stock sale is rejected with exception.
     */
    public function test_insufficient_stock_sale_is_rejected()
    {
        $this->expectException(\Exception::class);

        $saleData = [
            'pos_session_id' => $this->session->id,
            'customer_id' => $this->customer->id,
            'cashier_id' => $this->user->id,
            'sale_date' => date('Y-m-d'),
            'idempotency_key' => 'SALE-NO-STOCK-001',
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 9999, // Way higher than 50 available
                    'unit_price' => 1000.00,
                    'tax_rate' => 10.00,
                ]
            ],
            'payments' => [
                [
                    'method' => 'CASH',
                    'amount' => 1000.00,
                ]
            ]
        ];

        $this->salesService->completeSale($this->company->id, $saleData);
    }

    /**
     * Test 5: Over-allocation to Sale is rejected with 409 Conflict.
     */
    public function test_over_allocation_to_sale_is_rejected()
    {
        // Credit sale for 1100.00
        $saleData = [
            'pos_session_id' => $this->session->id,
            'customer_id' => $this->customer->id,
            'cashier_id' => $this->user->id,
            'sale_date' => date('Y-m-d'),
            'idempotency_key' => 'SALE-OVER-ALLOC-001',
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 1,
                    'unit_price' => 1000.00,
                    'tax_rate' => 10.00,
                ]
            ],
            'payments' => [] // 0 payment, 1100 due
        ];

        $sale = $this->salesService->completeSale($this->company->id, $saleData);

        $payment = $this->paymentService->createPayment($this->company->id, [
            'amount' => 1500.00,
            'payment_type' => 'CUSTOMER',
            'payment_method' => 'CASH',
            'idempotency_key' => 'PAY-OVER-ALLOC-TEST',
        ], $this->user->id);

        $this->expectException(ConflictHttpException::class);

        // Attempt to allocate 1200 to 1100 outstanding balance
        $this->paymentService->allocatePayment($this->company->id, $payment->id, [
            [
                'allocatable_type' => 'Sale',
                'allocatable_id' => $sale->id,
                'amount' => 1200.00,
            ]
        ], $this->user->id);
    }

    /**
     * Test 6: Cross-Company Tenant Isolation:
     * Accessing another company's customer balance, sales report, or receivables returns 404 or empty.
     */
    public function test_cross_company_tenant_isolation_sales_reconciliation()
    {
        $companyB = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Competitor Corp B',
            'code' => 'COMP-B',
            'country' => 'Bangladesh',
        ]);

        $userB = User::factory()->create();
        $userB->companies()->attach($companyB->id);

        $this->actingAs($userB);

        // 1. User B accessing Company A's customer balance returns 404
        $resBal = $this->withHeaders(['X-Company-ID' => $companyB->id])
            ->getJson("/api/v1/customers/{$this->customer->id}/balance");
        $resBal->assertStatus(404);

        // 2. User B receivables report is completely empty
        $resRec = $this->withHeaders(['X-Company-ID' => $companyB->id])
            ->getJson('/api/v1/reports/customer-receivables');
        $resRec->assertStatus(200);
        $resRec->assertJson([
            'success' => true,
            'data' => [],
            'summary' => [
                'total_receivables' => 0.00,
            ]
        ]);

        // 3. User B sales report is completely empty
        $resSales = $this->withHeaders(['X-Company-ID' => $companyB->id])
            ->getJson('/api/v1/reports/sales');
        $resSales->assertStatus(200);
        $resSales->assertJson([
            'success' => true,
            'data' => [],
            'summary' => [
                'total_sales' => 0,
                'total_gross_sales' => 0.00,
                'total_paid' => 0.00,
                'total_due' => 0.00,
            ]
        ]);
    }
}
