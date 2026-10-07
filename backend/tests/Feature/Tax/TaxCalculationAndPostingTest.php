<?php

namespace Tests\Feature\Tax;

use App\Models\Account;
use App\Models\AccountingPeriod;
use App\Models\Company;
use App\Models\FiscalYear;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\Purchase;
use App\Models\Role;
use App\Models\Sale;
use App\Models\SalesReturn;
use App\Models\Supplier;
use App\Models\TaxCategory;
use App\Models\TaxPeriod;
use App\Models\TaxRule;
use App\Models\TaxTransaction;
use App\Models\User;
use App\Services\AccountMappingService;
use App\Services\TaxCalculationService;
use App\Services\TaxPostingService;
use App\Services\TaxRuleService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaxCalculationAndPostingTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Company $company;
    protected TaxPeriod $taxPeriod;
    protected TaxCategory $stdCategory;
    protected TaxRule $stdRule;

    protected Account $receivableAccount;
    protected Account $salesAccount;
    protected Account $outputVatAccount;
    protected Account $inputVatAccount;
    protected Account $payableAccount;
    protected Account $inventoryAccount;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
        $this->seed(\Database\Seeders\TaxPermissionsSeeder::class);

        $this->company = Company::factory()->create();

        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);
        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin']);
        $this->user->roles()->attach($superAdminRole->id);

        // Accounting Setup
        $fy = FiscalYear::create([
            'company_id' => $this->company->id,
            'name' => 'FY 2026',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'is_closed' => false,
        ]);

        AccountingPeriod::create([
            'company_id' => $this->company->id,
            'fiscal_year_id' => $fy->id,
            'period_number' => 10,
            'name' => 'October 2026',
            'start_date' => '2026-10-01',
            'end_date' => '2026-10-31',
            'status' => 'OPEN',
            'is_closed' => false,
        ]);

        // Tax Period
        $this->taxPeriod = TaxPeriod::create([
            'company_id' => $this->company->id,
            'period_name' => 'October 2026',
            'period_start' => '2026-10-01',
            'period_end' => '2026-10-31',
            'status' => 'OPEN',
        ]);

        // Accounts
        $this->receivableAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '1020',
            'account_name' => 'Accounts Receivable',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->salesAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '4010',
            'account_name' => 'Sales Revenue',
            'account_type' => 'REVENUE',
            'normal_balance' => 'CREDIT',
            'is_active' => true,
        ]);

        $this->outputVatAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '2040',
            'account_name' => 'Output VAT Payable',
            'account_type' => 'LIABILITY',
            'normal_balance' => 'CREDIT',
            'is_active' => true,
        ]);

        $this->inputVatAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '1060',
            'account_name' => 'Input VAT Receivable',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->payableAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '2010',
            'account_name' => 'Accounts Payable',
            'account_type' => 'LIABILITY',
            'normal_balance' => 'CREDIT',
            'is_active' => true,
        ]);

        $this->inventoryAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '1030',
            'account_name' => 'Merchandise Inventory',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        // Account Mappings
        $mappingService = app(AccountMappingService::class);
        $mappingService->setMapping($this->company->id, AccountMappingService::ROLE_ACCOUNTS_RECEIVABLE, $this->receivableAccount->id);
        $mappingService->setMapping($this->company->id, AccountMappingService::ROLE_SALES_REVENUE, $this->salesAccount->id);
        $mappingService->setMapping($this->company->id, AccountMappingService::ROLE_OUTPUT_VAT_PAYABLE, $this->outputVatAccount->id);
        $mappingService->setMapping($this->company->id, AccountMappingService::ROLE_INPUT_VAT_RECEIVABLE, $this->inputVatAccount->id);
        $mappingService->setMapping($this->company->id, AccountMappingService::ROLE_ACCOUNTS_PAYABLE, $this->payableAccount->id);
        $mappingService->setMapping($this->company->id, AccountMappingService::ROLE_INVENTORY_ASSET, $this->inventoryAccount->id);
        $mappingService->setAccountingEnabled($this->company->id, true);

        // Tax Category & Rule
        $this->stdCategory = TaxCategory::create([
            'company_id' => $this->company->id,
            'name' => 'Standard Goods',
            'code' => 'STANDARD_GOODS',
            'is_active' => true,
        ]);

        $ruleService = app(TaxRuleService::class);
        $this->stdRule = $ruleService->createRule($this->company->id, [
            'tax_category_id' => $this->stdCategory->id,
            'code' => 'VAT_15',
            'name' => 'Standard VAT 15%',
            'rate' => 15.0000,
            'calculation_method' => 'PERCENTAGE',
            'base_method' => 'NET_AMOUNT',
            'inclusive_allowed' => true,
            'exclusive_allowed' => true,
            'effective_from' => '2026-01-01',
            'status' => 'ACTIVE',
            'components' => [
                [
                    'code' => 'OUTPUT_VAT_15',
                    'name' => 'Standard Output VAT',
                    'type' => 'OUTPUT_VAT',
                    'rate' => 15.0000,
                    'sequence' => 1,
                ],
            ],
        ]);
    }

    public function test_pure_tax_calculation_math()
    {
        $calcService = app(TaxCalculationService::class);

        // 1. Exclusive Tax: Amount = 1000, Rate = 15% -> Base = 1000, Tax = 150, Gross = 1150
        $exRes = $calcService->calculateItemTax(
            $this->company->id,
            1000.0,
            $this->stdCategory->id,
            null,
            false,
            '2026-10-05'
        );

        $this->assertEquals(1000.0, $exRes['taxable_amount']);
        $this->assertEquals(150.0, $exRes['tax_amount']);
        $this->assertEquals(1150.0, $exRes['gross_amount']);

        // 2. Inclusive Tax: Gross = 1150, Rate = 15% -> Base = 1000, Tax = 150
        $incRes = $calcService->calculateItemTax(
            $this->company->id,
            1150.0,
            $this->stdCategory->id,
            null,
            true,
            '2026-10-05'
        );

        $this->assertEquals(1000.0, $incRes['taxable_amount']);
        $this->assertEquals(150.0, $incRes['tax_amount']);
        $this->assertEquals(1150.0, $incRes['gross_amount']);

        // 3. Supplementary Duty + VAT Compound Math
        $ruleService = app(TaxRuleService::class);
        $sdCat = TaxCategory::create([
            'company_id' => $this->company->id,
            'name' => 'Luxury Goods with SD',
            'code' => 'LUXURY_SD',
            'is_active' => true,
        ]);
        $ruleService->createRule($this->company->id, [
            'tax_category_id' => $sdCat->id,
            'code' => 'SD_10_VAT_15',
            'name' => 'SD 10% + VAT 15%',
            'rate' => 26.5000,
            'calculation_method' => 'COMPOUND_PERCENTAGE',
            'base_method' => 'PREVIOUS_COMPONENTS',
            'effective_from' => '2026-01-01',
            'status' => 'ACTIVE',
            'components' => [
                [
                    'code' => 'SD_10',
                    'name' => 'Supplementary Duty 10%',
                    'type' => 'SUPPLEMENTARY_DUTY',
                    'rate' => 10.0000,
                    'sequence' => 1,
                ],
                [
                    'code' => 'VAT_15',
                    'name' => 'VAT 15%',
                    'type' => 'OUTPUT_VAT',
                    'rate' => 15.0000,
                    'sequence' => 2,
                ],
            ],
        ]);

        $sdRes = $calcService->calculateItemTax(
            $this->company->id,
            1000.0,
            $sdCat->id,
            null,
            false,
            '2026-10-05'
        );

        $this->assertEquals(100.0, $sdRes['sd_amount']);
        $this->assertEquals(165.0, $sdRes['tax_amount']);
        $this->assertEquals(265.0, $sdRes['total_tax_amount']);
        $this->assertEquals(1265.0, $sdRes['gross_amount']);
    }

    public function test_sale_tax_posting_creates_subledger_and_balanced_gl()
    {
        $postingService = app(TaxPostingService::class);

        $sale = Sale::create([
            'company_id' => $this->company->id,
            'cashier_id' => $this->user->id,
            'invoice_number' => 'INV-2026-0001',
            'sale_date' => '2026-10-05',
            'subtotal' => 2000.0,
            'tax_total' => 300.0,
            'grand_total' => 2300.0,
            'status' => 'COMPLETED',
        ]);

        $taxCalculation = [
            'taxable_amount' => 2000.0,
            'tax_amount' => 300.0,
            'sd_amount' => 0.0,
            'at_amount' => 0.0,
            'total_tax_amount' => 300.0,
            'is_inclusive' => false,
            'tax_rule_id' => $this->stdRule->id,
            'components' => [
                [
                    'component_code' => 'OUTPUT_VAT_15',
                    'component_name' => 'Output VAT 15%',
                    'tax_type' => 'OUTPUT_VAT',
                    'rate' => 15.0,
                    'taxable_base' => 2000.0,
                    'tax_amount' => 300.0,
                ],
            ],
        ];

        $tx = $postingService->postSaleTax($this->company->id, $sale, $taxCalculation, $this->taxPeriod->id, $this->user->id);

        // 1. Verify Subledger
        $this->assertDatabaseHas('tax_transactions', [
            'id' => $tx->id,
            'company_id' => $this->company->id,
            'transaction_type' => 'SALE_OUTPUT',
            'taxable_amount' => 2000.0,
            'tax_amount' => 300.0,
            'status' => 'POSTED',
        ]);

        $this->assertDatabaseHas('tax_transaction_components', [
            'tax_transaction_id' => $tx->id,
            'tax_type' => 'OUTPUT_VAT',
            'tax_amount' => 300.0,
        ]);

        // 2. Verify Double-Entry Balanced GL Journal Entry
        $this->assertNotNull($tx->journal_entry_id);
        $journal = JournalEntry::find($tx->journal_entry_id);
        $this->assertNotNull($journal);

        $totalDebits = JournalEntryLine::where('journal_entry_id', $journal->id)->sum('debit');
        $totalCredits = JournalEntryLine::where('journal_entry_id', $journal->id)->sum('credit');

        $this->assertEquals(300.0, (float) $totalDebits);
        $this->assertEquals(300.0, (float) $totalCredits);
        $this->assertEquals($totalDebits, $totalCredits, 'Debits and Credits must balance exactly');

        // Verify Output VAT account credited
        $this->assertDatabaseHas('journal_entry_lines', [
            'journal_entry_id' => $journal->id,
            'account_id' => $this->outputVatAccount->id,
            'credit' => 300.0,
            'debit' => 0.0,
        ]);
    }

    public function test_purchase_tax_posting_creates_subledger_and_balanced_gl()
    {
        $postingService = app(TaxPostingService::class);

        $supplier = Supplier::create([
            'company_id' => $this->company->id,
            'supplier_code' => 'SUP-PRIME-01',
            'name' => 'Supplier Prime',
            'status' => 'ACTIVE',
        ]);

        $purchase = Purchase::create([
            'company_id' => $this->company->id,
            'supplier_id' => $supplier->id,
            'supplier_invoice_number' => 'BILL-2026-0005',
            'invoice_date' => '2026-10-06',
            'subtotal' => 1000.0,
            'tax_total' => 150.0,
            'grand_total' => 1150.0,
            'status' => 'POSTED',
        ]);

        $taxCalculation = [
            'taxable_amount' => 1000.0,
            'tax_amount' => 150.0,
            'sd_amount' => 0.0,
            'total_tax_amount' => 150.0,
            'tax_rule_id' => $this->stdRule->id,
            'components' => [
                [
                    'component_code' => 'INPUT_VAT_15',
                    'component_name' => 'Input VAT 15%',
                    'tax_type' => 'INPUT_VAT',
                    'rate' => 15.0,
                    'taxable_base' => 1000.0,
                    'tax_amount' => 150.0,
                ],
            ],
        ];

        $tx = $postingService->postPurchaseTax($this->company->id, $purchase, $taxCalculation, $this->taxPeriod->id, $this->user->id);

        $this->assertDatabaseHas('tax_transactions', [
            'id' => $tx->id,
            'transaction_type' => 'PURCHASE_INPUT',
            'taxable_amount' => 1000.0,
            'tax_amount' => 150.0,
            'status' => 'POSTED',
        ]);

        $journal = JournalEntry::find($tx->journal_entry_id);
        $totalDebits = JournalEntryLine::where('journal_entry_id', $journal->id)->sum('debit');
        $totalCredits = JournalEntryLine::where('journal_entry_id', $journal->id)->sum('credit');

        $this->assertEquals(150.0, (float) $totalDebits);
        $this->assertEquals(150.0, (float) $totalCredits);

        // Verify Input VAT account debited
        $this->assertDatabaseHas('journal_entry_lines', [
            'journal_entry_id' => $journal->id,
            'account_id' => $this->inputVatAccount->id,
            'debit' => 150.0,
            'credit' => 0.0,
        ]);
    }

    public function test_sale_return_vat_reversal_reduces_vat_liability()
    {
        $postingService = app(TaxPostingService::class);

        $sale = Sale::create([
            'company_id' => $this->company->id,
            'cashier_id' => $this->user->id,
            'invoice_number' => 'INV-FOR-RET',
            'sale_date' => '2026-10-06',
            'subtotal' => 1000.0,
            'tax_total' => 150.0,
            'grand_total' => 1150.0,
            'status' => 'COMPLETED',
        ]);

        $salesReturn = SalesReturn::create([
            'company_id' => $this->company->id,
            'original_sale_id' => $sale->id,
            'return_type' => 'REFUND',
            'return_number' => 'RET-2026-0001',
            'return_date' => '2026-10-07',
            'subtotal' => 500.0,
            'tax' => 75.0,
            'refund_total' => 575.0,
            'status' => 'COMPLETED',
        ]);

        $taxCalculation = [
            'taxable_amount' => 500.0,
            'tax_amount' => 75.0,
            'total_tax_amount' => 75.0,
            'tax_rule_id' => $this->stdRule->id,
        ];

        $tx = $postingService->postSalesReturnTax($this->company->id, $salesReturn, $taxCalculation, $this->taxPeriod->id, $this->user->id);

        $this->assertDatabaseHas('tax_transactions', [
            'id' => $tx->id,
            'transaction_type' => 'SALE_RETURN_REVERSAL',
            'tax_amount' => 75.0,
        ]);
    }

    public function test_idempotent_tax_posting_prevents_duplicate_entries()
    {
        $postingService = app(TaxPostingService::class);

        $sale = Sale::create([
            'company_id' => $this->company->id,
            'cashier_id' => $this->user->id,
            'invoice_number' => 'INV-2026-IDEMP',
            'sale_date' => '2026-10-05',
            'subtotal' => 1000.0,
            'tax_total' => 150.0,
            'grand_total' => 1150.0,
            'status' => 'COMPLETED',
        ]);

        $taxCalculation = [
            'taxable_amount' => 1000.0,
            'tax_amount' => 150.0,
            'sd_amount' => 0.0,
            'total_tax_amount' => 150.0,
            'tax_rule_id' => $this->stdRule->id,
        ];

        // First call
        $tx1 = $postingService->postSaleTax($this->company->id, $sale, $taxCalculation, $this->taxPeriod->id, $this->user->id);
        $journalCount1 = JournalEntry::count();

        // Second call with same Sale
        $tx2 = $postingService->postSaleTax($this->company->id, $sale, $taxCalculation, $this->taxPeriod->id, $this->user->id);
        $journalCount2 = JournalEntry::count();

        $this->assertEquals($tx1->id, $tx2->id);
        $this->assertEquals($journalCount1, $journalCount2, 'Idempotency must not create duplicate journal entries');
        $this->assertEquals(1, TaxTransaction::where('source_type', Sale::class)->where('source_id', $sale->id)->count());
    }
}
