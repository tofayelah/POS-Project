import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { financeApi } from '../../api/finance';
import { BankAccount, BankReconciliation, BankReconciliationMatch } from '../../types/finance';
import {
  FileCheck2,
  RefreshCw,
  Zap,
  CheckCircle,
  AlertTriangle,
  Scale,
  Trash2,
  Landmark,
  Plus
} from 'lucide-react';

export const BankReconciliationView: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number>(1);
  const [reconciliations, setReconciliations] = useState<BankReconciliation[]>([]);
  const [activeReconciliation, setActiveReconciliation] = useState<BankReconciliation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // New reconciliation modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [statementDate, setStatementDate] = useState(new Date().toISOString().split('T')[0]);
  const [stmtClosingBal, setStmtClosingBal] = useState<number>(0);

  const fetchAccountsAndReconciliations = async (accId?: number) => {
    try {
      setLoading(true);
      setError(null);
      const accRes = await financeApi.getBankAccounts();
      setAccounts(accRes.data.data);

      const targetAccId = accId || (accRes.data.data.length > 0 ? accRes.data.data[0].id : 1);
      setSelectedAccountId(targetAccId);

      const reconRes = await financeApi.getReconciliations({ bank_account_id: targetAccId });
      setReconciliations(reconRes.data.data);

      if (reconRes.data.data.length > 0) {
        // Load detailed reconciliation with matches
        const detailRes = await financeApi.getReconciliation(reconRes.data.data[0].id);
        setActiveReconciliation(detailRes.data.data);
      } else {
        setActiveReconciliation(null);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error loading bank reconciliations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountsAndReconciliations();
  }, []);

  const handleAccountChange = (accId: number) => {
    setSelectedAccountId(accId);
    fetchAccountsAndReconciliations(accId);
  };

  const handleCreateReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await financeApi.createReconciliation({
        bank_account_id: selectedAccountId,
        statement_date: statementDate,
        statement_closing_balance: stmtClosingBal,
      });
      setShowNewModal(false);
      setActionSuccess('Reconciliation session initiated');
      const detailRes = await financeApi.getReconciliation(res.data.data.id);
      setActiveReconciliation(detailRes.data.data);
      fetchAccountsAndReconciliations(selectedAccountId);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to start reconciliation');
    }
  };

  const handleAutoMatch = async () => {
    if (!activeReconciliation) return;
    try {
      setLoading(true);
      const res = await financeApi.autoMatchReconciliation(activeReconciliation.id);
      setActionSuccess(`Auto-match complete: ${res.data.data?.matches_created || 0} matches identified.`);
      const detailRes = await financeApi.getReconciliation(activeReconciliation.id);
      setActiveReconciliation(detailRes.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Auto-match engine failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUnmatch = async (matchId: number) => {
    if (!activeReconciliation) return;
    try {
      await financeApi.unmatchReconciliation(activeReconciliation.id, matchId);
      setActionSuccess('Match unlinked successfully');
      const detailRes = await financeApi.getReconciliation(activeReconciliation.id);
      setActiveReconciliation(detailRes.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to unmatch line');
    }
  };

  const handleFinalize = async () => {
    if (!activeReconciliation) return;
    try {
      setLoading(true);
      await financeApi.finalizeReconciliation(activeReconciliation.id);
      setActionSuccess('Reconciliation finalized and locked successfully');
      const detailRes = await financeApi.getReconciliation(activeReconciliation.id);
      setActiveReconciliation(detailRes.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Cannot finalize reconciliation');
    } finally {
      setLoading(false);
    }
  };

  const formatBDT = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '৳0.00';
    return `৳${Number(amount).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('finance.bankReconTitle', 'Automated Bank Reconciliation Engine')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('finance.bankReconSubtitle', 'Statement Feed vs GL Subledger Auto-Matching & Discrepancy Auditing')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedAccountId}
            onChange={(e) => handleAccountChange(Number(e.target.value))}
            className="px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 font-medium"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.bank_name} - {a.account_name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Session
          </button>
          <button
            onClick={() => fetchAccountsAndReconciliations(selectedAccountId)}
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

      {/* Reconciliation Comparison Summary */}
      {activeReconciliation ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Statement Closing Balance
              </span>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {formatBDT(activeReconciliation.statement_closing_balance)}
              </div>
              <p className="text-xs text-gray-400 mt-1">As per bank statement feed</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                GL Cash Book Balance
              </span>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                {formatBDT(activeReconciliation.gl_closing_balance)}
              </div>
              <p className="text-xs text-gray-400 mt-1">General Ledger posted balance</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Unreconciled Difference
              </span>
              <div className={`text-2xl font-bold mt-2 ${
                Math.abs(activeReconciliation.difference) < 0.01 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {formatBDT(activeReconciliation.difference)}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {Math.abs(activeReconciliation.difference) < 0.01 ? 'Fully Balanced' : 'Variance to Reconcile'}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Reconciliation Status
                </span>
                <div className="mt-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                    activeReconciliation.status === 'RECONCILED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400'
                  }`}>
                    {activeReconciliation.status}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {activeReconciliation.status !== 'RECONCILED' && (
                  <>
                    <button
                      onClick={handleAutoMatch}
                      disabled={loading}
                      className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                    >
                      <Zap className="w-3.5 h-3.5" /> Auto-Match
                    </button>
                    <button
                      onClick={handleFinalize}
                      disabled={loading || Math.abs(activeReconciliation.difference) >= 0.01}
                      className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
                    >
                      Finalize
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Matched Transactions Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  Reconciled Matches & Line Alignments
                </h2>
                <p className="text-xs text-gray-500">
                  Exact, reference, date window and manual match pairings
                </p>
              </div>
              <span className="text-xs bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full font-medium">
                {activeReconciliation.matches?.length || 0} Matched Lines
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-3">Bank Statement Line</th>
                    <th className="px-6 py-3">General Ledger Journal Line</th>
                    <th className="px-6 py-3">Match Algorithm</th>
                    <th className="px-6 py-3 text-right">Matched Amount</th>
                    <th className="px-6 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {!activeReconciliation.matches || activeReconciliation.matches.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                        No lines matched yet. Click "Auto-Match" to match transactions.
                      </td>
                    </tr>
                  ) : (
                    activeReconciliation.matches.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-3">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {m.bank_statement_line?.description || 'Statement Line'}
                          </div>
                          <div className="text-xs text-gray-400 font-mono">
                            Ref: {m.bank_statement_line?.reference_number || 'N/A'} | Date: {m.bank_statement_line?.transaction_date}
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="font-medium text-gray-900 dark:text-white">
                            Voucher: {m.journal_entry_line?.journal_entry?.voucher_number || 'JV-ENTRY'}
                          </div>
                          <div className="text-xs text-gray-400">
                            {m.journal_entry_line?.narration || 'GL Journal Line'}
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-xs font-mono px-2 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded">
                            {m.match_type}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right font-bold text-gray-900 dark:text-white">
                          {formatBDT(m.matched_amount)}
                        </td>
                        <td className="px-6 py-3 text-center">
                          {activeReconciliation.status !== 'RECONCILED' && (
                            <button
                              onClick={() => handleUnmatch(m.id)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                              title="Unmatch"
                            >
                              <Trash2 className="w-4 h-4" />
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
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FileCheck2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            No Active Reconciliation Session
          </h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            Create a reconciliation session for this bank account to match statement lines with GL journals.
          </p>
          <button
            onClick={() => setShowNewModal(true)}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
          >
            Start New Reconciliation
          </button>
        </div>
      )}

      {/* New Reconciliation Session Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Start Bank Reconciliation
            </h3>
            <form onSubmit={handleCreateReconciliation} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Statement As of Date</label>
                <input
                  type="date"
                  required
                  value={statementDate}
                  onChange={(e) => setStatementDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Statement Ending Balance (BDT) *</label>
                <input
                  type="number"
                  required
                  value={stmtClosingBal}
                  onChange={(e) => setStmtClosingBal(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  Initiate Reconciliation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
