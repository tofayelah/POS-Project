<?php

namespace Tests\Feature\Finance;

use App\Models\Account;
use App\Models\AccountingPeriod;
use App\Models\Company;
use App\Models\CostCentre;
use App\Models\FiscalYear;
use App\Models\Role;
use App\Models\User;
use App\Models\Budget;
use App\Models\BudgetControl;
use App\Services\AccountingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetAndControlTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Company $company;
    protected FiscalYear $fiscalYear;
    protected AccountingPeriod $period;
    protected Account $expenseAccount;
    protected Account $cashAccount;
    protected CostCentre $costCentre;

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

        $this->expenseAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '6010',
            'account_name' => 'Office Supplies Expense',
            'account_type' => 'EXPENSE',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
            'allow_manual_posting' => true,
        ]);

        $this->cashAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '1010',
            'account_name' => 'Cash in Hand',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
            'allow_manual_posting' => true,
        ]);

        $this->costCentre = CostCentre::create([
            'company_id' => $this->company->id,
            'code' => 'CC-OPS',
            'name' => 'Operations Department',
            'status' => 'ACTIVE',
        ]);
    }

    public function test_budget_full_lifecycle(): void
    {
        $response = $this->actingAs($this->user)->postJson('/api/v1/financial-management/budgets', [
            'fiscal_year_id' => $this->fiscalYear->id,
            'name' => 'Annual Operations Budget 2026',
            'budget_type' => 'ORIGINAL',
            'lines' => [
                [
                    'account_id' => $this->expenseAccount->id,
                    'cost_centre_id' => $this->costCentre->id,
                    'accounting_period_id' => $this->period->id,
                    'amount' => 50000,
                    'notes' => 'Q4 office supplies',
                ],
            ],
        ], ['X-Company-ID' => $this->company->id]);

        $response->assertStatus(201);
        $budgetId = $response->json('data.id');
        $this->assertEquals('DRAFT', $response->json('data.status'));
        $this->assertEquals(50000, (float) $response->json('data.total_budgeted_amount'));

        // Submit for review
        $submitRes = $this->actingAs($this->user)->postJson("/api/v1/financial-management/budgets/{$budgetId}/submit", [], ['X-Company-ID' => $this->company->id]);
        $submitRes->assertStatus(200);
        $this->assertEquals('UNDER_REVIEW', $submitRes->json('data.status'));

        // Approve
        $approveRes = $this->actingAs($this->user)->postJson("/api/v1/financial-management/budgets/{$budgetId}/approve", [], ['X-Company-ID' => $this->company->id]);
        $approveRes->assertStatus(200);
        $this->assertEquals('APPROVED', $approveRes->json('data.status'));

        // Activate
        $activateRes = $this->actingAs($this->user)->postJson("/api/v1/financial-management/budgets/{$budgetId}/activate", [], ['X-Company-ID' => $this->company->id]);
        $activateRes->assertStatus(200);
        $this->assertEquals('ACTIVE', $activateRes->json('data.status'));

        // Revised Version
        $reviseRes = $this->actingAs($this->user)->postJson("/api/v1/financial-management/budgets/{$budgetId}/revise", [], ['X-Company-ID' => $this->company->id]);
        $reviseRes->assertStatus(201);
        $this->assertEquals(2, $reviseRes->json('data.version'));
        $this->assertEquals('REVISED', $reviseRes->json('data.budget_type'));
    }

    public function test_budget_vs_actual_and_variance(): void
    {
        $budget = Budget::create([
            'company_id' => $this->company->id,
            'fiscal_year_id' => $this->fiscalYear->id,
            'name' => 'Q4 Marketing Budget',
            'status' => 'ACTIVE',
            'version' => 1,
            'total_budgeted_amount' => 40000,
            'created_by' => $this->user->id,
        ]);

        $budget->lines()->create([
            'account_id' => $this->expenseAccount->id,
            'cost_centre_id' => $this->costCentre->id,
            'accounting_period_id' => $this->period->id,
            'amount' => 40000,
        ]);

        // Post an actual journal expenditure of 25000
        $accountingService = app(AccountingService::class);
        $accountingService->postAutomatedJournal($this->company->id, [
            'journal_date' => '2026-10-15',
            'description' => 'Office paper and pens purchase',
            'lines' => [
                [
                    'account_id' => $this->expenseAccount->id,
                    'cost_centre_id' => $this->costCentre->id,
                    'debit' => 25000,
                    'credit' => 0,
                ],
                [
                    'account_id' => $this->cashAccount->id,
                    'debit' => 0,
                    'credit' => 25000,
                ],
            ],
        ], $this->user->id);

        $response = $this->actingAs($this->user)->getJson("/api/v1/financial-management/budgets/{$budget->id}/vs-actual", ['X-Company-ID' => $this->company->id]);
        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertEquals(40000, $data['budget']['total_budgeted']);
        $this->assertEquals(25000, $data['budget']['total_actual']);
        $this->assertEquals(15000, $data['budget']['total_variance']);
        $this->assertEquals(62.5, $data['budget']['total_utilization']);
    }

    public function test_budget_control_rules_and_blocking(): void
    {
        // 1. Set budget control: threshold 100%, action BLOCK
        BudgetControl::create([
            'company_id' => $this->company->id,
            'account_id' => $this->expenseAccount->id,
            'cost_centre_id' => $this->costCentre->id,
            'control_action' => 'BLOCK',
            'threshold_percentage' => 100.00,
            'is_active' => true,
            'created_by' => $this->user->id,
        ]);

        // 2. Active budget with 10,000 limit
        $budget = Budget::create([
            'company_id' => $this->company->id,
            'fiscal_year_id' => $this->fiscalYear->id,
            'name' => 'Strict Spending Budget',
            'status' => 'ACTIVE',
            'version' => 1,
            'total_budgeted_amount' => 10000,
            'created_by' => $this->user->id,
        ]);
        $budget->lines()->create([
            'account_id' => $this->expenseAccount->id,
            'cost_centre_id' => $this->costCentre->id,
            'amount' => 10000,
        ]);

        // Pre-spend 8,000
        $accountingService = app(AccountingService::class);
        $accountingService->postAutomatedJournal($this->company->id, [
            'journal_date' => '2026-10-10',
            'description' => 'Supplies order 1',
            'lines' => [
                ['account_id' => $this->expenseAccount->id, 'cost_centre_id' => $this->costCentre->id, 'debit' => 8000, 'credit' => 0],
                ['account_id' => $this->cashAccount->id, 'debit' => 0, 'credit' => 8000],
            ],
        ], $this->user->id);

        // Check adding 1000 (total 9000 <= 10000) -> ALLOW
        $check1 = $this->actingAs($this->user)->postJson('/api/v1/financial-management/budget-controls/check', [
            'account_id' => $this->expenseAccount->id,
            'cost_centre_id' => $this->costCentre->id,
            'amount' => 1000,
        ], ['X-Company-ID' => $this->company->id]);

        $check1->assertStatus(200);
        $this->assertEquals('ALLOW', $check1->json('data.action'));

        // Check adding 3000 (total 11000 > 10000) -> BLOCK
        $check2 = $this->actingAs($this->user)->postJson('/api/v1/financial-management/budget-controls/check', [
            'account_id' => $this->expenseAccount->id,
            'cost_centre_id' => $this->costCentre->id,
            'amount' => 3000,
        ], ['X-Company-ID' => $this->company->id]);

        $check2->assertStatus(200);
        $this->assertEquals('BLOCK', $check2->json('data.action'));
    }
}
