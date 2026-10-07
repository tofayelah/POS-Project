<?php

namespace Tests\Feature\Hrm;

use App\Models\Account;
use App\Models\AccountingPeriod;
use App\Models\Company;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\FiscalYear;
use App\Models\JournalEntry;
use App\Models\LeaveApplication;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use App\Models\PayrollPeriod;
use App\Models\PayrollRun;
use App\Models\Role;
use App\Models\SalaryComponent;
use App\Models\SalaryStructure;
use App\Models\SalaryStructureItem;
use App\Models\User;
use App\Services\AccountMappingService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LeaveAndPayrollAccountingTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Company $company;
    protected Employee $employee;
    protected Account $expenseAccount;
    protected Account $payableAccount;
    protected Account $taxAccount;
    protected Account $cashAccount;

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

        $this->taxAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '2030',
            'account_name' => 'Tax Withholding Payable',
            'account_type' => 'LIABILITY',
            'normal_balance' => 'CREDIT',
            'is_active' => true,
        ]);

        $this->cashAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '1010',
            'account_name' => 'Cash and Cash Equivalents',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        // Account Mappings
        $mappingService = app(AccountMappingService::class);
        $mappingService->setMapping($this->company->id, AccountMappingService::ROLE_PAYROLL_EXPENSE, $this->expenseAccount->id);
        $mappingService->setMapping($this->company->id, AccountMappingService::ROLE_SALARIES_PAYABLE, $this->payableAccount->id);
        $mappingService->setMapping($this->company->id, AccountMappingService::ROLE_TAX_WITHHOLDING_PAYABLE, $this->taxAccount->id);
        $mappingService->setMapping($this->company->id, AccountMappingService::ROLE_CASH_BANK, $this->cashAccount->id);

        // Employee Setup
        $dept = Department::create(['company_id' => $this->company->id, 'name' => 'Accounts', 'code' => 'ACC']);
        $desig = Designation::create(['company_id' => $this->company->id, 'department_id' => $dept->id, 'name' => 'Accountant', 'code' => 'ACC-1']);

        $this->employee = Employee::create([
            'company_id' => $this->company->id,
            'employee_number' => 'EMP-100',
            'first_name' => 'Anisur',
            'last_name' => 'Rahman',
            'email' => 'anisur@retailcore.local',
            'department_id' => $dept->id,
            'designation_id' => $desig->id,
            'joining_date' => '2026-01-01',
            'employment_status' => 'ACTIVE',
        ]);
    }

    public function test_leave_application_lifecycle_and_balance_deduction()
    {
        // 1. Create Leave Type
        $leaveTypeResponse = $this->actingAs($this->user)->postJson(
            '/api/v1/leave-types',
            [
                'name' => 'Casual Leave',
                'code' => 'CL',
                'days_allowed_per_year' => 14,
                'is_paid' => true,
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $leaveTypeResponse->assertStatus(201)
            ->assertJsonPath('success', true);

        $leaveTypeId = $leaveTypeResponse->json('data.id');

        // Set initial leave balance
        LeaveBalance::create([
            'company_id' => $this->company->id,
            'employee_id' => $this->employee->id,
            'leave_type_id' => $leaveTypeId,
            'year' => 2026,
            'entitled_days' => 14,
            'taken_days' => 0,
            'pending_days' => 0,
            'remaining_days' => 14,
        ]);

        // 2. Submit Leave Application (3 days: 2026-10-10 to 2026-10-12)
        $applyResponse = $this->actingAs($this->user)->postJson(
            '/api/v1/leave-applications',
            [
                'employee_id' => $this->employee->id,
                'leave_type_id' => $leaveTypeId,
                'from_date' => '2026-10-10',
                'to_date' => '2026-10-12',
                'reason' => 'Family event',
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $applyResponse->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'SUBMITTED')
            ->assertJsonPath('data.days_applied', 3);

        $appId = $applyResponse->json('data.id');

        // 3. Approve Leave Application
        $approveResponse = $this->actingAs($this->user)->postJson(
            "/api/v1/leave-applications/{$appId}/approve",
            [],
            ['X-Company-ID' => $this->company->id]
        );

        $approveResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'APPROVED');

        // Assert balance deducted: taken = 3, remaining = 11
        $balance = LeaveBalance::where('employee_id', $this->employee->id)->where('leave_type_id', $leaveTypeId)->first();
        $this->assertEquals(3, (int) $balance->taken_days);
        $this->assertEquals(11, (int) $balance->remaining_days);
    }

    public function test_salary_structure_and_payroll_lifecycle_with_authoritative_gl_posting()
    {
        // 1. Create Salary Components (Basic, House Rent, Tax)
        $compBasic = SalaryComponent::create([
            'company_id' => $this->company->id,
            'name' => 'Basic Salary',
            'code' => 'BASIC',
            'type' => 'EARNING',
            'is_taxable' => true,
        ]);

        $compHra = SalaryComponent::create([
            'company_id' => $this->company->id,
            'name' => 'House Rent Allowance',
            'code' => 'HRA',
            'type' => 'EARNING',
            'is_taxable' => false,
        ]);

        $compTax = SalaryComponent::create([
            'company_id' => $this->company->id,
            'name' => 'Income Tax Withholding',
            'code' => 'TAX',
            'type' => 'DEDUCTION',
            'is_taxable' => false,
        ]);

        // 2. Create Salary Structure
        $structureResponse = $this->actingAs($this->user)->postJson(
            '/api/v1/salary-structures',
            [
                'name' => 'Executive Officer Grade 1',
                'code' => 'EOG-1',
                'items' => [
                    [
                        'component_id' => $compBasic->id,
                        'calculation_type' => 'FLAT',
                        'value' => 30000,
                    ],
                    [
                        'component_id' => $compHra->id,
                        'calculation_type' => 'PERCENTAGE_OF_BASIC',
                        'value' => 50, // 50% of 30,000 = 15,000
                    ],
                    [
                        'component_id' => $compTax->id,
                        'calculation_type' => 'FLAT',
                        'value' => 2000,
                    ],
                ],
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $structureResponse->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.base_gross', 45000); // 30,000 + 15,000

        $structureId = $structureResponse->json('data.id');

        // Assign structure to employee
        $this->actingAs($this->user)->postJson(
            '/api/v1/salary-structures/assign',
            [
                'employee_id' => $this->employee->id,
                'salary_structure_id' => $structureId,
                'effective_from' => '2026-01-01',
            ],
            ['X-Company-ID' => $this->company->id]
        )->assertStatus(200);

        // 3. Create Payroll Period
        $periodResponse = $this->actingAs($this->user)->postJson(
            '/api/v1/payroll/periods',
            [
                'name' => 'October 2026 Payroll',
                'code' => 'PAY-2026-10',
                'period_type' => 'MONTHLY',
                'start_date' => '2026-10-01',
                'end_date' => '2026-10-31',
                'cutoff_date' => '2026-10-25',
                'payout_date' => '2026-10-31',
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $periodResponse->assertStatus(201)
            ->assertJsonPath('success', true);

        $periodId = $periodResponse->json('data.id');

        // 4. Create Payroll Run
        $runResponse = $this->actingAs($this->user)->postJson(
            '/api/v1/payroll/runs',
            [
                'payroll_period_id' => $periodId,
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $runResponse->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'DRAFT');

        $runId = $runResponse->json('data.id');

        // 5. Calculate Payroll Run
        $calcResponse = $this->actingAs($this->user)->postJson(
            "/api/v1/payroll/runs/{$runId}/calculate",
            [],
            ['X-Company-ID' => $this->company->id]
        );

        $calcResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'CALCULATED')
            ->assertJsonPath('data.total_gross', 45000)
            ->assertJsonPath('data.total_deductions', 2000)
            ->assertJsonPath('data.total_net', 43000);

        // Assert zero General Ledger side-effects during calculation
        $this->assertEquals(0, JournalEntry::where('reference_type', 'PayrollRun')->where('reference_id', $runId)->count());

        // 6. Approve Payroll Run
        $approveResponse = $this->actingAs($this->user)->postJson(
            "/api/v1/payroll/runs/{$runId}/approve",
            [],
            ['X-Company-ID' => $this->company->id]
        );

        $approveResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'APPROVED');

        // 7. Post Payroll Run to General Ledger
        $postResponse = $this->actingAs($this->user)->postJson(
            "/api/v1/payroll/runs/{$runId}/post",
            [],
            ['X-Company-ID' => $this->company->id]
        );

        $postResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'POSTED');

        // Verify Authoritative GL Journal Entry
        $journal = JournalEntry::where('reference_type', 'PayrollRun')->where('reference_id', $runId)->with('lines')->first();
        $this->assertNotNull($journal);
        $this->assertEquals('POSTED', $journal->status);

        // Invariant: sum(debit) == sum(credit) == 45,000
        $totalDebit = (float) $journal->lines->sum('debit');
        $totalCredit = (float) $journal->lines->sum('credit');
        $this->assertEquals(45000.0, $totalDebit);
        $this->assertEquals(45000.0, $totalCredit);

        // Verify Debits: Expense = 45,000
        $expenseLine = $journal->lines->where('account_id', $this->expenseAccount->id)->first();
        $this->assertNotNull($expenseLine);
        $this->assertEquals(45000.0, (float) $expenseLine->debit);

        // Verify Credits: Salaries Payable = 43,000, Tax = 2,000
        $payableLine = $journal->lines->where('account_id', $this->payableAccount->id)->first();
        $this->assertNotNull($payableLine);
        $this->assertEquals(43000.0, (float) $payableLine->credit);

        $taxLine = $journal->lines->where('account_id', $this->taxAccount->id)->first();
        $this->assertNotNull($taxLine);
        $this->assertEquals(2000.0, (float) $taxLine->credit);

        // Invariant: Idempotency check — posting again must fail with 409
        $secondPostResponse = $this->actingAs($this->user)->postJson(
            "/api/v1/payroll/runs/{$runId}/post",
            [],
            ['X-Company-ID' => $this->company->id]
        );
        $secondPostResponse->assertStatus(409);

        // 8. Payout / Settle Payroll Run
        $settleResponse = $this->actingAs($this->user)->postJson(
            "/api/v1/payroll/runs/{$runId}/settle",
            [
                'payment_method' => 'BANK_TRANSFER',
                'amount' => 43000,
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $settleResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'PAID')
            ->assertJsonPath('data.total_paid', 43000);
    }
}
