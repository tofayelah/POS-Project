import re

with open('backend/app/Http/Controllers/Api/V1/Reports/DashboardReportController.php', 'r') as f:
    content = f.read()

# Replace the accountBalances part to split Income Statement (P&L) and Balance Sheet accounts
old_logic = """
        // Net Profit & Account Balances (from Trial Balance Logic)
        // Aggregate all POSTED lines by Account Type
        $accountBalances = DB::table('journal_entry_lines')
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->join('accounts', 'journal_entry_lines.account_id', '=', 'accounts.id')
            ->where('journal_entries.company_id', $companyId)
            ->where('journal_entries.status', 'POSTED')
            ->select(
                'accounts.account_type',
                'accounts.account_name',
                DB::raw('SUM(journal_entry_lines.debit) as total_debit'),
                DB::raw('SUM(journal_entry_lines.credit) as total_credit')
            )
            ->groupBy('accounts.account_type', 'accounts.account_name')
            ->get();

        $revenueAccounting = 0;
        $expenseAccounting = 0;
        $cashBalance = 0;
        $bankBalance = 0;

        foreach ($accountBalances as $row) {
            if ($row->account_type === 'REVENUE') {
                $revenueAccounting += ($row->total_credit - $row->total_debit);
            } elseif ($row->account_type === 'EXPENSE') {
                $expenseAccounting += ($row->total_debit - $row->total_credit);
            }
            
            // Assume Cash and Bank are ASSET accounts
            if ($row->account_type === 'ASSET') {
                if (stripos($row->account_name, 'Cash') !== false) {
                    $cashBalance += ($row->total_debit - $row->total_credit);
                } elseif (stripos($row->account_name, 'Bank') !== false) {
                    $bankBalance += ($row->total_debit - $row->total_credit);
                }
            }
        }
        
        $netProfit = $revenueAccounting - $expenseAccounting;
"""

new_logic = """
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

        $revenueAccounting = 0;
        $expenseAccounting = 0;

        foreach ($pnlBalances as $row) {
            if ($row->account_type === 'REVENUE') {
                $revenueAccounting += ($row->total_credit - $row->total_debit);
            } elseif ($row->account_type === 'EXPENSE') {
                $expenseAccounting += ($row->total_debit - $row->total_credit);
            }
        }
        $netProfit = $revenueAccounting - $expenseAccounting;

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

        $cashBalance = 0;
        $bankBalance = 0;

        foreach ($assetBalances as $row) {
            if (stripos($row->account_name, 'Cash') !== false) {
                $cashBalance += ($row->total_debit - $row->total_credit);
            } elseif (stripos($row->account_name, 'Bank') !== false) {
                $bankBalance += ($row->total_debit - $row->total_credit);
            }
        }
"""

if old_logic in content:
    new_content = content.replace(old_logic, new_logic)
    with open('backend/app/Http/Controllers/Api/V1/Reports/DashboardReportController.php', 'w') as f:
        f.write(new_content)
    print("Patched DashboardReportController.php successfully.")
else:
    print("Could not find old logic to replace.")
