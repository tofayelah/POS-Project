import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  DollarSign,
  User,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import { hrApi } from '../../api/hr';
import { EmployeeAdvance, EmployeeLoan, Employee } from '../../types/hr';

export const AdvanceLoanManagement: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'ADVANCES' | 'LOANS'>('ADVANCES');
  const [advances, setAdvances] = useState<EmployeeAdvance[]>([]);
  const [loans, setLoans] = useState<EmployeeLoan[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Advance Modals
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState<boolean>(false);
  const [advanceForm, setAdvanceForm] = useState({
    employee_id: '',
    amount: '',
    reason: '',
  });

  // Loan Modals
  const [isLoanModalOpen, setIsLoanModalOpen] = useState<boolean>(false);
  const [loanForm, setLoanForm] = useState({
    employee_id: '',
    principal_amount: '',
    installment_count: '6',
    interest_rate_percent: '0',
  });

  // Disbursement Modal (Generic for both)
  const [disburseType, setDisburseType] = useState<'ADVANCE' | 'LOAN' | null>(null);
  const [disburseId, setDisburseId] = useState<number | null>(null);
  const [disburseMethod, setDisburseMethod] = useState<string>('BANK_TRANSFER');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const [advData, loanData, empData] = await Promise.all([
        hrApi.getAdvances(),
        hrApi.getLoans(),
        hrApi.getEmployees(),
      ]);
      setAdvances(advData);
      setLoans(loanData);
      setEmployees(empData);
    } catch (err) {
      console.error('Failed to load advances and loans', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await hrApi.requestAdvance({
        employee_id: Number(advanceForm.employee_id),
        amount: Number(advanceForm.amount),
        reason: advanceForm.reason,
      });
      setMsg({ type: 'success', text: 'Advance requested in SUBMITTED state.' });
      setIsAdvanceModalOpen(false);
      setAdvanceForm({ employee_id: '', amount: '', reason: '' });
      loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to request advance.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveAdvance = async (id: number) => {
    setSubmitting(true);
    try {
      await hrApi.approveAdvance(id);
      setMsg({ type: 'success', text: 'Advance APPROVED for disbursement.' });
      loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to approve advance.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await hrApi.requestLoan({
        employee_id: Number(loanForm.employee_id),
        principal_amount: Number(loanForm.principal_amount),
        installment_count: Number(loanForm.installment_count),
        interest_rate_percent: Number(loanForm.interest_rate_percent),
      });
      setMsg({ type: 'success', text: 'Loan created and APPROVED for disbursement.' });
      setIsLoanModalOpen(false);
      setLoanForm({ employee_id: '', principal_amount: '', installment_count: '6', interest_rate_percent: '0' });
      loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to create loan.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisburse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disburseId || !disburseType) return;
    setSubmitting(true);
    try {
      if (disburseType === 'ADVANCE') {
        await hrApi.disburseAdvance(disburseId, { payment_method: disburseMethod });
        setMsg({ type: 'success', text: 'Advance DISBURSED! Authoritative journal posted to General Ledger.' });
      } else {
        await hrApi.disburseLoan(disburseId, { payment_method: disburseMethod });
        setMsg({ type: 'success', text: 'Loan DISBURSED! Authoritative journal posted to General Ledger.' });
      }
      setDisburseId(null);
      setDisburseType(null);
      loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Disbursement failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const totalOutstandingAdvances = advances
    .filter((a) => a.status === 'DISBURSED' || a.status === 'PARTIALLY_SETTLED')
    .reduce((acc, a) => acc + Number(a.outstanding_amount), 0);

  const totalOutstandingLoans = loans
    .filter((l) => l.status === 'ACTIVE')
    .reduce((acc, l) => acc + Number(l.outstanding_balance), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                {t('hr.loans.title', 'Employee Advances & Loans Management')}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('hr.loans.subtitle', 'Salary advance requests, company loan disbursements, automated payroll deductions & GL asset tracking')}
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
            onClick={() => setIsAdvanceModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium rounded-xl shadow-lg shadow-rose-600/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Request Advance
          </button>
          <button
            onClick={() => setIsLoanModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Loan
          </button>
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-2 border ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80">
          <span className="text-xs text-slate-400 font-medium block mb-1">
            Total Outstanding Advances (GL Asset)
          </span>
          <span className="text-2xl font-bold text-amber-400">
            ৳{totalOutstandingAdvances.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">
            Will be auto-recovered during subsequent payroll runs
          </span>
        </div>

        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80">
          <span className="text-xs text-slate-400 font-medium block mb-1">
            Total Outstanding Loans (GL Asset)
          </span>
          <span className="text-2xl font-bold text-indigo-400">
            ৳{totalOutstandingLoans.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">
            Scheduled monthly payroll installment deductions
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveTab('ADVANCES')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'ADVANCES'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          Salary Advances ({advances.length})
        </button>
        <button
          onClick={() => setActiveTab('LOANS')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'LOANS'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          Company Loans ({loans.length})
        </button>
      </div>

      {/* Advances Table */}
      {activeTab === 'ADVANCES' && (
        <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/50 text-slate-400 uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Advance #</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Requested Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Outstanding</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {advances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No salary advances recorded. Click "Request Advance" to submit.
                  </td>
                </tr>
              ) : (
                advances.map((adv) => (
                  <tr key={adv.id} className="hover:bg-slate-800/20">
                    <td className="py-3 px-4 font-mono font-semibold text-white">
                      {adv.advance_number}
                    </td>
                    <td className="py-3 px-4 text-white">
                      EMP #{adv.employee_id} {adv.employee ? `(${adv.employee.first_name} ${adv.employee.last_name})` : ''}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {adv.request_date}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      ৳{Number(adv.amount).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-amber-400">
                      ৳{Number(adv.outstanding_amount).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                        adv.status === 'SETTLED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : adv.status === 'DISBURSED'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : adv.status === 'APPROVED'
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {adv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {adv.status === 'SUBMITTED' && (
                        <button
                          onClick={() => handleApproveAdvance(adv.id)}
                          disabled={submitting}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
                        >
                          Approve
                        </button>
                      )}
                      {adv.status === 'APPROVED' && (
                        <button
                          onClick={() => {
                            setDisburseId(adv.id);
                            setDisburseType('ADVANCE');
                          }}
                          disabled={submitting}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
                        >
                          Disburse
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

      {/* Loans Table */}
      {activeTab === 'LOANS' && (
        <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/50 text-slate-400 uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Loan #</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Principal</th>
                <th className="py-3 px-4">Monthly Installment</th>
                <th className="py-3 px-4">Installments Count</th>
                <th className="py-3 px-4">Remaining Balance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    No employee loans found. Click "Create Loan" to set up a new loan.
                  </td>
                </tr>
              ) : (
                loans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-800/20">
                    <td className="py-3 px-4 font-mono font-semibold text-white">
                      {loan.loan_number}
                    </td>
                    <td className="py-3 px-4 text-white">
                      EMP #{loan.employee_id} {loan.employee ? `(${loan.employee.first_name} ${loan.employee.last_name})` : ''}
                    </td>
                    <td className="py-3 px-4 text-white font-semibold">
                      ৳{Number(loan.principal_amount).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      ৳{Number(loan.installment_amount).toLocaleString()} / mo
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {loan.installment_count} months
                    </td>
                    <td className="py-3 px-4 font-bold text-indigo-400">
                      ৳{Number(loan.outstanding_balance).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                        loan.status === 'PAID_OFF'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : loan.status === 'ACTIVE'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      }`}>
                        {loan.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {loan.status === 'APPROVED' && (
                        <button
                          onClick={() => {
                            setDisburseId(loan.id);
                            setDisburseType('LOAN');
                          }}
                          disabled={submitting}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
                        >
                          Disburse
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

      {/* Request Advance Modal */}
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white">Request Salary Advance</h2>
              <button onClick={() => setIsAdvanceModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRequestAdvance} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Employee *</label>
                <select
                  required
                  value={advanceForm.employee_id}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, employee_id: e.target.value })}
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                >
                  <option value="">Select Employee</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_number})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Advance Amount (৳) *</label>
                <input
                  type="number"
                  required
                  min={100}
                  value={advanceForm.amount}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                  placeholder="e.g. 10000"
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Reason *</label>
                <textarea
                  required
                  rows={3}
                  value={advanceForm.reason}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
                  placeholder="e.g. Festival advance, emergency medical"
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdvanceModalOpen(false)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-xl shadow-md"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Loan Modal */}
      {isLoanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white">Create Employee Loan</h2>
              <button onClick={() => setIsLoanModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateLoan} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Employee *</label>
                <select
                  required
                  value={loanForm.employee_id}
                  onChange={(e) => setLoanForm({ ...loanForm, employee_id: e.target.value })}
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                >
                  <option value="">Select Employee</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_number})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Principal Amount (৳) *</label>
                <input
                  type="number"
                  required
                  min={1000}
                  value={loanForm.principal_amount}
                  onChange={(e) => setLoanForm({ ...loanForm, principal_amount: e.target.value })}
                  placeholder="e.g. 50000"
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Installment Count *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={60}
                    value={loanForm.installment_count}
                    onChange={(e) => setLoanForm({ ...loanForm, installment_count: e.target.value })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Interest Rate (%)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={loanForm.interest_rate_percent}
                    onChange={(e) => setLoanForm({ ...loanForm, interest_rate_percent: e.target.value })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsLoanModalOpen(false)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-md"
                >
                  {submitting ? 'Creating...' : 'Approve Loan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disburse Modal */}
      {disburseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white">Disburse {disburseType === 'ADVANCE' ? 'Advance' : 'Loan'}</h2>
              <button onClick={() => { setDisburseId(null); setDisburseType(null); }} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleDisburse} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Disbursement Channel *</label>
                <select
                  value={disburseMethod}
                  onChange={(e) => setDisburseMethod(e.target.value)}
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                >
                  <option value="BANK_TRANSFER">Bank Electronic Transfer</option>
                  <option value="CASH">Cash in Hand Disbursement</option>
                  <option value="MOBILE_BANKING">Mobile Banking (bKash/Nagad)</option>
                </select>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-xl">
                This triggers an automated General Ledger journal:
                <br />
                <span className="font-mono text-[11px] block mt-1">
                  DR {disburseType === 'ADVANCE' ? 'Employee Advance Asset' : 'Employee Loan Asset'}
                  <br />
                  CR Cash and Cash Equivalents
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setDisburseId(null); setDisburseType(null); }}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl shadow-md"
                >
                  {submitting ? 'Disbursing...' : 'Confirm Disbursement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvanceLoanManagement;
