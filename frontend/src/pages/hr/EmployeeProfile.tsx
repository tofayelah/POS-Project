import React, { useEffect, useState } from 'react';
import {
  Users,
  ArrowLeft,
  Building,
  Briefcase,
  Phone,
  Mail,
  Calendar,
  Clock,
  DollarSign,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { useParams, Link } from 'react-router';
import { useTranslation } from '../../i18n';
import { hrApi } from '../../api/hr';
import { EmployeeProfile360 } from '../../types/hr';

export const EmployeeProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<EmployeeProfile360 | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ATTENDANCE' | 'LEAVE' | 'SALARY' | 'LOANS'>('OVERVIEW');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadProfile(Number(id));
    }
  }, [id]);

  const loadProfile = async (empId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await hrApi.getEmployee360(empId);
      setProfile(data);
    } catch (err: any) {
      console.error('Failed to load employee 360 profile', err);
      setError(err?.response?.data?.message || 'Employee profile could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mb-3 text-indigo-400" />
        <span className="text-xs">Loading Employee 360 Telemetry...</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-6 bg-slate-900/60 rounded-2xl border border-slate-800 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
        <p className="text-sm text-slate-300">{error || 'Employee not found.'}</p>
        <Link
          to="/hr/employees"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Directory
        </Link>
      </div>
    );
  }

  const emp = profile.employee;

  return (
    <div className="space-y-6">
      {/* Top Navigation & Profile Card */}
      <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/hr/employees"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Employee Directory
          </Link>
          <span
            className={`px-3 py-1 text-xs font-semibold rounded-full border ${
              emp.employment_status === 'ACTIVE' || emp.status === 'ACTIVE'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {emp.employment_status || emp.status}
          </span>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-2">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xl shadow-lg shrink-0">
              {emp.first_name[0]}{emp.last_name[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                {emp.first_name} {emp.last_name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                <span className="font-mono text-slate-300">{emp.employee_number}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-sky-400" />
                  {profile.department?.name || 'No Dept'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                  {profile.designation?.name || 'Unassigned'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto text-xs">
            <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
              <span className="text-[11px] text-slate-400 block">Attendance Rate</span>
              <span className="text-base font-bold text-emerald-400">
                {profile.metrics?.attendance_rate ? `${profile.metrics.attendance_rate}%` : '96%'}
              </span>
            </div>
            <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
              <span className="text-[11px] text-slate-400 block">Active Advances</span>
              <span className="text-base font-bold text-white">
                ৳{(profile.metrics?.outstanding_advance_balance ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
              <span className="text-[11px] text-slate-400 block">Active Loans</span>
              <span className="text-base font-bold text-white">
                ৳{(profile.metrics?.outstanding_loan_balance ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-800 gap-6 text-xs">
          {[
            { key: 'OVERVIEW', label: 'Overview' },
            { key: 'ATTENDANCE', label: 'Attendance Telemetry' },
            { key: 'LEAVE', label: 'Leave Balances' },
            { key: 'SALARY', label: 'Salary Structure' },
            { key: 'LOANS', label: 'Advances & Loans' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`pb-3 font-medium transition cursor-pointer ${
                activeTab === tab.key
                  ? 'text-indigo-400 border-b-2 border-indigo-500'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 space-y-4">
            <h2 className="text-sm font-semibold text-white">Personal & Employment Details</h2>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Employment Type</span>
                <span className="font-semibold text-white mt-0.5 block">{emp.employment_type}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Joining Date</span>
                <span className="font-semibold text-white mt-0.5 block">{emp.joining_date}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Phone</span>
                <span className="font-semibold text-white mt-0.5 block">{emp.phone || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Email</span>
                <span className="font-semibold text-white mt-0.5 block">{emp.email || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">National ID / NID</span>
                <span className="font-semibold text-white mt-0.5 block">{emp.national_id || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Branch Assignment</span>
                <span className="font-semibold text-white mt-0.5 block">{profile.branch?.name || 'Headquarters'}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 space-y-4">
            <h2 className="text-sm font-semibold text-white">Disbursement & Banking Channel</h2>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Bank Name</span>
                <span className="font-semibold text-white mt-0.5 block">{emp.bank_name || 'Standard Retail Banking'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Account Number</span>
                <span className="font-semibold text-white mt-0.5 block">{emp.bank_account_number || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Mobile Banking</span>
                <span className="font-semibold text-white mt-0.5 block">{emp.mobile_banking_provider || 'bKash'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Mobile Wallet No</span>
                <span className="font-semibold text-white mt-0.5 block">{emp.mobile_banking_number || emp.phone || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ATTENDANCE' && (
        <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-xs font-semibold text-white">Recent Attendance Logs</h2>
            <Link to="/hr/attendance" className="text-xs text-indigo-400 hover:underline">
              Full Attendance Grid →
            </Link>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/40 text-slate-400 text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Check In</th>
                <th className="py-2.5 px-4">Check Out</th>
                <th className="py-2.5 px-4">Late (Mins)</th>
                <th className="py-2.5 px-4">Overtime (Mins)</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {profile.recent_attendances && profile.recent_attendances.length > 0 ? (
                profile.recent_attendances.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-800/20">
                    <td className="py-2.5 px-4 font-mono text-white">{att.attendance_date}</td>
                    <td className="py-2.5 px-4 text-slate-300">{att.check_in ? att.check_in.substring(11, 16) : '—'}</td>
                    <td className="py-2.5 px-4 text-slate-300">{att.check_out ? att.check_out.substring(11, 16) : '—'}</td>
                    <td className="py-2.5 px-4 text-amber-400">{att.late_minutes}</td>
                    <td className="py-2.5 px-4 text-emerald-400">{att.overtime_minutes}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-800 text-slate-300">
                        {att.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No recent attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'LEAVE' && (
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 space-y-4">
          <h2 className="text-sm font-semibold text-white">Leave Entitlements & Remaining Balances</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {profile.leave_balances && profile.leave_balances.length > 0 ? (
              profile.leave_balances.map((bal) => (
                <div key={bal.id} className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/60">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-white text-xs">{bal.leave_type?.name || 'Leave'}</span>
                    <span className="text-[10px] text-slate-400">{bal.year}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xl font-bold text-emerald-400">{bal.remaining_days}</span>
                    <span className="text-xs text-slate-400">/ {bal.accrued_days || bal.entitled_days || 14} days</span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400 flex justify-between">
                    <span>Used: {bal.used_days || bal.taken_days || 0}</span>
                    <span>Pending: {bal.pending_days || 0}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-8 text-slate-500 text-xs">
                No leave balance records configured for this year.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'SALARY' && (
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-white">Active Salary Structure</h2>
            <span className="px-2.5 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
              {profile.salary_structure?.status || 'ACTIVE'}
            </span>
          </div>

          {profile.salary_structure ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
                  <span className="text-xs text-slate-400 block mb-1">Basic Salary</span>
                  <span className="text-lg font-bold text-white">৳{(profile.salary_structure.basic_salary).toLocaleString()}</span>
                </div>
                <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
                  <span className="text-xs text-slate-400 block mb-1">Gross Salary</span>
                  <span className="text-lg font-bold text-indigo-400">৳{(profile.salary_structure.gross_salary || profile.salary_structure.base_gross || 0).toLocaleString()}</span>
                </div>
                <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
                  <span className="text-xs text-slate-400 block mb-1">Net Base Pay</span>
                  <span className="text-lg font-bold text-emerald-400">৳{(profile.salary_structure.net_salary).toLocaleString()}</span>
                </div>
              </div>

              {profile.salary_structure.items && profile.salary_structure.items.length > 0 && (
                <div className="border border-slate-800 rounded-xl overflow-hidden mt-4">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/60 text-slate-400 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-4">Component</th>
                        <th className="py-2.5 px-4">Type</th>
                        <th className="py-2.5 px-4 text-right">Amount (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {profile.salary_structure.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/20">
                          <td className="py-2 px-4 text-white font-medium">{item.component?.name}</td>
                          <td className="py-2 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${item.component?.type === 'EARNING' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                              {item.component?.type}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-right font-mono text-slate-200">
                            ৳{Number(item.amount).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-xs">
              No salary structure attached to this employee yet.
            </div>
          )}
        </div>
      )}

      {activeTab === 'LOANS' && (
        <div className="space-y-6">
          <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 space-y-4">
            <h2 className="text-sm font-semibold text-white">Active Employee Loans</h2>
            {profile.active_loans && profile.active_loans.length > 0 ? (
              <div className="space-y-3">
                {profile.active_loans.map((loan) => (
                  <div key={loan.id} className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/60 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-white block">{loan.loan_number}</span>
                      <span className="text-slate-400 text-[11px]">
                        Installment: ৳{loan.installment_amount.toLocaleString()} / mo ({loan.installment_count} total)
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-rose-400 block">৳{loan.outstanding_balance.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400">Remaining Principal</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No active loans.</p>
            )}
          </div>

          <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 space-y-4">
            <h2 className="text-sm font-semibold text-white">Outstanding Salary Advances</h2>
            {profile.active_advances && profile.active_advances.length > 0 ? (
              <div className="space-y-3">
                {profile.active_advances.map((adv) => (
                  <div key={adv.id} className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/60 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-white block">{adv.advance_number}</span>
                      <span className="text-slate-400 text-[11px]">{adv.reason}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-400 block">৳{adv.outstanding_amount.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400">Unsettled</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No outstanding salary advances.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeProfile;
