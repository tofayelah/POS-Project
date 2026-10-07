import React, { useEffect, useState } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router';
import { ecommerceApi } from '../../api/ecommerce';
import { EcommerceOrder } from '../../types/ecommerce';
import { useLanguage } from '../../i18n';

export function OrderManagement() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<EcommerceOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [channel, setChannel] = useState('');
  const [fulfillmentStatus, setFulfillmentStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [search, setSearch] = useState('');

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await ecommerceApi.getOrders({
        page,
        channel: channel || undefined,
        fulfillment_status: fulfillmentStatus || undefined,
        payment_status: paymentStatus || undefined,
        search: search || undefined,
      });
      setOrders(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [page, channel, fulfillmentStatus, paymentStatus]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadOrders();
  };

  const getFulfillmentBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-emerald-100 text-emerald-800';
      case 'SHIPPED':
        return 'bg-blue-100 text-blue-800';
      case 'ALLOCATED':
      case 'PACKED':
      case 'PICKED':
        return 'bg-indigo-100 text-indigo-800';
      case 'CANCELLED':
      case 'VOIDED':
        return 'bg-rose-100 text-rose-800';
      case 'RETURNED':
      case 'PARTIALLY_RETURNED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-amber-100 text-amber-800';
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-emerald-100 text-emerald-800';
      case 'PARTIAL':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-rose-100 text-rose-800';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Omnichannel Order Management</h1>
          <p className="text-sm text-slate-500">Unified view of all customer orders across Online Store, POS, and B2B channels</p>
        </div>
        <div className="text-sm font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
          Total Orders: {total}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center justify-between">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by order #, invoice #, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          <select
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="">All Channels</option>
            <option value="ECOMMERCE">E-Commerce</option>
            <option value="POS">POS Retail</option>
            <option value="WHOLESALE">Wholesale</option>
          </select>

          <select
            value={fulfillmentStatus}
            onChange={(e) => {
              setFulfillmentStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="">All Fulfillment</option>
            <option value="UNFULFILLED">Unfulfilled</option>
            <option value="ALLOCATED">Allocated</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="RETURNED">Returned</option>
          </select>

          <select
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="">All Payment</option>
            <option value="PAID">Paid</option>
            <option value="PARTIAL">Partial</option>
            <option value="DUE">Due (COD)</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Order / Invoice</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-right">Total (৳)</th>
                <th className="py-3 px-4 text-center">Payment</th>
                <th className="py-3 px-4 text-center">Fulfillment</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No orders match current criteria
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{o.order_number || o.invoice_number}</div>
                      <div className="text-xs text-slate-400 font-mono">{o.invoice_number} • {o.sale_date}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                        o.channel === 'ECOMMERCE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {o.channel}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <div>{o.customer?.name || o.shipping_address_snapshot?.recipient_name || 'Walk-in Customer'}</div>
                      <div className="text-xs text-slate-400">{o.customer?.mobile || o.shipping_address_snapshot?.mobile || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-800">
                      ৳{Number(o.grand_total).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getPaymentBadge(o.payment_status)}`}>
                        {o.payment_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getFulfillmentBadge(o.fulfillment_status)}`}>
                        {o.fulfillment_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Link
                        to={`/ecommerce/orders/${o.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Details
                      </Link>
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
export default OrderManagement;
