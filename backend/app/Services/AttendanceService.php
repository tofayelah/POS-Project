<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\AttendanceAdjustment;
use App\Models\AuditLog;
use App\Models\Employee;
use App\Models\HolidayCalendar;
use App\Models\Shift;
use App\Models\WorkingCalendar;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class AttendanceService
{
    public function __construct(
        protected ShiftService $shiftService
    ) {}

    public function listAttendance(int $companyId, array $filters = [])
    {
        $query = Attendance::where('company_id', $companyId)
            ->with(['employee.department', 'employee.designation', 'shift', 'approver']);

        if (!empty($filters['date'])) {
            $query->whereDate('attendance_date', $filters['date']);
        }
        if (!empty($filters['date_from'])) {
            $query->whereDate('attendance_date', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->whereDate('attendance_date', '<=', $filters['date_to']);
        }
        if (!empty($filters['employee_id'])) {
            $query->where('employee_id', $filters['employee_id']);
        }
        if (!empty($filters['department_id'])) {
            $query->whereHas('employee', fn($q) => $q->where('department_id', $filters['department_id']));
        }
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        $limit = isset($filters['limit']) ? (int) $filters['limit'] : 50;
        return $query->orderByDesc('attendance_date')->paginate($limit);
    }

    /**
     * Authoritatively compute time intervals and status given a check_in and check_out.
     */
    public function calculateAttendanceMetrics(?Shift $shift, string $date, ?string $checkIn, ?string $checkOut): array
    {
        if (!$checkIn) {
            return [
                'status' => 'ABSENT',
                'worked_minutes' => 0,
                'late_minutes' => 0,
                'early_leave_minutes' => 0,
                'overtime_minutes' => 0,
            ];
        }

        $inCarbon = Carbon::parse($checkIn);
        $outCarbon = $checkOut ? Carbon::parse($checkOut) : null;

        $workedMinutes = 0;
        $lateMinutes = 0;
        $earlyLeaveMinutes = 0;
        $overtimeMinutes = 0;

        if ($outCarbon && $outCarbon->lessThan($inCarbon)) {
            throw new ConflictHttpException("Check-out time cannot be earlier than check-in time.");
        }

        if ($shift) {
            $shiftDate = Carbon::parse($date)->toDateString();
            $shiftStart = Carbon::parse("{$shiftDate} {$shift->start_time}");
            $shiftEnd = Carbon::parse("{$shiftDate} {$shift->end_time}");

            if ($shift->is_overnight && $shiftEnd->lessThanOrEqualTo($shiftStart)) {
                $shiftEnd->addDay();
            }

            // Scheduled duration minus break
            $scheduledDurationMinutes = max(0, $shiftStart->diffInMinutes($shiftEnd) - (int)$shift->break_minutes);

            // Lateness calculation
            $graceTime = $shiftStart->copy()->addMinutes((int)$shift->grace_minutes);
            if ($inCarbon->greaterThan($graceTime)) {
                $lateMinutes = (int) abs($inCarbon->diffInMinutes($shiftStart));
            }

            // Early leave calculation
            if ($outCarbon) {
                if ($outCarbon->lessThan($shiftEnd)) {
                    $earlyLeaveMinutes = (int) abs($shiftEnd->diffInMinutes($outCarbon));
                }
            }

            // Total worked minutes
            if ($outCarbon) {
                $rawWorked = (int) abs($inCarbon->diffInMinutes($outCarbon));
                // Subtract break if worked past scheduled break
                $workedMinutes = ($rawWorked > (int)$shift->break_minutes) ? ($rawWorked - (int)$shift->break_minutes) : $rawWorked;

                // Overtime calculation: worked past scheduled shift end plus overtime_after_minutes
                $otThreshold = $shiftEnd->copy()->addMinutes((int)$shift->overtime_after_minutes);
                if ($outCarbon->greaterThan($otThreshold)) {
                    $overtimeMinutes = (int) abs($outCarbon->diffInMinutes($shiftEnd));
                }
            }
        } elseif ($outCarbon) {
            $workedMinutes = (int) abs($inCarbon->diffInMinutes($outCarbon));
        }

        $status = 'PRESENT';
        if ($lateMinutes > 0) {
            $status = 'LATE';
        }
        if ($shift && $workedMinutes > 0 && $workedMinutes < ($scheduledDurationMinutes / 2)) {
            $status = 'HALF_DAY';
        }

        return [
            'status' => $status,
            'worked_minutes' => $workedMinutes,
            'late_minutes' => $lateMinutes,
            'early_leave_minutes' => $earlyLeaveMinutes,
            'overtime_minutes' => $overtimeMinutes,
        ];
    }

    /**
     * Record or clock-in/out attendance for an employee.
     */
    public function recordAttendance(int $companyId, array $data, ?int $userId = null): Attendance
    {
        return DB::transaction(function () use ($companyId, $data, $userId) {
            $employee = Employee::where('company_id', $companyId)->findOrFail($data['employee_id']);
            $date = $data['attendance_date'] ?? date('Y-m-d');

            $existing = Attendance::where('employee_id', $employee->id)->where('attendance_date', $date)->first();
            $shift = !empty($data['shift_id']) 
                ? Shift::where('company_id', $companyId)->find($data['shift_id'])
                : ($existing?->shift ?? $this->shiftService->getEffectiveShiftForDate($companyId, $employee->id, $date));

            $checkIn = $data['check_in'] ?? ($existing?->check_in?->toDateTimeString() ?? null);
            $checkOut = $data['check_out'] ?? ($existing?->check_out?->toDateTimeString() ?? null);

            $metrics = $this->calculateAttendanceMetrics($shift, $date, $checkIn, $checkOut);
            $status = !empty($data['status']) ? strtoupper($data['status']) : $metrics['status'];

            if ($existing) {
                $existing->update([
                    'shift_id' => $shift?->id,
                    'check_in' => $checkIn ? Carbon::parse($checkIn) : null,
                    'check_out' => $checkOut ? Carbon::parse($checkOut) : null,
                    'status' => $status,
                    'late_minutes' => $metrics['late_minutes'],
                    'early_leave_minutes' => $metrics['early_leave_minutes'],
                    'worked_minutes' => $metrics['worked_minutes'],
                    'overtime_minutes' => $metrics['overtime_minutes'],
                    'source' => $data['source'] ?? $existing->source,
                    'remarks' => $data['remarks'] ?? $existing->remarks,
                ]);

                AuditLog::log($companyId, $userId, 'ATTENDANCE_UPDATED', $existing->id, 'Attendance', "Updated attendance for {$employee->employee_number} on {$date}");
                return $existing->load(['employee', 'shift']);
            }

            $attendance = Attendance::create([
                'company_id' => $companyId,
                'employee_id' => $employee->id,
                'shift_id' => $shift?->id,
                'attendance_date' => $date,
                'check_in' => $checkIn ? Carbon::parse($checkIn) : null,
                'check_out' => $checkOut ? Carbon::parse($checkOut) : null,
                'status' => $status,
                'late_minutes' => $metrics['late_minutes'],
                'early_leave_minutes' => $metrics['early_leave_minutes'],
                'worked_minutes' => $metrics['worked_minutes'],
                'overtime_minutes' => $metrics['overtime_minutes'],
                'source' => $data['source'] ?? 'WEB',
                'remarks' => $data['remarks'] ?? null,
                'approved_by' => $userId,
                'approved_at' => now(),
            ]);

            AuditLog::log($companyId, $userId, 'ATTENDANCE_RECORDED', $attendance->id, 'Attendance', "Recorded attendance for {$employee->employee_number} on {$date} ({$status})");

            return $attendance->load(['employee', 'shift']);
        });
    }

    /**
     * Controlled attendance adjustment/correction workflow with audit trail.
     */
    public function adjustAttendance(int $companyId, int $attendanceId, array $data, int $userId): Attendance
    {
        return DB::transaction(function () use ($companyId, $attendanceId, $data, $userId) {
            $attendance = Attendance::where('company_id', $companyId)->lockForUpdate()->findOrFail($attendanceId);
            $employee = $attendance->employee;

            $origCheckIn = $attendance->check_in;
            $origCheckOut = $attendance->check_out;
            $origStatus = $attendance->status;

            $newCheckIn = !empty($data['check_in']) ? Carbon::parse($data['check_in']) : $attendance->check_in;
            $newCheckOut = !empty($data['check_out']) ? Carbon::parse($data['check_out']) : $attendance->check_out;
            $shift = $attendance->shift ?? $this->shiftService->getEffectiveShiftForDate($companyId, $employee->id, $attendance->attendance_date->toDateString());

            $metrics = $this->calculateAttendanceMetrics(
                $shift,
                $attendance->attendance_date->toDateString(),
                $newCheckIn?->toDateTimeString(),
                $newCheckOut?->toDateTimeString()
            );

            $newStatus = !empty($data['status']) ? strtoupper($data['status']) : $metrics['status'];
            $reason = $data['reason'] ?? 'Manual attendance correction';

            // Create immutable adjustment entry
            AttendanceAdjustment::create([
                'company_id' => $companyId,
                'attendance_id' => $attendance->id,
                'employee_id' => $employee->id,
                'original_check_in' => $origCheckIn,
                'original_check_out' => $origCheckOut,
                'original_status' => $origStatus,
                'new_check_in' => $newCheckIn,
                'new_check_out' => $newCheckOut,
                'new_status' => $newStatus,
                'reason' => $reason,
                'adjusted_by' => $userId,
                'created_at' => now(),
            ]);

            $attendance->update([
                'check_in' => $newCheckIn,
                'check_out' => $newCheckOut,
                'status' => $newStatus,
                'late_minutes' => $metrics['late_minutes'],
                'early_leave_minutes' => $metrics['early_leave_minutes'],
                'worked_minutes' => $metrics['worked_minutes'],
                'overtime_minutes' => $metrics['overtime_minutes'],
                'remarks' => "Corrected: {$reason}",
                'approved_by' => $userId,
                'approved_at' => now(),
            ]);

            AuditLog::log(
                $companyId,
                $userId,
                'ATTENDANCE_ADJUSTED',
                $attendance->id,
                'Attendance',
                "Adjusted attendance for {$employee->employee_number} on {$attendance->attendance_date}: {$reason}"
            );

            return $attendance->fresh(['employee', 'shift', 'adjustments.adjustedBy']);
        });
    }
}
