<?php

namespace App\Services;

use App\Models\FiscalYear;
use App\Models\AccountingPeriod;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\YearEndClosing;
use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Carbon\Carbon;

class YearEndClosingService
{
    protected AccountingService $accountingService;

    public function __construct(AccountingService $accountingService)
    {
        $this->accountingService = $accountingService;
    }

    public function previewYearEndClosing(int $companyId, int $fiscalYearId): array
    {
        $fy = FiscalYear::where('company_id', $companyId)->findOrFail($fiscalYearId);

        // 1. Check periods
        $periods = AccountingPeriod::where('company_id', $companyId)
            ->where('fiscal_year_id', $fy->id)
            ->get();

        $openPeriodsCount = $periods->where('status', '!=', 'CLOSED')->count();

        // 2. Revenue Accounts summary
        $revenueAccounts = Account::where('company_id', $companyId)
            ->where('account_type', 'REVENUE')
            ->get();

        $totalRevenue = 0;
        $revenueLines = [];
        foreach ($revenueAccounts as $acc) {
            $cr = (float) JournalEntryLine::whereHas('journalEntry', function ($q) use ($companyId, $fy) {
                $q->where('company_id', $companyId)
                  ->where('fiscal_year_id', $fy->id)
                  ->where('status', 'POSTED');
            })->where('account_id', $acc->id)->sum('credit');

            $dr = (float) JournalEntryLine::whereHas('journalEntry', function ($q) use ($companyId, $fy) {
                $q->where('company_id', $companyId)
                  ->where('fiscal_year_id', $fy->id)
                  ->where('status', 'POSTED');
            })->where('account_id', $acc->id)->sum('debit');

            $net = $cr - $dr;
            if (abs($net) > 0.0001) {
                $totalRevenue += $net;
                $revenueLines[] = [
                    'account_id' => $acc->id,
                    'account_code' => $acc->account_code,
                    'account_name' => $acc->account_name,
                    'balance' => round($net, 2),
                ];
            }
        }

        // 3. Expense Accounts summary
        $expenseAccounts = Account::where('company_id', $companyId)
            ->where('account_type', 'EXPENSE')
            ->get();

        $totalExpense = 0;
        $expenseLines = [];
        foreach ($expenseAccounts as $acc) {
            $dr = (float) JournalEntryLine::whereHas('journalEntry', function ($q) use ($companyId, $fy) {
                $q->where('company_id', $companyId)
                  ->where('fiscal_year_id', $fy->id)
                  ->where('status', 'POSTED');
            })->where('account_id', $acc->id)->sum('debit');

            $cr = (float) JournalEntryLine::whereHas('journalEntry', function ($q) use ($companyId, $fy) {
                $q->where('company_id', $companyId)
                  ->where('fiscal_year_id', $fy->id)
                  ->where('status', 'POSTED');
            })->where('account_id', $acc->id)->sum('credit');

            $net = $dr - $cr;
            if (abs($net) > 0.0001) {
                $totalExpense += $net;
                $expenseLines[] = [
                    'account_id' => $acc->id,
                    'account_code' => $acc->account_code,
                    'account_name' => $acc->account_name,
                    'balance' => round($net, 2),
                ];
            }
        }

        $netProfit = $totalRevenue - $totalExpense;

        return [
            'fiscal_year' => [
                'id' => $fy->id,
                'name' => $fy->name,
                'start_date' => $fy->start_date ? $fy->start_date->format('Y-m-d') : null,
                'end_date' => $fy->end_date ? $fy->end_date->format('Y-m-d') : null,
                'status' => $fy->status,
                'unclosed_periods' => $openPeriodsCount,
            ],
            'total_revenue' => round($totalRevenue, 2),
            'total_expense' => round($totalExpense, 2),
            'net_profit' => round($netProfit, 2),
            'revenue_accounts' => $revenueLines,
            'expense_accounts' => $expenseLines,
            'is_ready_to_close' => $fy->status === 'OPEN',
        ];
    }

