import React, { useEffect, useState } from 'react';
import { User, ShoppingBag, Award, CreditCard, MapPin, ArrowLeft, RefreshCw, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { storefrontApi } from '../../api/storefront';
import { CustomerProfile, EcommerceOrder } from '../../types/ecommerce';

export function StorefrontAccount() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<EcommerceOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCustomerData = async () => {
      try {
        setLoading(true);
        const [profRes, ordRes] = await Promise.all([
          storefrontApi.getProfile(),
          storefrontApi.getCustomerOrders(),
        ]);
        setProfile(profRes.data);
        setOrders(ordRes.data.data);
      } catch (err: any) {
        if (err?.response?.status === 401 || err?.response?.status === 404) {
          navigate('/store/login');
        }
      } finally {
        setLoading(false);
      }
    };
    loadCustomerData();
  }, [navigate]);

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
          <Link to="/store" className="flex items-center gap-2 text-slate-700 hover:text-emerald-600 font-semibold text-sm">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <div className="font-bold text-slate-800">Customer Account</div>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              navigate('/store/login');
            }}
            className="text-xs font-semibold text-rose-600 hover:underline flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        {/* Profile Card & Balances */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 font-extrabold flex items-center justify-center text-lg">
              {profile?.name.charAt(0) || 'C'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{profile?.name}</h2>
              <div className="text-xs text-slate-400 font-mono">{profile?.customer_code}</div>
              <div className="text-xs text-slate-500 mt-1">{profile?.mobile || profile?.email}</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-slate-400">Store Credit Balance</span>
              <CreditCard className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-800">
                ৳{Number(profile?.store_credit_balance || 0).toFixed(2)}
              </div>
              <div className="text-xs text-slate-400 mt-1">Available for checkout redemption</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-slate-400">Loyalty Rewards</span>
              <Award className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-800">
                {Number(profile?.points_balance || 0)} pts
              </div>
              <div className="text-xs text-slate-400 mt-1">Earn points on every purchase</div>
            </div>
          </div>
        </div>

        {/* Omnichannel Order History */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Order History (Online & In-Store)</h3>
            <span className="text-xs text-slate-400">{orders.length} total orders</span>
          </div>

          <div className="divide-y divide-slate-100">
            {orders.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No orders found on your account.
              </div>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">
                        {o.order_number || o.invoice_number}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                        {o.channel}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Date: {o.sale_date} • {o.items?.length || 1} items
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-extrabold text-slate-900 text-sm">
                        ৳{Number(o.grand_total).toFixed(2)}
                      </div>
                      <div className="text-xs font-semibold text-emerald-600">
                        {o.fulfillment_status}
                      </div>
                    </div>
                    <Link
                      to={`/store/track?order=${o.order_number || o.invoice_number}`}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Track
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
export default StorefrontAccount;
