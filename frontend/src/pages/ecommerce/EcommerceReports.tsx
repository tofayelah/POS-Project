import React, { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, ShoppingBag, RotateCcw, RefreshCw } from 'lucide-react';
import { ecommerceApi } from '../../api/ecommerce';
import { EcommerceAnalytics } from '../../types/ecommerce';

export function EcommerceReports() {
  const [data, setData] = useState<EcommerceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await ecommerceApi.getReportsOverview();
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">E-Commerce & Omnichannel Reports</h1>
          <p className="text-sm text-slate-500">Comprehensive sales breakdown, channel performance, and return rate analysis</p>
        </div>
        <button
          onClick={loadReports}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xs uppercase font-bold text-slate-400">Total Net Revenue</h3>
          <div className="text-3xl font-extrabold text-slate-800 mt-2">
            ৳{Number(kpis.total_ecommerce_sales).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">Average Order: ৳{Number(kpis.average_order_value).toFixed(2)}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xs uppercase font-bold text-slate-400">Tender Collections</h3>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">COD Revenue:</span>
              <span className="font-bold text-slate-800">৳{Number(kpis.cod_revenue).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Online Gateway:</span>
              <span className="font-bold text-emerald-600">৳{Number(kpis.online_payment_revenue).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xs uppercase font-bold text-slate-400">Order Delivery & Returns</h3>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Delivered:</span>
              <span className="font-bold text-emerald-600">{kpis.delivered_orders_count} orders</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Returns:</span>
              <span className="font-bold text-rose-600">{kpis.returns_count} ({Number(kpis.return_rate_percentage).toFixed(1)}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Channel Comparison */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-800 text-base">Channel Revenue Breakdown</h3>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Sales Channel</th>
              <th className="py-3 px-4 text-center">Orders Count</th>
              <th className="py-3 px-4 text-right">Revenue (৳)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(data?.channel_breakdown || []).map((ch, idx) => (
              <tr key={idx} className="hover:bg-slate-50/60">
                <td className="py-3.5 px-4 font-semibold text-slate-800">{ch.channel}</td>
                <td className="py-3.5 px-4 text-center">{ch.order_count}</td>
                <td className="py-3.5 px-4 text-right font-bold text-slate-800">
                  ৳{Number(ch.revenue).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default EcommerceReports;
