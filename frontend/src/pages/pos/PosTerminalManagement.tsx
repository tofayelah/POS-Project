import React, { useState, useEffect } from 'react';
import { Monitor, Settings, Check, X, ShieldAlert, CreditCard } from 'lucide-react';
import { posApi, PosTerminal, PaymentMethod } from '../../api/pos';
import api from '../../api/axios';

export const PosTerminalManagement: React.FC = () => {
  const [terminals, setTerminals] = useState<PosTerminal[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Terminal Settings Modal
  const [selectedTerminal, setSelectedTerminal] = useState<PosTerminal | null>(null);
  const [terminalModalOpen, setTerminalModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    terminal_name: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    default_cash_account_id: '' as string | number,
    default_card_account_id: '' as string | number,
    default_bkash_account_id: '' as string | number,
    default_nagad_account_id: '' as string | number,
    default_bank_account_id: '' as string | number,
    receipt_header: '',
    receipt_footer: '',
  });

  // Terminal Payment Methods Modal
  const [methodsModalOpen, setMethodsModalOpen] = useState(false);
  const [terminalMethodsState, setTerminalMethodsState] = useState<Record<number, boolean>>({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const [termRes, pmRes] = await Promise.all([
        posApi.getTerminals(),
        posApi.getPaymentMethods(),
      ]);

      if (termRes.success && termRes.data) {
        setTerminals(termRes.data);
      }
      if (pmRes.success && pmRes.data) {
        setPaymentMethods(pmRes.data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load POS configuration.');
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
      // Optional fallback
    }
  };

  useEffect(() => {
    fetchData();
    fetchAccounts();
  }, []);

  const handleOpenTerminalSettings = (term: PosTerminal) => {
    setSelectedTerminal(term);
    setFormData({
      terminal_name: term.terminal_name,
      status: term.status,
      default_cash_account_id: term.default_cash_account_id || '',
      default_card_account_id: term.default_card_account_id || '',
      default_bkash_account_id: term.default_bkash_account_id || '',
      default_nagad_account_id: term.default_nagad_account_id || '',
      default_bank_account_id: term.default_bank_account_id || '',
      receipt_header: term.receipt_header || '',
      receipt_footer: term.receipt_footer || '',
    });
    setTerminalModalOpen(true);
  };

  const handleOpenPaymentMethodsModal = (term: PosTerminal) => {
    setSelectedTerminal(term);
    const state: Record<number, boolean> = {};
    const attachedIds = term.payment_methods ? term.payment_methods.filter(p => p.pivot?.is_enabled).map(p => p.id) : [];

    paymentMethods.forEach((pm) => {
      // If terminal has no explicit methods yet, default all to enabled
      if (!term.payment_methods || term.payment_methods.length === 0) {
        state[pm.id] = true;
      } else {
        state[pm.id] = attachedIds.includes(pm.id);
      }
    });

    setTerminalMethodsState(state);
    setMethodsModalOpen(true);
  };

  const handleSaveTerminal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTerminal) return;
    setError(null);

    try {
      await posApi.updateTerminal(selectedTerminal.id, {
        terminal_name: formData.terminal_name,
        status: formData.status,
        default_cash_account_id: formData.default_cash_account_id ? Number(formData.default_cash_account_id) : null,
        default_card_account_id: formData.default_card_account_id ? Number(formData.default_card_account_id) : null,
        default_bkash_account_id: formData.default_bkash_account_id ? Number(formData.default_bkash_account_id) : null,
        default_nagad_account_id: formData.default_nagad_account_id ? Number(formData.default_nagad_account_id) : null,
        default_bank_account_id: formData.default_bank_account_id ? Number(formData.default_bank_account_id) : null,
        receipt_header: formData.receipt_header,
        receipt_footer: formData.receipt_footer,
      });

      setSuccessMessage('Terminal settings saved.');
      setTerminalModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update terminal.');
    }
  };

  const handleSaveTerminalMethods = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTerminal) return;
    setError(null);

    try {
      const methodsPayload = Object.entries(terminalMethodsState).map(([pmId, isEnabled]) => ({
        payment_method_id: Number(pmId),
        is_enabled: Boolean(isEnabled),
      }));

      await posApi.syncTerminalPaymentMethods(selectedTerminal.id, methodsPayload);
      setSuccessMessage(`Payment methods updated for ${selectedTerminal.terminal_name}.`);
      setMethodsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update terminal payment methods.');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Monitor className="w-7 h-7 text-blue-600" />
          POS Terminal Management
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure physical counter terminals, default GL accounts, and enabled payment methods per terminal.
        </p>
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

      {/* Terminals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 text-center py-12 text-slate-400">Loading terminals...</div>
        ) : terminals.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-slate-400">No POS terminals found.</div>
        ) : (
          terminals.map((term) => (
            <div key={term.id} className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-800">{term.terminal_name}</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        term.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {term.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">Code: {term.terminal_code}</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleOpenTerminalSettings(term)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 transition-colors"
                    title="Terminal Settings & Accounts"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenPaymentMethodsModal(term)}
                    className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
                    title="Enabled Payment Methods"
                  >
                    <CreditCard className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Enabled Payment Methods Badges */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Enabled Payment Methods
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {term.payment_methods && term.payment_methods.filter(p => p.pivot?.is_enabled).length > 0 ? (
                    term.payment_methods
                      .filter((p) => p.pivot?.is_enabled)
                      .map((pm) => (
                        <span
                          key={pm.id}
                          className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium"
                        >
                          {pm.name}
                        </span>
                      ))
                  ) : (
                    <span className="text-xs text-emerald-600 font-medium italic">
                      All Company Methods Enabled (Default)
                    </span>
                  )}
                </div>
              </div>

              {/* Default GL Accounts Summary */}
              <div className="space-y-1 pt-2 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Cash GL:</span>
                  <span className="font-mono">{term.default_cash_account?.account_name || 'Company Default'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Card GL:</span>
                  <span className="font-mono">{term.default_card_account?.account_name || 'Company Default'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">bKash GL:</span>
                  <span className="font-mono">{term.default_bkash_account?.account_name || 'Company Default'}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Terminal Settings Modal */}
      {terminalModalOpen && selectedTerminal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4 my-8">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-slate-800">
                Configure {selectedTerminal.terminal_name}
              </h3>
              <button onClick={() => setTerminalModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTerminal} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Terminal Name</label>
                  <input
                    type="text"
                    required
                    value={formData.terminal_name}
                    onChange={(e) => setFormData({ ...formData, terminal_name: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-1.5 border rounded text-xs bg-white"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t">
                <span className="text-xs font-bold text-slate-700 block mb-2">Default Terminal GL Accounts</span>
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Default Cash GL</label>
                    <select
                      value={formData.default_cash_account_id}
                      onChange={(e) => setFormData({ ...formData, default_cash_account_id: e.target.value })}
                      className="w-full px-2.5 py-1.5 border rounded bg-white text-xs"
                    >
                      <option value="">Company Default (ROLE_CASH_BANK)</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.account_code} - {a.account_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Default Card GL</label>
                    <select
                      value={formData.default_card_account_id}
                      onChange={(e) => setFormData({ ...formData, default_card_account_id: e.target.value })}
                      className="w-full px-2.5 py-1.5 border rounded bg-white text-xs"
                    >
                      <option value="">Company Default (ROLE_CASH_BANK)</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.account_code} - {a.account_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Default bKash GL</label>
                    <select
                      value={formData.default_bkash_account_id}
                      onChange={(e) => setFormData({ ...formData, default_bkash_account_id: e.target.value })}
                      className="w-full px-2.5 py-1.5 border rounded bg-white text-xs"
                    >
                      <option value="">Company Default (ROLE_CASH_BANK)</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.account_code} - {a.account_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t">
                <label className="block text-xs font-bold text-slate-700 mb-1">Receipt Footer Note</label>
                <textarea
                  rows={2}
                  value={formData.receipt_footer}
                  onChange={(e) => setFormData({ ...formData, receipt_footer: e.target.value })}
                  placeholder="Thank you for shopping with us!"
                  className="w-full px-3 py-1.5 border rounded text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setTerminalModalOpen(false)}
                  className="px-3.5 py-1.5 border rounded text-xs text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded shadow-xs"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Terminal Payment Methods Checkbox Modal */}
      {methodsModalOpen && selectedTerminal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-800">
                  Payment Methods for {selectedTerminal.terminal_name}
                </h3>
                <p className="text-xs text-slate-500">Check methods enabled on this physical terminal.</p>
              </div>
              <button onClick={() => setMethodsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTerminalMethods} className="space-y-3">
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
                {paymentMethods.map((pm) => (
                  <label
                    key={pm.id}
                    className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 px-2 rounded"
                  >
                    <div>
                      <span className="font-bold text-sm text-slate-800">{pm.name}</span>
                      <span className="ml-2 font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {pm.code}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(terminalMethodsState[pm.id])}
                      onChange={(e) =>
                        setTerminalMethodsState({
                          ...terminalMethodsState,
                          [pm.id]: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setMethodsModalOpen(false)}
                  className="px-3.5 py-1.5 border rounded text-xs text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded shadow-xs"
                >
                  Save Allowed Methods
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PosTerminalManagement;
