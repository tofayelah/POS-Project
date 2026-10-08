import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { financeApi } from '../../api/finance';
import { FinancialPeriodExtended, PeriodClosingCheck, YearEndClosing } from '../../types/finance';
import {
  CalendarCheck,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  FileText,
  RotateCcw,
  ShieldAlert,
  Archive,
  Info
} from 'lucide-react';

export const FinancialPeriodManagement: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [periods, setPeriods] = useState<FinancialPeriodExtended[]>([]);
  const [yearEndClosings, setYearEndClosings] = useState<YearEndClosing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Pre-close check state
  const [selectedPeriod, setSelectedPeriod] = useState<FinancialPeriodExtended | null>(null);
  const [closingCheck, setClosingCheck] = useState<PeriodClosingCheck | null>(null);
  const [showCheckModal, setShowCheckModal] = useState<boolean>(false);

  // Reopen modal state
  const [showReopenModal, setShowReopenModal] = useState<boolean>(false);
  const [reopenReason, setReopenReason] = useState<string>('');

  // Year-end closing preview state
  const [selectedFiscalYearId, setSelectedFiscalYearId] = useState<number>(1);
  const [closingPreview, setClosingPreview] = useState<any>(null);
  const [showYearEndModal, setShowYearEndModal] = useState<boolean>(false);
  const [retainedEarningsAccId, setRetainedEarningsAccId] = useState<number>(1);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [pRes, yRes] = await Promise.all([
        financeApi.getFinancialPeriods(),
        financeApi.getYearEndClosings(),
      ]);
      setPeriods(pRes.data.data);
      setYearEndClosings(yRes.data.data);
      if (pRes.data.data.length > 0) {
        setSelectedFiscalYearId(pRes.data.data[0].fiscal_year_id);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error loading financial periods');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCheck = async (period: FinancialPeriodExtended) => {
    try {
      setSelectedPeriod(period);
      const res = await financeApi.getPeriodClosingChecks(period.id);
      setClosingCheck(res.data.data);
      setShowCheckModal(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to check period pre-close criteria');
    }
  };

  const handleSoftLock = async (periodId: number) => {
    try {
      await financeApi.softLockPeriod(periodId);
      setActionSuccess('Period soft-locked successfully');
      setShowCheckModal(false);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to soft-lock period');
    }
  };

  const handleClose = async (periodId: number) => {
    try {
      await financeApi.closePeriod(periodId);
      setActionSuccess('Period officially closed and locked');
      setShowCheckModal(false);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to close period');
    }
  };

  const handleReopen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeriod) return;
    try {
      await financeApi.reopenPeriod(selectedPeriod.id, { reason: reopenReason });
      setActionSuccess('Period reopened with supervisory audit log');
      setShowReopenModal(false);
      setReopenReason('');
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to reopen period');
    }
  };

  const handlePreviewYearEnd = async () => {
    try {
      const res = await financeApi.previewYearEndClosing({ fiscal_year_id: selectedFiscalYearId });
      setClosingPreview(res.data.data);
      setShowYearEndModal(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to preview year-end figures');
    }
  };

  const handleExecuteYearEnd = async () => {
    try {
      await financeApi.executeYearEndClosing({
        fiscal_year_id: selectedFiscalYearId,
        closing_date: new Date().toISOString().split('T')[0],
        retained_earnings_account_id: retainedEarningsAccId,
      });
      setActionSuccess('Year-end closing journal posted and Retained Earnings balanced');
      setShowYearEndModal(false);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to execute year-end closing');
    }
  };

  const handleRollbackYearEnd = async (id: number) => {
    if (!window.confirm('Are you sure you want to rollback this year-end closing?')) return;
    try {
      await financeApi.rollbackYearEndClosing(id);
      setActionSuccess('Year-end closing successfully rolled back');
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to rollback year-end closing');
    }
  };

  const formatBDT = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '৳0.00';
    return `৳${Number(amount).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('finance.periodClosingTitle', 'Financial Period Governance & Year-End Closing')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('finance.periodClosingSubtitle', 'Accounting Period Soft-Locks, Pre-Close Checklists & Retained Earnings Clearing')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePreviewYearEnd}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700"
          >
            <Archive className="w-4 h-4 mr-2" />
            {t('finance.yearEndClosing', 'Year-End Closing')}
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 border-l-4 border-emerald-500 rounded text-emerald-700 dark:text-emerald-300 text-sm flex justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-700">✕</button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded text-red-700 dark:text-red-300 text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* Accounting Periods Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {t('finance.accountingPeriods', 'Accounting Periods & Lock Status')}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3">Period Name</th>
                <th className="px-6 py-3">Fiscal Year</th>
                <th className="px-6 py-3">Start Date</th>
                <th className="px-6 py-3">End Date</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {periods.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    No accounting periods configured.
                  </td>
                </tr>
              ) : (
                periods.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                      {p.name}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {p.fiscal_year?.name || 'FY-Current'}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{p.start_date}</td>
                    <td className="px-6 py-4 font-mono text-xs">{p.end_date}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                        p.status === 'OPEN'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400'
                          : p.status === 'SOFT_LOCK'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-400'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {p.status !== 'CLOSED' && (
                          <button
                            onClick={() => handleOpenCheck(p)}
                            className="px-2.5 py-1 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded font-medium"
                          >
                            Pre-Close Check
                          </button>
                        )}
                        {p.status === 'CLOSED' && (
                          <button
                            onClick={() => {
                              setSelectedPeriod(p);
                              setShowReopenModal(true);
                            }}
                            className="px-2.5 py-1 text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 rounded font-medium flex items-center"
                          >
                            <Unlock className="w-3 h-3 mr-1" /> Reopen
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Year-End Closings History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {t('finance.yearEndHistory', 'Historical Year-End Closings')}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3">Closing Date</th>
                <th className="px-6 py-3 text-right">Total Revenue</th>
                <th className="px-6 py-3 text-right">Total Expense</th>
                <th className="px-6 py-3 text-right">Net Profit / (Loss)</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {yearEndClosings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-gray-400">
                    No year-end closings executed yet.
                  </td>
                </tr>
              ) : (
                yearEndClosings.map((y) => (
                  <tr key={y.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-3 font-semibold text-gray-900 dark:text-white">{y.closing_date}</td>
                    <td className="px-6 py-3 text-right text-emerald-600 font-mono">{formatBDT(y.total_revenue)}</td>
                    <td className="px-6 py-3 text-right text-rose-600 font-mono">{formatBDT(y.total_expense)}</td>
                    <td className={`px-6 py-3 text-right font-bold ${
                      y.net_profit_loss >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {formatBDT(y.net_profit_loss)}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        y.is_rolled_back ? 'bg-gray-200 text-gray-700' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {y.is_rolled_back ? 'ROLLED BACK' : 'FINALIZED'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      {!y.is_rolled_back && (
                        <button
                          onClick={() => handleRollbackYearEnd(y.id)}
                          className="text-xs text-rose-600 hover:text-rose-800 underline"
                        >
                          Rollback
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pre-Close Checklist Modal */}
      {showCheckModal && selectedPeriod && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-indigo-600" />
              Pre-Close Validation: {selectedPeriod.name}
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-lg space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>Unposted Draft Journals:</span>
                  <span className={`font-bold ${closingCheck?.unposted_journals_count === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {closingCheck?.unposted_journals_count} items
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Unreconciled Bank Lines:</span>
                  <span className={`font-bold ${closingCheck?.unreconciled_bank_statements_count === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {closingCheck?.unreconciled_bank_statements_count} lines
                  </span>
                </div>
              </div>

              {closingCheck?.warnings && closingCheck.warnings.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-800 dark:text-amber-300 text-xs space-y-1">
                  {closingCheck.warnings.map((w, idx) => (
                    <div key={idx}>⚠️ {w}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-between items-center pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowCheckModal(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <div className="flex gap-2">
                {selectedPeriod.status === 'OPEN' && (
                  <button
                    onClick={() => handleSoftLock(selectedPeriod.id)}
                    className="px-3 py-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded font-medium flex items-center"
                  >
                    <Lock className="w-3.5 h-3.5 mr-1" /> Soft-Lock (Block General Posting)
                  </button>
                )}
                <button
                  onClick={() => handleClose(selectedPeriod.id)}
                  disabled={!closingCheck?.can_close}
                  className="px-3 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded font-medium flex items-center"
                >
                  <Archive className="w-3.5 h-3.5 mr-1" /> Close Period Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Privileged Reopen Modal */}
      {showReopenModal && selectedPeriod && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              Privileged Reopen: {selectedPeriod.name}
            </h3>
            <p className="text-xs text-gray-500">
              Reopening a closed financial period requires administrative justification and will be permanently recorded in the audit trail.
            </p>
            <form onSubmit={handleReopen} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Audit Justification Reason *</label>
                <textarea
                  required
                  rows={3}
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="e.g. Audit adjustment required for external statutory reporting."
                  className="w-full px-3 py-2 border rounded-lg text-xs dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowReopenModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded font-medium"
                >
                  Confirm Privileged Reopen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Year-End Closing Modal */}
      {showYearEndModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Year-End Closing Execution
            </h3>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-lg space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Total Revenue to Clear:</span>
                <span className="font-bold text-emerald-600">{formatBDT(closingPreview?.total_revenue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Expenses to Clear:</span>
                <span className="font-bold text-rose-600">{formatBDT(closingPreview?.total_expense)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-bold">
                <span>Net Transfer to Retained Earnings:</span>
                <span className={closingPreview?.net_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                  {formatBDT(closingPreview?.net_profit)}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Retained Earnings Account ID</label>
              <input
                type="number"
                value={retainedEarningsAccId}
                onChange={(e) => setRetainedEarningsAccId(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowYearEndModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteYearEnd}
                className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                Post Closing Journal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
