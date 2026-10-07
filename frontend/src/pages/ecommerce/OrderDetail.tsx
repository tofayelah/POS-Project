import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Truck,
  RotateCcw,
  CheckCircle2,
  Clock,
  XCircle,
  Package,
  MapPin,
  CreditCard,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Link, useParams } from 'react-router';
import { ecommerceApi } from '../../api/ecommerce';
import { EcommerceOrder, Shipment } from '../../types/ecommerce';

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<EcommerceOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Shipment modal state
  const [showShipModal, setShowShipModal] = useState(false);
  const [carrierName, setCarrierName] = useState('Steadfast');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  const loadOrder = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await ecommerceApi.getOrderDetail(Number(id));
      setOrder(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to load order details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    try {
      setProcessingAction(true);
      await ecommerceApi.createShipment(order.id, {
        carrier_name: carrierName,
        tracking_number: trackingNumber,
      });
      setShowShipModal(false);
      loadOrder();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to allocate shipment');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleMarkShipped = async (shipmentId: number) => {
    const tracking = prompt('Enter carrier tracking number:');
    if (tracking === null) return;
    try {
      setProcessingAction(true);
      await ecommerceApi.markShipped(shipmentId, tracking);
      loadOrder();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to dispatch shipment');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleMarkDelivered = async (shipmentId: number) => {
    if (!confirm('Confirm delivery and COD payment collection?')) return;
    try {
      setProcessingAction(true);
      await ecommerceApi.markDelivered(shipmentId);
      loadOrder();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to mark delivered');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleCancelOrder = async () => {
    const reason = prompt('Please enter cancellation reason:');
    if (!reason || !order) return;
    try {
      setProcessingAction(true);
      await ecommerceApi.cancelOrder(order.id, reason);
      loadOrder();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to cancel order');
    } finally {
      setProcessingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading order...</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
          {error || 'Order not found'}
        </div>
      </div>
    );
  }

  const addr = order.shipping_address_snapshot;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/ecommerce/orders"
            className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800">
                Order #{order.order_number || order.invoice_number}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                {order.channel}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Invoice: {order.invoice_number} • Date: {order.sale_date}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {order.fulfillment_status === 'UNFULFILLED' && order.status !== 'VOIDED' && (
            <button
              onClick={() => setShowShipModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 shadow-sm"
            >
              <Truck className="w-4 h-4" /> Allocate Shipment
            </button>
          )}

          {order.status !== 'VOIDED' && order.fulfillment_status !== 'DELIVERED' && (
            <button
              onClick={handleCancelOrder}
              disabled={processingAction}
              className="px-3 py-2 border border-rose-300 text-rose-600 rounded-lg text-sm font-medium hover:bg-rose-50"
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Items & Shipments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-bold text-slate-800">
              Ordered Items
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Item Details</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Price (৳)</th>
                  <th className="py-3 px-4 text-right">Total (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(order.items || []).map((item) => (
                  <tr key={item.id}>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{item.product_name_snapshot}</div>
                      <div className="text-xs text-slate-400 font-mono">SKU: {item.sku_snapshot}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium">{item.quantity}</td>
                    <td className="py-3.5 px-4 text-right">৳{Number(item.unit_price).toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-800">
                      ৳{(Number(item.unit_price) * Number(item.quantity)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Shipments Fulfillment Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center justify-between">
              <span>Fulfillment & Dispatch</span>
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-indigo-50 text-indigo-700">
                {order.fulfillment_status}
              </span>
            </h3>

            {(order.shipments || []).length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-500 text-center">
                No shipment packages created yet.
              </div>
            ) : (
              order.shipments?.map((s) => (
                <div key={s.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">{s.shipment_number}</div>
                      <div className="text-xs text-slate-500">
                        Carrier: {s.carrier_name} • Tracking: {s.tracking_number || 'Pending'}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      {s.status}
                    </span>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    {s.status === 'PENDING' && (
                      <button
                        onClick={() => handleMarkShipped(s.id)}
                        disabled={processingAction}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
                      >
                        Dispatch / Mark Shipped
                      </button>
                    )}
                    {s.status === 'SHIPPED' && (
                      <button
                        onClick={() => handleMarkDelivered(s.id)}
                        disabled={processingAction}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
                      >
                        Confirm Delivery (Collect COD)
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Customer & Financials */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3 text-sm">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Order Financials</h3>
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>৳{Number(order.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>VAT / Tax (Phase 10):</span>
              <span>৳{Number(order.tax_total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Shipping Fee:</span>
              <span>৳{Number(order.shipping_amount).toFixed(2)}</span>
            </div>
            {Number(order.discount_total) > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Coupon Discount:</span>
                <span>-৳{Number(order.discount_total).toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-base text-slate-900">
              <span>Grand Total:</span>
              <span>৳{Number(order.grand_total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 pt-1">
              <span>Paid: ৳{Number(order.paid_amount).toFixed(2)}</span>
              <span className="font-bold text-rose-600">Due: ৳{Number(order.due_amount).toFixed(2)}</span>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-2 text-sm">
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <MapPin className="w-4 h-4 text-emerald-600" /> Delivery Address
            </h3>
            {addr ? (
              <div className="text-slate-700 space-y-1">
                <div className="font-semibold">{addr.recipient_name}</div>
                <div className="text-xs text-slate-500">{addr.mobile}</div>
                <div className="text-xs">{addr.address_line_1}</div>
                {addr.city && <div className="text-xs">{addr.city}, {addr.district || 'Bangladesh'}</div>}
              </div>
            ) : (
              <div className="text-slate-400 text-xs">No shipping address recorded</div>
            )}
            {order.delivery_notes && (
              <div className="mt-2 p-2 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-100">
                <strong>Delivery Note:</strong> {order.delivery_notes}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shipment Modal */}
      {showShipModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Allocate Shipment</h3>
            <form onSubmit={handleCreateShipment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Courier Carrier</label>
                <select
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="Steadfast">Steadfast Courier</option>
                  <option value="Pathao">Pathao Express</option>
                  <option value="RedX">RedX Logistics</option>
                  <option value="Sundarban">Sundarban Courier</option>
                  <option value="Internal">In-house Delivery</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tracking Number (Optional)</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. ST-2026-987"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowShipModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingAction}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                >
                  {processingAction ? 'Allocating...' : 'Allocate Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default OrderDetail;
