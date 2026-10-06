<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalesReturn;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class CustomerIntelligenceService
{
    public function __construct(
        protected CustomerCreditService $creditService,
        protected CustomerAgingService $agingService,
        protected CustomerCrmService $crmService,
        protected StoreCreditService $storeCreditService
    ) {}

    /**
     * Compute deterministic RFM metrics and update snapshot on customer.
     */
    public function calculateCustomerRfm(int $companyId, int $customerId, int $analysisDays = 365): array
    {
        $customer = Customer::where('company_id', $companyId)->findOrFail($customerId);

        $windowStart = Carbon::now()->subDays($analysisDays)->startOfDay();

        $sales = Sale::where('company_id', $companyId)
            ->where('customer_id', $customerId)
            ->where('status', 'COMPLETED')
            ->where('sale_date', '>=', $windowStart->toDateString())
            ->get();

        $allTimeLastSale = Sale::where('company_id', $companyId)
            ->where('customer_id', $customerId)
            ->where('status', 'COMPLETED')
            ->orderBy('sale_date', 'desc')
            ->first();

        // 1. Recency
        if ($allTimeLastSale) {
            $lastDate = $allTimeLastSale->sale_date ? Carbon::parse($allTimeLastSale->sale_date) : Carbon::parse($allTimeLastSale->created_at);
            $recencyDays = max(0, Carbon::now()->diffInDays($lastDate));
        } else {
            $recencyDays = 999;
        }

        // 2. Frequency (orders in window)
        $frequency = $sales->count();

        // 3. Monetary (net sales in window)
        $grossSales = (float) $sales->sum('grand_total');
        $returns = (float) SalesReturn::where('company_id', $companyId)
            ->where('customer_id', $customerId)
            ->where('status', 'COMPLETED')
            ->where('return_date', '>=', $windowStart->toDateString())
            ->sum('refund_total');

        $monetary = max(0.0, round($grossSales - $returns, 4));

        // Deterministic Scores 1 to 5
        // Recency Score (higher is more recent)
        $rScore = 1;
        if ($recencyDays <= 30) {
            $rScore = 5;
        } elseif ($recencyDays <= 60) {
            $rScore = 4;
        } elseif ($recencyDays <= 120) {
            $rScore = 3;
        } elseif ($recencyDays <= 240) {
            $rScore = 2;
        }

        // Frequency Score (higher is more frequent)
        $fScore = 1;
        if ($frequency >= 20) {
            $fScore = 5;
        } elseif ($frequency >= 10) {
            $fScore = 4;
        } elseif ($frequency >= 5) {
            $fScore = 3;
        } elseif ($frequency >= 2) {
            $fScore = 2;
        }

        // Monetary Score (higher is more spend in BDT)
        $mScore = 1;
        if ($monetary >= 50000) {
            $mScore = 5;
        } elseif ($monetary >= 25000) {
            $mScore = 4;
        } elseif ($monetary >= 10000) {
            $mScore = 3;
        } elseif ($monetary >= 3000) {
            $mScore = 2;
        }

        $compositeScore = "{$rScore}{$fScore}{$mScore}";

        // Deterministic Segment rules
        $segment = 'LOST';
        if ($rScore >= 4 && $fScore >= 4 && $mScore >= 4) {
            $segment = 'CHAMPIONS';
        } elseif ($rScore >= 3 && $fScore >= 3) {
            $segment = 'LOYAL';
        } elseif ($rScore >= 4 && $fScore <= 2 && $mScore >= 3) {
            $segment = 'POTENTIAL_LOYAL';
        } elseif ($rScore >= 4 && $fScore <= 1) {
            $segment = 'NEW_CUSTOMERS';
        } elseif ($rScore >= 3 && $fScore <= 2) {
            $segment = 'PROMISING';
        } elseif ($rScore == 2 && $fScore >= 2) {
            $segment = 'NEEDS_ATTENTION';
        } elseif ($rScore <= 2 && $fScore >= 3 && $mScore >= 3) {
            $segment = 'AT_RISK';
        } elseif ($rScore == 1 && $fScore >= 4 && $mScore >= 4) {
            $segment = 'CANNOT_LOSE';
        } elseif ($rScore <= 2 && $fScore <= 2) {
            $segment = 'HIBERNATING';
        }

        // Update customer snapshot
        $customer->update([
            'rfm_recency_score' => $rScore,
            'rfm_frequency_score' => $fScore,
            'rfm_monetary_score' => $mScore,
            'rfm_composite_score' => $compositeScore,
            'rfm_segment' => $segment,
            'rfm_calculated_at' => Carbon::now(),
        ]);

        return [
            'customer_id' => $customer->id,
            'recency_days' => $recencyDays,
            'frequency_orders' => $frequency,
            'monetary_amount' => $monetary,
            'recency_score' => $rScore,
            'frequency_score' => $fScore,
            'monetary_score' => $mScore,
            'composite_score' => $compositeScore,
            'segment' => $segment,
            'calculated_at' => $customer->rfm_calculated_at->toIso8601String(),
        ];
    }

    /**
     * Compute Customer Lifetime Value (CLV/LTV) and historical profitability.
     */
    public function getCustomerLifetimeValue(int $companyId, int $customerId): array
    {
        $customer = Customer::where('company_id', $companyId)->findOrFail($customerId);

        $sales = Sale::where('company_id', $companyId)
            ->where('customer_id', $customerId)
            ->where('status', 'COMPLETED')
            ->get();

        $orderCount = $sales->count();
        $grossSales = (float) $sales->sum('grand_total');
        $taxTotal = (float) $sales->sum('tax_total');
        $discountTotal = (float) $sales->sum('discount_total');

        $returns = (float) SalesReturn::where('company_id', $companyId)
            ->where('customer_id', $customerId)
            ->where('status', 'COMPLETED')
            ->sum('refund_total');

        $netSales = max(0.0, round($grossSales - $taxTotal - $returns, 4));

        // Authoritative COGS from sale_items
        $saleIds = $sales->pluck('id')->toArray();
        $totalCogs = 0.0;
        if (!empty($saleIds)) {
            $totalCogs = (float) SaleItem::whereIn('sale_id', $saleIds)->sum('total_cost_snapshot');
        }

        $grossProfit = round($netSales - $totalCogs, 4);
        $grossMarginPct = $netSales > 0 ? round(($grossProfit / $netSales) * 100, 2) : 0.0;
        $aov = $orderCount > 0 ? round($grossSales / $orderCount, 2) : 0.0;

        $firstSale = $sales->sortBy('sale_date')->first();
        $lastSale = $sales->sortByDesc('sale_date')->first();

        $lifetimeDays = 0;
        if ($firstSale && $lastSale) {
            $fDate = Carbon::parse($firstSale->sale_date ?? $firstSale->created_at);
            $lDate = Carbon::parse($lastSale->sale_date ?? $lastSale->created_at);
            $lifetimeDays = max(1, $fDate->diffInDays($lDate));
        }

        return [
            'customer_id' => $customer->id,
            'total_orders' => $orderCount,
            'total_spent' => round($grossSales, 4),
            'gross_sales' => round($grossSales, 4),
            'discount_total' => round($discountTotal, 4),
            'returns_total' => round($returns, 4),
            'net_sales' => $netSales,
            'total_cogs' => round($totalCogs, 4),
            'gross_profit' => $grossProfit,
            'gross_margin_pct' => $grossMarginPct,
            'average_order_value' => $aov,
            'first_purchase_date' => $firstSale ? ($firstSale->sale_date ? Carbon::parse($firstSale->sale_date)->toDateString() : null) : null,
            'last_purchase_date' => $lastSale ? ($lastSale->sale_date ? Carbon::parse($lastSale->sale_date)->toDateString() : null) : null,
            'lifetime_days' => $lifetimeDays,
        ];
    }

    public function calculateCustomerLifetimeValue($customerOrCompanyId, $customerId = null): array
    {
        if ($customerOrCompanyId instanceof Customer) {
            return $this->getCustomerLifetimeValue($customerOrCompanyId->company_id, $customerOrCompanyId->id);
        }
        return $this->getCustomerLifetimeValue((int) $customerOrCompanyId, (int) $customerId);
    }

    /**
     * Compute retention, repeat purchase, and churn metrics across the company.
     */
    public function getRetentionMetrics(int $companyId, int $windowDays = 365): array
    {
        $windowStart = Carbon::now()->subDays($windowDays)->startOfDay();

        $customersWithSales = Sale::where('company_id', $companyId)
            ->where('status', 'COMPLETED')
            ->whereNotNull('customer_id')
            ->select('customer_id', DB::raw('count(id) as total_orders'), DB::raw('max(sale_date) as last_order_date'))
            ->groupBy('customer_id')
            ->get();

        $totalCustomers = $customersWithSales->count();
        $repeatCustomers = $customersWithSales->where('total_orders', '>=', 2)->count();
        $repeatRate = $totalCustomers > 0 ? round(($repeatCustomers / $totalCustomers) * 100, 2) : 0.0;

        $active60Days = 0;
        $atRisk61To180 = 0;
        $inactiveOver180 = 0;

        $today = Carbon::today();
        foreach ($customersWithSales as $row) {
            $lastDate = Carbon::parse($row->last_order_date);
            $days = $lastDate->diffInDays($today);

            if ($days <= 60) {
                $active60Days++;
            } elseif ($days <= 180) {
                $atRisk61To180++;
            } else {
                $inactiveOver180++;
            }
        }

        $churnRate = $totalCustomers > 0 ? round(($inactiveOver180 / $totalCustomers) * 100, 2) : 0.0;

        return [
            'total_buying_customers' => $totalCustomers,
            'repeat_customers' => $repeatCustomers,
            'repeat_purchase_rate_pct' => $repeatRate,
            'active_customers_60d' => $active60Days,
            'at_risk_customers_61_180d' => $atRisk61To180,
            'inactive_customers_over_180d' => $inactiveOver180,
            'churn_rate_pct' => $churnRate,
        ];
    }

    /**
     * Complete Customer 360 Diagnostic Aggregator.
     */
    public function getCustomer360(int $companyId, int $customerId): array
    {
        $customer = Customer::where('company_id', $companyId)
            ->with(['group', 'company'])
            ->findOrFail($customerId);

        // Subsystem metrics
        $credit = $this->creditService->getCreditSummary($companyId, $customerId);
        $aging = $this->agingService->getCustomerAging($companyId, $customerId);
        $clv = $this->getCustomerLifetimeValue($companyId, $customerId);
        $rfm = $this->calculateCustomerRfm($companyId, $customerId);

        // Balances
        $storeCreditBalance = $this->storeCreditService->getBalance($companyId, $customerId);
        $pointsBalance = (float) ($customer->points_balance ?? 0);

        // Top 5 purchased products
        $topProducts = SaleItem::join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.company_id', $companyId)
            ->where('sales.customer_id', $customerId)
            ->where('sales.status', 'COMPLETED')
            ->select(
                'sale_items.product_id',
                'sale_items.product_name_snapshot',
                'sale_items.sku_snapshot',
                DB::raw('sum(sale_items.quantity) as total_qty'),
                DB::raw('sum(sale_items.line_total) as total_spend')
            )
            ->groupBy('sale_items.product_id', 'sale_items.product_name_snapshot', 'sale_items.sku_snapshot')
            ->orderByDesc('total_qty')
            ->limit(5)
            ->get();

        // Preferred branch
        $preferredBranch = Sale::where('company_id', $companyId)
            ->where('customer_id', $customerId)
            ->where('status', 'COMPLETED')
            ->whereNotNull('branch_id')
            ->select('branch_id', DB::raw('count(id) as branch_order_count'))
            ->groupBy('branch_id')
            ->orderByDesc('branch_order_count')
            ->with('branch')
            ->first();

        // Timeline & Activities
        $timeline = $this->crmService->getCustomerTimeline($companyId, $customerId, 20);
        $openComplaints = $customer->complaints()->whereIn('status', ['OPEN', 'IN_PROGRESS'])->count();
        $openActivities = $customer->activities()->where('status', 'OPEN')->count();

        return [
            'customer' => [
                'id' => $customer->id,
                'customer_code' => $customer->customer_code,
                'name' => $customer->name,
                'company_name' => $customer->company_name,
                'contact_person' => $customer->contact_person,
                'customer_type' => $customer->customer_type ?? 'RETAIL',
                'group' => $customer->group ? ['id' => $customer->group->id, 'name' => $customer->group->name] : null,
                'mobile' => $customer->mobile,
                'alternate_mobile' => $customer->alternate_mobile,
                'email' => $customer->email,
                'address' => $customer->address,
                'billing_address' => $customer->billing_address,
                'shipping_address' => $customer->shipping_address,
                'city' => $customer->city,
                'country' => $customer->country,
                'bin_number' => $customer->bin_number,
                'tin_number' => $customer->tin_number,
                'status' => $customer->status,
                'notes' => $customer->notes,
                'created_at' => $customer->created_at?->toIso8601String(),
            ],
            'credit' => $credit,
            'ar_aging' => $aging,
            'clv' => $clv,
            'sales_summary' => $clv,
            'rfm' => $rfm,
            'balances' => [
                'points' => $pointsBalance,
                'store_credit' => $storeCreditBalance,
            ],
            'preferred_branch' => $preferredBranch ? [
                'id' => $preferredBranch->branch_id,
                'name' => $preferredBranch->branch?->name,
                'order_count' => $preferredBranch->branch_order_count,
            ] : null,
            'top_products' => $topProducts,
            'counts' => [
                'open_complaints' => $openComplaints,
                'open_activities' => $openActivities,
            ],
            'timeline' => $timeline,
        ];
    }

    public function getCustomer360View(int $companyId, int $customerId): array
    {
        return $this->getCustomer360($companyId, $customerId);
    }

    /**
     * Recalculate deterministic RFM metrics for all customers in the company.
     */
    public function recalculateCompanyRfm(int $companyId): array
    {
        $customers = Customer::where('company_id', $companyId)->get();
        $processed = 0;
        $segments = [];

        foreach ($customers as $customer) {
            $rfm = $this->calculateCustomerRfm($companyId, $customer->id);
            $processed++;
            $seg = $rfm['segment'] ?? 'LOST';
            $segments[$seg] = ($segments[$seg] ?? 0) + 1;
        }

        return [
            'processed' => $processed,
            'segments' => $segments,
            'completed_at' => Carbon::now()->toIso8601String(),
        ];
    }

    /**
     * Retrieve aggregated RFM segment distribution across the company.
     */
    public function getCompanyRfmDistribution(int $companyId): array
    {
        $customers = Customer::where('company_id', $companyId)
            ->whereNotNull('rfm_segment')
            ->get();

        $totalScored = $customers->count();
        $segments = [];
        $scores = [
            'r' => [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0],
            'f' => [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0],
            'm' => [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0],
        ];

        foreach ($customers as $c) {
            $seg = $c->rfm_segment ?? 'LOST';
            $segments[$seg] = ($segments[$seg] ?? 0) + 1;

            if ($c->rfm_recency_score && isset($scores['r'][$c->rfm_recency_score])) {
                $scores['r'][$c->rfm_recency_score]++;
            }
            if ($c->rfm_frequency_score && isset($scores['f'][$c->rfm_frequency_score])) {
                $scores['f'][$c->rfm_frequency_score]++;
            }
            if ($c->rfm_monetary_score && isset($scores['m'][$c->rfm_monetary_score])) {
                $scores['m'][$c->rfm_monetary_score]++;
            }
        }

        return [
            'total_scored_customers' => $totalScored,
            'segments' => $segments,
            'score_distribution' => $scores,
        ];
    }

    /**
     * Retrieve customers who have had no purchases for more than $daysThreshold days.
     */
    public function getAtRiskCustomers(int $companyId, int $daysThreshold = 60): array
    {
        $today = Carbon::today();
        $customers = Customer::where('company_id', $companyId)->get();

        $atRisk = [];
        foreach ($customers as $c) {
            $lastSale = Sale::where('company_id', $companyId)
                ->where('customer_id', $c->id)
                ->where('status', 'COMPLETED')
                ->orderBy('sale_date', 'desc')
                ->first();

            if (!$lastSale) {
                continue;
            }

            $lastDate = Carbon::parse($lastSale->sale_date ?? $lastSale->created_at);
            $daysInactive = $lastDate->diffInDays($today);

            if ($daysInactive >= $daysThreshold) {
                $clv = $this->getCustomerLifetimeValue($companyId, $c->id);

                $atRisk[] = [
                    'id' => $c->id,
                    'customer_code' => $c->customer_code,
                    'name' => $c->name,
                    'mobile' => $c->mobile,
                    'rfm_segment' => $c->rfm_segment,
                    'last_purchase_date' => $lastDate->toDateString(),
                    'days_inactive' => $daysInactive,
                    'total_spent' => $clv['total_spent'],
                    'total_orders' => $clv['total_orders'],
                    'credit_hold' => (bool) $c->credit_hold,
                ];
            }
        }

        usort($atRisk, fn($a, $b) => $b['days_inactive'] <=> $a['days_inactive']);

        return $atRisk;
    }
}
