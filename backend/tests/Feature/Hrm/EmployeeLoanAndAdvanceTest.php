<?php

namespace Tests\Feature\Hrm;

use App\Models\Account;
use App\Models\AccountingPeriod;
use App\Models\Company;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\EmployeeAdvance;
use App\Models\EmployeeLoan;
use App\Models\FiscalYear;
use App\Models\JournalEntry;
use App\Models\PayrollPeriod;
use App\Models\PayrollRun;
use App\Models\Role;
use App\Models\SalaryComponent;
use App\Models\SalaryStructure;
use App\Models\SalaryStructureItem;
use App\Models\User;
use App\Services\AccountMappingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmployeeLoanAndAdvanceTest extends TestCase
{
    use RefreshDatabase;

    protected Company $company;
    protected User $user;
    protected Employee $employee;
    protected Account $advanceAssetAccount;
    protected Account $loanAssetAccount;
    protected Account $cashBankAccount;
    protected Account $expenseAccount;
    protected Account $payableAccount;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
        $this->seed(\Database\Seeders\HrmPermissionsSeeder::class);

        $this->company = Company::factory()->create();

        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);

        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin']);
        $this->user->roles()->attach($superAdminRole->id);

        // Accounting Setup: Fiscal Year and Period
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

        // General Ledger Accounts
        $this->advanceAssetAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '1130',
            'account_name' => 'Employee Advances Receivable',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->loanAssetAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '1140',
            'account_name' => 'Employee Loans Receivable',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->cashBankAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '1010',
            'account_name' => 'Main Operating Cash',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->expenseAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '5010',
            'account_name' => 'Salaries & Wages Expense',
            'account_type' => 'EXPENSE',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->payableAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '2020',
            'account_name' => 'Salaries Payable',
            'account_type' => 'LIABILITY',
            'normal_balance' => 'CREDIT',
            'is_active' => true,
        ]);

        $mappingService = app(AccountMappingService::class);
        $mappingService->setMapping($this->company->id, AccountMappingService::ROLE_EMPLOYEE_ADVANCE_ASSET, $this->advanceAssetAccount->id);
        $mappingService->setMapping($this->company->id, AccountMappingService::ROLE_EMPLOYEE_LOAN_ASSET, $this->loanAssetAccount->id);
        $mappingService->setMapping($this->company->id, AccountMappingService::ROLE_CASH_BANK, $this->cashBankAccount->id);
        $mappingService->setMapping($this->company->id, AccountMappingService::ROLE_PAYROLL_EXPENSE, $this->expenseAccount->id);
        $mappingService->setMapping($this->company->id, AccountMappingService::ROLE_SALARIES_PAYABLE, $this->payableAccount->id);

        $dept = Department::create([
            'company_id' => $this->company->id,
            'name' => 'Accounts',
            'code' => 'ACC',
            'status' => 'ACTIVE',
        ]);

        $desig = Designation::create([
            'company_id' => $this->company->id,
            'department_id' => $dept->id,
            'name' => 'Accountant',
            'code' => 'ACT',
            'status' => 'ACTIVE',
        ]);

        $this->employee = Employee::create([
            'company_id' => $this->company->id,
            'department_id' => $dept->id,
            'designation_id' => $desig->id,
            'first_name' => 'Tanvir',
            'last_name' => 'Ahmed',
            'employee_number' => 'EMP-TANVIR-01',
            'employment_type' => 'PERMANENT',
            'joining_date' => '2025-01-01',
            'phone' => '+8801811223344',
            'email' => 'tanvir@retail.com',
            'status' => 'ACTIVE',
        ]);
    }

    public function test_employee_advance_lifecycle_with_authoritative_gl_disbursement()
    {
        // 1. Request Advance
        $requestResponse = $this->actingAs($this->user)->postJson(
            '/api/v1/employee-advances',
            [
                'employee_id' => $this->employee->id,
                'amount' => 15000,
                'request_date' => '2026-10-01',
                'reason' => 'Festival advance request',
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $requestResponse->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'SUBMITTED');

        $advanceId = $requestResponse->json('data.id');

        // 2. Approve Advance
        $approveResponse = $this->actingAs($this->user)->postJson(
            "/api/v1/employee-advances/{$advanceId}/approve",
            [],
            ['X-Company-ID' => $this->company->id]
        );

        $approveResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'APPROVED');

        // 3. Disburse Advance with GL Posting
        $disburseResponse = $this->actingAs($this->user)->postJson(
            "/api/v1/employee-advances/{$advanceId}/disburse",
            [
                'payment_method' => 'BANK_TRANSFER',
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $disburseResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'DISBURSED');

        // Verify Authoritative GL Journal Entry
        $journal = JournalEntry::where('reference_type', 'EmployeeAdvance')->where('reference_id', $advanceId)->with('lines')->first();
        $this->assertNotNull($journal);
        $this->assertEquals('POSTED', $journal->status);

        $totalDebit = (float) $journal->lines->sum('debit');
        $totalCredit = (float) $journal->lines->sum('credit');
        $this->assertEquals(15000.0, $totalDebit);
        $this->assertEquals(15000.0, $totalCredit);

        $debitLine = $journal->lines->where('account_id', $this->advanceAssetAccount->id)->first();
        $creditLine = $journal->lines->where('account_id', $this->cashBankAccount->id)->first();
        $this->assertEquals(15000.0, (float) $debitLine->debit);
        $this->assertEquals(15000.0, (float) $creditLine->credit);
    }

    public function test_employee_loan_lifecycle_with_installments_and_disbursement()
    {
        // 1. Create and Approve Loan
        $createResponse = $this->actingAs($this->user)->postJson(
            '/api/v1/employee-loans',
            [
                'employee_id' => $this->employee->id,
                'principal_amount' => 50000,
                'installment_count' => 5,
                'interest_rate_percent' => 0,
                'start_date' => '2026-10-01',
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $createResponse->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'APPROVED');

        $loanId = $createResponse->json('data.id');

        // 2. Disburse Loan
        $disburseResponse = $this->actingAs($this->user)->postJson(
            "/api/v1/employee-loans/{$loanId}/disburse",
            [
                'payment_method' => 'BANK_TRANSFER',
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $disburseResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'ACTIVE');

        // Verify Journal Entry
        $journal = JournalEntry::where('reference_type', 'EmployeeLoan')->where('reference_id', $loanId)->with('lines')->first();
        $this->assertNotNull($journal);
        $this->assertEquals(50000.0, (float) $journal->lines->sum('debit'));
        $this->assertEquals(50000.0, (float) $journal->lines->sum('credit'));

        $debitLine = $journal->lines->where('account_id', $this->loanAssetAccount->id)->first();
        $creditLine = $journal->lines->where('account_id', $this->cashBankAccount->id)->first();
        $this->assertEquals(50000.0, (float) $debitLine->debit);
        $this->assertEquals(50000.0, (float) $creditLine->credit);
    }

    public function test_payroll_run_recovers_advances_and_loans_with_balanced_gl_posting()
    {
        // 1. Setup Salary Structure: Basic = 40,000
        $basicComp = SalaryComponent::create([
            'company_id' => $this->company->id,
            'name' => 'Basic Salary',
            'code' => 'BASIC',
            'type' => 'EARNING',
            'is_taxable' => true,
        ]);

        $structure = SalaryStructure::create([
            'company_id' => $this->company->id,
            'employee_id' => $this->employee->id,
            'name' => 'Tanvir Structure',
            'code' => 'STR-TANVIR',
            'effective_from' => '2026-01-01',
            'basic_salary' => 40000,
            'gross_salary' => 40000,
            'net_salary' => 40000,
            'status' => 'ACTIVE',
        ]);

        SalaryStructureItem::create([
            'salary_structure_id' => $structure->id,
            'salary_component_id' => $basicComp->id,
            'amount' => 40000,
        ]);

        // 2. Active Advance: 5,000 disbursed
        $advance = EmployeeAdvance::create([
            'company_id' => $this->company->id,
            'employee_id' => $this->employee->id,
            'advance_number' => 'ADV-TEST-001',
            'amount' => 5000,
            'request_date' => '2026-10-01',
            'reason' => 'Emergency medical',
            'status' => 'DISBURSED',
            'outstanding_amount' => 5000,
            'recovered_amount' => 0,
        ]);

        // 3. Active Loan: 30,000 with 10,000 installment
        $loan = EmployeeLoan::create([
            'company_id' => $this->company->id,
            'employee_id' => $this->employee->id,
            'loan_number' => 'LOAN-TEST-001',
            'principal_amount' => 30000,
            'interest_rate_percent' => 0,
            'total_payable' => 30000,
            'installment_count' => 3,
            'installment_amount' => 10000,
            'start_date' => '2026-10-01',
            'status' => 'ACTIVE',
            'outstanding_balance' => 30000,
            'total_recovered' => 0,
        ]);

        // 4. Payroll Period & Run
        $period = PayrollPeriod::create([
            'company_id' => $this->company->id,
            'name' => 'October 2026',
            'period_start' => '2026-10-01',
            'period_end' => '2026-10-31',
            'payment_due_date' => '2026-10-31',
            'status' => 'OPEN',
        ]);

        $run = PayrollRun::create([
            'company_id' => $this->company->id,
            'payroll_period_id' => $period->id,
            'run_number' => 'RUN-2026-10-001',
            'status' => 'DRAFT',
        ]);

        // 5. Calculate Payroll Run
        $calcResponse = $this->actingAs($this->user)->postJson(
            "/api/v1/payroll/runs/{$run->id}/calculate",
            [],
            ['X-Company-ID' => $this->company->id]
        );

        $calcResponse->assertStatus(200)
            ->assertJsonPath('data.status', 'CALCULATED')
            ->assertJsonPath('data.total_gross', 40000)
            ->assertJsonPath('data.total_advance_repayments', 5000)
            ->assertJsonPath('data.total_loan_repayments', 10000)
            ->assertJsonPath('data.total_deductions', 15000)
            ->assertJsonPath('data.total_net', 25000); // 40,000 - 15,000

        // 6. Approve & Post Payroll Run
        $this->actingAs($this->user)->postJson("/api/v1/payroll/runs/{$run->id}/approve", [], ['X-Company-ID' => $this->company->id])->assertStatus(200);
        $postResponse = $this->actingAs($this->user)->postJson("/api/v1/payroll/runs/{$run->id}/post", [], ['X-Company-ID' => $this->company->id]);
        $postResponse->assertStatus(200)->assertJsonPath('data.status', 'POSTED');

        // 7. Verify Authoritative GL Posting Invariant
        $journal = JournalEntry::where('reference_type', 'PayrollRun')->where('reference_id', $run->id)->with('lines')->first();
        $this->assertNotNull($journal);

        $totalDebit = (float) $journal->lines->sum('debit');
        $totalCredit = (float) $journal->lines->sum('credit');
        $this->assertEquals(40000.0, $totalDebit);
        $this->assertEquals(40000.0, $totalCredit);

        // Expense = 40,000 Debit
        $expenseLine = $journal->lines->where('account_id', $this->expenseAccount->id)->first();
        $this->assertEquals(40000.0, (float) $expenseLine->debit);

        // Payable = 25,000 Credit
        $payableLine = $journal->lines->where('account_id', $this->payableAccount->id)->first();
        $this->assertEquals(25000.0, (float) $payableLine->credit);

        // Advance Recovery = 5,000 Credit
        $advLine = $journal->lines->where('account_id', $this->advanceAssetAccount->id)->first();
        $this->assertEquals(5000.0, (float) $advLine->credit);

        // Loan Recovery = 10,000 Credit
        $loanLine = $journal->lines->where('account_id', $this->loanAssetAccount->id)->first();
        $this->assertEquals(10000.0, (float) $loanLine->credit);

        // Verify balances updated on models
        $advance->refresh();
        $this->assertEquals(0.0, (float) $advance->outstanding_amount);
        $this->assertEquals(5000.0, (float) $advance->recovered_amount);
        $this->assertEquals('SETTLED', $advance->status);

        $loan->refresh();
        $this->assertEquals(20000.0, (float) $loan->outstanding_balance);
        $this->assertEquals(10000.0, (float) $loan->total_recovered);
    }

    public function test_hrm_and_payroll_dashboard_metrics()
    {
        $hrDashboard = $this->actingAs($this->user)->getJson('/api/v1/hrm/dashboard', ['X-Company-ID' => $this->company->id]);
        $hrDashboard->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'total_employees',
                    'active_employees',
                    'new_joiners',
                    'resigned_employees',
                    'attendance_today' => [
                        'date',
                        'present',
                        'late',
                        'absent',
                        'on_leave',
                    ],
                    'pending_leave_applications',
                    'pending_payroll_runs',
                    'outstanding_advances',
                    'outstanding_loans',
                ]
            ]);

        $payrollDashboard = $this->actingAs($this->user)->getJson('/api/v1/hrm/payroll-dashboard', ['X-Company-ID' => $this->company->id]);
        $payrollDashboard->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'latest_run',
                    'ytd_gross_payroll',
                    'ytd_net_payroll',
                ]
            ]);
    }
}
