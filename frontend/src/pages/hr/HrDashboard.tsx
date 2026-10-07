import React, { useEffect, useState } from 'react';
import {
  Users,
  UserCheck,
  Clock,
  CalendarCheck,
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Building,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router';
import { useTranslation } from '../../i18n';
import { hrApi } from '../../api/hr';
import { HrDashboardMetrics, PayrollDashboardMetrics } from '../../types/hr';

export const HrDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<HrDashboardMetrics | null>(null);
  const [payrollMetrics, setPayrollMetrics] = useState<PayrollDashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [hrData, prData] = await Promise.all([
        hrApi.getHrDashboard(),
        hrApi.getPayrollDashboard(),
      ]);
      setMetrics(hrData);
      setPayrollMetrics(prData);
    } catch (err: any) {
      console.error('Failed to load HRM dashboard data', err);
      setError(err?.response?.data?.message || 'Failed to load HRM metrics.');
    } finally {
      setLoading(false);
    }
  };

  const attendanceTotal = metrics?.attendance_today
    ? metrics.attendance_today.present +
      metrics.attendance_today.absent +
      metrics.attendance_today.on_leave
    : 0;

  const presentPercent = attendanceTotal > 0 && metrics?.attendance_today
    ? Math.round((metrics.attendance_today.present / attendanceTotal) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                {t('hr.dashboard.title', 'HRM & Workforce Command Center')}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('hr.dashboard.subtitle', 'Live workforce telemetry, shift attendance, leaves, and payroll')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh', 'Refresh')}
          </button>
          <Link
            to="/hr/employees"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition"
          >
            <Users className="w-3.5 h-3.5" />
            {t('hr.dashboard.viewEmployees', 'Employee Directory')}
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Workforce */}
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              {t('hr.dashboard.activeEmployees', 'Active Workforce')}
            </span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {metrics ? metrics.active_employees : '—'}
            </span>
            <span className="text-xs text-slate-400">
              / {metrics ? metrics.total_employees : '—'} {t('hr.dashboard.total', 'total')}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1">
            <span>+{metrics ? metrics.new_joiners : 0} {t('hr.dashboard.newThisMonth', 'joined this month')}</span>
          </div>
        </div>

        {/* Present Today */}
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              {t('hr.dashboard.attendanceToday', 'Attendance Today')}
            </span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400">
              {metrics ? metrics.attendance_today.present : '—'}
            </span>
            <span className="text-xs text-slate-400">
              ({presentPercent}% {t('hr.dashboard.turnout', 'turnout')})
            </span>
          </div>
          <div className="mt-2 text-[11px] text-amber-400 flex items-center gap-1">
            <span>{metrics ? metrics.attendance_today.late : 0} {t('hr.dashboard.lateArrivals', 'marked late')}</span>
          </div>
        </div>

        {/* Pending Leave Requests */}
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              {t('hr.dashboard.pendingLeaves', 'Pending Leaves')}
            </span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-400">
              {metrics ? metrics.pending_leave_applications : '—'}
            </span>
            <span className="text-xs text-slate-400">
              {t('hr.dashboard.actionRequired', 'requests pending')}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            <Link to="/hr/leaves" className="text-indigo-400 hover:underline flex items-center gap-1">
              {t('hr.dashboard.reviewLeaves', 'Review leave queue')} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Outstanding Advances & Loans */}
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              {t('hr.dashboard.loansAdvances', 'Active Advances & Loans')}
            </span>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              ৳{metrics ? (metrics.outstanding_advances + metrics.outstanding_loans).toLocaleString() : '—'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Adv: ৳{metrics?.outstanding_advances.toLocaleString() ?? 0}</span>
            <span>Loan: ৳{metrics?.outstanding_loans.toLocaleString() ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Attendance Distribution & Payroll Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Attendance Telemetry */}
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              {t('hr.dashboard.attendanceBreakdown', "Today's Attendance")}
            </h2>
            <Link
              to="/hr/attendance"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              {t('hr.dashboard.manageAttendance', 'Details')} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>{t('hr.attendance.present', 'Present')}</span>
                <span className="text-emerald-400 font-semibold">{metrics?.attendance_today.present ?? 0}</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${presentPercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>{t('hr.attendance.late', 'Late Arrival')}</span>
                <span className="text-amber-400 font-semibold">{metrics?.attendance_today.late ?? 0}</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${attendanceTotal > 0 && metrics ? (metrics.attendance_today.late / attendanceTotal) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>{t('hr.attendance.onLeave', 'On Approved Leave')}</span>
                <span className="text-blue-400 font-semibold">{metrics?.attendance_today.on_leave ?? 0}</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${attendanceTotal > 0 && metrics ? (metrics.attendance_today.on_leave / attendanceTotal) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>{t('hr.attendance.absent', 'Absent / Unrecorded')}</span>
                <span className="text-rose-400 font-semibold">{metrics?.attendance_today.absent ?? 0}</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${attendanceTotal > 0 && metrics ? (metrics.attendance_today.absent / attendanceTotal) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 flex items-center justify-between text-xs text-slate-300">
            <span>{t('hr.attendance.liveDate', 'Shift Date')}: {metrics?.attendance_today.date}</span>
            <span className="text-emerald-400 font-medium">● Live Tracking</span>
          </div>
        </div>

        {/* Payroll Health & Latest Run */}
        <div className="lg:col-span-2 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-indigo-400" />
              {t('hr.dashboard.payrollOverview', 'Payroll Operations & General Ledger Health')}
            </h2>
            <Link
              to="/hr/payroll"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              {t('hr.dashboard.managePayroll', 'Payroll Runs')} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
              <span className="text-xs text-slate-400 block mb-1">
                {t('hr.dashboard.ytdGross', 'YTD Gross Salary Expense')}
              </span>
              <span className="text-xl font-bold text-white">
                ৳{payrollMetrics ? payrollMetrics.ytd_gross_payroll.toLocaleString() : '0.00'}
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">Authoritative GL Posted</span>
            </div>

            <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
              <span className="text-xs text-slate-400 block mb-1">
                {t('hr.dashboard.ytdNet', 'YTD Net Disbursements')}
              </span>
              <span className="text-xl font-bold text-emerald-400">
                ৳{payrollMetrics ? payrollMetrics.ytd_net_payroll.toLocaleString() : '0.00'}
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">Bank / Cash Settle Outflow</span>
            </div>
          </div>

          {payrollMetrics?.latest_run ? (
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">
                    {payrollMetrics.latest_run.run_number}
                  </span>
                  <span className="text-xs text-slate-400">
                    {payrollMetrics.latest_run.period_name || 'Latest Period'}
                  </span>
                </div>
                <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {payrollMetrics.latest_run.status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-700/60 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Gross</span>
                  <span className="font-semibold text-white">৳{payrollMetrics.latest_run.total_gross.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Deductions</span>
                  <span className="font-semibold text-rose-400">৳{payrollMetrics.latest_run.total_deductions.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Net Pay</span>
                  <span className="font-semibold text-emerald-400">৳{payrollMetrics.latest_run.total_net.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Paid Out</span>
                  <span className="font-semibold text-white">৳{payrollMetrics.latest_run.total_paid.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-800/20 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
              No recent payroll runs recorded.
            </div>
          )}
        </div>
      </div>

      {/* Quick Access Navigation Modules */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Link
          to="/hr/employees"
          className="p-4 bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700 rounded-xl transition flex flex-col items-center text-center group"
        >
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl mb-2 group-hover:scale-105 transition">
            <Users className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-white">Employees</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Profiles & 360</span>
        </Link>

        <Link
          to="/hr/departments"
          className="p-4 bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700 rounded-xl transition flex flex-col items-center text-center group"
        >
          <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl mb-2 group-hover:scale-105 transition">
            <Building className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-white">Departments</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Org Hierarchy</span>
        </Link>

        <Link
          to="/hr/attendance"
          className="p-4 bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700 rounded-xl transition flex flex-col items-center text-center group"
        >
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl mb-2 group-hover:scale-105 transition">
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-white">Attendance</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Shifts & Punches</span>
        </Link>

        <Link
          to="/hr/leaves"
          className="p-4 bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700 rounded-xl transition flex flex-col items-center text-center group"
        >
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl mb-2 group-hover:scale-105 transition">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-white">Leave Mgmt</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Balances & Approvals</span>
        </Link>

        <Link
          to="/hr/payroll"
          className="p-4 bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700 rounded-xl transition flex flex-col items-center text-center group"
        >
          <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl mb-2 group-hover:scale-105 transition">
            <DollarSign className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-white">Payroll</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Salary & Posting</span>
        </Link>

        <Link
          to="/hr/advances-loans"
          className="p-4 bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700 rounded-xl transition flex flex-col items-center text-center group"
        >
          <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl mb-2 group-hover:scale-105 transition">
            <CreditCard className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-white">Advances & Loans</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Disbursement & Deductions</span>
        </Link>
      </div>
    </div>
  );
};

export default HrDashboard;
