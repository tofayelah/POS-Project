<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\CustomerLedger;
use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;
use Exception;

class CustomerLedgerService
{
    /**
     * Post a transaction to the customer ledger
     */
    public function postTransaction(
        $companyId, 
        $customerId, 
        $type, 
        $debit, 
        $credit, 
        $date, 
        $referenceType = null, 
        $referenceId = null, 
        $referenceNumber = null, 
        $notes = null,
        $userId = null
    ) {
        if ($debit < 0 || $credit < 0) {
            throw new Exception("Debit and Credit cannot be negative.");
        }
        
        if ($debit > 0 && $credit > 0) {
            throw new Exception("Cannot have both debit and credit in the same ledger transaction.");
        }

        return DB::transaction(function () use (
            $companyId, $customerId, $type, $debit, $credit, $date, 
            $referenceType, $referenceId, $referenceNumber, $notes, $userId
        ) {
            $customer = Customer::where('company_id', $companyId)->lockForUpdate()->findOrFail($customerId);

            // Calculate new balance based on the current balance in the DB
            // We use the aggregate to ensure we're correct, or we can trust a denormalized running balance.
            // Let's use the most recent ledger entry's balance_after, or sum.
            // To be perfectly safe, sum all previous ledgers. 
            // debit = customer owes us (+)
            // credit = we owe customer (-)
            $currentBalance = CustomerLedger::where('company_id', $companyId)
                ->where('customer_id', $customerId)
                ->selectRaw('COALESCE(SUM(debit - credit), 0) as balance')
                ->value('balance');

            $balanceBefore = $currentBalance ?: 0;
            $balanceAfter = $balanceBefore + $debit - $credit;

            $ledger = CustomerLedger::create([
                'company_id' => $companyId,
                'customer_id' => $customerId,
                'transaction_type' => $type,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'reference_number' => $referenceNumber,
                'debit' => $debit,
                'credit' => $credit,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'transaction_date' => $date,
                'notes' => $notes,
                'created_by' => $userId,
            ]);

            // Update customer table denormalized field if needed (opening_balance, though running balance is better derived)
            // But if it's an OPENING_BALANCE, let's store it on customer for easy reference
            if ($type === 'OPENING_BALANCE') {
                $customer->opening_balance = $debit - $credit;
                $customer->save();
            }

            return $ledger;
        });
    }
}
