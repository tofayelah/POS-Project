import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Check, X, Edit2, ShieldAlert } from 'lucide-react';
import { posApi, PaymentMethod } from '../../api/pos';
import api from '../../api/axios';

export const PaymentMethodsList: React.FC = () => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'CASH' as PaymentMethod['type'],
    account_id: '' as string | number,
    sort_order: 0,
    is_active: true,
  });

  // Accounts for mapping
  const [accounts, setAccounts] = useState<any[]>([]);

  const fetchMethods = async () => {
    try {
      setLoading(true);
      const res = await posApi.getPaymentMethods();
      if (res.success && res.data) {
        setMethods(res.data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load payment methods.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounts');
      const d = res.data?.data || res.data;
      if (Array.isArray(d)) {
        setAccounts(d);
      }
    } catch {
      // Accounts list optional fallback
    }
  };

  useEffect(() => {
    fetchMethods();
    fetchAccounts();
  }, []);

  const handleOpenModal = (method?: PaymentMethod) => {
    if (method) {
      setEditingMethod(method);
      setFormData({
        name: method.name,
        code: method.code,
        type: method.type,
        account_id: method.account_id || '',
        sort_order: method.sort_order || 0,
        is_active: method.is_active,
      });
    } else {
      setEditingMethod(null);
      setFormData({
        name: '',
        code: '',
        type: 'CASH',
        account_id: '',
        sort_order: (methods.length + 1) * 10,
        is_active: true,
      });
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const payload = {
        name: formData.name,
        code: formData.code.toUpperCase().replace(/\s+/g, '_'),
        type: formData.type,
        account_id: formData.account_id ? Number(formData.account_id) : null,
        sort_order: Number(formData.sort_order) || 0,
        is_active: formData.is_active,
      };

      if (editingMethod) {
        await posApi.updatePaymentMethod(editingMethod.id, payload);
        setSuccessMessage('Payment method updated successfully.');
      } else {
        await posApi.createPaymentMethod(payload);
        setSuccessMessage('Payment method created successfully.');
      }

      setModalOpen(false);
      fetchMethods();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save payment method.');
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await posApi.togglePaymentMethod(id);
      fetchMethods();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to toggle status.');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-emerald-600" />
            POS Payment Methods
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure payment methods, GL account mappings, and activation for POS terminals.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold text-sm flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Payment Method
        </button>
      </div>

      {/* Notifications */}
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

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold border-b border-slate-200 tracking-wider">
              <tr>
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Linked GL Account</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Loading payment methods...
                  </td>
                </tr>
              ) : methods.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No payment methods configured. Click "Add Payment Method" to create one.
                  </td>
                </tr>
              ) : (
                methods.map((method) => (
                  <tr key={method.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-500">{method.sort_order}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{method.name}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-700 border border-slate-200 font-semibold">
                        {method.code}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          method.type === 'CASH'
                            ? 'bg-emerald-100 text-emerald-800'
                            : method.type === 'CARD'
                            ? 'bg-blue-100 text-blue-800'
                            : method.type === 'MFS'
                            ? 'bg-pink-100 text-pink-800'
                            : method.type === 'POINT'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {method.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {method.account ? (
                        <span className="text-xs text-slate-600 font-mono">
                          {method.account.account_code} - {method.account.account_name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Default Company GL</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggle(method.id)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
                          method.is_active
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {method.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenModal(method)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit method"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-slate-800">
                {editingMethod ? 'Edit Payment Method' : 'Add New Payment Method'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Display Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. bKash, Card, Cash"
                  className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Unique Code *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingMethod}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. BKASH, CARD, CASH"
                  className="w-full px-3 py-2 border rounded text-sm font-mono uppercase focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Method Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="MFS">Mobile Financial Services (MFS)</option>
                  <option value="BANK">Bank Transfer</option>
                  <option value="POINT">Loyalty Point Redemption</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Linked GL Account (Optional)</label>
                <select
                  value={formData.account_id}
                  onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Default Company Cash/Bank Account</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_code} - {acc.account_name} ({acc.account_type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded text-sm font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Active Status</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-bold shadow-sm"
                >
                  Save Method
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentMethodsList;
