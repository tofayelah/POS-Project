<?php

namespace App\Services;

use App\Models\Account;
use App\Models\AuditLog;
use App\Models\Employee;
use App\Models\EmployeeLoan;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class EmployeeLoanService
{
    public function __construct(
        protected AccountingService $accountingService,
        protected AccountMappingService $accountMappingService
    ) {}

    public function listLoans(int $companyId, array $filters = [])
    {
        $query = EmployeeLoan::where('company_id', $companyId)
            ->with(['employee.department', 'employee.designation', 'approver', 'repayments']);

        if (!empty($filters['employee_id'])) {
            $query->where('employee_id', $filters['employee_id']);
        }
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        $limit = isset($filters['limit']) ? (int) $filters['limit'] : 25;
        return $query->orderByDesc('id')->paginate($limit);
    }

    public function createLoan(int $companyId, array $data, ?int $userId = null): EmployeeLoan
    {
        $employee = Employee::where('company_id', $companyId)->findOrFail($data['employee_id']);
        $principal = round((float) $data['principal_amount'], 4);
        $installments = (int) $data['installment_count'];
        $interestPct = (float) ($data['interest_rate_percent'] ?? 0);

        if ($principal <= 0 || $installments <= 0) {
            throw new ConflictHttpException("Principal amount and installment count must be greater than zero.");
        }

        $totalPayable = round($principal * (1 + ($interestPct / 100)), 4);
        $installmentAmount = round($totalPayable / $installments, 4);

        $count = EmployeeLoan::where('company_id', $companyId)->count() + 1;
        $loanNumber = 'LOAN-' . date('Ym') . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

        $loan = EmployeeLoan::create([
            'company_id' => $companyId,
            'employee_id' => $employee->id,
            'loan_number' => $loanNumber,
            'principal_amount' => $principal,
            'interest_rate_percent' => $interestPct,
            'total_payable' => $totalPayable,
            'installment_count' => $installments,
            'installment_amount' => $installmentAmount,
            'start_date' => $data['start_date'] ?? date('Y-m-d'),
            'status' => 'APPROVED',
            'outstanding_balance' => $totalPayable,
            'total_recovered' => 0,
            'approved_by' => $userId,
            'approved_at' => now(),
        ]);

        AuditLog::log(
            $companyId,
            $userId,
            'LOAN_CREATED',
            $loan->id,
            'EmployeeLoan',
            "Approved loan {$loanNumber} for employee {$employee->employee_number}: Principal ৳{$principal}, {$installments} installments of ৳{$installmentAmount}"
        );

        return $loan->load('employee');
    }

    /**
     * Disburse approved loan and post General Ledger journal: DR Employee Loan Asset, CR Cash/Bank.
     */
    public function disburseLoan(int $companyId, int $loanId, array $data, int $userId): EmployeeLoan
    {
        return DB::transaction(function () use ($companyId, $loanId, $data, $userId) {
            $loan = EmployeeLoan::where('company_id', $companyId)->lockForUpdate()->findOrFail($loanId);

            if ($loan->status !== 'APPROVED') {
                throw new ConflictHttpException("Cannot disburse loan with status '{$loan->status}'. Must be APPROVED.");
            }

            $amount = (float) $loan->principal_amount;

            $loanAssetAccount = $this->resolveAccount($companyId, AccountMappingService::ROLE_EMPLOYEE_LOAN_ASSET, 'ASSET');
            $cashBankAccount = $this->resolveAccount($companyId, AccountMappingService::ROLE_CASH_BANK, 'ASSET');

            $journalData = [
                'journal_date' => date('Y-m-d'),
                'reference_type' => 'EmployeeLoan',
                'reference_id' => $loan->id,
                'description' => "Disbursement for Employee Loan {$loan->loan_number}",
                'source' => 'PAYROLL',
                'idempotency_key' => "LOAN-DISBURSE-{$loan->id}",
                'lines' => [
                    [
                        'account_id' => $loanAssetAccount->id,
                        'debit' => $amount,
                        'credit' => 0,
                        'description' => "Loan receivable for {$loan->loan_number}",
                    ],
                    [
                        'account_id' => $cashBankAccount->id,
                        'debit' => 0,
                        'credit' => $amount,
                        'description' => "Disbursement from cash/bank for {$loan->loan_number}",
                    ],
                ],
            ];

            $this->accountingService->postAutomatedJournal($companyId, $journalData, $userId);

            $loan->update([
                'status' => 'ACTIVE',
                'disbursed_by' => $userId,
                'disbursed_at' => now(),
            ]);

            AuditLog::log($companyId, $userId, 'LOAN_DISBURSED', $loan->id, 'EmployeeLoan', "Disbursed loan {$loan->loan_number} of ৳{$amount}");

            return $loan->fresh(['employee', 'approver', 'disburser']);
        });
    }

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
