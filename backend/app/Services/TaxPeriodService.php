<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\TaxPeriod;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class TaxPeriodService
{
    public function getPeriods(int $companyId, array $filters = []): Collection
    {
        $query = TaxPeriod::where('company_id', $companyId);

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->orderBy('period_start', 'desc')->get();
    }

    public function getCurrentPeriod(int $companyId, ?string $date = null): ?TaxPeriod
    {
        $targetDate = $date ?? now()->toDateString();
        return TaxPeriod::where('company_id', $companyId)
            ->where('period_start', '<=', $targetDate)
            ->where('period_end', '>=', $targetDate)
            ->first();
    }

    public function createPeriod(int $companyId, array $data, ?int $userId = null): TaxPeriod
    {
        $start = $data['period_start'];
        $end = $data['period_end'];

        if ($start > $end) {
            throw new ConflictHttpException("Period start date cannot be after end date.");
        }

        // Check for overlapping periods in the same company
        $overlap = TaxPeriod::where('company_id', $companyId)
            ->where(function ($q) use ($start, $end) {
                $q->whereBetween('period_start', [$start, $end])
                  ->orWhereBetween('period_end', [$start, $end])
                  ->orWhere(function ($sub) use ($start, $end) {
                      $sub->where('period_start', '<=', $start)
                          ->where('period_end', '>=', $end);
                  });
            })
            ->first();

        if ($overlap) {
            throw new ConflictHttpException("Tax period overlaps with existing period '{$overlap->period_name}'.");
        }

        return DB::transaction(function () use ($companyId, $data, $userId) {
            $period = TaxPeriod::create([
                'company_id' => $companyId,
                'period_name' => $data['period_name'],
                'period_start' => $data['period_start'],
                'period_end' => $data['period_end'],
                'status' => $data['status'] ?? TaxPeriod::STATUS_OPEN,
                'notes' => $data['notes'] ?? null,
            ]);

            AuditLog::create([
                'company_id' => $companyId,
                'user_id' => $userId,
                'event' => 'TAX_PERIOD_CREATED',
                'auditable_type' => TaxPeriod::class,
                'auditable_id' => $period->id,
                'new_values' => $period->toArray(),
            ]);

            return $period;
        });
    }

    public function lockPeriod(int $companyId, int $periodId, int $userId): TaxPeriod
    {
        return DB::transaction(function () use ($companyId, $periodId, $userId) {
            $period = TaxPeriod::where('company_id', $companyId)->lockForUpdate()->find($periodId);
            if (!$period) {
                throw new NotFoundHttpException("Tax period ID {$periodId} not found.");
            }

            if ($period->isLocked()) {
                throw new ConflictHttpException("Tax period is already locked/closed.");
            }

            $period->update([
                'status' => TaxPeriod::STATUS_FINALIZED,
                'locked_at' => now(),
                'locked_by' => $userId,
            ]);

            AuditLog::create([
                'company_id' => $companyId,
                'user_id' => $userId,
                'event' => 'TAX_PERIOD_LOCKED',
                'auditable_type' => TaxPeriod::class,
                'auditable_id' => $period->id,
                'new_values' => $period->toArray(),
            ]);

            return $period;
        });
    }

    public function filePeriod(int $companyId, int $periodId, string $filingReference, int $userId): TaxPeriod
    {
        return DB::transaction(function () use ($companyId, $periodId, $filingReference, $userId) {
            $period = TaxPeriod::where('company_id', $companyId)->lockForUpdate()->find($periodId);
            if (!$period) {
                throw new NotFoundHttpException("Tax period ID {$periodId} not found.");
            }

            $period->update([
                'status' => TaxPeriod::STATUS_FILED,
                'filed_at' => now(),
                'filed_by' => $userId,
                'filing_reference' => $filingReference,
            ]);

            AuditLog::create([
                'company_id' => $companyId,
                'user_id' => $userId,
                'event' => 'TAX_PERIOD_FILED',
                'auditable_type' => TaxPeriod::class,
                'auditable_id' => $period->id,
                'new_values' => $period->toArray(),
            ]);

            return $period;
        });
    }

    public function closePeriod(int $companyId, int $periodId, int $userId): TaxPeriod
    {
        return DB::transaction(function () use ($companyId, $periodId, $userId) {
            $period = TaxPeriod::where('company_id', $companyId)->lockForUpdate()->find($periodId);
            if (!$period) {
                throw new NotFoundHttpException("Tax period ID {$periodId} not found.");
            }

            $period->update([
                'status' => TaxPeriod::STATUS_CLOSED,
                'locked_at' => $period->locked_at ?? now(),
                'locked_by' => $period->locked_by ?? $userId,
            ]);

            AuditLog::create([
                'company_id' => $companyId,
                'user_id' => $userId,
                'event' => 'TAX_PERIOD_CLOSED',
                'auditable_type' => TaxPeriod::class,
                'auditable_id' => $period->id,
                'new_values' => $period->toArray(),
            ]);

            return $period;
        });
    }

    /**
     * Guard against posting into closed/finalized tax periods.
     */
    public function assertPeriodOpen(int $companyId, string $date): void
    {
        $period = $this->getCurrentPeriod($companyId, $date);
        if ($period && $period->isLocked()) {
            throw new ConflictHttpException("Tax period '{$period->period_name}' for date {$date} is locked/closed. Direct tax posting is blocked.");
        }
    }
}
