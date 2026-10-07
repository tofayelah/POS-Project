import React, { useEffect, useState } from 'react';
import { Truck, Search, CheckCircle2, Clock, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { storefrontApi } from '../../api/storefront';
import { EcommerceOrder } from '../../types/ecommerce';

export function StorefrontOrderTracking() {
  const [searchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') || '');
  const [order, setOrder] = useState<EcommerceOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrack = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!orderNumber.trim()) return;
    try {
      setLoading(true);
      setError(null);
      const res = await storefrontApi.trackOrder(orderNumber.trim());
      setOrder(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Order not found. Please verify the order number.');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderNumber) {
      handleTrack();
    }
  }, []);

  const getStepStatus = (stepName: string) => {
    const status = order?.fulfillment_status;
    switch (stepName) {
      case 'ORDER_PLACED':
        return true;
      case 'PACKED':
        return ['ALLOCATED', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(status || '');
      case 'SHIPPED':
        return ['SHIPPED', 'DELIVERED'].includes(status || '');
      case 'DELIVERED':
        return status === 'DELIVERED';
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/store" className="flex items-center gap-2 text-slate-700 hover:text-emerald-600 font-semibold text-sm">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <div className="font-bold text-slate-800">Track Order</div>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 flex-1 w-full space-y-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-center">
          <h1 className="text-xl font-bold text-slate-800">Track Delivery Status</h1>
          <p className="text-xs text-slate-400">Enter your order number to track your package across Bangladesh</p>

          <form onSubmit={handleTrack} className="flex gap-2 max-w-md mx-auto">
            <input
              type="text"
              placeholder="e.g. EC-2026-000001"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700"
            >
              {loading ? 'Tracking...' : 'Track'}
            </button>
          </form>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {order && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">Order #{order.order_number || order.invoice_number}</h3>
                <div className="text-xs text-slate-400">Placed on: {order.sale_date}</div>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  {order.fulfillment_status}
                </span>
              </div>
            </div>

            {/* Stepper Timeline */}
            <div className="grid grid-cols-4 gap-2 text-center py-4">
              {[
                { key: 'ORDER_PLACED', label: 'Order Confirmed' },
                { key: 'PACKED', label: 'Packed & Ready' },
                { key: 'SHIPPED', label: 'In Transit' },
                { key: 'DELIVERED', label: 'Delivered' },
              ].map((step, idx) => {
                const isPassed = getStepStatus(step.key);
                return (
                  <div key={idx} className="space-y-2">
                    <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center font-bold text-xs ${
                      isPassed ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {isPassed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <div className={`text-xs font-semibold ${isPassed ? 'text-slate-800' : 'text-slate-400'}`}>
                      {step.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Details Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-2 text-slate-600">
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="font-bold text-slate-800">{order.payment_status === 'PAID' ? 'Paid Online' : 'Cash on Delivery (COD)'}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-bold text-slate-900">৳{Number(order.grand_total).toFixed(2)}</span>
              </div>
              {order.shipping_address_snapshot && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-400 block mb-0.5">Shipping to:</span>
                  <span className="font-semibold text-slate-800">{order.shipping_address_snapshot.recipient_name} ({order.shipping_address_snapshot.mobile})</span>
                  <div className="text-slate-600">{order.shipping_address_snapshot.address_line_1}, {order.shipping_address_snapshot.city}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
export default StorefrontOrderTracking;
