import React, { useEffect, useState } from 'react';
import { Truck, Plus, CheckCircle, RefreshCw } from 'lucide-react';
import { ecommerceApi } from '../../api/ecommerce';
import { ShippingMethod } from '../../types/ecommerce';

export function ShippingConfiguration() {
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [carrier, setCarrier] = useState('Steadfast');
  const [rate, setRate] = useState(60);
  const [estimatedDays, setEstimatedDays] = useState('2-3 Days');

  const loadMethods = async () => {
    try {
      setLoading(true);
      const res = await ecommerceApi.getShippingMethods();
      setMethods(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMethods();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      await ecommerceApi.createShippingMethod({
        name,
        code: code.toUpperCase(),
        carrier_name: carrier,
        base_rate: Number(rate),
        estimated_days: estimatedDays,
        is_active: true,
      });
      setShowModal(false);
      setName('');
      setCode('');
      loadMethods();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Shipping & Delivery Configuration</h1>
          <p className="text-sm text-slate-500">Configure logistics couriers, delivery turnaround times, and shipping fee schedules</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Courier Method
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Method Name</th>
              <th className="py-3 px-4">Carrier</th>
              <th className="py-3 px-4">Code</th>
              <th className="py-3 px-4 text-right">Base Shipping Fee (৳)</th>
              <th className="py-3 px-4 text-center">Estimated Days</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading shipping methods...
                </td>
              </tr>
            ) : methods.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No shipping methods configured
                </td>
              </tr>
            ) : (
              methods.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/60">
                  <td className="py-3.5 px-4 font-semibold text-slate-800">{m.name}</td>
                  <td className="py-3.5 px-4 text-slate-600">{m.carrier_name}</td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-500">{m.code}</td>
                  <td className="py-3.5 px-4 text-right font-semibold text-slate-800">
                    ৳{Number(m.base_rate || 0).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-600">{m.estimated_days || '1-3 days'}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Add Shipping Method</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Method Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Inside Dhaka Express"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                  placeholder="e.g. DHAKA-EXP"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Carrier Name</label>
                  <input
                    type="text"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Base Fee (৳)</label>
                  <input
                    type="number"
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Days</label>
                <input
                  type="text"
                  value={estimatedDays}
                  onChange={(e) => setEstimatedDays(e.target.value)}
                  placeholder="e.g. 24 Hours, 2-3 Days"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                >
                  {creating ? 'Saving...' : 'Save Method'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default ShippingConfiguration;
