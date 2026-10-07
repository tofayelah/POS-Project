<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\EmployeeAdvance;
use App\Models\EmployeeLoan;
use App\Models\LeaveApplication;
use App\Models\PayrollPeriod;
use App\Models\PayrollRun;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class HrmDashboardService
{
    public function getHrDashboard(int $companyId): array
    {
        $today = Carbon::today()->toDateString();
        $monthStart = Carbon::now()->startOfMonth()->toDateString();

        $totalEmployees = Employee::where('company_id', $companyId)->count();
        $activeEmployees = Employee::where('company_id', $companyId)->where('employment_status', 'ACTIVE')->count();
        $newJoiners = Employee::where('company_id', $companyId)->whereDate('joining_date', '>=', $monthStart)->count();
        $resigned = Employee::where('company_id', $companyId)->whereIn('employment_status', ['RESIGNED', 'TERMINATED'])->count();

        // Attendance stats for today
        $attendanceRecords = Attendance::where('company_id', $companyId)->whereDate('attendance_date', $today)->get();
        $presentToday = $attendanceRecords->whereIn('status', ['PRESENT', 'LATE'])->count();
        $lateToday = $attendanceRecords->where('status', 'LATE')->count();
        $absentToday = $activeEmployees - $presentToday;
        $onLeaveToday = LeaveApplication::where('company_id', $companyId)
            ->where('status', 'APPROVED')
            ->where('from_date', '<=', $today)
            ->where('to_date', '>=', $today)
            ->count();

        $pendingLeaves = LeaveApplication::where('company_id', $companyId)->where('status', 'SUBMITTED')->count();
        $pendingPayrollRuns = PayrollRun::where('company_id', $companyId)->whereIn('status', ['DRAFT', 'CALCULATED', 'UNDER_REVIEW'])->count();

        $outstandingAdvances = (float) EmployeeAdvance::where('company_id', $companyId)
            ->whereIn('status', ['DISBURSED', 'PARTIALLY_SETTLED'])
            ->sum('outstanding_amount');

        $outstandingLoans = (float) EmployeeLoan::where('company_id', $companyId)
            ->whereIn('status', ['DISBURSED', 'ACTIVE'])
            ->sum('outstanding_balance');

        return [
            'total_employees' => $totalEmployees,
            'active_employees' => $activeEmployees,
            'new_joiners' => $newJoiners,
            'resigned_employees' => $resigned,
            'attendance_today' => [
                'date' => $today,
                'present' => $presentToday,
                'late' => $lateToday,
                'absent' => max(0, $absentToday),
                'on_leave' => $onLeaveToday,
            ],
            'pending_leave_applications' => $pendingLeaves,
            'pending_payroll_runs' => $pendingPayrollRuns,
            'outstanding_advances' => round($outstandingAdvances, 2),
            'outstanding_loans' => round($outstandingLoans, 2),
        ];
    }

    public function getPayrollDashboard(int $companyId): array
    {
        $latestRun = PayrollRun::where('company_id', $companyId)
            ->with('period')
            ->orderByDesc('id')
            ->first();

        $monthStart = Carbon::now()->startOfMonth()->toDateString();

        $ytdGross = (float) PayrollRun::where('company_id', $companyId)
            ->where('status', 'POSTED')
            ->whereYear('created_at', date('Y'))
            ->sum('total_gross');

        $ytdNet = (float) PayrollRun::where('company_id', $companyId)
            ->where('status', 'POSTED')
            ->whereYear('created_at', date('Y'))
            ->sum('total_net');

        return [
            'latest_run' => $latestRun ? [
                'id' => $latestRun->id,
                'run_number' => $latestRun->run_number,
                'period_name' => $latestRun->period?->name,
                'status' => $latestRun->status,
                'total_basic' => (float) $latestRun->total_basic,
                'total_allowances' => (float) $latestRun->total_allowances,
                'total_overtime' => (float) $latestRun->total_overtime,
                'total_bonuses' => (float) $latestRun->total_bonuses,
                'total_gross' => (float) $latestRun->total_gross,
                'total_deductions' => (float) $latestRun->total_deductions,
                'total_loan_repayments' => (float) $latestRun->total_loan_repayments,
                'total_advance_repayments' => (float) $latestRun->total_advance_repayments,
                'total_net' => (float) $latestRun->total_net,
                'total_paid' => (float) $latestRun->total_paid,
                'total_outstanding' => (float) $latestRun->total_outstanding,
            ] : null,
            'ytd_gross_payroll' => round($ytdGross, 2),
            'ytd_net_payroll' => round($ytdNet, 2),
        ];
    }
}
