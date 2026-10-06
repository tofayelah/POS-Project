<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\CustomerLedger;
use Carbon\Carbon;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class CustomerStatementService
{
    public function __construct(
        protected CustomerAgingService $agingService
    ) {}

    /**
     * Generate authoritative customer statement of account.
     */
    public function generateStatement(
        int $companyId,
        int $customerId,
        ?string $startDate = null,
        ?string $endDate = null
    ): array {
        $customer = Customer::where('company_id', $companyId)->findOrFail($customerId);

        $start = $startDate ? Carbon::parse($startDate)->startOfDay() : Carbon::now()->subDays(30)->startOfDay();
        $end = $endDate ? Carbon::parse($endDate)->endOfDay() : Carbon::now()->endOfDay();

        // Calculate opening balance before $start
        $previousLedgers = CustomerLedger::where('company_id', $companyId)
            ->where('customer_id', $customerId)
            ->where('transaction_date', '<', $start->toDateString());

        $hasPrevious = (clone $previousLedgers)->exists();

        if ($hasPrevious) {
            $openingBalance = (float) (clone $previousLedgers)
                ->selectRaw('COALESCE(SUM(debit - credit), 0) as balance')
                ->value('balance');
        } else {
            $openingBalance = (float) ($customer->opening_balance ?? 0);
        }

        // Fetch transactions in range
        $ledgers = CustomerLedger::where('company_id', $companyId)
            ->where('customer_id', $customerId)
            ->whereBetween('transaction_date', [$start->toDateString(), $end->toDateString()])
            ->orderBy('transaction_date', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        $runningBalance = $openingBalance;
        $items = [];
        $totalDebits = 0.0;
        $totalCredits = 0.0;

        foreach ($ledgers as $ledger) {
            $debit = (float) $ledger->debit;
            $credit = (float) $ledger->credit;
            $runningBalance = round($runningBalance + $debit - $credit, 4);

            $totalDebits += $debit;
            $totalCredits += $credit;

            $items[] = [
                'id' => $ledger->id,
                'date' => $ledger->transaction_date ? $ledger->transaction_date->toDateString() : date('Y-m-d'),
                'transaction_type' => $ledger->transaction_type,
                'reference_type' => $ledger->reference_type,
                'reference_number' => $ledger->reference_number,
                'notes' => $ledger->notes,
                'debit' => $debit,
                'credit' => $credit,
                'balance' => $runningBalance,
            ];
        }

        $aging = $this->agingService->getCustomerAging($companyId, $customerId);

        return [
            'customer' => [
                'id' => $customer->id,
                'customer_code' => $customer->customer_code,
                'name' => $customer->name,
                'company_name' => $customer->company_name,
                'mobile' => $customer->mobile,
                'email' => $customer->email,
                'address' => $customer->address,
                'bin_number' => $customer->bin_number,
                'tin_number' => $customer->tin_number,
                'credit_limit' => (float) ($customer->credit_limit ?? 0),
                'credit_days' => (int) ($customer->credit_days ?? 0),
                'credit_status' => $customer->credit_status ?? 'ACTIVE',
            ],
            'period' => [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
            ],
            'opening_balance' => round($openingBalance, 4),
            'total_debits' => round($totalDebits, 4),
            'total_credits' => round($totalCredits, 4),
            'closing_balance' => round($runningBalance, 4),
            'items' => $items,
            'aging_summary' => $aging['buckets'],
        ];
    }
}
