import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { 
  TrendingUp, TrendingDown, CreditCard, Banknote, ShoppingCart, 
  Package, Users, DollarSign, Wallet, FileText, Activity
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useAuth } from '../hooks/useAuth';

// Components
import { DashboardSummary } from '../components/dashboard/types';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { KpiCard } from '../components/dashboard/KpiCard';
import { SalesOverviewChart } from '../components/dashboard/SalesOverviewChart';
import { TopProductsList } from '../components/dashboard/TopProductsList';
import { PaymentMethodsChart } from '../components/dashboard/PaymentMethodsChart';
import { LowStockTable } from '../components/dashboard/LowStockTable';
import { RecentTransactions } from '../components/dashboard/RecentTransactions';
import { AccountingHealth } from '../components/dashboard/AccountingHealth';
import { formatCurrency } from '../utils/currency';

export function Dashboard() {
  const { user, hasPermission } = useAuth();
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

  const { data: summary, isLoading, error, refetch, isFetching } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary', dates.date_from, dates.date_to],
    queryFn: async () => {
      const response = await api.get('/dashboard/summary', { params: dates });
      return response.data.data;
    },
    enabled: !!user && hasPermission('reports.dashboard'),
    staleTime: 5 * 60 * 1000, // Cache for 5 mins
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  if (!hasPermission('reports.dashboard')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
          <Activity className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-500">You do not have permission to view this dashboard.</p>
      </div>
    );
  }

  return (
    <div className="pb-10 max-w-[1920px] mx-auto">
      <DashboardHeader 
        dateRange={dateRange}
        setDateRange={setDateRange}
        onRefresh={handleRefresh}
        isFetching={isFetching || isRefreshing}
      />

      {error ? (
        <div className="bg-rose-50 text-rose-700 p-6 rounded-xl border border-rose-100 mb-8 flex items-start gap-4">
          <div className="mt-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div>
            <h3 className="font-bold">Failed to load dashboard data</h3>
            <p className="text-sm mt-1">An error occurred while communicating with the server. Please check your connection and try again.</p>
            <button onClick={handleRefresh} className="mt-3 text-sm font-bold bg-white text-rose-700 px-4 py-2 rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors">
              Retry
            </button>
          </div>
        </div>
      ) : isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm h-32 animate-pulse">
                <div className="w-10 h-10 bg-slate-200 rounded-xl mb-4"></div>
                <div className="w-24 h-4 bg-slate-200 rounded mb-2"></div>
                <div className="w-32 h-6 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm h-96 animate-pulse"></div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm h-96 animate-pulse"></div>
          </div>
        </div>
      ) : summary ? (
        <div className="space-y-6">
          {/* Main KPIs (8 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard title="Total Sales" value={formatCurrency(summary.net_sales)} icon={TrendingUp} color="indigo" />
            <KpiCard title="Total Purchase" value={formatCurrency(summary.purchases)} icon={ShoppingCart} color="amber" />
            <KpiCard title="Total Expense" value={formatCurrency(summary.expenses)} icon={TrendingDown} color="rose" />
            <KpiCard title="Net Profit" value={formatCurrency(summary.net_profit)} icon={DollarSign} color="emerald" />
            
            <KpiCard title="Total Products" value={summary.total_products.toLocaleString()} icon={Package} color="blue" />
            <KpiCard title="Low Stock Items" value={summary.low_stock.toLocaleString()} icon={Activity} color="orange" />
            <KpiCard title="Customer Due" value={formatCurrency(summary.receivables)} icon={Users} color="teal" />
            <KpiCard title="Supplier Due" value={formatCurrency(summary.payables)} icon={Wallet} color="slate" />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SalesOverviewChart salesTrend={summary.sales_trend} />
            </div>
            <div>
              <TopProductsList products={summary.top_products} />
            </div>
          </div>

          {/* Financials & Analytics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <PaymentMethodsChart paymentMethods={summary.payment_methods} />
            </div>
            <div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-full">
                <div className="mb-6">
                  <h3 className="font-extrabold text-lg text-slate-900">Financial Summary</h3>
                  <p className="text-sm text-slate-500 font-medium">Current balances</p>
                </div>
                <div className="flex-1 flex flex-col justify-around">
                  <div className="flex justify-between items-center py-3 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Cash Balance</span>
                    <span className="font-extrabold text-slate-900">{formatCurrency(summary.cash_balance)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Bank Balance</span>
                    <span className="font-extrabold text-slate-900">{formatCurrency(summary.bank_balance)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Inventory Value</span>
                    <span className="font-extrabold text-slate-900">{formatCurrency(summary.inventory_value)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-slate-600 font-medium">Cash vs Credit Sales</span>
                    <span className="font-extrabold text-slate-900 text-sm text-right">
                      <span className="text-emerald-600">{formatCurrency(summary.cash_sales)}</span>
                      <span className="text-slate-300 mx-1">/</span>
                      <span className="text-indigo-600">{formatCurrency(summary.credit_sales)}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <AccountingHealth health={summary.accounting_health} />
            </div>
          </div>

          {/* Inventory & Stock Row */}
          <div className="grid grid-cols-1 gap-6">
            <LowStockTable lowStockDetails={summary.low_stock_details} />
          </div>

          {/* Recent Transactions Row */}
          <RecentTransactions recentSales={summary.recent_sales} recentPurchases={summary.recent_purchases} />

        </div>
      ) : null}
    </div>
  );
}
