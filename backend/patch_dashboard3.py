import re

with open('backend/app/Http/Controllers/Api/V1/Reports/DashboardReportController.php', 'r') as f:
    content = f.read()

# For $postedJournals and $unbalancedJournals
old_accounting = """
        // Accounting Health
        $postedJournals = DB::table('journal_entries')
            ->where('company_id', $companyId)
            ->where('status', 'POSTED')
            ->count();
            
        // Unbalanced journals (where sum debit != sum credit)
        $unbalancedJournals = DB::table('journal_entry_lines')
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->where('journal_entries.company_id', $companyId)
            ->where('journal_entries.status', 'POSTED')
            ->groupBy('journal_entries.id')
            ->havingRaw('ABS(SUM(debit) - SUM(credit)) > 0.001')
            ->count();
"""

new_accounting = """
        // Accounting Health
        $postedJournalsQuery = DB::table('journal_entries')
            ->where('company_id', $companyId)
            ->where('status', 'POSTED');
            
        if ($branchId) {
            $postedJournalsQuery->where('branch_id', $branchId);
        }
        $postedJournals = $postedJournalsQuery->count();
            
        // Unbalanced journals (where sum debit != sum credit)
        $unbalancedJournalsQuery = DB::table('journal_entry_lines')
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->where('journal_entries.company_id', $companyId)
            ->where('journal_entries.status', 'POSTED');
            
        if ($branchId) {
            $unbalancedJournalsQuery->where('journal_entries.branch_id', $branchId);
        }
        
        $unbalancedJournals = $unbalancedJournalsQuery->groupBy('journal_entries.id')
            ->havingRaw('ABS(SUM(debit) - SUM(credit)) > 0.001')
            ->count();
"""

# For $pnlBalances
old_pnl = """
        // P&L (Net Profit) - Bounded by date range
        $pnlBalances = DB::table('journal_entry_lines')
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->join('accounts', 'journal_entry_lines.account_id', '=', 'accounts.id')
            ->where('journal_entries.company_id', $companyId)
            ->where('journal_entries.status', 'POSTED')
            ->whereBetween('journal_entries.journal_date', [$start->toDateString(), $end->toDateString()])
            ->whereIn('accounts.account_type', ['REVENUE', 'EXPENSE'])
            ->select(
                'accounts.account_type',
                DB::raw('SUM(journal_entry_lines.debit) as total_debit'),
                DB::raw('SUM(journal_entry_lines.credit) as total_credit')
            )
            ->groupBy('accounts.account_type')
            ->get();
"""

new_pnl = """
        // P&L (Net Profit) - Bounded by date range
        $pnlBalancesQuery = DB::table('journal_entry_lines')
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->join('accounts', 'journal_entry_lines.account_id', '=', 'accounts.id')
            ->where('journal_entries.company_id', $companyId)
            ->where('journal_entries.status', 'POSTED')
            ->whereBetween('journal_entries.journal_date', [$start->toDateString(), $end->toDateString()])
            ->whereIn('accounts.account_type', ['REVENUE', 'EXPENSE']);
            
        if ($branchId) {
            $pnlBalancesQuery->where('journal_entries.branch_id', $branchId);
        }
        
        $pnlBalances = $pnlBalancesQuery->select(
                'accounts.account_type',
                DB::raw('SUM(journal_entry_lines.debit) as total_debit'),
                DB::raw('SUM(journal_entry_lines.credit) as total_credit')
            )
            ->groupBy('accounts.account_type')
            ->get();
"""

# For $assetBalances
old_asset = """
        // Balance Sheet (Cash and Bank) - Unbounded (Running Balance)
        $assetBalances = DB::table('journal_entry_lines')
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->join('accounts', 'journal_entry_lines.account_id', '=', 'accounts.id')
            ->where('journal_entries.company_id', $companyId)
            ->where('journal_entries.status', 'POSTED')
            ->where('accounts.account_type', 'ASSET')
            ->where(function ($query) {
                $query->where('accounts.account_name', 'ilike', '%Cash%')
                      ->orWhere('accounts.account_name', 'ilike', '%Bank%');
            })
            ->select(
                'accounts.account_name',
                DB::raw('SUM(journal_entry_lines.debit) as total_debit'),
                DB::raw('SUM(journal_entry_lines.credit) as total_credit')
            )
            ->groupBy('accounts.account_name')
            ->get();
"""

new_asset = """
        // Balance Sheet (Cash and Bank) - Unbounded (Running Balance)
        $assetBalancesQuery = DB::table('journal_entry_lines')
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->join('accounts', 'journal_entry_lines.account_id', '=', 'accounts.id')
            ->where('journal_entries.company_id', $companyId)
            ->where('journal_entries.status', 'POSTED')
            ->where('accounts.account_type', 'ASSET')
            ->where(function ($query) {
                $query->where('accounts.account_name', 'ilike', '%Cash%')
                      ->orWhere('accounts.account_name', 'ilike', '%Bank%');
            });
            
        if ($branchId) {
            $assetBalancesQuery->where('journal_entries.branch_id', $branchId);
        }
        
        $assetBalances = $assetBalancesQuery->select(
                'accounts.account_name',
                DB::raw('SUM(journal_entry_lines.debit) as total_debit'),
                DB::raw('SUM(journal_entry_lines.credit) as total_credit')
            )
            ->groupBy('accounts.account_name')
            ->get();
"""

if old_accounting in content:
    content = content.replace(old_accounting, new_accounting)
if old_pnl in content:
    content = content.replace(old_pnl, new_pnl)
if old_asset in content:
    content = content.replace(old_asset, new_asset)

with open('backend/app/Http/Controllers/Api/V1/Reports/DashboardReportController.php', 'w') as f:
    f.write(content)
print("Patched DashboardReportController with branch filtering successfully.")
