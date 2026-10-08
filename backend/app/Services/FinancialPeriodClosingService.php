<?php

namespace App\Services;

use App\Models\AccountingPeriod;
use App\Models\FiscalYear;
use App\Models\JournalEntry;
use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Carbon\Carbon;

class FinancialPeriodClosingService
{
    public function getPeriods(int $companyId, ?int $fiscalYearId = null): array
    {
        $query = AccountingPeriod::where('company_id', $companyId)
            ->with(['fiscalYear', 'closedBy:id,name', 'reopenedBy:id,name'])
            ->orderBy('start_date', 'asc');

        if ($fiscalYearId) {
            $query->where('fiscal_year_id', $fiscalYearId);
        }

        $periods = $query->get();

        return $periods->map(function ($p) use ($companyId) {
            $draftCount = JournalEntry::where('company_id', $companyId)
                ->where('accounting_period_id', $p->id)
                ->where('status', 'DRAFT')
                ->count();

            $postedCount = JournalEntry::where('company_id', $companyId)
                ->where('accounting_period_id', $p->id)
                ->where('status', 'POSTED')
                ->count();

            return [
                'id' => $p->id,
                'name' => $p->name,
                'fiscal_year_id' => $p->fiscal_year_id,
                'fiscal_year_name' => $p->fiscalYear ? $p->fiscalYear->name : null,
                'start_date' => $p->start_date ? $p->start_date->format('Y-m-d') : null,
                'end_date' => $p->end_date ? $p->end_date->format('Y-m-d') : null,
                'status' => $p->status,
                'draft_journals' => $draftCount,
                'posted_journals' => $postedCount,
                'closed_by' => $p->closedBy ? $p->closedBy->name : null,
                'closed_at' => $p->closed_at ? $p->closed_at->toIso8601String() : null,
                'reopened_by' => $p->reopenedBy ? $p->reopenedBy->name : null,
                'reopened_at' => $p->reopened_at ? $p->reopened_at->toIso8601String() : null,
                'reopen_reason' => $p->reopen_reason,
            ];
        })->toArray();
    }

    public function softLockPeriod(int $companyId, int $periodId, int $userId): AccountingPeriod
    {
        $period = AccountingPeriod::where('company_id', $companyId)->findOrFail($periodId);
        if ($period->status === 'CLOSED') {
            throw new ConflictHttpException("Cannot soft-lock a period that is already closed.");
        }

        $period->status = 'SOFT_LOCK';
        $period->save();

        AuditLog::log($companyId, $userId, 'PERIOD_SOFT_LOCKED', $period->id, 'AccountingPeriod', "Soft-locked accounting period: {$period->name}");

        return $period;
    }

    public function closePeriod(int $companyId, int $periodId, int $userId, bool $force = false): AccountingPeriod
    {
        return DB::transaction(function () use ($companyId, $periodId, $userId, $force) {
            $period = AccountingPeriod::where('company_id', $companyId)->lockForUpdate()->findOrFail($periodId);

            if ($period->status === 'CLOSED') {
                throw new ConflictHttpException("Accounting period is already closed.");
            }

            // Check for unposted draft journals in this period
            $draftCount = JournalEntry::where('company_id', $companyId)
                ->where('accounting_period_id', $period->id)
                ->where('status', 'DRAFT')
                ->count();

            if ($draftCount > 0 && !$force) {
                throw new ConflictHttpException("Period has {$draftCount} unposted DRAFT journals. Post or cancel them before closing, or use force option.");
            }

            $period->status = 'CLOSED';
            $period->closed_by = $userId;
            $period->closed_at = Carbon::now();
            $period->save();

            AuditLog::log($companyId, $userId, 'PERIOD_CLOSED', $period->id, 'AccountingPeriod', "Closed accounting period: {$period->name}");

            return $period;
        });
    }

    public function reopenPeriod(int $companyId, int $periodId, string $reason, int $userId): AccountingPeriod
    {
        return DB::transaction(function () use ($companyId, $periodId, $reason, $userId) {
            $period = AccountingPeriod::where('company_id', $companyId)->lockForUpdate()->findOrFail($periodId);

            // Cannot reopen if parent fiscal year is closed
            $fy = FiscalYear::where('company_id', $companyId)->find($period->fiscal_year_id);
            if ($fy && $fy->status === 'CLOSED') {
                throw new ConflictHttpException("Cannot reopen period: fiscal year {$fy->name} is already CLOSED.");
            }

            $period->status = 'OPEN';
            $period->reopened_by = $userId;
            $period->reopened_at = Carbon::now();
            $period->reopen_reason = $reason;
            $period->save();

            AuditLog::log($companyId, $userId, 'PERIOD_REOPENED', $period->id, 'AccountingPeriod', "Reopened accounting period {$period->name}. Reason: {$reason}");

            return $period;
        });
    }
}
