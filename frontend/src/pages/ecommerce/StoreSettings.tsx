import React, { useEffect, useState } from 'react';
import { Globe, Save, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { ecommerceApi } from '../../api/ecommerce';
import { EcommerceStore } from '../../types/ecommerce';
import { useLanguage } from '../../i18n';

export function StoreSettings() {
  const { t } = useLanguage();
  const [store, setStore] = useState<EcommerceStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    currency: 'BDT',
    guest_checkout_enabled: true,
    cod_enabled: true,
    online_payment_enabled: true,
    order_prefix: 'EC-',
    contact_email: '',
    support_phone: '',
    free_shipping_min: 1000,
    hero_title: '',
    hero_subtitle: '',
  });

  const loadStore = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ecommerceApi.getStore();
      const s = res.data;
      setStore(s);
      setFormData({
        name: s.name || '',
        code: s.code || '',
        currency: s.currency || 'BDT',
        guest_checkout_enabled: s.guest_checkout_enabled,
        cod_enabled: s.cod_enabled,
        online_payment_enabled: s.online_payment_enabled,
        order_prefix: s.order_prefix || 'EC-',
        contact_email: s.settings?.contact_email || '',
        support_phone: s.settings?.support_phone || '',
        free_shipping_min: s.settings?.free_shipping_min || 1000,
        hero_title: s.settings?.hero_title || 'Authentic Products, Express Delivery',
        hero_subtitle: s.settings?.hero_subtitle || 'Shop high quality items across Bangladesh with cash on delivery or instant payment',
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to load store settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStore();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    try {
      setSaving(true);
      setSuccess(null);
      setError(null);

      await ecommerceApi.updateStore(store.id, {
        name: formData.name,
        currency: formData.currency,
        guest_checkout_enabled: formData.guest_checkout_enabled,
        cod_enabled: formData.cod_enabled,
        online_payment_enabled: formData.online_payment_enabled,
        order_prefix: formData.order_prefix,
        settings: {
          contact_email: formData.contact_email,
          support_phone: formData.support_phone,
          free_shipping_min: Number(formData.free_shipping_min),
          hero_title: formData.hero_title,
          hero_subtitle: formData.hero_subtitle,
        },
      });

      setSuccess('Store settings updated successfully.');
      loadStore();
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to update store settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading store settings...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
          <Globe className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Online Store Settings</h1>
          <p className="text-sm text-slate-500">Configure storefront branding, checkout rules, and default payment options</p>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2 text-sm">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Store Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Store Code</label>
            <input
              type="text"
              value={formData.code}
              disabled
              className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-lg text-sm cursor-not-allowed font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Default Currency</label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            >
              <option value="BDT">BDT (৳ - Bangladeshi Taka)</option>
              <option value="USD">USD ($ - US Dollar)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Order Prefix</label>
            <input
              type="text"
              value={formData.order_prefix}
              onChange={(e) => setFormData({ ...formData, order_prefix: e.target.value })}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Checkout & Payment Policies</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.guest_checkout_enabled}
                onChange={(e) => setFormData({ ...formData, guest_checkout_enabled: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <div>
                <span className="text-sm font-medium text-slate-700">Allow Guest Checkout</span>
                <p className="text-xs text-slate-400">Buyers can complete orders without registering an account</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.cod_enabled}
                onChange={(e) => setFormData({ ...formData, cod_enabled: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <div>
                <span className="text-sm font-medium text-slate-700">Enable Cash on Delivery (COD)</span>
                <p className="text-xs text-slate-400">Collect payment upon courier delivery across Bangladesh</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.online_payment_enabled}
                onChange={(e) => setFormData({ ...formData, online_payment_enabled: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <div>
                <span className="text-sm font-medium text-slate-700">Enable Online Prepayment Gateways</span>
                <p className="text-xs text-slate-400">Accept bKash, Nagad, and Credit/Debit Cards</p>
              </div>
            </label>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Contact & Support Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Email</label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Support Hotline / Mobile</label>
              <input
                type="text"
                value={formData.support_phone}
                onChange={(e) => setFormData({ ...formData, support_phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Free Shipping Threshold (৳)</label>
              <input
                type="number"
                value={formData.free_shipping_min}
                onChange={(e) => setFormData({ ...formData, free_shipping_min: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Storefront Hero Banner Content</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hero Title</label>
              <input
                type="text"
                value={formData.hero_title}
                onChange={(e) => setFormData({ ...formData, hero_title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hero Subtitle</label>
              <textarea
                value={formData.hero_subtitle}
                onChange={(e) => setFormData({ ...formData, hero_subtitle: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 shadow-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
export default StoreSettings;
