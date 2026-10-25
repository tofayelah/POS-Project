import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, ShoppingBag, PackageCheck, Clock, XCircle, 
  Users, DollarSign, ArrowUpRight, ArrowDownRight, Store, Warehouse, 
  Layers, RefreshCw, FileText, ArrowRight, ShieldCheck, CheckCircle2
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, 
  Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { Link } from 'react-router';
import { 
  getPurchaseDashboardReport, 
  PurchaseDashboardData, 
  PurchaseReportFilters,
  exportReportToCsv,
  exportReportToExcel
} from '../../../api/purchaseReports';
import { PurchaseReportFilterBar } from '../../../components/purchase/reports/PurchaseReportFilterBar';

const CATEGORY_COLORS = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

export const PurchaseAnalyticsDashboard: React.FC = () => {
  const [filters, setFilters] = useState<PurchaseReportFilters>({
    start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });
  const [data, setData] = useState<PurchaseDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getPurchaseDashboardReport(filters);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load purchase analytics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFilterChange = (newFilters: PurchaseReportFilters) => {
    setFilters(newFilters);
  };

  const handleReset = () => {
    const defaultFilters: PurchaseReportFilters = {
      start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
    };
    setFilters(defaultFilters);
    getPurchaseDashboardReport(defaultFilters).then((res) => setData(res));
  };

  const handleExportCsv = () => {
    if (!data) return;
    const headers = ['KPI Metric', 'Value'];
    const rows = [
      ['Total Posted Spend (BDT)', `৳${data.kpis.total_posted_spend.toLocaleString()}`],
      ['Posted Invoices Count', data.kpis.posted_invoices_count],
      ['Purchase Orders Created', data.kpis.purchase_orders_created],
      ['Approved Orders', data.kpis.approved_orders],
      ['Outstanding Order Quantity', data.kpis.outstanding_order_qty],
      ['Goods Received Quantity', data.kpis.goods_received_qty],
      ['Pending Approvals Count', data.kpis.pending_approvals_count],
      ['Cancelled Vouchers Count', data.kpis.cancelled_count],
      ['Average Invoice Value (BDT)', `৳${data.kpis.average_invoice_value.toLocaleString()}`],
      ['Active Suppliers Count', data.kpis.active_suppliers_count],
    ];
    exportReportToCsv('purchase_analytics_kpi_summary', headers, rows);
  };

  const kpis = data?.kpis || {
    total_posted_spend: 0,
    posted_invoices_count: 0,
    purchase_orders_created: 0,
    approved_orders: 0,
    outstanding_order_qty: 0,
    goods_received_qty: 0,
    pending_approvals_count: 0,
    cancelled_count: 0,
    average_invoice_value: 0,
    active_suppliers_count: 0,
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
            <Link to="/purchases/reports" className="hover:underline">Purchase Reports</Link>
            <span>/</span>
            <span>Analytics Dashboard</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-indigo-600 shrink-0" />
            Purchase Analytics Dashboard
          </h1>
          <p className="text-xs font-medium text-slate-600 mt-1">
            Real-time procurement KPIs, spending trends, supplier concentration, and delivery tracking (BDT / ৳)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!data || isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition cursor-pointer"
          >
            Export Summary
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <PurchaseReportFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onSearch={loadData}
        onReset={handleReset}
        onExportExcel={handleExportCsv}
        isLoading={isLoading}
        showBranchFilter={true}
        showWarehouseFilter={true}
        showSupplierFilter={true}
      />

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
          ⚠️ {error}
        </div>
      )}

      {/* 10 Verified KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* KPI 1 */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Posted Spend</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">
              ৳{kpis.total_posted_spend.toLocaleString()}
            </div>
            <Link to="/purchases/reports/date-wise" className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5 mt-1">
              View Date-wise Detail <ArrowRight className="w-2.5 h-2.5" />
            </Link>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Posted Invoices</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{kpis.posted_invoices_count}</div>
            <Link to="/purchases/reports/invoices" className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-0.5 mt-1">
              View Invoices Register <ArrowRight className="w-2.5 h-2.5" />
            </Link>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">POs Created</span>
            <div className="p-1.5 bg-cyan-50 text-cyan-600 rounded-lg">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{kpis.purchase_orders_created}</div>
            <Link to="/purchases/reports/ordered-vouchers" className="text-[10px] font-bold text-cyan-600 hover:underline flex items-center gap-0.5 mt-1">
              View PO Register <ArrowRight className="w-2.5 h-2.5" />
            </Link>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Approved Orders</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{kpis.approved_orders}</div>
            <span className="text-[10px] font-semibold text-slate-500 mt-1 block">Contracted commitments</span>
          </div>
        </div>

        {/* KPI 5 */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Outstanding Qty</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-amber-700">{kpis.outstanding_order_qty}</div>
            <Link to="/purchases/reports/order-outstanding" className="text-[10px] font-bold text-amber-700 hover:underline flex items-center gap-0.5 mt-1">
              Track Outstanding <ArrowRight className="w-2.5 h-2.5" />
            </Link>
          </div>
        </div>

        {/* KPI 6 */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">GRN Received Qty</span>
            <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-teal-700">{kpis.goods_received_qty}</div>
            <Link to="/purchases/reports/received-vouchers" className="text-[10px] font-bold text-teal-700 hover:underline flex items-center gap-0.5 mt-1">
              Goods Receipts <ArrowRight className="w-2.5 h-2.5" />
            </Link>
          </div>
        </div>

        {/* KPI 7 */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Pending Approval</span>
            <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-orange-700">{kpis.pending_approvals_count}</div>
            <Link to="/purchases/reports/pending-approval" className="text-[10px] font-bold text-orange-700 hover:underline flex items-center gap-0.5 mt-1">
              Review Queue <ArrowRight className="w-2.5 h-2.5" />
            </Link>
          </div>
        </div>

        {/* KPI 8 */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Cancelled Vouchers</span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-rose-700">{kpis.cancelled_count}</div>
            <Link to="/purchases/reports/cancelled-vouchers" className="text-[10px] font-bold text-rose-700 hover:underline flex items-center gap-0.5 mt-1">
              Cancelled Register <ArrowRight className="w-2.5 h-2.5" />
            </Link>
          </div>
        </div>

        {/* KPI 9 */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Avg Invoice Value</span>
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-purple-950">৳{kpis.average_invoice_value.toLocaleString()}</div>
            <span className="text-[10px] font-semibold text-slate-500 mt-1 block">Per posted invoice</span>
          </div>
        </div>

        {/* KPI 10 */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Active Suppliers</span>
            <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-sky-950">{kpis.active_suppliers_count}</div>
            <Link to="/purchases/reports/supplier-wise" className="text-[10px] font-bold text-sky-600 hover:underline flex items-center gap-0.5 mt-1">
              Supplier Accounts <ArrowRight className="w-2.5 h-2.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Interactive Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Spend Over Time */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900">Purchase Spend Over Time</h3>
              <p className="text-[11px] text-slate-500">Daily posted procurement totals</p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
              BDT (৳)
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.charts.spend_over_time || []}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94A3B8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94A3B8" tickFormatter={(v) => `৳${v/1000}k`} />
                <Tooltip 
                  formatter={(val: any) => [`৳${Number(val).toLocaleString()}`, 'Total Spend']}
                  contentStyle={{ backgroundColor: '#1E293B', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="spend" stroke="#4F46E5" strokeWidth={2.5} fillOpacity={1} fill="url(#spendGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Top Suppliers by Spend */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900">Top Suppliers Concentration</h3>
              <p className="text-[11px] text-slate-500">Highest procurement spend vendors</p>
            </div>
            <Link to="/purchases/reports/supplier-wise" className="text-xs font-bold text-indigo-600 hover:underline">
              View All
            </Link>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.charts.spend_by_supplier || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="#94A3B8" tickFormatter={(v) => `৳${v/1000}k`} />
                <YAxis type="category" dataKey="supplier" tick={{ fontSize: 10 }} width={120} stroke="#94A3B8" />
                <Tooltip 
                  formatter={(val: any) => [`৳${Number(val).toLocaleString()}`, 'Spend']}
                  contentStyle={{ backgroundColor: '#1E293B', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="spend" fill="#06B6D4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Category Share */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900">Spend by Product Category</h3>
              <p className="text-[11px] text-slate-500">Inventory allocation & diversification</p>
            </div>
            <Link to="/purchases/reports/category-wise" className="text-xs font-bold text-indigo-600 hover:underline">
              Category Report
            </Link>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.charts.spend_by_category || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="spend"
                  nameKey="category"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {(data?.charts.spend_by_category || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => [`৳${Number(val).toLocaleString()}`, 'Spend']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Ordered vs Received Quantities */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900">Ordered vs. Received Volumes</h3>
              <p className="text-[11px] text-slate-500">Procurement fulfillment & supplier delivery accuracy</p>
            </div>
            <Link to="/purchases/reports/order-outstanding" className="text-xs font-bold text-indigo-600 hover:underline">
              Outstanding POs
            </Link>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.charts.ordered_vs_received || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94A3B8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94A3B8" />
                <Tooltip contentStyle={{ backgroundColor: '#1E293B', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="ordered" name="Ordered Qty" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="received" name="Received Qty" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Navigation Footer */}
      <div className="bg-indigo-900 text-white p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-base font-black">Ready to inspect detailed purchase audits?</h4>
          <p className="text-xs text-indigo-200 mt-0.5">
            Access 22 authoritative reports covering reconciliation, tax compliance, price history, and vendor AP.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/purchases/reports/reconciliation"
            className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition"
          >
            3-Way Reconciliation
          </Link>
          <Link
            to="/purchases/reports"
            className="px-4 py-2 bg-white text-indigo-900 hover:bg-indigo-50 rounded-xl text-xs font-black shadow-sm transition"
          >
            Explore Reports Catalog
          </Link>
        </div>
      </div>
    </div>
  );
};
