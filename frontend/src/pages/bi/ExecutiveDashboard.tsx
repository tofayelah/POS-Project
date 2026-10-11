import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  Layers,
  Calendar,
  Filter,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  FileSpreadsheet,
  Settings,
  CreditCard,
  PieChart,
  BarChart3,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import { biApi } from '../../api/bi';
import { ExecutiveDashboardData } from '../../types/bi';
import { formatCurrency, formatNumber, formatDate } from '../../utils/format';

export const ExecutiveDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<ExecutiveDashboardData | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [channel, setChannel] = useState<string>('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (channel) params.channel = channel;

      const resp = await biApi.getExecutiveDashboard(params);
      setData(resp.data.data);
    } catch (err) {
      console.error('Failed to load Executive Dashboard', err);
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
      link.setAttribute('download', `executive_sales_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export CSV', err);
    }
  };

  const primary = data?.primary_kpis;
  const sales = data?.sales_kpis;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('bi.executiveDashboard')}
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('bi.subtitle')}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
          />
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
          >
            <option value="">{t('bi.channel')}: All</option>
            <option value="POS">POS</option>
            <option value="ECOMMERCE">E-Commerce</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="B2B">B2B</option>
          </select>

          <button
            onClick={loadDashboard}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t('bi.apply')}
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            {t('bi.exportCsv')}
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center p-16">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="ml-3 text-gray-600 dark:text-gray-400 font-medium">
            Loading analytics intelligence...
          </span>
        </div>
      ) : (
        <>
          {/* Executive Sales KPI Metrics (MTD, Today, YTD, Growth) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                {t('bi.todaySales')}
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(sales?.today_sales ?? 0)}
                </span>
                <span
                  className={`text-xs font-semibold flex items-center ${
                    (sales?.growth_today_pct ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {(sales?.growth_today_pct ?? 0) >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                  )}
                  {sales?.growth_today_pct}%
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {t('bi.yesterdaySales')}: {formatCurrency(sales?.yesterday_sales ?? 0)}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                {t('bi.mtdSales')}
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(sales?.mtd_sales ?? 0)}
                </span>
                <span
                  className={`text-xs font-semibold flex items-center ${
                    (sales?.growth_mtd_pct ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {(sales?.growth_mtd_pct ?? 0) >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                  )}
                  {sales?.growth_mtd_pct}%
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {t('bi.prevMtdSales')}: {formatCurrency(sales?.prev_mtd_sales ?? 0)}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                {t('bi.aov')}
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(sales?.aov ?? 0)}
                </span>
                <span className="text-xs text-gray-500">
                  {formatNumber(sales?.transactions ?? 0)} {t('bi.transactions')}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {t('bi.avgBasketSize')}: {sales?.average_basket_size ?? 0}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                {t('bi.grossMargin')}
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {primary?.gross_margin_pct ?? 0}%
                </span>
                <span className="text-xs font-medium text-emerald-600">
                  {formatCurrency(primary?.gross_profit ?? 0)} GP
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {t('bi.netMargin')}: {primary?.net_margin_pct ?? 0}%
              </p>
            </div>
          </div>

          {/* Primary Financial & Working Capital KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500">{t('bi.revenue')}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(primary?.revenue ?? 0)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500">{t('bi.cogs')}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(primary?.cogs ?? 0)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500">{t('bi.operatingExpenses')}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(primary?.operating_expenses ?? 0)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500">{t('bi.netProfit')}</p>
              <p className={`text-lg font-bold mt-1 ${(primary?.net_profit ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(primary?.net_profit ?? 0)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500">{t('bi.cashBalance')}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(primary?.cash_balance ?? 0)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500">{t('bi.accountsReceivable')}</p>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">
                {formatCurrency(primary?.accounts_receivable ?? 0)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500">{t('bi.accountsPayable')}</p>
              <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-1">
                {formatCurrency(primary?.accounts_payable ?? 0)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500">{t('bi.inventoryValue')}</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                {formatCurrency(primary?.inventory_value ?? 0)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500">{t('bi.workingCapital')}</p>
              <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {formatCurrency(primary?.working_capital ?? 0)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500">{t('bi.budgetUtilization')}</p>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-1">
                {primary?.budget_utilization ?? 0}%
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500">{t('bi.returnRate')}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                {sales?.return_rate_pct ?? 0}%
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500">{t('bi.discountRate')}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                {sales?.discount_rate_pct ?? 0}%
              </p>
            </div>
          </div>

          {/* Performance Grids: Top Products, Top Branches, Channel Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Products */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-500" />
                  {t('bi.topProducts')}
                </h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {data?.top_products?.length ? (
                  data.top_products.map((p, idx) => (
                    <div key={p.id ?? p.sku ?? `top-prod-${idx}`} className="py-2.5 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{p.name}</p>
                        <p className="text-xs text-gray-400">
                          {p.sku ? `${p.sku} • ` : ''}{formatNumber(p.total_quantity ?? p.quantity ?? 0)} units
                        </p>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(p.total_revenue ?? p.revenue ?? 0)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 py-4 text-center">No sales recorded in selected period.</p>
                )}
              </div>
            </div>

            {/* Top Branches */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-500" />
                  {t('bi.topBranches')}
                </h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {data?.top_branches?.length ? (
                  data.top_branches.map((b, idx) => (
                    <div key={b.id ?? b.name ?? `top-branch-${idx}`} className="py-2.5 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{b.name}</p>
                        <p className="text-xs text-gray-400">{formatNumber(b.transactions ?? 0)} txns</p>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(b.total_revenue ?? 0)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 py-4 text-center">No branch sales recorded.</p>
                )}
              </div>
            </div>

            {/* Sales Channel Breakdown */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-500" />
                  {t('bi.channelBreakdown')}
                </h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {data?.channel_breakdown?.length ? (
                  data.channel_breakdown.map((c, idx) => (
                    <div key={c.channel ?? `channel-${idx}`} className="py-2.5 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{c.channel}</p>
                        <p className="text-xs text-gray-400">{formatNumber(c.orders_count ?? c.orders ?? 0)} orders</p>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(c.total_revenue ?? c.sales ?? 0)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 py-4 text-center">No channel breakdown available.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
