<?php

namespace Tests\Feature\Finance;

use App\Models\Account;
use App\Models\AccountingPeriod;
use App\Models\Company;
use App\Models\FiscalYear;
use App\Models\JournalEntry;
use App\Models\Role;
use App\Models\User;
use App\Services\AccountingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Tests\TestCase;

class PeriodAndYearEndClosingTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Company $company;
    protected FiscalYear $fiscalYear;
    protected AccountingPeriod $period;
    protected Account $revenueAccount;
    protected Account $expenseAccount;
    protected Account $retainedEarningsAccount;
    protected Account $cashAccount;

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

        $this->revenueAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '4000',
            'account_name' => 'General Sales Revenue',
            'account_type' => 'REVENUE',
            'normal_balance' => 'CREDIT',
            'is_active' => true,
            'allow_manual_posting' => true,
        ]);

        $this->expenseAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '5000',
            'account_name' => 'Cost of Goods Sold',
            'account_type' => 'EXPENSE',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
            'allow_manual_posting' => true,
        ]);

        $this->retainedEarningsAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '3020',
            'account_name' => 'Retained Earnings',
            'account_type' => 'EQUITY',
            'normal_balance' => 'CREDIT',
            'is_active' => true,
            'allow_manual_posting' => true,
        ]);

        $this->cashAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '1010',
            'account_name' => 'Cash Account',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
            'allow_manual_posting' => true,
        ]);
    }

    public function test_period_soft_lock_and_close_prevents_posting(): void
    {
        // 1. Soft-lock period
        $lockRes = $this->actingAs($this->user)->postJson("/api/v1/financial-management/financial-periods/{$this->period->id}/soft-lock", [], ['X-Company-ID' => $this->company->id]);
        $lockRes->assertStatus(200);
        $this->assertEquals('SOFT_LOCK', $lockRes->json('data.status'));

        // 2. Close period
        $closeRes = $this->actingAs($this->user)->postJson("/api/v1/financial-management/financial-periods/{$this->period->id}/close", [], ['X-Company-ID' => $this->company->id]);
        $closeRes->assertStatus(200);
        $this->assertEquals('CLOSED', $closeRes->json('data.status'));

        // 3. Attempting to post automated journal to closed period must fail with ConflictHttpException
        $accountingService = app(AccountingService::class);
        $this->expectException(ConflictHttpException::class);
        $accountingService->postAutomatedJournal($this->company->id, [
            'journal_date' => '2026-10-15',
            'description' => 'Should fail due to closed period',
            'lines' => [
                ['account_id' => $this->expenseAccount->id, 'debit' => 100, 'credit' => 0],
                ['account_id' => $this->cashAccount->id, 'debit' => 0, 'credit' => 100],
            ],
        ], $this->user->id);
    }

    public function test_privileged_period_reopen(): void
    {
        $this->period->status = 'CLOSED';
        $this->period->save();

        $reopenRes = $this->actingAs($this->user)->postJson("/api/v1/financial-management/financial-periods/{$this->period->id}/reopen", [
            'reason' => 'Annual audit adjustment approved by CFO',
        ], ['X-Company-ID' => $this->company->id]);

        $reopenRes->assertStatus(200);
        $this->assertEquals('OPEN', $reopenRes->json('data.status'));
        $this->assertEquals('Annual audit adjustment approved by CFO', $reopenRes->json('data.reopen_reason'));
    }

    public function test_year_end_closing_workflow_and_retained_earnings_balancing(): void
    {
        $accountingService = app(AccountingService::class);

        // Revenue: 100,000 (DR Cash 100000, CR Revenue 100000)
        $accountingService->postAutomatedJournal($this->company->id, [
            'journal_date' => '2026-10-05',
            'description' => 'Sales Revenue',
            'lines' => [
                ['account_id' => $this->cashAccount->id, 'debit' => 100000, 'credit' => 0],
                ['account_id' => $this->revenueAccount->id, 'debit' => 0, 'credit' => 100000],
            ],
        ], $this->user->id);

        // Expense: 40,000 (DR Expense 40000, CR Cash 40000)
        $accountingService->postAutomatedJournal($this->company->id, [
            'journal_date' => '2026-10-08',
            'description' => 'COGS Expenditure',
            'lines' => [
                ['account_id' => $this->expenseAccount->id, 'debit' => 40000, 'credit' => 0],
                ['account_id' => $this->cashAccount->id, 'debit' => 0, 'credit' => 40000],
            ],
        ], $this->user->id);

        // Expected Net Profit = 60,000
        $previewRes = $this->actingAs($this->user)->getJson("/api/v1/financial-management/year-end-closings/preview/{$this->fiscalYear->id}", ['X-Company-ID' => $this->company->id]);
        $previewRes->assertStatus(200);
        $this->assertEquals(100000, $previewRes->json('data.total_revenue'));
        $this->assertEquals(40000, $previewRes->json('data.total_expense'));
        $this->assertEquals(60000, $previewRes->json('data.net_profit'));

        // Execute Year-End Closing
        $executeRes = $this->actingAs($this->user)->postJson('/api/v1/financial-management/year-end-closings/execute', [
            'fiscal_year_id' => $this->fiscalYear->id,
            'retained_earnings_account_id' => $this->retainedEarningsAccount->id,
            'notes' => 'FY 2026 Final Closing',
        ], ['X-Company-ID' => $this->company->id]);

        $executeRes->assertStatus(200);
        $closingData = $executeRes->json('data');
        $this->assertEquals('COMPLETED', $closingData['status']);
        $this->assertEquals(60000, (float) $closingData['net_profit_amount']);

        // Verify Fiscal Year status is CLOSED
        $this->fiscalYear->refresh();
        $this->assertEquals('CLOSED', $this->fiscalYear->status);

        // Verify closing journal entry lines balanced
        $closingJournalId = $closingData['closing_journal_entry_id'];
        $closingJournal = JournalEntry::with('lines')->find($closingJournalId);
        $this->assertNotNull($closingJournal);
        $totalDr = $closingJournal->lines->sum('debit');
        $totalCr = $closingJournal->lines->sum('credit');
        $this->assertEquals($totalDr, $totalCr);
        $this->assertEquals(100000, (float) $totalDr); // DR Revenue 100k = CR Expense 40k + CR Retained Earnings 60k
    }
}
