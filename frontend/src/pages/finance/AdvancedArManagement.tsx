import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { financeApi } from '../../api/finance';
import { ArAgingSummary } from '../../types/finance';
import {
  ArrowDownRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Phone,
  ShieldAlert,
  Scale
} from 'lucide-react';

export const AdvancedArManagement: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [arData, setArData] = useState<ArAgingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchArAging = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await financeApi.getArAging();
      setArData(res.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error loading accounts receivable aging');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArAging();
  }, []);

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
            {t('finance.arAgingTitle', 'Advanced Accounts Receivable & Collections Management')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('finance.arAgingSubtitle', 'Multi-Tier Aging Buckets, Collection Priority Scoring & GL Reconciliation')}
          </p>
        </div>
        <button
          onClick={fetchArAging}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh', 'Refresh')}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* GL Subledger Reconciliation Variance Banner */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
        Math.abs(arData?.summary?.reconciliation_variance ?? 0) < 0.01
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
          : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
      }`}>
        <div className="flex items-center gap-3">
          <Scale className="w-6 h-6 shrink-0" />
          <div>
            <div className="font-bold text-sm">
              {Math.abs(arData?.summary?.reconciliation_variance ?? 0) < 0.01
                ? 'Subledger & General Ledger in Complete Balance'
                : 'Subledger vs GL Variance Detected'}
            </div>
            <div className="text-xs opacity-90 mt-0.5">
              Customer Subledger: {formatBDT(arData?.summary?.grand_total_subledger)} | GL Trade Receivables: {formatBDT(arData?.summary?.gl_receivables_balance)}
            </div>
          </div>
        </div>
        <div className="font-mono text-sm font-bold">
          Variance: {formatBDT(arData?.summary?.reconciliation_variance)}
        </div>
      </div>

      {/* Multi-Tier Aging Summary Buckets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-[11px] font-semibold text-gray-500 uppercase">Current (Not Due)</span>
          <div className="text-lg font-bold text-emerald-600 mt-1">
            {formatBDT(arData?.summary?.total_current)}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-[11px] font-semibold text-gray-500 uppercase">1 – 30 Days</span>
          <div className="text-lg font-bold text-blue-600 mt-1">
            {formatBDT(arData?.summary?.total_1_30)}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-[11px] font-semibold text-gray-500 uppercase">31 – 60 Days</span>
          <div className="text-lg font-bold text-amber-600 mt-1">
            {formatBDT(arData?.summary?.total_31_60)}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-[11px] font-semibold text-gray-500 uppercase">61 – 90 Days</span>
          <div className="text-lg font-bold text-orange-600 mt-1">
            {formatBDT(arData?.summary?.total_61_90)}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-[11px] font-semibold text-gray-500 uppercase">91 – 120 Days</span>
          <div className="text-lg font-bold text-rose-500 mt-1">
            {formatBDT(arData?.summary?.total_91_120)}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-[11px] font-semibold text-gray-500 uppercase">Over 120 Days</span>
          <div className="text-lg font-bold text-rose-700 mt-1">
            {formatBDT(arData?.summary?.total_over_120)}
          </div>
        </div>
      </div>

      {/* Customer Aging Breakdown Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Customer Subledger Aging Breakdown & Collection Priorities
          </h2>
          <span className="text-xs bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full font-medium">
            {arData?.customers?.length || 0} Debtors
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-[11px] uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-3 py-3 text-right">Current</th>
                <th className="px-3 py-3 text-right">1-30 d</th>
                <th className="px-3 py-3 text-right">31-60 d</th>
                <th className="px-3 py-3 text-right">61-90 d</th>
                <th className="px-3 py-3 text-right">91-120 d</th>
                <th className="px-3 py-3 text-right">120+ d</th>
                <th className="px-4 py-3 text-right font-bold">Total Due</th>
                <th className="px-3 py-3 text-center">Overdue</th>
                <th className="px-3 py-3 text-center">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {!arData?.customers || arData.customers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-gray-400">
                    No outstanding trade receivables found.
                  </td>
                </tr>
              ) : (
                arData.customers.map((c) => (
                  <tr key={c.customer_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {c.customer_name}
                      </div>
                      <div className="text-xs text-gray-400 font-mono">
                        {c.customer_code} {c.mobile ? `• ${c.mobile}` : ''}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-emerald-600">
                      {c.current > 0 ? formatBDT(c.current) : '—'}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-blue-600">
                      {c.bucket_1_30 > 0 ? formatBDT(c.bucket_1_30) : '—'}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-amber-600">
                      {c.bucket_31_60 > 0 ? formatBDT(c.bucket_31_60) : '—'}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-orange-600">
                      {c.bucket_61_90 > 0 ? formatBDT(c.bucket_61_90) : '—'}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-rose-500">
                      {c.bucket_91_120 > 0 ? formatBDT(c.bucket_91_120) : '—'}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-rose-700 font-bold">
                      {c.bucket_over_120 > 0 ? formatBDT(c.bucket_over_120) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white font-mono">
                      {formatBDT(c.total_due)}
                    </td>
                    <td className="px-3 py-3 text-center font-mono text-xs">
                      {c.max_overdue_days} d
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.priority_level === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'
                          : c.priority_level === 'URGENT'
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300'
                          : c.priority_level === 'HIGH'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                          : c.priority_level === 'MEDIUM'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {c.priority_level}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
