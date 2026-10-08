import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import api from '../api/axios';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  Wallet,
  Activity,
  Calendar,
  Layers,
  BarChart3,
  PieChart,
  FileSpreadsheet,
  AlertTriangle,
  Building2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  LineChart,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../i18n';

// Components
import { DashboardSummary } from '../components/dashboard/types';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { QuickActionShortcuts } from '../components/dashboard/QuickActionShortcuts';
import { KpiCard } from '../components/dashboard/KpiCard';
import { SalesOverviewChart } from '../components/dashboard/SalesOverviewChart';
import { CategorySalesChart } from '../components/dashboard/CategorySalesChart';
import { TopProductsList } from '../components/dashboard/TopProductsList';
import { PaymentMethodsChart } from '../components/dashboard/PaymentMethodsChart';
import { LowStockTable } from '../components/dashboard/LowStockTable';
import { RecentTransactions } from '../components/dashboard/RecentTransactions';
import { AccountingHealth } from '../components/dashboard/AccountingHealth';
import { SystemStatusCard } from '../components/dashboard/SystemStatusCard';
import { formatCurrency } from '../utils/currency';

// Phase 13: Advanced BI & Management Reporting
import { ExecutiveDashboard } from './bi/ExecutiveDashboard';

export function Dashboard() {
  const { user, hasPermission, hasRole } = useAuth();
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  // Default to Phase 13 Executive BI, allow toggle to Operations
  const [activeTab, setActiveTab] = useState<'executive' | 'operations'>(() => {
    if (tabParam === 'operations') return 'operations';
    if (tabParam === 'executive') return 'executive';
    try {
      const saved = localStorage.getItem('retailcore_dashboard_tab');
      if (saved === 'operations') return 'operations';
    } catch {
      // LocalStorage access fallback
    }
    return 'executive';
  });

  const handleTabChange = (tab: 'executive' | 'operations') => {
    setActiveTab(tab);
    try {
      localStorage.setItem('retailcore_dashboard_tab', tab);
    } catch {
      // LocalStorage fallback
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === 'executive') {
        next.delete('tab');
      } else {
        next.set('tab', tab);
      }
      return next;
    });
  };

  const [dateRange, setDateRange] = useState('7days');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Compute dates based on selection
  const dates = useMemo(() => {
    const today = new Date();
    let from = new Date();
    let to = new Date();

    switch (dateRange) {
      case 'today':
        break;
      case 'yesterday':
        from = subDays(today, 1);
        to = subDays(today, 1);
        break;
      case '7days':
        from = subDays(today, 6);
        break;
      case 'this_month':
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case 'last_month':
        const lastMonth = subMonths(today, 1);
        from = startOfMonth(lastMonth);
        to = endOfMonth(lastMonth);
        break;
      case 'this_year':
        from = new Date(today.getFullYear(), 0, 1);
        to = new Date(today.getFullYear(), 11, 31);
        break;
    }
    return {
      date_from: format(from, 'yyyy-MM-dd'),
      date_to: format(to, 'yyyy-MM-dd'),
    };
  }, [dateRange]);

  const canViewDashboard =
    hasRole('Super Admin') ||
    hasRole('Admin') ||
    hasPermission('reports.dashboard') ||
    hasPermission('bi.view') ||
    hasPermission('bi.dashboard');

  const { data: summary, isLoading, error, refetch, isFetching } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary', dates.date_from, dates.date_to],
    queryFn: async () => {
      const response = await api.get('/dashboard/summary', { params: dates });
      return response.data.data;
    },
    enabled: !!user && canViewDashboard && activeTab === 'operations',
    staleTime: 5 * 60 * 1000, // Cache for 5 mins
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const todaySalesAmount = useMemo(() => {
    if (!summary) return 0;
    if (summary.today_sales !== undefined) {
      return Number(summary.today_sales);
    }
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const match = summary.sales_trend?.find(t => t.sale_date === todayStr);
    if (match) {
      return Number(match.total);
    }
    return dateRange === 'today' ? Number(summary.net_sales) : Number(summary.net_sales) / Math.max(1, summary.sales_trend?.length || 1);
  }, [summary, dateRange]);

  if (!canViewDashboard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
          <Activity className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">{t('dashboard.accessDenied', 'Access Denied')}</h2>
        <p className="text-slate-500">{t('dashboard.accessDeniedDesc', 'You do not have permission to view this dashboard.')}</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1920px] mx-auto space-y-6">
      {/* ======================================================== */}
      {/* UNIFIED DASHBOARD HEADER & PHASE 13 VIEW SWITCHER        */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {activeTab === 'executive'
                    ? t('bi.title', 'Executive BI & Management Intelligence')
                    : t('nav.dashboard', 'Store Operations & POS Dashboard')}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  Phase 13
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                {activeTab === 'executive'
                  ? t('bi.subtitle', 'Unified Real-Time Enterprise Analytics, Cross-Module KPIs & Performance Telemetry')
                  : t('dashboard.operationsSubtitle', 'Live point of sale telemetry, register sessions, catalog & cashier operations')}
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-900/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 shrink-0">
          <button
            id="tab-btn-executive-bi"
            onClick={() => handleTabChange('executive')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'executive'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <span>{t('bi.executiveDashboard', 'Executive BI (Phase 13)')}</span>
          </button>
          <button
            id="tab-btn-store-operations"
            onClick={() => handleTabChange('operations')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'operations'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4 text-slate-500" />
            <span>{t('dashboard.storeOperations', 'Store Operations & POS')}</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PHASE 13 BI QUICK-LAUNCH SUITE BAR                       */}
      {/* ======================================================== */}
      <div className="bg-slate-50/80 dark:bg-slate-900/40 rounded-xl border border-slate-200/80 dark:border-slate-800 p-3 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
          {t('bi.suite', 'BI Suite')}:
        </span>
        <Link
          to="/bi/sales"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shrink-0 transition"
        >
          <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
          {t('bi.salesBi', 'Sales Intelligence')}
        </Link>
        <Link
          to="/bi/profitability"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shrink-0 transition"
        >
          <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
          {t('bi.profitabilityBi', 'Profitability')}
        </Link>
        <Link
          to="/bi/inventory"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shrink-0 transition"
        >
          <Package className="w-3.5 h-3.5 text-amber-500" />
          {t('bi.inventoryBi', 'Inventory & Aging')}
        </Link>
        <Link
          to="/bi/customer"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shrink-0 transition"
        >
          <Users className="w-3.5 h-3.5 text-teal-500" />
          {t('bi.customerBi', 'Customer RFM')}
        </Link>
        <Link
          to="/bi/supplier"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shrink-0 transition"
        >
          <Building2 className="w-3.5 h-3.5 text-slate-500" />
          {t('bi.supplierBi', 'Supplier Scorecard')}
        </Link>
        <Link
          to="/bi/finance"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shrink-0 transition"
        >
          <PieChart className="w-3.5 h-3.5 text-purple-500" />
          {t('bi.financeBi', 'DuPont & Ratios')}
        </Link>
        <Link
          to="/bi/alerts"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shrink-0 transition"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          {t('bi.alerts', 'Management Alerts')}
        </Link>
        <Link
          to="/bi/report-builder"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shrink-0 transition"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500" />
          {t('bi.reportBuilder', 'Report Builder')}
        </Link>
        <Link
          to="/bi/saved-reports"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shrink-0 transition"
        >
          <LineChart className="w-3.5 h-3.5 text-cyan-500" />
          {t('bi.savedReports', 'Saved Reports')}
        </Link>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: EXECUTIVE BI (PHASE 13)                           */}
      {/* ======================================================== */}
      {activeTab === 'executive' ? (
        <div className="space-y-6">
          <ExecutiveDashboard />
        </div>
      ) : (
        /* ======================================================== */
        /* TAB 2: STORE OPERATIONS & POS                            */
        /* ======================================================== */
        <div className="space-y-6">
          {/* Phase 13 Promotion Callout on Operations Tab */}
          <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-pink-950/20 border border-indigo-200/80 dark:border-indigo-800/60 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('dashboard.biCalloutTitle', 'Phase 13: Executive BI & Management Reporting Suite Active')}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {t('dashboard.biCalloutSubtitle', 'Access cross-channel revenue telemetry, DuPont financial decomposition, RFM customer portfolio, and automated threshold alerts.')}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleTabChange('executive')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs shrink-0 cursor-pointer"
            >
              <span>{t('dashboard.viewExecutiveBi', 'Open Executive BI')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Top Header with Period Selection and Refresh */}
          <DashboardHeader
            dateRange={dateRange}
            setDateRange={setDateRange}
            onRefresh={handleRefresh}
            isFetching={isFetching || isRefreshing}
          />

          {/* Module Shortcuts Grid (Large Touch-Friendly Action Cards) */}
          <QuickActionShortcuts />

          {error ? (
            <div className="bg-rose-50 text-rose-700 p-6 rounded-2xl border border-rose-100 flex items-start gap-4">
              <div className="mt-0.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold">{t('common.error', 'Failed to load dashboard data')}</h3>
                <p className="text-sm mt-1">An error occurred while communicating with the server. Please check your connection and try again.</p>
                <button
                  onClick={handleRefresh}
                  className="mt-3 text-sm font-bold bg-white text-rose-700 px-4 py-2 rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  {t('dashboard.retry', 'Retry')}
                </button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs h-36 animate-pulse">
                    <div className="w-12 h-12 bg-slate-200 rounded-xl mb-4"></div>
                    <div className="w-24 h-4 bg-slate-200 rounded mb-2"></div>
                    <div className="w-32 h-6 bg-slate-200 rounded"></div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-xs h-96 animate-pulse"></div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xs h-96 animate-pulse"></div>
              </div>
            </div>
          ) : summary ? (
            <div className="space-y-6">
              {/* PRIMARY 4 KPI CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <KpiCard
                  id="kpi-today-sales"
                  title={t('dashboard.todaySales', "Today's Sales")}
                  value={formatCurrency(todaySalesAmount)}
                  icon={TrendingUp}
                  color="emerald"
                  badgeText={t('dashboard.today', 'Today')}
                  subtitle={format(new Date(), 'dd MMMM yyyy')}
                />
                <KpiCard
                  id="kpi-total-sales"
                  title={t('dashboard.totalSales', 'Total Sales')}
                  value={formatCurrency(summary.net_sales)}
                  icon={TrendingUp}
                  color="blue"
                  badgeText={t('dashboard.selectedPeriod', 'Period')}
                  subtitle={`Gross: ${formatCurrency(summary.gross_sales)}`}
                />
                <KpiCard
                  id="kpi-total-items"
                  title={t('dashboard.totalItems', 'Total Items')}
                  value={summary.total_products.toLocaleString()}
                  icon={Package}
                  color="orange"
                  badgeText={t('dashboard.inCatalog', 'Catalog')}
                  subtitle={`${summary.low_stock} ${t('dashboard.lowStockAlerts', 'Low Stock')}`}
                />
                <KpiCard
                  id="kpi-net-profit"
                  title={t('dashboard.netProfit', 'Net Profit')}
                  value={formatCurrency(summary.net_profit)}
                  icon={DollarSign}
                  color="purple"
                  badgeText={`${summary.gross_margin}% Margin`}
                  trend={{
                    value: `${summary.gross_margin}%`,
                    isPositive: Number(summary.net_profit) >= 0
                  }}
                  subtitle={`Gross Profit: ${formatCurrency(summary.gross_profit)}`}
                />
              </div>

              {/* SECONDARY RETAIL METRICS ROW */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <KpiCard
                  title={t('dashboard.totalPurchase', 'Total Purchases')}
                  value={formatCurrency(summary.purchases)}
                  icon={ShoppingCart}
                  color="amber"
                />
                <KpiCard
                  title={t('dashboard.totalExpense', 'Total Expenses')}
                  value={formatCurrency(summary.expenses)}
                  icon={TrendingDown}
                  color="rose"
                />
                <KpiCard
                  title={t('dashboard.customerDue', 'Customer Receivables')}
                  value={formatCurrency(summary.receivables)}
                  icon={Users}
                  color="teal"
                />
                <KpiCard
                  title={t('dashboard.supplierDue', 'Supplier Payables')}
                  value={formatCurrency(summary.payables)}
                  icon={Wallet}
                  color="slate"
                />
              </div>

              {/* CHARTS ROW */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <SalesOverviewChart salesTrend={summary.sales_trend} />
                </div>
                <div>
                  <CategorySalesChart categorySales={summary.category_sales} />
                </div>
              </div>

              {/* SUPPORTING ANALYTICS & FINANCIAL ROW */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div>
                  <TopProductsList products={summary.top_products} />
                </div>
                <div>
                  <PaymentMethodsChart paymentMethods={summary.payment_methods} />
                </div>
                <div>
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-full">
                    <div className="mb-6">
                      <h3 className="font-extrabold text-lg text-slate-900">
                        {t('dashboard.financialSummary', 'Financial Balances')}
                      </h3>
                      <p className="text-sm text-slate-500 font-medium">Live liquid assets and inventory values</p>
                    </div>
                    <div className="flex-1 flex flex-col justify-around">
                      <div className="flex justify-between items-center py-3 border-b border-slate-100">
                        <span className="text-slate-600 font-medium">{t('dashboard.cashBalance', 'Cash Balance')}</span>
                        <span className="font-extrabold text-slate-900">{formatCurrency(summary.cash_balance)}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-slate-100">
                        <span className="text-slate-600 font-medium">{t('dashboard.bankBalance', 'Bank Balance')}</span>
                        <span className="font-extrabold text-slate-900">{formatCurrency(summary.bank_balance)}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-slate-100">
                        <span className="text-slate-600 font-medium">{t('dashboard.inventoryValue', 'Inventory Value')}</span>
                        <span className="font-extrabold text-slate-900">{formatCurrency(summary.inventory_value)}</span>
                      </div>
                      <div className="flex justify-between items-center py-3">
                        <span className="text-slate-600 font-medium">{t('dashboard.cashCreditRatio', 'Cash vs Credit Sales')}</span>
                        <span className="font-extrabold text-slate-900 text-sm text-right">
                          <span className="text-emerald-600">{formatCurrency(summary.cash_sales)}</span>
                          <span className="text-slate-300 mx-1">/</span>
                          <span className="text-indigo-600">{formatCurrency(summary.credit_sales)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* OPERATIONAL & INVENTORY STATUS ROW */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div>
                  <AccountingHealth health={summary.accounting_health} />
                </div>
                <div>
                  <SystemStatusCard />
                </div>
                <div>
                  <LowStockTable lowStockDetails={summary.low_stock_details} />
                </div>
              </div>

              {/* RECENT TRANSACTIONS ROW */}
              <RecentTransactions
                recentSales={summary.recent_sales}
                recentPurchases={summary.recent_purchases}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
export default Dashboard;
