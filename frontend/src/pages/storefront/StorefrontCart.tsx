import React, { useEffect, useState } from 'react';
import { ShoppingBag, ArrowLeft, Trash2, Tag, ArrowRight, RefreshCw } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { storefrontApi } from '../../api/storefront';
import { CartSummary } from '../../types/ecommerce';

export function StorefrontCart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const loadCart = async () => {
    try {
      setLoading(true);
      const res = await storefrontApi.getCart('MAIN');
      setCart(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const handleUpdateQty = async (itemId: number, newQty: number) => {
    if (newQty < 1) {
      handleRemoveItem(itemId);
      return;
    }
    try {
      const res = await storefrontApi.updateCartItem(itemId, newQty);
      setCart(res.data);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update item quantity');
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    try {
      const res = await storefrontApi.removeCartItem(itemId);
      setCart(res.data);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to remove item');
    }
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    try {
      setApplyingCoupon(true);
      const res = await storefrontApi.applyCoupon(couponCode.trim());
      setCart(res.data);
      setCouponCode('');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Invalid or expired coupon code');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    try {
      const res = await storefrontApi.removeCoupon();
      setCart(res.data);
    } catch (err: any) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const items = cart?.items || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/store/catalog" className="flex items-center gap-2 text-slate-700 hover:text-emerald-600 font-semibold text-sm">
            <ArrowLeft className="w-4 h-4" /> Continue Shopping
          </Link>
          <div className="font-bold text-slate-800">Shopping Cart</div>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        {items.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Your Cart is Empty</h2>
            <p className="text-xs text-slate-400">Add products from our catalog to get started</p>
            <Link
              to="/store/catalog"
              className="inline-block px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 divide-y divide-slate-100">
                {items.map((item) => (
                  <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-400 text-lg shrink-0">
                        {item.product_name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">{item.product_name}</h4>
                        <div className="text-xs text-slate-400 font-mono">
                          {item.variant_name || item.sku}
                        </div>
                        <div className="text-xs font-semibold text-slate-700 mt-1">
                          ৳{Number(item.unit_price).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Quantity selector */}
                      <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-1 bg-slate-50">
                        <button
                          onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                          className="w-6 h-6 rounded flex items-center justify-center font-bold text-slate-600 hover:bg-white"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                          className="w-6 h-6 rounded flex items-center justify-center font-bold text-slate-600 hover:bg-white"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right w-20">
                        <div className="font-bold text-sm text-slate-900">
                          ৳{Number(item.line_total).toFixed(2)}
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary & Coupon */}
            <div className="space-y-6">
              {/* Coupon input */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Promo Code</h4>
                {cart?.coupon_code ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                    <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                      <Tag className="w-4 h-4" /> {cart.coupon_code} Applied!
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      className="text-rose-600 hover:underline font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. EID2026"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono uppercase"
                    />
                    <button
                      type="submit"
                      disabled={applyingCoupon}
                      className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
                    >
                      Apply
                    </button>
                  </form>
                )}
              </div>

              {/* Price summary */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 text-sm">
                <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Order Summary</h4>
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>৳{Number(cart?.subtotal || 0).toFixed(2)}</span>
                </div>
                {Number(cart?.discount_amount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Promo Discount:</span>
                    <span>-৳{Number(cart?.discount_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Estimated Shipping:</span>
                  <span>
                    {Number(cart?.shipping_amount || 0) === 0 ? 'FREE' : `৳${Number(cart?.shipping_amount).toFixed(2)}`}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between font-extrabold text-base text-slate-900">
                  <span>Grand Total:</span>
                  <span>৳{Number(cart?.grand_total || 0).toFixed(2)}</span>
                </div>

                <button
                  onClick={() => navigate('/store/checkout')}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-lg hover:shadow-emerald-600/20 flex items-center justify-center gap-2 mt-4"
                >
                  Proceed to Checkout <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
export default StorefrontCart;
