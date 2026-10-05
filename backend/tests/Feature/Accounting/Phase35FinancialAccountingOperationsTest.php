<?php

namespace Tests\Feature\Accounting;

use App\Models\Account;
use App\Models\AccountGroup;
use App\Models\AccountingPeriod;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\FiscalYear;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\Role;
use App\Models\User;
use App\Services\AccountingService;
use App\Services\AccountMappingService;
use App\Services\ExpenseService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class Phase35FinancialAccountingOperationsTest extends TestCase
{
    use RefreshDatabase;

    protected Company $company;
    protected User $user;
    protected FiscalYear $fiscalYear;
    protected AccountingPeriod $accountingPeriod;

    protected Account $cashAccount;
    protected Account $bankAccount;
    protected Account $arAccount;
    protected Account $apAccount;
    protected Account $vatAccount;
    protected Account $inventoryAccount;
    protected Account $equityAccount;
    protected Account $revenueAccount;
    protected Account $cogsAccount;
    protected Account $rentExpenseAccount;

    protected AccountMappingService $mappingService;
    protected AccountingService $accountingService;
    protected ExpenseService $expenseService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->mappingService = app(AccountMappingService::class);
        $this->accountingService = app(AccountingService::class);
        $this->expenseService = app(ExpenseService::class);

        // 1. Company and User Setup
        $this->company = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'RetailCore Phase 3.5 Test Corp',
            'code' => 'P35-' . Str::random(5),
            'country' => 'Bangladesh',
        ]);

        $role = Role::create([
            'name' => 'Super Admin',
            'company_id' => $this->company->id,
        ]);

        $this->user = User::factory()->create();
        $this->user->roles()->attach($role->id);
        $this->user->companies()->attach($this->company->id);

        // 2. Fiscal Year & Open Accounting Period
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

        // 3. Account Groups
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

        $grpEquity = AccountGroup::create([
            'company_id' => $this->company->id,
            'name' => 'Equity',
            'code' => '3000',
            'account_type' => 'EQUITY',
        ]);

        $grpRev = AccountGroup::create([
            'company_id' => $this->company->id,
            'name' => 'Operating Revenue',
            'code' => '4000',
            'account_type' => 'REVENUE',
        ]);

        $grpExp = AccountGroup::create([
            'company_id' => $this->company->id,
            'name' => 'Operating Expenses',
            'code' => '5000',
            'account_type' => 'EXPENSE',
        ]);

        // 4. Chart of Accounts
        $this->cashAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpAsset->id,
            'account_code' => '1010',
            'account_name' => 'Cash on Hand',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_system' => true,
            'is_active' => true,
        ]);

        $this->bankAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpAsset->id,
            'account_code' => '1020',
            'account_name' => 'Main Operating Bank',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_system' => false,
            'is_active' => true,
        ]);

        $this->arAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpAsset->id,
            'account_code' => '1200',
            'account_name' => 'Accounts Receivable',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_system' => true,
            'is_active' => true,
        ]);

        $this->inventoryAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpAsset->id,
            'account_code' => '1500',
            'account_name' => 'Merchandise Inventory',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_system' => true,
            'is_active' => true,
        ]);

        $this->apAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpLiab->id,
            'account_code' => '2000',
            'account_name' => 'Accounts Payable',
            'account_type' => 'LIABILITY',
            'normal_balance' => 'CREDIT',
            'is_system' => true,
            'is_active' => true,
        ]);

        $this->vatAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpLiab->id,
            'account_code' => '2100',
            'account_name' => 'VAT Payable',
            'account_type' => 'LIABILITY',
            'normal_balance' => 'CREDIT',
            'is_system' => true,
            'is_active' => true,
        ]);

        $this->equityAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpEquity->id,
            'account_code' => '3000',
            'account_name' => 'Retained Earnings',
            'account_type' => 'EQUITY',
            'normal_balance' => 'CREDIT',
            'is_system' => true,
            'is_active' => true,
        ]);

        $this->revenueAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpRev->id,
            'account_code' => '4000',
            'account_name' => 'Sales Revenue',
            'account_type' => 'REVENUE',
            'normal_balance' => 'CREDIT',
            'is_system' => true,
            'is_active' => true,
        ]);

        $this->cogsAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpExp->id,
            'account_code' => '5000',
            'account_name' => 'Cost of Goods Sold',
            'account_type' => 'EXPENSE',
            'normal_balance' => 'DEBIT',
            'is_system' => true,
            'is_active' => true,
        ]);

        $this->rentExpenseAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpExp->id,
            'account_code' => '5100',
            'account_name' => 'Rent Expense',
            'account_type' => 'EXPENSE',
            'normal_balance' => 'DEBIT',
            'is_system' => false,
            'is_active' => true,
        ]);

        // 5. Account Mappings
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_CASH_BANK, $this->cashAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_ACCOUNTS_RECEIVABLE, $this->arAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_INVENTORY_ASSET, $this->inventoryAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_ACCOUNTS_PAYABLE, $this->apAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_AP_CLEARING, $this->apAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_VAT_PAYABLE, $this->vatAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_SALES_REVENUE, $this->revenueAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_COGS, $this->cogsAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_OPERATING_EXPENSE, $this->rentExpenseAccount->id);
    }

    /**
     * Test 1: Account CRUD and System Protection.
     */
    public function test_account_crud_and_protections(): void
    {
        // 1. Create custom account
        $res = $this->actingAs($this->user)->postJson('/api/v1/accounts', [
            'account_name' => 'Petty Cash',
            'account_code' => '1015',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'allow_manual_posting' => true,
        ], ['X-Company-ID' => $this->company->id]);

        $res->assertStatus(201);
        $createdId = $res->json('data.id');
        $this->assertDatabaseHas('accounts', ['id' => $createdId, 'account_code' => '1015']);

        // 2. View account
        $viewRes = $this->actingAs($this->user)->getJson("/api/v1/accounts/{$createdId}", [
            'X-Company-ID' => $this->company->id,
        ]);
        $viewRes->assertStatus(200);
        $this->assertEquals('Petty Cash', $viewRes->json('data.account_name'));

        // 3. Update account
        $updRes = $this->actingAs($this->user)->putJson("/api/v1/accounts/{$createdId}", [
            'account_name' => 'Petty Cash - Main Office',
            'account_code' => '1015',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
        ], ['X-Company-ID' => $this->company->id]);
        $updRes->assertStatus(200);
        $this->assertDatabaseHas('accounts', ['id' => $createdId, 'account_name' => 'Petty Cash - Main Office']);

        // 4. Attempt to deactivate system account -> rejected 422
        $deactRes = $this->actingAs($this->user)->postJson("/api/v1/accounts/{$this->cashAccount->id}/deactivate", [], [
            'X-Company-ID' => $this->company->id,
        ]);
        $deactRes->assertStatus(422);

        // 5. Attempt to delete system account -> rejected 422
        $delSysRes = $this->actingAs($this->user)->deleteJson("/api/v1/accounts/{$this->cashAccount->id}", [], [
            'X-Company-ID' => $this->company->id,
        ]);
        $delSysRes->assertStatus(422);

        // 6. Delete unused custom account -> success 200
        $delCustomRes = $this->actingAs($this->user)->deleteJson("/api/v1/accounts/{$createdId}", [], [
            'X-Company-ID' => $this->company->id,
        ]);
        $delCustomRes->assertStatus(200);
        $this->assertDatabaseMissing('accounts', ['id' => $createdId]);
    }

    /**
     * Test 2: Journal Entries Lifecycle, Balance Invariant, and Reversal.
     */
    public function test_journal_lifecycle_balance_and_reversal(): void
    {
        // 1. Unbalanced journal rejected
        $unbalRes = $this->actingAs($this->user)->postJson('/api/v1/journals', [
            'journal_date' => '2026-02-01',
            'description' => 'Unbalanced Attempt',
            'lines' => [
                ['account_id' => $this->cashAccount->id, 'debit' => 1000, 'credit' => 0],
                ['account_id' => $this->revenueAccount->id, 'debit' => 0, 'credit' => 900],
            ],
        ], ['X-Company-ID' => $this->company->id]);
        $unbalRes->assertStatus(409);

        // 2. Balanced journal created (DRAFT)
        $balRes = $this->actingAs($this->user)->postJson('/api/v1/journals', [
            'journal_date' => '2026-02-01',
            'description' => 'Capital Injection',
            'lines' => [
                ['account_id' => $this->cashAccount->id, 'debit' => 50000, 'credit' => 0],
                ['account_id' => $this->equityAccount->id, 'debit' => 0, 'credit' => 50000],
            ],
        ], ['X-Company-ID' => $this->company->id]);
        $balRes->assertStatus(201);
        $journalId = $balRes->json('data.id');
        $this->assertEquals('DRAFT', $balRes->json('data.status'));

        // 3. Post manual journal
        $postRes = $this->actingAs($this->user)->postJson("/api/v1/journals/{$journalId}/post", [], [
            'X-Company-ID' => $this->company->id,
        ]);
        $postRes->assertStatus(200);
        $this->assertEquals('POSTED', $postRes->json('data.status'));

        // 4. Reverse posted journal
        $revRes = $this->actingAs($this->user)->postJson("/api/v1/journals/{$journalId}/reverse", [
            'reason' => 'Entry correction error',
        ], ['X-Company-ID' => $this->company->id]);
        $revRes->assertStatus(200);

        $reversalJournal = $revRes->json('data');
        $this->assertEquals('POSTED', $reversalJournal['status']);
        $this->assertStringContainsString('Reversal of', $reversalJournal['description']);

        // Check reversed lines
        $revLines = $reversalJournal['lines'];
        foreach ($revLines as $line) {
            if ($line['account_id'] == $this->cashAccount->id) {
                $this->assertEquals(50000, (float)$line['credit']);
                $this->assertEquals(0, (float)$line['debit']);
            }
            if ($line['account_id'] == $this->equityAccount->id) {
                $this->assertEquals(50000, (float)$line['debit']);
                $this->assertEquals(0, (float)$line['credit']);
            }
        }
    }

    /**
     * Test 3: Atomic Cash/Bank Transfer.
     */
    public function test_atomic_cash_bank_transfer(): void
    {
        // 1. Successful transfer: Cash (1010) -> Bank (1020), 12,000 BDT
        $transferRes = $this->actingAs($this->user)->postJson('/api/v1/accounting/cash-bank-transfer', [
            'from_account_id' => $this->cashAccount->id,
            'to_account_id' => $this->bankAccount->id,
            'amount' => 12000.00,
            'date' => '2026-03-01',
            'reference' => 'DEP-001',
            'description' => 'Deposit cash into City Bank',
        ], ['X-Company-ID' => $this->company->id]);

        $transferRes->assertStatus(201);
        $journal = $transferRes->json('data');

        $this->assertEquals('POSTED', $journal['status']);
        $this->assertEquals('SYSTEM', $journal['source']);
        $this->assertEquals('CASH_BANK_TRANSFER', $journal['reference_type']);

        // Verify balanced lines: DR Bank 12000, CR Cash 12000
        $this->assertCount(2, $journal['lines']);
        $debitLine = collect($journal['lines'])->firstWhere('debit', '12000.00') ?? collect($journal['lines'])->firstWhere('debit', 12000);
        $creditLine = collect($journal['lines'])->firstWhere('credit', '12000.00') ?? collect($journal['lines'])->firstWhere('credit', 12000);

        $this->assertNotNull($debitLine);
        $this->assertNotNull($creditLine);
        $this->assertEquals($this->bankAccount->id, $debitLine['account_id']);
        $this->assertEquals($this->cashAccount->id, $creditLine['account_id']);

        // Verify Audit Log
        $this->assertDatabaseHas('audit_logs', [
            'company_id' => $this->company->id,
            'event' => 'CASH_BANK_TRANSFERRED',
        ]);

        // 2. Reject transfer to same account
        $sameAccRes = $this->actingAs($this->user)->postJson('/api/v1/accounting/cash-bank-transfer', [
            'from_account_id' => $this->cashAccount->id,
            'to_account_id' => $this->cashAccount->id,
            'amount' => 500.00,
            'date' => '2026-03-01',
        ], ['X-Company-ID' => $this->company->id]);
        $sameAccRes->assertStatus(422);

        // 3. Reject transfer from non-asset account (e.g. AP)
        $invalidAccRes = $this->actingAs($this->user)->postJson('/api/v1/accounting/cash-bank-transfer', [
            'from_account_id' => $this->apAccount->id,
            'to_account_id' => $this->bankAccount->id,
            'amount' => 500.00,
            'date' => '2026-03-01',
        ], ['X-Company-ID' => $this->company->id]);
        $invalidAccRes->assertStatus(422);
    }

    /**
     * Test 4: Expense Service GL Integration & Idempotency.
     */
    public function test_expense_gl_integration_and_idempotency(): void
    {
        // 1. Create expense category linked to Rent Expense (5100)
        $category = ExpenseCategory::create([
            'company_id' => $this->company->id,
            'name' => 'Office Rent',
            'code' => 'EXP-RENT',
            'account_id' => $this->rentExpenseAccount->id,
            'is_active' => true,
        ]);

        // 2. Create and complete PAID expense (Amount: 3500 BDT)
        $paidExpense = Expense::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'expense_category_id' => $category->id,
            'expense_number' => 'EXP-2026-001',
            'expense_date' => '2026-03-10',
            'amount' => 3500.00,
            'tax_amount' => 0.00,
            'total_amount' => 3500.00,
            'paid_amount' => 3500.00,
            'due_amount' => 0.00,
            'payment_status' => 'PAID',
            'payment_method' => 'CASH',
            'status' => 'DRAFT',
            'requested_by' => $this->user->id,
            'created_by' => $this->user->id,
        ]);

        $this->expenseService->completeExpense($this->company->id, $paidExpense->id, $this->user->id);

        $paidExpense->refresh();
        $this->assertEquals('COMPLETED', $paidExpense->status);

        // Verify GL journal created: DR Rent Expense 3500, CR Cash 3500
        $journal = JournalEntry::where('company_id', $this->company->id)
            ->where('reference_type', 'EXPENSE')
            ->where('reference_id', $paidExpense->id)
            ->first();

        $this->assertNotNull($journal);
        $this->assertEquals('POSTED', $journal->status);
        $this->assertEquals(3500.00, (float)$journal->total_debit);
        $this->assertEquals(3500.00, (float)$journal->total_credit);

        $rentLine = $journal->lines->firstWhere('account_id', $this->rentExpenseAccount->id);
        $cashLine = $journal->lines->firstWhere('account_id', $this->cashAccount->id);
        $this->assertEquals(3500.00, (float)$rentLine->debit);
        $this->assertEquals(3500.00, (float)$cashLine->credit);

        // Test Idempotency: Complete again should not create duplicate journal
        $this->expenseService->completeExpense($this->company->id, $paidExpense->id, $this->user->id);
        $count = JournalEntry::where('company_id', $this->company->id)
            ->where('reference_type', 'EXPENSE')
            ->where('reference_id', $paidExpense->id)
            ->count();
        $this->assertEquals(1, $count);

        // 3. Create DUE expense (Amount: 5000 BDT)
        $dueExpense = Expense::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'expense_category_id' => $category->id,
            'expense_number' => 'EXP-2026-002',
            'expense_date' => '2026-03-15',
            'amount' => 5000.00,
            'tax_amount' => 0.00,
            'total_amount' => 5000.00,
            'paid_amount' => 0.00,
            'due_amount' => 5000.00,
            'payment_status' => 'DUE',
            'status' => 'DRAFT',
            'requested_by' => $this->user->id,
            'created_by' => $this->user->id,
        ]);

        $this->expenseService->completeExpense($this->company->id, $dueExpense->id, $this->user->id);

        // Verify GL journal: DR Rent Expense 5000, CR Accounts Payable 5000
        $dueJournal = JournalEntry::where('company_id', $this->company->id)
            ->where('reference_type', 'EXPENSE')
            ->where('reference_id', $dueExpense->id)
            ->first();

        $this->assertNotNull($dueJournal);
        $apLine = $dueJournal->lines->firstWhere('account_id', $this->apAccount->id);
        $this->assertEquals(5000.00, (float)$apLine->credit);

        // 4. Add Payment for DUE expense: 5000 BDT via Bank
        $this->expenseService->addPayment($this->company->id, $dueExpense->id, $this->user->id, [
            'payment_date' => '2026-03-20',
            'amount' => 5000.00,
            'payment_method' => 'BANK_TRANSFER',
        ]);

        // Verify GL journal for payment: DR Accounts Payable 5000, CR Cash/Bank 5000
        $payJournal = JournalEntry::where('company_id', $this->company->id)
            ->where('reference_type', 'EXPENSE_PAYMENT')
            ->first();

        $this->assertNotNull($payJournal);
        $apPayLine = $payJournal->lines->firstWhere('account_id', $this->apAccount->id);
        $cashPayLine = $payJournal->lines->firstWhere('account_id', $this->cashAccount->id);
        $this->assertEquals(5000.00, (float)$apPayLine->debit);
        $this->assertEquals(5000.00, (float)$cashPayLine->credit);
    }

    /**
     * Test 5: General Ledger with Running Balance and Prior Opening Balance.
     */
    public function test_general_ledger_running_and_opening_balance(): void
    {
        // Journal 1: Jan 10 -> Debit Cash 10,000, Credit Equity 10,000
        $this->accountingService->postAutomatedJournal($this->company->id, [
            'journal_date' => '2026-01-10',
            'description' => 'Initial Cash Deposit',
            'source' => 'MANUAL',
            'lines' => [
                ['account_id' => $this->cashAccount->id, 'debit' => 10000, 'credit' => 0],
                ['account_id' => $this->equityAccount->id, 'debit' => 0, 'credit' => 10000],
            ],
        ], $this->user->id);

        // Journal 2: Jan 20 -> Debit Cash 5,000, Credit Revenue 5,000
        $this->accountingService->postAutomatedJournal($this->company->id, [
            'journal_date' => '2026-01-20',
            'description' => 'Cash Sale Jan',
            'source' => 'MANUAL',
            'lines' => [
                ['account_id' => $this->cashAccount->id, 'debit' => 5000, 'credit' => 0],
                ['account_id' => $this->revenueAccount->id, 'debit' => 0, 'credit' => 5000],
            ],
        ], $this->user->id);

        // Journal 3: Feb 15 -> Debit Cash 3,000, Credit Revenue 3,000
        $this->accountingService->postAutomatedJournal($this->company->id, [
            'journal_date' => '2026-02-15',
            'description' => 'Cash Sale Feb',
            'source' => 'MANUAL',
            'lines' => [
                ['account_id' => $this->cashAccount->id, 'debit' => 3000, 'credit' => 0],
                ['account_id' => $this->revenueAccount->id, 'debit' => 0, 'credit' => 3000],
            ],
        ], $this->user->id);

        // Journal 4: Feb 20 -> Debit Rent Expense 2,000, Credit Cash 2,000
        $this->accountingService->postAutomatedJournal($this->company->id, [
            'journal_date' => '2026-02-20',
            'description' => 'Rent Payment Feb',
            'source' => 'MANUAL',
            'lines' => [
                ['account_id' => $this->rentExpenseAccount->id, 'debit' => 2000, 'credit' => 0],
                ['account_id' => $this->cashAccount->id, 'debit' => 0, 'credit' => 2000],
            ],
        ], $this->user->id);

        // Query GL for Cash Account from Feb 01 to Feb 28
        $res = $this->actingAs($this->user)->getJson(
            "/api/v1/reports/general-ledger?account_id={$this->cashAccount->id}&from_date=2026-02-01&to_date=2026-02-28",
            ['X-Company-ID' => $this->company->id]
        );

        $res->assertStatus(200);
        $data = $res->json('data');

        // Opening balance before Feb 01 should be 10,000 + 5,000 = 15,000
        $this->assertEquals(15000.00, (float)$data['opening_balance']);
        $this->assertEquals(3000.00, (float)$data['total_debit']);
        $this->assertEquals(2000.00, (float)$data['total_credit']);
        // Closing balance: 15,000 + 3,000 - 2,000 = 16,000
        $this->assertEquals(16000.00, (float)$data['closing_balance']);

        // Check running balances on lines
        $this->assertCount(2, $data['lines']);
        $this->assertEquals(18000.00, (float)$data['lines'][0]['running_balance']); // 15000 + 3000
        $this->assertEquals(16000.00, (float)$data['lines'][1]['running_balance']); // 18000 - 2000
    }

    /**
     * Test 6: Trial Balance Invariant (Debits == Credits).
     */
    public function test_trial_balance_debits_equal_credits(): void
    {
        // Post a balanced multi-line transaction
        $this->accountingService->postAutomatedJournal($this->company->id, [
            'journal_date' => '2026-03-01',
            'description' => 'Complex Operation',
            'source' => 'MANUAL',
            'lines' => [
                ['account_id' => $this->cashAccount->id, 'debit' => 8000, 'credit' => 0],
                ['account_id' => $this->arAccount->id, 'debit' => 2000, 'credit' => 0],
                ['account_id' => $this->revenueAccount->id, 'debit' => 0, 'credit' => 9000],
                ['account_id' => $this->vatAccount->id, 'debit' => 0, 'credit' => 1000],
            ],
        ], $this->user->id);

        $res = $this->actingAs($this->user)->getJson(
            '/api/v1/reports/trial-balance?as_of_date=2026-03-31',
            ['X-Company-ID' => $this->company->id]
        );

        $res->assertStatus(200);
        $data = $res->json('data');

        $this->assertTrue($data['is_balanced']);
        $this->assertEquals($data['total_debit'], $data['total_credit']);
        $this->assertEquals(10000.00, (float)$data['total_debit']);
    }

    /**
     * Test 7: Profit and Loss Calculation.
     */
    public function test_profit_and_loss_calculation(): void
    {
        // Revenue: 50,000 BDT
        // COGS: 20,000 BDT
        // Rent Expense: 8,000 BDT
        $this->accountingService->postAutomatedJournal($this->company->id, [
            'journal_date' => '2026-04-01',
            'description' => 'Sales and COGS Entry',
            'source' => 'MANUAL',
            'lines' => [
                ['account_id' => $this->cashAccount->id, 'debit' => 50000, 'credit' => 0],
                ['account_id' => $this->revenueAccount->id, 'debit' => 0, 'credit' => 50000],
            ],
        ], $this->user->id);

        $this->accountingService->postAutomatedJournal($this->company->id, [
            'journal_date' => '2026-04-02',
            'description' => 'COGS Recognition',
            'source' => 'MANUAL',
            'lines' => [
                ['account_id' => $this->cogsAccount->id, 'debit' => 20000, 'credit' => 0],
                ['account_id' => $this->inventoryAccount->id, 'debit' => 0, 'credit' => 20000],
            ],
        ], $this->user->id);

        $this->accountingService->postAutomatedJournal($this->company->id, [
            'journal_date' => '2026-04-03',
            'description' => 'Rent Expense',
            'source' => 'MANUAL',
            'lines' => [
                ['account_id' => $this->rentExpenseAccount->id, 'debit' => 8000, 'credit' => 0],
                ['account_id' => $this->cashAccount->id, 'debit' => 0, 'credit' => 8000],
            ],
        ], $this->user->id);

        $res = $this->actingAs($this->user)->getJson(
            '/api/v1/reports/profit-loss?from_date=2026-04-01&to_date=2026-04-30',
            ['X-Company-ID' => $this->company->id]
        );

        $res->assertStatus(200);
        $pnl = $res->json('data');

        $this->assertEquals(50000.00, (float)$pnl['operating_revenue']);
        $this->assertEquals(20000.00, (float)$pnl['cost_of_goods_sold']);
        $this->assertEquals(30000.00, (float)$pnl['gross_profit']);
        $this->assertEquals(60.00, (float)$pnl['gross_margin_percentage']);
        $this->assertEquals(8000.00, (float)$pnl['operating_expenses']);
        $this->assertEquals(22000.00, (float)$pnl['net_profit']);
        $this->assertEquals(44.00, (float)$pnl['net_margin_percentage']);
    }

    /**
     * Test 8: Balance Sheet Accounting Equation (Assets = Liabilities + Equity).
     */
    public function test_balance_sheet_equation_invariant(): void
    {
        // 1. Owner Capital: Cash 100,000, Equity 100,000
        $this->accountingService->postAutomatedJournal($this->company->id, [
            'journal_date' => '2026-01-01',
            'description' => 'Owner Capital Injection',
            'source' => 'MANUAL',
            'lines' => [
                ['account_id' => $this->cashAccount->id, 'debit' => 100000, 'credit' => 0],
                ['account_id' => $this->equityAccount->id, 'debit' => 0, 'credit' => 100000],
            ],
        ], $this->user->id);

        // 2. Buy Inventory on Credit: Inventory 30,000, AP 30,000
        $this->accountingService->postAutomatedJournal($this->company->id, [
            'journal_date' => '2026-01-05',
            'description' => 'Inventory on credit',
            'source' => 'MANUAL',
            'lines' => [
                ['account_id' => $this->inventoryAccount->id, 'debit' => 30000, 'credit' => 0],
                ['account_id' => $this->apAccount->id, 'debit' => 0, 'credit' => 30000],
            ],
        ], $this->user->id);

        // 3. Sell Inventory: Cash 40,000, Revenue 40,000
        $this->accountingService->postAutomatedJournal($this->company->id, [
            'journal_date' => '2026-01-15',
            'description' => 'Sale of goods',
            'source' => 'MANUAL',
            'lines' => [
                ['account_id' => $this->cashAccount->id, 'debit' => 40000, 'credit' => 0],
                ['account_id' => $this->revenueAccount->id, 'debit' => 0, 'credit' => 40000],
            ],
        ], $this->user->id);

        // 4. COGS: COGS 15,000, Inventory 15,000
        $this->accountingService->postAutomatedJournal($this->company->id, [
            'journal_date' => '2026-01-15',
            'description' => 'Cost of goods sold',
            'source' => 'MANUAL',
            'lines' => [
                ['account_id' => $this->cogsAccount->id, 'debit' => 15000, 'credit' => 0],
                ['account_id' => $this->inventoryAccount->id, 'debit' => 0, 'credit' => 15000],
            ],
        ], $this->user->id);

        // Current net profit = 40,000 (Rev) - 15,000 (COGS) = 25,000
        // Total Assets: Cash (100,000 + 40,000 = 140,000) + Inventory (30,000 - 15,000 = 15,000) = 155,000
        // Total Liabilities: AP = 30,000
        // Total Equity: Base Equity (100,000) + Current Period Earnings (25,000) = 125,000
        // Liabilities + Equity = 30,000 + 125,000 = 155,000 == Total Assets!

        $res = $this->actingAs($this->user)->getJson(
            '/api/v1/reports/balance-sheet?as_of_date=2026-01-31',
            ['X-Company-ID' => $this->company->id]
        );

        $res->assertStatus(200);
        $bs = $res->json('data');

        $this->assertTrue($bs['is_balanced']);
        $this->assertEquals(0.00, (float)$bs['variance']);
        $this->assertEquals(155000.00, (float)$bs['total_assets']);
        $this->assertEquals(30000.00, (float)$bs['total_liabilities']);
        $this->assertEquals(125000.00, (float)$bs['total_equity']);
        $this->assertEquals(25000.00, (float)$bs['current_period_earnings']);
    }

    /**
     * Test 9: Cash Flow Statement.
     */
    public function test_cash_flow_statement(): void
    {
        // Jan 1: Initial Cash 50,000
        $this->accountingService->postAutomatedJournal($this->company->id, [
            'journal_date' => '2026-01-01',
            'description' => 'Opening deposit',
            'source' => 'MANUAL',
            'lines' => [
                ['account_id' => $this->cashAccount->id, 'debit' => 50000, 'credit' => 0],
                ['account_id' => $this->equityAccount->id, 'debit' => 0, 'credit' => 50000],
            ],
        ], $this->user->id);

        // Feb 5: Cash inflow 20,000
        $this->accountingService->postAutomatedJournal($this->company->id, [
            'journal_date' => '2026-02-05',
            'description' => 'February Cash inflow',
            'source' => 'MANUAL',
            'lines' => [
                ['account_id' => $this->cashAccount->id, 'debit' => 20000, 'credit' => 0],
                ['account_id' => $this->revenueAccount->id, 'debit' => 0, 'credit' => 20000],
            ],
        ], $this->user->id);

        // Feb 10: Cash outflow 5,000
        $this->accountingService->postAutomatedJournal($this->company->id, [
            'journal_date' => '2026-02-10',
            'description' => 'February Cash outflow',
            'source' => 'MANUAL',
            'lines' => [
                ['account_id' => $this->rentExpenseAccount->id, 'debit' => 5000, 'credit' => 0],
                ['account_id' => $this->cashAccount->id, 'debit' => 0, 'credit' => 5000],
            ],
        ], $this->user->id);

        // Query Cash Flow for Feb
        $res = $this->actingAs($this->user)->getJson(
            '/api/v1/reports/cash-flow?from_date=2026-02-01&to_date=2026-02-28',
            ['X-Company-ID' => $this->company->id]
        );

        $res->assertStatus(200);
        $cf = $res->json('data');

        $this->assertEquals(50000.00, (float)$cf['opening_cash_balance']);
        $this->assertEquals(20000.00, (float)$cf['total_inflows']);
        $this->assertEquals(5000.00, (float)$cf['total_outflows']);
        $this->assertEquals(15000.00, (float)$cf['net_cash_movement']);
        $this->assertEquals(65000.00, (float)$cf['closing_cash_balance']);
    }

    /**
     * Test 10: VAT Report & GL Reconciliation.
     */
    public function test_vat_report_and_reconciliation(): void
    {
        // Journal with VAT
        $this->accountingService->postAutomatedJournal($this->company->id, [
            'journal_date' => '2026-05-10',
            'description' => 'Sale with VAT',
            'source' => 'MANUAL',
            'lines' => [
                ['account_id' => $this->cashAccount->id, 'debit' => 11500, 'credit' => 0],
                ['account_id' => $this->revenueAccount->id, 'debit' => 0, 'credit' => 10000],
                ['account_id' => $this->vatAccount->id, 'debit' => 0, 'credit' => 1500],
            ],
        ], $this->user->id);

        $res = $this->actingAs($this->user)->getJson(
            '/api/v1/reports/vat?from_date=2026-05-01&to_date=2026-05-31',
            ['X-Company-ID' => $this->company->id]
        );

        $res->assertStatus(200);
        $vat = $res->json('data');

        $this->assertArrayHasKey('gl_vat_payable_balance', $vat);
        $this->assertArrayHasKey('gl_vat_period_movement', $vat);
        $this->assertEquals(1500.00, (float)$vat['gl_vat_payable_balance']);
        $this->assertEquals(1500.00, (float)$vat['gl_vat_period_movement']);
    }

    /**
     * Test 11: Multi-Tenant Isolation.
     */
    public function test_multi_tenant_isolation(): void
    {
        // Create second company
        $companyB = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Foreign Corp B',
            'code' => 'CORP-B-' . Str::random(5),
            'country' => 'Bangladesh',
        ]);

        $accountB = Account::create([
            'company_id' => $companyB->id,
            'account_code' => '9999',
            'account_name' => 'Secret Vault',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_system' => false,
            'is_active' => true,
        ]);

        // User A tries to view Company B's account
        $viewRes = $this->actingAs($this->user)->getJson("/api/v1/accounts/{$accountB->id}", [
            'X-Company-ID' => $this->company->id,
        ]);
        $this->assertTrue(in_array($viewRes->status(), [403, 404]));

        // User A tries to delete Company B's account
        $delRes = $this->actingAs($this->user)->deleteJson("/api/v1/accounts/{$accountB->id}", [], [
            'X-Company-ID' => $this->company->id,
        ]);
        $this->assertTrue(in_array($delRes->status(), [403, 404]));
    }
}
