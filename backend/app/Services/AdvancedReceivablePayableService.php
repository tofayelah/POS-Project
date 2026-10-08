<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\Purchase;
use App\Models\Customer;
use App\Models\Supplier;
use App\Models\Account;
use App\Models\JournalEntryLine;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AdvancedReceivablePayableService
{
    public function getAdvancedArAging(int $companyId, array $filters = []): array
    {
        $today = Carbon::today();

        $unpaidSales = Sale::where('company_id', $companyId)
            ->whereIn('payment_status', ['DUE', 'PARTIAL', 'due', 'partial', 'unpaid'])
            ->whereNotIn('status', ['VOIDED', 'CANCELLED', 'cancelled'])
            ->with('customer:id,name,mobile,email,credit_limit')
            ->get();

        $customerBuckets = [];
        $totalCurrent = 0;
        $total1_30 = 0;
        $total31_60 = 0;
        $total61_90 = 0;
        $total91_120 = 0;
        $total120Plus = 0;
        $grandTotalDue = 0;

        foreach ($unpaidSales as $sale) {
            $dueAmt = (float) $sale->due_amount;
            if ($dueAmt <= 0) {
                $dueAmt = (float) max(0, $sale->grand_total - $sale->paid_amount);
            }
            if ($dueAmt <= 0) continue;

            $customerId = $sale->customer_id ?? 0;
            $customerName = $sale->customer ? $sale->customer->name : 'Walk-in / Guest';
            $customerPhone = $sale->customer ? ($sale->customer->mobile ?? '') : '';
            $creditLimit = $sale->customer ? (float) $sale->customer->credit_limit : 0;

            if (!isset($customerBuckets[$customerId])) {
                $customerBuckets[$customerId] = [
                    'customer_id' => $customerId,
                    'customer_name' => $customerName,
                    'customer_phone' => $customerPhone,
                    'credit_limit' => $creditLimit,
                    'current' => 0,
                    'days_1_30' => 0,
                    'days_31_60' => 0,
                    'days_61_90' => 0,
                    'days_91_120' => 0,
                    'days_120_plus' => 0,
                    'total_due' => 0,
                    'max_overdue_days' => 0,
                ];
            }

            $dueDate = $sale->due_date ? Carbon::parse($sale->due_date) : Carbon::parse($sale->sale_date)->addDays(30);
            $overdueDays = $today->diffInDays($dueDate, false); // negative if overdue (today > dueDate)

            if ($today->gt($dueDate)) {
                $daysPastDue = $dueDate->diffInDays($today);
            } else {
                $daysPastDue = 0;
            }

            if ($daysPastDue > $customerBuckets[$customerId]['max_overdue_days']) {
                $customerBuckets[$customerId]['max_overdue_days'] = $daysPastDue;
            }

            if ($daysPastDue <= 0) {
                $customerBuckets[$customerId]['current'] += $dueAmt;
                $totalCurrent += $dueAmt;
            } elseif ($daysPastDue <= 30) {
                $customerBuckets[$customerId]['days_1_30'] += $dueAmt;
                $total1_30 += $dueAmt;
            } elseif ($daysPastDue <= 60) {
                $customerBuckets[$customerId]['days_31_60'] += $dueAmt;
                $total31_60 += $dueAmt;
            } elseif ($daysPastDue <= 90) {
                $customerBuckets[$customerId]['days_61_90'] += $dueAmt;
                $total61_90 += $dueAmt;
            } elseif ($daysPastDue <= 120) {
                $customerBuckets[$customerId]['days_91_120'] += $dueAmt;
                $total91_120 += $dueAmt;
            } else {
                $customerBuckets[$customerId]['days_120_plus'] += $dueAmt;
                $total120Plus += $dueAmt;
            }

            $customerBuckets[$customerId]['total_due'] += $dueAmt;
            $grandTotalDue += $dueAmt;
        }

        // Collection Priority Score: high total_due * (1 + max_overdue_days / 30)
        $customerList = array_values(array_map(function ($c) {
            $priorityScore = round($c['total_due'] * (1 + ($c['max_overdue_days'] / 30)), 2);
            $creditExposurePct = $c['credit_limit'] > 0 ? round(($c['total_due'] / $c['credit_limit']) * 100, 2) : 100;
            $c['priority_score'] = $priorityScore;
            $c['credit_exposure_pct'] = $creditExposurePct;
            $c['priority_level'] = $c['max_overdue_days'] > 60 || $priorityScore > 50000 ? 'URGENT' : ($c['max_overdue_days'] > 30 ? 'HIGH' : 'NORMAL');
            return $c;
        }, $customerBuckets));

        usort($customerList, fn($a, $b) => $b['priority_score'] <=> $a['priority_score']);

        // Authoritative GL AR Account Balance
        $arGlAccount = Account::where('company_id', $companyId)
            ->where(function ($q) {
                $q->where('account_code', '1030')
                  ->orWhere('account_name', 'ilike', '%Accounts Receivable%');
            })->first();

        $glBalance = 0;
        if ($arGlAccount) {
            $glBalance = (float) JournalEntryLine::whereHas('journalEntry', function ($q) use ($companyId) {
                $q->where('company_id', $companyId)->where('status', 'POSTED');
            })->where('account_id', $arGlAccount->id)->sum(DB::raw('debit - credit'));
        }

        $subledgerVsGlVariance = round($grandTotalDue - $glBalance, 2);

        return [
            'summary' => [
                'total_current' => round($totalCurrent, 2),
                'total_1_30' => round($total1_30, 2),
                'total_31_60' => round($total31_60, 2),
                'total_61_90' => round($total61_90, 2),
                'total_91_120' => round($total91_120, 2),
                'total_120_plus' => round($total120Plus, 2),
                'grand_total_subledger' => round($grandTotalDue, 2),
                'gl_ar_balance' => round($glBalance, 2),
                'reconciliation_variance' => $subledgerVsGlVariance,
            ],
            'customers' => $customerList,
        ];
    }

    public function getAdvancedApAging(int $companyId, array $filters = []): array
    {
        $today = Carbon::today();

        $unpaidPurchases = Purchase::where('company_id', $companyId)
            ->whereNotIn('status', ['CANCELLED', 'cancelled'])
            ->with('supplier:id,name,mobile,email')
            ->get();

        $supplierBuckets = [];
        $totalCurrent = 0;
        $total1_30 = 0;
        $total31_60 = 0;
        $total61_90 = 0;
        $total91_120 = 0;
        $total120Plus = 0;
        $grandTotalDue = 0;

        foreach ($unpaidPurchases as $p) {
            $dueAmt = (float) $p->due_amount;
            if ($dueAmt <= 0) continue;

            $supplierId = $p->supplier_id ?? 0;
            $supplierName = $p->supplier ? $p->supplier->name : 'Supplier #' . $supplierId;
            $supplierPhone = $p->supplier ? ($p->supplier->mobile ?? '') : '';

            if (!isset($supplierBuckets[$supplierId])) {
                $supplierBuckets[$supplierId] = [
                    'supplier_id' => $supplierId,
                    'supplier_name' => $supplierName,
                    'supplier_phone' => $supplierPhone,
                    'current' => 0,
                    'days_1_30' => 0,
                    'days_31_60' => 0,
                    'days_61_90' => 0,
                    'days_91_120' => 0,
                    'days_120_plus' => 0,
                    'total_due' => 0,
                    'earliest_due_date' => null,
                ];
            }

            $dueDate = $p->due_date ? Carbon::parse($p->due_date) : Carbon::parse($p->invoice_date)->addDays(30);

            if ($today->gt($dueDate)) {
                $daysPastDue = $dueDate->diffInDays($today);
            } else {
                $daysPastDue = 0;
            }

            if (!$supplierBuckets[$supplierId]['earliest_due_date'] || $dueDate->lt(Carbon::parse($supplierBuckets[$supplierId]['earliest_due_date']))) {
                $supplierBuckets[$supplierId]['earliest_due_date'] = $dueDate->toDateString();
            }

            if ($daysPastDue <= 0) {
                $supplierBuckets[$supplierId]['current'] += $dueAmt;
                $totalCurrent += $dueAmt;
            } elseif ($daysPastDue <= 30) {
                $supplierBuckets[$supplierId]['days_1_30'] += $dueAmt;
                $total1_30 += $dueAmt;
            } elseif ($daysPastDue <= 60) {
                $supplierBuckets[$supplierId]['days_31_60'] += $dueAmt;
                $total31_60 += $dueAmt;
            } elseif ($daysPastDue <= 90) {
                $supplierBuckets[$supplierId]['days_61_90'] += $dueAmt;
                $total61_90 += $dueAmt;
            } elseif ($daysPastDue <= 120) {
                $supplierBuckets[$supplierId]['days_91_120'] += $dueAmt;
                $total91_120 += $dueAmt;
            } else {
                $supplierBuckets[$supplierId]['days_120_plus'] += $dueAmt;
                $total120Plus += $dueAmt;
            }

            $supplierBuckets[$supplierId]['total_due'] += $dueAmt;
            $grandTotalDue += $dueAmt;
        }

        $supplierList = array_values($supplierBuckets);
        usort($supplierList, fn($a, $b) => $b['total_due'] <=> $a['total_due']);

        // Authoritative GL AP Account Balance
        $apGlAccount = Account::where('company_id', $companyId)
            ->where(function ($q) {
                $q->where('account_code', '2010')
                  ->orWhere('account_name', 'ilike', '%Accounts Payable%');
            })->first();

        $glBalance = 0;
        if ($apGlAccount) {
            $glBalance = (float) JournalEntryLine::whereHas('journalEntry', function ($q) use ($companyId) {
                $q->where('company_id', $companyId)->where('status', 'POSTED');
            })->where('account_id', $apGlAccount->id)->sum(DB::raw('credit - debit'));
        }

        $subledgerVsGlVariance = round($grandTotalDue - $glBalance, 2);

        return [
            'summary' => [
                'total_current' => round($totalCurrent, 2),
                'total_1_30' => round($total1_30, 2),
                'total_31_60' => round($total31_60, 2),
                'total_61_90' => round($total61_90, 2),
                'total_91_120' => round($total91_120, 2),
                'total_120_plus' => round($total120Plus, 2),
                'grand_total_subledger' => round($grandTotalDue, 2),
                'gl_ap_balance' => round($glBalance, 2),
                'reconciliation_variance' => $subledgerVsGlVariance,
            ],
            'suppliers' => $supplierList,
        ];
    }
}
