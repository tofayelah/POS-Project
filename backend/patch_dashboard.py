import re

with open('backend/app/Http/Controllers/Api/V1/Reports/DashboardReportController.php', 'r') as f:
    content = f.read()

# I will replace the final part of the controller where it returns the response.
# First, let's find the point just before returning response()->json(...)

response_start = content.find('return response()->json([')

if response_start == -1:
    print("Could not find response start")
    exit(1)

before_response = content[:response_start]
after_response = content[response_start:]

# New logic to add:
new_logic = """
        // --------------------------------------------------------------------
        // SPRINT 12.9 - COMMERCIAL DASHBOARD EXPANSION
        // --------------------------------------------------------------------

        // Total Products (Active)
        $totalProducts = \App\Models\Product::where('company_id', $companyId)
            ->where('status', 'active')
            ->count();

        // Low Stock
        // For accurate low stock, we join products and inventory
        $lowStockQuery = DB::table('inventories')
            ->join('products', 'inventories.product_id', '=', 'products.id')
            ->where('inventories.company_id', $companyId)
            ->whereColumn('inventories.available_quantity', '<=', 'products.reorder_level');
            
        if ($branchId) {
            $lowStockQuery->join('warehouses', 'inventories.warehouse_id', '=', 'warehouses.id')
                          ->where('warehouses.branch_id', $branchId);
        }
        
        $lowStock = $lowStockQuery->count();

        // Low Stock Details
        $lowStockDetailsQuery = DB::table('inventories')
            ->join('products', 'inventories.product_id', '=', 'products.id')
            ->join('product_variants', 'inventories.product_variant_id', '=', 'product_variants.id')
            ->join('warehouses', 'inventories.warehouse_id', '=', 'warehouses.id')
            ->where('inventories.company_id', $companyId)
            ->whereColumn('inventories.available_quantity', '<=', 'products.reorder_level')
            ->select(
                'products.name as product',
                'product_variants.sku',
                'warehouses.name as warehouse',
                'inventories.available_quantity',
                'products.reorder_level'
            )
            ->orderBy('inventories.available_quantity', 'asc')
            ->limit(5);

        if ($branchId) {
            $lowStockDetailsQuery->where('warehouses.branch_id', $branchId);
        }

        $lowStockDetails = $lowStockDetailsQuery->get();

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

        $accountingHealth = [
            'posted_journals' => $postedJournals,
            'unbalanced_journals' => $unbalancedJournals,
            'status' => $unbalancedJournals > 0 ? 'Issues Detected' : 'Healthy'
        ];

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

        // Payment Methods Analysis
        $paymentMethodsQuery = DB::table('sale_payments')
            ->join('sales', 'sale_payments.sale_id', '=', 'sales.id')
            ->where('sales.company_id', $companyId)
            ->where('sales.status', 'COMPLETED')
            ->whereBetween('sales.sale_date', [$start->toDateString(), $end->toDateString()]);

        if ($branchId) {
            $paymentMethodsQuery->where('sales.branch_id', $branchId);
        }

        $paymentMethods = $paymentMethodsQuery
            ->select('payment_method', DB::raw('SUM(amount) as total'))
            ->groupBy('payment_method')
            ->orderBy('total', 'desc')
            ->get();

        // Recent Sales
        $recentSalesQuery = DB::table('sales')
            ->leftJoin('customers', 'sales.customer_id', '=', 'customers.id')
            ->leftJoin('branches', 'sales.branch_id', '=', 'branches.id')
            ->where('sales.company_id', $companyId)
            ->where('sales.status', 'COMPLETED')
            ->select(
                'sales.invoice_number as invoice',
                'sales.sale_date as date',
                'customers.name as customer',
                'branches.name as branch',
                'sales.grand_total as amount',
                'sales.paid_amount as paid',
                'sales.payment_status as status'
            )
            ->orderBy('sales.sale_date', 'desc')
            ->orderBy('sales.id', 'desc')
            ->limit(5);

        if ($branchId) {
            $recentSalesQuery->where('sales.branch_id', $branchId);
        }
        $recentSales = $recentSalesQuery->get();

        // Recent Purchases
        $recentPurchasesQuery = DB::table('purchases')
            ->leftJoin('suppliers', 'purchases.supplier_id', '=', 'suppliers.id')
            ->where('purchases.company_id', $companyId)
            ->where('purchases.status', 'POSTED')
            ->select(
                'purchases.invoice_number as invoice',
                'purchases.invoice_date as date',
                'suppliers.name as supplier',
                'purchases.grand_total as amount',
                'purchases.paid_amount as paid',
                'purchases.due_amount as due',
                'purchases.payment_status as status'
            )
            ->orderBy('purchases.invoice_date', 'desc')
            ->orderBy('purchases.id', 'desc')
            ->limit(5);

        if ($branchId) {
            $recentPurchasesQuery->where('purchases.branch_id', $branchId);
        }
        $recentPurchases = $recentPurchasesQuery->get();

"""

# Now we need to modify the array being returned.
# We'll use a regex to inject the new keys into the 'data' array.
# The original has: 'top_customers' => $topCustomers,

replacement = """'top_customers' => $topCustomers,
                'total_products' => $totalProducts,
                'low_stock' => $lowStock,
                'low_stock_details' => $lowStockDetails,
                'accounting_health' => $accountingHealth,
                'net_profit' => $netProfit,
                'cash_balance' => $cashBalance,
                'bank_balance' => $bankBalance,
                'payment_methods' => $paymentMethods,
                'recent_sales' => $recentSales,
                'recent_purchases' => $recentPurchases,
"""

new_content = before_response + new_logic + after_response.replace("'top_customers' => $topCustomers,", replacement)

with open('backend/app/Http/Controllers/Api/V1/Reports/DashboardReportController.php', 'w') as f:
    f.write(new_content)

print("Patched DashboardReportController.php successfully.")
