<?php

namespace App\Services;

use App\Models\ProductVariant;
use App\Models\Purchase;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Supplier;
use App\Models\SupplierPriceAgreement;
use App\Models\SupplierQuotationItem;
use Carbon\Carbon;

class ProcurementPriceService
{
    /**
     * Determine unit price for a given supplier, product variant, and quantity using price priority resolution.
     * Priority:
     * 1. Active SupplierPriceAgreement (with quantity >= MOQ)
     * 2. Latest Awarded Supplier Quotation
     * 3. Last Purchase Order Item price
     * 4. Product Variant purchase_cost / cost_price fallback
     */
    public function resolveUnitPrice(
        int $companyId,
        int $supplierId,
        int $variantId,
        float $quantity = 1.0
    ): array {
        $today = Carbon::now()->toDateString();

        // 1. Check active SupplierPriceAgreement
        $agreement = SupplierPriceAgreement::where('company_id', $companyId)
            ->where('supplier_id', $supplierId)
            ->where('product_variant_id', $variantId)
            ->where('status', 'ACTIVE')
            ->where('effective_date', '<=', $today)
            ->where(function ($q) use ($today) {
                $q->whereNull('expiry_date')
                  ->orWhere('expiry_date', '>=', $today);
            })
            ->where('min_order_quantity', '<=', $quantity)
            ->orderBy('agreed_unit_price', 'asc')
            ->first();

        if ($agreement) {
            return [
                'unit_price' => (float) $agreement->agreed_unit_price,
                'source' => 'PRICE_AGREEMENT',
                'source_id' => $agreement->id,
                'description' => "Active Price Agreement #{$agreement->id}",
            ];
        }

        // 2. Check latest Awarded Supplier Quotation
        $quotationItem = SupplierQuotationItem::whereHas('quotation', function ($q) use ($companyId, $supplierId) {
            $q->where('company_id', $companyId)
              ->where('supplier_id', $supplierId)
              ->where('is_awarded', true);
        })
        ->where('product_variant_id', $variantId)
        ->orderBy('id', 'desc')
        ->first();

        if ($quotationItem) {
            return [
                'unit_price' => (float) $quotationItem->unit_price,
                'source' => 'AWARDED_QUOTATION',
                'source_id' => $quotationItem->supplier_quotation_id,
                'description' => "Awarded Quotation #{$quotationItem->supplier_quotation_id}",
            ];
        }

        // 3. Check last Purchase Order item price
        $lastPoItem = PurchaseOrderItem::whereHas('purchaseOrder', function ($q) use ($companyId, $supplierId) {
            $q->where('company_id', $companyId)
              ->where('supplier_id', $supplierId)
              ->whereIn('status', ['APPROVED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED']);
        })
        ->where('product_variant_id', $variantId)
        ->orderBy('id', 'desc')
        ->first();

        if ($lastPoItem) {
            return [
                'unit_price' => (float) $lastPoItem->unit_cost,
                'source' => 'LAST_PURCHASE_ORDER',
                'source_id' => $lastPoItem->purchase_order_id,
                'description' => "Previous Purchase Order #{$lastPoItem->purchase_order_id}",
            ];
        }

        // 4. Default Variant purchase_cost or cost_price
        $variant = ProductVariant::find($variantId);
        $defaultCost = 0.0;
        if ($variant) {
            $defaultCost = (float) ($variant->purchase_cost ?? $variant->cost_price ?? 0);
        }

        return [
            'unit_price' => $defaultCost,
            'source' => 'VARIANT_DEFAULT',
            'source_id' => $variantId,
            'description' => 'Product variant default cost',
        ];
    }

