<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Employee;
use App\Models\HolidayCalendar;
use App\Models\LeaveApplication;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use App\Models\WorkingCalendar;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class LeaveService
{
    // ==========================================
    // LEAVE TYPES
    // ==========================================

    public function listLeaveTypes(int $companyId)
    {
        return LeaveType::where('company_id', $companyId)->orderBy('name')->get();
    }

    public function createLeaveType(int $companyId, array $data, ?int $userId = null): LeaveType
    {
        $code = strtoupper($data['code']);
        $exists = LeaveType::where('company_id', $companyId)->where('code', $code)->exists();
        if ($exists) {
            throw new ConflictHttpException("Leave type code '{$code}' already exists.");
        }

        $type = LeaveType::create([
            'company_id' => $companyId,
            'name' => $data['name'],
            'code' => $code,
            'is_paid' => array_key_exists('is_paid', $data) ? (bool) $data['is_paid'] : true,
            'default_days_per_year' => (float) ($data['default_days_per_year'] ?? 14),
            'description' => $data['description'] ?? null,
            'status' => strtoupper($data['status'] ?? 'ACTIVE'),
        ]);

        AuditLog::log($companyId, $userId, 'LEAVE_TYPE_CREATED', $type->id, 'LeaveType', "Created leave type {$type->name} ({$type->code})");

        return $type;
    }

    // ==========================================
    // LEAVE DAY CALCULATION
    // ==========================================

    /**
     * Calculate authoritative working leave days between two dates,
     * skipping weekly off days (e.g. Friday/Saturday if configured) and public holidays.
     */
    public function calculateLeaveDays(int $companyId, string $fromDate, string $toDate): float
    {
        $start = Carbon::parse($fromDate);
        $end = Carbon::parse($toDate);

        if ($end->lessThan($start)) {
            throw new ConflictHttpException("To date cannot be earlier than From date.");
        }

        // Get non-working days from WorkingCalendar
        $nonWorkingDays = WorkingCalendar::where('company_id', $companyId)
            ->where('is_working_day', false)
            ->pluck('day_of_week')
            ->toArray();

        // Default to Friday (5) as weekend if no calendar configured
        if (empty($nonWorkingDays)) {
            $nonWorkingDays = [5];
        }

        // Get holidays in period
        $holidays = HolidayCalendar::where('company_id', $companyId)
            ->where('status', 'ACTIVE')
            ->whereBetween('holiday_date', [$start->toDateString(), $end->toDateString()])
            ->pluck('holiday_date')
            ->map(fn($d) => Carbon::parse($d)->toDateString())
            ->toArray();

        $workingDays = 0;
        $period = CarbonPeriod::create($start, $end);

        foreach ($period as $date) {
            $dow = $date->dayOfWeek; // 0=Sun .. 6=Sat
            $dateStr = $date->toDateString();

            if (in_array($dow, $nonWorkingDays, true)) {
                continue;
            }
            if (in_array($dateStr, $holidays, true)) {
                continue;
            }

            $workingDays++;
        }

        return (float) $workingDays;
    }

    // ==========================================
    // LEAVE BALANCES
    // ==========================================

    public function getOrCreateLeaveBalance(int $companyId, int $employeeId, int $leaveTypeId, ?int $year = null): LeaveBalance
    {
        $year = $year ?? (int) date('Y');
        $leaveType = LeaveType::where('company_id', $companyId)->findOrFail($leaveTypeId);

        $balance = LeaveBalance::where('company_id', $companyId)
            ->where('employee_id', $employeeId)
            ->where('leave_type_id', $leaveTypeId)
            ->where('year', $year)
            ->first();

        if (!$balance) {
            $defaultDays = (float) $leaveType->default_days_per_year;
            $balance = LeaveBalance::create([
                'company_id' => $companyId,
                'employee_id' => $employeeId,
                'leave_type_id' => $leaveTypeId,
                'year' => $year,
                'opening_balance' => $defaultDays,
                'accrued_days' => $defaultDays,
                'used_days' => 0,
                'pending_days' => 0,
                'remaining_days' => $defaultDays,
            ]);
        }

        return $balance;
    }

    public function listEmployeeBalances(int $companyId, int $employeeId, ?int $year = null)
    {
        $year = $year ?? (int) date('Y');
        $leaveTypes = LeaveType::where('company_id', $companyId)->where('status', 'ACTIVE')->get();

        foreach ($leaveTypes as $lt) {
            $this->getOrCreateLeaveBalance($companyId, $employeeId, $lt->id, $year);
        }

        return LeaveBalance::where('company_id', $companyId)
            ->where('employee_id', $employeeId)
            ->where('year', $year)
            ->with('leaveType')
            ->get();
    }

    // ==========================================
    // LEAVE APPLICATIONS
    // ==========================================

    public function listApplications(int $companyId, array $filters = [])
    {
        $query = LeaveApplication::where('company_id', $companyId)
            ->with(['employee.department', 'leaveType', 'approver']);

        if (!empty($filters['employee_id'])) {
            $query->where('employee_id', $filters['employee_id']);
        }
        if (!empty($filters['leave_type_id'])) {
            $query->where('leave_type_id', $filters['leave_type_id']);
        }
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (!empty($filters['date_from'])) {
            $query->whereDate('from_date', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->whereDate('to_date', '<=', $filters['date_to']);
        }

        $limit = isset($filters['limit']) ? (int) $filters['limit'] : 25;
        return $query->orderByDesc('created_at')->paginate($limit);
    }

    public function applyLeave(int $companyId, array $data, ?int $userId = null): LeaveApplication
    {
        return DB::transaction(function () use ($companyId, $data, $userId) {
            $employee = Employee::where('company_id', $companyId)->findOrFail($data['employee_id']);
            $leaveType = LeaveType::where('company_id', $companyId)->findOrFail($data['leave_type_id']);

            $fromDate = $data['from_date'];
            $toDate = $data['to_date'];
            $days = $this->calculateLeaveDays($companyId, $fromDate, $toDate);

            if ($days <= 0) {
                throw new ConflictHttpException("Calculated leave days is 0. The selected period falls entirely on holidays or weekends.");
            }

            $year = (int) Carbon::parse($fromDate)->year;
            $balance = $this->getOrCreateLeaveBalance($companyId, $employee->id, $leaveType->id, $year);

            // Check if sufficient remaining balance if it is a paid leave
            if ($leaveType->is_paid && ($balance->remaining_days - $balance->pending_days) < $days) {
                $avail = $balance->remaining_days - $balance->pending_days;
                throw new ConflictHttpException("Insufficient leave balance. Available: {$avail} days, Requested: {$days} days.");
            }

            $status = !empty($data['status']) ? strtoupper($data['status']) : 'SUBMITTED';

            $app = LeaveApplication::create([
                'company_id' => $companyId,
                'employee_id' => $employee->id,
                'leave_type_id' => $leaveType->id,
                'from_date' => $fromDate,
                'to_date' => $toDate,
                'days' => $days,
                'reason' => $data['reason'] ?? 'Leave application',
                'status' => $status,
            ]);

            // If submitted, record pending days
            if ($status === 'SUBMITTED') {
                $balance->pending_days += $days;
                $balance->save();
            }

            AuditLog::log($companyId, $userId, 'LEAVE_APPLIED', $app->id, 'LeaveApplication', "Employee {$employee->employee_number} applied for {$days} days {$leaveType->name}");

            return $app->load(['employee', 'leaveType']);
        });
    }

    public function approveLeave(int $companyId, int $applicationId, int $userId): LeaveApplication
    {
        return DB::transaction(function () use ($companyId, $applicationId, $userId) {
            $app = LeaveApplication::where('company_id', $companyId)->lockForUpdate()->findOrFail($applicationId);

            if ($app->status === 'APPROVED') {
                return $app;
            }
            if ($app->status !== 'SUBMITTED' && $app->status !== 'DRAFT') {
                throw new ConflictHttpException("Cannot approve leave application with status '{$app->status}'.");
            }

            $year = (int) Carbon::parse($app->from_date)->year;
            $balance = $this->getOrCreateLeaveBalance($companyId, $app->employee_id, $app->leave_type_id, $year);

            // Deduct from balance
            if ($app->status === 'SUBMITTED') {
                $balance->pending_days = max(0, $balance->pending_days - (float) $app->days);
            }
            $balance->used_days += (float) $app->days;
            $totalAllowance = (float) $balance->opening_balance + (float) $balance->accrued_days;
            if ($totalAllowance > 0) {
                $balance->remaining_days = max(0, $totalAllowance - (float) $balance->used_days);
            } else {
                $balance->remaining_days = max(0, (float) $balance->remaining_days - (float) $app->days);
            }
            $balance->save();

            $app->update([
                'status' => 'APPROVED',
                'approved_by' => $userId,
                'approved_at' => now(),
            ]);

            AuditLog::log($companyId, $userId, 'LEAVE_APPROVED', $app->id, 'LeaveApplication', "Approved {$app->days} days leave for employee {$app->employee_id}");

            return $app->load(['employee', 'leaveType', 'approver']);
        });
    }

    public function rejectLeave(int $companyId, int $applicationId, string $rejectionReason, int $userId): LeaveApplication
    {
        return DB::transaction(function () use ($companyId, $applicationId, $rejectionReason, $userId) {
            $app = LeaveApplication::where('company_id', $companyId)->lockForUpdate()->findOrFail($applicationId);

            if ($app->status !== 'SUBMITTED') {
                throw new ConflictHttpException("Only submitted applications can be rejected.");
            }

            $year = (int) Carbon::parse($app->from_date)->year;
            $balance = $this->getOrCreateLeaveBalance($companyId, $app->employee_id, $app->leave_type_id, $year);

            // Release pending days
            $balance->pending_days = max(0, $balance->pending_days - (float) $app->days);
            $balance->save();

            $app->update([
                'status' => 'REJECTED',
                'approved_by' => $userId,
                'approved_at' => now(),
                'rejection_reason' => $rejectionReason,
            ]);

            AuditLog::log($companyId, $userId, 'LEAVE_REJECTED', $app->id, 'LeaveApplication', "Rejected leave application for employee {$app->employee_id}: {$rejectionReason}");

            return $app->load(['employee', 'leaveType', 'approver']);
        });
    }
}