    public function executeYearEndClosing(int $companyId, int $fiscalYearId, int $retainedEarningsAccountId, ?string $notes, int $userId): YearEndClosing
    {
        return DB::transaction(function () use ($companyId, $fiscalYearId, $retainedEarningsAccountId, $notes, $userId) {
            $fy = FiscalYear::where('company_id', $companyId)->lockForUpdate()->findOrFail($fiscalYearId);

            if ($fy->status === 'CLOSED') {
                throw new ConflictHttpException("Fiscal year {$fy->name} is already closed.");
            }

            // Verify Retained Earnings account
            $retainedEarningsAcc = Account::where('company_id', $companyId)->findOrFail($retainedEarningsAccountId);
            if ($retainedEarningsAcc->account_type !== 'EQUITY') {
                throw new ConflictHttpException("Selected Retained Earnings account must be of type EQUITY.");
            }

            $preview = $this->previewYearEndClosing($companyId, $fiscalYearId);
            $totalRevenue = $preview['total_revenue'];
            $totalExpense = $preview['total_expense'];
            $netProfit = $preview['net_profit'];

            // Build closing lines:
            // 1. DR Revenue accounts (to zero them out)
            $closingLines = [];
            foreach ($preview['revenue_accounts'] as $r) {
                if ($r['balance'] > 0) {
                    $closingLines[] = [
                        'account_id' => $r['account_id'],
                        'description' => "Close Revenue: {$r['account_name']}",
                        'debit' => $r['balance'],
                        'credit' => 0,
                    ];
                } elseif ($r['balance'] < 0) {
                    $closingLines[] = [
                        'account_id' => $r['account_id'],
                        'description' => "Close Contra-Revenue: {$r['account_name']}",
                        'debit' => 0,
                        'credit' => abs($r['balance']),
                    ];
                }
            }

            // 2. CR Expense accounts (to zero them out)
            foreach ($preview['expense_accounts'] as $e) {
                if ($e['balance'] > 0) {
                    $closingLines[] = [
                        'account_id' => $e['account_id'],
                        'description' => "Close Expense: {$e['account_name']}",
                        'debit' => 0,
                        'credit' => $e['balance'],
                    ];
                } elseif ($e['balance'] < 0) {
                    $closingLines[] = [
                        'account_id' => $e['account_id'],
                        'description' => "Close Contra-Expense: {$e['account_name']}",
                        'debit' => abs($e['balance']),
                        'credit' => 0,
                    ];
                }
            }

            // 3. Balance to Retained Earnings
            if ($netProfit > 0) {
                $closingLines[] = [
                    'account_id' => $retainedEarningsAcc->id,
                    'description' => "Transfer Net Profit to Retained Earnings for FY {$fy->name}",
                    'debit' => 0,
                    'credit' => $netProfit,
                ];
            } elseif ($netProfit < 0) {
                $closingLines[] = [
                    'account_id' => $retainedEarningsAcc->id,
                    'description' => "Transfer Net Loss to Retained Earnings for FY {$fy->name}",
                    'debit' => abs($netProfit),
                    'credit' => 0,
                ];
            }

            $closingJournal = null;
            if (count($closingLines) >= 2) {
                $closingJournalNumber = $this->accountingService->generateJournalNumber($companyId);
                $closingDate = $fy->end_date ? $fy->end_date->format('Y-m-d') : date('Y-m-d');

                // Last period of the FY
                $lastPeriod = AccountingPeriod::where('company_id', $companyId)
                    ->where('fiscal_year_id', $fy->id)
                    ->orderBy('end_date', 'desc')
                    ->first();

                $closingJournal = JournalEntry::create([
                    'company_id' => $companyId,
                    'fiscal_year_id' => $fy->id,
                    'accounting_period_id' => $lastPeriod ? $lastPeriod->id : null,
                    'journal_number' => $closingJournalNumber,
                    'journal_date' => $closingDate,
                    'reference_type' => 'YEAR_END_CLOSING',
                    'description' => "Year-End Closing Entry for Fiscal Year {$fy->name}",
                    'status' => 'POSTED',
                    'source' => 'YEAR_END_CLOSING',
                    'created_by' => $userId,
                    'posted_by' => $userId,
                    'posted_at' => Carbon::now(),
                ]);

                foreach ($closingLines as $line) {
                    $closingJournal->lines()->create([
                        'account_id' => $line['account_id'],
                        'description' => $line['description'],
                        'debit' => $line['debit'],
                        'credit' => $line['credit'],
                    ]);
                }
            }

            // Close all periods
            AccountingPeriod::where('company_id', $companyId)
                ->where('fiscal_year_id', $fy->id)
                ->update([
                    'status' => 'CLOSED',
                    'closed_by' => $userId,
                    'closed_at' => Carbon::now(),
                ]);

            // Close Fiscal Year
            $fy->status = 'CLOSED';
            $fy->save();

            // Record YearEndClosing
            $closing = YearEndClosing::create([
                'company_id' => $companyId,
                'fiscal_year_id' => $fy->id,
                'closing_date' => $fy->end_date ? $fy->end_date->format('Y-m-d') : date('Y-m-d'),
                'retained_earnings_account_id' => $retainedEarningsAcc->id,
                'total_revenue' => $totalRevenue,
                'total_expense' => $totalExpense,
                'net_profit_amount' => $netProfit,
                'closing_journal_entry_id' => $closingJournal ? $closingJournal->id : null,
                'status' => 'COMPLETED',
                'closed_by' => $userId,
                'closed_at' => Carbon::now(),
                'notes' => $notes,
            ]);

            AuditLog::log($companyId, $userId, 'YEAR_END_CLOSED', $closing->id, 'YearEndClosing', "Successfully executed year-end closing for {$fy->name} (Net Profit: {$netProfit})");

            return $closing->load('retainedEarningsAccount', 'closingJournalEntry.lines');
        });
    }

    public function reverseYearEndClosing(int $companyId, int $yearEndClosingId, string $reason, int $userId): YearEndClosing
    {
        return DB::transaction(function () use ($companyId, $yearEndClosingId, $reason, $userId) {
            $closing = YearEndClosing::where('company_id', $companyId)->lockForUpdate()->findOrFail($yearEndClosingId);

            if ($closing->status === 'REVERSED') {
                throw new ConflictHttpException("This year-end closing is already reversed.");
            }

            // If there's a closing journal, reverse it
            if ($closing->closing_journal_entry_id) {
                $closingJournal = JournalEntry::where('company_id', $companyId)->find($closing->closing_journal_entry_id);
                if ($closingJournal && $closingJournal->status === 'POSTED') {
                    $closingJournal->status = 'REVERSED';
                    $closingJournal->reversed_by = $userId;
                    $closingJournal->reversed_at = Carbon::now();
                    $closingJournal->save();
                }
            }

            // Re-open Fiscal Year
            $fy = FiscalYear::where('company_id', $companyId)->find($closing->fiscal_year_id);
            if ($fy) {
                $fy->status = 'OPEN';
                $fy->save();
            }

            $closing->status = 'REVERSED';
            $closing->notes = ($closing->notes ? $closing->notes . "\n" : '') . "Reversed by user #{$userId} on " . Carbon::now()->toIso8601String() . ": {$reason}";
            $closing->save();

            AuditLog::log($companyId, $userId, 'YEAR_END_REVERSED', $closing->id, 'YearEndClosing', "Reversed year-end closing for FY #{$closing->fiscal_year_id}. Reason: {$reason}");

            return $closing;
        });
    }
}
