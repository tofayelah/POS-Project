<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Sale;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class CustomerAgingService
{
    /**
     * Compute invoice-level aging breakdown for a specific customer.
     */
    public function getCustomerAging(int $companyId, int $customerId): array
    {
        $customer = Customer::where('company_id', $companyId)->findOrFail($customerId);

        $sales = Sale::where('company_id', $companyId)
            ->where('customer_id', $customerId)
            ->where('status', 'COMPLETED')
            ->where('due_amount', '>', 0)
            ->orderBy('sale_date', 'asc')
            ->get();

        $today = Carbon::today();
        $invoices = [];
        $buckets = [
            'CURRENT' => 0.0,
            '1-30' => 0.0,
            '31-60' => 0.0,
            '61-90' => 0.0,
            '90+' => 0.0,
        ];

        $totalOutstanding = 0.0;

        foreach ($sales as $sale) {
            $creditDays = (int) ($customer->credit_days ?? 0);
            $saleDate = $sale->sale_date ? Carbon::parse($sale->sale_date) : Carbon::parse($sale->created_at);
            $dueDate = $sale->due_date ? Carbon::parse($sale->due_date) : $saleDate->copy()->addDays($creditDays);

            $diff = $dueDate->diffInDays($today, false);
            $daysOverdue = max(0, (int) $diff);

            $bucket = 'CURRENT';
            if ($daysOverdue > 90) {
                $bucket = '90+';
            } elseif ($daysOverdue > 60) {
                $bucket = '61-90';
            } elseif ($daysOverdue > 30) {
                $bucket = '31-60';
            } elseif ($daysOverdue > 0) {
                $bucket = '1-30';
            }

            $dueAmount = round((float) $sale->due_amount, 4);
            $buckets[$bucket] += $dueAmount;
            $totalOutstanding += $dueAmount;

            $invoices[] = [
                'sale_id' => $sale->id,
                'invoice_number' => $sale->invoice_number,
                'sale_date' => $saleDate->toDateString(),
                'due_date' => $dueDate->toDateString(),
                'grand_total' => (float) $sale->grand_total,
                'paid_amount' => (float) $sale->paid_amount,
                'due_amount' => $dueAmount,
                'days_overdue' => $daysOverdue,
                'aging_bucket' => $bucket,
            ];
        }

        if ($sales->isEmpty()) {
            $ledgerEntries = \App\Models\CustomerLedger::where('company_id', $companyId)
                ->where('customer_id', $customerId)
                ->where('debit', '>', 0)
                ->orderBy('transaction_date', 'asc')
                ->get();

            foreach ($ledgerEntries as $entry) {
                $creditDays = (int) ($customer->credit_days ?? 0);
                $entryDate = $entry->transaction_date ? Carbon::parse($entry->transaction_date) : Carbon::parse($entry->created_at);
                $dueDate = $entry->due_date ? Carbon::parse($entry->due_date) : $entryDate->copy()->addDays($creditDays);

                $diff = $dueDate->diffInDays($today, false);
                $daysOverdue = max(0, (int) $diff);

                $bucket = 'CURRENT';
                if ($daysOverdue > 90) {
                    $bucket = '90+';
                } elseif ($daysOverdue > 60) {
                    $bucket = '61-90';
                } elseif ($daysOverdue > 30) {
                    $bucket = '31-60';
                } elseif ($daysOverdue > 0) {
                    $bucket = '1-30';
                }

                $dueAmount = round((float) $entry->debit, 4);
                $buckets[$bucket] += $dueAmount;
                $totalOutstanding += $dueAmount;

                $invoices[] = [
                    'sale_id' => $entry->reference_id,
                    'invoice_number' => $entry->reference_number,
                    'sale_date' => $entryDate->toDateString(),
                    'due_date' => $dueDate->toDateString(),
                    'grand_total' => (float) $entry->debit,
                    'paid_amount' => (float) $entry->credit,
                    'due_amount' => $dueAmount,
                    'days_overdue' => $daysOverdue,
                    'aging_bucket' => $bucket,
                ];
            }
        }

        // Format bucket numbers
        foreach ($buckets as $k => $v) {
            $buckets[$k] = round($v, 4);
        }

        return [
            'customer_id' => $customer->id,
            'customer_code' => $customer->customer_code,
            'customer_name' => $customer->name,
            'credit_limit' => (float) ($customer->credit_limit ?? 0),
            'credit_days' => (int) ($customer->credit_days ?? 0),
            'total_outstanding' => round($totalOutstanding, 4),
            'buckets' => $buckets,
            'invoices' => $invoices,
        ];
    }

    /**
     * Compute company-wide AR aging summary grouped by customer.
     */
    public function getCompanyAging(int $companyId, array $filters = []): array
    {
        $today = Carbon::today();

        $query = Customer::where('customers.company_id', $companyId)
            ->join('sales', function ($join) {
                $join->on('sales.customer_id', '=', 'customers.id')
                    ->where('sales.status', '=', 'COMPLETED')
                    ->where('sales.due_amount', '>', 0);
            })
            ->select('customers.id as customer_id', 'customers.customer_code', 'customers.name as customer_name', 'customers.credit_limit', 'customers.credit_days')
            ->distinct();

        if (!empty($filters['search'])) {
            $search = '%' . $filters['search'] . '%';
            $like = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $query->where(function ($q) use ($search, $like) {
                $q->where('customers.name', $like, $search)
                    ->orWhere('customers.customer_code', $like, $search)
                    ->orWhere('customers.mobile', $like, $search);
            });
        }

        if (!empty($filters['customer_group_id'])) {
            $query->where('customers.customer_group_id', $filters['customer_group_id']);
        }

        $customers = $query->get();

        $customerAgingList = [];
        $grandTotals = [
            'total_receivables' => 0.0,
            'total_current' => 0.0,
            'total_1_30' => 0.0,
            'total_31_60' => 0.0,
            'total_61_90' => 0.0,
            'total_90_plus' => 0.0,
            'customer_count' => count($customers),
        ];

        foreach ($customers as $c) {
            $aging = $this->getCustomerAging($companyId, $c->customer_id);
            if ($aging['total_outstanding'] > 0) {
                $customerAgingList[] = [
                    'customer_id' => $c->customer_id,
                    'customer_code' => $c->customer_code,
                    'customer_name' => $c->customer_name,
                    'credit_limit' => $aging['credit_limit'],
                    'credit_days' => $aging['credit_days'],
                    'total_outstanding' => $aging['total_outstanding'],
                    'current' => $aging['buckets']['CURRENT'],
                    'days_1_30' => $aging['buckets']['1-30'],
                    'days_31_60' => $aging['buckets']['31-60'],
                    'days_61_90' => $aging['buckets']['61-90'],
                    'days_90_plus' => $aging['buckets']['90+'],
                    'invoice_count' => count($aging['invoices']),
                ];

                $grandTotals['total_receivables'] += $aging['total_outstanding'];
                $grandTotals['total_current'] += $aging['buckets']['CURRENT'];
                $grandTotals['total_1_30'] += $aging['buckets']['1-30'];
                $grandTotals['total_31_60'] += $aging['buckets']['31-60'];
                $grandTotals['total_61_90'] += $aging['buckets']['61-90'];
                $grandTotals['total_90_plus'] += $aging['buckets']['90+'];
            }
        }

        foreach ($grandTotals as $k => $v) {
            if ($k !== 'customer_count') {
                $grandTotals[$k] = round($v, 4);
            }
        }

        return [
            'summary' => $grandTotals,
            'data' => $customerAgingList,
        ];
    }

    /**
     * Get collection priorities and overdue risk categories.
     */
    public function getCollectionPriorities(int $companyId): array
    {
        $agingData = $this->getCompanyAging($companyId);
        $priorities = [];

        foreach ($agingData['data'] as $item) {
            $overdueTotal = $item['days_1_30'] + $item['days_31_60'] + $item['days_61_90'] + $item['days_90_plus'];

            $status = 'NORMAL';
            if ($item['days_90_plus'] > 0 || $overdueTotal > 100000) {
                $status = 'CRITICAL';
            } elseif (($item['days_31_60'] + $item['days_61_90']) > 0) {
                $status = 'OVERDUE';
            } elseif ($item['days_1_30'] > 0) {
                $status = 'FOLLOW_UP';
            }

            $priorities[] = array_merge($item, [
                'overdue_total' => round($overdueTotal, 4),
                'collection_priority' => $status,
            ]);
        }

        usort($priorities, function ($a, $b) {
            $weight = ['CRITICAL' => 4, 'OVERDUE' => 3, 'FOLLOW_UP' => 2, 'NORMAL' => 1];
            $wA = $weight[$a['collection_priority']] ?? 0;
            $wB = $weight[$b['collection_priority']] ?? 0;
            if ($wA !== $wB) {
                return $wB <=> $wA;
            }
            return $b['overdue_total'] <=> $a['overdue_total'];
        });

        return [
            'total_overdue_receivables' => round(array_sum(array_column($priorities, 'overdue_total')), 4),
            'customers' => $priorities,
        ];
    }

    public function getCustomerAgingSummary(int $companyId, int $customerId, ?string $asOfDate = null): array
    {
        return $this->getCustomerAging($companyId, $customerId);
    }

    public function getCompanyAgingSummary(int $companyId, ?string $asOfDate = null): array
    {
        return $this->getCompanyAging($companyId);
    }
}
