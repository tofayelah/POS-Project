import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Layers
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

export function Dashboard() {
  const { user, hasPermission, hasRole } = useAuth();
  const { t } = useLanguage();
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

  const canViewDashboard = hasRole('Super Admin') || hasPermission('reports.dashboard');

  const { data: summary, isLoading, error, refetch, isFetching } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary', dates.date_from, dates.date_to],
    queryFn: async () => {
      const response = await api.get('/dashboard/summary', { params: dates });
      return response.data.data;
    },
    enabled: !!user && canViewDashboard,
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
    // If today is filtered or not in range, return net sales or 0
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
          {/* ======================================================== */}
          {/* TOP 4 PRIMARY KPI CARDS (Green, Blue, Orange, Purple)    */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* 1. Today's Sales (Emerald Green) */}
            <KpiCard
              id="kpi-today-sales"
              title={t('dashboard.todaySales', "Today's Sales")}
              value={formatCurrency(todaySalesAmount)}
              icon={TrendingUp}
              color="emerald"
              badgeText={t('dashboard.today', 'Today')}
              subtitle={format(new Date(), 'dd MMMM yyyy')}
            />

            {/* 2. Total Sales (Ocean Blue) */}
            <KpiCard
              id="kpi-total-sales"
              title={t('dashboard.totalSales', 'Total Sales')}
              value={formatCurrency(summary.net_sales)}
              icon={TrendingUp}
              color="blue"
              badgeText={t('dashboard.selectedPeriod', 'Period')}
              subtitle={`Gross: ${formatCurrency(summary.gross_sales)}`}
            />

            {/* 3. Total Items (Vibrant Amber / Orange) */}
            <KpiCard
              id="kpi-total-items"
              title={t('dashboard.totalItems', 'Total Items')}
              value={summary.total_products.toLocaleString()}
              icon={Package}
              color="orange"
              badgeText={t('dashboard.inCatalog', 'Catalog')}
              subtitle={`${summary.low_stock} ${t('dashboard.lowStockAlerts', 'Low Stock')}`}
            />

            {/* 4. Net Profit (Royal Purple) */}
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

          {/* ======================================================== */}
          {/* SECONDARY RETAIL METRICS ROW                             */}
          {/* ======================================================== */}
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

          {/* ======================================================== */}
          {/* CHARTS ROW (Sales Overview Trend + Sales by Category)    */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SalesOverviewChart salesTrend={summary.sales_trend} />
            </div>
            <div>
              <CategorySalesChart categorySales={summary.category_sales} />
            </div>
          </div>

          {/* ======================================================== */}
          {/* SUPPORTING ANALYTICS & FINANCIAL ROW                     */}
          {/* ======================================================== */}
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

          {/* ======================================================== */}
          {/* OPERATIONAL & INVENTORY STATUS ROW                       */}
          {/* ======================================================== */}
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

          {/* ======================================================== */}
          {/* RECENT TRANSACTIONS ROW                                  */}
          {/* ======================================================== */}
          <RecentTransactions
            recentSales={summary.recent_sales}
            recentPurchases={summary.recent_purchases}
          />

        </div>
      ) : null}
    </div>
  );
}
