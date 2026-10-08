<?php

namespace App\Services;

use App\Models\Account;
use App\Models\JournalEntryLine;
use App\Models\FiscalYear;
use App\Models\Sale;
use App\Models\Purchase;
use App\Models\Budget;
use App\Models\FixedAsset;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class FinancialReportingAnalyticsService
{
    public function getFinancialRatios(int $companyId, array $filters = []): array
    {
        $today = Carbon::today();
        $startDate = $filters['start_date'] ?? $today->copy()->startOfYear()->toDateString();
        $endDate = $filters['end_date'] ?? $today->toDateString();

        // 1. P&L Figures for the period
        $baseJournalQuery = JournalEntryLine::whereHas('journalEntry', function ($q) use ($companyId, $startDate, $endDate) {
            $q->where('company_id', $companyId)
              ->where('status', 'POSTED')
              ->whereBetween('journal_date', [$startDate, $endDate]);
        });

        // Revenue: Net Credit on REVENUE
        $revenue = (float) (clone $baseJournalQuery)->whereHas('account', function ($q) {
            $q->where('account_type', 'REVENUE');
        })->sum(DB::raw('credit - debit'));

        // COGS: Net Debit on 5xxx / direct cost EXPENSE
        $cogs = (float) (clone $baseJournalQuery)->whereHas('account', function ($q) {
            $q->where('account_type', 'EXPENSE')
              ->where(function ($sub) {
                  $sub->where('account_code', 'like', '5%')
                      ->orWhere('account_name', 'ilike', '%cogs%')
                      ->orWhere('account_name', 'ilike', '%cost of goods%');
              });
        })->sum(DB::raw('debit - credit'));

        // Total Expenses: Net Debit on all EXPENSE
        $totalExpenses = (float) (clone $baseJournalQuery)->whereHas('account', function ($q) {
            $q->where('account_type', 'EXPENSE');
        })->sum(DB::raw('debit - credit'));

        $operatingExpenses = max(0, $totalExpenses - $cogs);
        $grossProfit = $revenue - $cogs;
        $operatingProfit = $grossProfit - $operatingExpenses;
        $netProfit = $revenue - $totalExpenses;

        // 2. Balance Sheet Figures (Cumulative as of endDate)
        $bsJournalQuery = JournalEntryLine::whereHas('journalEntry', function ($q) use ($companyId, $endDate) {
            $q->where('company_id', $companyId)
              ->where('status', 'POSTED')
              ->where('journal_date', '<=', $endDate);
        });

        // Current Assets (Cash 1010, Bank 1020, AR 1030, Inventory 1040, etc. where code starts with 10)
        $currentAssets = (float) (clone $bsJournalQuery)->whereHas('account', function ($q) {
            $q->where('account_type', 'ASSET')
              ->where(function ($sub) {
                  $sub->where('account_code', 'like', '10%')
                      ->orWhere('account_name', 'ilike', '%current%')
                      ->orWhere('account_name', 'ilike', '%cash%')
                      ->orWhere('account_name', 'ilike', '%bank%')
                      ->orWhere('account_name', 'ilike', '%receivable%')
                      ->orWhere('account_name', 'ilike', '%inventory%');
              });
        })->sum(DB::raw('debit - credit'));

        // Inventory
        $inventory = (float) (clone $bsJournalQuery)->whereHas('account', function ($q) {
            $q->where('account_type', 'ASSET')
              ->where(function ($sub) {
                  $sub->where('account_code', 'like', '104%')
                      ->orWhere('account_name', 'ilike', '%inventory%')
                      ->orWhere('account_name', 'ilike', '%stock%');
              });
        })->sum(DB::raw('debit - credit'));

        // Current Liabilities (AP 2010, Short-term debt, etc. where code starts with 20)
        $currentLiabilities = (float) (clone $bsJournalQuery)->whereHas('account', function ($q) {
            $q->where('account_type', 'LIABILITY')
              ->where(function ($sub) {
                  $sub->where('account_code', 'like', '20%')
                      ->orWhere('account_name', 'ilike', '%current%')
                      ->orWhere('account_name', 'ilike', '%payable%');
              });
        })->sum(DB::raw('credit - debit'));

        // Total Liabilities
        $totalLiabilities = (float) (clone $bsJournalQuery)->whereHas('account', function ($q) {
            $q->where('account_type', 'LIABILITY');
        })->sum(DB::raw('credit - debit'));

        // Total Equity
        $totalEquity = (float) (clone $bsJournalQuery)->whereHas('account', function ($q) {
            $q->where('account_type', 'EQUITY');
        })->sum(DB::raw('credit - debit'));

        // Accounts Receivable
        $ar = (float) (clone $bsJournalQuery)->whereHas('account', function ($q) {
            $q->where('account_type', 'ASSET')
              ->where(function ($sub) {
                  $sub->where('account_code', '1030')
                      ->orWhere('account_name', 'ilike', '%receivable%');
              });
        })->sum(DB::raw('debit - credit'));

        // Accounts Payable
        $ap = (float) (clone $bsJournalQuery)->whereHas('account', function ($q) {
            $q->where('account_type', 'LIABILITY')
              ->where(function ($sub) {
                  $sub->where('account_code', '2010')
                      ->orWhere('account_name', 'ilike', '%payable%');
              });
        })->sum(DB::raw('credit - debit'));

        // 3. Ratios with strict DIVIDE-BY-ZERO GUARDS
        $grossMarginPct = $revenue > 0 ? round(($grossProfit / $revenue) * 100, 2) : 0.0;
        $operatingMarginPct = $revenue > 0 ? round(($operatingProfit / $revenue) * 100, 2) : 0.0;
        $netProfitMarginPct = $revenue > 0 ? round(($netProfit / $revenue) * 100, 2) : 0.0;

        $currentRatio = $currentLiabilities > 0 ? round($currentAssets / $currentLiabilities, 2) : ($currentAssets > 0 ? 999.0 : 0.0);
        $quickAssets = max(0, $currentAssets - $inventory);
        $quickRatio = $currentLiabilities > 0 ? round($quickAssets / $currentLiabilities, 2) : ($quickAssets > 0 ? 999.0 : 0.0);
        $workingCapital = round($currentAssets - $currentLiabilities, 2);

        $debtToEquity = $totalEquity > 0 ? round($totalLiabilities / $totalEquity, 2) : 0.0;
        $inventoryTurnover = $inventory > 0 ? round($cogs / $inventory, 2) : 0.0;

        $annualSales = (float) Sale::where('company_id', $companyId)->whereBetween('sale_date', [$startDate, $endDate])->sum('grand_total');
        $annualPurchases = (float) Purchase::where('company_id', $companyId)->whereBetween('invoice_date', [$startDate, $endDate])->sum('grand_total');

        $dso = $annualSales > 0 ? round(($ar / $annualSales) * 365, 1) : 0.0;
        $dpo = $annualPurchases > 0 ? round(($ap / $annualPurchases) * 365, 1) : 0.0;

        return [
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'financial_metrics' => [
                'revenue' => round($revenue, 2),
                'cogs' => round($cogs, 2),
                'gross_profit' => round($grossProfit, 2),
                'operating_expenses' => round($operatingExpenses, 2),
                'operating_profit' => round($operatingProfit, 2),
                'net_profit' => round($netProfit, 2),
                'current_assets' => round($currentAssets, 2),
                'inventory' => round($inventory, 2),
                'current_liabilities' => round($currentLiabilities, 2),
                'working_capital' => $workingCapital,
                'total_liabilities' => round($totalLiabilities, 2),
                'total_equity' => round($totalEquity, 2),
            ],
            'profitability_ratios' => [
                'gross_margin_pct' => $grossMarginPct,
                'operating_margin_pct' => $operatingMarginPct,
                'net_margin_pct' => $netProfitMarginPct,
            ],
            'liquidity_ratios' => [
                'current_ratio' => $currentRatio,
                'quick_ratio' => $quickRatio,
                'working_capital' => $workingCapital,
            ],
            'efficiency_and_leverage' => [
                'debt_to_equity' => $debtToEquity,
                'inventory_turnover' => $inventoryTurnover,
                'days_sales_outstanding' => $dso,
                'days_payable_outstanding' => $dpo,
            ],
        ];
    }

    public function getDeterministicForecast(int $companyId, string $method = 'MOVING_AVERAGE', int $monthsAhead = 6): array
    {
        $today = Carbon::today();

        // 1. Extract historical monthly revenues and expenses over the last 6 months
        $monthlyHistory = [];
        for ($i = 5; $i >= 0; $i--) {
            $monthStart = $today->copy()->subMonths($i)->startOfMonth()->toDateString();
            $monthEnd = $today->copy()->subMonths($i)->endOfMonth()->toDateString();
            $label = $today->copy()->subMonths($i)->format('Y-m');

            $rev = (float) JournalEntryLine::whereHas('journalEntry', function ($q) use ($companyId, $monthStart, $monthEnd) {
                $q->where('company_id', $companyId)->where('status', 'POSTED')->whereBetween('journal_date', [$monthStart, $monthEnd]);
            })->whereHas('account', function ($q) {
                $q->where('account_type', 'REVENUE');
            })->sum(DB::raw('credit - debit'));

            $exp = (float) JournalEntryLine::whereHas('journalEntry', function ($q) use ($companyId, $monthStart, $monthEnd) {
                $q->where('company_id', $companyId)->where('status', 'POSTED')->whereBetween('journal_date', [$monthStart, $monthEnd]);
            })->whereHas('account', function ($q) {
                $q->where('account_type', 'EXPENSE');
            })->sum(DB::raw('debit - credit'));

            $monthlyHistory[] = [
                'month' => $label,
                'revenue' => round($rev, 2),
                'expense' => round($exp, 2),
                'net_profit' => round($rev - $exp, 2),
            ];
        }

        // Compute baseline rates
        $recentMonths = array_slice($monthlyHistory, -3);
        $avgRev = count($recentMonths) > 0 ? array_sum(array_column($recentMonths, 'revenue')) / count($recentMonths) : 0;
        $avgExp = count($recentMonths) > 0 ? array_sum(array_column($recentMonths, 'expense')) / count($recentMonths) : 0;

        // Weights for weighted average: [1, 2, 3]
        $wTotal = 6; // 1 + 2 + 3
        $wRev = 0;
        $wExp = 0;
        $weights = [1, 2, 3];
        $countRecent = count($recentMonths);
        for ($k = 0; $k < $countRecent; $k++) {
            $weight = $weights[$k] ?? 1;
            $wRev += $recentMonths[$k]['revenue'] * $weight;
            $wExp += $recentMonths[$k]['expense'] * $weight;
        }
        $weightedAvgRev = $wTotal > 0 ? $wRev / $wTotal : $avgRev;
        $weightedAvgExp = $wTotal > 0 ? $wExp / $wTotal : $avgExp;

        // Historical growth rate
        $firstMonth = $monthlyHistory[0]['revenue'] ?? 0;
        $lastMonth = end($monthlyHistory)['revenue'] ?? 0;
        $monthlyGrowthRate = ($firstMonth > 0 && $lastMonth > 0) ? (pow($lastMonth / $firstMonth, 1 / 5) - 1) : 0.02; // default 2% growth if flat/zero

        $projections = [];
        $currentMonth = $today->copy();

        for ($m = 1; $m <= $monthsAhead; $m++) {
            $targetMonth = $currentMonth->copy()->addMonths($m)->format('Y-m');

            if ($method === 'WEIGHTED_AVERAGE') {
                $projRev = $weightedAvgRev;
                $projExp = $weightedAvgExp;
            } elseif ($method === 'GROWTH_RATE') {
                $projRev = $lastMonth > 0 ? $lastMonth * pow(1 + $monthlyGrowthRate, $m) : $avgRev * pow(1 + 0.02, $m);
                $projExp = $avgExp * pow(1 + ($monthlyGrowthRate * 0.8), $m);
            } else { // MOVING_AVERAGE
                $projRev = $avgRev;
                $projExp = $avgExp;
            }

            $projProfit = $projRev - $projExp;

            $projections[] = [
                'month' => $targetMonth,
                'projected_revenue' => round($projRev, 2),
                'projected_expense' => round($projExp, 2),
                'projected_net_profit' => round($projProfit, 2),
            ];
        }

        return [
            'method' => $method,
            'months_ahead' => $monthsAhead,
            'historical' => $monthlyHistory,
            'projections' => $projections,
        ];
    }

    public function getExecutiveDashboardTelemetry(int $companyId): array
    {
        $today = Carbon::today();
        $startOfYear = $today->copy()->startOfYear()->toDateString();
        $endOfYear = $today->toDateString();

        // 1. Revenue & Net Profit YTD
        $journalBase = JournalEntryLine::whereHas('journalEntry', function ($q) use ($companyId, $startOfYear, $endOfYear) {
            $q->where('company_id', $companyId)->where('status', 'POSTED')->whereBetween('journal_date', [$startOfYear, $endOfYear]);
        });

        $ytdRevenue = (float) (clone $journalBase)->whereHas('account', fn($q) => $q->where('account_type', 'REVENUE'))->sum(DB::raw('credit - debit'));
        $ytdExpense = (float) (clone $journalBase)->whereHas('account', fn($q) => $q->where('account_type', 'EXPENSE'))->sum(DB::raw('debit - credit'));
        $ytdNetProfit = $ytdRevenue - $ytdExpense;

        // 2. Cash & Bank
        $liquidCash = (float) JournalEntryLine::whereHas('journalEntry', function ($q) use ($companyId) {
            $q->where('company_id', $companyId)->where('status', 'POSTED');
        })->whereHas('account', function ($q) {
            $q->where('account_type', 'ASSET')
              ->where(function ($sub) {
                  $sub->where('account_code', 'like', '10%')
                      ->orWhere('account_name', 'ilike', '%cash%')
                      ->orWhere('account_name', 'ilike', '%bank%');
              });
        })->sum(DB::raw('debit - credit'));

        // 3. AR Balance
        $arBalance = (float) Sale::where('company_id', $companyId)
            ->whereIn('payment_status', ['unpaid', 'partial', 'due'])
            ->where('status', '!=', 'cancelled')
            ->sum(DB::raw('grand_total - paid_amount'));

        // 4. AP Balance
        $apBalance = (float) Purchase::where('company_id', $companyId)
            ->where('status', '!=', 'cancelled')
            ->sum(DB::raw('grand_total - COALESCE(paid_amount, 0)'));

        // 5. Active Budget Utilization
        $activeBudget = Budget::where('company_id', $companyId)->where('status', 'ACTIVE')->first();
        $budgetTotal = $activeBudget ? (float) $activeBudget->total_budgeted_amount : 0;
        $budgetUtilization = $budgetTotal > 0 ? round(($ytdExpense / $budgetTotal) * 100, 2) : 0;

        // 6. Fixed Assets Book Value
        $assetBookValue = (float) FixedAsset::where('company_id', $companyId)
            ->whereIn('status', ['ACTIVE', 'DEPRECIATING'])
            ->sum(DB::raw('purchase_cost'));

        $assetAccumDepr = (float) DB::table('asset_depreciation_entries')
            ->where('company_id', $companyId)
            ->sum('depreciation_amount');

        $netAssetBookValue = max(0, $assetBookValue - $assetAccumDepr);

        return [
            'ytd_revenue' => round($ytdRevenue, 2),
            'ytd_expense' => round($ytdExpense, 2),
            'ytd_net_profit' => round($ytdNetProfit, 2),
            'liquid_cash_balance' => round($liquidCash, 2),
            'outstanding_ar' => round($arBalance, 2),
            'outstanding_ap' => round($apBalance, 2),
            'active_budget_utilization_pct' => $budgetUtilization,
            'net_fixed_assets_book_value' => round($netAssetBookValue, 2),
        ];
    }
}
