<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalesReturn;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SalesIntelligenceService
{
    /**
     * Sales analysis aggregated by customer.
     */
    public function getSalesByCustomer(int $companyId, array $filters = []): array
    {
        $query = Sale::where('sales.company_id', $companyId)
            ->where('sales.status', 'COMPLETED')
            ->leftJoin('customers', 'customers.id', '=', 'sales.customer_id')
            ->select(
                'sales.customer_id',
                DB::raw("COALESCE(customers.customer_code, 'WALK-IN') as customer_code"),
                DB::raw("COALESCE(customers.name, 'Walk-in Customer') as customer_name"),
                DB::raw('count(sales.id) as order_count'),
                DB::raw('sum(sales.grand_total) as gross_sales'),
                DB::raw('sum(sales.discount_total) as total_discount'),
                DB::raw('sum(sales.tax_total) as total_tax')
            )
            ->groupBy('sales.customer_id', 'customers.customer_code', 'customers.name');

        if (!empty($filters['date_from'])) {
            $query->whereDate('sales.sale_date', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->whereDate('sales.sale_date', '<=', $filters['date_to']);
        }
        if (!empty($filters['branch_id'])) {
            $query->where('sales.branch_id', $filters['branch_id']);
        }

        $limit = isset($filters['limit']) ? (int) $filters['limit'] : 50;
        $results = $query->orderByDesc('gross_sales')->limit($limit)->get();

        $rows = [];
        foreach ($results as $r) {
            $custId = $r->customer_id;
            $returnQuery = SalesReturn::where('company_id', $companyId)->where('status', 'COMPLETED');
            if ($custId) {
                $returnQuery->where('customer_id', $custId);
            } else {
                $returnQuery->whereNull('customer_id');
            }
            if (!empty($filters['date_from'])) $returnQuery->whereDate('return_date', '>=', $filters['date_from']);
            if (!empty($filters['date_to'])) $returnQuery->whereDate('return_date', '<=', $filters['date_to']);
            $returns = (float) $returnQuery->sum('refund_total');

            // COGS
            $cogsQuery = SaleItem::join('sales', 'sales.id', '=', 'sale_items.sale_id')
                ->where('sales.company_id', $companyId)
                ->where('sales.status', 'COMPLETED');
            if ($custId) {
                $cogsQuery->where('sales.customer_id', $custId);
            } else {
                $cogsQuery->whereNull('sales.customer_id');
            }
            if (!empty($filters['date_from'])) $cogsQuery->whereDate('sales.sale_date', '>=', $filters['date_from']);
            if (!empty($filters['date_to'])) $cogsQuery->whereDate('sales.sale_date', '<=', $filters['date_to']);
            $cogs = (float) $cogsQuery->sum('sale_items.total_cost_snapshot');

            $grossSales = (float) $r->gross_sales;
            $netSales = max(0.0, round($grossSales - (float) $r->total_tax - $returns, 4));
            $grossProfit = round($netSales - $cogs, 4);
            $marginPct = $netSales > 0 ? round(($grossProfit / $netSales) * 100, 2) : 0.0;

            $rows[] = [
                'customer_id' => $r->customer_id,
                'customer_code' => $r->customer_code,
                'customer_name' => $r->customer_name,
                'orders' => (int) $r->order_count,
                'gross_sales' => round($grossSales, 4),
                'discount' => round((float) $r->total_discount, 4),
                'returns' => round($returns, 4),
                'net_sales' => $netSales,
                'cogs' => round($cogs, 4),
                'gross_profit' => $grossProfit,
                'margin_pct' => $marginPct,
            ];
        }

        return $rows;
    }

    /**
     * Sales performance by branch.
     */
    public function getSalesByBranch(int $companyId, array $filters = []): array
    {
        $query = Sale::where('sales.company_id', $companyId)
            ->where('sales.status', 'COMPLETED')
            ->leftJoin('branches', 'branches.id', '=', 'sales.branch_id')
            ->select(
                'sales.branch_id',
                DB::raw("COALESCE(branches.name, 'Unassigned Branch') as branch_name"),
                DB::raw('count(sales.id) as order_count'),
                DB::raw('count(distinct sales.customer_id) as customer_count'),
                DB::raw('sum(sales.grand_total) as gross_sales'),
                DB::raw('sum(sales.tax_total) as total_tax')
            )
            ->groupBy('sales.branch_id', 'branches.name');

        if (!empty($filters['date_from'])) {
            $query->whereDate('sales.sale_date', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->whereDate('sales.sale_date', '<=', $filters['date_to']);
        }

        $branches = $query->orderByDesc('gross_sales')->get();
        $rows = [];

        foreach ($branches as $b) {
            $branchId = $b->branch_id;
            $returns = (float) SalesReturn::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('status', 'COMPLETED')
                ->sum('refund_total');

            $cogs = (float) SaleItem::join('sales', 'sales.id', '=', 'sale_items.sale_id')
                ->where('sales.company_id', $companyId)
                ->where('sales.branch_id', $branchId)
                ->where('sales.status', 'COMPLETED')
                ->sum('sale_items.total_cost_snapshot');

            $gross = (float) $b->gross_sales;
            $net = max(0.0, round($gross - (float) $b->total_tax - $returns, 4));
            $gp = round($net - $cogs, 4);
            $margin = $net > 0 ? round(($gp / $net) * 100, 2) : 0.0;
            $aov = (int) $b->order_count > 0 ? round($gross / (int) $b->order_count, 2) : 0.0;

            $rows[] = [
                'branch_id' => $b->branch_id,
                'branch_name' => $b->branch_name,
                'orders' => (int) $b->order_count,
                'customers' => (int) $b->customer_count,
                'gross_sales' => round($gross, 4),
                'returns' => round($returns, 4),
                'net_sales' => $net,
                'cogs' => round($cogs, 4),
                'gross_profit' => $gp,
                'margin_pct' => $margin,
                'average_order_value' => $aov,
            ];
        }

        return $rows;
    }

    /**
     * Sales performance by product / variant.
     */
    public function getSalesByProduct(int $companyId, array $filters = []): array
    {
        $query = SaleItem::join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.company_id', $companyId)
            ->where('sales.status', 'COMPLETED')
            ->select(
                'sale_items.product_id',
                'sale_items.product_variant_id',
                'sale_items.product_name_snapshot',
                'sale_items.sku_snapshot',
                DB::raw('sum(sale_items.quantity) as units_sold'),
                DB::raw('sum(sale_items.line_total) as revenue'),
                DB::raw('sum(sale_items.discount) as discount'),
                DB::raw('sum(sale_items.total_cost_snapshot) as cogs')
            )
            ->groupBy(
                'sale_items.product_id',
                'sale_items.product_variant_id',
                'sale_items.product_name_snapshot',
                'sale_items.sku_snapshot'
            );

        if (!empty($filters['date_from'])) {
            $query->whereDate('sales.sale_date', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->whereDate('sales.sale_date', '<=', $filters['date_to']);
        }

        $limit = isset($filters['limit']) ? (int) $filters['limit'] : 50;
        $results = $query->orderByDesc('revenue')->limit($limit)->get();

        $rows = [];
        foreach ($results as $p) {
            $rev = (float) $p->revenue;
            $cogs = (float) $p->cogs;
            $gp = round($rev - $cogs, 4);
            $margin = $rev > 0 ? round(($gp / $rev) * 100, 2) : 0.0;

            $rows[] = [
                'product_id' => $p->product_id,
                'variant_id' => $p->product_variant_id,
                'name' => $p->product_name_snapshot,
                'sku' => $p->sku_snapshot,
                'units_sold' => round((float) $p->units_sold, 2),
                'revenue' => round($rev, 4),
                'discount' => round((float) $p->discount, 4),
                'cogs' => round($cogs, 4),
                'gross_profit' => $gp,
                'margin_pct' => $margin,
            ];
        }

        return $rows;
    }

    /**
     * Sales performance by salesperson.
     */
    public function getSalesBySalesperson(int $companyId, array $filters = []): array
    {
        $query = Sale::where('sales.company_id', $companyId)
            ->where('sales.status', 'COMPLETED')
            ->leftJoin('users', 'users.id', '=', 'sales.salesperson_id')
            ->select(
                'sales.salesperson_id',
                DB::raw("COALESCE(users.name, 'Unassigned Staff') as salesperson_name"),
                DB::raw('count(sales.id) as order_count'),
                DB::raw('sum(sales.grand_total) as gross_sales'),
                DB::raw('sum(sales.tax_total) as total_tax')
            )
            ->groupBy('sales.salesperson_id', 'users.name');

        if (!empty($filters['date_from'])) {
            $query->whereDate('sales.sale_date', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->whereDate('sales.sale_date', '<=', $filters['date_to']);
        }

        $results = $query->orderByDesc('gross_sales')->get();
        $rows = [];

        foreach ($results as $sp) {
            $spId = $sp->salesperson_id;
            $cogsQuery = SaleItem::join('sales', 'sales.id', '=', 'sale_items.sale_id')
                ->where('sales.company_id', $companyId)
                ->where('sales.status', 'COMPLETED');
            if ($spId) {
                $cogsQuery->where('sales.salesperson_id', $spId);
            } else {
                $cogsQuery->whereNull('sales.salesperson_id');
            }
            $cogs = (float) $cogsQuery->sum('sale_items.total_cost_snapshot');

            $gross = (float) $sp->gross_sales;
            $net = max(0.0, round($gross - (float) $sp->total_tax, 4));
            $gp = round($net - $cogs, 4);
            $margin = $net > 0 ? round(($gp / $net) * 100, 2) : 0.0;
            $aov = (int) $sp->order_count > 0 ? round($gross / (int) $sp->order_count, 2) : 0.0;

            $rows[] = [
                'salesperson_id' => $sp->salesperson_id,
                'salesperson_name' => $sp->salesperson_name,
                'orders' => (int) $sp->order_count,
                'gross_sales' => round($gross, 4),
                'net_sales' => $net,
                'cogs' => round($cogs, 4),
                'gross_profit' => $gp,
                'margin_pct' => $margin,
                'average_order_value' => $aov,
            ];
        }

        return $rows;
    }

    /**
     * Sales returns diagnostic analytics.
     */
    public function getSalesReturnAnalytics(int $companyId, array $filters = []): array
    {
        $salesQuery = Sale::where('company_id', $companyId)->where('status', 'COMPLETED');
        $returnsQuery = SalesReturn::where('company_id', $companyId)->where('status', 'COMPLETED');

        if (!empty($filters['date_from'])) {
            $salesQuery->whereDate('sale_date', '>=', $filters['date_from']);
            $returnsQuery->whereDate('return_date', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $salesQuery->whereDate('sale_date', '<=', $filters['date_to']);
            $returnsQuery->whereDate('return_date', '<=', $filters['date_to']);
        }

        $grossSales = (float) $salesQuery->sum('grand_total');
        $returnCount = $returnsQuery->count();
        $returnValue = (float) $returnsQuery->sum('refund_total');

        $returnRatePct = $grossSales > 0 ? round(($returnValue / $grossSales) * 100, 2) : 0.0;

        // Group returns by reason
        $byReason = SalesReturn::where('company_id', $companyId)
            ->where('status', 'COMPLETED')
            ->select(DB::raw("COALESCE(reason, 'Unspecified Reason') as reason_name"), DB::raw('count(id) as count'), DB::raw('sum(refund_total) as value'))
            ->groupBy('reason')
            ->orderByDesc('value')
            ->get();

        return [
            'gross_sales' => round($grossSales, 4),
            'return_count' => $returnCount,
            'return_value' => round($returnValue, 4),
            'return_rate_pct' => $returnRatePct,
            'by_reason' => $byReason,
        ];
    }

    /**
     * Deterministic demand forecasting based on sales velocity.
     */
    public function getDemandForecast(int $companyId, ?int $productId = null, int $forecastDays = 30): array
    {
        $now = Carbon::now();
        $date30 = $now->copy()->subDays(30)->toDateString();
        $date60 = $now->copy()->subDays(60)->toDateString();
        $date90 = $now->copy()->subDays(90)->toDateString();

        $query = SaleItem::join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.company_id', $companyId)
            ->where('sales.status', 'COMPLETED');

        if ($productId) {
            $query->where('sale_items.product_id', $productId);
        }

        $items = $query->select(
            'sale_items.product_id',
            'sale_items.product_variant_id',
            'sale_items.product_name_snapshot',
            'sale_items.sku_snapshot',
            DB::raw("SUM(CASE WHEN sales.sale_date >= '{$date30}' THEN sale_items.quantity ELSE 0 END) as qty_30d"),
            DB::raw("SUM(CASE WHEN sales.sale_date >= '{$date60}' THEN sale_items.quantity ELSE 0 END) as qty_60d"),
            DB::raw("SUM(CASE WHEN sales.sale_date >= '{$date90}' THEN sale_items.quantity ELSE 0 END) as qty_90d")
        )
        ->groupBy('sale_items.product_id', 'sale_items.product_variant_id', 'sale_items.product_name_snapshot', 'sale_items.sku_snapshot')
        ->orderByDesc('qty_30d')
        ->limit(30)
        ->get();

        $forecasts = [];
        foreach ($items as $item) {
            $qty30 = (float) $item->qty_30d;
            $qty60 = (float) $item->qty_60d;
            $qty90 = (float) $item->qty_90d;

            // Velocity: average daily sales (weighted recent)
            $v30 = $qty30 / 30.0;
            $v60 = $qty60 / 60.0;
            $v90 = $qty90 / 90.0;

            $weightedAds = round(($v30 * 0.5) + ($v60 * 0.3) + ($v90 * 0.2), 2);
            $projectedDemand = round($weightedAds * $forecastDays, 2);

            $trend = 'STABLE';
            if ($v30 > ($v60 * 1.15)) {
                $trend = 'GROWING';
            } elseif ($v30 < ($v60 * 0.85)) {
                $trend = 'DECLINING';
            }

            $forecasts[] = [
                'product_id' => $item->product_id,
                'product_variant_id' => $item->product_variant_id,
                'name' => $item->product_name_snapshot,
                'sku' => $item->sku_snapshot,
                'units_sold_30d' => $qty30,
                'units_sold_60d' => $qty60,
                'units_sold_90d' => $qty90,
                'avg_daily_sales' => $weightedAds,
                'average_daily_sales' => $weightedAds,
                'forecast_days' => $forecastDays,
                'projected_demand' => $projectedDemand,
                'trend' => $trend,
            ];
        }

        return $forecasts;
    }

    /**
     * Customer Demand Integration with Phase 6 inventory and Phase 7 procurement.
     */
    public function getCustomerDemandIntegration(int $companyId): array
    {
        $forecasts = $this->getDemandForecast($companyId, null, 30);
        $demandRisks = [];

        foreach ($forecasts as $f) {
            $productId = $f['product_id'];
            $ads = (float) $f['avg_daily_sales'];
            if ($ads <= 0) {
                continue;
            }

            // Current inventory
            $currentStock = (float) Inventory::where('company_id', $companyId)
                ->where('product_id', $productId)
                ->sum('quantity');

            // Incoming POs from Phase 7
            $incomingPo = (float) PurchaseOrderItem::join('purchase_orders', 'purchase_orders.id', '=', 'purchase_order_items.purchase_order_id')
                ->where('purchase_orders.company_id', $companyId)
                ->whereIn('purchase_orders.status', ['APPROVED', 'PARTIALLY_RECEIVED'])
                ->where('purchase_order_items.product_id', $productId)
                ->sum(DB::raw('purchase_order_items.quantity - COALESCE(purchase_order_items.received_quantity, 0)'));

            $effectiveStock = $currentStock + $incomingPo;
            $daysRemaining = $ads > 0 ? round($effectiveStock / $ads, 1) : 999;

            $risk = 'LOW';
            if ($daysRemaining < 7) {
                $risk = 'HIGH';
            } elseif ($daysRemaining < 15) {
                $risk = 'MEDIUM';
            }

            $stockoutDate = $daysRemaining < 999 ? Carbon::now()->addDays((int) floor($daysRemaining))->toDateString() : null;
            $reorderRecommendation = max(0, round(($ads * 30) - $effectiveStock, 0));

            $demandRisks[] = [
                'product_id' => $productId,
                'product_name' => $f['name'],
                'sku' => $f['sku'],
                'avg_daily_sales' => $ads,
                'current_stock' => $currentStock,
                'incoming_po_stock' => $incomingPo,
                'effective_stock' => $effectiveStock,
                'days_remaining' => $daysRemaining,
                'demand_risk' => $risk,
                'potential_stockout_date' => $stockoutDate,
                'recommended_reorder_qty' => $reorderRecommendation,
            ];
        }

        usort($demandRisks, function ($a, $b) {
            $weights = ['HIGH' => 3, 'MEDIUM' => 2, 'LOW' => 1];
            $wA = $weights[$a['demand_risk']] ?? 0;
            $wB = $weights[$b['demand_risk']] ?? 0;
            if ($wA !== $wB) {
                return $wB <=> $wA;
            }
            return $a['days_remaining'] <=> $b['days_remaining'];
        });

        return $demandRisks;
    }

    /**
     * Sales Intelligence Dashboard summary metrics.
     */
    public function getSalesDashboard(int $companyId): array
    {
        $today = Carbon::today()->toDateString();
        $monthStart = Carbon::now()->startOfMonth()->toDateString();

        $todaySales = (float) Sale::where('company_id', $companyId)->where('status', 'COMPLETED')->whereDate('sale_date', $today)->sum('grand_total');
        $monthSales = (float) Sale::where('company_id', $companyId)->where('status', 'COMPLETED')->whereDate('sale_date', '>=', $monthStart)->sum('grand_total');
        $monthOrders = Sale::where('company_id', $companyId)->where('status', 'COMPLETED')->whereDate('sale_date', '>=', $monthStart)->count();

        $monthReturns = (float) SalesReturn::where('company_id', $companyId)->where('status', 'COMPLETED')->whereDate('return_date', '>=', $monthStart)->sum('refund_total');
        $monthTax = (float) Sale::where('company_id', $companyId)->where('status', 'COMPLETED')->whereDate('sale_date', '>=', $monthStart)->sum('tax_total');
        $netSalesMonth = max(0.0, round($monthSales - $monthTax - $monthReturns, 4));

        $monthCogs = (float) SaleItem::join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.company_id', $companyId)
            ->where('sales.status', 'COMPLETED')
            ->whereDate('sales.sale_date', '>=', $monthStart)
            ->sum('sale_items.total_cost_snapshot');

        $grossProfitMonth = round($netSalesMonth - $monthCogs, 4);
        $marginPct = $netSalesMonth > 0 ? round(($grossProfitMonth / $netSalesMonth) * 100, 2) : 0.0;
        $aovMonth = $monthOrders > 0 ? round($monthSales / $monthOrders, 2) : 0.0;
        $returnRateMonth = $monthSales > 0 ? round(($monthReturns / $monthSales) * 100, 2) : 0.0;

        return [
            'today_sales' => round($todaySales, 4),
            'month_sales' => round($monthSales, 4),
            'month_orders' => $monthOrders,
            'month_net_sales' => $netSalesMonth,
            'month_gross_profit' => $grossProfitMonth,
            'month_margin_pct' => $marginPct,
            'month_average_order_value' => $aovMonth,
            'month_return_rate_pct' => $returnRateMonth,
        ];
    }

    public function getSalespersonPerformance(int $companyId, array $filters = []): array
    {
        return $this->getSalesBySalesperson($companyId, $filters);
    }

    public function getSalesReturnAnalysis(int $companyId, array $filters = []): array
    {
        return $this->getSalesReturnAnalytics($companyId, $filters);
    }

    public function getProcurementDemandIntegration(int $companyId, int $leadTimeDays = 7, int $bufferDays = 14): array
    {
        return $this->getCustomerDemandIntegration($companyId);
    }
}
