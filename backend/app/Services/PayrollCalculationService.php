<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\AuditLog;
use App\Models\Employee;
use App\Models\EmployeeAdvance;
use App\Models\EmployeeLoan;
use App\Models\LeaveApplication;
use App\Models\PayrollItem;
use App\Models\PayrollPeriod;
use App\Models\PayrollRun;
use App\Models\SalaryStructure;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class PayrollCalculationService
{
    public function __construct(
        protected SalaryService $salaryService
    ) {}

    // ==========================================
    // PAYROLL PERIODS
    // ==========================================

    public function listPeriods(int $companyId)
    {
        return PayrollPeriod::where('company_id', $companyId)->orderByDesc('period_start')->get();
    }

    public function createPeriod(int $companyId, array $data, ?int $userId = null): PayrollPeriod
    {
        $start = $data['period_start'];
        $end = $data['period_end'];

        // Prevent overlapping periods for same company
        $overlap = PayrollPeriod::where('company_id', $companyId)
            ->where(function ($q) use ($start, $end) {
                $q->whereBetween('period_start', [$start, $end])
                  ->orWhereBetween('period_end', [$start, $end])
                  ->orWhere(function ($sub) use ($start, $end) {
                      $sub->where('period_start', '<=', $start)
                          ->where('period_end', '>=', $end);
                  });
            })
            ->exists();

        if ($overlap) {
            throw new ConflictHttpException("Payroll period dates overlap with an existing period.");
        }

        $period = PayrollPeriod::create([
            'company_id' => $companyId,
            'name' => $data['name'],
            'period_start' => $start,
            'period_end' => $end,
            'payment_due_date' => $data['payment_due_date'] ?? null,
            'status' => 'DRAFT',
            'notes' => $data['notes'] ?? null,
            'created_by' => $userId,
        ]);

        AuditLog::log($companyId, $userId, 'PAYROLL_PERIOD_CREATED', $period->id, 'PayrollPeriod', "Created payroll period {$period->name} ({$start} to {$end})");

        return $period;
    }

    // ==========================================
    // PAYROLL CALCULATION
    // ==========================================

    public function calculatePayroll(int $companyId, int $periodId, array $options = [], ?int $userId = null): PayrollRun
    {
        return DB::transaction(function () use ($companyId, $periodId, $options, $userId) {
            $period = PayrollPeriod::where('company_id', $companyId)->lockForUpdate()->findOrFail($periodId);

            if (in_array($period->status, ['POSTED', 'PAID'])) {
                throw new ConflictHttpException("Cannot calculate payroll for a {$period->status} period.");
            }

            // Find or create payroll run
            $run = PayrollRun::where('company_id', $companyId)
                ->where('payroll_period_id', $period->id)
                ->lockForUpdate()
                ->first();

            if ($run && in_array($run->status, ['POSTED', 'PAID'])) {
                throw new ConflictHttpException("Cannot recalculate payroll run #{$run->run_number} because it is already {$run->status}.");
            }

            if (!$run) {
                $count = PayrollRun::where('company_id', $companyId)->count() + 1;
                $runNumber = 'PAYROLL-' . Carbon::parse($period->period_start)->format('Ym') . '-' . str_pad($count, 3, '0', STR_PAD_LEFT);

                $run = PayrollRun::create([
                    'company_id' => $companyId,
                    'payroll_period_id' => $period->id,
                    'run_number' => $runNumber,
                    'status' => 'CALCULATING',
                    'calculated_by' => $userId,
                    'calculated_at' => now(),
                ]);
            } else {
                $run->status = 'CALCULATING';
                $run->save();
                // Clear previous unposted calculation items
                $run->items()->delete();
            }

            // Target employees
            $empQuery = Employee::where('company_id', $companyId)
                ->whereIn('employment_status', ['ACTIVE', 'ON_LEAVE']);

            if (!empty($options['branch_id'])) {
                $empQuery->where('branch_id', $options['branch_id']);
            }
            if (!empty($options['department_id'])) {
                $empQuery->where('department_id', $options['department_id']);
            }

            $employees = $empQuery->get();

            $totalBasic = 0;
            $totalAllowances = 0;
            $totalOvertime = 0;
            $totalBonuses = 0;
            $totalGross = 0;
            $totalDeductions = 0;
            $totalLoanRepayments = 0;
            $totalAdvanceRepayments = 0;
            $totalNet = 0;

            foreach ($employees as $employee) {
                $structure = $this->salaryService->getEmployeeStructure($companyId, $employee->id);
                if (!$structure) {
                    continue; // Skip employee without configured salary structure
                }

                $basicSalary = (float) $structure->basic_salary;
                $allowances = 0;
                $fixedDeductions = 0;
                $taxDeduction = 0;
                $breakdownEarnings = [];
                $breakdownDeductions = [];

                foreach ($structure->items as $item) {
                    $comp = $item->component;
                    $amt = (float) $item->amount;

                    if ($comp->type === 'EARNING') {
                        if ($comp->code === 'BASIC' || str_contains(strtoupper($comp->name), 'BASIC')) {
                            // Basic salary is already tracked as $basicSalary
                        } else {
                            $allowances += $amt;
                        }
                        $breakdownEarnings[] = [
                            'name' => $comp->name,
                            'code' => $comp->code,
                            'amount' => $amt,
                        ];
                    } else {
                        if ($comp->code === 'TAX') {
                            $taxDeduction += $amt;
                        } else {
                            $fixedDeductions += $amt;
                        }
                        $breakdownDeductions[] = [
                            'name' => $comp->name,
                            'code' => $comp->code,
                            'amount' => $amt,
                        ];
                    }
                }

                // 1. Overtime Calculation
                $totalOtMinutes = (int) Attendance::where('company_id', $companyId)
                    ->where('employee_id', $employee->id)
                    ->whereBetween('attendance_date', [$period->period_start, $period->period_end])
                    ->sum('overtime_minutes');

                // Standard monthly working hours = 208 hrs (26 days * 8 hrs)
                // OT Rate = (Basic / 208) * 1.5
                $hourlyRate = $basicSalary > 0 ? round(($basicSalary / 208) * 1.5, 4) : 0;
                $overtimeAmount = round(($totalOtMinutes / 60) * $hourlyRate, 4);

                // 2. Unpaid Leave Deduction
                $unpaidLeaveDays = (float) LeaveApplication::where('company_id', $companyId)
                    ->where('employee_id', $employee->id)
                    ->where('status', 'APPROVED')
                    ->whereHas('leaveType', fn($q) => $q->where('is_paid', false))
                    ->whereBetween('from_date', [$period->period_start, $period->period_end])
                    ->sum('days');

                $dailyRate = round($basicSalary / 30, 4);
                $unpaidLeaveDeduction = round($unpaidLeaveDays * $dailyRate, 4);

                // 3. Employee Loan Monthly Installment
                $loanDeduction = 0;
                $activeLoan = EmployeeLoan::where('company_id', $companyId)
                    ->where('employee_id', $employee->id)
                    ->whereIn('status', ['APPROVED', 'DISBURSED', 'ACTIVE'])
                    ->where('outstanding_balance', '>', 0)
                    ->orderBy('id', 'asc')
                    ->first();

                if ($activeLoan) {
                    $loanDeduction = min((float) $activeLoan->installment_amount, (float) $activeLoan->outstanding_balance);
                }

                // 4. Employee Advance Deduction
                $advanceDeduction = 0;
                $activeAdvance = EmployeeAdvance::where('company_id', $companyId)
                    ->where('employee_id', $employee->id)
                    ->whereIn('status', ['APPROVED', 'DISBURSED', 'PARTIALLY_SETTLED'])
                    ->where('outstanding_amount', '>', 0)
                    ->orderBy('id', 'asc')
                    ->first();

                if ($activeAdvance) {
                    // Recover up to available remainder
                    $prelimNet = ($basicSalary + $allowances + $overtimeAmount) - ($unpaidLeaveDeduction + $loanDeduction + $fixedDeductions + $taxDeduction);
                    $advanceDeduction = max(0, min((float) $activeAdvance->outstanding_amount, $prelimNet));
                }

                $bonusAmount = (float) ($options['bonus_amounts'][$employee->id] ?? 0);

                // Totals for employee
                $empGross = round($basicSalary + $allowances + $overtimeAmount + $bonusAmount, 4);
                $empDeductions = round($unpaidLeaveDeduction + $loanDeduction + $advanceDeduction + $taxDeduction + $fixedDeductions, 4);
                $empNet = max(0, round($empGross - $empDeductions, 4));

                $itemBreakdown = [
                    'basic_salary' => $basicSalary,
                    'earnings' => $breakdownEarnings,
                    'allowances_total' => $allowances,
                    'overtime' => [
                        'minutes' => $totalOtMinutes,
                        'hourly_rate' => $hourlyRate,
                        'amount' => $overtimeAmount,
                    ],
                    'bonus' => $bonusAmount,
                    'gross' => $empGross,
                    'deductions' => $breakdownDeductions,
                    'unpaid_leave' => [
                        'days' => $unpaidLeaveDays,
                        'amount' => $unpaidLeaveDeduction,
                    ],
                    'loan_recovery' => [
                        'loan_id' => $activeLoan?->id,
                        'amount' => $loanDeduction,
                    ],
                    'advance_recovery' => [
                        'advance_id' => $activeAdvance?->id,
                        'amount' => $advanceDeduction,
                    ],
                    'tax' => $taxDeduction,
                    'total_deductions' => $empDeductions,
                    'net_pay' => $empNet,
                ];

                PayrollItem::create([
                    'payroll_run_id' => $run->id,
                    'employee_id' => $employee->id,
                    'salary_structure_id' => $structure->id,
                    'basic_salary_snapshot' => $basicSalary,
                    'allowances_total_snapshot' => $allowances,
                    'overtime_minutes_snapshot' => $totalOtMinutes,
                    'overtime_amount_snapshot' => $overtimeAmount,
                    'bonus_amount_snapshot' => $bonusAmount,
                    'gross_amount' => $empGross,
                    'unpaid_leave_days_snapshot' => $unpaidLeaveDays,
                    'unpaid_leave_deduction_snapshot' => $unpaidLeaveDeduction,
                    'loan_deduction_snapshot' => $loanDeduction,
                    'advance_deduction_snapshot' => $advanceDeduction,
                    'tax_deduction_snapshot' => $taxDeduction,
                    'other_deductions_total_snapshot' => $fixedDeductions,
                    'total_deductions' => $empDeductions,
                    'net_amount' => $empNet,
                    'paid_amount' => 0,
                    'due_amount' => $empNet,
                    'payment_status' => 'UNPAID',
                    'breakdown_json' => $itemBreakdown,
                ]);

                $totalBasic += $basicSalary;
                $totalAllowances += $allowances;
                $totalOvertime += $overtimeAmount;
                $totalBonuses += $bonusAmount;
                $totalGross += $empGross;
                $totalDeductions += $empDeductions;
                $totalLoanRepayments += $loanDeduction;
                $totalAdvanceRepayments += $advanceDeduction;
                $totalNet += $empNet;
            }

            $run->update([
                'status' => 'CALCULATED',
                'total_basic' => $totalBasic,
                'total_allowances' => $totalAllowances,
                'total_overtime' => $totalOvertime,
                'total_bonuses' => $totalBonuses,
                'total_gross' => $totalGross,
                'total_deductions' => $totalDeductions,
                'total_loan_repayments' => $totalLoanRepayments,
                'total_advance_repayments' => $totalAdvanceRepayments,
                'total_net' => $totalNet,
                'total_paid' => 0,
                'total_outstanding' => $totalNet,
                'calculated_by' => $userId,
                'calculated_at' => now(),
            ]);

            $period->update(['status' => 'CALCULATED']);

            AuditLog::log(
                $companyId,
                $userId,
                'PAYROLL_CALCULATED',
                $run->id,
                'PayrollRun',
                "Calculated payroll run {$run->run_number} for period {$period->name}: Gross ৳{$totalGross}, Net ৳{$totalNet}"
            );

            return $run->fresh(['items.employee.department', 'items.employee.designation', 'period']);
        });
    }

    public function approvePayroll(int $companyId, int $payrollRunId, int $userId): PayrollRun
    {
        return DB::transaction(function () use ($companyId, $payrollRunId, $userId) {
            $run = PayrollRun::where('company_id', $companyId)->lockForUpdate()->findOrFail($payrollRunId);

            if ($run->status === 'APPROVED') {
                return $run;
            }
            if ($run->status !== 'CALCULATED') {
                throw new ConflictHttpException("Cannot approve payroll run with status '{$run->status}'. Must be CALCULATED.");
            }

            $run->update([
                'status' => 'APPROVED',
                'approved_by' => $userId,
                'approved_at' => now(),
            ]);

            $run->period->update(['status' => 'APPROVED']);

            AuditLog::log(
                $companyId,
                $userId,
                'PAYROLL_APPROVED',
                $run->id,
                'PayrollRun',
                "Approved payroll run {$run->run_number}"
            );

            return $run->fresh(['items', 'period']);
        });
    }
}
