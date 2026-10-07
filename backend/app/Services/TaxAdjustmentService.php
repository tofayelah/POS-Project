<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\TaxAdjustment;
use App\Models\TaxPeriod;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class TaxAdjustmentService
{
    public function __construct(
        protected TaxPostingService $taxPostingService
    ) {}

    public function listAdjustments(int $companyId, array $filters = []): Collection
    {
        $query = TaxAdjustment::with(['period', 'sourceTransaction'])
            ->where('company_id', $companyId);

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['tax_period_id'])) {
            $query->where('tax_period_id', $filters['tax_period_id']);
        }

        return $query->orderBy('id', 'desc')->get();
    }

    public function createAdjustment(int $companyId, array $data, int $userId): TaxAdjustment
    {
        return DB::transaction(function () use ($companyId, $data, $userId) {
            $period = TaxPeriod::where('company_id', $companyId)->findOrFail($data['tax_period_id']);

            $count = TaxAdjustment::where('company_id', $companyId)->count() + 1;
            $adjNumber = 'ADJ-' . date('Ym') . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

            $adjustment = TaxAdjustment::create([
                'company_id' => $companyId,
                'branch_id' => $data['branch_id'] ?? null,
                'tax_period_id' => $period->id,
                'adjustment_number' => $adjNumber,
                'adjustment_type' => $data['adjustment_type'],
                'reason' => $data['reason'],
                'amount' => $data['amount'] ?? 0,
                'tax_amount' => $data['tax_amount'],
                'legal_reference' => $data['legal_reference'] ?? null,
                'source_tax_transaction_id' => $data['source_tax_transaction_id'] ?? null,
                'status' => TaxAdjustment::STATUS_DRAFT,
                'created_by' => $userId,
            ]);

            AuditLog::create([
                'company_id' => $companyId,
                'user_id' => $userId,
                'event' => 'TAX_ADJUSTMENT_CREATED',
                'auditable_type' => TaxAdjustment::class,
                'auditable_id' => $adjustment->id,
                'new_values' => $adjustment->toArray(),
            ]);

            return $adjustment;
        });
    }

    public function approveAdjustment(int $companyId, int $adjustmentId, int $userId): TaxAdjustment
    {
        return DB::transaction(function () use ($companyId, $adjustmentId, $userId) {
            $adj = TaxAdjustment::where('company_id', $companyId)->lockForUpdate()->find($adjustmentId);
            if (!$adj) {
                throw new NotFoundHttpException("Tax adjustment ID {$adjustmentId} not found.");
            }

            if ($adj->status !== TaxAdjustment::STATUS_DRAFT) {
                throw new ConflictHttpException("Only DRAFT adjustments can be approved.");
            }

            $adj->update([
                'status' => TaxAdjustment::STATUS_APPROVED,
                'approved_by' => $userId,
                'approved_at' => now(),
            ]);

            AuditLog::create([
                'company_id' => $companyId,
                'user_id' => $userId,
                'event' => 'TAX_ADJUSTMENT_APPROVED',
                'auditable_type' => TaxAdjustment::class,
                'auditable_id' => $adj->id,
                'new_values' => $adj->toArray(),
            ]);

            return $adj;
        });
    }

    public function postAdjustment(int $companyId, int $adjustmentId, int $userId): TaxAdjustment
    {
        $adj = TaxAdjustment::where('company_id', $companyId)->find($adjustmentId);
        if (!$adj) {
            throw new NotFoundHttpException("Tax adjustment ID {$adjustmentId} not found.");
        }

        if ($adj->status !== TaxAdjustment::STATUS_APPROVED) {
            throw new ConflictHttpException("Tax adjustment must be APPROVED before posting.");
        }

        $this->taxPostingService->postAdjustmentTax($companyId, $adj, $userId);

        return $adj->fresh(['period', 'journalEntry']);
    }
}
