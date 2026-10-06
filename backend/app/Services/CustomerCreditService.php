<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\CustomerCreditOverride;
use App\Models\CustomerCreditRequest;
use App\Models\CustomerLedger;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class CustomerCreditService
{
    /**
     * Get authoritative credit summary for a customer.
     */
    public function getCreditSummary(int $companyId, int $customerId): array
    {
        $customer = Customer::where('company_id', $companyId)->findOrFail($customerId);

        $latestRecord = CustomerLedger::where('company_id', $companyId)
            ->where('customer_id', $customerId)
            ->orderBy('id', 'desc')
            ->first();

        $currentBalance = ($latestRecord && $latestRecord->balance_after !== null)
            ? (float) $latestRecord->balance_after
            : (float) (CustomerLedger::where('company_id', $companyId)
                ->where('customer_id', $customerId)
                ->selectRaw('COALESCE(SUM(debit - credit), 0) as balance')
                ->value('balance') ?? 0);

        $usedCredit = max(0.0, round($currentBalance, 4));
        $creditLimit = (float) ($customer->credit_limit ?? 0);
        $availableCredit = max(0.0, round($creditLimit - $usedCredit, 4));
        $utilizationPct = $creditLimit > 0 ? round(($usedCredit / $creditLimit) * 100, 2) : 0.0;

        return [
            'customer_id' => $customer->id,
            'customer_code' => $customer->customer_code,
            'customer_name' => $customer->name,
            'credit_limit' => $creditLimit,
            'used_credit' => $usedCredit,
            'outstanding_balance' => $usedCredit,
            'available_credit' => $availableCredit,
            'credit_utilization_pct' => $utilizationPct,
            'credit_status' => $customer->credit_status ?? 'ACTIVE',
            'credit_days' => (int) ($customer->credit_days ?? 0),
            'credit_hold_reason' => $customer->credit_hold_reason,
            'credit_approved_by' => $customer->credit_approved_by,
            'credit_approved_at' => $customer->credit_approved_at?->toIso8601String(),
        ];
    }

    /**
     * Authoritatively validate credit sale.
     * Prevents over-limit sales unless explicit override is provided by an authorized user.
     */
    public function validateCreditSale(int $companyId, Customer $customer, float $dueAmount, array $options = [], ?int $userId = null): void
    {
        if ($customer->company_id !== $companyId) {
            throw new ConflictHttpException("Customer does not belong to the active company context.");
        }

        if ($customer->status !== 'ACTIVE') {
            throw new ConflictHttpException("Customer account is inactive.");
        }

        if ($customer->credit_status === 'BLOCKED') {
            throw new ConflictHttpException("Customer is credit blocked: " . ($customer->credit_hold_reason ?? 'Account blocked by credit control'));
        }

        if ($customer->credit_status === 'ON_HOLD') {
            throw new ConflictHttpException("Customer is on credit hold: " . ($customer->credit_hold_reason ?? 'Account on temporary hold'));
        }

        $creditLimit = (float) ($customer->credit_limit ?? 0);
        if ($creditLimit > 0) {
            $currentBalance = (float) (CustomerLedger::where('company_id', $companyId)
                ->where('customer_id', $customer->id)
                ->orderBy('id', 'desc')
                ->value('balance_after') ?? 0);

            $newExposure = round($currentBalance + $dueAmount, 4);

            if ($newExposure > ($creditLimit + 0.0001)) {
                $availableCredit = max(0.0, round($creditLimit - max(0, $currentBalance), 4));

                // Check for explicit override
                $hasOverride = !empty($options['credit_override']);
                if ($hasOverride && $userId) {
                    $user = User::find($userId);
                    $canOverride = $user && ($user->hasRole('Super Admin') || $user->hasRole('Admin') || $user->can('customers.credit_override'));
                    if (!$canOverride) {
                        throw new ConflictHttpException("User does not have permission to override credit limit (customers.credit_override required).");
                    }

                    // Record override
                    CustomerCreditOverride::create([
                        'company_id' => $companyId,
                        'customer_id' => $customer->id,
                        'sale_id' => $options['sale_id'] ?? null,
                        'previous_available_credit' => $availableCredit,
                        'requested_exposure' => $newExposure,
                        'approved_exposure' => $newExposure,
                        'override_reason' => $options['override_reason'] ?? 'Authorized manager override at checkout',
                        'approved_by' => $userId,
                    ]);

                    AuditLog::log(
                        $companyId,
                        $userId,
                        'CUSTOMER_CREDIT_OVERRIDE',
                        $customer->id,
                        'Customer',
                        "Overrode credit limit for customer {$customer->customer_code}. Requested exposure: {$newExposure}, limit: {$creditLimit}."
                    );

                    return;
                }

                throw new ConflictHttpException("Credit limit exceeded. Permitted limit: {$creditLimit}, Current due: {$currentBalance}, Attempted due: {$dueAmount}, Available: {$availableCredit}.");
            }
        }
    }

    /**
     * Submit a credit limit or credit days adjustment request.
     */
    public function requestCredit(int $companyId, int $customerId, array $data, int $userId): CustomerCreditRequest
    {
        return DB::transaction(function () use ($companyId, $customerId, $data, $userId) {
            $customer = Customer::where('company_id', $companyId)->lockForUpdate()->findOrFail($customerId);

            $requestedLimit = round((float) ($data['requested_credit_limit'] ?? 0), 4);
            $requestedDays = (int) ($data['requested_credit_days'] ?? 0);

            if ($requestedLimit < 0 || $requestedDays < 0) {
                throw new ConflictHttpException("Credit limit and days cannot be negative.");
            }

            $request = CustomerCreditRequest::create([
                'company_id' => $companyId,
                'customer_id' => $customer->id,
                'requested_credit_limit' => $requestedLimit,
                'requested_credit_days' => $requestedDays,
                'current_credit_limit' => (float) ($customer->credit_limit ?? 0),
                'current_credit_days' => (int) ($customer->credit_days ?? 0),
                'reason' => $data['reason'] ?? 'Commercial credit adjustment request',
                'risk_notes' => $data['risk_notes'] ?? null,
                'status' => 'PENDING',
                'requested_by' => $userId,
            ]);

            AuditLog::log(
                $companyId,
                $userId,
                'CUSTOMER_CREDIT_REQUESTED',
                $request->id,
                'CustomerCreditRequest',
                "Submitted credit request for {$customer->customer_code}. Limit: {$requestedLimit}, Days: {$requestedDays}."
            );

            return $request;
        });
    }

    /**
     * Approve a credit request.
     */
    public function approveCredit(int $companyId, int $requestId, ?string $reviewNotes, int $userId): CustomerCreditRequest
    {
        return DB::transaction(function () use ($companyId, $requestId, $reviewNotes, $userId) {
            $request = CustomerCreditRequest::where('company_id', $companyId)
                ->lockForUpdate()
                ->findOrFail($requestId);

            if ($request->status !== 'PENDING') {
                throw new ConflictHttpException("Credit request #{$requestId} is already {$request->status}.");
            }

            $request->update([
                'status' => 'APPROVED',
                'reviewed_by' => $userId,
                'reviewed_at' => now(),
                'review_notes' => $reviewNotes,
            ]);

            $customer = Customer::where('company_id', $companyId)
                ->lockForUpdate()
                ->findOrFail($request->customer_id);

            $customer->update([
                'credit_limit' => $request->requested_credit_limit,
                'credit_days' => $request->requested_credit_days,
                'credit_approved_by' => $userId,
                'credit_approved_at' => now(),
                'credit_status' => 'ACTIVE',
            ]);

            AuditLog::log(
                $companyId,
                $userId,
                'CUSTOMER_CREDIT_APPROVED',
                $request->id,
                'CustomerCreditRequest',
                "Approved credit request for {$customer->customer_code}. New limit: {$request->requested_credit_limit}, Days: {$request->requested_credit_days}."
            );

            return $request->fresh(['customer', 'requester', 'reviewer']);
        });
    }

    /**
     * Reject a credit request.
     */
    public function rejectCredit(int $companyId, int $requestId, ?string $reviewNotes, int $userId): CustomerCreditRequest
    {
        return DB::transaction(function () use ($companyId, $requestId, $reviewNotes, $userId) {
            $request = CustomerCreditRequest::where('company_id', $companyId)
                ->lockForUpdate()
                ->findOrFail($requestId);

            if ($request->status !== 'PENDING') {
                throw new ConflictHttpException("Credit request #{$requestId} is already {$request->status}.");
            }

            $request->update([
                'status' => 'REJECTED',
                'reviewed_by' => $userId,
                'reviewed_at' => now(),
                'review_notes' => $reviewNotes,
            ]);

            AuditLog::log(
                $companyId,
                $userId,
                'CUSTOMER_CREDIT_REJECTED',
                $request->id,
                'CustomerCreditRequest',
                "Rejected credit request for customer #{$request->customer_id}. Reason: {$reviewNotes}."
            );

            return $request->fresh(['customer', 'requester', 'reviewer']);
        });
    }

    /**
     * Put a customer on credit hold or release.
     */
    public function toggleCreditHold(int $companyId, int $customerId, string $newStatus, ?string $reason, int $userId): Customer
    {
        $validStatuses = ['ACTIVE', 'APPROVED', 'ON_HOLD', 'BLOCKED'];
        if (!in_array($newStatus, $validStatuses, true)) {
            throw new ConflictHttpException("Invalid credit status '{$newStatus}'. Must be one of: " . implode(', ', $validStatuses));
        }

        return DB::transaction(function () use ($companyId, $customerId, $newStatus, $reason, $userId) {
            $customer = Customer::where('company_id', $companyId)->lockForUpdate()->findOrFail($customerId);

            $customer->update([
                'credit_status' => $newStatus,
                'credit_hold_reason' => $reason,
                'updated_by' => $userId,
            ]);

            AuditLog::log(
                $companyId,
                $userId,
                'CUSTOMER_CREDIT_STATUS_CHANGED',
                $customer->id,
                'Customer',
                "Changed credit status of {$customer->customer_code} to {$newStatus}. Reason: {$reason}."
            );

            return $customer;
        });
    }
}
