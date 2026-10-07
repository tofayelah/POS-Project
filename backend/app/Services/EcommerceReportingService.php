<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SalesReturn;
use App\Models\Shipment;
use App\Models\TaxTransaction;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class EcommerceReportingService
{
    /**
     * Get authoritative E-Commerce dashboard overview KPIs.
     */
    public function getOverviewKPIs(int $companyId, ?string $startDate = null, ?string $endDate = null): array
    {
        $start = $startDate ? Carbon::parse($startDate)->startOfDay() : Carbon::now()->subDays(30)->startOfDay();
        $end = $endDate ? Carbon::parse($endDate)->endOfDay() : Carbon::now()->endOfDay();

        $salesQuery = Sale::where('company_id', $companyId)
            ->where('channel', 'ECOMMERCE')
            ->whereBetween('created_at', [$start, $end]);

        $completedSalesQuery = (clone $salesQuery)->whereIn('status', ['COMPLETED', 'PARTIALLY_RETURNED', 'RETURNED']);

        $totalOrders = (clone $salesQuery)->count();
        $grossSales = (float) ((clone $completedSalesQuery)->sum('grand_total') ?? 0);
        $totalDiscount = (float) ((clone $completedSalesQuery)->sum('discount_total') ?? 0);
        $totalTax = (float) ((clone $completedSalesQuery)->sum('tax_total') ?? 0);
        $totalShipping = (float) ((clone $completedSalesQuery)->sum('shipping_amount') ?? 0);

        $returnsQuery = SalesReturn::where('company_id', $companyId)
            ->whereHas('originalSale', function ($q) {
                $q->where('channel', 'ECOMMERCE');
            })
            ->whereBetween('created_at', [$start, $end]);

        $refundedAmount = (float) ($returnsQuery->sum('refund_total') ?? 0);
        $returnsCount = $returnsQuery->count();

        $netSales = max(0, round($grossSales - $refundedAmount, 4));
        $aov = $totalOrders > 0 ? round($grossSales / $totalOrders, 2) : 0.0;

        // COD vs Online
        $codOrders = (clone $salesQuery)
            ->whereHas('onlinePaymentTransactions', function ($q) {
                $q->where('gateway', 'COD');
            })
            ->orWhere(function ($q) use ($companyId, $start, $end) {
                $q->where('company_id', $companyId)
                    ->where('channel', 'ECOMMERCE')
                    ->whereBetween('created_at', [$start, $end])
                    ->whereDoesntHave('onlinePaymentTransactions');
            });
        $codAmount = (float) ($codOrders->sum('grand_total') ?? 0);

        $onlineOrders = (clone $salesQuery)->whereHas('onlinePaymentTransactions', function ($q) {
            $q->whereIn('gateway', ['BKASH', 'NAGAD', 'CARD', 'SSLCOMMERZ', 'STORE_CREDIT']);
        });
        $onlineAmount = (float) ($onlineOrders->sum('grand_total') ?? 0);

        // Fulfillment status distribution
        $fulfillmentCounts = Sale::where('company_id', $companyId)
            ->where('channel', 'ECOMMERCE')
            ->whereBetween('created_at', [$start, $end])
            ->select('fulfillment_status', DB::raw('count(*) as count'))
            ->groupBy('fulfillment_status')
            ->pluck('count', 'fulfillment_status')
            ->toArray();

        // Channel comparison (POS vs E-commerce)
        $channelComparison = Sale::where('company_id', $companyId)
            ->whereBetween('created_at', [$start, $end])
            ->select('channel', DB::raw('count(*) as orders'), DB::raw('sum(grand_total) as total'))
            ->groupBy('channel')
            ->get()
            ->map(function ($row) {
                return [
                    'channel' => $row->channel,
                    'orders' => (int) $row->orders,
                    'total' => round((float)$row->total, 2),
                ];
            });

        // Top-selling published products
        $topProducts = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.company_id', $companyId)
            ->where('sales.channel', 'ECOMMERCE')
            ->whereBetween('sales.created_at', [$start, $end])
            ->select(
                'sale_items.product_name_snapshot as name',
                DB::raw('sum(sale_items.quantity) as total_units'),
                DB::raw('sum(sale_items.line_total) as total_revenue')
            )
            ->groupBy('sale_items.product_name_snapshot')
            ->orderByDesc('total_revenue')
            ->limit(5)
            ->get();

        return [
            'period' => [
                'start' => $start->toDateString(),
                'end' => $end->toDateString(),
            ],
            'kpis' => [
                'total_orders' => $totalOrders,
                'gross_sales' => round($grossSales, 2),
                'net_sales' => round($netSales, 2),
                'aov' => $aov,
                'total_discount' => round($totalDiscount, 2),
                'total_tax' => round($totalTax, 2),
                'total_shipping' => round($totalShipping, 2),
                'refunded_amount' => round($refundedAmount, 2),
                'returns_count' => $returnsCount,
                'cod_amount' => round($codAmount, 2),
                'online_amount' => round($onlineAmount, 2),
            ],
            'fulfillment_status' => $fulfillmentCounts,
            'channel_comparison' => $channelComparison,
            'top_products' => $topProducts,
        ];
    }
}
