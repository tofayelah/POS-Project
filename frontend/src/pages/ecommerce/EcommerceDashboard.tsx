import React, { useEffect, useState } from 'react';
import {
  ShoppingBag,
  DollarSign,
  Truck,
  RotateCcw,
  CheckCircle2,
  Clock,
  TrendingUp,
  RefreshCw,
  ArrowUpRight,
  ChevronRight,
  Globe,
  Tag,
} from 'lucide-react';
import { Link } from 'react-router';
import { ecommerceApi } from '../../api/ecommerce';
import { EcommerceAnalytics, EcommerceOrder } from '../../types/ecommerce';
import { useLanguage } from '../../i18n';

export function EcommerceDashboard() {
  const { t } = useLanguage();
  const [data, setData] = useState<EcommerceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ecommerceApi.getReportsOverview();
      setData(res.data);
    } catch (err: any) {
      console.error('Failed to load ecommerce analytics', err);
      setError(err?.response?.data?.message || 'Failed to load e-commerce analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const kpis = data?.kpis || {
    total_ecommerce_sales: 0,
    total_orders_count: 0,
    delivered_orders_count: 0,
    pending_fulfillment_count: 0,
    average_order_value: 0,
    cod_revenue: 0,
    online_payment_revenue: 0,
    returns_count: 0,
    return_rate_percentage: 0,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-7 h-7 text-emerald-500" />
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              {t('ecommerce.dashboardTitle', 'E-Commerce & Omnichannel Commerce')}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {t('ecommerce.dashboardSubtitle', 'Unified online store sales, order fulfillment, delivery tracking, and channel analytics')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh', 'Refresh')}
          </button>
          <Link
            to="/ecommerce/orders"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            {t('ecommerce.viewOrders', 'Manage Orders')}
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Revenue</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-800">
              ৳{(kpis.total_ecommerce_sales || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span>Avg Order: ৳{(kpis.average_order_value || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Orders</span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-800">
              {kpis.total_orders_count || 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {kpis.delivered_orders_count || 0} delivered
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Fulfillment</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-800">
              {kpis.pending_fulfillment_count || 0}
            </div>
            <div className="text-xs text-amber-600 mt-1">
              Requires pick/pack/ship
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Return Rate</span>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
              <RotateCcw className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-800">
              {(kpis.return_rate_percentage || 0).toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {kpis.returns_count || 0} returns processed
            </div>
          </div>
        </div>
      </div>

      {/* Tender & Channel Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center justify-between">
            <span>Payment Tender Split</span>
            <span className="text-xs text-slate-400 font-normal">Cash-on-Delivery vs Online Gateway</span>
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs font-medium text-slate-500">COD (Cash on Delivery)</div>
              <div className="text-xl font-bold text-slate-800 mt-1">
                ৳{(kpis.cod_revenue || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-400 mt-1">Settled on delivery confirmation</div>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="text-xs font-medium text-emerald-700">Online Prepayment (bKash / Card)</div>
              <div className="text-xl font-bold text-emerald-800 mt-1">
                ৳{(kpis.online_payment_revenue || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-emerald-600 mt-1">Instant GL payment posting</div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Quick Navigation</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/ecommerce/catalog"
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-700">Catalog Publishing</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
            <Link
              to="/ecommerce/fulfillment"
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-semibold text-slate-700">Fulfillment & Shipping</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
            <Link
              to="/ecommerce/coupons"
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-semibold text-slate-700">Coupons & Promos</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
            <Link
              to="/ecommerce/settings"
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-semibold text-slate-700">Store Settings</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Top Performing Online Products</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4 text-right">Units Sold</th>
                <th className="py-3 px-4 text-right">Total Revenue (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.top_products || []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    No online sales recorded yet
                  </td>
                </tr>
              ) : (
                data?.top_products.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">{p.sku}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{p.product_name}</td>
                    <td className="py-3 px-4 text-right text-slate-700">{p.units_sold}</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-800">
                      ৳{Number(p.revenue).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
export default EcommerceDashboard;
