import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Calendar,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  Building2,
  PieChart,
  Layers,
  CreditCard,
  CheckCircle2,
  XCircle,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import { biApi } from '../../api/bi';
import { SalesBiData } from '../../types/bi';
import { formatCurrency, formatNumber } from '../../utils/format';

export const SalesBI: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<SalesBiData | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [channel, setChannel] = useState<string>('');

  useEffect(() => {
    loadSalesBi();
  }, []);

  const loadSalesBi = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (channel) params.channel = channel;

      const resp = await biApi.getSalesBi(params);
      setData(resp.data.data);
    } catch (err) {
      console.error('Failed to load Sales BI data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const resp = await biApi.exportReport({
        dataset: 'sales',
        dimensions: ['date', 'branch', 'channel'],
        metrics: ['orders_count', 'gross_sales', 'net_sales'],
        format: 'csv',
      });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sales_bi_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export CSV', err);
    }
  };

  const summary = data?.summary;
  const funnel = data?.funnel;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('bi.salesBi')}
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('bi.subtitle')}
          </p>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-500 text-sm">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('bi.allChannels')}</option>
            <option value="POS">POS</option>
            <option value="ECOMMERCE">E-commerce</option>
            <option value="WHOLESALE">Wholesale</option>
          </select>
          <button
            onClick={loadSalesBi}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition shadow-sm disabled:opacity-50"
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
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('bi.grossSales')}
              </span>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(summary?.gross_sales || 0)}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('bi.discounts')}
              </span>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {formatCurrency(summary?.discounts || 0)}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('bi.netSales')}
              </span>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {formatCurrency(summary?.net_sales || 0)}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('bi.transactions')}
              </span>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatNumber(summary?.orders_count || 0)}
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

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('bi.aov')}
              </span>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {formatCurrency(summary?.aov || 0)}
              </div>
            </div>
          </div>

          {/* Sales Funnel */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Filter className="w-5 h-5 text-indigo-500" />
              {t('bi.salesFunnel')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg text-center border border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-500">{t('bi.funnelCreated')}</span>
                <div className="text-xl font-bold text-gray-800 dark:text-gray-200 mt-1">
                  {formatNumber(funnel?.total_created || 0)}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg text-center border border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-500">{t('bi.funnelCompleted')}</span>
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatNumber(funnel?.completed || 0)}
                </div>
                <div className="text-xs text-emerald-600 mt-0.5">
                  {funnel?.completion_rate_pct || 0}%
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg text-center border border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-500">{t('bi.funnelPaid')}</span>
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {formatNumber(funnel?.paid || 0)}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg text-center border border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-500">{t('bi.funnelFulfilled')}</span>
                <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                  {formatNumber(funnel?.fulfilled || 0)}
                </div>
                <div className="text-xs text-indigo-600 mt-0.5">
                  {funnel?.fulfillment_rate_pct || 0}%
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg text-center border border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-500">{t('bi.funnelCancelled')}</span>
                <div className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {formatNumber(funnel?.cancelled || 0)}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg text-center border border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-500">{t('bi.funnelReturned')}</span>
                <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                  {formatNumber(funnel?.returned || 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown Tables Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      <th className="py-2.5 px-3 font-semibold text-right">{t('bi.transactions')}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{t('bi.netSales')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data?.by_branch && data.by_branch.length > 0 ? (
                      data.by_branch.map((b) => (
                        <tr key={b.id}>
                          <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">{b.name}</td>
                          <td className="py-2.5 px-3 text-right">{formatNumber(b.orders_count)}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-blue-600">{formatCurrency(b.net_sales)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-gray-500">
                          {t('common.noData')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* By Channel */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-emerald-500" />
                {t('bi.byChannel')}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">{t('bi.channel')}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{t('bi.transactions')}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{t('bi.netSales')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data?.by_channel && data.by_channel.length > 0 ? (
                      data.by_channel.map((c, i) => (
                        <tr key={i}>
                          <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">
                            <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                              {c.channel}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">{formatNumber(c.orders_count)}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">{formatCurrency(c.net_sales)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-gray-500">
                          {t('common.noData')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

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
                      <th className="py-2.5 px-3 font-semibold text-right">{t('bi.unitsSold')}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{t('bi.netSales')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data?.by_category && data.by_category.length > 0 ? (
                      data.by_category.map((cat, i) => (
                        <tr key={i}>
                          <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">{cat.category_name}</td>
                          <td className="py-2.5 px-3 text-right">{formatNumber(cat.units_sold)}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-purple-600">{formatCurrency(cat.net_sales)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-gray-500">
                          {t('common.noData')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* By Payment Method */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-500" />
                {t('bi.byPaymentMethod')}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">{t('bi.paymentMethod')}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{t('bi.transactions')}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{t('bi.total')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data?.by_payment_method && data.by_payment_method.length > 0 ? (
                      data.by_payment_method.map((pm, i) => (
                        <tr key={i}>
                          <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">{pm.payment_method}</td>
                          <td className="py-2.5 px-3 text-right">{formatNumber(pm.transaction_count)}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-indigo-600">{formatCurrency(pm.total_amount)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-gray-500">
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
