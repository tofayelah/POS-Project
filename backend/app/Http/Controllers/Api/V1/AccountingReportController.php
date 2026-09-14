<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\JournalEntryLine;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AccountingReportController extends Controller
{
    public function generalLedger(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        
        $request->validate([
            'account_id' => 'required|exists:accounts,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);
        
        $accountId = $request->account_id;
        
        $query = JournalEntryLine::whereHas('journalEntry', function($q) use ($companyId, $request) {
            $q->where('company_id', $companyId)
              ->where('status', 'POSTED');
              
            if ($request->has('start_date')) {
                $q->where('journal_date', '>=', $request->start_date);
            }
            if ($request->has('end_date')) {
                $q->where('journal_date', '<=', $request->end_date);
            }
        })
        ->where('account_id', $accountId)
        ->with('journalEntry')
        ->orderBy(JournalEntry::select('journal_date')->whereColumn('journal_entries.id', 'journal_entry_lines.journal_entry_id'))
        ->orderBy('id');
        
        $lines = $query->get();
        
        $account = Account::find($accountId);
        
        // Calculate running balance
        $balance = 0;
        $ledger = [];
        
        foreach ($lines as $line) {
            $debit = (float) $line->debit;
            $credit = (float) $line->credit;
            
            if ($account->normal_balance === 'DEBIT') {
                $balance += $debit - $credit;
            } else {
                $balance += $credit - $debit;
            }
            
            $ledger[] = [
                'id' => $line->id,
                'journal_entry_id' => $line->journal_entry_id,
                'journal_number' => $line->journalEntry->journal_number,
                'journal_date' => $line->journalEntry->journal_date->format('Y-m-d'),
                'description' => $line->description ?? $line->journalEntry->description,
                'reference' => $line->reference ?? $line->journalEntry->reference_type,
                'debit' => $debit,
                'credit' => $credit,
                'running_balance' => $balance
            ];
        }
        
        return response()->json([
            'success' => true,
            'data' => [
                'account' => $account,
                'ledger' => $ledger,
                'closing_balance' => $balance
            ]
        ]);
    }
    
    public function trialBalance(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);
        
        // Group by account, sum debits and credits from POSTED journals
        $query = DB::table('journal_entry_lines')
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->join('accounts', 'journal_entry_lines.account_id', '=', 'accounts.id')
            ->where('journal_entries.company_id', $companyId)
            ->where('journal_entries.status', 'POSTED')
            ->select(
                'accounts.id',
                'accounts.account_code',
                'accounts.account_name',
                'accounts.normal_balance',
                DB::raw('SUM(journal_entry_lines.debit) as total_debit'),
                DB::raw('SUM(journal_entry_lines.credit) as total_credit')
            )
            ->groupBy('accounts.id', 'accounts.account_code', 'accounts.account_name', 'accounts.normal_balance');
            
        if ($request->has('start_date')) {
            $query->where('journal_entries.journal_date', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->where('journal_entries.journal_date', '<=', $request->end_date);
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
            
            $trialBalance[] = [
                'account_id' => $row->id,
                'account_code' => $row->account_code,
                'account_name' => $row->account_name,
                'debit_balance' => $isDebitBalance ? $absBalance : 0,
                'credit_balance' => !$isDebitBalance ? $absBalance : 0,
            ];
            
            if ($isDebitBalance) {
                $grandTotalDebit += $absBalance;
            } else {
                $grandTotalCredit += $absBalance;
            }
        }
        
        return response()->json([
            'success' => true,
            'data' => [
                'lines' => $trialBalance,
                'total_debit' => round($grandTotalDebit, 4),
                'total_credit' => round($grandTotalCredit, 4),
                'is_balanced' => abs($grandTotalDebit - $grandTotalCredit) < 0.0001
            ]
        ]);
    }
}
