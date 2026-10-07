<?php

namespace Tests\Feature\Tax;

use App\Models\Account;
use App\Models\AccountingPeriod;
use App\Models\Company;
use App\Models\FiscalYear;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\PaymentMethod;
use App\Models\Purchase;
use App\Models\Role;
use App\Models\Sale;
use App\Models\Supplier;
use App\Models\TaxAdjustment;
use App\Models\TaxCategory;
use App\Models\TaxPeriod;
use App\Models\TaxReconciliation;
use App\Models\TaxRule;
use App\Models\TaxTransaction;
use App\Models\User;
use App\Services\AccountMappingService;
use App\Services\TaxAdjustmentService;
use App\Services\TaxPeriodService;
use App\Services\TaxPostingService;
use App\Services\TaxReconciliationService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaxPeriodAndReconciliationTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Company $company;
    protected TaxPeriod $period;

    protected Account $outputVatAccount;
    protected Account $inputVatAccount;
    protected Account $cashAccount;
    protected Account $taxAdjustmentAccount;
    protected PaymentMethod $paymentMethod;

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

        $this->period = TaxPeriod::create([
            'company_id' => $this->company->id,
            'period_name' => 'October 2026',
            'period_start' => '2026-10-01',
            'period_end' => '2026-10-31',
            'status' => 'OPEN',
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

        $this->cashAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '1010',
            'account_name' => 'Sonali Bank (Treasury Account)',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->taxAdjustmentAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '5090',
            'account_name' => 'Tax & VAT Adjustments',
            'account_type' => 'EXPENSE',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->paymentMethod = PaymentMethod::create([
            'company_id' => $this->company->id,
            'name' => 'Treasury Challan / e-Challan',
            'code' => 'TREASURY_CHALLAN',
            'type' => 'BANK_TRANSFER',
            'is_active' => true,
            'account_id' => $this->cashAccount->id,
        ]);

        $this->arAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '1020',
            'account_name' => 'Accounts Receivable',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->apAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '2010',
            'account_name' => 'Accounts Payable',
            'account_type' => 'LIABILITY',
            'normal_balance' => 'CREDIT',
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

        $this->inventoryAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '1030',
            'account_name' => 'Inventory Asset',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $mappingService = app(AccountMappingService::class);
        $mappingService->setMapping($this->company->id, AccountMappingService::ROLE_OUTPUT_VAT_PAYABLE, $this->outputVatAccount->id);
        $mappingService->setMapping($this->company->id, AccountMappingService::ROLE_INPUT_VAT_RECEIVABLE, $this->inputVatAccount->id);
        $mappingService->setMapping($this->company->id, AccountMappingService::ROLE_CASH_BANK, $this->cashAccount->id);
        $mappingService->setMapping($this->company->id, AccountMappingService::ROLE_TAX_ADJUSTMENT, $this->taxAdjustmentAccount->id);
        $mappingService->setMapping($this->company->id, AccountMappingService::ROLE_ACCOUNTS_RECEIVABLE, $this->arAccount->id);
        $mappingService->setMapping($this->company->id, AccountMappingService::ROLE_ACCOUNTS_PAYABLE, $this->apAccount->id);
        $mappingService->setMapping($this->company->id, AccountMappingService::ROLE_SALES_REVENUE, $this->salesAccount->id);
        $mappingService->setMapping($this->company->id, AccountMappingService::ROLE_INVENTORY_ASSET, $this->inventoryAccount->id);
        $mappingService->setAccountingEnabled($this->company->id, true);
    }

    public function test_tax_period_lifecycle_and_closed_period_locking_guard()
    {
        $periodService = app(TaxPeriodService::class);

        // 1. Lock period (OPEN -> FINALIZED/UNDER_REVIEW)
        $locked = $periodService->lockPeriod($this->company->id, $this->period->id, $this->user->id);
        $this->assertEquals('FINALIZED', $locked->status);
        $this->assertNotNull($locked->locked_at);

        // 2. File period (FINALIZED -> FILED)
        $filed = $periodService->filePeriod($this->company->id, $this->period->id, 'NBR-MUSHAK-REF-202610', $this->user->id);
        $this->assertEquals('FILED', $filed->status);
        $this->assertEquals('NBR-MUSHAK-REF-202610', $filed->filing_reference);

        // 3. Close period (FILED -> CLOSED)
        $closed = $periodService->closePeriod($this->company->id, $this->period->id, $this->user->id);
        $this->assertEquals('CLOSED', $closed->status);

        // 4. Assert locking guard prevents posting into CLOSED period
        $postingService = app(TaxPostingService::class);

        $sale = Sale::create([
            'company_id' => $this->company->id,
            'cashier_id' => $this->user->id,
            'invoice_number' => 'BLOCKED-INV-01',
            'sale_date' => '2026-10-15',
            'subtotal' => 1000.0,
            'tax_total' => 150.0,
            'grand_total' => 1150.0,
            'status' => 'COMPLETED',
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessageMatches('/Tax period is closed or locked/i');

        $postingService->postSaleTax($this->company->id, $sale, [
            'taxable_amount' => 1000.0,
            'tax_amount' => 150.0,
            'total_tax_amount' => 150.0,
        ], $this->period->id, $this->user->id);
    }

    public function test_tax_adjustments_workflow_and_gl_posting()
    {
        $adjustmentService = app(TaxAdjustmentService::class);

        // 1. Create Draft Adjustment (Output VAT Increase)
        $adj = $adjustmentService->createAdjustment($this->company->id, [
            'tax_period_id' => $this->period->id,
            'adjustment_type' => 'OUTPUT_VAT_INCREASE',
            'reason' => 'Debit Note received from audit under Section 46',
            'amount' => 1000.0,
            'tax_amount' => 150.0,
            'legal_reference' => 'Audit Debit Note #AD-01',
        ], $this->user->id);

        $this->assertEquals('DRAFT', $adj->status);
        $this->assertEquals(150.0, (float) $adj->tax_amount);

        // 2. Approve
        $approved = $adjustmentService->approveAdjustment($this->company->id, $adj->id, $this->user->id);
        $this->assertEquals('APPROVED', $approved->status);

        // 3. Post to GL
        $posted = $adjustmentService->postAdjustment($this->company->id, $adj->id, $this->user->id);
        $this->assertEquals('POSTED', $posted->status);
        $this->assertNotNull($posted->journal_entry_id);

        // Check subledger tax transaction created
        $this->assertDatabaseHas('tax_transactions', [
            'company_id' => $this->company->id,
            'transaction_type' => 'TAX_ADJUSTMENT',
            'tax_amount' => 150.0,
            'status' => 'POSTED',
        ]);

        // Check balanced journal entry
        $journal = JournalEntry::find($posted->journal_entry_id);
        $totalDebits = JournalEntryLine::where('journal_entry_id', $journal->id)->sum('debit');
        $totalCredits = JournalEntryLine::where('journal_entry_id', $journal->id)->sum('credit');

        $this->assertEquals(150.0, (float) $totalDebits);
        $this->assertEquals(150.0, (float) $totalCredits);
    }

    public function test_reconciliation_detects_subledger_and_gl_discrepancies()
    {
        $postingService = app(TaxPostingService::class);
        $reconService = app(TaxReconciliationService::class);

        // Post a valid sale tax (Output VAT: 300)
        $sale = Sale::create([
            'company_id' => $this->company->id,
            'cashier_id' => $this->user->id,
            'invoice_number' => 'INV-REC-01',
            'sale_date' => '2026-10-10',
            'subtotal' => 2000.0,
            'tax_total' => 300.0,
            'grand_total' => 2300.0,
            'status' => 'COMPLETED',
        ]);
        $postingService->postSaleTax($this->company->id, $sale, [
            'taxable_amount' => 2000.0,
            'tax_amount' => 300.0,
            'total_tax_amount' => 300.0,
        ], $this->period->id, $this->user->id);

        // Post a valid purchase tax (Input VAT: 100)
        $supplier = Supplier::create([
            'company_id' => $this->company->id,
            'supplier_code' => 'SUP-REC-01',
            'name' => 'Recon Test Supplier',
            'status' => 'ACTIVE',
        ]);

        $purchase = Purchase::create([
            'company_id' => $this->company->id,
            'supplier_id' => $supplier->id,
            'supplier_invoice_number' => 'BILL-REC-01',
            'invoice_date' => '2026-10-11',
            'subtotal' => 666.67,
            'tax_total' => 100.0,
            'grand_total' => 766.67,
            'status' => 'POSTED',
        ]);
        $postingService->postPurchaseTax($this->company->id, $purchase, [
            'taxable_amount' => 666.67,
            'tax_amount' => 100.0,
            'total_tax_amount' => 100.0,
        ], $this->period->id, $this->user->id);

        // 1. Run initial reconciliation -> Should be perfectly matched
        $cleanRecon = $reconService->reconcilePeriod($this->company->id, $this->period->id, $this->user->id);
        $this->assertEquals('RECONCILED', $cleanRecon->status);
        $this->assertEquals(300.0, (float) $cleanRecon->output_vat_subledger);
        $this->assertEquals(300.0, (float) $cleanRecon->output_vat_gl);
        $this->assertEquals(0.0, (float) $cleanRecon->output_vat_difference);
        $this->assertEquals(100.0, (float) $cleanRecon->input_vat_subledger);
        $this->assertEquals(100.0, (float) $cleanRecon->input_vat_gl);
        $this->assertEquals(0.0, (float) $cleanRecon->input_vat_difference);
        $this->assertEquals(200.0, (float) $cleanRecon->net_tax_payable); // 300 - 100
        $this->assertEmpty($cleanRecon->exceptions);

        // 2. Inject deliberate manual GL variance without subledger entry
        $accountingPeriod = AccountingPeriod::where('company_id', $this->company->id)->first();
        $rogueJournal = JournalEntry::create([
            'company_id' => $this->company->id,
            'accounting_period_id' => $accountingPeriod->id,
            'journal_number' => 'JE-ROGUE-99',
            'journal_date' => '2026-10-15',
            'description' => 'Manual unlinked journal entry on VAT account',
            'status' => 'POSTED',
            'source_type' => 'MANUAL',
            'created_by' => $this->user->id,
            'posted_by' => $this->user->id,
            'posted_at' => Carbon::now(),
        ]);
        JournalEntryLine::create([
            'journal_entry_id' => $rogueJournal->id,
            'account_id' => $this->outputVatAccount->id,
            'debit' => 0.0,
            'credit' => 50.0,
            'description' => 'Unlinked output vat credit',
        ]);
        JournalEntryLine::create([
            'journal_entry_id' => $rogueJournal->id,
            'account_id' => $this->taxAdjustmentAccount->id,
            'debit' => 50.0,
            'credit' => 0.0,
            'description' => 'Offset',
        ]);

        // 3. Re-run reconciliation -> Must detect variance and log exception
        $discrepantRecon = $reconService->reconcilePeriod($this->company->id, $this->period->id, $this->user->id);
        $this->assertEquals('EXCEPTION', $discrepantRecon->status);
        $this->assertEquals(300.0, (float) $discrepantRecon->output_vat_subledger);
        $this->assertEquals(350.0, (float) $discrepantRecon->output_vat_gl);
        $this->assertEquals(-50.0, (float) $discrepantRecon->output_vat_difference);
        $this->assertNotEmpty($discrepantRecon->exceptions);
        $this->assertEquals('GL_OUTPUT_VAT_MISMATCH', $discrepantRecon->exceptions[0]['type']);
    }

    public function test_tax_settlement_creates_treasury_payment_journal_and_subledger_record()
    {
        $postingService = app(TaxPostingService::class);

        $settleTx = $postingService->settleTaxPayable(
            $this->company->id,
            $this->period->id,
            500.0,
            $this->paymentMethod->id,
            'CHALLAN-TR-998877',
            $this->user->id
        );

        $this->assertEquals('TAX_SETTLEMENT', $settleTx->transaction_type);
        $this->assertEquals(-500.0, (float) $settleTx->tax_amount);
        $this->assertEquals('CHALLAN-TR-998877', $settleTx->document_number);

        // Verify Journal Entry: Debit Output VAT Payable (reducing liability), Credit Cash/Bank
        $this->assertNotNull($settleTx->journal_entry_id);
        $journal = JournalEntry::find($settleTx->journal_entry_id);

        $this->assertDatabaseHas('journal_entry_lines', [
            'journal_entry_id' => $journal->id,
            'account_id' => $this->outputVatAccount->id,
            'debit' => 500.0,
            'credit' => 0.0,
        ]);

        $this->assertDatabaseHas('journal_entry_lines', [
            'journal_entry_id' => $journal->id,
            'account_id' => $this->cashAccount->id,
            'debit' => 0.0,
            'credit' => 500.0,
        ]);
    }
}