    /**
     * Compute Purchase Price Variance (PPV) for an invoice (Purchase) against its Purchase Order.
     * Generates 0 GL, 0 Stock, 0 AP side-effects.
     */
    public function computePurchasePpv(Purchase $purchase): array
    {
        $po = $purchase->purchaseOrder;
        if (!$po) {
            return [
                'purchase_id' => $purchase->id,
                'po_id' => null,
                'has_po' => false,
                'total_ppv' => 0.0,
                'status' => 'NO_PO_ATTACHED',
                'lines' => [],
            ];
        }

        $poItems = $po->items->keyBy('product_variant_id');
        $lines = [];
        $totalPpv = 0.0;

        foreach ($purchase->items as $item) {
            $poItem = $poItems->get($item->product_variant_id);
            $poUnitCost = $poItem ? (float) $poItem->unit_cost : (float) $item->unit_cost;
            $invoicedUnitCost = (float) $item->unit_cost;
            $qty = (float) $item->quantity;

            $unitVariance = round($invoicedUnitCost - $poUnitCost, 4);
            $lineVariance = round($unitVariance * $qty, 4);
            $totalPpv += $lineVariance;

            $percent = $poUnitCost > 0 ? round(($unitVariance / $poUnitCost) * 100, 2) : 0.0;

            $varianceStatus = 'EXACT';
            if ($unitVariance > 0.0001) {
                $varianceStatus = 'UNFAVORABLE'; // Paid more than PO
            } elseif ($unitVariance < -0.0001) {
                $varianceStatus = 'FAVORABLE'; // Paid less than PO
            }

            $lines[] = [
                'product_id' => $item->product_id,
                'product_variant_id' => $item->product_variant_id,
                'quantity' => $qty,
                'po_unit_cost' => $poUnitCost,
                'invoiced_unit_cost' => $invoicedUnitCost,
                'unit_variance' => $unitVariance,
                'line_variance' => $lineVariance,
                'variance_percent' => $percent,
                'status' => $varianceStatus,
            ];
        }

        $overallStatus = 'BALANCED';
        if ($totalPpv > 0.01) {
            $overallStatus = 'UNFAVORABLE';
        } elseif ($totalPpv < -0.01) {
            $overallStatus = 'FAVORABLE';
        }

        return [
            'purchase_id' => $purchase->id,
            'supplier_invoice_number' => $purchase->supplier_invoice_number,
            'po_id' => $po->id,
            'po_number' => $po->po_number,
            'has_po' => true,
            'total_ppv' => round($totalPpv, 4),
            'status' => $overallStatus,
            'lines' => $lines,
        ];
    }

    /**
     * Generate company-wide Purchase Price Variance report across recent purchases.
     */
    public function getCompanyPpvSummary(int $companyId, ?int $periodDays = 90): array
    {
        $startDate = Carbon::now()->subDays($periodDays)->toDateString();

        $purchases = Purchase::where('company_id', $companyId)
            ->whereNotNull('purchase_order_id')
            ->where('invoice_date', '>=', $startDate)
            ->with(['purchaseOrder.items', 'items.product', 'items.variant', 'supplier'])
            ->get();

        $totalFavorable = 0.0;
        $totalUnfavorable = 0.0;
        $details = [];

        foreach ($purchases as $p) {
            $ppv = $this->computePurchasePpv($p);
            if ($ppv['total_ppv'] > 0) {
                $totalUnfavorable += $ppv['total_ppv'];
            } else {
                $totalFavorable += abs($ppv['total_ppv']);
            }

            $details[] = [
                'purchase_id' => $p->id,
                'invoice_number' => $p->supplier_invoice_number,
                'invoice_date' => $p->invoice_date->toDateString(),
                'po_number' => $ppv['po_number'],
                'supplier_name' => $p->supplier ? $p->supplier->name : 'N/A',
                'net_ppv' => $ppv['total_ppv'],
                'status' => $ppv['status'],
                'line_count' => count($ppv['lines']),
            ];
        }

        $netPpv = round($totalUnfavorable - $totalFavorable, 4);

        return [
            'period_days' => $periodDays,
            'purchases_analyzed' => count($details),
            'total_unfavorable_ppv' => round($totalUnfavorable, 4),
            'total_favorable_ppv' => round($totalFavorable, 4),
            'net_ppv' => $netPpv,
            'summary_status' => $netPpv > 0 ? 'UNFAVORABLE' : ($netPpv < 0 ? 'FAVORABLE' : 'NEUTRAL'),
            'records' => $details,
        ];
    }
}
