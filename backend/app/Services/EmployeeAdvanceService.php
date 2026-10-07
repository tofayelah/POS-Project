<?php

namespace App\Services;

use App\Models\Account;
use App\Models\AuditLog;
use App\Models\Employee;
use App\Models\EmployeeAdvance;
use App\Models\Payment;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class EmployeeAdvanceService
{
    public function __construct(
        protected AccountingService $accountingService,
        protected AccountMappingService $accountMappingService,
        protected PaymentService $paymentService
    ) {}

    public function listAdvances(int $companyId, array $filters = [])
    {
        $query = EmployeeAdvance::where('company_id', $companyId)
            ->with(['employee.department', 'employee.designation', 'approver', 'payment']);

        if (!empty($filters['employee_id'])) {
            $query->where('employee_id', $filters['employee_id']);
        }
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        $limit = isset($filters['limit']) ? (int) $filters['limit'] : 25;
        return $query->orderByDesc('id')->paginate($limit);
    }

    public function createAdvance(int $companyId, array $data, ?int $userId = null): EmployeeAdvance
    {
        $employee = Employee::where('company_id', $companyId)->findOrFail($data['employee_id']);
        $amount = round((float) $data['amount'], 4);

        if ($amount <= 0) {
            throw new ConflictHttpException("Advance amount must be greater than zero.");
        }

        $count = EmployeeAdvance::where('company_id', $companyId)->count() + 1;
        $advNumber = 'ADV-' . date('Ym') . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

        $advance = EmployeeAdvance::create([
            'company_id' => $companyId,
            'employee_id' => $employee->id,
            'advance_number' => $advNumber,
            'amount' => $amount,
            'request_date' => $data['request_date'] ?? date('Y-m-d'),
            'reason' => $data['reason'] ?? 'Salary advance request',
            'status' => 'SUBMITTED',
            'outstanding_amount' => $amount,
            'recovered_amount' => 0,
        ]);

        AuditLog::log($companyId, $userId, 'ADVANCE_REQUESTED', $advance->id, 'EmployeeAdvance', "Employee {$employee->employee_number} requested advance ৳{$amount} ({$advNumber})");

        return $advance->load('employee');
    }

    public function approveAdvance(int $companyId, int $advanceId, int $userId): EmployeeAdvance
    {
        $advance = EmployeeAdvance::where('company_id', $companyId)->lockForUpdate()->findOrFail($advanceId);

        if ($advance->status !== 'SUBMITTED') {
            throw new ConflictHttpException("Cannot approve advance with status '{$advance->status}'.");
        }

        $advance->update([
            'status' => 'APPROVED',
            'approved_by' => $userId,
            'approved_at' => now(),
        ]);

        AuditLog::log($companyId, $userId, 'ADVANCE_APPROVED', $advance->id, 'EmployeeAdvance', "Approved advance {$advance->advance_number}");

        return $advance->load(['employee', 'approver']);
    }

    /**
     * Disburse approved advance via Cash/Bank payment and post General Ledger entry.
     */
    public function disburseAdvance(int $companyId, int $advanceId, array $data, int $userId): EmployeeAdvance
    {
        return DB::transaction(function () use ($companyId, $advanceId, $data, $userId) {
            $advance = EmployeeAdvance::where('company_id', $companyId)->lockForUpdate()->findOrFail($advanceId);

            if ($advance->status !== 'APPROVED') {
                throw new ConflictHttpException("Cannot disburse advance with status '{$advance->status}'. Must be APPROVED.");
            }

            $amount = (float) $advance->amount;
            $paymentMethod = strtoupper($data['payment_method'] ?? 'CASH');

            // Authoritative GL Posting: DR Employee Advance Asset, CR Cash/Bank
            $advanceAssetAccount = $this->resolveAccount($companyId, AccountMappingService::ROLE_EMPLOYEE_ADVANCE_ASSET, 'ASSET');
            $cashBankAccount = $this->resolveAccount($companyId, AccountMappingService::ROLE_CASH_BANK, 'ASSET');

            $journalData = [
                'journal_date' => date('Y-m-d'),
                'reference_type' => 'EmployeeAdvance',
                'reference_id' => $advance->id,
                'description' => "Disbursement for Employee Advance {$advance->advance_number}",
                'source' => 'PAYROLL',
                'idempotency_key' => "ADVANCE-DISBURSE-{$advance->id}",
                'lines' => [
                    [
                        'account_id' => $advanceAssetAccount->id,
                        'debit' => $amount,
                        'credit' => 0,
                        'description' => "Advance receivable for {$advance->advance_number}",
                    ],
                    [
                        'account_id' => $cashBankAccount->id,
                        'debit' => 0,
                        'credit' => $amount,
                        'description' => "Disbursement from cash/bank for {$advance->advance_number}",
                    ],
                ],
            ];

            $this->accountingService->postAutomatedJournal($companyId, $journalData, $userId);

            $advance->update([
                'status' => 'DISBURSED',
                'disbursed_by' => $userId,
                'disbursed_at' => now(),
            ]);

            AuditLog::log($companyId, $userId, 'ADVANCE_DISBURSED', $advance->id, 'EmployeeAdvance', "Disbursed advance {$advance->advance_number} of ৳{$amount} via {$paymentMethod}");

            return $advance->fresh(['employee', 'approver', 'disburser']);
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
