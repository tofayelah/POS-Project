<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Employee;
use App\Models\Shift;
use App\Models\ShiftAssignment;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ShiftService
{
    public function listShifts(int $companyId, array $filters = [])
    {
        $query = Shift::where('company_id', $companyId);

        if (!empty($filters['search'])) {
            $s = $filters['search'];
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('code', 'like', "%{$s}%");
            });
        }
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->withCount('assignments')->orderBy('name')->get();
    }

    public function createShift(int $companyId, array $data, ?int $userId = null): Shift
    {
        $code = strtoupper($data['code']);
        $exists = Shift::where('company_id', $companyId)->where('code', $code)->exists();
        if ($exists) {
            throw new ConflictHttpException("Shift code '{$code}' already exists.");
        }

        // Determine if overnight: start_time > end_time
        $startTime = $data['start_time'];
        $endTime = $data['end_time'];
        $isOvernight = !empty($data['is_overnight']) || ($startTime > $endTime);

        $shift = Shift::create([
            'company_id' => $companyId,
            'name' => $data['name'],
            'code' => $code,
            'start_time' => $startTime,
            'end_time' => $endTime,
            'break_minutes' => (int) ($data['break_minutes'] ?? 0),
            'grace_minutes' => (int) ($data['grace_minutes'] ?? 10),
            'overtime_after_minutes' => (int) ($data['overtime_after_minutes'] ?? 0),
            'is_overnight' => $isOvernight,
            'status' => strtoupper($data['status'] ?? 'ACTIVE'),
            'created_by' => $userId,
        ]);

        AuditLog::log($companyId, $userId, 'SHIFT_CREATED', $shift->id, 'Shift', "Created shift {$shift->name} ({$shift->code})");

        return $shift;
    }

    public function updateShift(int $companyId, int $shiftId, array $data, ?int $userId = null): Shift
    {
        $shift = Shift::where('company_id', $companyId)->findOrFail($shiftId);

        if (!empty($data['code']) && strtoupper($data['code']) !== $shift->code) {
            $code = strtoupper($data['code']);
            $exists = Shift::where('company_id', $companyId)
                ->where('code', $code)
                ->where('id', '!=', $shift->id)
                ->exists();
            if ($exists) {
                throw new ConflictHttpException("Shift code '{$code}' already exists.");
            }
            $shift->code = $code;
        }

        if (isset($data['name'])) $shift->name = $data['name'];
        if (isset($data['start_time'])) $shift->start_time = $data['start_time'];
        if (isset($data['end_time'])) $shift->end_time = $data['end_time'];
        if (isset($data['break_minutes'])) $shift->break_minutes = (int) $data['break_minutes'];
        if (isset($data['grace_minutes'])) $shift->grace_minutes = (int) $data['grace_minutes'];
        if (isset($data['overtime_after_minutes'])) $shift->overtime_after_minutes = (int) $data['overtime_after_minutes'];
        if (isset($data['status'])) $shift->status = strtoupper($data['status']);

        $startTime = $shift->start_time;
        $endTime = $shift->end_time;
        $shift->is_overnight = array_key_exists('is_overnight', $data) ? (bool) $data['is_overnight'] : ($startTime > $endTime);

        $shift->updated_by = $userId;
        $shift->save();

        AuditLog::log($companyId, $userId, 'SHIFT_UPDATED', $shift->id, 'Shift', "Updated shift {$shift->name}");

        return $shift;
    }

    public function assignShift(int $companyId, int $employeeId, int $shiftId, string $effectiveFrom, ?string $effectiveTo = null, ?int $userId = null): ShiftAssignment
    {
        return DB::transaction(function () use ($companyId, $employeeId, $shiftId, $effectiveFrom, $effectiveTo, $userId) {
            $employee = Employee::where('company_id', $companyId)->findOrFail($employeeId);
            $shift = Shift::where('company_id', $companyId)->findOrFail($shiftId);

            // Cap previous open-ended assignment if effective_to was null
            ShiftAssignment::where('employee_id', $employeeId)
                ->where('effective_from', '<', $effectiveFrom)
                ->whereNull('effective_to')
                ->update(['effective_to' => Carbon::parse($effectiveFrom)->subDay()->toDateString()]);

            $assignment = ShiftAssignment::create([
                'company_id' => $companyId,
                'employee_id' => $employee->id,
                'shift_id' => $shift->id,
                'effective_from' => $effectiveFrom,
                'effective_to' => $effectiveTo,
                'created_by' => $userId,
            ]);

            AuditLog::log($companyId, $userId, 'SHIFT_ASSIGNED', $assignment->id, 'ShiftAssignment', "Assigned shift {$shift->code} to employee {$employee->employee_number}");

            return $assignment->load(['employee', 'shift']);
        });
    }

    public function getEffectiveShiftForDate(int $companyId, int $employeeId, string $date): ?Shift
    {
        $assignment = ShiftAssignment::where('company_id', $companyId)
            ->where('employee_id', $employeeId)
            ->where('effective_from', '<=', $date)
            ->where(function ($q) use ($date) {
                $q->whereNull('effective_to')
                  ->orWhere('effective_to', '>=', $date);
            })
            ->orderByDesc('effective_from')
            ->first();

        if ($assignment) {
            return $assignment->shift;
        }

        // Fallback to first active company shift
        return Shift::where('company_id', $companyId)->where('status', 'ACTIVE')->first();
    }
}
