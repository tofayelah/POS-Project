import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  Play,
  Check,
  Send,
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  Filter,
  AlertCircle,
  X,
  FileText,
  Building,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import { hrApi } from '../../api/hr';
import { PayrollPeriod, PayrollRun, PayrollItem } from '../../types/hr';

export const PayrollManagement: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'RUNS' | 'PERIODS'>('RUNS');
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Selected run details drawer/modal
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);

  // Settle modal
  const [settleRunId, setSettleRunId] = useState<number | null>(null);
  const [settleMethod, setSettleMethod] = useState<string>('BANK_TRANSFER');

  // Create Period Modal
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState<boolean>(false);
  const [periodForm, setPeriodForm] = useState({
    name: `Payroll ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
    period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    period_end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    payment_due_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
  });

  // Create Run Modal
  const [isRunModalOpen, setIsRunModalOpen] = useState<boolean>(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');

  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const [runsData, periodsData] = await Promise.all([
        hrApi.getPayrollRuns(),
        hrApi.getPayrollPeriods(),
      ]);
      setRuns(runsData);
      setPeriods(periodsData);
    } catch (err) {
      console.error('Failed to load payroll operations', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await hrApi.createPayrollPeriod(periodForm);
      setMsg({ type: 'success', text: 'Payroll period opened.' });
      setIsPeriodModalOpen(false);
      loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to create period.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeriodId) return;
    setActionLoading(true);
    try {
      await hrApi.createPayrollRun({ payroll_period_id: Number(selectedPeriodId) });
      setMsg({ type: 'success', text: 'Payroll run initiated in DRAFT state.' });
      setIsRunModalOpen(false);
      loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to create run.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCalculate = async (runId: number) => {
    setActionLoading(true);
    try {
      const run = await hrApi.calculatePayrollRun(runId);
      setMsg({ type: 'success', text: `Calculated successfully. Gross: ৳${run.total_gross.toLocaleString()}, Net: ৳${run.total_net.toLocaleString()}` });
      loadData();
      if (selectedRun?.id === runId) setSelectedRun(run);
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Calculation failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (runId: number) => {
    setActionLoading(true);
    try {
      const run = await hrApi.approvePayrollRun(runId);
      setMsg({ type: 'success', text: 'Payroll run APPROVED for posting.' });
      loadData();
      if (selectedRun?.id === runId) setSelectedRun(run);
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Approval failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePost = async (runId: number) => {
    setActionLoading(true);
    try {
      const run = await hrApi.postPayrollRun(runId);
      setMsg({ type: 'success', text: `POSTED to General Ledger! Authoritative journal entry #${run.journal_entry_id} created.` });
      loadData();
      if (selectedRun?.id === runId) setSelectedRun(run);
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'GL Posting failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleRunId) return;
    setActionLoading(true);
    try {
      await hrApi.settlePayrollRun(settleRunId, { payment_method: settleMethod });
      setMsg({ type: 'success', text: 'Payroll payout settled and recorded.' });
      setSettleRunId(null);
      loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Payout settlement failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const openRunDetails = async (runId: number) => {
    try {
      const run = await hrApi.getPayrollRun(runId);
      setSelectedRun(run);
    } catch (err) {
      console.error('Failed to load run details', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                {t('hr.payroll.title', 'Enterprise Payroll Engine & GL Accounting')}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('hr.payroll.subtitle', 'Deterministic gross-to-net calculations, advance recovery, loan deductions, and balanced GL posting')}
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
            onClick={() => setIsRunModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-xl shadow-lg shadow-purple-600/20 transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            Initiate Payroll Run
          </button>
          <button
            onClick={() => setIsPeriodModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            New Period
          </button>
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-2 border ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveTab('RUNS')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'RUNS'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          Payroll Runs ({runs.length})
        </button>
        <button
          onClick={() => setActiveTab('PERIODS')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'PERIODS'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Fiscal Periods ({periods.length})
        </button>
      </div>

      {/* Runs Table */}
      {activeTab === 'RUNS' && (
        <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/50 text-slate-400 uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Run #</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Gross Expense</th>
                <th className="py-3 px-4">Deductions</th>
                <th className="py-3 px-4">Net Payout</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No payroll runs found. Click "Initiate Payroll Run" to start.
                  </td>
                </tr>
              ) : (
                runs.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-800/20">
                    <td className="py-3 px-4 font-mono font-semibold text-white">
                      {run.run_number}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {run.period?.name || `Period #${run.payroll_period_id}`}
                    </td>
                    <td className="py-3 px-4 text-white font-medium">
                      ৳{Number(run.total_gross).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-rose-400">
                      ৳{Number(run.total_deductions).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-400">
                      ৳{Number(run.total_net).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full border ${
                        run.status === 'POSTED'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : run.status === 'PAID'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : run.status === 'APPROVED'
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          : run.status === 'CALCULATED'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => openRunDetails(run.id)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                      >
                        Payslips
                      </button>

                      {run.status === 'DRAFT' && (
                        <button
                          onClick={() => handleCalculate(run.id)}
                          disabled={actionLoading}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition"
                        >
                          Calculate
                        </button>
                      )}

                      {run.status === 'CALCULATED' && (
                        <>
                          <button
                            onClick={() => handleCalculate(run.id)}
                            disabled={actionLoading}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                          >
                            Recalculate
                          </button>
                          <button
                            onClick={() => handleApprove(run.id)}
                            disabled={actionLoading}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition"
                          >
                            Approve
                          </button>
                        </>
                      )}

                      {run.status === 'APPROVED' && (
                        <button
                          onClick={() => handlePost(run.id)}
                          disabled={actionLoading}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
                        >
                          Post to GL
                        </button>
                      )}

                      {run.status === 'POSTED' && (
                        <button
                          onClick={() => setSettleRunId(run.id)}
                          disabled={actionLoading}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
                        >
                          Settle Payout
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Periods Table */}
      {activeTab === 'PERIODS' && (
        <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/50 text-slate-400 uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Period Name</th>
                <th className="py-3 px-4">Start Date</th>
                <th className="py-3 px-4">End Date</th>
                <th className="py-3 px-4">Payment Due Date</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {periods.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/20">
                  <td className="py-3 px-4 font-semibold text-white">{p.name}</td>
                  <td className="py-3 px-4 font-mono text-slate-300">{p.period_start}</td>
                  <td className="py-3 px-4 font-mono text-slate-300">{p.period_end}</td>
                  <td className="py-3 px-4 font-mono text-slate-300">{p.payment_due_date || '—'}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Run Payslips Drawer */}
      {selectedRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  Payroll Run {selectedRun.run_number} — Employee Payslips
                </h2>
                <span className="text-xs text-slate-400">
                  Status: {selectedRun.status} | Total Net: ৳{Number(selectedRun.total_net).toLocaleString()}
                </span>
              </div>
              <button onClick={() => setSelectedRun(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/50 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Employee</th>
                    <th className="py-2.5 px-3">Basic</th>
                    <th className="py-2.5 px-3">Allowances</th>
                    <th className="py-2.5 px-3">OT</th>
                    <th className="py-2.5 px-3">Gross</th>
                    <th className="py-2.5 px-3">Loan Ded.</th>
                    <th className="py-2.5 px-3">Adv Ded.</th>
                    <th className="py-2.5 px-3">Tax</th>
                    <th className="py-2.5 px-3">Net Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {selectedRun.items && selectedRun.items.length > 0 ? (
                    selectedRun.items.map((it) => (
                      <tr key={it.id} className="hover:bg-slate-800/20">
                        <td className="py-2 px-3 font-semibold text-white">
                          EMP #{it.employee_id}
                        </td>
                        <td className="py-2 px-3 font-mono">৳{Number(it.basic_salary).toLocaleString()}</td>
                        <td className="py-2 px-3 font-mono text-slate-300">৳{Number(it.allowances).toLocaleString()}</td>
                        <td className="py-2 px-3 font-mono text-emerald-400">৳{Number(it.overtime_amount).toLocaleString()}</td>
                        <td className="py-2 px-3 font-mono font-medium text-white">৳{Number(it.gross_pay).toLocaleString()}</td>
                        <td className="py-2 px-3 font-mono text-rose-400">৳{Number(it.loan_deduction).toLocaleString()}</td>
                        <td className="py-2 px-3 font-mono text-rose-400">৳{Number(it.advance_deduction).toLocaleString()}</td>
                        <td className="py-2 px-3 font-mono text-rose-400">৳{Number(it.tax_deduction).toLocaleString()}</td>
                        <td className="py-2 px-3 font-mono font-bold text-emerald-400">৳{Number(it.net_pay).toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500">
                        No calculated items for this run yet. Run calculation to generate individual employee payslips.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-900/60">
              <button
                onClick={() => setSelectedRun(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settle Payout Modal */}
      {settleRunId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white">Settle Payroll Payout</h2>
              <button onClick={() => setSettleRunId(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSettle} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Disbursement Channel / Method *</label>
                <select
                  value={settleMethod}
                  onChange={(e) => setSettleMethod(e.target.value)}
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                >
                  <option value="BANK_TRANSFER">Corporate Bank Electronic Transfer</option>
                  <option value="CASH">Operating Cash Disbursement</option>
                  <option value="MOBILE_BANKING">bKash / Nagad Corporate Wallet</option>
                </select>
              </div>

              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-xl">
                This action records the cash/bank outflow and closes the outstanding Salaries Payable liability for this run.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSettleRunId(null)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-md"
                >
                  {actionLoading ? 'Settling...' : 'Confirm Payout Settle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Period Modal */}
      {isPeriodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white">Open Payroll Period</h2>
              <button onClick={() => setIsPeriodModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreatePeriod} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Period Name *</label>
                <input
                  type="text"
                  required
                  value={periodForm.name}
                  onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={periodForm.period_start}
                    onChange={(e) => setPeriodForm({ ...periodForm, period_start: e.target.value })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={periodForm.period_end}
                    onChange={(e) => setPeriodForm({ ...periodForm, period_end: e.target.value })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPeriodModalOpen(false)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl shadow-md"
                >
                  {actionLoading ? 'Creating...' : 'Open Period'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Run Modal */}
      {isRunModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white">Initiate Payroll Run</h2>
              <button onClick={() => setIsRunModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateRun} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Select Payroll Period *</label>
                <select
                  required
                  value={selectedPeriodId}
                  onChange={(e) => setSelectedPeriodId(e.target.value)}
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                >
                  <option value="">Select Period</option>
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.period_start} to {p.period_end})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRunModalOpen(false)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl shadow-md"
                >
                  {actionLoading ? 'Initiating...' : 'Create Draft Run'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollManagement;
