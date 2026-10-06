<?php

namespace App\Services;

use App\Models\GoodsReceipt;
use App\Models\Purchase;
use App\Models\PurchaseOrder;

class ProcurementThreeWayMatchService
{
    /**
     * Perform comprehensive 3-way match audit across PO, Goods Receipt, and Invoice (Purchase).
     * Returns line-by-line inspection and exception alerts.
     * Generates 0 GL, 0 Stock, 0 AP side-effects.
     */
    public function auditThreeWayMatch(Purchase $purchase, float $priceTolerancePercent = 0.0): array
    {
        $po = $purchase->purchaseOrder;
        $gr = $purchase->goodsReceipt;

        $exceptions = [];
        $lineMatches = [];

        // 1. Check PO presence
        if (!$po) {
            $exceptions[] = [
                'type' => 'MISSING_PURCHASE_ORDER',
                'severity' => 'HIGH',
                'message' => 'Invoice has no associated Purchase Order.',
            ];
        }

        // 2. Check Goods Receipt presence
        if (!$gr) {
            $exceptions[] = [
                'type' => 'MISSING_GOODS_RECEIPT',
                'severity' => 'HIGH',
                'message' => 'Invoice has no associated Goods Receipt recorded.',
            ];
        } elseif ($gr->status !== 'POSTED') {
            $exceptions[] = [
                'type' => 'UNPOSTED_GOODS_RECEIPT',
                'severity' => 'MEDIUM',
                'message' => "Associated Goods Receipt #{$gr->receipt_number} is not POSTED (status: {$gr->status}).",
            ];
        }

        $poItems = $po ? $po->items->keyBy('product_variant_id') : collect();
        $grItems = $gr ? $gr->items->keyBy('product_variant_id') : collect();

        $allMatchedLines = true;

        foreach ($purchase->items as $item) {
            $variantId = $item->product_variant_id;
            $poItem = $poItems->get($variantId);
            $grItem = $grItems->get($variantId);

            $orderedQty = $poItem ? (float) $poItem->quantity : 0.0;
            $poUnitCost = $poItem ? (float) $poItem->unit_cost : 0.0;

            $receivedQty = $grItem ? (float) $grItem->received_quantity : 0.0;
            $invoicedQty = (float) $item->quantity;
            $invoicedUnitCost = (float) $item->unit_cost;

            $lineExceptions = [];

            // Quantity validation: Invoiced vs Received
            if ($invoicedQty > $receivedQty) {
                $diff = round($invoicedQty - $receivedQty, 4);
                $lineExceptions[] = "Invoiced quantity ({$invoicedQty}) exceeds received quantity ({$receivedQty}) by {$diff}.";
                $exceptions[] = [
                    'type' => 'OVER_INVOICED_QTY',
                    'severity' => 'HIGH',
                    'variant_id' => $variantId,
                    'message' => "Item #{$variantId}: Invoiced qty ({$invoicedQty}) > Received qty ({$receivedQty}).",
                ];
                $allMatchedLines = false;
            } elseif ($receivedQty < $orderedQty) {
                $lineExceptions[] = "Partial delivery: ordered {$orderedQty}, received {$receivedQty}.";
            }

            // Price validation: Invoiced vs PO
            $unitPriceDiff = abs($invoicedUnitCost - $poUnitCost);
            $priceVariancePct = $poUnitCost > 0 ? ($unitPriceDiff / $poUnitCost) * 100 : 0.0;

            if ($priceVariancePct > $priceTolerancePercent && $unitPriceDiff > 0.01) {
                $lineExceptions[] = "Price mismatch: PO price is {$poUnitCost}, invoiced price is {$invoicedUnitCost}.";
                $exceptions[] = [
                    'type' => 'PRICE_MISMATCH',
                    'severity' => 'MEDIUM',
                    'variant_id' => $variantId,
                    'message' => "Item #{$variantId}: Price variance of {$priceVariancePct}% (PO: {$poUnitCost}, Inv: {$invoicedUnitCost}).",
                ];
                $allMatchedLines = false;
            }

            $lineMatches[] = [
                'product_id' => $item->product_id,
                'product_variant_id' => $variantId,
                'ordered_quantity' => $orderedQty,
                'received_quantity' => $receivedQty,
                'invoiced_quantity' => $invoicedQty,
                'po_unit_cost' => $poUnitCost,
                'invoiced_unit_cost' => $invoicedUnitCost,
                'quantity_match' => $invoicedQty <= $receivedQty,
                'price_match' => $priceVariancePct <= $priceTolerancePercent,
                'line_exceptions' => $lineExceptions,
            ];
        }

        // Header Total validation
        if ($po && (float)$purchase->grand_total > (float)$po->grand_total + 0.01) {
            $diff = round((float)$purchase->grand_total - (float)$po->grand_total, 4);
            $exceptions[] = [
                'type' => 'OVER_INVOICED_TOTAL',
                'severity' => 'HIGH',
                'message' => "Invoice grand total ({$purchase->grand_total}) exceeds PO grand total ({$po->grand_total}) by {$diff} BDT.",
            ];
            $allMatchedLines = false;
        }

        // Overall determination
        $matchStatus = 'MATCHED';
        if (count($exceptions) > 0) {
            $hasHigh = collect($exceptions)->contains('severity', 'HIGH');
            $matchStatus = $hasHigh ? 'EXCEPTION' : 'WARNING';
        } elseif (!$allMatchedLines) {
            $matchStatus = 'PARTIAL_MATCH';
        }

        return [
            'purchase_id' => $purchase->id,
            'supplier_invoice_number' => $purchase->supplier_invoice_number,
            'invoice_date' => $purchase->invoice_date->toDateString(),
            'po_id' => $po ? $po->id : null,
            'po_number' => $po ? $po->po_number : null,
            'goods_receipt_id' => $gr ? $gr->id : null,
            'receipt_number' => $gr ? $gr->receipt_number : null,
            'match_status' => $matchStatus,
            'has_exceptions' => count($exceptions) > 0,
            'exceptions' => $exceptions,
            'line_matches' => $lineMatches,
        ];
    }

    /**
     * Audit all posted purchases within a company for matching exceptions.
     */
    public function getCompanyMatchExceptions(int $companyId, ?int $limit = 50): array
    {
        $purchases = Purchase::where('company_id', $companyId)
            ->with(['purchaseOrder.items', 'goodsReceipt.items', 'items.product', 'items.variant', 'supplier'])
            ->orderBy('id', 'desc')
            ->take($limit)
            ->get();

        $results = [];
        $exceptionCount = 0;

        foreach ($purchases as $p) {
            $audit = $this->auditThreeWayMatch($p);
            if ($audit['has_exceptions']) {
                $exceptionCount++;
            }
            $audit['supplier_name'] = $p->supplier ? $p->supplier->name : 'N/A';
            $results[] = $audit;
        }

        return [
            'total_audited' => count($results),
            'exceptions_found' => $exceptionCount,
            'audits' => $results,
        ];
    }
}
