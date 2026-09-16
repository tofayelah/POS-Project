<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\SalesReturn;
use App\Models\Purchase;
use App\Models\Expense;
use App\Models\CustomerLedger;
use App\Models\SupplierLedger;
use App\Models\Inventory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardReportController extends Controller
{
    public function summary(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $branchId = $request->query('branch_id');
        $warehouseId = $request->query('warehouse_id');
        
        $startDate = $request->query('date_from', Carbon::today()->toDateString());
        $endDate = $request->query('date_to', Carbon::today()->toDateString());

        // We use full day bounds
        $start = Carbon::parse($startDate)->startOfDay();
        $end = Carbon::parse($endDate)->endOfDay();

        $saleQuery = Sale::where('company_id', $companyId)
            ->where('status', 'COMPLETED')
            ->whereBetween('sale_date', [$start->toDateString(), $end->toDateString()]);
        
        $salesReturnQuery = SalesReturn::where('company_id', $companyId)
            ->where('status', 'COMPLETED')
            ->whereBetween('return_date', [$start->toDateString(), $end->toDateString()]);

        $purchaseQuery = Purchase::where('company_id', $companyId)
            ->where('status', 'POSTED')
            ->whereBetween('invoice_date', [$start->toDateString(), $end->toDateString()]);

        $expenseQuery = Expense::where('company_id', $companyId)
            ->where('status', 'COMPLETED')
            ->whereBetween('expense_date', [$start->toDateString(), $end->toDateString()]);
            
        if ($branchId) {
            $saleQuery->where('branch_id', $branchId);
            $salesReturnQuery->where('branch_id', $branchId);
            $purchaseQuery->where('branch_id', $branchId);
            $expenseQuery->where('branch_id', $branchId);
        }
        if ($warehouseId) {
            $saleQuery->where('warehouse_id', $warehouseId);
            $salesReturnQuery->where('warehouse_id', $warehouseId);
            $purchaseQuery->where('warehouse_id', $warehouseId);
            $expenseQuery->where('warehouse_id', $warehouseId);
        }

        // Today's Sales
        $grossSales = (float) $saleQuery->sum('grand_total');
        $salesReturns = (float) $salesReturnQuery->sum('refund_total');
        
        // Wait, the gross sales usually means subtotal + tax or grand_total? The instruction says:
        // Net Sales = Gross Sales - Sales Returns
        
        $netSales = $grossSales - $salesReturns;
        
        $purchases = (float) $purchaseQuery->sum('grand_total');
        $expenses = (float) $expenseQuery->sum('total_amount');
        
        // COGS from SaleItems
        $saleItemsQuery = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.company_id', $companyId)
            ->where('sales.status', 'COMPLETED')
            ->whereBetween('sales.sale_date', [$start->toDateString(), $end->toDateString()]);
            
        if ($branchId) {
            $saleItemsQuery->where('sales.branch_id', $branchId);
        }
        if ($warehouseId) {
            $saleItemsQuery->where('sales.warehouse_id', $warehouseId);
        }
        
        $cogs = (float) $saleItemsQuery->sum('total_cost_snapshot');
        
        // Gross Profit = Net Sales excluding tax - COGS. Wait, is tax excluded? 
        // Let's assume net sales here includes tax. We should subtract tax to get GP.
        $taxTotal = (float) $saleQuery->sum('tax_total');
        $grossProfit = ($netSales - $taxTotal) - $cogs;
        $grossMargin = $netSales > 0 ? round(($grossProfit / $netSales) * 100, 2) : 0;
        
        // Cash vs Credit Sales
        // In this system, payment_status is PAID, PARTIAL, DUE.
        // Paid amount is stored in paid_amount.
        $cashSales = (float) $saleQuery->sum('paid_amount');
        $creditSales = (float) $saleQuery->sum('due_amount');
        
        // Receivables and Payables (Overall, not date bounded, or maybe up to date)
        $receivables = (float) CustomerLedger::where('company_id', $companyId)->sum(DB::raw('debit - credit'));
        $payables = (float) SupplierLedger::where('company_id', $companyId)->sum(DB::raw('credit - debit'));
        
        // Inventory Value
        $inventoryQuery = Inventory::where('company_id', $companyId);
        if ($branchId) {
            $inventoryQuery->whereHas('warehouse', function($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            });
        }
        if ($warehouseId) {
            $inventoryQuery->where('warehouse_id', $warehouseId);
        }
        $inventoryValue = (float) $inventoryQuery->sum('total_value');
        
        // Chart: Sales Trend (last 7 days by default)
        // We'll group by date
        $trendStart = Carbon::parse($startDate)->subDays(7)->startOfDay();
        $salesTrend = Sale::where('company_id', $companyId)
            ->where('status', 'COMPLETED')
            ->whereBetween('sale_date', [$trendStart->toDateString(), $end->toDateString()])
            ->select('sale_date', DB::raw('SUM(grand_total) as total'))
            ->groupBy('sale_date')
            ->orderBy('sale_date')
            ->get();
            
        // Top Products
        $topProducts = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.company_id', $companyId)
            ->where('sales.status', 'COMPLETED')
            ->whereBetween('sales.sale_date', [$start->toDateString(), $end->toDateString()])
            ->select('product_name_snapshot as name', 'sku_snapshot as sku', DB::raw('SUM(quantity) as qty'), DB::raw('SUM(line_total) as total'))
            ->groupBy('product_name_snapshot', 'sku_snapshot')
            ->orderBy('qty', 'desc')
            ->limit(5)
            ->get();
            
        // Top Customers
        $topCustomers = DB::table('sales')
            ->join('customers', 'sales.customer_id', '=', 'customers.id')
            ->where('sales.company_id', $companyId)
            ->where('sales.status', 'COMPLETED')
            ->whereBetween('sales.sale_date', [$start->toDateString(), $end->toDateString()])
            ->select('customers.name', DB::raw('SUM(sales.grand_total) as total'))
            ->groupBy('customers.name')
            ->orderBy('total', 'desc')
            ->limit(5)
            ->get();

        
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
        if ($warehouseId) {
            $lowStockQuery->where('inventories.warehouse_id', $warehouseId);
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
        if ($warehouseId) {
            $lowStockDetailsQuery->where('inventories.warehouse_id', $warehouseId);
        }

        $lowStockDetails = $lowStockDetailsQuery->get();

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

        $accountingHealth = [
            'posted_journals' => $postedJournals,
            'unbalanced_journals' => $unbalancedJournals,
            'status' => $unbalancedJournals > 0 ? 'Issues Detected' : 'Healthy'
        ];

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

        $cashBalance = 0;
        $bankBalance = 0;

        foreach ($assetBalances as $row) {
            if (stripos($row->account_name, 'Cash') !== false) {
                $cashBalance += ($row->total_debit - $row->total_credit);
            } elseif (stripos($row->account_name, 'Bank') !== false) {
                $bankBalance += ($row->total_debit - $row->total_credit);
            }
        }

        // Payment Methods Analysis
        $paymentMethodsQuery = DB::table('sale_payments')
            ->join('sales', 'sale_payments.sale_id', '=', 'sales.id')
            ->where('sales.company_id', $companyId)
            ->where('sales.status', 'COMPLETED')
            ->whereBetween('sales.sale_date', [$start->toDateString(), $end->toDateString()]);

        if ($branchId) {
            $paymentMethodsQuery->where('sales.branch_id', $branchId);
        }
        if ($warehouseId) {
            $paymentMethodsQuery->where('sales.warehouse_id', $warehouseId);
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
        if ($warehouseId) {
            $recentSalesQuery->where('sales.warehouse_id', $warehouseId);
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
        if ($warehouseId) {
            $recentPurchasesQuery->where('purchases.warehouse_id', $warehouseId);
        }
        $recentPurchases = $recentPurchasesQuery->get();

return response()->json([
            'success' => true,
            'data' => [
                'gross_sales' => $grossSales,
                'sales_returns' => $salesReturns,
                'net_sales' => $netSales,
                'purchases' => $purchases,
                'expenses' => $expenses,
                'gross_profit' => $grossProfit,
                'gross_margin' => $grossMargin,
                'cash_sales' => $cashSales,
                'credit_sales' => $creditSales,
                'receivables' => $receivables,
                'payables' => $payables,
                'inventory_value' => $inventoryValue,
                'sales_trend' => $salesTrend,
                'top_products' => $topProducts,
                'top_customers' => $topCustomers,
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

            ]
        ]);
    }
}
