<?php

namespace App\Services;

use App\Http\Controllers\Api\V1\PurchaseOrderController;
use App\Models\AuditLog;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Rfq;
use App\Models\RfqInvitedSupplier;
use App\Models\RfqItem;
use App\Models\Supplier;
use App\Models\SupplierQuotation;
use App\Models\SupplierQuotationItem;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class ProcurementRfqService
{
    protected SupplierPerformanceService $performanceService;

    public function __construct(SupplierPerformanceService $performanceService)
    {
        $this->performanceService = $performanceService;
    }

    public static function generateRfqNumber(int $companyId): string
    {
        $year = date('Y');
        $prefix = "RFQ-{$year}-";
        $latest = Rfq::where('company_id', $companyId)
            ->where('rfq_number', 'LIKE', "{$prefix}%")
            ->orderBy('id', 'desc')
            ->first();

        $seq = 1;
        if ($latest && preg_match('/RFQ-\d{4}-(\d+)/', $latest->rfq_number, $m)) {
            $seq = ((int) $m[1]) + 1;
        }

        $candidate = $prefix . str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
        while (Rfq::where('company_id', $companyId)->where('rfq_number', $candidate)->exists()) {
            $seq++;
            $candidate = $prefix . str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
        }

        return $candidate;
    }

    public function createRfq(array $data, User $user, int $companyId): Rfq
    {
        return DB::transaction(function () use ($data, $user, $companyId) {
            $rfqNumber = $data['rfq_number'] ?? self::generateRfqNumber($companyId);

            $rfq = Rfq::create([
                'company_id' => $companyId,
                'purchase_requisition_id' => $data['purchase_requisition_id'] ?? null,
                'rfq_number' => $rfqNumber,
                'title' => $data['title'],
                'status' => 'DRAFT',
                'issue_date' => $data['issue_date'] ?? now()->toDateString(),
                'deadline_date' => $data['deadline_date'] ?? null,
                'target_delivery_date' => $data['target_delivery_date'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $user->id,
            ]);

            if (!empty($data['items']) && is_array($data['items'])) {
                foreach ($data['items'] as $item) {
                    RfqItem::create([
                        'rfq_id' => $rfq->id,
                        'product_id' => $item['product_id'],
                        'product_variant_id' => $item['product_variant_id'],
                        'requested_quantity' => $item['requested_quantity'],
                        'target_unit_price' => $item['target_unit_price'] ?? null,
                        'notes' => $item['notes'] ?? null,
                    ]);
                }
            }

            if (!empty($data['invited_supplier_ids']) && is_array($data['invited_supplier_ids'])) {
                foreach ($data['invited_supplier_ids'] as $supId) {
                    RfqInvitedSupplier::firstOrCreate([
                        'rfq_id' => $rfq->id,
                        'supplier_id' => $supId,
                    ], [
                        'status' => 'INVITED',
                        'invited_at' => now(),
                    ]);
                }
            }

            AuditLog::log(
                $user,
                $companyId,
                'RFQ_CREATED',
                $rfq,
                null,
                ['rfq_number' => $rfqNumber, 'title' => $rfq->title]
            );

            return $rfq->load(['items.product', 'items.variant', 'invitedSuppliers.supplier']);
        });
    }

    public function inviteSuppliers(Rfq $rfq, array $supplierIds, User $user): Rfq
    {
        foreach ($supplierIds as $supId) {
            RfqInvitedSupplier::firstOrCreate([
                'rfq_id' => $rfq->id,
                'supplier_id' => $supId,
            ], [
                'status' => 'INVITED',
                'invited_at' => now(),
            ]);
        }

        if ($rfq->status === 'DRAFT') {
            $rfq->update(['status' => 'SENT']);
        }

        AuditLog::log(
            $user,
            $rfq->company_id,
            'RFQ_SUPPLIERS_INVITED',
            $rfq,
            null,
            ['invited_count' => count($supplierIds), 'status' => $rfq->status]
        );

        return $rfq->load('invitedSuppliers.supplier');
    }

    public function recordQuotation(Rfq $rfq, int $supplierId, array $quoteData, User $user): SupplierQuotation
    {
        $supplier = Supplier::where('company_id', $rfq->company_id)->findOrFail($supplierId);

        return DB::transaction(function () use ($rfq, $supplier, $quoteData, $user) {
            $subtotal = 0;
            $discountTotal = (float) ($quoteData['discount_total'] ?? 0);
            $taxTotal = (float) ($quoteData['tax_total'] ?? 0);

            $quotation = SupplierQuotation::create([
                'company_id' => $rfq->company_id,
                'rfq_id' => $rfq->id,
                'supplier_id' => $supplier->id,
                'quotation_number' => $quoteData['quotation_number'] ?? ('QT-' . uniqid()),
                'quotation_date' => $quoteData['quotation_date'] ?? now()->toDateString(),
                'validity_date' => $quoteData['validity_date'] ?? now()->addDays(30)->toDateString(),
                'lead_time_days' => (int) ($quoteData['lead_time_days'] ?? ($supplier->agreed_lead_time_days ?? 7)),
                'payment_terms' => $quoteData['payment_terms'] ?? $supplier->payment_terms,
                'currency' => 'BDT',
                'subtotal' => 0,
                'discount_total' => $discountTotal,
                'tax_total' => $taxTotal,
                'grand_total' => 0,
                'status' => 'SUBMITTED',
                'is_awarded' => false,
                'created_by' => $user->id,
            ]);

            if (!empty($quoteData['items']) && is_array($quoteData['items'])) {
                foreach ($quoteData['items'] as $item) {
                    $qty = (float) $item['quantity'];
                    $price = (float) $item['unit_price'];
                    $disc = (float) ($item['discount'] ?? 0);
                    $tax = (float) ($item['tax'] ?? 0);
                    $lineTotal = round(($qty * $price) - $disc + $tax, 4);
                    $subtotal += $lineTotal;

                    SupplierQuotationItem::create([
                        'supplier_quotation_id' => $quotation->id,
                        'rfq_item_id' => $item['rfq_item_id'] ?? null,
                        'product_id' => $item['product_id'],
                        'product_variant_id' => $item['product_variant_id'],
                        'quantity' => $qty,
                        'unit_price' => $price,
                        'discount' => $disc,
                        'tax' => $tax,
                        'line_total' => $lineTotal,
                        'lead_time_days' => $item['lead_time_days'] ?? null,
                        'notes' => $item['notes'] ?? null,
                    ]);
                }
            }

            $grandTotal = round($subtotal - $discountTotal + $taxTotal, 4);
            $quotation->update([
                'subtotal' => $subtotal,
                'grand_total' => $grandTotal,
            ]);

            // Update RFQ status to UNDER_EVALUATION
            if (in_array($rfq->status, ['DRAFT', 'SENT'])) {
                $rfq->update(['status' => 'UNDER_EVALUATION']);
            }

            // Update invited supplier record status if exists
            RfqInvitedSupplier::where('rfq_id', $rfq->id)
                ->where('supplier_id', $supplier->id)
                ->update(['status' => 'RESPONDED']);

            AuditLog::log(
                $user,
                $rfq->company_id,
                'SUPPLIER_QUOTATION_RECORDED',
                $quotation,
                null,
                ['rfq_id' => $rfq->id, 'supplier_id' => $supplier->id, 'grand_total' => $grandTotal]
            );

            return $quotation->load(['items.product', 'items.variant', 'supplier']);
        });
    }

    /**
     * Side-by-side quotation comparison with deterministic advisory recommendation.
     */
    public function compareQuotations(Rfq $rfq): array
    {
        $quotations = $rfq->quotations()->with(['supplier', 'items.product', 'items.variant'])->get();

        if ($quotations->isEmpty()) {
            return [
                'rfq_id' => $rfq->id,
                'rfq_number' => $rfq->rfq_number,
                'quotations_count' => 0,
                'comparison' => [],
                'recommended_quotation_id' => null,
                'advisory_notes' => 'No quotations submitted yet.',
            ];
        }

        $minTotal = (float) $quotations->min('grand_total');
        $minLeadTime = (int) $quotations->min('lead_time_days');

        $comparison = [];
        foreach ($quotations as $quote) {
            $supplier = $quote->supplier;
            $supplierPerf = $this->performanceService->evaluatePerformance($supplier);
            $compositeScore = $supplierPerf['metrics']['composite_score'];

            $grandTotal = (float) $quote->grand_total;
            $leadDays = (int) $quote->lead_time_days;

            // Normalize price score (lowest price = 100, others scaled down)
            $priceScore = $grandTotal > 0 ? max(0, min(100, ($minTotal / $grandTotal) * 100)) : 100;

            // Normalize lead time score (fastest = 100)
            $leadScore = $leadDays > 0 ? max(0, min(100, ($minLeadTime / $leadDays) * 100)) : 100;

            // Advisory composite score: 50% Price + 30% Supplier Reliability + 20% Lead Time
            $advisoryRankScore = round(($priceScore * 0.50) + ($compositeScore * 0.30) + ($leadScore * 0.20), 2);

            $comparison[] = [
                'quotation_id' => $quote->id,
                'quotation_number' => $quote->quotation_number,
                'supplier_id' => $supplier->id,
                'supplier_name' => $supplier->name,
                'supplier_code' => $supplier->supplier_code,
                'supplier_score' => $compositeScore,
                'qualification_status' => $supplier->qualification_status,
                'grand_total' => $grandTotal,
                'lead_time_days' => $leadDays,
                'payment_terms' => $quote->payment_terms,
                'status' => $quote->status,
                'is_awarded' => (bool) $quote->is_awarded,
                'price_score' => round($priceScore, 1),
                'lead_time_score' => round($leadScore, 1),
                'advisory_rank_score' => $advisoryRankScore,
                'items' => $quote->items->map(fn($it) => [
                    'product_name' => $it->product ? $it->product->name : 'N/A',
                    'variant_name' => $it->variant ? $it->variant->name : 'N/A',
                    'quantity' => (float) $it->quantity,
                    'unit_price' => (float) $it->unit_price,
                    'line_total' => (float) $it->line_total,
                ]),
            ];
        }

        usort($comparison, fn($a, $b) => $b['advisory_rank_score'] <=> $a['advisory_rank_score']);
        $bestQuote = $comparison[0];

        return [
            'rfq_id' => $rfq->id,
            'rfq_number' => $rfq->rfq_number,
            'quotations_count' => count($comparison),
            'comparison' => $comparison,
            'recommended_quotation_id' => $bestQuote['quotation_id'],
            'advisory_notes' => "Quotation #{$bestQuote['quotation_number']} by {$bestQuote['supplier_name']} is recommended based on lowest cost (৳{$bestQuote['grand_total']}), reliability score ({$bestQuote['supplier_score']}/100), and lead time ({$bestQuote['lead_time_days']} days).",
        ];
    }

    /**
     * Award an RFQ quotation, reject other quotations, and optionally generate a draft Purchase Order.
     */
    public function awardQuotation(
        Rfq $rfq,
        SupplierQuotation $quotation,
        User $user,
        ?string $notes = null,
        bool $createPo = true,
        ?int $warehouseId = null
    ): array {
        if ($rfq->status === 'AWARDED') {
            throw new InvalidArgumentException("RFQ is already awarded.");
        }

        return DB::transaction(function () use ($rfq, $quotation, $user, $notes, $createPo, $warehouseId) {
            $companyId = $rfq->company_id;

            // 1. Mark awarded quotation
            $quotation->update([
                'is_awarded' => true,
                'status' => 'ACCEPTED',
                'evaluation_notes' => $notes,
                'awarded_by' => $user->id,
                'awarded_at' => now(),
            ]);

            // 2. Reject other quotations for this RFQ
            SupplierQuotation::where('rfq_id', $rfq->id)
                ->where('id', '!=', $quotation->id)
                ->update(['status' => 'REJECTED']);

            // 3. Mark RFQ awarded
            $rfq->update([
                'status' => 'AWARDED',
                'awarded_supplier_id' => $quotation->supplier_id,
                'awarded_quotation_id' => $quotation->id,
                'awarded_by' => $user->id,
                'awarded_at' => now(),
            ]);

            $createdPo = null;
            if ($createPo) {
                // Find target warehouse
                $whId = $warehouseId;
                if (!$whId && $rfq->purchase_requisition_id) {
                    $whId = $rfq->requisition ? $rfq->requisition->warehouse_id : null;
                }
                if (!$whId) {
                    $whId = Warehouse::where('company_id', $companyId)->value('id');
                }

                $poNumber = PurchaseOrderController::generateUniquePoNumber($companyId);
                $createdPo = PurchaseOrder::create([
                    'company_id' => $companyId,
                    'supplier_id' => $quotation->supplier_id,
                    'warehouse_id' => $whId,
                    'rfq_id' => $rfq->id,
                    'supplier_quotation_id' => $quotation->id,
                    'purchase_requisition_id' => $rfq->purchase_requisition_id,
                    'po_number' => $poNumber,
                    'order_date' => now()->toDateString(),
                    'expected_date' => now()->addDays($quotation->lead_time_days ?? 7)->toDateString(),
                    'status' => 'DRAFT',
                    'subtotal' => $quotation->subtotal,
                    'discount_total' => $quotation->discount_total,
                    'tax_total' => $quotation->tax_total,
                    'shipping_cost' => 0,
                    'other_cost' => 0,
                    'grand_total' => $quotation->grand_total,
                    'notes' => "Awarded from RFQ #{$rfq->rfq_number} (Quotation #{$quotation->quotation_number})",
                    'created_by' => $user->id,
                ]);

                foreach ($quotation->items as $item) {
                    PurchaseOrderItem::create([
                        'purchase_order_id' => $createdPo->id,
                        'product_id' => $item->product_id,
                        'product_variant_id' => $item->product_variant_id,
                        'quantity' => $item->quantity,
                        'unit_cost' => $item->unit_price,
                        'discount' => $item->discount,
                        'tax' => $item->tax,
                        'line_total' => $item->line_total,
                        'pending_quantity' => $item->quantity,
                        'received_quantity' => 0,
                    ]);
                }
            }

            AuditLog::log(
                $user,
                $companyId,
                'RFQ_QUOTATION_AWARDED',
                $rfq,
                ['status' => 'UNDER_EVALUATION'],
                [
                    'status' => 'AWARDED',
                    'quotation_id' => $quotation->id,
                    'supplier_id' => $quotation->supplier_id,
                    'po_id' => $createdPo ? $createdPo->id : null,
                ]
            );

            return [
                'rfq' => $rfq->fresh(['awardedSupplier', 'awardedQuotation']),
                'quotation' => $quotation->fresh(),
                'purchase_order' => $createdPo,
            ];
        });
    }
}
