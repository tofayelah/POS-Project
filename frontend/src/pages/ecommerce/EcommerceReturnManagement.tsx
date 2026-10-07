import React, { useEffect, useState } from 'react';
import { RotateCcw, Search, CheckCircle, RefreshCw, Eye } from 'lucide-react';
import { Link } from 'react-router';
import { ecommerceApi } from '../../api/ecommerce';
import { EcommerceOrder } from '../../types/ecommerce';

export function EcommerceReturnManagement() {
  const [orders, setOrders] = useState<EcommerceOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReturnedOrders = async () => {
    try {
      setLoading(true);
      const res = await ecommerceApi.getOrders({
        fulfillment_status: 'RETURNED',
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
    loadReturnedOrders();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">E-Commerce Returns & Restocking</h1>
        <p className="text-sm text-slate-500">Inspect customer online returns, reverse output VAT, and credit store balances</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Order #</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4 text-right">Refund Total (৳)</th>
              <th className="py-3 px-4 text-center">Fulfillment Status</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading returns...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  No returned e-commerce orders recorded
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/60">
                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    {o.order_number || o.invoice_number}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">
                    {o.customer?.name || o.shipping_address_snapshot?.recipient_name || 'Customer'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-rose-600">
                    ৳{Number(o.grand_total).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700">
                      {o.fulfillment_status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <Link
                      to={`/ecommerce/orders/${o.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium hover:bg-slate-50"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Order
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
export default EcommerceReturnManagement;
