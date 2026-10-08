<?php

namespace App\Services\Bi;

use App\Models\Branch;
use App\Models\Budget;
use App\Models\BusinessUnit;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Expense;
use App\Models\FixedAsset;
use App\Models\Inventory;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\PosSession;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseOrder;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalePayment;
use App\Models\SalesReturn;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\User;
use App\Services\CustomerIntelligenceService;
use App\Services\FinancialReportingAnalyticsService;
use App\Services\SupplierPerformanceService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class BiAnalyticsService
{
    public function __construct(
        protected FinancialReportingAnalyticsService $financialAnalytics,
        protected CustomerIntelligenceService $customerIntelligence,
        protected SupplierPerformanceService $supplierPerformance
    ) {}

    /**
     * Resolve date range bounds from filters.
     */
    protected function resolveDateBounds(array $filters): array
    {
        $now = Carbon::now();
        $startDate = !empty($filters['date_from']) ? Carbon::parse($filters['date_from'])->startOfDay() : $now->copy()->startOfMonth()->startOfDay();
        $endDate = !empty($filters['date_to']) ? Carbon::parse($filters['date_to'])->endOfDay() : $now->copy()->endOfDay();

        return [$startDate, $endDate];
    }

    /**
     * Scope base query by company and optional filters.
     */
    protected function applyCommonFilters($query, int $companyId, array $filters, string $dateColumn = 'sale_date')
    {
        $query->where('company_id', $companyId);

        if (!empty($filters['branch_id'])) {
            $query->where('branch_id', $filters['branch_id']);
        }
        if (!empty($filters['warehouse_id'])) {
            $query->where('warehouse_id', $filters['warehouse_id']);
        }
        if (!empty($filters['business_unit_id'])) {
            $query->where('business_unit_id', $filters['business_unit_id']);
        }
        if (!empty($filters['channel'])) {
            $query->where('channel', $filters['channel']);
        }
        if (!empty($filters['date_from']) && !empty($filters['date_to'])) {
            $query->whereBetween($dateColumn, [
                Carbon::parse($filters['date_from'])->toDateString(),
                Carbon::parse($filters['date_to'])->toDateString()
            ]);
        }

        return $query;
    }

    /**
     * =========================================================================
     * 1. EXECUTIVE MANAGEMENT DASHBOARD
     * =========================================================================
     */
    public function getExecutiveDashboard(int $companyId, array $filters = []): array
    {
        [$start, $end] = $this->resolveDateBounds($filters);
        $startDate = $start->toDateString();
        $endDate = $end->toDateString();

        // 1. Sales & Revenue in current period
        $salesQuery = Sale::where('company_id', $companyId)
            ->where('status', 'COMPLETED')
            ->whereBetween('sale_date', [$startDate, $endDate]);

        if (!empty($filters['branch_id'])) {
            $salesQuery->where('branch_id', $filters['branch_id']);
        }
        if (!empty($filters['channel'])) {
            $salesQuery->where('channel', $filters['channel']);
        }

        $grossSales = (float) (clone $salesQuery)->sum(DB::raw('subtotal + tax_total'));
        $discounts = (float) (clone $salesQuery)->sum('discount_total');
        $taxTotal = (float) (clone $salesQuery)->sum('tax_total');
        $netSales = (float) (clone $salesQuery)->sum('grand_total');
        $salesCount = (int) (clone $salesQuery)->count();

        // Returns
        $returnsQuery = SalesReturn::where('company_id', $companyId)
            ->where('status', 'COMPLETED')
            ->whereBetween('return_date', [$startDate, $endDate]);
        if (!empty($filters['branch_id'])) {
            $returnsQuery->where('branch_id', $filters['branch_id']);
        }
        $returnsTotal = (float) $returnsQuery->sum('refund_total');

        $revenue = max(0, round($netSales - $returnsTotal, 4));

        // COGS calculation from SaleItems
        $saleIds = (clone $salesQuery)->pluck('id');
        $cogs = (float) SaleItem::whereIn('sale_id', $saleIds)
            ->sum(DB::raw('CASE WHEN total_cost_snapshot > 0 THEN total_cost_snapshot ELSE (quantity * unit_cost_snapshot) END'));

        $grossProfit = round($revenue - $cogs, 4);
        $grossMarginPct = $revenue > 0 ? round(($grossProfit / $revenue) * 100, 2) : 0.0;

        // Operating Expenses
        $expenseQuery = Expense::where('company_id', $companyId)
            ->where('status', 'COMPLETED')
            ->whereBetween('expense_date', [$startDate, $endDate]);
        if (!empty($filters['branch_id'])) {
            $expenseQuery->where('branch_id', $filters['branch_id']);
        }
        $operatingExpenses = (float) $expenseQuery->sum('total_amount');

        $operatingProfit = round($grossProfit - $operatingExpenses, 4);
        $netProfit = $operatingProfit; // If tax/interest are already accounted in GL, otherwise operating profit is net
        $netMarginPct = $revenue > 0 ? round(($netProfit / $revenue) * 100, 2) : 0.0;

        // Balance Sheet / Working Capital telemetry from Authoritative GL/Models
        $telemetry = $this->financialAnalytics->getExecutiveDashboardTelemetry($companyId);
        $cashBalance = (float) ($telemetry['liquid_cash'] ?? 0);
        $bankBalance = 0.0; // Included in liquidCash or separated below
        $arBalance = (float) ($telemetry['ar_balance'] ?? 0);
        $apBalance = (float) ($telemetry['ap_balance'] ?? 0);

        // Inventory Value
        $inventoryQuery = Inventory::where('company_id', $companyId);
        if (!empty($filters['branch_id'])) {
            $inventoryQuery->where('branch_id', $filters['branch_id']);
        }
        if (!empty($filters['warehouse_id'])) {
            $inventoryQuery->where('warehouse_id', $filters['warehouse_id']);
        }
        $inventoryValue = (float) $inventoryQuery->sum('total_value');

        // Working Capital: (Cash + AR + Inventory) - AP
        $workingCapital = round(($cashBalance + $arBalance + $inventoryValue) - $apBalance, 4);

        // Budget Utilization
        $budgetUtilization = (float) ($telemetry['active_budget_utilization_pct'] ?? 0);

        // Executive Sales KPIs
        $today = Carbon::today()->toDateString();
        $yesterday = Carbon::yesterday()->toDateString();
        $startOfMonth = Carbon::today()->startOfMonth()->toDateString();
        $prevMonthStart = Carbon::today()->subMonth()->startOfMonth()->toDateString();
        $prevMonthEnd = Carbon::today()->subMonth()->toDateString();
        $startOfQuarter = Carbon::today()->firstOfQuarter()->toDateString();
        $prevQuarterStart = Carbon::today()->subQuarter()->firstOfQuarter()->toDateString();
        $prevQuarterEnd = Carbon::today()->subQuarter()->toDateString();
        $startOfYear = Carbon::today()->startOfYear()->toDateString();
        $prevYearStart = Carbon::today()->subYear()->startOfYear()->toDateString();
        $prevYearEnd = Carbon::today()->subYear()->toDateString();

        $todaySales = (float) Sale::where('company_id', $companyId)->where('status', 'COMPLETED')->where('sale_date', $today)->sum('grand_total');
        $yesterdaySales = (float) Sale::where('company_id', $companyId)->where('status', 'COMPLETED')->where('sale_date', $yesterday)->sum('grand_total');
        $mtdSales = (float) Sale::where('company_id', $companyId)->where('status', 'COMPLETED')->whereBetween('sale_date', [$startOfMonth, $today])->sum('grand_total');
        $prevMtdSales = (float) Sale::where('company_id', $companyId)->where('status', 'COMPLETED')->whereBetween('sale_date', [$prevMonthStart, $prevMonthEnd])->sum('grand_total');
        $qtdSales = (float) Sale::where('company_id', $companyId)->where('status', 'COMPLETED')->whereBetween('sale_date', [$startOfQuarter, $today])->sum('grand_total');
        $prevQtdSales = (float) Sale::where('company_id', $companyId)->where('status', 'COMPLETED')->whereBetween('sale_date', [$prevQuarterStart, $prevQuarterEnd])->sum('grand_total');
        $ytdSales = (float) Sale::where('company_id', $companyId)->where('status', 'COMPLETED')->whereBetween('sale_date', [$startOfYear, $today])->sum('grand_total');
        $prevYtdSales = (float) Sale::where('company_id', $companyId)->where('status', 'COMPLETED')->whereBetween('sale_date', [$prevYearStart, $prevYearEnd])->sum('grand_total');

        $growthMtdPct = $prevMtdSales > 0 ? round((($mtdSales - $prevMtdSales) / $prevMtdSales) * 100, 2) : 0.0;
        $growthTodayPct = $yesterdaySales > 0 ? round((($todaySales - $yesterdaySales) / $yesterdaySales) * 100, 2) : 0.0;
        $growthYtdPct = $prevYtdSales > 0 ? round((($ytdSales - $prevYtdSales) / $prevYtdSales) * 100, 2) : 0.0;

        $totalUnitsSold = (float) SaleItem::whereIn('sale_id', $saleIds)->sum('quantity');
        $aov = $salesCount > 0 ? round($netSales / $salesCount, 2) : 0.0;
        $avgBasketSize = $salesCount > 0 ? round($totalUnitsSold / $salesCount, 2) : 0.0;
        $returnRatePct = $grossSales > 0 ? round(($returnsTotal / $grossSales) * 100, 2) : 0.0;
        $discountRatePct = $grossSales > 0 ? round(($discounts / $grossSales) * 100, 2) : 0.0;

        // Daily trend over the selected period
        $dailyTrends = DB::table('sales')
            ->select(
                'sale_date',
                DB::raw('COUNT(id) as transactions'),
                DB::raw('COALESCE(SUM(grand_total), 0) as revenue')
            )
            ->where('company_id', $companyId)
            ->where('status', 'COMPLETED')
            ->whereBetween('sale_date', [$startDate, $endDate])
            ->groupBy('sale_date')
            ->orderBy('sale_date', 'asc')
            ->get();

        // Top 5 Products by Revenue
        $topProducts = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->where('sales.company_id', $companyId)
            ->where('sales.status', 'COMPLETED')
            ->whereBetween('sales.sale_date', [$startDate, $endDate])
            ->select(
                'products.id',
                'products.name',
                DB::raw("COALESCE(MAX(sale_items.sku_snapshot), '') as sku"),
                DB::raw('SUM(sale_items.quantity) as total_quantity'),
                DB::raw('SUM(sale_items.line_total) as total_revenue')
            )
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('total_revenue')
            ->limit(5)
            ->get();

        // Top 5 Branches by Revenue
        $topBranches = DB::table('sales')
            ->join('branches', 'sales.branch_id', '=', 'branches.id')
            ->where('sales.company_id', $companyId)
            ->where('sales.status', 'COMPLETED')
            ->whereBetween('sales.sale_date', [$startDate, $endDate])
            ->select(
                'branches.id',
                'branches.name',
                DB::raw('COUNT(sales.id) as transactions'),
                DB::raw('SUM(sales.grand_total) as total_revenue')
            )
            ->groupBy('branches.id', 'branches.name')
            ->orderByDesc('total_revenue')
            ->limit(5)
            ->get();

        // Channel Breakdown
        $channelBreakdown = DB::table('sales')
            ->where('company_id', $companyId)
            ->where('status', 'COMPLETED')
            ->whereBetween('sale_date', [$startDate, $endDate])
            ->select(
                DB::raw("COALESCE(channel, 'POS') as channel"),
                DB::raw('COUNT(id) as orders_count'),
                DB::raw('SUM(grand_total) as total_revenue')
            )
            ->groupBy('channel')
            ->get();

        return [
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'primary_kpis' => [
                'revenue' => $revenue,
                'gross_sales' => $grossSales,
                'net_sales' => $netSales,
                'returns' => $returnsTotal,
                'discounts' => $discounts,
                'cogs' => $cogs,
                'gross_profit' => $grossProfit,
                'gross_margin_pct' => $grossMarginPct,
                'operating_expenses' => $operatingExpenses,
                'operating_profit' => $operatingProfit,
                'net_profit' => $netProfit,
                'net_margin_pct' => $netMarginPct,
                'cash_balance' => $cashBalance,
                'bank_balance' => $bankBalance,
                'accounts_receivable' => $arBalance,
                'accounts_payable' => $apBalance,
                'inventory_value' => $inventoryValue,
                'working_capital' => $workingCapital,
                'budget_utilization' => $budgetUtilization,
            ],
            'sales_kpis' => [
                'today_sales' => $todaySales,
                'yesterday_sales' => $yesterdaySales,
                'mtd_sales' => $mtdSales,
                'prev_mtd_sales' => $prevMtdSales,
                'qtd_sales' => $qtdSales,
                'prev_qtd_sales' => $prevQtdSales,
                'ytd_sales' => $ytdSales,
                'prev_ytd_sales' => $prevYtdSales,
                'growth_today_pct' => $growthTodayPct,
                'growth_mtd_pct' => $growthMtdPct,
                'growth_ytd_pct' => $growthYtdPct,
                'aov' => $aov,
                'average_basket_size' => $avgBasketSize,
                'units_sold' => $totalUnitsSold,
                'transactions' => $salesCount,
                'return_rate_pct' => $returnRatePct,
                'discount_rate_pct' => $discountRatePct,
            ],
            'daily_trend' => $dailyTrends,
            'top_products' => $topProducts,
            'top_branches' => $topBranches,
            'channel_breakdown' => $channelBreakdown,
        ];
    }

    /**
     * =========================================================================
     * 2. SALES BI & FUNNEL
     * =========================================================================
     */
    public function getSalesBi(int $companyId, array $filters = []): array
    {
        [$start, $end] = $this->resolveDateBounds($filters);
        $startDate = $start->toDateString();
        $endDate = $end->toDateString();

        $baseSales = Sale::where('company_id', $companyId)
            ->where('status', 'COMPLETED')
            ->whereBetween('sale_date', [$startDate, $endDate]);

        if (!empty($filters['branch_id'])) {
            $baseSales->where('branch_id', $filters['branch_id']);
        }
        if (!empty($filters['channel'])) {
            $baseSales->where('channel', $filters['channel']);
        }

        $grossSales = (float) (clone $baseSales)->sum(DB::raw('subtotal + tax_total'));
        $discounts = (float) (clone $baseSales)->sum('discount_total');
        $netSales = (float) (clone $baseSales)->sum('grand_total');
        $ordersCount = (int) (clone $baseSales)->count();
        $saleIds = (clone $baseSales)->pluck('id');
        $totalUnits = (float) SaleItem::whereIn('sale_id', $saleIds)->sum('quantity');

        // By Date Trend
        $byDate = DB::table('sales')
            ->select(
                'sale_date',
                DB::raw('COUNT(id) as orders_count'),
                DB::raw('COALESCE(SUM(grand_total), 0) as net_sales'),
                DB::raw('COALESCE(SUM(discount_total), 0) as discounts'),
                DB::raw('COALESCE(SUM(tax_total), 0) as taxes')
            )
            ->where('company_id', $companyId)
            ->where('status', 'COMPLETED')
            ->whereBetween('sale_date', [$startDate, $endDate])
            ->groupBy('sale_date')
            ->orderBy('sale_date')
            ->get();

        // By Month Trend (last 12 months)
        $twelveMonthsAgo = Carbon::today()->subMonths(11)->startOfMonth()->toDateString();
        $byMonth = DB::table('sales')
            ->select(
                DB::raw("TO_CHAR(sale_date, 'YYYY-MM') as month"),
                DB::raw('COUNT(id) as orders_count'),
                DB::raw('COALESCE(SUM(grand_total), 0) as net_sales')
            )
            ->where('company_id', $companyId)
            ->where('status', 'COMPLETED')
            ->where('sale_date', '>=', $twelveMonthsAgo)
            ->groupBy(DB::raw("TO_CHAR(sale_date, 'YYYY-MM')"))
            ->orderBy('month')
            ->get();

        // By Branch
        $byBranch = DB::table('sales')
            ->join('branches', 'sales.branch_id', '=', 'branches.id')
            ->where('sales.company_id', $companyId)
            ->where('sales.status', 'COMPLETED')
            ->whereBetween('sales.sale_date', [$startDate, $endDate])
            ->select(
                'branches.id',
                'branches.name',
                DB::raw('COUNT(sales.id) as orders_count'),
                DB::raw('COALESCE(SUM(sales.grand_total), 0) as net_sales')
            )
            ->groupBy('branches.id', 'branches.name')
            ->orderByDesc('net_sales')
            ->get();

        // By Channel
        $byChannel = DB::table('sales')
            ->where('company_id', $companyId)
            ->where('status', 'COMPLETED')
            ->whereBetween('sale_date', [$startDate, $endDate])
            ->select(
                DB::raw("COALESCE(channel, 'POS') as channel"),
                DB::raw('COUNT(id) as orders_count'),
                DB::raw('COALESCE(SUM(grand_total), 0) as net_sales')
            )
            ->groupBy('channel')
            ->orderByDesc('net_sales')
            ->get();

        // By Category
        $byCategory = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->where('sales.company_id', $companyId)
            ->where('sales.status', 'COMPLETED')
            ->whereBetween('sales.sale_date', [$startDate, $endDate])
            ->select(
                DB::raw("COALESCE(categories.name, 'Uncategorized') as category_name"),
                DB::raw('SUM(sale_items.quantity) as units_sold'),
                DB::raw('COALESCE(SUM(sale_items.line_total), 0) as net_sales')
            )
            ->groupBy(DB::raw("COALESCE(categories.name, 'Uncategorized')"))
            ->orderByDesc('net_sales')
            ->limit(15)
            ->get();

        // By Payment Method
        $byPaymentMethod = DB::table('sale_payments')
            ->join('sales', 'sale_payments.sale_id', '=', 'sales.id')
            ->where('sales.company_id', $companyId)
            ->where('sales.status', 'COMPLETED')
            ->whereBetween('sales.sale_date', [$startDate, $endDate])
            ->select(
                'sale_payments.payment_method',
                DB::raw('COUNT(sale_payments.id) as transaction_count'),
                DB::raw('COALESCE(SUM(sale_payments.amount), 0) as total_amount')
            )
            ->groupBy('sale_payments.payment_method')
            ->orderByDesc('total_amount')
            ->get();

        // Sales Funnel / Order Pipeline
        $funnelStatuses = DB::table('sales')
            ->where('company_id', $companyId)
            ->whereBetween('sale_date', [$startDate, $endDate])
            ->select('status', 'payment_status', 'fulfillment_status', DB::raw('COUNT(id) as count'), DB::raw('SUM(grand_total) as total'))
            ->groupBy('status', 'payment_status', 'fulfillment_status')
            ->get();

        $totalAllOrders = DB::table('sales')->where('company_id', $companyId)->whereBetween('sale_date', [$startDate, $endDate])->count();
        $completedOrders = DB::table('sales')->where('company_id', $companyId)->where('status', 'COMPLETED')->whereBetween('sale_date', [$startDate, $endDate])->count();
        $paidOrders = DB::table('sales')->where('company_id', $companyId)->where('payment_status', 'PAID')->whereBetween('sale_date', [$startDate, $endDate])->count();
        $fulfilledOrders = DB::table('sales')->where('company_id', $companyId)->where('fulfillment_status', 'FULFILLED')->whereBetween('sale_date', [$startDate, $endDate])->count();
        $cancelledOrders = DB::table('sales')->where('company_id', $companyId)->where('status', 'CANCELLED')->whereBetween('sale_date', [$startDate, $endDate])->count();
        $returnedOrders = DB::table('sales_returns')->where('company_id', $companyId)->where('status', 'COMPLETED')->whereBetween('return_date', [$startDate, $endDate])->count();

        return [
            'summary' => [
                'gross_sales' => $grossSales,
                'discounts' => $discounts,
                'net_sales' => $netSales,
                'orders_count' => $ordersCount,
                'units_sold' => $totalUnits,
                'aov' => $ordersCount > 0 ? round($netSales / $ordersCount, 2) : 0.0,
            ],
            'by_date' => $byDate,
            'by_month' => $byMonth,
            'by_branch' => $byBranch,
            'by_channel' => $byChannel,
            'by_category' => $byCategory,
            'by_payment_method' => $byPaymentMethod,
            'funnel' => [
                'total_created' => $totalAllOrders,
                'completed' => $completedOrders,
                'paid' => $paidOrders,
                'fulfilled' => $fulfilledOrders,
                'cancelled' => $cancelledOrders,
                'returned' => $returnedOrders,
                'completion_rate_pct' => $totalAllOrders > 0 ? round(($completedOrders / $totalAllOrders) * 100, 2) : 0.0,
                'fulfillment_rate_pct' => $completedOrders > 0 ? round(($fulfilledOrders / $completedOrders) * 100, 2) : 0.0,
            ],
        ];
    }

    /**
     * =========================================================================
     * 3. PROFITABILITY BI
     * =========================================================================
     */
    public function getProfitabilityBi(int $companyId, array $filters = []): array
    {
        [$start, $end] = $this->resolveDateBounds($filters);
        $startDate = $start->toDateString();
        $endDate = $end->toDateString();

        $baseSales = Sale::where('company_id', $companyId)
            ->where('status', 'COMPLETED')
            ->whereBetween('sale_date', [$startDate, $endDate]);

        if (!empty($filters['branch_id'])) {
            $baseSales->where('branch_id', $filters['branch_id']);
        }
        if (!empty($filters['channel'])) {
            $baseSales->where('channel', $filters['channel']);
        }

        $netSales = (float) (clone $baseSales)->sum('grand_total');
        $saleIds = (clone $baseSales)->pluck('id');

        $cogs = (float) SaleItem::whereIn('sale_id', $saleIds)
            ->sum(DB::raw('CASE WHEN total_cost_snapshot > 0 THEN total_cost_snapshot ELSE (quantity * unit_cost_snapshot) END'));

        $grossProfit = round($netSales - $cogs, 4);
        $grossMarginPct = $netSales > 0 ? round(($grossProfit / $netSales) * 100, 2) : 0.0;

        $operatingExpenses = (float) Expense::where('company_id', $companyId)
            ->where('status', 'COMPLETED')
            ->whereBetween('expense_date', [$startDate, $endDate])
            ->sum('total_amount');

        $netProfit = round($grossProfit - $operatingExpenses, 4);
        $netMarginPct = $netSales > 0 ? round(($netProfit / $netSales) * 100, 2) : 0.0;
        $costToRevenueRatio = $netSales > 0 ? round(($cogs / $netSales) * 100, 2) : 0.0;

        // Profitability by Product (Top 20 high margin & Top 10 low margin)
        $productMargins = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->where('sales.company_id', $companyId)
            ->where('sales.status', 'COMPLETED')
            ->whereBetween('sales.sale_date', [$startDate, $endDate])
            ->select(
                'products.id',
                'products.name',
                DB::raw("COALESCE(MAX(sale_items.sku_snapshot), '') as sku"),
                DB::raw('SUM(sale_items.quantity) as units_sold'),
                DB::raw('SUM(sale_items.line_total) as revenue'),
                DB::raw('SUM(CASE WHEN sale_items.total_cost_snapshot > 0 THEN sale_items.total_cost_snapshot ELSE (sale_items.quantity * sale_items.unit_cost_snapshot) END) as product_cogs'),
                DB::raw('SUM(sale_items.line_total) - SUM(CASE WHEN sale_items.total_cost_snapshot > 0 THEN sale_items.total_cost_snapshot ELSE (sale_items.quantity * sale_items.unit_cost_snapshot) END) as gross_profit')
            )
            ->groupBy('products.id', 'products.name')
            ->havingRaw('SUM(sale_items.line_total) > 0')
            ->get()
            ->map(function ($row) {
                $rev = (float) $row->revenue;
                $gp = (float) $row->gross_profit;
                $margin = $rev > 0 ? round(($gp / $rev) * 100, 2) : 0.0;
                return [
                    'id' => $row->id,
                    'name' => $row->name,
                    'sku' => $row->sku,
                    'units_sold' => (float) $row->units_sold,
                    'revenue' => $rev,
                    'cogs' => (float) $row->product_cogs,
                    'gross_profit' => $gp,
                    'gross_margin_pct' => $margin,
                ];
            });

        $topProfitableProducts = $productMargins->sortByDesc('gross_profit')->values()->take(15);
        $lowMarginProducts = $productMargins->filter(fn($p) => $p['units_sold'] >= 5)->sortBy('gross_margin_pct')->values()->take(10);

        // Profitability by Category
        $byCategory = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->where('sales.company_id', $companyId)
            ->where('sales.status', 'COMPLETED')
            ->whereBetween('sales.sale_date', [$startDate, $endDate])
            ->select(
                DB::raw("COALESCE(categories.name, 'Uncategorized') as category_name"),
                DB::raw('SUM(sale_items.line_total) as revenue'),
                DB::raw('SUM(CASE WHEN sale_items.total_cost_snapshot > 0 THEN sale_items.total_cost_snapshot ELSE (sale_items.quantity * sale_items.unit_cost_snapshot) END) as cogs'),
                DB::raw('SUM(sale_items.line_total) - SUM(CASE WHEN sale_items.total_cost_snapshot > 0 THEN sale_items.total_cost_snapshot ELSE (sale_items.quantity * sale_items.unit_cost_snapshot) END) as gross_profit')
            )
            ->groupBy(DB::raw("COALESCE(categories.name, 'Uncategorized')"))
            ->get()
            ->map(function ($row) {
                $rev = (float) $row->revenue;
                $gp = (float) $row->gross_profit;
                return [
                    'category_name' => $row->category_name,
                    'revenue' => $rev,
                    'cogs' => (float) $row->cogs,
                    'gross_profit' => $gp,
                    'gross_margin_pct' => $rev > 0 ? round(($gp / $rev) * 100, 2) : 0.0,
                ];
            });

        // Expenses breakdown by Category
        $expensesByCategory = DB::table('expenses')
            ->leftJoin('expense_categories', 'expenses.expense_category_id', '=', 'expense_categories.id')
            ->where('expenses.company_id', $companyId)
            ->where('expenses.status', 'COMPLETED')
            ->whereBetween('expenses.expense_date', [$startDate, $endDate])
            ->select(
                DB::raw("COALESCE(expense_categories.name, 'General') as category_name"),
                DB::raw('SUM(expenses.total_amount) as total_expense')
            )
            ->groupBy(DB::raw("COALESCE(expense_categories.name, 'General')"))
            ->orderByDesc('total_expense')
            ->get();

        return [
            'summary' => [
                'revenue' => $netSales,
                'cogs' => $cogs,
                'gross_profit' => $grossProfit,
                'gross_margin_pct' => $grossMarginPct,
                'operating_expenses' => $operatingExpenses,
                'net_profit' => $netProfit,
                'net_margin_pct' => $netMarginPct,
                'cost_to_revenue_ratio' => $costToRevenueRatio,
            ],
            'top_profitable_products' => $topProfitableProducts,
            'low_margin_products' => $lowMarginProducts,
            'by_category' => $byCategory,
            'expense_breakdown' => $expensesByCategory,
        ];
    }

    /**
     * =========================================================================
     * 4. INVENTORY BI (ABC/PARETO, AGING, VELOCITY, STOCKOUT)
     * =========================================================================
     */
    public function getInventoryBi(int $companyId, array $filters = []): array
    {
        $invQuery = Inventory::with(['product.category', 'warehouse'])
            ->where('company_id', $companyId);

        if (!empty($filters['warehouse_id'])) {
            $invQuery->where('warehouse_id', $filters['warehouse_id']);
        }
        if (!empty($filters['branch_id'])) {
            $invQuery->where('branch_id', $filters['branch_id']);
        }

        $allInventory = $invQuery->get();

        $totalValuation = (float) $allInventory->sum('total_value');
        $totalUnits = (float) $allInventory->sum('quantity');
        $totalSkus = $allInventory->count();

        // Stock status counts
        $lowStockItems = $allInventory->filter(fn($i) => (float)$i->quantity <= (float)$i->reorder_point && (float)$i->quantity > 0)->count();
        $outOfStockItems = $allInventory->filter(fn($i) => (float)$i->quantity <= 0)->count();

        // ABC / Pareto Analysis
        // Sort items by total_value descending, calculate cumulative value %
        $sortedForAbc = $allInventory->sortByDesc('total_value')->values();
        $cumulativeVal = 0.0;
        $classA = [];
        $classB = [];
        $classC = [];

        foreach ($sortedForAbc as $item) {
            $val = (float) $item->total_value;
            $cumulativeVal += $val;
            $cumulativePct = $totalValuation > 0 ? ($cumulativeVal / $totalValuation) * 100 : 100;

            $itemData = [
                'inventory_id' => $item->id,
                'product_id' => $item->product_id,
                'product_name' => $item->product?->name ?? 'Unknown',
                'sku' => $item->product?->sku ?? '',
                'category' => $item->product?->category?->name ?? 'General',
                'quantity' => (float) $item->quantity,
                'total_value' => $val,
                'cumulative_pct' => round($cumulativePct, 2),
            ];

            if ($cumulativePct <= 80.0) {
                $itemData['abc_class'] = 'A';
                $classA[] = $itemData;
            } elseif ($cumulativePct <= 95.0) {
                $itemData['abc_class'] = 'B';
                $classB[] = $itemData;
            } else {
                $itemData['abc_class'] = 'C';
                $classC[] = $itemData;
            }
        }

        // Inventory Aging Buckets (0-30, 31-60, 61-90, 91-180, 181-365, 365+)
        // Based on latest stock movement creation date per product
        $latestMovements = DB::table('stock_movements')
            ->where('company_id', $companyId)
            ->select('product_id', DB::raw('MAX(created_at) as last_movement_at'))
            ->groupBy('product_id')
            ->pluck('last_movement_at', 'product_id');

        $now = Carbon::now();
        $agingBuckets = [
            '0_30' => ['count' => 0, 'value' => 0.0, 'label' => '0 - 30 Days'],
            '31_60' => ['count' => 0, 'value' => 0.0, 'label' => '31 - 60 Days'],
            '61_90' => ['count' => 0, 'value' => 0.0, 'label' => '61 - 90 Days'],
            '91_180' => ['count' => 0, 'value' => 0.0, 'label' => '91 - 180 Days'],
            '181_365' => ['count' => 0, 'value' => 0.0, 'label' => '181 - 365 Days'],
            '365_plus' => ['count' => 0, 'value' => 0.0, 'label' => '365+ Days (Dead Stock)'],
        ];

        $deadStockValue = 0.0;
        $deadStockCount = 0;

        foreach ($allInventory as $inv) {
            $lastAt = $latestMovements[$inv->product_id] ?? $inv->created_at;
            $ageDays = $lastAt ? max(0, $now->diffInDays(Carbon::parse($lastAt))) : 999;
            $val = (float) $inv->total_value;

            if ($ageDays <= 30) {
                $agingBuckets['0_30']['count']++;
                $agingBuckets['0_30']['value'] += $val;
            } elseif ($ageDays <= 60) {
                $agingBuckets['31_60']['count']++;
                $agingBuckets['31_60']['value'] += $val;
            } elseif ($ageDays <= 90) {
                $agingBuckets['61_90']['count']++;
                $agingBuckets['61_90']['value'] += $val;
            } elseif ($ageDays <= 180) {
                $agingBuckets['91_180']['count']++;
                $agingBuckets['91_180']['value'] += $val;
            } elseif ($ageDays <= 365) {
                $agingBuckets['181_365']['count']++;
                $agingBuckets['181_365']['value'] += $val;
            } else {
                $agingBuckets['365_plus']['count']++;
                $agingBuckets['365_plus']['value'] += $val;
                $deadStockValue += $val;
                $deadStockCount++;
            }
        }

        // COGS for Turnover Ratio (last 365 days)
        $oneYearAgo = $now->copy()->subDays(365)->toDateString();
        $annualCogs = (float) DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.company_id', $companyId)
            ->where('sales.status', 'COMPLETED')
            ->where('sales.sale_date', '>=', $oneYearAgo)
            ->sum(DB::raw('CASE WHEN sale_items.total_cost_snapshot > 0 THEN sale_items.total_cost_snapshot ELSE (sale_items.quantity * sale_items.unit_cost_snapshot) END'));

        $turnoverRatio = $totalValuation > 0 ? round($annualCogs / $totalValuation, 2) : 0.0;
        $daysOfInventory = $turnoverRatio > 0 ? round(365 / $turnoverRatio, 1) : 0.0;

        // Reorder alert items (quantity <= reorder_point)
        $reorderItems = $allInventory
            ->filter(fn($i) => (float)$i->quantity <= (float)$i->reorder_point)
            ->sortBy('quantity')
            ->take(15)
            ->map(fn($i) => [
                'product_id' => $i->product_id,
                'name' => $i->product?->name ?? 'Unknown',
                'sku' => $i->product?->sku ?? '',
                'current_stock' => (float) $i->quantity,
                'reorder_point' => (float) $i->reorder_point,
                'unit_cost' => (float) $i->average_cost,
                'warehouse' => $i->warehouse?->name ?? 'Default',
            ])
            ->values();

        return [
            'summary' => [
                'total_valuation' => $totalValuation,
                'total_units' => $totalUnits,
                'total_skus' => $totalSkus,
                'low_stock_items' => $lowStockItems,
                'out_of_stock_items' => $outOfStockItems,
                'turnover_ratio' => $turnoverRatio,
                'days_of_inventory_on_hand' => $daysOfInventory,
                'dead_stock_value' => round($deadStockValue, 4),
                'dead_stock_count' => $deadStockCount,
            ],
            'abc_analysis' => [
                'class_a' => [
                    'count' => count($classA),
                    'total_value' => round(array_sum(array_column($classA, 'total_value')), 4),
                    'pct_of_total' => $totalValuation > 0 ? round((array_sum(array_column($classA, 'total_value')) / $totalValuation) * 100, 2) : 0,
                    'items' => array_slice($classA, 0, 10),
                ],
                'class_b' => [
                    'count' => count($classB),
                    'total_value' => round(array_sum(array_column($classB, 'total_value')), 4),
                    'pct_of_total' => $totalValuation > 0 ? round((array_sum(array_column($classB, 'total_value')) / $totalValuation) * 100, 2) : 0,
                    'items' => array_slice($classB, 0, 10),
                ],
                'class_c' => [
                    'count' => count($classC),
                    'total_value' => round(array_sum(array_column($classC, 'total_value')), 4),
                    'pct_of_total' => $totalValuation > 0 ? round((array_sum(array_column($classC, 'total_value')) / $totalValuation) * 100, 2) : 0,
                    'items' => array_slice($classC, 0, 10),
                ],
            ],
            'aging_buckets' => $agingBuckets,
            'reorder_alerts' => $reorderItems,
        ];
    }

    /**
     * =========================================================================
     * 5. PROCUREMENT BI
     * =========================================================================
     */
    public function getProcurementBi(int $companyId, array $filters = []): array
    {
        [$start, $end] = $this->resolveDateBounds($filters);
        $startDate = $start->toDateString();
        $endDate = $end->toDateString();

        $basePurchases = Purchase::where('company_id', $companyId)
            ->where('status', 'POSTED')
            ->whereBetween('invoice_date', [$startDate, $endDate]);

        if (!empty($filters['branch_id'])) {
            $basePurchases->where('branch_id', $filters['branch_id']);
        }

        $totalSpend = (float) (clone $basePurchases)->sum('grand_total');
        $purchaseIds = (clone $basePurchases)->pluck('id');
        $paidSpend = (float) DB::table('payment_allocations')
            ->whereIn('allocatable_id', $purchaseIds)
            ->where(function ($q) {
                $q->where('allocatable_type', 'Purchase')
                  ->orWhere('allocatable_type', 'App\\Models\\Purchase')
                  ->orWhere('allocatable_type', 'like', '%Purchase%');
            })->sum('amount');
        $openApSpend = max(0, round($totalSpend - $paidSpend, 4));
        $purchaseCount = (int) (clone $basePurchases)->count();

        // Top Suppliers by Spend
        $bySupplier = DB::table('purchases')
            ->join('suppliers', 'purchases.supplier_id', '=', 'suppliers.id')
            ->where('purchases.company_id', $companyId)
            ->where('purchases.status', 'POSTED')
            ->whereBetween('purchases.invoice_date', [$startDate, $endDate])
            ->select(
                'suppliers.id',
                'suppliers.name',
                DB::raw('COUNT(purchases.id) as invoice_count'),
                DB::raw('SUM(purchases.grand_total) as total_spend')
            )
            ->groupBy('suppliers.id', 'suppliers.name')
            ->orderByDesc('total_spend')
            ->limit(10)
            ->get();

        // PO Status distribution
        $poDistribution = DB::table('purchase_orders')
            ->where('company_id', $companyId)
            ->whereBetween('order_date', [$startDate, $endDate])
            ->select('status', DB::raw('COUNT(id) as count'), DB::raw('COALESCE(SUM(grand_total), 0) as total'))
            ->groupBy('status')
            ->get();

        // Monthly Spend Trend
        $monthlySpend = DB::table('purchases')
            ->where('company_id', $companyId)
            ->where('status', 'POSTED')
            ->whereBetween('invoice_date', [$startDate, $endDate])
            ->select(
                DB::raw("TO_CHAR(invoice_date, 'YYYY-MM') as month"),
                DB::raw('SUM(grand_total) as total_spend'),
                DB::raw('COUNT(id) as invoice_count')
            )
            ->groupBy(DB::raw("TO_CHAR(invoice_date, 'YYYY-MM')"))
            ->orderBy('month')
            ->get();

        return [
            'summary' => [
                'total_spend' => $totalSpend,
                'paid_spend' => $paidSpend,
                'open_ap_spend' => $openApSpend,
                'invoices_count' => $purchaseCount,
                'average_invoice_value' => $purchaseCount > 0 ? round($totalSpend / $purchaseCount, 2) : 0.0,
            ],
            'by_supplier' => $bySupplier,
            'po_distribution' => $poDistribution,
            'monthly_trend' => $monthlySpend,
        ];
    }

    /**
     * =========================================================================
     * 6. CUSTOMER BI (RFM, CLV, COHORT, RETENTION)
     * =========================================================================
     */
    public function getCustomerBi(int $companyId, array $filters = []): array
    {
        $totalCustomers = Customer::where('company_id', $companyId)->count();

        // Active customers (with completed sale in last 90 days)
        $ninetyDaysAgo = Carbon::today()->subDays(90)->toDateString();
        $activeCustomerIds = Sale::where('company_id', $companyId)
            ->where('status', 'COMPLETED')
            ->where('sale_date', '>=', $ninetyDaysAgo)
            ->whereNotNull('customer_id')
            ->distinct()
            ->pluck('customer_id');

        $activeCount = count($activeCustomerIds);
        $inactiveCount = max(0, $totalCustomers - $activeCount);

        // Retention and RFM distribution from CustomerIntelligenceService
        $rfmDistribution = $this->customerIntelligence->getCompanyRfmDistribution($companyId);
        $retentionMetrics = $this->customerIntelligence->getRetentionMetrics($companyId, 365);

        // Top Customers by Revenue
        $topCustomers = DB::table('sales')
            ->join('customers', 'sales.customer_id', '=', 'customers.id')
            ->where('sales.company_id', $companyId)
            ->where('sales.status', 'COMPLETED')
            ->select(
                'customers.id',
                'customers.name',
                DB::raw("COALESCE(customers.mobile, '') as phone"),
                DB::raw('COUNT(sales.id) as orders_count'),
                DB::raw('SUM(sales.grand_total) as total_spent')
            )
            ->groupBy('customers.id', 'customers.name', 'customers.mobile')
            ->orderByDesc('total_spent')
            ->limit(15)
            ->get();

        // AR Aging Summary
        $now = Carbon::today();
        $arAging = [
            '0_30' => 0.0,
            '31_60' => 0.0,
            '61_90' => 0.0,
            '91_plus' => 0.0,
            'total_ar' => 0.0,
        ];

        $unpaidSales = Sale::where('company_id', $companyId)
            ->whereIn('payment_status', ['unpaid', 'partial', 'due'])
            ->where('status', '!=', 'cancelled')
            ->get();

        foreach ($unpaidSales as $sale) {
            $due = (float) ($sale->grand_total - $sale->paid_amount);
            if ($due <= 0) continue;
            $arAging['total_ar'] += $due;

            $date = $sale->sale_date ? Carbon::parse($sale->sale_date) : Carbon::parse($sale->created_at);
            $ageDays = max(0, $now->diffInDays($date));

            if ($ageDays <= 30) {
                $arAging['0_30'] += $due;
            } elseif ($ageDays <= 60) {
                $arAging['31_60'] += $due;
            } elseif ($ageDays <= 90) {
                $arAging['61_90'] += $due;
            } else {
                $arAging['91_plus'] += $due;
            }
        }

        return [
            'summary' => [
                'total_customers' => $totalCustomers,
                'active_customers' => $activeCount,
                'inactive_customers' => $inactiveCount,
                'repeat_customer_rate_pct' => $retentionMetrics['repeat_rate_pct'] ?? 0.0,
                'churn_rate_pct' => $retentionMetrics['churn_rate_pct'] ?? 0.0,
            ],
            'rfm_distribution' => $rfmDistribution,
            'top_customers' => $topCustomers,
            'ar_aging' => $arAging,
        ];
    }

    /**
     * =========================================================================
     * 7. SUPPLIER BI
     * =========================================================================
     */
    public function getSupplierBi(int $companyId, array $filters = []): array
    {
        $totalSuppliers = Supplier::where('company_id', $companyId)->count();
        $rankings = $this->supplierPerformance->getCompanySupplierRankings($companyId);

        // AP balance & aging from Purchases
        $now = Carbon::today();
        $apAging = [
            '0_30' => 0.0,
            '31_60' => 0.0,
            '61_90' => 0.0,
            '91_plus' => 0.0,
            'total_ap' => 0.0,
        ];

        $unpaidPurchases = Purchase::with('paymentAllocations')
            ->where('company_id', $companyId)
            ->where('status', 'POSTED')
            ->get();

        foreach ($unpaidPurchases as $p) {
            $due = (float) $p->due_amount;
            if ($due <= 0) continue;
            $apAging['total_ap'] += $due;

            $date = $p->invoice_date ? Carbon::parse($p->invoice_date) : Carbon::parse($p->created_at);
            $ageDays = max(0, $now->diffInDays($date));

            if ($ageDays <= 30) {
                $apAging['0_30'] += $due;
            } elseif ($ageDays <= 60) {
                $apAging['31_60'] += $due;
            } elseif ($ageDays <= 90) {
                $apAging['61_90'] += $due;
            } else {
                $apAging['91_plus'] += $due;
            }
        }

        return [
            'summary' => [
                'total_suppliers' => $totalSuppliers,
                'total_ap' => round($apAging['total_ap'], 4),
            ],
            'supplier_rankings' => $rankings,
            'ap_aging' => $apAging,
        ];
    }

    /**
     * =========================================================================
     * 8. POS BI
     * =========================================================================
     */
    public function getPosBi(int $companyId, array $filters = []): array
    {
        [$start, $end] = $this->resolveDateBounds($filters);
        $startDate = $start->toDateString();
        $endDate = $end->toDateString();

        $posSalesQuery = Sale::where('company_id', $companyId)
            ->where('channel', 'POS')
            ->where('status', 'COMPLETED')
            ->whereBetween('sale_date', [$startDate, $endDate]);

        if (!empty($filters['branch_id'])) {
            $posSalesQuery->where('branch_id', $filters['branch_id']);
        }

        $totalRevenue = (float) (clone $posSalesQuery)->sum('grand_total');
        $transactions = (int) (clone $posSalesQuery)->count();
        $aov = $transactions > 0 ? round($totalRevenue / $transactions, 2) : 0.0;

        // POS Sessions & Discrepancies
        $sessions = PosSession::where('company_id', $companyId)
            ->whereBetween('created_at', [$start, $end])
            ->get();

        $totalDiscrepancy = (float) $sessions->sum('cash_difference');
        $sessionCount = $sessions->count();

        // Hourly Sales Heatmap / Distribution (00 to 23)
        $hourly = DB::table('sales')
            ->where('company_id', $companyId)
            ->where('channel', 'POS')
            ->where('status', 'COMPLETED')
            ->whereBetween('sale_date', [$startDate, $endDate])
            ->select(
                DB::raw("EXTRACT(HOUR FROM created_at) as hour_of_day"),
                DB::raw('COUNT(id) as orders_count'),
                DB::raw('SUM(grand_total) as total_amount')
            )
            ->groupBy(DB::raw("EXTRACT(HOUR FROM created_at)"))
            ->orderBy('hour_of_day')
            ->get();

        // By Cashier
        $byCashier = DB::table('sales')
            ->leftJoin('users', 'sales.cashier_id', '=', 'users.id')
            ->where('sales.company_id', $companyId)
            ->where('sales.channel', 'POS')
            ->where('sales.status', 'COMPLETED')
            ->whereBetween('sales.sale_date', [$startDate, $endDate])
            ->select(
                DB::raw("COALESCE(users.name, 'Default Cashier') as cashier_name"),
                DB::raw('COUNT(sales.id) as transactions'),
                DB::raw('SUM(sales.grand_total) as total_sales')
            )
            ->groupBy(DB::raw("COALESCE(users.name, 'Default Cashier')"))
            ->orderByDesc('total_sales')
            ->get();

        return [
            'summary' => [
                'total_revenue' => $totalRevenue,
                'transactions' => $transactions,
                'aov' => $aov,
                'sessions_count' => $sessionCount,
                'cash_discrepancy_total' => $totalDiscrepancy,
            ],
            'hourly_distribution' => $hourly,
            'cashier_performance' => $byCashier,
        ];
    }

    /**
     * =========================================================================
     * 9. E-COMMERCE BI
     * =========================================================================
     */
    public function getEcommerceBi(int $companyId, array $filters = []): array
    {
        [$start, $end] = $this->resolveDateBounds($filters);
        $startDate = $start->toDateString();
        $endDate = $end->toDateString();

        $ecomQuery = Sale::where('company_id', $companyId)
            ->where('channel', 'ECOMMERCE')
            ->whereBetween('sale_date', [$startDate, $endDate]);

        $totalGmv = (float) (clone $ecomQuery)->where('status', 'COMPLETED')->sum('grand_total');
        $ordersCount = (int) (clone $ecomQuery)->where('status', 'COMPLETED')->count();
        $totalOrdersCreated = (int) (clone $ecomQuery)->count();
        $shippingRevenue = (float) (clone $ecomQuery)->where('status', 'COMPLETED')->sum('shipping_amount');

        // Status Pipeline
        $statusPipeline = DB::table('sales')
            ->where('company_id', $companyId)
            ->where('channel', 'ECOMMERCE')
            ->whereBetween('sale_date', [$startDate, $endDate])
            ->select('status', 'fulfillment_status', DB::raw('COUNT(id) as count'), DB::raw('SUM(grand_total) as total'))
            ->groupBy('status', 'fulfillment_status')
            ->get();

        return [
            'summary' => [
                'gmv' => $totalGmv,
                'orders_count' => $ordersCount,
                'total_orders_created' => $totalOrdersCreated,
                'aov' => $ordersCount > 0 ? round($totalGmv / $ordersCount, 2) : 0.0,
                'shipping_revenue' => $shippingRevenue,
                'conversion_rate_pct' => $totalOrdersCreated > 0 ? round(($ordersCount / $totalOrdersCreated) * 100, 2) : 0.0,
            ],
            'status_pipeline' => $statusPipeline,
        ];
    }

    /**
     * =========================================================================
     * 10. HR & PAYROLL BI
     * =========================================================================
     */
    public function getHrBi(int $companyId, array $filters = []): array
    {
        $hasHrm = DB::getSchemaBuilder()->hasTable('employees');

        if (!$hasHrm) {
            return [
                'available' => false,
                'message' => 'HRM module tables not present.',
            ];
        }

        $totalEmployees = DB::table('employees')->where('company_id', $companyId)->count();
        $activeEmployees = DB::table('employees')->where('company_id', $companyId)->where('status', 'ACTIVE')->count();

        // Department breakdown
        $byDept = DB::table('employees')
            ->leftJoin('departments', 'employees.department_id', '=', 'departments.id')
            ->where('employees.company_id', $companyId)
            ->select(
                DB::raw("COALESCE(departments.name, 'General') as department_name"),
                DB::raw('COUNT(employees.id) as headcount'),
                DB::raw('COALESCE(SUM(employees.basic_salary), 0) as total_basic_salary')
            )
            ->groupBy(DB::raw("COALESCE(departments.name, 'General')"))
            ->get();

        // Monthly Payroll spend (if payrolls table exists)
        $payrollSpend = 0.0;
        if (DB::getSchemaBuilder()->hasTable('payrolls')) {
            $payrollSpend = (float) DB::table('payrolls')
                ->where('company_id', $companyId)
                ->where('status', 'PAID')
                ->sum('net_salary');
        }

        return [
            'available' => true,
            'summary' => [
                'total_employees' => $totalEmployees,
                'active_employees' => $activeEmployees,
                'total_payroll_spend' => $payrollSpend,
            ],
            'by_department' => $byDept,
        ];
    }

    /**
     * =========================================================================
     * 11. FINANCE BI
     * =========================================================================
     */
    public function getFinanceBi(int $companyId, array $filters = []): array
    {
        $ratios = $this->financialAnalytics->getFinancialRatios($companyId, $filters);
        $telemetry = $this->financialAnalytics->getExecutiveDashboardTelemetry($companyId);
        $forecast = $this->financialAnalytics->getDeterministicForecast($companyId, 'MOVING_AVERAGE', 6);

        // Budget vs Actual
        $activeBudget = Budget::with('lines.account')
            ->where('company_id', $companyId)
            ->where('status', 'ACTIVE')
            ->first();

        $budgetDetails = [];
        if ($activeBudget) {
            foreach ($activeBudget->lines as $line) {
                $actual = (float) JournalEntryLine::whereHas('journalEntry', function ($q) use ($companyId) {
                    $q->where('company_id', $companyId)->where('status', 'POSTED');
                })->where('account_id', $line->account_id)->sum(DB::raw('debit - credit'));

                $budgeted = (float) $line->budgeted_amount;
                $variance = round($budgeted - $actual, 4);
                $utilization = $budgeted > 0 ? round(($actual / $budgeted) * 100, 2) : 0.0;

                $budgetDetails[] = [
                    'account_name' => $line->account?->name ?? 'Account',
                    'budgeted' => $budgeted,
                    'actual' => $actual,
                    'variance' => $variance,
                    'utilization_pct' => $utilization,
                ];
            }
        }

        return [
            'ratios' => $ratios,
            'telemetry' => $telemetry,
            'forecast_6_months' => $forecast,
            'budget_variance' => $budgetDetails,
        ];
    }

    /**
     * =========================================================================
     * 12. VAT / TAX BI
     * =========================================================================
     */
    public function getVatBi(int $companyId, array $filters = []): array
    {
        [$start, $end] = $this->resolveDateBounds($filters);
        $startDate = $start->toDateString();
        $endDate = $end->toDateString();

        $outputVat = (float) Sale::where('company_id', $companyId)
            ->where('status', 'COMPLETED')
            ->whereBetween('sale_date', [$startDate, $endDate])
            ->sum('tax_total');

        $inputVat = (float) Purchase::where('company_id', $companyId)
            ->where('status', 'POSTED')
            ->whereBetween('invoice_date', [$startDate, $endDate])
            ->sum('tax_total');

        $netVatPayable = round($outputVat - $inputVat, 4);

        return [
            'summary' => [
                'output_vat' => $outputVat,
                'input_vat' => $inputVat,
                'net_vat_payable' => $netVatPayable,
                'status' => $netVatPayable >= 0 ? 'PAYABLE' : 'REFUNDABLE',
            ],
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ];
    }

    /**
     * =========================================================================
     * 13. BRANCH / BUSINESS UNIT BI
     * =========================================================================
     */
    public function getBranchBi(int $companyId, array $filters = []): array
    {
        [$start, $end] = $this->resolveDateBounds($filters);
        $startDate = $start->toDateString();
        $endDate = $end->toDateString();

        $branches = Branch::where('company_id', $companyId)->get();
        $results = [];

        foreach ($branches as $branch) {
            $sales = Sale::where('company_id', $companyId)
                ->where('branch_id', $branch->id)
                ->where('status', 'COMPLETED')
                ->whereBetween('sale_date', [$startDate, $endDate]);

            $rev = (float) (clone $sales)->sum('grand_total');
            $txCount = (int) (clone $sales)->count();
            $saleIds = (clone $sales)->pluck('id');

            $cogs = (float) SaleItem::whereIn('sale_id', $saleIds)
                ->sum(DB::raw('CASE WHEN total_cost_snapshot > 0 THEN total_cost_snapshot ELSE (quantity * unit_cost_snapshot) END'));

            $gp = round($rev - $cogs, 4);
            $margin = $rev > 0 ? round(($gp / $rev) * 100, 2) : 0.0;

            $invVal = (float) Inventory::where('company_id', $companyId)
                ->where('branch_id', $branch->id)
                ->sum('total_value');

            $results[] = [
                'branch_id' => $branch->id,
                'name' => $branch->name,
                'code' => $branch->code,
                'revenue' => $rev,
                'transactions' => $txCount,
                'cogs' => $cogs,
                'gross_profit' => $gp,
                'gross_margin_pct' => $margin,
                'inventory_value' => $invVal,
            ];
        }

        usort($results, fn($a, $b) => $b['revenue'] <=> $a['revenue']);

        return [
            'branches' => $results,
        ];
    }

    /**
     * =========================================================================
     * 14. PRODUCT / CATEGORY BI
     * =========================================================================
     */
    public function getProductBi(int $companyId, array $filters = []): array
    {
        [$start, $end] = $this->resolveDateBounds($filters);
        $startDate = $start->toDateString();
        $endDate = $end->toDateString();

        $products = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->where('sales.company_id', $companyId)
            ->where('sales.status', 'COMPLETED')
            ->whereBetween('sales.sale_date', [$startDate, $endDate])
            ->select(
                'products.id',
                'products.name',
                DB::raw("COALESCE(MAX(sale_items.sku_snapshot), '') as sku"),
                DB::raw("COALESCE(categories.name, 'General') as category_name"),
                DB::raw('SUM(sale_items.quantity) as units_sold'),
                DB::raw('SUM(sale_items.line_total) as revenue'),
                DB::raw('SUM(CASE WHEN sale_items.total_cost_snapshot > 0 THEN sale_items.total_cost_snapshot ELSE (sale_items.quantity * sale_items.unit_cost_snapshot) END) as cogs')
            )
            ->groupBy('products.id', 'products.name', 'categories.name')
            ->orderByDesc('revenue')
            ->limit(50)
            ->get()
            ->map(function ($p) {
                $rev = (float) $p->revenue;
                $cogs = (float) $p->cogs;
                $gp = round($rev - $cogs, 4);
                $margin = $rev > 0 ? round(($gp / $rev) * 100, 2) : 0.0;
                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'sku' => $p->sku,
                    'category' => $p->category_name,
                    'units_sold' => (float) $p->units_sold,
                    'revenue' => $rev,
                    'cogs' => $cogs,
                    'gross_profit' => $gp,
                    'gross_margin_pct' => $margin,
                ];
            });

        return [
            'products' => $products,
        ];
    }

    /**
     * =========================================================================
     * 15. CHANNEL BI
     * =========================================================================
     */
    public function getChannelBi(int $companyId, array $filters = []): array
    {
        [$start, $end] = $this->resolveDateBounds($filters);
        $startDate = $start->toDateString();
        $endDate = $end->toDateString();

        $channels = DB::table('sales')
            ->where('company_id', $companyId)
            ->where('status', 'COMPLETED')
            ->whereBetween('sale_date', [$startDate, $endDate])
            ->select(
                DB::raw("COALESCE(channel, 'POS') as channel_name"),
                DB::raw('COUNT(id) as transactions'),
                DB::raw('SUM(grand_total) as revenue'),
                DB::raw('SUM(discount_total) as discounts')
            )
            ->groupBy('channel_name')
            ->get();

        return [
            'channels' => $channels,
        ];
    }

    /**
     * =========================================================================
     * 16. SALESPERSON BI
     * =========================================================================
     */
    public function getSalespersonBi(int $companyId, array $filters = []): array
    {
        [$start, $end] = $this->resolveDateBounds($filters);
        $startDate = $start->toDateString();
        $endDate = $end->toDateString();

        $salespeople = DB::table('sales')
            ->leftJoin('users', 'sales.salesperson_id', '=', 'users.id')
            ->where('sales.company_id', $companyId)
            ->where('sales.status', 'COMPLETED')
            ->whereBetween('sales.sale_date', [$startDate, $endDate])
            ->select(
                DB::raw("COALESCE(users.name, 'Unassigned') as salesperson_name"),
                DB::raw('COUNT(sales.id) as orders_count'),
                DB::raw('SUM(sales.grand_total) as total_revenue')
            )
            ->groupBy(DB::raw("COALESCE(users.name, 'Unassigned')"))
            ->orderByDesc('total_revenue')
            ->get();

        return [
            'salespeople' => $salespeople,
        ];
    }
}
