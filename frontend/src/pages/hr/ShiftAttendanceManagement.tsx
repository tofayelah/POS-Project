import React, { useEffect, useState } from 'react';
import {
  Clock,
  Calendar,
  UserCheck,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  AlertTriangle,
  ArrowRight,
  X,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import { hrApi } from '../../api/hr';
import { Attendance, Shift, Employee } from '../../types/hr';

export const ShiftAttendanceManagement: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'ATTENDANCE' | 'SHIFTS'>('ATTENDANCE');
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState<boolean>(true);

  // Punch In/Out Modal
  const [isPunchModalOpen, setIsPunchModalOpen] = useState<boolean>(false);
  const [punchEmployeeId, setPunchEmployeeId] = useState<string>('');
  const [punchAction, setPunchAction] = useState<'IN' | 'OUT'>('IN');

  // Adjustment Modal
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState<boolean>(false);
  const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjustCheckIn, setAdjustCheckIn] = useState<string>('');
  const [adjustCheckOut, setAdjustCheckOut] = useState<string>('');

  // Shift Modal
  const [isShiftModalOpen, setIsShiftModalOpen] = useState<boolean>(false);
  const [shiftForm, setShiftForm] = useState({
    name: '',
    code: '',
    start_time: '09:00',
    end_time: '18:00',
    grace_period_minutes: 15,
    break_duration_minutes: 60,
    is_overnight: false,
  });

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const [attData, shiftData, empData] = await Promise.all([
        hrApi.getAttendances({ date: selectedDate }),
        hrApi.getShifts(),
        hrApi.getEmployees(),
      ]);
      setAttendances(attData);
      setShifts(shiftData);
      setEmployees(empData);
    } catch (err) {
      console.error('Failed to load attendance records', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!punchEmployeeId) return;
    setSubmitting(true);
    setMsg(null);
    try {
      if (punchAction === 'IN') {
        await hrApi.checkIn({ employee_id: Number(punchEmployeeId) });
        setMsg({ type: 'success', text: 'Checked in successfully.' });
      } else {
        await hrApi.checkOut({ employee_id: Number(punchEmployeeId) });
        setMsg({ type: 'success', text: 'Checked out successfully.' });
      }
      setIsPunchModalOpen(false);
      setPunchEmployeeId('');
      loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to record punch.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttendance) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const adj = await hrApi.requestAdjustment({
        attendance_id: selectedAttendance.id,
        reason: adjustReason,
        new_check_in: adjustCheckIn || undefined,
        new_check_out: adjustCheckOut || undefined,
      });
      // Auto approve for admin
      await hrApi.approveAdjustment(adj.id);
      setMsg({ type: 'success', text: 'Attendance adjusted and approved.' });
      setIsAdjustmentModalOpen(false);
      setSelectedAttendance(null);
      loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Adjustment failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      await hrApi.createShift(shiftForm);
      setMsg({ type: 'success', text: 'Shift created successfully.' });
      setIsShiftModalOpen(false);
      setShiftForm({
        name: '',
        code: '',
        start_time: '09:00',
        end_time: '18:00',
        grace_period_minutes: 15,
        break_duration_minutes: 60,
        is_overnight: false,
      });
      loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to create shift.' });
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
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                {t('hr.attendance.title', 'Shift Management & Time Attendance')}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('hr.attendance.subtitle', 'Live check-in/out timestamps, automated late penalties, overtime calculation & shifts')}
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
            onClick={() => setIsPunchModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl shadow-lg shadow-emerald-600/20 transition cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            Record Time Punch
          </button>
          <button
            onClick={() => setIsShiftModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Shift
          </button>
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-2 border ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Tabs & Date Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('ATTENDANCE')}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'ATTENDANCE'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Daily Attendance Logs
          </button>
          <button
            onClick={() => setActiveTab('SHIFTS')}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'SHIFTS'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Shift Roster ({shifts.length})
          </button>
        </div>

        {activeTab === 'ATTENDANCE' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-800 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Tab Panels */}
      {activeTab === 'ATTENDANCE' && (
        <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/50 text-slate-400 uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Shift</th>
                <th className="py-3 px-4">Check In</th>
                <th className="py-3 px-4">Check Out</th>
                <th className="py-3 px-4">Worked Hours</th>
                <th className="py-3 px-4">Late / Early</th>
                <th className="py-3 px-4">OT (Mins)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {attendances.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    No attendance records for {selectedDate}. Use "Record Time Punch" to log punches.
                  </td>
                </tr>
              ) : (
                attendances.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-800/20">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">
                        {att.employee ? `${att.employee.first_name} ${att.employee.last_name}` : `EMP #${att.employee_id}`}
                      </div>
                      <span className="text-[10px] text-slate-400">{att.employee?.employee_number}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {att.shift?.name || 'Standard Day Shift'}
                    </td>
                    <td className="py-3 px-4 font-mono text-white">
                      {att.check_in ? att.check_in.substring(11, 16) : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-white">
                      {att.check_out ? att.check_out.substring(11, 16) : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {att.worked_minutes ? `${(att.worked_minutes / 60).toFixed(1)} hrs` : '0 hrs'}
                    </td>
                    <td className="py-3 px-4">
                      {att.late_minutes > 0 && (
                        <span className="text-amber-400 block font-medium">Late: {att.late_minutes}m</span>
                      )}
                      {att.early_leave_minutes > 0 && (
                        <span className="text-rose-400 block text-[10px]">Early: {att.early_leave_minutes}m</span>
                      )}
                      {att.late_minutes === 0 && att.early_leave_minutes === 0 && (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">
                      {att.overtime_minutes > 0 ? `+${att.overtime_minutes}m` : '0'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                        att.status === 'PRESENT'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : att.status === 'LATE'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {att.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedAttendance(att);
                          setAdjustReason('');
                          setAdjustCheckIn(att.check_in ? att.check_in.substring(11, 16) : '09:00');
                          setAdjustCheckOut(att.check_out ? att.check_out.substring(11, 16) : '18:00');
                          setIsAdjustmentModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'SHIFTS' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {shifts.map((s) => (
            <div key={s.id} className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-white text-sm">{s.name}</h3>
                  <span className="font-mono text-[11px] text-slate-400">{s.code}</span>
                </div>
                {s.is_overnight && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full">
                    Overnight (Night Shift)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                <div>
                  <span className="text-slate-400 text-[11px] block">Start Time</span>
                  <span className="font-semibold text-white font-mono">{s.start_time.substring(0, 5)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">End Time</span>
                  <span className="font-semibold text-white font-mono">{s.end_time.substring(0, 5)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Grace Period</span>
                  <span className="text-slate-300">{s.grace_period_minutes} mins</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Break Duration</span>
                  <span className="text-slate-300">{s.break_duration_minutes} mins</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Punch In / Out Modal */}
      {isPunchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                Record Time Punch
              </h2>
              <button onClick={() => setIsPunchModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handlePunch} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Select Employee *</label>
                <select
                  required
                  value={punchEmployeeId}
                  onChange={(e) => setPunchEmployeeId(e.target.value)}
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Punch Action *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPunchAction('IN')}
                    className={`py-2 rounded-xl font-medium cursor-pointer ${punchAction === 'IN' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                  >
                    Check In (Punch In)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPunchAction('OUT')}
                    className={`py-2 rounded-xl font-medium cursor-pointer ${punchAction === 'OUT' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                  >
                    Check Out (Punch Out)
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPunchModalOpen(false)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-md"
                >
                  {submitting ? 'Recording...' : 'Submit Punch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shift Modal */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white">Create Shift Configuration</h2>
              <button onClick={() => setIsShiftModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateShift} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Shift Name *</label>
                <input
                  type="text"
                  required
                  value={shiftForm.name}
                  onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                  placeholder="e.g. Night Store Shift"
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Shift Code *</label>
                <input
                  type="text"
                  required
                  value={shiftForm.code}
                  onChange={(e) => setShiftForm({ ...shiftForm, code: e.target.value })}
                  placeholder="e.g. NIGHT-01"
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={shiftForm.start_time}
                    onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={shiftForm.end_time}
                    onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="overnight"
                  checked={shiftForm.is_overnight}
                  onChange={(e) => setShiftForm({ ...shiftForm, is_overnight: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="overnight" className="text-slate-300">
                  Overnight Shift (crosses midnight, e.g. 22:00 to 06:00)
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-md"
                >
                  {submitting ? 'Creating...' : 'Save Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Adjustment Modal */}
      {isAdjustmentModalOpen && selectedAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white">Adjust Attendance Record</h2>
              <button onClick={() => setIsAdjustmentModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAdjustmentSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">New Check In</label>
                  <input
                    type="time"
                    value={adjustCheckIn}
                    onChange={(e) => setAdjustCheckIn(e.target.value)}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">New Check Out</label>
                  <input
                    type="time"
                    value={adjustCheckOut}
                    onChange={(e) => setAdjustCheckOut(e.target.value)}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Reason for Adjustment *</label>
                <textarea
                  required
                  rows={3}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Biometric device failure, verified by supervisor"
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdjustmentModalOpen(false)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-md"
                >
                  {submitting ? 'Submitting...' : 'Apply Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftAttendanceManagement;
