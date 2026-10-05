<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\StoreCreditAccount;
use App\Models\StoreCreditTransaction;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class StoreCreditService
{
    /**
     * Get or create a store credit account for a customer within a company.
     */
    public function getOrCreateAccount(int $companyId, int $customerId): StoreCreditAccount
    {
        $customer = Customer::where('company_id', $companyId)->find($customerId);
        if (!$customer) {
            throw new NotFoundHttpException("Customer not found.");
        }

        return StoreCreditAccount::firstOrCreate(
            [
                'company_id' => $companyId,
                'customer_id' => $customerId,
            ],
            [
                'status' => 'ACTIVE',
                'current_balance' => 0.0000,
            ]
        );
    }

    /**
     * Get the current store credit balance for a customer.
     */
    public function getBalance(int $companyId, int $customerId): float
    {
        $account = StoreCreditAccount::where('company_id', $companyId)
            ->where('customer_id', $customerId)
            ->first();

        return $account ? (float) $account->current_balance : 0.0;
    }

    /**
     * Issue store credit to a customer atomically.
     */
    public function issueCredit(
        int $companyId,
        int $customerId,
        float $amount,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $referenceNumber = null,
        ?string $description = null,
        ?Carbon $expiresAt = null,
        ?int $userId = null,
        string $type = 'ISSUE'
    ): StoreCreditTransaction {
        if ($amount <= 0) {
            throw new ConflictHttpException("Credit amount must be greater than zero.");
        }

        return DB::transaction(function () use (
            $companyId,
            $customerId,
            $amount,
            $referenceType,
            $referenceId,
            $referenceNumber,
            $description,
            $expiresAt,
            $userId,
            $type
        ) {
            $account = StoreCreditAccount::where('company_id', $companyId)
                ->where('customer_id', $customerId)
                ->lockForUpdate()
                ->first();

            if (!$account) {
                // FirstOrCreate within transaction
                $this->getOrCreateAccount($companyId, $customerId);
                $account = StoreCreditAccount::where('company_id', $companyId)
                    ->where('customer_id', $customerId)
                    ->lockForUpdate()
                    ->firstOrFail();
            }

            if ($account->status !== 'ACTIVE') {
                throw new ConflictHttpException("Store credit account is {$account->status} and cannot receive credit.");
            }

            $balanceBefore = (float) $account->current_balance;
            $balanceAfter = round($balanceBefore + $amount, 4);

            $account->current_balance = $balanceAfter;
            $account->save();

            $transaction = StoreCreditTransaction::create([
                'company_id' => $companyId,
                'customer_id' => $customerId,
                'store_credit_account_id' => $account->id,
                'type' => $type,
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'reference_number' => $referenceNumber,
                'description' => $description ?? "Issued {$amount} store credit",
                'expires_at' => $expiresAt,
                'created_by' => $userId,
            ]);

            AuditLog::log(
                $companyId,
                $userId,
                'STORE_CREDIT_ISSUED',
                $transaction->id,
                'StoreCreditTransaction',
                "Issued ৳{$amount} store credit to customer #{$customerId}. New balance: ৳{$balanceAfter}"
            );

            return $transaction;
        });
    }

    /**
     * Redeem store credit atomically.
     */
    public function redeemCredit(
        int $companyId,
        int $customerId,
        float $amount,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $referenceNumber = null,
        ?string $description = null,
        ?int $userId = null
    ): StoreCreditTransaction {
        if ($amount <= 0) {
            throw new ConflictHttpException("Redemption amount must be greater than zero.");
        }

        return DB::transaction(function () use (
            $companyId,
            $customerId,
            $amount,
            $referenceType,
            $referenceId,
            $referenceNumber,
            $description,
            $userId
        ) {
            $account = StoreCreditAccount::where('company_id', $companyId)
                ->where('customer_id', $customerId)
                ->lockForUpdate()
                ->first();

            if (!$account || $account->status !== 'ACTIVE') {
                throw new ConflictHttpException("Customer has no active store credit account.");
            }

            $balanceBefore = (float) $account->current_balance;
            if ($balanceBefore < ($amount - 0.0001)) {
                throw new ConflictHttpException("Insufficient store credit balance. Available: {$balanceBefore}, requested: {$amount}.");
            }

            $balanceAfter = max(0.0, round($balanceBefore - $amount, 4));
            $account->current_balance = $balanceAfter;
            $account->save();

            $transaction = StoreCreditTransaction::create([
                'company_id' => $companyId,
                'customer_id' => $customerId,
                'store_credit_account_id' => $account->id,
                'type' => 'REDEEM',
                'amount' => -$amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'reference_number' => $referenceNumber,
                'description' => $description ?? "Redeemed {$amount} store credit",
                'created_by' => $userId,
            ]);

            AuditLog::log(
                $companyId,
                $userId,
                'STORE_CREDIT_REDEEMED',
                $transaction->id,
                'StoreCreditTransaction',
                "Redeemed ৳{$amount} store credit for customer #{$customerId}. New balance: ৳{$balanceAfter}"
            );

            return $transaction;
        });
    }

    /**
     * Issue store credit from a sales return refund.
     */
    public function refundToCredit(
        int $companyId,
        int $customerId,
        float $amount,
        ?int $salesReturnId = null,
        ?string $returnNumber = null,
        ?string $description = null,
        ?int $userId = null
    ): StoreCreditTransaction {
        return $this->issueCredit(
            $companyId,
            $customerId,
            $amount,
            'SalesReturn',
            $salesReturnId,
            $returnNumber,
            $description ?? "Store credit refund from return {$returnNumber}",
            null,
            $userId,
            'REFUND'
        );
    }

    /**
     * Manually adjust a customer's store credit balance.
     */
    public function adjustCredit(
        int $companyId,
        int $customerId,
        float $amount,
        string $reason,
        ?int $userId = null
    ): StoreCreditTransaction {
        return DB::transaction(function () use ($companyId, $customerId, $amount, $reason, $userId) {
            $account = StoreCreditAccount::where('company_id', $companyId)
                ->where('customer_id', $customerId)
                ->lockForUpdate()
                ->first();

            if (!$account) {
                $this->getOrCreateAccount($companyId, $customerId);
                $account = StoreCreditAccount::where('company_id', $companyId)
                    ->where('customer_id', $customerId)
                    ->lockForUpdate()
                    ->firstOrFail();
            }

            if ($account->status !== 'ACTIVE') {
                throw new ConflictHttpException("Store credit account is {$account->status}.");
            }

            $balanceBefore = (float) $account->current_balance;
            $newBalance = round($balanceBefore + $amount, 4);

            if ($newBalance < 0) {
                throw new ConflictHttpException("Store credit balance cannot be reduced below zero.");
            }

            $account->current_balance = $newBalance;
            $account->save();

            $transaction = StoreCreditTransaction::create([
                'company_id' => $companyId,
                'customer_id' => $customerId,
                'store_credit_account_id' => $account->id,
                'type' => 'ADJUSTMENT',
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $newBalance,
                'reference_type' => null,
                'reference_id' => null,
                'reference_number' => 'SC-ADJ-' . time(),
                'description' => $reason,
                'created_by' => $userId,
            ]);

            AuditLog::log(
                $companyId,
                $userId,
                'STORE_CREDIT_ADJUSTED',
                $transaction->id,
                'StoreCreditTransaction',
                "Adjusted store credit for customer #{$customerId} by ৳{$amount} ({$reason}). New balance: ৳{$newBalance}"
            );

            return $transaction;
        });
    }

    /**
     * Get paginated transactions for a customer's store credit account.
     */
    public function getTransactions(int $companyId, int $customerId, array $filters = []): LengthAwarePaginator
    {
        $query = StoreCreditTransaction::with(['creator'])
            ->where('company_id', $companyId)
            ->where('customer_id', $customerId);

        if (!empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        return $query->orderBy('id', 'desc')->paginate($filters['per_page'] ?? 20);
    }
}
