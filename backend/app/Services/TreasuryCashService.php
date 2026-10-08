<?php

namespace App\Services;

use App\Models\Account;
use App\Models\BankAccount;
use App\Models\JournalEntryLine;
use App\Models\Sale;
use App\Models\Purchase;
use App\Models\PayrollRun;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class TreasuryCashService
{
    protected AccountingService $accountingService;

    public function __construct(AccountingService $accountingService)
    {
        $this->accountingService = $accountingService;
    }

    public function getCurrentCashPositions(int $companyId): array
    {
        // 1. Authoritative GL Cash and Bank accounts
        $accounts = Account::where('company_id', $companyId)
            ->where('account_type', 'ASSET')
            ->where(function ($q) {
                $q->where('account_code', 'like', '10%')
                  ->orWhere('account_name', 'ilike', '%cash%')
                  ->orWhere('account_name', 'ilike', '%bank%');
            })
            ->where('is_active', true)
            ->get();

        $accountPositions = [];
        $totalCash = 0;
        $totalBank = 0;

        foreach ($accounts as $acc) {
            $balance = (float) JournalEntryLine::whereHas('journalEntry', function ($q) use ($companyId) {
                $q->where('company_id', $companyId)
                  ->where('status', 'POSTED');
            })->where('account_id', $acc->id)
              ->sum(DB::raw('debit - credit'));

            $isCash = stripos($acc->account_name, 'cash') !== false || $acc->account_code === '1010';
            if ($isCash) {
                $totalCash += $balance;
            } else {
                $totalBank += $balance;
            }

            $accountPositions[] = [
                'account_id' => $acc->id,
                'account_code' => $acc->account_code,
                'account_name' => $acc->account_name,
                'type' => $isCash ? 'CASH' : 'BANK',
                'balance' => round($balance, 2),
            ];
        }

        // 2. Bank Accounts master records with current statement/ledger balances
        $bankAccounts = BankAccount::where('company_id', $companyId)->get()->map(function ($ba) {
            return [
                'id' => $ba->id,
                'bank_name' => $ba->bank_name,
                'account_name' => $ba->account_name,
                'account_number_masked' => $ba->account_number_masked,
                'current_balance' => round((float) $ba->current_balance, 2),
                'status' => $ba->status,
            ];
        });

        $totalLiquid = $totalCash + $totalBank;

        return [
            'total_liquid_cash' => round($totalLiquid, 2),
            'total_cash_in_hand' => round($totalCash, 2),
            'total_bank_balances' => round($totalBank, 2),
            'accounts' => $accountPositions,
            'bank_accounts' => $bankAccounts,
        ];
    }

    public function getCashFlowForecast(int $companyId, int $horizonDays = 90): array
    {
        $currentPosition = $this->getCurrentCashPositions($companyId);
        $startingCash = $currentPosition['total_liquid_cash'];
        $today = Carbon::today();

        // 1. AR Inflows from pending sales invoices
        $unpaidSales = Sale::where('company_id', $companyId)
            ->whereIn('payment_status', ['unpaid', 'partial', 'due'])
            ->where('status', '!=', 'cancelled')
            ->get();

        $inflow7 = 0;
        $inflow30 = 0;
        $inflow60 = 0;
        $inflow90 = 0;

        foreach ($unpaidSales as $sale) {
            $dueAmt = (float) $sale->due_amount;
            if ($dueAmt <= 0) {
                $dueAmt = (float) max(0, $sale->grand_total - $sale->paid_amount);
            }
            if ($dueAmt <= 0) continue;

            $dueDate = $sale->due_date ? Carbon::parse($sale->due_date) : Carbon::parse($sale->sale_date)->addDays(30);
            $diffDays = $today->diffInDays($dueDate, false);

            if ($diffDays <= 7) {
                $inflow7 += $dueAmt;
                $inflow30 += $dueAmt;
                $inflow60 += $dueAmt;
                $inflow90 += $dueAmt;
            } elseif ($diffDays <= 30) {
                $inflow30 += $dueAmt;
                $inflow60 += $dueAmt;
                $inflow90 += $dueAmt;
            } elseif ($diffDays <= 60) {
                $inflow60 += $dueAmt;
                $inflow90 += $dueAmt;
            } elseif ($diffDays <= 90) {
                $inflow90 += $dueAmt;
            }
        }

        // 2. AP Outflows from pending purchase bills
        $unpaidPurchases = Purchase::where('company_id', $companyId)
            ->where('status', '!=', 'cancelled')
            ->get();

        $outflow7 = 0;
        $outflow30 = 0;
        $outflow60 = 0;
        $outflow90 = 0;

        foreach ($unpaidPurchases as $p) {
            $dueAmt = (float) $p->due_amount;
            if ($dueAmt <= 0) continue;

            $dueDate = $p->due_date ? Carbon::parse($p->due_date) : Carbon::parse($p->invoice_date)->addDays(30);
            $diffDays = $today->diffInDays($dueDate, false);

            if ($diffDays <= 7) {
                $outflow7 += $dueAmt;
                $outflow30 += $dueAmt;
                $outflow60 += $dueAmt;
                $outflow90 += $dueAmt;
            } elseif ($diffDays <= 30) {
                $outflow30 += $dueAmt;
                $outflow60 += $dueAmt;
                $outflow90 += $dueAmt;
            } elseif ($diffDays <= 60) {
                $outflow60 += $dueAmt;
                $outflow90 += $dueAmt;
            } elseif ($diffDays <= 90) {
                $outflow90 += $dueAmt;
            }
        }

        // 3. Projected Payroll Outflows
        $avgMonthlyPayroll = (float) (PayrollRun::where('company_id', $companyId)
            ->where('status', 'APPROVED')
            ->orderBy('id', 'desc')
            ->take(3)
            ->avg('total_net') ?? 0);

        $payroll7 = round($avgMonthlyPayroll * (7 / 30), 2);
        $payroll30 = round($avgMonthlyPayroll, 2);
        $payroll60 = round($avgMonthlyPayroll * 2, 2);
        $payroll90 = round($avgMonthlyPayroll * 3, 2);

        $outflow7 += $payroll7;
        $outflow30 += $payroll30;
        $outflow60 += $payroll60;
        $outflow90 += $payroll90;

        // 4. Burn Rate and Runway calculation
        // Operating expenses over the last 90 days
        $past90DaysExpense = (float) JournalEntryLine::whereHas('journalEntry', function ($q) use ($companyId, $today) {
            $q->where('company_id', $companyId)
              ->where('status', 'POSTED')
              ->where('journal_date', '>=', $today->copy()->subDays(90)->toDateString());
        })->whereHas('account', function ($q) {
            $q->where('account_type', 'EXPENSE');
        })->sum(DB::raw('debit - credit'));

        $monthlyBurnRate = $past90DaysExpense > 0 ? round($past90DaysExpense / 3, 2) : max(0, $avgMonthlyPayroll);
        $dailyBurnRate = $monthlyBurnRate > 0 ? round($monthlyBurnRate / 30, 2) : 0;
        $runwayDays = $dailyBurnRate > 0 ? (int) floor($startingCash / $dailyBurnRate) : ($startingCash > 0 ? 999 : 0);

        return [
            'current_cash' => round($startingCash, 2),
            'monthly_burn_rate' => $monthlyBurnRate,
            'daily_burn_rate' => $dailyBurnRate,
            'runway_days' => min(999, max(0, $runwayDays)),
            'projections' => [
                'day_7' => [
                    'inflows' => round($inflow7, 2),
                    'outflows' => round($outflow7, 2),
                    'net_change' => round($inflow7 - $outflow7, 2),
                    'projected_cash' => round($startingCash + $inflow7 - $outflow7, 2),
                ],
                'day_30' => [
                    'inflows' => round($inflow30, 2),
                    'outflows' => round($outflow30, 2),
                    'net_change' => round($inflow30 - $outflow30, 2),
                    'projected_cash' => round($startingCash + $inflow30 - $outflow30, 2),
                ],
                'day_60' => [
                    'inflows' => round($inflow60, 2),
                    'outflows' => round($outflow60, 2),
                    'net_change' => round($inflow60 - $outflow60, 2),
                    'projected_cash' => round($startingCash + $inflow60 - $outflow60, 2),
                ],
                'day_90' => [
                    'inflows' => round($inflow90, 2),
                    'outflows' => round($outflow90, 2),
                    'net_change' => round($inflow90 - $outflow90, 2),
                    'projected_cash' => round($startingCash + $inflow90 - $outflow90, 2),
                ],
            ],
        ];
    }
}
