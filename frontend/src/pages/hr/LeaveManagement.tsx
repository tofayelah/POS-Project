import React, { useEffect, useState } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  AlertCircle,
  X,
  Layers,
  Clock,
  User,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import { hrApi } from '../../api/hr';
import { LeaveApplication, LeaveBalance, LeaveType, Employee } from '../../types/hr';

export const LeaveManagement: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'APPLICATIONS' | 'BALANCES' | 'TYPES'>('APPLICATIONS');
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('SUBMITTED');

  // Apply Leave Modal
  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);
  const [applyForm, setApplyForm] = useState({
    employee_id: '',
    leave_type_id: '',
    from_date: new Date().toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0],
    reason: '',
  });

  // Rejection Modal
  const [rejectAppId, setRejectAppId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  // Create Leave Type Modal
  const [isTypeModalOpen, setIsTypeModalOpen] = useState<boolean>(false);
  const [typeForm, setTypeForm] = useState({
    name: '',
    code: '',
    is_paid: true,
    default_days_per_year: 14,
    description: '',
  });

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const appParams = statusFilter === 'ALL' ? {} : { status: statusFilter };
      const [appData, balData, typeData, empData] = await Promise.all([
        hrApi.getLeaveApplications(appParams),
        hrApi.getLeaveBalances(),
        hrApi.getLeaveTypes(),
        hrApi.getEmployees(),
      ]);
      setApplications(appData);
      setBalances(balData);
      setLeaveTypes(typeData);
      setEmployees(empData);
    } catch (err) {
      console.error('Failed to load leave records', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    setSubmitting(true);
    try {
      await hrApi.approveLeave(id);
      setMsg({ type: 'success', text: 'Leave application approved.' });
      loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to approve leave.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectAppId) return;
    setSubmitting(true);
    try {
      await hrApi.rejectLeave(rejectAppId, rejectReason);
      setMsg({ type: 'success', text: 'Leave application rejected.' });
      setRejectAppId(null);
      setRejectReason('');
      loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to reject leave.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await hrApi.applyLeave({
        employee_id: Number(applyForm.employee_id),
        leave_type_id: Number(applyForm.leave_type_id),
        from_date: applyForm.from_date,
        to_date: applyForm.to_date,
        reason: applyForm.reason,
      });
      setMsg({ type: 'success', text: 'Leave application submitted successfully.' });
      setIsApplyModalOpen(false);
      setApplyForm({
        employee_id: '',
        leave_type_id: '',
        from_date: new Date().toISOString().split('T')[0],
        to_date: new Date().toISOString().split('T')[0],
        reason: '',
      });
      loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to apply leave.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await hrApi.createLeaveType({
        name: typeForm.name,
        code: typeForm.code,
        is_paid: typeForm.is_paid,
        default_days_per_year: Number(typeForm.default_days_per_year),
        description: typeForm.description,
      });
      setMsg({ type: 'success', text: 'Leave policy created.' });
      setIsTypeModalOpen(false);
      setTypeForm({
        name: '',
        code: '',
        is_paid: true,
        default_days_per_year: 14,
        description: '',
      });
      loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to create leave type.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                {t('hr.leave.title', 'Leave Management & Balances')}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('hr.leave.subtitle', 'Employee leave applications, approvals, policy limits, and balance ledger')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setIsApplyModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-xl shadow-lg shadow-amber-600/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Apply Leave
          </button>
          <button
            onClick={() => setIsTypeModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            Leave Policies
          </button>
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-2 border ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Tabs and Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('APPLICATIONS')}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'APPLICATIONS'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            Applications ({applications.length})
          </button>
          <button
            onClick={() => setActiveTab('BALANCES')}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'BALANCES'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Balances Ledger
          </button>
          <button
            onClick={() => setActiveTab('TYPES')}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'TYPES'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Policies & Types ({leaveTypes.length})
          </button>
        </div>

        {activeTab === 'APPLICATIONS' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800 text-white text-xs px-3 py-2 rounded-xl border border-slate-700"
            >
              <option value="SUBMITTED">SUBMITTED (Pending Review)</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="ALL">ALL APPLICATIONS</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab Panels */}
      {activeTab === 'APPLICATIONS' && (
        <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/50 text-slate-400 uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Leave Policy</th>
                <th className="py-3 px-4">Dates</th>
                <th className="py-3 px-4">Days</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No leave applications matching status '{statusFilter}'.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-800/20">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-white block">
                        {app.employee ? `${app.employee.first_name} ${app.employee.last_name}` : `EMP #${app.employee_id}`}
                      </span>
                      <span className="text-[10px] text-slate-400">{app.employee?.employee_number}</span>
                    </td>
                    <td className="py-3 px-4 text-white font-medium">
                      {app.leave_type?.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {app.from_date} to {app.to_date}
                    </td>
                    <td className="py-3 px-4 font-bold text-amber-400">
                      {app.days_applied ?? app.days} days
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                      {app.reason}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                        app.status === 'APPROVED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : app.status === 'SUBMITTED'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {app.status === 'SUBMITTED' && (
                        <>
                          <button
                            onClick={() => handleApprove(app.id)}
                            disabled={submitting}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setRejectAppId(app.id);
                              setRejectReason('');
                            }}
                            disabled={submitting}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'BALANCES' && (
        <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/50 text-slate-400 uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Leave Policy</th>
                <th className="py-3 px-4">Year</th>
                <th className="py-3 px-4">Entitled</th>
                <th className="py-3 px-4">Taken / Used</th>
                <th className="py-3 px-4">Pending</th>
                <th className="py-3 px-4">Remaining Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {balances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No balance records found.
                  </td>
                </tr>
              ) : (
                balances.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/20">
                    <td className="py-3 px-4 text-white font-medium">EMP #{b.employee_id}</td>
                    <td className="py-3 px-4 text-slate-300">{b.leave_type?.name || 'Leave'}</td>
                    <td className="py-3 px-4 text-slate-400">{b.year}</td>
                    <td className="py-3 px-4 text-slate-300">{b.accrued_days || b.entitled_days || 0}</td>
                    <td className="py-3 px-4 text-rose-400">{b.used_days || b.taken_days || 0}</td>
                    <td className="py-3 px-4 text-amber-400">{b.pending_days || 0}</td>
                    <td className="py-3 px-4 font-bold text-emerald-400">{b.remaining_days} days</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'TYPES' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {leaveTypes.map((t) => (
            <div key={t.id} className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-white text-sm">{t.name}</h3>
                  <span className="font-mono text-[11px] text-slate-400">{t.code}</span>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${t.is_paid ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400'}`}>
                  {t.is_paid ? 'Paid Leave' : 'Unpaid Leave'}
                </span>
              </div>
              <p className="text-xs text-slate-400">{t.description || 'Standard corporate leave quota'}</p>
              <div className="pt-2 border-t border-slate-800 text-xs flex justify-between text-slate-300">
                <span>Annual Allocation:</span>
                <span className="font-bold text-white">{t.default_days_per_year} Days</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Apply Leave Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white">Apply for Employee Leave</h2>
              <button onClick={() => setIsApplyModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleApplyLeave} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Employee *</label>
                <select
                  required
                  value={applyForm.employee_id}
                  onChange={(e) => setApplyForm({ ...applyForm, employee_id: e.target.value })}
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select Employee</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_number})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Leave Policy / Type *</label>
                <select
                  required
                  value={applyForm.leave_type_id}
                  onChange={(e) => setApplyForm({ ...applyForm, leave_type_id: e.target.value })}
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select Leave Policy</option>
                  {leaveTypes.map((lt) => (
                    <option key={lt.id} value={lt.id}>{lt.name} ({lt.is_paid ? 'Paid' : 'Unpaid'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">From Date *</label>
                  <input
                    type="date"
                    required
                    value={applyForm.from_date}
                    onChange={(e) => setApplyForm({ ...applyForm, from_date: e.target.value })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">To Date *</label>
                  <input
                    type="date"
                    required
                    value={applyForm.to_date}
                    onChange={(e) => setApplyForm({ ...applyForm, to_date: e.target.value })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Reason for Leave *</label>
                <textarea
                  required
                  rows={3}
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  placeholder="e.g. Medical emergency, family vacation..."
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl shadow-md"
                >
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectAppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white">Reject Leave Application</h2>
              <button onClick={() => setRejectAppId(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleReject} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Reason for Rejection *</label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Peak operational demand during festival sales..."
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRejectAppId(null)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-xl shadow-md"
                >
                  {submitting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Leave Type Modal */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white">Create Leave Policy</h2>
              <button onClick={() => setIsTypeModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateType} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Policy / Leave Name *</label>
                <input
                  type="text"
                  required
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  placeholder="e.g. Medical / Sick Leave"
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Code *</label>
                <input
                  type="text"
                  required
                  value={typeForm.code}
                  onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })}
                  placeholder="e.g. SICK"
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Default Days Per Year *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={typeForm.default_days_per_year}
                  onChange={(e) => setTypeForm({ ...typeForm, default_days_per_year: Number(e.target.value) })}
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="paidCheck"
                  checked={typeForm.is_paid}
                  onChange={(e) => setTypeForm({ ...typeForm, is_paid: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600"
                />
                <label htmlFor="paidCheck" className="text-slate-300">
                  Paid Leave (Salary not deducted)
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTypeModalOpen(false)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-md"
                >
                  {submitting ? 'Saving...' : 'Save Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveManagement;
