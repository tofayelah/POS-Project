<?php

namespace Tests\Feature\Finance;

use App\Models\Account;
use App\Models\AccountingPeriod;
use App\Models\BankAccount;
use App\Models\BankStatement;
use App\Models\Company;
use App\Models\FiscalYear;
use App\Models\Role;
use App\Models\User;
use App\Services\AccountingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BankReconciliationTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Company $company;
    protected FiscalYear $fiscalYear;
    protected AccountingPeriod $period;
    protected Account $bankGlAccount;
    protected Account $revenueAccount;
    protected BankAccount $bankAccount;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
        $this->seed(\Database\Seeders\AccountingPermissionSeeder::class);
        $this->seed(\Database\Seeders\FinancialManagementPermissionsSeeder::class);

        $this->company = Company::factory()->create();

        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);
        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin']);
        $this->user->roles()->attach($superAdmin->id);

        $this->fiscalYear = FiscalYear::create([
            'company_id' => $this->company->id,
            'name' => 'FY 2026',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'status' => 'OPEN',
            'is_current' => true,
        ]);

        $this->period = AccountingPeriod::create([
            'company_id' => $this->company->id,
            'fiscal_year_id' => $this->fiscalYear->id,
            'name' => 'October 2026',
            'start_date' => '2026-10-01',
            'end_date' => '2026-10-31',
            'status' => 'OPEN',
        ]);

        $this->bankGlAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '1020',
            'account_name' => 'Eastern Bank Corporate',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
            'allow_manual_posting' => true,
        ]);

        $this->revenueAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '4010',
            'account_name' => 'Online Sales Revenue',
            'account_type' => 'REVENUE',
            'normal_balance' => 'CREDIT',
            'is_active' => true,
            'allow_manual_posting' => true,
        ]);

        $this->bankAccount = BankAccount::create([
            'company_id' => $this->company->id,
            'account_id' => $this->bankGlAccount->id,
            'bank_name' => 'Eastern Bank PLC',
            'branch_name' => 'Gulshan',
            'account_name' => 'RetailCore Ltd',
            'account_number_masked' => '10810000****',
            'currency' => 'BDT',
            'opening_balance' => 100000,
            'current_balance' => 100000,
            'status' => 'ACTIVE',
            'created_by' => $this->user->id,
        ]);
    }

    public function test_bank_statement_import_and_reconciliation_workflow(): void
    {
        // 1. Post a GL deposit of 15000 in RetailCore
        $accountingService = app(AccountingService::class);
        $journal = $accountingService->postAutomatedJournal($this->company->id, [
            'journal_date' => '2026-10-10',
            'description' => 'Customer online payment',
            'reference_type' => 'ONLINE_PAYMENT',
            'lines' => [
                [
                    'account_id' => $this->bankGlAccount->id,
                    'debit' => 15000,
                    'credit' => 0,
                    'reference' => 'TXN-998877',
                ],
                [
                    'account_id' => $this->revenueAccount->id,
                    'debit' => 0,
                    'credit' => 15000,
                    'reference' => 'TXN-998877',
                ],
            ],
        ], $this->user->id);

        // 2. Import bank statement with matching line
        $importRes = $this->actingAs($this->user)->postJson("/api/v1/financial-management/bank-accounts/{$this->bankAccount->id}/statements", [
            'statement_identifier' => 'STMT-OCT-2026',
            'start_date' => '2026-10-01',
            'end_date' => '2026-10-31',
            'opening_balance' => 100000,
            'closing_balance' => 115000,
            'lines' => [
                [
                    'transaction_date' => '2026-10-10',
                    'description' => 'Deposit from customer TXN-998877',
                    'reference_number' => 'TXN-998877',
                    'debit' => 0,
                    'credit' => 15000,
                    'balance' => 115000,
                ],
                [
                    'transaction_date' => '2026-10-12',
                    'description' => 'Bank service charge fee',
                    'reference_number' => 'CHG-001',
                    'debit' => 500,
                    'credit' => 0,
                    'balance' => 114500,
                ],
            ],
        ], ['X-Company-ID' => $this->company->id]);

        $importRes->assertStatus(201);
        $statementId = $importRes->json('data.id');

        // 3. Start Reconciliation
        $startRes = $this->actingAs($this->user)->postJson('/api/v1/financial-management/bank-reconciliations', [
            'bank_account_id' => $this->bankAccount->id,
            'bank_statement_id' => $statementId,
            'reconciliation_date' => '2026-10-31',
        ], ['X-Company-ID' => $this->company->id]);

        $startRes->assertStatus(201);
        $reconId = $startRes->json('data.id');

        // 4. Run Auto-Match
        $autoMatchRes = $this->actingAs($this->user)->postJson("/api/v1/financial-management/bank-reconciliations/{$reconId}/auto-match", [], ['X-Company-ID' => $this->company->id]);
        $autoMatchRes->assertStatus(200);
        $this->assertEquals(1, $autoMatchRes->json('data.matched_count'));
        $this->assertEquals(1, $autoMatchRes->json('data.unmatched_statement_lines'));

        // 5. Finalize Reconciliation
        $finalizeRes = $this->actingAs($this->user)->postJson("/api/v1/financial-management/bank-reconciliations/{$reconId}/finalize", [
            'notes' => 'Completed monthly reconciliation with 1 matched line and 1 pending fee',
        ], ['X-Company-ID' => $this->company->id]);

        $finalizeRes->assertStatus(200);
        $this->assertEquals('COMPLETED', $finalizeRes->json('data.status'));
    }
}
