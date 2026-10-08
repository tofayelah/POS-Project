import React, { useEffect, useState } from 'react';
import {
  Globe,
  ShoppingCart,
  TrendingUp,
  RefreshCw,
  FileSpreadsheet,
  Package,
  Layers,
  DollarSign,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import { biApi } from '../../api/bi';
import { EcommerceBiData } from '../../types/bi';
import { formatCurrency, formatNumber } from '../../utils/format';

export const EcommerceBI: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<EcommerceBiData | null>(null);

  useEffect(() => {
    loadEcommerceBi();
  }, []);

  const loadEcommerceBi = async () => {
    setLoading(true);
    try {
      const resp = await biApi.getEcommerceBi();
      setData(resp.data.data);
    } catch (err) {
      console.error('Failed to load E-Commerce BI', err);
    } finally {
      setLoading(false);
    }
  };

  const summary = data?.summary;
  const pipeline = data?.pipeline;
  const channels = data?.channels;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-8 h-8 text-sky-600 dark:text-sky-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('bi.ecommerceBi')}
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('bi.subtitle')}
          </p>
        </div>

        <button
          onClick={loadEcommerceBi}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </button>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-600" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Gross Merchandise Value (GMV)
              </span>
              <div className="text-2xl font-bold text-sky-600 dark:text-sky-400 mt-1">
                {formatCurrency(summary?.gmv || 0)}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Online Orders
              </span>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatNumber(summary?.total_orders || 0)}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Online AOV
              </span>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {formatCurrency(summary?.aov || 0)}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Conversion Rate
              </span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {summary?.conversion_rate_pct || 0}%
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Online Returns
              </span>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {formatCurrency(summary?.online_returns || 0)}
              </div>
            </div>
          </div>

          {/* Fulfillment Pipeline */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-sky-500" />
              Order Fulfillment Pipeline
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {pipeline && pipeline.length > 0 ? (
                pipeline.map((p, i) => (
                  <div key={i} className="p-3 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-100 dark:border-gray-700 text-center">
                    <span className="text-xs text-gray-500 font-semibold">{p.status}</span>
                    <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">{p.orders_count}</div>
                    <div className="text-xs text-sky-600">{formatCurrency(p.revenue)}</div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-4 text-center text-gray-500">
                  {t('common.noData')}
                </div>
              )}
            </div>
          </div>

          {/* Omnichannel Breakdown */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              Omnichannel Comparison
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">{t('bi.channel')}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{t('bi.transactions')}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{t('bi.revenue')}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{t('bi.aov')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {channels && channels.length > 0 ? (
                    channels.map((c, i) => (
                      <tr key={i}>
                        <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">{c.channel}</td>
                        <td className="py-2.5 px-3 text-right">{formatNumber(c.orders_count)}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-sky-600">{formatCurrency(c.revenue)}</td>
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
        </>
      )}
    </div>
  );
};
