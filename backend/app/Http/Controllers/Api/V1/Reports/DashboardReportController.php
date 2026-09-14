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
            ->whereBetween('purchase_date', [$start->toDateString(), $end->toDateString()]);

        $expenseQuery = Expense::where('company_id', $companyId)
            ->where('status', 'COMPLETED')
            ->whereBetween('expense_date', [$start->toDateString(), $end->toDateString()]);
            
        if ($branchId) {
            $saleQuery->where('branch_id', $branchId);
            $salesReturnQuery->where('branch_id', $branchId);
            $purchaseQuery->where('branch_id', $branchId);
            $expenseQuery->where('branch_id', $branchId);
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
            ]
        ]);
    }
}
