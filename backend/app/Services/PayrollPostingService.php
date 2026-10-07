<?php

namespace App\Services;

use App\Models\Account;
use App\Models\AuditLog;
use App\Models\EmployeeAdvance;
use App\Models\EmployeeAdvanceRepayment;
use App\Models\EmployeeLoan;
use App\Models\EmployeeLoanRepayment;
use App\Models\PayrollItem;
use App\Models\PayrollRun;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class PayrollPostingService
{
    public function __construct(
        protected AccountingService $accountingService,
        protected AccountMappingService $accountMappingService
    ) {}

    /**
     * Post approved payroll run to General Ledger atomically and idempotently.
     */
    public function postPayroll(int $companyId, int $payrollRunId, int $userId, ?string $idempotencyKey = null): PayrollRun
    {
        $idempKey = $idempotencyKey ?? "PAYROLL-POST-{$payrollRunId}";

        return DB::transaction(function () use ($companyId, $payrollRunId, $userId, $idempKey) {
            $run = PayrollRun::where('company_id', $companyId)->lockForUpdate()->findOrFail($payrollRunId);

            if ($run->status === 'POSTED') {
                throw new ConflictHttpException("Payroll run is already posted to General Ledger.");
            }
            if ($run->status !== 'APPROVED') {
                throw new ConflictHttpException("Cannot post payroll run with status '{$run->status}'. Must be APPROVED.");
            }

            if ($run->journal_entry_id) {
                return $run->load(['items', 'period', 'journalEntry']);
            }

            $grossTotal = round((float) $run->total_gross, 4);
            $netTotal = round((float) $run->total_net, 4);
            $advanceTotal = round((float) $run->total_advance_repayments, 4);
            $loanTotal = round((float) $run->total_loan_repayments, 4);
            $otherDeductions = max(0, round($grossTotal - ($netTotal + $advanceTotal + $loanTotal), 4));

            // Resolve mapped accounts or sensible fallbacks from active COA
            $expenseAccount = $this->resolveAccount($companyId, AccountMappingService::ROLE_PAYROLL_EXPENSE, 'EXPENSE');
            $payableAccount = $this->resolveAccount($companyId, AccountMappingService::ROLE_SALARIES_PAYABLE, 'LIABILITY');
            $advanceAccount = $this->resolveAccount($companyId, AccountMappingService::ROLE_EMPLOYEE_ADVANCE_ASSET, 'ASSET');
            $loanAccount = $this->resolveAccount($companyId, AccountMappingService::ROLE_EMPLOYEE_LOAN_ASSET, 'ASSET');
            $taxAccount = $this->resolveAccount($companyId, AccountMappingService::ROLE_TAX_WITHHOLDING_PAYABLE, 'LIABILITY');

            $journalLines = [];

            // 1. DEBIT: Payroll / Salary Expense (Gross Amount)
            $journalLines[] = [
                'account_id' => $expenseAccount->id,
                'debit' => $grossTotal,
                'credit' => 0,
                'description' => "Gross salary expense for payroll run {$run->run_number}",
            ];

            // 2. CREDIT: Salaries Payable (Net Amount to be paid out)
            $journalLines[] = [
                'account_id' => $payableAccount->id,
                'debit' => 0,
                'credit' => $netTotal,
                'description' => "Net salaries payable for payroll run {$run->run_number}",
            ];

            // 3. CREDIT: Employee Advance Recovery
            if ($advanceTotal > 0) {
                $journalLines[] = [
                    'account_id' => $advanceAccount->id,
                    'debit' => 0,
                    'credit' => $advanceTotal,
                    'description' => "Employee advance recovery from payroll {$run->run_number}",
                ];
            }

            // 4. CREDIT: Employee Loan Recovery
            if ($loanTotal > 0) {
                $journalLines[] = [
                    'account_id' => $loanAccount->id,
                    'debit' => 0,
                    'credit' => $loanTotal,
                    'description' => "Employee loan recovery from payroll {$run->run_number}",
                ];
            }

            // 5. CREDIT: Tax Withholding / Other Deductions
            if ($otherDeductions > 0) {
                $journalLines[] = [
                    'account_id' => $taxAccount->id,
                    'debit' => 0,
                    'credit' => $otherDeductions,
                    'description' => "Tax and statutory deductions for payroll run {$run->run_number}",
                ];
            }

            $period = $run->period;
            $journalData = [
                'journal_date' => $period->period_end ? (is_string($period->period_end) ? $period->period_end : $period->period_end->format('Y-m-d')) : date('Y-m-d'),
                'reference_type' => 'PayrollRun',
                'reference_id' => $run->id,
                'description' => "Payroll posting for {$run->run_number} ({$period->name})",
                'source' => 'PAYROLL',
                'idempotency_key' => $idempKey,
                'lines' => $journalLines,
            ];

            // Post automated GL journal
            $journal = $this->accountingService->postAutomatedJournal($companyId, $journalData, $userId);

            // Execute subledger recoveries for advances and loans
            $items = $run->items()->get();
            $repaymentDate = date('Y-m-d');

            foreach ($items as $item) {
                $breakdown = $item->breakdown_json ?? [];

                // Advance Recovery
                $advRecovery = (float) ($item->advance_deduction_snapshot ?? 0);
                if ($advRecovery > 0) {
                    $advId = $breakdown['advance_recovery']['advance_id'] ?? null;
                    if ($advId) {
                        $advance = EmployeeAdvance::where('company_id', $companyId)->find($advId);
                        if ($advance) {
                            $advance->outstanding_amount = max(0, (float) $advance->outstanding_amount - $advRecovery);
                            $advance->recovered_amount += $advRecovery;
                            if ($advance->outstanding_amount <= 0.0001) {
                                $advance->status = 'SETTLED';
                            } else {
                                $advance->status = 'PARTIALLY_SETTLED';
                            }
                            $advance->save();

                            EmployeeAdvanceRepayment::create([
                                'employee_advance_id' => $advance->id,
                                'payroll_item_id' => $item->id,
                                'amount' => $advRecovery,
                                'repayment_date' => $repaymentDate,
                                'notes' => "Payroll deduction from {$run->run_number}",
                                'created_at' => now(),
                            ]);
                        }
                    }
                }

                // Loan Recovery
                $loanRecovery = (float) ($item->loan_deduction_snapshot ?? 0);
                if ($loanRecovery > 0) {
                    $loanId = $breakdown['loan_recovery']['loan_id'] ?? null;
                    if ($loanId) {
                        $loan = EmployeeLoan::where('company_id', $companyId)->find($loanId);
                        if ($loan) {
                            $loan->outstanding_balance = max(0, (float) $loan->outstanding_balance - $loanRecovery);
                            $loan->total_recovered += $loanRecovery;
                            if ($loan->outstanding_balance <= 0.0001) {
                                $loan->status = 'SETTLED';
                            }
                            $loan->save();

                            EmployeeLoanRepayment::create([
                                'employee_loan_id' => $loan->id,
                                'payroll_item_id' => $item->id,
                                'amount' => $loanRecovery,
                                'repayment_date' => $repaymentDate,
                                'notes' => "Payroll deduction from {$run->run_number}",
                                'created_at' => now(),
                            ]);
                        }
                    }
                }
            }

            $run->update([
                'status' => 'POSTED',
                'journal_entry_id' => $journal->id,
                'posted_by' => $userId,
                'posted_at' => now(),
                'idempotency_key' => $idempKey,
            ]);

            $period->update(['status' => 'POSTED']);

            AuditLog::log(
                $companyId,
                $userId,
                'PAYROLL_POSTED',
                $run->id,
                'PayrollRun',
                "Posted payroll run {$run->run_number} to General Ledger (Journal: {$journal->journal_number})"
            );

            return $run->fresh(['items', 'period', 'journalEntry.lines']);
        });
    }

    /**
     * Resolve account from setting mapping or fall back to first active account of specified type.
     */
    protected function resolveAccount(int $companyId, string $role, string $fallbackType): Account
    {
        if ($this->accountMappingService->isConfigured($companyId, $role)) {
            return $this->accountMappingService->getAccount($companyId, $role);
        }

        $fallback = Account::where('company_id', $companyId)
            ->where('account_type', $fallbackType)
            ->where('is_active', true)
            ->first();

        if ($fallback) {
            return $fallback;
        }

        throw new ConflictHttpException("No active account found for role '{$role}' or fallback type '{$fallbackType}' in company {$companyId}.");
    }
}
