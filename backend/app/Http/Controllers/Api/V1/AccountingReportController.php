<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\Sale;
use App\Services\AccountMappingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AccountingReportController extends Controller
{
    protected AccountMappingService $accountMappingService;

    public function __construct(AccountMappingService $accountMappingService)
    {
        $this->accountMappingService = $accountMappingService;
    }

    /**
     * General Ledger Report for a single account with running balance and opening balance.
     */
    public function generalLedger(Request $request)
    {
        $companyId = $request->attributes->get('company_id');

        $request->validate([
            'account_id' => 'required|integer',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
            'branch_id' => 'nullable|integer',
        ]);

        $accountId = $request->account_id;
        $account = Account::where('company_id', $companyId)->findOrFail($accountId);

        $startDate = $request->input('start_date', $request->input('from_date'));
        $endDate = $request->input('end_date', $request->input('to_date'));

        // 1. Calculate Opening Balance before start_date
        $openingBalance = 0;
        if ($startDate) {
            $priorQuery = DB::table('journal_entry_lines')
                ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
                ->where('journal_entries.company_id', $companyId)
                ->where('journal_entries.status', 'POSTED')
                ->where('journal_entry_lines.account_id', $accountId)
                ->where('journal_entries.journal_date', '<', $startDate);

            if ($request->filled('branch_id')) {
                $priorQuery->where('journal_entry_lines.branch_id', $request->branch_id);
            }

            $priorDebit = (float) $priorQuery->sum('journal_entry_lines.debit');
            $priorCredit = (float) $priorQuery->sum('journal_entry_lines.credit');

            if ($account->normal_balance === 'DEBIT') {
                $openingBalance = $priorDebit - $priorCredit;
            } else {
                $openingBalance = $priorCredit - $priorDebit;
            }
        }

        // 2. Fetch Period Journal Lines
        $query = JournalEntryLine::whereHas('journalEntry', function ($q) use ($companyId, $startDate, $endDate) {
            $q->where('company_id', $companyId)
              ->where('status', 'POSTED');

            if ($startDate) {
                $q->where('journal_date', '>=', $startDate);
            }
            if ($endDate) {
                $q->where('journal_date', '<=', $endDate);
            }
        })
        ->where('account_id', $accountId);

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        $lines = $query->with('journalEntry')
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->orderBy('journal_entries.journal_date', 'asc')
            ->orderBy('journal_entry_lines.id', 'asc')
            ->select('journal_entry_lines.*')
            ->get();

        // 3. Compute running balance and period totals
        $runningBalance = $openingBalance;
        $totalDebit = 0;
        $totalCredit = 0;
        $ledger = [];

        foreach ($lines as $line) {
            $debit = (float) $line->debit;
            $credit = (float) $line->credit;

            $totalDebit += $debit;
            $totalCredit += $credit;

            if ($account->normal_balance === 'DEBIT') {
                $runningBalance += ($debit - $credit);
            } else {
                $runningBalance += ($credit - $debit);
            }

            $ledger[] = [
                'journal_entry_id' => $line->journalEntry->id,
                'journal_number' => $line->journalEntry->journal_number,
                'journal_date' => $line->journalEntry->journal_date->toDateString(),
                'description' => $line->description ?: $line->journalEntry->description,
                'source' => $line->journalEntry->source,
                'debit' => $debit,
                'credit' => $credit,
                'running_balance' => round($runningBalance, 4),
            ];
        }

        $closingBalance = $runningBalance;

        return response()->json([
            'success' => true,
            'data' => [
                'account' => $account,
                'from_date' => $startDate,
                'to_date' => $endDate,
                'opening_balance' => round($openingBalance, 4),
                'total_debit' => round($totalDebit, 4),
                'total_credit' => round($totalCredit, 4),
                'closing_balance' => round($closingBalance, 4),
                'lines' => $ledger,
            ]
        ]);
    }

    /**
     * Trial Balance Report
     * Lists all active accounts and their debit/credit balances.
     */
    public function trialBalance(Request $request)
    {
        $companyId = $request->attributes->get('company_id');

        $request->validate([
            'as_of_date' => 'nullable|date',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
            'branch_id' => 'nullable|integer',
        ]);

        $asOfDate = $request->input('as_of_date', $request->input('to_date', $request->input('end_date')));
        $startDate = $request->input('start_date', $request->input('from_date'));
        $endDate = $request->input('end_date', $request->input('to_date', $asOfDate));

        $query = DB::table('journal_entry_lines')
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->join('accounts', 'journal_entry_lines.account_id', '=', 'accounts.id')
            ->where('journal_entries.company_id', $companyId)
            ->where('journal_entries.status', 'POSTED')
            ->select(
                'accounts.id',
                'accounts.account_code',
                'accounts.account_name',
                'accounts.account_type',
                'accounts.normal_balance',
                DB::raw('SUM(journal_entry_lines.debit) as total_debit'),
                DB::raw('SUM(journal_entry_lines.credit) as total_credit')
            )
            ->groupBy('accounts.id', 'accounts.account_code', 'accounts.account_name', 'accounts.account_type', 'accounts.normal_balance')
            ->orderBy('accounts.account_code');

        if ($asOfDate) {
            $query->where('journal_entries.journal_date', '<=', $asOfDate);
        } else {
            if ($startDate) {
                $query->where('journal_entries.journal_date', '>=', $startDate);
            }
            if ($endDate) {
                $query->where('journal_entries.journal_date', '<=', $endDate);
            }
        }

        if ($request->filled('branch_id')) {
            $query->where('journal_entry_lines.branch_id', $request->branch_id);
        }

        $results = $query->get();

        $trialBalance = [];
        $grandTotalDebit = 0;
        $grandTotalCredit = 0;

        foreach ($results as $row) {
            $debit = (float) $row->total_debit;
            $credit = (float) $row->total_credit;

            $balance = 0;
            $isDebitBalance = false;

            if ($row->normal_balance === 'DEBIT') {
                $balance = $debit - $credit;
                $isDebitBalance = $balance >= 0;
            } else {
                $balance = $credit - $debit;
                $isDebitBalance = $balance < 0;
            }

            $absBalance = abs($balance);

            $debitBal = $isDebitBalance ? $absBalance : 0;
            $creditBal = !$isDebitBalance ? $absBalance : 0;

            $trialBalance[] = [
                'account_id' => $row->id,
                'account_code' => $row->account_code,
                'account_name' => $row->account_name,
                'account_type' => $row->account_type,
                'normal_balance' => $row->normal_balance,
                'debit_balance' => round($debitBal, 4),
                'credit_balance' => round($creditBal, 4),
            ];

            $grandTotalDebit += $debitBal;
            $grandTotalCredit += $creditBal;
        }

        $diff = abs($grandTotalDebit - $grandTotalCredit);

        return response()->json([
            'success' => true,
            'data' => [
                'as_of_date' => $asOfDate,
                'lines' => $trialBalance,
                'total_debit' => round($grandTotalDebit, 4),
                'total_credit' => round($grandTotalCredit, 4),
                'difference' => round($diff, 4),
                'variance' => round($diff, 4),
                'is_balanced' => $diff < 0.0001,
            ]
        ]);
    }

    /**
     * Profit & Loss (Income Statement) Report
     * Revenue - COGS = Gross Profit
     * Gross Profit - Operating Expenses = Net Profit
     */
    public function profitAndLoss(Request $request)
    {
        $companyId = $request->attributes->get('company_id');

        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
            'branch_id' => 'nullable|integer',
        ]);

        $startDate = $request->input('start_date', $request->input('from_date', Carbon::now()->startOfMonth()->toDateString()));
        $endDate = $request->input('end_date', $request->input('to_date', Carbon::now()->endOfMonth()->toDateString()));

        $query = DB::table('journal_entry_lines')
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->join('accounts', 'journal_entry_lines.account_id', '=', 'accounts.id')
            ->where('journal_entries.company_id', $companyId)
            ->where('journal_entries.status', 'POSTED')
            ->whereBetween('journal_entries.journal_date', [$startDate, $endDate])
            ->whereIn('accounts.account_type', ['REVENUE', 'EXPENSE', 'COGS'])
            ->select(
                'accounts.id',
                'accounts.account_code',
                'accounts.account_name',
                'accounts.account_type',
                DB::raw('SUM(journal_entry_lines.debit) as total_debit'),
                DB::raw('SUM(journal_entry_lines.credit) as total_credit')
            )
            ->groupBy('accounts.id', 'accounts.account_code', 'accounts.account_name', 'accounts.account_type')
            ->orderBy('accounts.account_code');

        if ($request->filled('branch_id')) {
            $query->where('journal_entry_lines.branch_id', $request->branch_id);
        }

        $results = $query->get();

        $revenues = [];
        $cogsItems = [];
        $expenses = [];

        $totalRevenue = 0;
        $totalCogs = 0;
        $totalExpenses = 0;

        foreach ($results as $row) {
            $debit = (float) $row->total_debit;
            $credit = (float) $row->total_credit;

            if ($row->account_type === 'REVENUE') {
                $net = $credit - $debit;
                if (abs($net) > 0.0001) {
                    $revenues[] = [
                        'account_id' => $row->id,
                        'account_code' => $row->account_code,
                        'account_name' => $row->account_name,
                        'amount' => round($net, 4),
                    ];
                    $totalRevenue += $net;
                }
            } elseif ($row->account_type === 'COGS' || stripos($row->account_name, 'Cost of Goods') !== false || stripos($row->account_code, '5000') !== false) {
                $net = $debit - $credit;
                if (abs($net) > 0.0001) {
                    $cogsItems[] = [
                        'account_id' => $row->id,
                        'account_code' => $row->account_code,
                        'account_name' => $row->account_name,
                        'amount' => round($net, 4),
                    ];
                    $totalCogs += $net;
                }
            } else {
                $net = $debit - $credit;
                if (abs($net) > 0.0001) {
                    $expenses[] = [
                        'account_id' => $row->id,
                        'account_code' => $row->account_code,
                        'account_name' => $row->account_name,
                        'amount' => round($net, 4),
                    ];
                    $totalExpenses += $net;
                }
            }
        }

        $grossProfit = $totalRevenue - $totalCogs;
        $grossMargin = $totalRevenue > 0 ? round(($grossProfit / $totalRevenue) * 100, 2) : 0;
        $netProfit = $grossProfit - $totalExpenses;
        $netMargin = $totalRevenue > 0 ? round(($netProfit / $totalRevenue) * 100, 2) : 0;

        return response()->json([
            'success' => true,
            'data' => [
                'period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'from_date' => $startDate,
                    'to_date' => $endDate,
                ],
                'revenues' => $revenues,
                'total_revenue' => round($totalRevenue, 4),
                'operating_revenue' => round($totalRevenue, 4),
                'cogs' => $cogsItems,
                'total_cogs' => round($totalCogs, 4),
                'cost_of_goods_sold' => round($totalCogs, 4),
                'gross_profit' => round($grossProfit, 4),
                'gross_margin' => $grossMargin,
                'gross_margin_percentage' => $grossMargin,
                'operating_expenses' => round($totalExpenses, 4),
                'total_expenses' => round($totalExpenses, 4),
                'operating_expenses_list' => $expenses,
                'net_profit' => round($netProfit, 4),
                'net_margin' => $netMargin,
                'net_margin_percentage' => $netMargin,
                'breakdown' => [
                    'revenue_accounts' => $revenues,
                    'cogs_accounts' => $cogsItems,
                    'expense_accounts' => $expenses,
                ],
            ]
        ]);
    }

    /**
     * Balance Sheet Report
     * Invariant: Total Assets == Total Liabilities + Total Equity
     */
    public function balanceSheet(Request $request)
    {
        $companyId = $request->attributes->get('company_id');

        $request->validate([
            'as_of_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'to_date' => 'nullable|date',
            'branch_id' => 'nullable|integer',
        ]);

        $asOfDate = $request->input('as_of_date', $request->input('to_date', $request->input('end_date', Carbon::now()->toDateString())));

        // 1. Fetch all account balances as of date
        $query = DB::table('journal_entry_lines')
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->join('accounts', 'journal_entry_lines.account_id', '=', 'accounts.id')
            ->where('journal_entries.company_id', $companyId)
            ->where('journal_entries.status', 'POSTED')
            ->where('journal_entries.journal_date', '<=', $asOfDate)
            ->select(
                'accounts.id',
                'accounts.account_code',
                'accounts.account_name',
                'accounts.account_type',
                'accounts.normal_balance',
                DB::raw('SUM(journal_entry_lines.debit) as total_debit'),
                DB::raw('SUM(journal_entry_lines.credit) as total_credit')
            )
            ->groupBy('accounts.id', 'accounts.account_code', 'accounts.account_name', 'accounts.account_type', 'accounts.normal_balance')
            ->orderBy('accounts.account_code');

        if ($request->filled('branch_id')) {
            $query->where('journal_entry_lines.branch_id', $request->branch_id);
        }

        $results = $query->get();

        $assets = [];
        $liabilities = [];
        $equity = [];

        $totalAssets = 0;
        $totalLiabilities = 0;
        $totalEquity = 0;

        // Also track cumulative profit (Revenue - Expense - COGS)
        $cumulativeRevenue = 0;
        $cumulativeExpense = 0;

        foreach ($results as $row) {
            $debit = (float) $row->total_debit;
            $credit = (float) $row->total_credit;

            if ($row->account_type === 'ASSET') {
                $net = $debit - $credit;
                $assets[] = [
                    'account_id' => $row->id,
                    'account_code' => $row->account_code,
                    'account_name' => $row->account_name,
                    'balance' => round($net, 4),
                    'amount' => round($net, 4),
                ];
                $totalAssets += $net;
            } elseif ($row->account_type === 'LIABILITY') {
                $net = $credit - $debit;
                $liabilities[] = [
                    'account_id' => $row->id,
                    'account_code' => $row->account_code,
                    'account_name' => $row->account_name,
                    'balance' => round($net, 4),
                    'amount' => round($net, 4),
                ];
                $totalLiabilities += $net;
            } elseif ($row->account_type === 'EQUITY') {
                $net = $credit - $debit;
                $equity[] = [
                    'account_id' => $row->id,
                    'account_code' => $row->account_code,
                    'account_name' => $row->account_name,
                    'balance' => round($net, 4),
                    'amount' => round($net, 4),
                ];
                $totalEquity += $net;
            } elseif ($row->account_type === 'REVENUE') {
                $cumulativeRevenue += ($credit - $debit);
            } elseif ($row->account_type === 'EXPENSE' || $row->account_type === 'COGS') {
                $cumulativeExpense += ($debit - $credit);
            }
        }

        // Retained Earnings from operational income
        $retainedEarnings = $cumulativeRevenue - $cumulativeExpense;
        $equity[] = [
            'account_id' => null,
            'account_code' => 'RE-CURR',
            'account_name' => 'Current Period Retained Earnings',
            'balance' => round($retainedEarnings, 4),
            'amount' => round($retainedEarnings, 4),
        ];
        $totalEquity += $retainedEarnings;

        $totalLiabilitiesAndEquity = $totalLiabilities + $totalEquity;
        $diff = abs($totalAssets - $totalLiabilitiesAndEquity);

        return response()->json([
            'success' => true,
            'data' => [
                'as_of_date' => $asOfDate,
                'assets' => $assets,
                'total_assets' => round($totalAssets, 4),
                'liabilities' => $liabilities,
                'total_liabilities' => round($totalLiabilities, 4),
                'equity' => $equity,
                'total_equity' => round($totalEquity, 4),
                'total_liabilities_and_equity' => round($totalLiabilitiesAndEquity, 4),
                'current_period_earnings' => round($retainedEarnings, 4),
                'retained_earnings' => round($retainedEarnings, 4),
                'difference' => round($diff, 4),
                'variance' => round($diff, 4),
                'is_balanced' => $diff < 0.001,
                'breakdown' => [
                    'asset_accounts' => $assets,
                    'liability_accounts' => $liabilities,
                    'equity_accounts' => $equity,
                ],
            ]
        ]);
    }

    /**
     * Cash Flow Statement Report
     * Opening Cash + Inflows - Outflows = Closing Cash
     */
    public function cashFlow(Request $request)
    {
        $companyId = $request->attributes->get('company_id');

        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
            'branch_id' => 'nullable|integer',
        ]);

        $startDate = $request->input('start_date', $request->input('from_date', Carbon::now()->startOfMonth()->toDateString()));
        $endDate = $request->input('end_date', $request->input('to_date', Carbon::now()->endOfMonth()->toDateString()));

        // Find cash & bank account IDs
        $cashBankAccounts = [];
        if ($this->accountMappingService->isConfigured($companyId, AccountMappingService::ROLE_CASH_BANK)) {
            $mappedAcc = $this->accountMappingService->getAccountId($companyId, AccountMappingService::ROLE_CASH_BANK);
            if ($mappedAcc) $cashBankAccounts[] = $mappedAcc;
        }

        $fallbackCashBank = Account::where('company_id', $companyId)
            ->where('account_type', 'ASSET')
            ->where('is_active', true)
            ->where(function ($q) {
                $q->where('account_name', 'like', '%Cash%')
                  ->orWhere('account_name', 'like', '%cash%')
                  ->orWhere('account_name', 'like', '%Bank%')
                  ->orWhere('account_name', 'like', '%bank%');
            })
            ->pluck('id')
            ->toArray();

        $cashBankAccounts = array_values(array_unique(array_merge($cashBankAccounts, $fallbackCashBank)));

        // 1. Opening Cash Balance
        $openingBalance = 0;
        if (!empty($cashBankAccounts)) {
            $priorLines = DB::table('journal_entry_lines')
                ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
                ->where('journal_entries.company_id', $companyId)
                ->where('journal_entries.status', 'POSTED')
                ->whereIn('journal_entry_lines.account_id', $cashBankAccounts)
                ->where('journal_entries.journal_date', '<', $startDate);

            if ($request->filled('branch_id')) {
                $priorLines->where('journal_entry_lines.branch_id', $request->branch_id);
            }

            $priorDebit = (float) $priorLines->sum('journal_entry_lines.debit');
            $priorCredit = (float) $priorLines->sum('journal_entry_lines.credit');
            $openingBalance = $priorDebit - $priorCredit;
        }

        // 2. Period Inflows and Outflows
        $inflows = [];
        $outflows = [];
        $totalInflow = 0;
        $totalOutflow = 0;

        if (!empty($cashBankAccounts)) {
            $periodQuery = DB::table('journal_entry_lines')
                ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
                ->where('journal_entries.company_id', $companyId)
                ->where('journal_entries.status', 'POSTED')
                ->whereIn('journal_entry_lines.account_id', $cashBankAccounts)
                ->whereBetween('journal_entries.journal_date', [$startDate, $endDate]);

            if ($request->filled('branch_id')) {
                $periodQuery->where('journal_entry_lines.branch_id', $request->branch_id);
            }

            $lines = $periodQuery->select(
                'journal_entries.reference_type',
                DB::raw('COALESCE(journal_entries.source, \'SYSTEM\') as source'),
                DB::raw('SUM(journal_entry_lines.debit) as inflow'),
                DB::raw('SUM(journal_entry_lines.credit) as outflow')
            )
            ->groupBy('journal_entries.reference_type', DB::raw('COALESCE(journal_entries.source, \'SYSTEM\')'))
            ->get();

            foreach ($lines as $item) {
                $in = (float) $item->inflow;
                $out = (float) $item->outflow;

                $label = $item->reference_type ? ucwords(str_replace('_', ' ', strtolower($item->reference_type))) : 'Other Transactions';

                if ($in > 0) {
                    $inflows[] = [
                        'source' => $label,
                        'reference_type' => $item->reference_type ?: 'OTHER',
                        'total' => round($in, 4),
                        'amount' => round($in, 4),
                    ];
                    $totalInflow += $in;
                }
                if ($out > 0) {
                    $outflows[] = [
                        'category' => $label,
                        'reference_type' => $item->reference_type ?: 'OTHER',
                        'total' => round($out, 4),
                        'amount' => round($out, 4),
                    ];
                    $totalOutflow += $out;
                }
            }
        }

        $netMovement = $totalInflow - $totalOutflow;
        $closingBalance = $openingBalance + $netMovement;

        return response()->json([
            'success' => true,
            'data' => [
                'period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'from_date' => $startDate,
                    'to_date' => $endDate,
                ],
                'opening_cash_balance' => round($openingBalance, 4),
                'opening_cash' => round($openingBalance, 4),
                'inflows' => $inflows,
                'total_inflows' => round($totalInflow, 4),
                'total_inflow' => round($totalInflow, 4),
                'outflows' => $outflows,
                'total_outflows' => round($totalOutflow, 4),
                'total_outflow' => round($totalOutflow, 4),
                'net_cash_movement' => round($netMovement, 4),
                'net_movement' => round($netMovement, 4),
                'closing_cash_balance' => round($closingBalance, 4),
                'closing_cash' => round($closingBalance, 4),
                'inflows_breakdown' => $inflows,
                'outflows_breakdown' => $outflows,
            ]
        ]);
    }

    /**
     * VAT / Tax Report
     * Reconciles Sales VAT collections with General Ledger VAT Payable balance
     */
    public function vatReport(Request $request)
    {
        $companyId = $request->attributes->get('company_id');

        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
            'branch_id' => 'nullable|integer',
        ]);

        $startDate = $request->input('start_date', $request->input('from_date', Carbon::now()->startOfMonth()->toDateString()));
        $endDate = $request->input('end_date', $request->input('to_date', Carbon::now()->endOfMonth()->toDateString()));

        // 1. Sales VAT statistics
        $salesQuery = Sale::where('company_id', $companyId)
            ->where('status', 'COMPLETED')
            ->whereBetween('sale_date', [$startDate, $endDate]);

        if ($request->filled('branch_id')) {
            $salesQuery->where('branch_id', $request->branch_id);
        }

        $taxableSales = (float) $salesQuery->sum('subtotal');
        $outputVat = (float) $salesQuery->sum('tax_total');
        $salesCount = $salesQuery->count();

        // 2. GL VAT Payable Account Balance
        $vatAccount = null;
        if ($this->accountMappingService->isConfigured($companyId, AccountMappingService::ROLE_VAT_PAYABLE)) {
            $vatAccountId = $this->accountMappingService->getAccountId($companyId, AccountMappingService::ROLE_VAT_PAYABLE);
            $vatAccount = Account::where('company_id', $companyId)->find($vatAccountId);
        }

        if (!$vatAccount) {
            $vatAccount = Account::where('company_id', $companyId)
                ->where('account_type', 'LIABILITY')
                ->where('is_active', true)
                ->where(function ($q) {
                    $q->where('account_name', 'like', '%VAT%')
                      ->orWhere('account_name', 'like', '%vat%')
                      ->orWhere('account_name', 'like', '%Tax%')
                      ->orWhere('account_name', 'like', '%tax%');
                })
                ->first();
        }

        $glOpeningVat = 0;
        $glPeriodOutputVat = 0;
        $glPeriodSettledVat = 0;
        $glClosingVat = 0;

        if ($vatAccount) {
            // Opening balance
            $priorQuery = DB::table('journal_entry_lines')
                ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
                ->where('journal_entries.company_id', $companyId)
                ->where('journal_entries.status', 'POSTED')
                ->where('journal_entry_lines.account_id', $vatAccount->id)
                ->where('journal_entries.journal_date', '<', $startDate);

            $priorDebit = (float) $priorQuery->sum('journal_entry_lines.debit');
            $priorCredit = (float) $priorQuery->sum('journal_entry_lines.credit');
            $glOpeningVat = $priorCredit - $priorDebit;

            // Period movements
            $periodQuery = DB::table('journal_entry_lines')
                ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
                ->where('journal_entries.company_id', $companyId)
                ->where('journal_entries.status', 'POSTED')
                ->where('journal_entry_lines.account_id', $vatAccount->id)
                ->whereBetween('journal_entries.journal_date', [$startDate, $endDate]);

            $periodDebit = (float) $periodQuery->sum('journal_entry_lines.debit');
            $periodCredit = (float) $periodQuery->sum('journal_entry_lines.credit');

            $glPeriodOutputVat = $periodCredit;
            $glPeriodSettledVat = $periodDebit;
            $glClosingVat = $glOpeningVat + ($glPeriodOutputVat - $glPeriodSettledVat);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'from_date' => $startDate,
                    'to_date' => $endDate,
                ],
                'sales_summary' => [
                    'sales_count' => $salesCount,
                    'taxable_sales' => round($taxableSales, 4),
                    'total_taxable_revenue' => round($taxableSales, 4),
                    'output_vat' => round($outputVat, 4),
                    'total_output_vat' => round($outputVat, 4),
                ],
                'gl_vat_payable_balance' => round($glClosingVat, 4),
                'gl_vat_period_movement' => round($glPeriodOutputVat - $glPeriodSettledVat, 4),
                'gl_reconciliation' => [
                    'vat_account_code' => $vatAccount?->account_code,
                    'vat_account_name' => $vatAccount?->account_name,
                    'opening_vat_payable' => round($glOpeningVat, 4),
                    'period_vat_collected' => round($glPeriodOutputVat, 4),
                    'period_vat_settled' => round($glPeriodSettledVat, 4),
                    'closing_vat_payable' => round($glClosingVat, 4),
                ]
            ]
        ]);
    }
}
