import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { taxApi } from '../../api/tax';
import { TaxTransaction, TaxPeriod } from '../../types/tax';
import { 
  FileText as DocumentTextIcon, 
  Banknote as BanknotesIcon, 
  RefreshCw as ArrowPathIcon,
  CheckCircle as CheckCircleIcon 
} from 'lucide-react';

export const TaxTransactionRegister: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<TaxTransaction[]>([]);
  const [periods, setPeriods] = useState<TaxPeriod[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [filters, setFilters] = useState<any>({
    transaction_type: '',
    tax_period_id: '',
  });

  // Settle Modal State
  const [showSettleModal, setShowSettleModal] = useState<boolean>(false);
  const [settleData, setSettleData] = useState<any>({
    tax_period_id: '',
    amount: '',
    payment_method_id: 1,
    reference_number: '',
  });
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [transRes, perRes] = await Promise.all([
        taxApi.getTransactions({ ...filters, page }),
        taxApi.getPeriods(),
      ]);
      setTransactions(transRes.data.data.data);
      setTotalPages(transRes.data.data.last_page);
      setPeriods(perRes.data.data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Error loading transactions' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, filters]);

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await taxApi.settleTax({
        tax_period_id: parseInt(settleData.tax_period_id),
        amount: parseFloat(settleData.amount),
        payment_method_id: parseInt(settleData.payment_method_id),
        reference_number: settleData.reference_number,
      });
      setShowSettleModal(false);
      fetchData();
      setMessage({ type: 'success', text: 'Treasury Challan VAT settlement posted successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Error settling VAT' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('tax.registerTitle', 'Tax Subledger & Transaction Register')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('tax.registerSubtitle', 'Immutable Document-Level Tax Records, Output VAT, Input Credits & Challans')}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowSettleModal(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
          >
            <BanknotesIcon className="w-5 h-5 mr-1" />
            Treasury Challan Settle
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50"
          >
            <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg text-sm border-l-4 ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-500' 
            : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-500'
        }`}>
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-wrap gap-4">
        <div className="w-48">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Transaction Type</label>
          <select
            value={filters.transaction_type}
            onChange={(e) => setFilters({ ...filters, transaction_type: e.target.value })}
            className="w-full text-xs px-2.5 py-1.5 border rounded dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Types</option>
            <option value="SALE_OUTPUT">Sales Output VAT</option>
            <option value="PURCHASE_INPUT">Purchase Input VAT</option>
            <option value="SALE_RETURN_REVERSAL">Sales Return Reversal</option>
            <option value="TAX_ADJUSTMENT">Tax Adjustment</option>
            <option value="TAX_SETTLEMENT">Treasury Settlement</option>
          </select>
        </div>

        <div className="w-48">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tax Period</label>
          <select
            value={filters.tax_period_id}
            onChange={(e) => setFilters({ ...filters, tax_period_id: e.target.value })}
            className="w-full text-xs px-2.5 py-1.5 border rounded dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Periods</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>{p.period_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-700 dark:text-gray-300 uppercase">
              <tr>
                <th className="px-4 py-3">Doc Number</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Taxable Base (৳)</th>
                <th className="px-4 py-3 text-right">VAT (৳)</th>
                <th className="px-4 py-3 text-right">SD (৳)</th>
                <th className="px-4 py-3 text-right">Total Tax (৳)</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    No tax transactions recorded.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900 dark:text-white">{t.document_number}</td>
                    <td className="px-4 py-3 text-xs">{t.document_date}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="px-2 py-0.5 rounded font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        {t.transaction_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{Number(t.taxable_amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-gray-900 dark:text-white">{Number(t.tax_amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono">{Number(t.sd_amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-gray-900 dark:text-white">
                      ৳ {Number(t.total_tax_amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-xs">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Settle Modal */}
      {showSettleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Record Treasury Challan Settlement</h3>
            <p className="text-xs text-gray-500 mb-4">
              Posts Treasury deposit to Bangladesh Government (TR Challan / e-Challan) against VAT Payable.
            </p>
            <form onSubmit={handleSettle} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 mb-1">
                  Tax Period *
                </label>
                <select
                  required
                  value={settleData.tax_period_id}
                  onChange={(e) => setSettleData({ ...settleData, tax_period_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select Period</option>
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>{p.period_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 mb-1">
                  Settlement Amount (৳) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={settleData.amount}
                  onChange={(e) => setSettleData({ ...settleData, amount: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:text-white font-mono"
                  placeholder="e.g. 50000.00"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 mb-1">
                  Treasury Challan Ref / Token *
                </label>
                <input
                  type="text"
                  required
                  value={settleData.reference_number}
                  onChange={(e) => setSettleData({ ...settleData, reference_number: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:text-white font-mono"
                  placeholder="e.g. TR-CHALLAN-202610-8841"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs text-white bg-emerald-600 rounded hover:bg-emerald-700"
                >
                  Post Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
