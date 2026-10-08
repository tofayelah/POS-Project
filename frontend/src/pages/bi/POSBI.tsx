import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  Clock,
  User,
  RefreshCw,
  FileSpreadsheet,
  AlertCircle,
  TrendingUp,
  DollarSign,
  ShoppingCart,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import { biApi } from '../../api/bi';
import { PosBiData } from '../../types/bi';
import { formatCurrency, formatNumber, formatDate } from '../../utils/format';

export const POSBI: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<PosBiData | null>(null);

  useEffect(() => {
    loadPosBi();
  }, []);

  const loadPosBi = async () => {
    setLoading(true);
    try {
      const resp = await biApi.getPosBi();
      setData(resp.data.data);
    } catch (err) {
      console.error('Failed to load POS BI', err);
    } finally {
      setLoading(false);
    }
  };

  const summary = data?.summary;
  const heatmap = data?.hourly_heatmap;
  const cashiers = data?.cashiers;
  const shifts = data?.shifts;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('bi.posBi')}
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('bi.subtitle')}
          </p>
        </div>

        <button
          onClick={loadPosBi}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </button>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                POS Sales Revenue
              </span>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {formatCurrency(summary?.pos_revenue || 0)}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('bi.transactions')}
              </span>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatNumber(summary?.transactions_count || 0)}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('bi.aov')}
              </span>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {formatCurrency(summary?.aov || 0)}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('bi.unitsSold')}
              </span>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatNumber(summary?.units_sold || 0)}
              </div>
            </div>
          </div>

          {/* Hourly Traffic & Sales Heatmap */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" />
              24-Hour POS Order Volume & Peak Hours
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Distribution of in-store transactions across operating hours.
            </p>

            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
              {heatmap &&
                heatmap.map((h) => {
                  const hasOrders = h.orders_count > 0;
                  return (
                    <div
                      key={h.hour}
                      className={`p-2.5 rounded-lg text-center border transition ${
                        hasOrders
                          ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                          : 'bg-gray-50 dark:bg-gray-750 border-gray-100 dark:border-gray-700'
                      }`}
                    >
                      <div className="text-xs font-medium text-gray-500">{h.hour_label}</div>
                      <div className={`text-sm font-bold mt-1 ${hasOrders ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                        {h.orders_count}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate">
                        {h.revenue > 0 ? formatCurrency(h.revenue) : '-'}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Cashier Performance & Till Discrepancies Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cashier Performance */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" />
                Cashier Performance
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">{t('common.name')}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{t('bi.transactions')}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Revenue</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{t('bi.aov')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {cashiers && cashiers.length > 0 ? (
                      cashiers.map((c) => (
                        <tr key={c.cashier_id}>
                          <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">{c.name}</td>
                          <td className="py-2.5 px-3 text-right">{formatNumber(c.orders_count)}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-blue-600">{formatCurrency(c.revenue)}</td>
                          <td className="py-2.5 px-3 text-right text-gray-500">{formatCurrency(c.aov)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-gray-500">
                          {t('common.noData')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Shift Discrepancies */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Drawer Shift Reconciliation Discrepancies
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">User</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Opening</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Closing</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Discrepancy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {shifts && shifts.length > 0 ? (
                      shifts.map((s) => (
                        <tr key={s.session_id}>
                          <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">{s.user_name}</td>
                          <td className="py-2.5 px-3 text-right text-gray-500">{formatCurrency(s.opening_balance)}</td>
                          <td className="py-2.5 px-3 text-right text-gray-500">{formatCurrency(s.closing_balance)}</td>
                          <td className={`py-2.5 px-3 text-right font-bold ${s.discrepancy < 0 ? 'text-red-600' : s.discrepancy > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                            {formatCurrency(s.discrepancy)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-gray-500">
                          {t('common.noData')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
