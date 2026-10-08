import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { useTranslation } from '../../i18n';
import { financeApi } from '../../api/finance';
import { BudgetVarianceReport, Budget } from '../../types/finance';
import {
  Percent,
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  PieChart
} from 'lucide-react';

export const BudgetVsActual: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedBudgetId, setSelectedBudgetId] = useState<number>(id ? Number(id) : 1);
  const [variance, setVariance] = useState<BudgetVarianceReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchVarianceData = async (budgetId: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await financeApi.getBudgetVariance(budgetId);
      setVariance(res.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error loading budget variance analysis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load list of budgets for quick switcher
    financeApi.getBudgets().then((res) => {
      setBudgets(res.data.data);
      if (!id && res.data.data.length > 0) {
        setSelectedBudgetId(res.data.data[0].id);
        fetchVarianceData(res.data.data[0].id);
      }
    });

    if (id) {
      fetchVarianceData(Number(id));
    }
  }, [id]);

  const handleBudgetSelect = (newId: number) => {
    setSelectedBudgetId(newId);
    fetchVarianceData(newId);
  };

  const formatBDT = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '৳0.00';
    return `৳${Number(amount).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const consumptionPct = variance && variance.total_budget > 0
    ? Math.min(Math.round((variance.total_actual / variance.total_budget) * 100), 200)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/finance/budgets"
            className="p-2 text-gray-500 hover:text-gray-700 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('finance.varianceTitle', 'Budget vs. Actual Variance Analysis')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {variance?.budget_name || 'Budget'} (v{variance?.version || 1}) — {variance?.fiscal_year || 'Current Fiscal Year'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedBudgetId}
            onChange={(e) => handleBudgetSelect(Number(e.target.value))}
            className="px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 font-medium"
          >
            {budgets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} (v{b.version})
              </option>
            ))}
          </select>
          <button
            onClick={() => fetchVarianceData(selectedBudgetId)}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Variance KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {t('finance.allocatedBudget', 'Allocated Budget')}
          </span>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {formatBDT(variance?.total_budget)}
          </div>
          <p className="text-xs text-gray-500 mt-1">Authorized expenditure ceiling</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {t('finance.actualSpend', 'Actual GL Spend')}
          </span>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">
            {formatBDT(variance?.total_actual)}
          </div>
          <p className="text-xs text-gray-500 mt-1">General Ledger posted actuals</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {t('finance.variance', 'Net Variance')}
          </span>
          <div className={`text-2xl font-bold mt-2 ${
            (variance?.net_variance ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {formatBDT(variance?.net_variance)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {(variance?.net_variance ?? 0) >= 0 ? 'Favorable (Under Budget)' : 'Unfavorable (Over Budget)'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {t('finance.burnRate', 'Consumption')}
          </span>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {consumptionPct}%
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className={`h-2 rounded-full ${
                consumptionPct > 100 ? 'bg-rose-500' : consumptionPct > 85 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(consumptionPct, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Account Line Breakdown Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {t('finance.accountBreakdown', 'Account Line Variance Breakdown')}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3">{t('finance.account', 'GL Account')}</th>
                <th className="px-6 py-3 text-right">{t('finance.budgeted', 'Budgeted')}</th>
                <th className="px-6 py-3 text-right">{t('finance.actual', 'Actual')}</th>
                <th className="px-6 py-3 text-right">{t('finance.variance', 'Variance')}</th>
                <th className="px-6 py-3 text-right">{t('finance.pctConsumed', '% Spent')}</th>
                <th className="px-6 py-3 text-center">{t('common.status', 'Health')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {!variance?.lines || variance.lines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    No account lines defined for this budget.
                  </td>
                </tr>
              ) : (
                variance.lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {line.account_name}
                      </div>
                      <div className="text-xs text-gray-400 font-mono">
                        {line.account_code}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {formatBDT(line.allocated_amount)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-indigo-600 dark:text-indigo-400">
                      {formatBDT(line.actual_amount)}
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${
                      line.variance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {formatBDT(line.variance)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-medium">
                      {line.variance_pct}%
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        line.status === 'UNDER_BUDGET'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400'
                          : line.status === 'OVER_BUDGET'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400'
                      }`}>
                        {line.status}
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
