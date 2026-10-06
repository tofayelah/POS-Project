<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class SupplierQualificationService
{
    public const VALID_STATUSES = [
        'DRAFT',
        'PENDING_REVIEW',
        'QUALIFIED',
        'CONDITIONAL',
        'SUSPENDED',
        'REJECTED',
        'BLOCKED',
    ];

    /**
     * Change a supplier's qualification status with validation and audit logging.
     */
    public function updateQualificationStatus(
        Supplier $supplier,
        string $newStatus,
        ?string $reason = null,
        ?string $notes = null,
        ?User $user = null
    ): Supplier {
        $newStatus = strtoupper(trim($newStatus));
        if (!in_array($newStatus, self::VALID_STATUSES, true)) {
            throw new \InvalidArgumentException("Invalid qualification status: {$newStatus}");
        }

        if (in_array($newStatus, ['BLOCKED', 'REJECTED']) && empty($reason)) {
            throw new \InvalidArgumentException("A justification reason is required when status is {$newStatus}.");
        }

        $oldStatus = $supplier->qualification_status ?? 'DRAFT';
        if ($oldStatus === $newStatus) {
            return $supplier;
        }

        return DB::transaction(function () use ($supplier, $newStatus, $oldStatus, $reason, $notes, $user) {
            $updateData = [
                'qualification_status' => $newStatus,
                'block_reason' => in_array($newStatus, ['BLOCKED', 'REJECTED', 'SUSPENDED']) ? $reason : null,
                'qualification_notes' => $notes ?? $supplier->qualification_notes,
            ];

            if ($newStatus === 'QUALIFIED') {
                $updateData['qualified_at'] = now();
                $updateData['qualified_by'] = $user ? $user->id : null;
            }

            $supplier->update($updateData);

            AuditLog::log(
                $user,
                $supplier->company_id,
                'SUPPLIER_QUALIFICATION_CHANGED',
                $supplier,
                ['qualification_status' => $oldStatus],
                [
                    'qualification_status' => $newStatus,
                    'reason' => $reason,
                    'notes' => $notes,
                ]
            );

            return $supplier->fresh(['qualifiedByUser']);
        });
    }

    /**
     * Check if a supplier is qualified to receive purchase orders.
     */
    public function canIssuePurchaseOrder(Supplier $supplier): bool
    {
        if ($supplier->status !== 'ACTIVE') {
            return false;
        }

        return in_array($supplier->qualification_status, ['QUALIFIED', 'CONDITIONAL'], true);
    }
}
