import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, ShieldCheck, Truck, CreditCard, RefreshCw } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { storefrontApi } from '../../api/storefront';
import { CartSummary, ShippingMethod } from '../../types/ecommerce';

export function StorefrontCheckout() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  // Form Fields
  const [recipientName, setRecipientName] = useState('');
  const [mobile, setMobile] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('Dhaka');
  const [district, setDistrict] = useState('Dhaka');
  const [shippingMethodId, setShippingMethodId] = useState<number | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  useEffect(() => {
    const initCheckout = async () => {
      try {
        setLoading(true);
        const [cartRes, shipRes] = await Promise.all([
          storefrontApi.getCart('MAIN'),
          storefrontApi.getShippingMethods('MAIN'),
        ]);
        setCart(cartRes.data);
        setShippingMethods(shipRes.data);
        if (shipRes.data.length > 0) {
          setShippingMethodId(shipRes.data[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    initCheckout();
  }, []);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart || cart.items.length === 0) {
      alert('Cart is empty');
      return;
    }
    try {
      setPlacing(true);
      const res = await storefrontApi.checkout('MAIN', {
        payment_method: paymentMethod,
        shipping_method_id: shippingMethodId,
        shipping_address: {
          recipient_name: recipientName,
          mobile,
          address_line_1: addressLine1,
          city,
          district,
        },
        delivery_notes: deliveryNotes,
      });

      const order = res.data;
      navigate(`/store/track?order=${order.order_number}`);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to place order. Please review your details.');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/store/cart" className="flex items-center gap-2 text-slate-700 hover:text-emerald-600 font-semibold text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Cart
          </Link>
          <div className="font-bold text-slate-800">Secure Checkout</div>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Shipping and Payment Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" /> 1. Shipping Address & Contact
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Recipient name"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="+8801XXXXXXXXX"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    required
                    placeholder="House, Road, Area, Thana"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">District</label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery Instructions (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Call before delivery, deliver after 2 PM"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Method */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" /> 2. Delivery Courier Method
              </h3>
              <div className="space-y-2">
                {shippingMethods.map((m) => (
                  <label
                    key={m.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                      shippingMethodId === m.id
                        ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shipping_method"
                        checked={shippingMethodId === m.id}
                        onChange={() => setShippingMethodId(m.id)}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <div className="font-bold text-sm text-slate-800">{m.name}</div>
                        <div className="text-xs text-slate-400">{m.estimated_days || 'Standard delivery'}</div>
                      </div>
                    </div>
                    <span className="font-bold text-sm text-slate-800">
                      ৳{Number(m.base_rate || 0).toFixed(2)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" /> 3. Payment Method
              </h3>
              <div className="space-y-2">
                <label
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'COD'
                      ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment_method"
                      value="COD"
                      checked={paymentMethod === 'COD'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-800">Cash on Delivery (COD)</div>
                      <div className="text-xs text-slate-400">Pay cash upon receiving products from courier</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                    Recommended
                  </span>
                </label>

                <label
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'BKASH'
                      ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment_method"
                      value="BKASH"
                      checked={paymentMethod === 'BKASH'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-800">bKash Online Payment</div>
                      <div className="text-xs text-slate-400">Instant digital checkout via bKash gateway</div>
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'CARD'
                      ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment_method"
                      value="CARD"
                      checked={paymentMethod === 'CARD'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-800">Debit / Credit Card</div>
                      <div className="text-xs text-slate-400">Visa, Mastercard via secure gateway</div>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Review */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 text-sm">
              <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Order Review</h3>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {cart?.items.map((i) => (
                  <div key={i.id} className="flex justify-between text-xs text-slate-600">
                    <span className="truncate max-w-[180px]">{i.product_name} × {i.quantity}</span>
                    <span className="font-semibold text-slate-800">৳{Number(i.line_total).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>৳{Number(cart?.subtotal || 0).toFixed(2)}</span>
                </div>
                {Number(cart?.discount_amount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount:</span>
                    <span>-৳{Number(cart?.discount_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Shipping:</span>
                  <span>৳{Number(cart?.shipping_amount || 60).toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between font-extrabold text-base text-slate-900">
                  <span>Total Due:</span>
                  <span>৳{(Number(cart?.grand_total || 0)).toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={placing}
                className="w-full py-4 px-4 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-lg hover:shadow-emerald-600/20 mt-4 flex items-center justify-center gap-2"
              >
                {placing ? 'Placing Order...' : 'Confirm & Place Order'}
              </button>

              <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> 100% Secure & Compliant Checkout
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
export default StorefrontCheckout;
