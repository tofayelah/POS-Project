import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Percent,
  RefreshCw,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Building2,
  AlertTriangle,
  Scale,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import { biApi } from '../../api/bi';
import { ProfitabilityBiData } from '../../types/bi';
import { formatCurrency, formatNumber } from '../../utils/format';

export const ProfitabilityBI: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<ProfitabilityBiData | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  useEffect(() => {
    loadProfitability();
  }, []);

  const loadProfitability = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const resp = await biApi.getProfitabilityBi(params);
      setData(resp.data.data);
    } catch (err) {
      console.error('Failed to load Profitability BI', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const resp = await biApi.exportReport({
        dataset: 'sales',
        dimensions: ['branch', 'category'],
        metrics: ['gross_sales', 'net_sales'],
        format: 'csv',
      });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `profitability_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export CSV', err);
    }
  };

  const summary = data?.summary;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('bi.profitabilityBi')}
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('bi.subtitle')}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
          />
          <span className="text-gray-500 text-sm">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={loadProfitability}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            {t('bi.exportCsv')}
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : (
        <>
          {/* Profitability Executive Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('bi.grossProfit')}
              </span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(summary?.gross_profit || 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {t('bi.grossMargin')}: <span className="font-semibold text-gray-900 dark:text-white">{summary?.gross_margin_pct || 0}%</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('bi.cogs')}
              </span>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {formatCurrency(summary?.cogs || 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Cost to Revenue: <span className="font-semibold text-gray-900 dark:text-white">{summary?.cost_to_revenue_ratio || 0}%</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('bi.operatingExpenses')}
              </span>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                {formatCurrency(summary?.operating_expenses || 0)}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('bi.netProfit')}
              </span>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {formatCurrency(summary?.net_profit || 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {t('bi.netMargin')}: <span className="font-semibold text-gray-900 dark:text-white">{summary?.net_margin_pct || 0}%</span>
              </div>
            </div>
          </div>

          {/* Top vs Low Margin Products Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Profitable Products */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-emerald-500" />
                {t('bi.topProducts')} ({t('bi.grossProfit')})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">{t('bi.product')}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{t('bi.unitsSold')}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{t('bi.grossProfit')}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{t('bi.grossMargin')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data?.top_profitable_products && data.top_profitable_products.length > 0 ? (
                      data.top_profitable_products.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">
                            <div>{p.name}</div>
                            {p.sku && <div className="text-xs text-gray-400 font-mono">{p.sku}</div>}
                          </td>
                          <td className="py-2.5 px-3 text-right">{formatNumber(p.units_sold)}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">{formatCurrency(p.gross_profit)}</td>
                          <td className="py-2.5 px-3 text-right text-emerald-600 font-medium">{p.gross_margin_pct}%</td>
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

            {/* Low Margin Products */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                {t('bi.lowMarginProducts')}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">{t('bi.product')}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{t('bi.revenue')}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{t('bi.cogs')}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{t('bi.grossMargin')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data?.low_margin_products && data.low_margin_products.length > 0 ? (
                      data.low_margin_products.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">
                            <div>{p.name}</div>
                            {p.sku && <div className="text-xs text-gray-400 font-mono">{p.sku}</div>}
                          </td>
                          <td className="py-2.5 px-3 text-right">{formatCurrency(p.revenue)}</td>
                          <td className="py-2.5 px-3 text-right">{formatCurrency(p.cogs)}</td>
                          <td className="py-2.5 px-3 text-right text-amber-600 font-semibold">{p.gross_margin_pct}%</td>
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

          {/* Category & Branch Profitability Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Category */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-500" />
                {t('bi.byCategory')}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">{t('bi.category')}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{t('bi.revenue')}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{t('bi.grossProfit')}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{t('bi.grossMargin')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data?.by_category && data.by_category.length > 0 ? (
                      data.by_category.map((cat, i) => (
                        <tr key={i}>
                          <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">{cat.category_name}</td>
                          <td className="py-2.5 px-3 text-right">{formatCurrency(cat.revenue)}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">{formatCurrency(cat.gross_profit)}</td>
                          <td className="py-2.5 px-3 text-right text-emerald-600">{cat.gross_margin_pct}%</td>
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

            {/* By Branch */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-500" />
                {t('bi.byBranch')}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">{t('common.branch')}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{t('bi.revenue')}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{t('bi.grossProfit')}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{t('bi.grossMargin')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data?.by_branch && data.by_branch.length > 0 ? (
                      data.by_branch.map((b) => (
                        <tr key={b.branch_id}>
                          <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">{b.branch_name}</td>
                          <td className="py-2.5 px-3 text-right">{formatCurrency(b.revenue)}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-blue-600">{formatCurrency(b.gross_profit)}</td>
                          <td className="py-2.5 px-3 text-right text-blue-600">{b.gross_margin_pct}%</td>
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
