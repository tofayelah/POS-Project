import React, { useState, useEffect } from 'react';
import { Award, Save, Check, X, ShieldAlert, Sparkles } from 'lucide-react';
import { posApi, LoyaltySettings } from '../../api/pos';

export const LoyaltySettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<LoyaltySettings>({
    earning_spend_per_point: 100,
    earning_points_awarded: 1,
    redemption_point_value: 1,
    min_redemption_points: 400,
    is_active: true,
    disallow_earn_on_discount: true,
    disallow_earn_on_redemption: true,
    disallow_discount_with_redemption: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await posApi.getLoyaltySettings();
      if (res.success && res.data) {
        setSettings({
          ...res.data,
          earning_spend_per_point: Number(res.data.earning_spend_per_point) || 100,
          earning_points_awarded: Number(res.data.earning_points_awarded) || 1,
          redemption_point_value: Number(res.data.redemption_point_value) || 1,
          min_redemption_points: Number(res.data.min_redemption_points) || 400,
        });
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load loyalty settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    try {
      setSaving(true);
      const res = await posApi.updateLoyaltySettings(settings);
      if (res.success) {
        setSuccessMessage('Loyalty program settings updated successfully.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update loyalty settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">Loading loyalty configuration...</div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Award className="w-7 h-7 text-amber-500" />
            Customer Loyalty & Points Configuration
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure earning rules, redemption valuation, minimum redemption threshold, and financial exclusivity.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-md text-rose-700 text-sm flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-700 text-sm flex items-center gap-2">
          <Check className="w-5 h-5 shrink-0" />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="ml-auto text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Master Program Switch */}
        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-full ${settings.is_active ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Loyalty Rewards Program</h3>
              <p className="text-xs text-slate-500">Enable or disable customer points earning and redemption at POS.</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.is_active}
              onChange={(e) => setSettings({ ...settings, is_active: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        {/* Earning Rules */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
            <span>Points Earning Rules</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Purchase Spend Per Point (৳) *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold">৳</span>
                <input
                  type="number"
                  min="1"
                  required
                  value={settings.earning_spend_per_point}
                  onChange={(e) => setSettings({ ...settings, earning_spend_per_point: Number(e.target.value) || 100 })}
                  className="w-full pl-8 pr-3 py-2 border rounded-md text-sm font-mono font-bold focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Default: ৳100 spent earns 1 loyalty point.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Points Awarded Per Step *
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                required
                value={settings.earning_points_awarded}
                onChange={(e) => setSettings({ ...settings, earning_points_awarded: Number(e.target.value) || 1 })}
                className="w-full px-3 py-2 border rounded-md text-sm font-mono font-bold focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Default: 1.0 Point.</p>
            </div>
          </div>
        </div>

        {/* Redemption Rules */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
            <span>Points Redemption Rules</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Redemption Value Per Point (৳) *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold">৳</span>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={settings.redemption_point_value}
                  onChange={(e) => setSettings({ ...settings, redemption_point_value: Number(e.target.value) || 1 })}
                  className="w-full pl-8 pr-3 py-2 border rounded-md text-sm font-mono font-bold focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Default: 1 Point = ৳1 redemption value.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Minimum Redemption Threshold (Points) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={settings.min_redemption_points}
                onChange={(e) => setSettings({ ...settings, min_redemption_points: Number(e.target.value) || 400 })}
                className="w-full px-3 py-2 border rounded-md text-sm font-mono font-bold focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Default: 400 Points (Customer with &lt; 400 pts cannot redeem).</p>
            </div>
          </div>
        </div>

        {/* Exclusivity & Business Rules */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-6 space-y-3">
          <h2 className="text-base font-bold text-slate-800 border-b pb-2">
            Strict Business & Accounting Rules
          </h2>

          <div className="space-y-3 pt-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.disallow_earn_on_discount}
                onChange={(e) => setSettings({ ...settings, disallow_earn_on_discount: e.target.checked })}
                className="mt-1 rounded text-amber-600 focus:ring-amber-500"
              />
              <div>
                <span className="text-sm font-bold text-slate-800 block">No points earned if discount is applied</span>
                <span className="text-xs text-slate-500">If any item or invoice discount is given, earned points will be strictly 0.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.disallow_earn_on_redemption}
                onChange={(e) => setSettings({ ...settings, disallow_earn_on_redemption: e.target.checked })}
                className="mt-1 rounded text-amber-600 focus:ring-amber-500"
              />
              <div>
                <span className="text-sm font-bold text-slate-800 block">No points earned if point redemption is used</span>
                <span className="text-xs text-slate-500">A transaction that redeems points cannot earn additional points simultaneously.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.disallow_discount_with_redemption}
                onChange={(e) => setSettings({ ...settings, disallow_discount_with_redemption: e.target.checked })}
                className="mt-1 rounded text-amber-600 focus:ring-amber-500"
              />
              <div>
                <span className="text-sm font-bold text-slate-800 block">Discount and Point Redemption cannot be combined</span>
                <span className="text-xs text-slate-500">Mutually exclusive: system blocks checkout if both a discount and point redemption are attempted.</span>
              </div>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-md font-bold text-sm flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Loyalty Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoyaltySettingsPage;
