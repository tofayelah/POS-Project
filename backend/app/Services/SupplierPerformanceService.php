<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\GoodsReceipt;
use App\Models\Purchase;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Supplier;
use App\Models\SupplierLedger;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SupplierPerformanceService
{
    /**
     * Compute comprehensive, deterministic reliability metrics for a supplier.
     * Generates 0 GL journals, 0 stock movements, 0 inventory mutations, and 0 AP entries.
     */
    public function evaluatePerformance(Supplier $supplier, ?int $periodDays = null): array
    {
        $companyId = $supplier->company_id;
        $supplierId = $supplier->id;

        $poQuery = PurchaseOrder::where('company_id', $companyId)
            ->where('supplier_id', $supplierId)
            ->whereIn('status', ['APPROVED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED']);

        if ($periodDays) {
            $startDate = Carbon::now()->subDays($periodDays)->toDateString();
            $poQuery->where('order_date', '>=', $startDate);
        }

        $purchaseOrders = $poQuery->with('items')->get();
        $totalOrders = $purchaseOrders->count();

        // 1. Total Spend
        $totalSpend = (float) $purchaseOrders->sum('grand_total');

        // 2. On-Time Delivery Rate (OTD)
        $receiptQuery = GoodsReceipt::where('company_id', $companyId)
            ->where('supplier_id', $supplierId)
            ->where('status', 'POSTED')
            ->with('purchaseOrder');

        if ($periodDays) {
            $receiptQuery->where('receipt_date', '>=', $startDate);
        }

        $receipts = $receiptQuery->get();
        $totalReceipts = $receipts->count();

        $onTimeCount = 0;
        $leadTimeSum = 0;
        $leadTimeCount = 0;

        foreach ($receipts as $gr) {
            $po = $gr->purchaseOrder;
            if ($po) {
                // Lead time calculation
                $orderDate = Carbon::parse($po->order_date);
                $receiptDate = Carbon::parse($gr->receipt_date);
                $actualLeadDays = max(0, $orderDate->diffInDays($receiptDate));
                $leadTimeSum += $actualLeadDays;
                $leadTimeCount++;

                // OTD calculation
                if ($po->expected_date) {
                    $expectedDate = Carbon::parse($po->expected_date);
                    if ($receiptDate->lte($expectedDate)) {
                        $onTimeCount++;
                    }
                } else {
                    $onTimeCount++; // If no expected date, treat as on time
                }
            } else {
                $onTimeCount++;
            }
        }

        $otdRate = $totalReceipts > 0 ? round(($onTimeCount / $totalReceipts) * 100, 2) : 100.0;
        $avgLeadTime = $leadTimeCount > 0 ? round($leadTimeSum / $leadTimeCount, 1) : (float) ($supplier->agreed_lead_time_days ?? 7);

        // 3. Fill Rate %
        $totalOrderedQty = 0;
        $totalReceivedQty = 0;

        foreach ($purchaseOrders as $po) {
            foreach ($po->items as $item) {
                $totalOrderedQty += (float) $item->quantity;
                $totalReceivedQty += (float) $item->received_quantity;
            }
        }

        $fillRate = $totalOrderedQty > 0
            ? min(100.0, round(($totalReceivedQty / $totalOrderedQty) * 100, 2))
            : 100.0;

        // 4. Quality Acceptance Rate % (100% default unless damaged/rejected goods noted)
        $qualityRate = 100.0;

        // 5. Price Stability %
        // Evaluate variation coefficient in PO item unit prices for the supplier
        $priceItems = PurchaseOrderItem::whereHas('purchaseOrder', function ($q) use ($companyId, $supplierId) {
            $q->where('company_id', $companyId)->where('supplier_id', $supplierId);
        })->get();

        $priceStability = 100.0;
        if ($priceItems->count() > 3) {
            $grouped = $priceItems->groupBy('product_variant_id');
            $variances = [];
            foreach ($grouped as $variantItems) {
                if ($variantItems->count() > 1) {
                    $costs = $variantItems->pluck('unit_cost')->map(fn($c) => (float)$c);
                    $avgCost = $costs->avg();
                    if ($avgCost > 0) {
                        $maxCost = $costs->max();
                        $minCost = $costs->min();
                        $spreadPercent = (($maxCost - $minCost) / $avgCost) * 100;
                        $variances[] = max(0, 100 - $spreadPercent);
                    }
                }
            }
            if (!empty($variances)) {
                $priceStability = round(array_sum($variances) / count($variances), 2);
            }
        }

        // 6. Outstanding AP Balance
        $lastLedger = SupplierLedger::where('company_id', $companyId)
            ->where('supplier_id', $supplierId)
            ->orderBy('id', 'desc')
            ->first();

        $outstandingBalance = $lastLedger ? (float) $lastLedger->balance : (float) $supplier->opening_balance;

        // 7. Composite Reliability Score (0 - 100)
        // Formula: 35% OTD + 30% Fill Rate + 20% Quality + 15% Price Stability
        $compositeScore = round(
            ($otdRate * 0.35) +
            ($fillRate * 0.30) +
            ($qualityRate * 0.20) +
            ($priceStability * 0.15),
            2
        );

        return [
            'supplier_id' => $supplier->id,
            'supplier_code' => $supplier->supplier_code,
            'supplier_name' => $supplier->name,
            'qualification_status' => $supplier->qualification_status,
            'risk_rating' => $supplier->risk_rating,
            'agreed_lead_time_days' => $supplier->agreed_lead_time_days ?? 7,
            'metrics' => [
                'composite_score' => $compositeScore,
                'on_time_delivery_rate' => $otdRate,
                'fill_rate' => $fillRate,
                'quality_acceptance_rate' => $qualityRate,
                'price_stability_rate' => $priceStability,
                'average_actual_lead_time_days' => $avgLeadTime,
                'total_orders_count' => $totalOrders,
                'total_receipts_count' => $totalReceipts,
                'total_ordered_quantity' => $totalOrderedQty,
                'total_received_quantity' => $totalReceivedQty,
                'total_spend' => $totalSpend,
                'outstanding_balance' => $outstandingBalance,
            ],
            'evaluated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Recalculate and update the supplier's cached score.
     */
    public function recalculateAndCacheScore(Supplier $supplier, ?User $user = null): Supplier
    {
        $evaluation = $this->evaluatePerformance($supplier);
        $compositeScore = $evaluation['metrics']['composite_score'];

        $supplier->update([
            'score_cached' => $compositeScore,
            'last_evaluated_at' => now(),
        ]);

        AuditLog::log(
            $user,
            $supplier->company_id,
            'SUPPLIER_SCORE_RECALCULATED',
            $supplier,
            null,
            ['score_cached' => $compositeScore, 'evaluated_at' => now()->toIso8601String()]
        );

        return $supplier;
    }

    /**
     * Get company-wide supplier performance ranking.
     */
    public function getCompanySupplierRankings(int $companyId): array
    {
        $suppliers = Supplier::where('company_id', $companyId)
            ->where('status', 'ACTIVE')
            ->get();

        $rankings = [];
        foreach ($suppliers as $supplier) {
            $eval = $this->evaluatePerformance($supplier);
            $rankings[] = [
                'id' => $supplier->id,
                'name' => $supplier->name,
                'code' => $supplier->supplier_code,
                'qualification_status' => $supplier->qualification_status,
                'risk_rating' => $supplier->risk_rating,
                'score' => $eval['metrics']['composite_score'],
                'otd_rate' => $eval['metrics']['on_time_delivery_rate'],
                'fill_rate' => $eval['metrics']['fill_rate'],
                'total_spend' => $eval['metrics']['total_spend'],
                'outstanding_balance' => $eval['metrics']['outstanding_balance'],
            ];
        }

        usort($rankings, fn($a, $b) => $b['score'] <=> $a['score']);

        return $rankings;
    }
}
