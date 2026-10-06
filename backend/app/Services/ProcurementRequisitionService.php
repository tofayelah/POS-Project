<?php

namespace App\Services;

use App\Http\Controllers\Api\V1\PurchaseOrderController;
use App\Models\AuditLog;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\PurchaseRequisition;
use App\Models\PurchaseRequisitionItem;
use App\Models\Rfq;
use App\Models\RfqItem;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class ProcurementRequisitionService
{
    protected ProcurementPriceService $priceService;

    public function __construct(ProcurementPriceService $priceService)
    {
        $this->priceService = $priceService;
    }

    public static function generateRequisitionNumber(int $companyId): string
    {
        $year = date('Y');
        $prefix = "REQ-{$year}-";
        $latest = PurchaseRequisition::where('company_id', $companyId)
            ->where('requisition_no', 'LIKE', "{$prefix}%")
            ->orderBy('id', 'desc')
            ->first();

        $seq = 1;
        if ($latest && preg_match('/REQ-\d{4}-(\d+)/', $latest->requisition_no, $m)) {
            $seq = ((int) $m[1]) + 1;
        }

        $candidate = $prefix . str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
        while (PurchaseRequisition::where('company_id', $companyId)->where('requisition_no', $candidate)->exists()) {
            $seq++;
            $candidate = $prefix . str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
        }

        return $candidate;
    }

    public function createRequisition(array $data, User $user, int $companyId): PurchaseRequisition
    {
        return DB::transaction(function () use ($data, $user, $companyId) {
            $reqNumber = $data['requisition_no'] ?? self::generateRequisitionNumber($companyId);

            $requisition = PurchaseRequisition::create([
                'company_id' => $companyId,
                'business_unit_id' => $data['business_unit_id'] ?? null,
                'branch_id' => $data['branch_id'] ?? null,
                'warehouse_id' => $data['warehouse_id'],
                'requisition_no' => $reqNumber,
                'title' => $data['title'] ?? 'Procurement Requisition',
                'status' => 'DRAFT',
                'priority' => strtoupper($data['priority'] ?? 'MEDIUM'),
                'required_date' => $data['required_date'] ?? null,
                'notes' => $data['notes'] ?? null,
                'requested_by' => $user->id,
                'created_by' => $user->id,
                'estimated_total_cost' => 0,
            ]);

            $totalEstimated = 0;
            if (!empty($data['items']) && is_array($data['items'])) {
                foreach ($data['items'] as $item) {
                    $qty = (float) $item['requested_quantity'];
                    $unitCost = (float) ($item['estimated_unit_cost'] ?? 0);
                    $lineTotal = round($qty * $unitCost, 4);
                    $totalEstimated += $lineTotal;

                    PurchaseRequisitionItem::create([
                        'purchase_requisition_id' => $requisition->id,
                        'product_id' => $item['product_id'],
                        'product_variant_id' => $item['product_variant_id'],
                        'preferred_supplier_id' => $item['preferred_supplier_id'] ?? null,
                        'requested_quantity' => $qty,
                        'estimated_unit_cost' => $unitCost,
                        'estimated_total_cost' => $lineTotal,
                        'converted_quantity' => 0,
                        'notes' => $item['notes'] ?? null,
                    ]);
                }
            }

            $requisition->update(['estimated_total_cost' => $totalEstimated]);

            AuditLog::log(
                $user,
                $companyId,
                'PURCHASE_REQUISITION_CREATED',
                $requisition,
                null,
                ['requisition_no' => $reqNumber, 'estimated_total' => $totalEstimated]
            );

            return $requisition->load(['items.product', 'items.variant', 'warehouse', 'requester']);
        });
    }

    public function submitRequisition(PurchaseRequisition $requisition, User $user): PurchaseRequisition
    {
        if ($requisition->status !== 'DRAFT') {
            throw new InvalidArgumentException("Requisition must be DRAFT to submit. Current status: {$requisition->status}");
        }

        $requisition->update(['status' => 'SUBMITTED']);

        AuditLog::log(
            $user,
            $requisition->company_id,
            'PURCHASE_REQUISITION_SUBMITTED',
            $requisition,
            ['status' => 'DRAFT'],
            ['status' => 'SUBMITTED']
        );

        return $requisition;
    }

    public function reviewRequisition(PurchaseRequisition $requisition, User $user, ?string $notes = null): PurchaseRequisition
    {
        if ($requisition->status !== 'SUBMITTED') {
            throw new InvalidArgumentException("Requisition must be SUBMITTED to review. Current status: {$requisition->status}");
        }

        $requisition->update([
            'status' => 'UNDER_REVIEW',
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
            'notes' => $notes ? ($requisition->notes . "\nReview note: " . $notes) : $requisition->notes,
        ]);

        AuditLog::log(
            $user,
            $requisition->company_id,
            'PURCHASE_REQUISITION_REVIEWED',
            $requisition,
            ['status' => 'SUBMITTED'],
            ['status' => 'UNDER_REVIEW', 'reviewed_by' => $user->id]
        );

        return $requisition;
    }

    public function approveRequisition(
        PurchaseRequisition $requisition,
        User $user,
        bool $enforceSegregation = false
    ): PurchaseRequisition {
        if (!in_array($requisition->status, ['SUBMITTED', 'UNDER_REVIEW'], true)) {
            throw new InvalidArgumentException("Requisition must be SUBMITTED or UNDER_REVIEW to approve. Current: {$requisition->status}");
        }

        // Segregation of duties check
        if ($enforceSegregation && $requisition->requested_by === $user->id) {
            $isSuper = $user->hasRole('Super Admin') || $user->hasRole('Admin');
            if (!$isSuper) {
                throw new InvalidArgumentException("Segregation of duties violation: Requester cannot approve their own requisition.");
            }
        }

        $oldStatus = $requisition->status;
        $requisition->update([
            'status' => 'APPROVED',
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        AuditLog::log(
            $user,
            $requisition->company_id,
            'PURCHASE_REQUISITION_APPROVED',
            $requisition,
            ['status' => $oldStatus],
            ['status' => 'APPROVED', 'approved_by' => $user->id]
        );

        return $requisition;
    }

    public function rejectRequisition(PurchaseRequisition $requisition, User $user, string $reason): PurchaseRequisition
    {
        if (!in_array($requisition->status, ['SUBMITTED', 'UNDER_REVIEW'], true)) {
            throw new InvalidArgumentException("Requisition must be SUBMITTED or UNDER_REVIEW to reject. Current: {$requisition->status}");
        }

        if (empty(trim($reason))) {
            throw new InvalidArgumentException("A rejection reason is required.");
        }

        $oldStatus = $requisition->status;
        $requisition->update([
            'status' => 'REJECTED',
            'rejected_by' => $user->id,
            'rejected_at' => now(),
            'rejection_reason' => $reason,
        ]);

        AuditLog::log(
            $user,
            $requisition->company_id,
            'PURCHASE_REQUISITION_REJECTED',
            $requisition,
            ['status' => $oldStatus],
            ['status' => 'REJECTED', 'reason' => $reason]
        );

        return $requisition;
    }

    public function cancelRequisition(PurchaseRequisition $requisition, User $user, ?string $reason = null): PurchaseRequisition
    {
        if (in_array($requisition->status, ['CONVERTED', 'CANCELLED'], true)) {
            throw new InvalidArgumentException("Cannot cancel a requisition that is already {$requisition->status}.");
        }

        $oldStatus = $requisition->status;
        $requisition->update([
            'status' => 'CANCELLED',
            'notes' => $reason ? ($requisition->notes . "\nCancellation: " . $reason) : $requisition->notes,
        ]);

        AuditLog::log(
            $user,
            $requisition->company_id,
            'PURCHASE_REQUISITION_CANCELLED',
            $requisition,
            ['status' => $oldStatus],
            ['status' => 'CANCELLED', 'reason' => $reason]
        );

        return $requisition;
    }

    /**
     * Convert an approved Requisition into a standard draft Purchase Order.
     */
    public function convertToPo(
        PurchaseRequisition $requisition,
        int $supplierId,
        ?int $warehouseId,
        User $user
    ): PurchaseOrder {
        if ($requisition->status !== 'APPROVED') {
            throw new InvalidArgumentException("Requisition must be APPROVED to convert to PO. Current status: {$requisition->status}");
        }

        $supplier = Supplier::where('company_id', $requisition->company_id)->findOrFail($supplierId);
        if ($supplier->status !== 'ACTIVE' || in_array($supplier->qualification_status, ['BLOCKED', 'REJECTED'])) {
            throw new InvalidArgumentException("Supplier '{$supplier->name}' is inactive or disqualified.");
        }

        $whId = $warehouseId ?? $requisition->warehouse_id;

        return DB::transaction(function () use ($requisition, $supplier, $whId, $user) {
            $companyId = $requisition->company_id;
            $poNumber = PurchaseOrderController::generateUniquePoNumber($companyId);

            $po = PurchaseOrder::create([
                'company_id' => $companyId,
                'business_unit_id' => $requisition->business_unit_id,
                'branch_id' => $requisition->branch_id,
                'warehouse_id' => $whId,
                'supplier_id' => $supplier->id,
                'purchase_requisition_id' => $requisition->id,
                'po_number' => $poNumber,
                'order_date' => now()->toDateString(),
                'expected_date' => $requisition->required_date ? $requisition->required_date->toDateString() : now()->addDays(7)->toDateString(),
                'status' => 'DRAFT',
                'shipping_cost' => 0,
                'other_cost' => 0,
                'discount_total' => 0,
                'tax_total' => 0,
                'notes' => "Generated from Requisition #{$requisition->requisition_no}",
                'created_by' => $user->id,
                'subtotal' => 0,
                'grand_total' => 0,
            ]);

            $subtotal = 0;
            foreach ($requisition->items as $item) {
                $qty = (float) $item->requested_quantity;

                // Price priority lookup
                $priceInfo = $this->priceService->resolveUnitPrice($companyId, $supplier->id, $item->product_variant_id, $qty);
                $unitCost = $priceInfo['unit_price'] > 0 ? $priceInfo['unit_price'] : (float) $item->estimated_unit_cost;
                $lineTotal = round($qty * $unitCost, 4);
                $subtotal += $lineTotal;

                PurchaseOrderItem::create([
                    'purchase_order_id' => $po->id,
                    'product_id' => $item->product_id,
                    'product_variant_id' => $item->product_variant_id,
                    'quantity' => $qty,
                    'unit_cost' => $unitCost,
                    'discount' => 0,
                    'tax' => 0,
                    'line_total' => $lineTotal,
                    'pending_quantity' => $qty,
                    'received_quantity' => 0,
                    'notes' => "Requisition item #{$item->id}",
                ]);

                $item->update(['converted_quantity' => $qty]);
            }

            $po->update([
                'subtotal' => $subtotal,
                'grand_total' => $subtotal,
            ]);

            $requisition->update([
                'status' => 'CONVERTED',
                'converted_to_type' => 'PO',
                'converted_to_id' => $po->id,
                'converted_at' => now(),
            ]);

            AuditLog::log(
                $user,
                $companyId,
                'PURCHASE_REQUISITION_CONVERTED_PO',
                $requisition,
                ['status' => 'APPROVED'],
                ['converted_to_type' => 'PO', 'po_id' => $po->id, 'po_number' => $po->po_number]
            );

            return $po->load(['items.product', 'items.variant', 'supplier', 'warehouse']);
        });
    }

    /**
     * Convert an approved Requisition into a Request for Quotation (RFQ).
     */
    public function convertToRfq(PurchaseRequisition $requisition, array $rfqData, User $user): Rfq
    {
        if ($requisition->status !== 'APPROVED') {
            throw new InvalidArgumentException("Requisition must be APPROVED to convert to RFQ. Current: {$requisition->status}");
        }

        return DB::transaction(function () use ($requisition, $rfqData, $user) {
            $companyId = $requisition->company_id;
            $rfqNumber = ProcurementRfqService::generateRfqNumber($companyId);

            $rfq = Rfq::create([
                'company_id' => $companyId,
                'purchase_requisition_id' => $requisition->id,
                'rfq_number' => $rfqNumber,
                'title' => $rfqData['title'] ?? ("RFQ for Requisition " . $requisition->requisition_no),
                'status' => 'DRAFT',
                'issue_date' => now()->toDateString(),
                'deadline_date' => $rfqData['deadline_date'] ?? now()->addDays(7)->toDateString(),
                'target_delivery_date' => $requisition->required_date ? $requisition->required_date->toDateString() : null,
                'notes' => $rfqData['notes'] ?? $requisition->notes,
                'created_by' => $user->id,
            ]);

            foreach ($requisition->items as $item) {
                RfqItem::create([
                    'rfq_id' => $rfq->id,
                    'product_id' => $item->product_id,
                    'product_variant_id' => $item->product_variant_id,
                    'requested_quantity' => $item->requested_quantity,
                    'target_unit_price' => $item->estimated_unit_cost > 0 ? $item->estimated_unit_cost : null,
                    'notes' => $item->notes,
                ]);

                $item->update(['converted_quantity' => $item->requested_quantity]);
            }

            $requisition->update([
                'status' => 'CONVERTED',
                'converted_to_type' => 'RFQ',
                'converted_to_id' => $rfq->id,
                'converted_at' => now(),
            ]);

            AuditLog::log(
                $user,
                $companyId,
                'PURCHASE_REQUISITION_CONVERTED_RFQ',
                $requisition,
                ['status' => 'APPROVED'],
                ['converted_to_type' => 'RFQ', 'rfq_id' => $rfq->id, 'rfq_number' => $rfq->rfq_number]
            );

            return $rfq->load(['items.product', 'items.variant']);
        });
    }
}
