import React, { useEffect, useState } from 'react';
import { Truck, Search, CheckCircle2, Clock, RefreshCw, Eye } from 'lucide-react';
import { Link } from 'react-router';
import { ecommerceApi } from '../../api/ecommerce';
import { EcommerceOrder } from '../../types/ecommerce';

export function FulfillmentManagement() {
  const [orders, setOrders] = useState<EcommerceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('UNFULFILLED');

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await ecommerceApi.getOrders({
        fulfillment_status: statusFilter,
        channel: 'ECOMMERCE',
      });
      setOrders(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fulfillment & Shipping Station</h1>
          <p className="text-sm text-slate-500">Pick, pack, allocate courier shipments, and track deliveries</p>
        </div>
        <div className="flex gap-2">
          {['UNFULFILLED', 'ALLOCATED', 'SHIPPED', 'DELIVERED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Order #</th>
              <th className="py-3 px-4">Recipient</th>
              <th className="py-3 px-4">Destination</th>
              <th className="py-3 px-4 text-center">Items</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading shipments...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No orders currently in {statusFilter} status
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/60">
                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    {o.order_number || o.invoice_number}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">
                    <div>{o.shipping_address_snapshot?.recipient_name || o.customer?.name || '-'}</div>
                    <div className="text-xs text-slate-400">{o.shipping_address_snapshot?.mobile || '-'}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 text-xs">
                    {o.shipping_address_snapshot?.city || 'Dhaka'}, {o.shipping_address_snapshot?.district || 'Bangladesh'}
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-700">
                    {o.items?.reduce((sum, i) => sum + Number(i.quantity), 0) || 1} units
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                      {o.fulfillment_status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <Link
                      to={`/ecommerce/orders/${o.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> Fulfill
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default FulfillmentManagement;
