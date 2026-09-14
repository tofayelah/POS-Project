import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { 
  TrendingUp, CreditCard, Banknote, ShoppingCart, 
  Package, Users, ShoppingBag, ArrowUpRight, ArrowDownRight,
  RefreshCw, Search, Bell, User, Calendar
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency } from '../utils/currency';

interface DashboardSummary {
  gross_sales: number;
  sales_returns: number;
  net_sales: number;
  purchases: number;
  expenses: number;
  gross_profit: number;
  gross_margin: number;
  cash_sales: number;
  credit_sales: number;
  receivables: number;
  payables: number;
  inventory_value: number;
  sales_trend: Array<{ sale_date: string; total: string }>;
  top_products: Array<{ name: string; sku: string; qty: string; total: string }>;
  top_customers: Array<{ name: string; total: string }>;
}

export function Dashboard() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState('7days'); 
  
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
        from = subDays(today, 7);
        break;
      case 'thisMonth':
        from = startOfMonth(today);
        break;
      case 'lastMonth':
        from = startOfMonth(subMonths(today, 1));
        to = endOfMonth(subMonths(today, 1));
        break;
    }
    return {
      date_from: format(from, 'yyyy-MM-dd'),
      date_to: format(to, 'yyyy-MM-dd')
    };
  }, [dateRange]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', dates],
    queryFn: async () => {
      const res = await api.get('/dashboard/summary', { params: dates });
      return res.data as { data: DashboardSummary };
    }
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-64 bg-slate-100 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-32 animate-pulse flex flex-col justify-between">
               <div className="h-4 w-24 bg-slate-100 rounded"></div>
               <div className="h-8 w-32 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-red-900 mb-2">Failed to load dashboard data.</h3>
          <p className="text-red-600 mb-6">There was a problem retrieving the business overview.</p>
          <button 
            onClick={() => refetch()}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const summary = data.data;

  // Render logic for missing data
  const isDataEmpty = summary.net_sales === 0 && summary.purchases === 0 && summary.expenses === 0 && summary.sales_trend.length === 0;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8 bg-slate-50/50 min-h-screen">
      
      {/* Top Header Imitation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-8">
        <div className="relative w-full md:w-96">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search modules, records, or settings..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>
        <div className="flex items-center gap-3 self-end md:self-auto">
          <button className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-full transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
          </button>
          <div className="h-8 w-px bg-slate-200 mx-1"></div>
          <div className="flex items-center gap-3 pl-2">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-500">{user?.roles?.[0]?.name || 'Admin'}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shadow-inner">
              {user?.name?.substring(0, 1).toUpperCase() || 'U'}
            </div>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Overview of your business performance</p>
        </div>
        
        <div className="relative">
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="appearance-none bg-white border border-slate-200 text-slate-700 font-medium py-2.5 pl-10 pr-10 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm cursor-pointer"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="7days">Last 7 Days</option>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
          </select>
          <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {isDataEmpty ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-1">No data available</h3>
          <p className="text-slate-500">There is no recorded data for the selected period.</p>
        </div>
      ) : (
        <>
          {/* Primary KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Sales */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-50 rounded-full group-hover:scale-110 transition-transform"></div>
              <div className="flex justify-between items-start mb-6 relative z-10">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Total Sales</p>
                <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="relative z-10">
                <h2 className="text-3xl font-extrabold text-slate-900 mb-1">{formatCurrency(summary.net_sales)}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-slate-500 font-medium">Net Sales Value</span>
                </div>
              </div>
            </div>

            {/* Purchases */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-110 transition-transform"></div>
              <div className="flex justify-between items-start mb-6 relative z-10">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Total Purchases</p>
                <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>
              <div className="relative z-10">
                <h2 className="text-3xl font-extrabold text-slate-900 mb-1">{formatCurrency(summary.purchases)}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-slate-500 font-medium">Purchase Total</span>
                </div>
              </div>
            </div>

            {/* Expenses */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-50 rounded-full group-hover:scale-110 transition-transform"></div>
              <div className="flex justify-between items-start mb-6 relative z-10">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Total Expenses</p>
                <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
              <div className="relative z-10">
                <h2 className="text-3xl font-extrabold text-slate-900 mb-1">{formatCurrency(summary.expenses)}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-slate-500 font-medium">Operating Expenses</span>
                </div>
              </div>
            </div>

            {/* Profit */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform"></div>
              <div className="flex justify-between items-start mb-6 relative z-10">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Gross Profit</p>
                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600">
                  <Banknote className="w-5 h-5" />
                </div>
              </div>
              <div className="relative z-10">
                <h2 className="text-3xl font-extrabold text-slate-900 mb-1">{formatCurrency(summary.gross_profit)}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700">
                    {summary.gross_margin > 0 ? '+' : ''}{Number(summary.gross_margin).toFixed(1)}%
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Margin</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts & Details */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Sales Overview Chart */}
            <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-extrabold text-lg text-slate-900">Sales Overview</h3>
              </div>
              <div className="h-[320px] w-full">
                {summary.sales_trend.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-slate-400 text-sm">No trend data available for this period.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={summary.sales_trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="sale_date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} 
                        dy={10} 
                        tickFormatter={(str) => {
                          const d = new Date(str);
                          return isNaN(d.getTime()) ? str : format(d, 'MMM d');
                        }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} 
                        dx={-10} 
                        tickFormatter={(val) => `৳ ${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} 
                      />
                      <RechartsTooltip 
                        cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px' }} 
                        itemStyle={{ color: '#0f172a', fontWeight: 700 }}
                        labelStyle={{ color: '#64748b', marginBottom: '4px', fontSize: '13px' }}
                      />
                      <Area type="monotone" dataKey="total" name="Sales" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
              <h3 className="font-extrabold text-lg text-slate-900 mb-6">Top Selling Products</h3>
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {summary.top_products.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-slate-400 text-sm text-center">No product sales data available.</p>
                  </div>
                ) : (
                  summary.top_products.map((p, idx) => {
                    const maxVal = Math.max(...summary.top_products.map(tp => Number(tp.total)));
                    const percent = maxVal > 0 ? (Number(p.total) / maxVal) * 100 : 0;
                    return (
                      <div key={idx} className="relative">
                        <div className="flex justify-between items-end mb-2 relative z-10">
                          <div className="min-w-0 flex-1 pr-4">
                            <p className="text-sm font-bold text-slate-900 truncate">{p.name}</p>
                            <p className="text-xs text-slate-500 font-medium">SKU: {p.sku} • {Number(p.qty)} sold</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-slate-900">{formatCurrency(p.total)}</p>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1 overflow-hidden">
                          <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Inventory Value</p>
                <p className="text-lg font-extrabold text-slate-900">{formatCurrency(summary.inventory_value)}</p>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Customer Receivables</p>
                <p className="text-lg font-extrabold text-slate-900">{formatCurrency(summary.receivables)}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Supplier Payables</p>
                <p className="text-lg font-extrabold text-slate-900">{formatCurrency(summary.payables)}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Banknote className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Cash vs Credit</p>
                <p className="text-sm font-extrabold text-slate-900">
                  {formatCurrency(summary.cash_sales)} <span className="text-slate-400 font-normal">/</span> {formatCurrency(summary.credit_sales)}
                </p>
              </div>
            </div>
          </div>

          {/* Top Customers (Replaces Recent Sales since we don't have recent sales in API) */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-extrabold text-lg text-slate-900 mb-6">Top Customers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {summary.top_customers.length === 0 ? (
                <p className="text-slate-500 text-sm col-span-full">No customer sales data available.</p>
              ) : (
                summary.top_customers.map((c, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 border border-slate-100 rounded-xl hover:shadow-sm transition-shadow bg-slate-50/50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                        {c.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{c.name}</p>
                        <p className="text-xs text-slate-500">Valued Customer</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{formatCurrency(c.total)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </>
      )}
    </div>
  );
}

