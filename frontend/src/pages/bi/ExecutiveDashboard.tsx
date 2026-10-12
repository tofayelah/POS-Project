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
  Award,
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto bg-slate-50 min-h-full">
      {/* Top Header & Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
              <TrendingUp className="w-6 h-6 shrink-0" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {t('bi.executiveDashboard', 'Executive BI & Management Intelligence')}
              </h1>
              <p className="text-xs font-medium text-slate-600 mt-0.5">
                {t('bi.subtitle', 'Real-time multi-channel sales analytics, working capital, gross margins, and DuPont financial ratios')}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-indigo-600"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-indigo-600"
          />
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-indigo-600"
          >
            <option value="">{t('bi.channel', 'Channel')}: All Channels</option>
            <option value="POS">POS Counter</option>
            <option value="ECOMMERCE">E-Commerce</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="B2B">B2B Corporate</option>
          </select>

          <button
            onClick={loadDashboard}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t('bi.apply', 'Apply Filters')}
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            {t('bi.exportCsv', 'Export CSV')}
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center p-16 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <RefreshCw className="w-7 h-7 animate-spin text-indigo-600" />
          <span className="ml-3 text-slate-700 font-semibold text-sm">
            Loading analytics intelligence...
          </span>
        </div>
      ) : (
        <>
          {/* Executive Sales KPI Metrics (Soft-Tinted Modern Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-indigo-50/60 p-5 rounded-xl border border-indigo-100 shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                {t('bi.todaySales', 'Today Sales')}
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-slate-900">
                  {formatCurrency(sales?.today_sales ?? 0)}
                </span>
                <span
                  className={`text-xs font-bold flex items-center px-1.5 py-0.5 rounded ${
                    (sales?.growth_today_pct ?? 0) >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
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
              <p className="text-xs font-medium text-slate-600 mt-2">
                {t('bi.yesterdaySales', 'Yesterday')}: {formatCurrency(sales?.yesterday_sales ?? 0)}
              </p>
            </div>

            <div className="bg-emerald-50/60 p-5 rounded-xl border border-emerald-100 shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                {t('bi.mtdSales', 'Month-to-Date (MTD) Sales')}
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-slate-900">
                  {formatCurrency(sales?.mtd_sales ?? 0)}
                </span>
                <span
                  className={`text-xs font-bold flex items-center px-1.5 py-0.5 rounded ${
                    (sales?.growth_mtd_pct ?? 0) >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
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
              <p className="text-xs font-medium text-slate-600 mt-2">
                {t('bi.prevMtdSales', 'Prev MTD')}: {formatCurrency(sales?.prev_mtd_sales ?? 0)}
              </p>
            </div>

            <div className="bg-amber-50/60 p-5 rounded-xl border border-amber-100 shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                {t('bi.aov', 'Average Order Value (AOV)')}
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-slate-900">
                  {formatCurrency(sales?.aov ?? 0)}
                </span>
                <span className="text-xs font-bold text-slate-700 bg-white/80 px-2 py-0.5 rounded border border-amber-200">
                  {formatNumber(sales?.transactions ?? 0)} {t('bi.transactions', 'txns')}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-600 mt-2">
                {t('bi.avgBasketSize', 'Avg Basket')}: {sales?.average_basket_size ?? 0} items
              </p>
            </div>

            <div className="bg-purple-50/60 p-5 rounded-xl border border-purple-100 shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-900">
                {t('bi.grossMargin', 'Gross Margin')}
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-indigo-700">
                  {primary?.gross_margin_pct ?? 0}%
                </span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  {formatCurrency(primary?.gross_profit ?? 0)} GP
                </span>
              </div>
              <p className="text-xs font-medium text-slate-600 mt-2">
                {t('bi.netMargin', 'Net Margin')}: {primary?.net_margin_pct ?? 0}%
              </p>
            </div>
          </div>

          {/* Primary Financial & Working Capital KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500">{t('bi.revenue', 'Net Revenue')}</p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {formatCurrency(primary?.revenue ?? 0)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500">{t('bi.cogs', 'COGS')}</p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {formatCurrency(primary?.cogs ?? 0)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500">{t('bi.operatingExpenses', 'Operating Expenses')}</p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {formatCurrency(primary?.operating_expenses ?? 0)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500">{t('bi.netProfit', 'Net Profit')}</p>
              <p className={`text-lg font-bold mt-1 ${(primary?.net_profit ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatCurrency(primary?.net_profit ?? 0)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500">{t('bi.cashBalance', 'Cash Position')}</p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {formatCurrency(primary?.cash_balance ?? 0)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500">{t('bi.accountsReceivable', 'Accounts Receivable')}</p>
              <p className="text-lg font-bold text-amber-700 mt-1">
                {formatCurrency(primary?.accounts_receivable ?? 0)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500">{t('bi.accountsPayable', 'Accounts Payable')}</p>
              <p className="text-lg font-bold text-rose-700 mt-1">
                {formatCurrency(primary?.accounts_payable ?? 0)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500">{t('bi.inventoryValue', 'Inventory Valuation')}</p>
              <p className="text-lg font-bold text-blue-700 mt-1">
                {formatCurrency(primary?.inventory_value ?? 0)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500">{t('bi.workingCapital', 'Working Capital')}</p>
              <p className="text-lg font-bold text-indigo-700 mt-1">
                {formatCurrency(primary?.working_capital ?? 0)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500">{t('bi.budgetUtilization', 'Budget Utilization')}</p>
              <p className="text-lg font-bold text-purple-700 mt-1">
                {primary?.budget_utilization ?? 0}%
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500">{t('bi.returnRate', 'Return Rate')}</p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {sales?.return_rate_pct ?? 0}%
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500">{t('bi.discountRate', 'Discount Rate')}</p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {sales?.discount_rate_pct ?? 0}%
              </p>
            </div>
          </div>

          {/* Performance Grids: Top Products, Top Branches, Channel Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Products */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-600" />
                  {t('bi.topProducts', 'Top Selling SKUs')}
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {data?.top_products?.length ? (
                  data.top_products.map((p, idx) => (
                    <div key={p.id ?? p.sku ?? `top-prod-${idx}`} className="py-2.5 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-bold text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500 font-medium">
                          {p.sku ? `${p.sku} • ` : ''}{formatNumber(p.total_quantity ?? p.quantity ?? 0)} units
                        </p>
                      </div>
                      <span className="font-bold text-slate-900 font-mono">
                        {formatCurrency(p.total_revenue ?? p.revenue ?? 0)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 py-4 text-center">No sales recorded in selected period.</p>
                )}
              </div>
            </div>

            {/* Top Branches */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  {t('bi.topBranches', 'Branch Performance')}
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {data?.top_branches?.length ? (
                  data.top_branches.map((b, idx) => (
                    <div key={b.id ?? b.name ?? `top-branch-${idx}`} className="py-2.5 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-bold text-slate-900">{b.name}</p>
                        <p className="text-xs text-slate-500 font-medium">{formatNumber(b.transactions ?? 0)} txns</p>
                      </div>
                      <span className="font-bold text-slate-900 font-mono">
                        {formatCurrency(b.total_revenue ?? 0)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 py-4 text-center">No branch sales recorded.</p>
                )}
              </div>
            </div>

            {/* Sales Channel Breakdown */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-600" />
                  {t('bi.channelBreakdown', 'Sales Channels')}
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {data?.channel_breakdown?.length ? (
                  data.channel_breakdown.map((c, idx) => (
                    <div key={c.channel ?? `channel-${idx}`} className="py-2.5 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-bold text-slate-900">{c.channel}</p>
                        <p className="text-xs text-slate-500 font-medium">{formatNumber(c.orders_count ?? c.orders ?? 0)} orders</p>
                      </div>
                      <span className="font-bold text-slate-900 font-mono">
                        {formatCurrency(c.total_revenue ?? c.sales ?? 0)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 py-4 text-center">No channel breakdown available.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
