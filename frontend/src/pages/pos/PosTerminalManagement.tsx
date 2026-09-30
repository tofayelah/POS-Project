import React, { useState, useEffect, useMemo } from 'react';
import { Monitor, Settings, Check, X, ShieldAlert, CreditCard, Plus, Power, Building, Warehouse as WarehouseIcon, Search } from 'lucide-react';
import { posApi, PosTerminal, PaymentMethod } from '../../api/pos';
import { getBranches, getWarehouses } from '../../api/organization';
import { Branch, Warehouse } from '../../types/organization';
import api from '../../api/axios';

export const PosTerminalManagement: React.FC = () => {
  const [terminals, setTerminals] = useState<PosTerminal[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [branchFilter, setBranchFilter] = useState<string | number>('');

  const filteredTerminals = useMemo(() => {
    return terminals.filter((term) => {
      if (statusFilter !== 'ALL' && term.status !== statusFilter) {
        return false;
      }
      if (branchFilter !== '' && term.branch_id !== Number(branchFilter)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = term.terminal_name.toLowerCase().includes(q);
        const matchCode = term.terminal_code.toLowerCase().includes(q);
        const matchBranch = term.branch?.name?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchBranch) {
          return false;
        }
      }
      return true;
    });
  }, [terminals, statusFilter, branchFilter, searchQuery]);

  // Create Terminal Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    terminal_name: '',
    terminal_code: '',
    branch_id: '' as string | number,
    warehouse_id: '' as string | number,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    default_cash_account_id: '' as string | number,
    default_card_account_id: '' as string | number,
    default_bkash_account_id: '' as string | number,
    default_nagad_account_id: '' as string | number,
    default_bank_account_id: '' as string | number,
    receipt_header: '',
    receipt_footer: '',
  });

  // Terminal Settings / Edit Modal
  const [selectedTerminal, setSelectedTerminal] = useState<PosTerminal | null>(null);
  const [terminalModalOpen, setTerminalModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    terminal_name: '',
    terminal_code: '',
    branch_id: '' as string | number,
    warehouse_id: '' as string | number,
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
      const [termRes, pmRes, branchesRes, warehousesRes] = await Promise.all([
        posApi.getTerminals(),
        posApi.getPaymentMethods(),
        getBranches().catch(() => ({ success: false, data: [] })),
        getWarehouses().catch(() => ({ success: false, data: [] })),
      ]);

      if (termRes.success && termRes.data) {
        setTerminals(termRes.data);
      }
      if (pmRes.success && pmRes.data) {
        setPaymentMethods(pmRes.data);
      }
      if (branchesRes.success && branchesRes.data) {
        setBranches(branchesRes.data);
      }
      if (warehousesRes.success && warehousesRes.data) {
        setWarehouses(warehousesRes.data);
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

  const handleOpenCreateModal = () => {
    setError(null);
    setCreateFormData({
      terminal_name: '',
      terminal_code: '',
      branch_id: branches.length > 0 ? branches[0].id : '',
      warehouse_id: warehouses.length > 0 ? warehouses[0].id : '',
      status: 'ACTIVE',
      default_cash_account_id: '',
      default_card_account_id: '',
      default_bkash_account_id: '',
      default_nagad_account_id: '',
      default_bank_account_id: '',
      receipt_header: '',
      receipt_footer: '',
    });
    setCreateModalOpen(true);
  };

  const handleCreateTerminal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!createFormData.terminal_name.trim() || !createFormData.terminal_code.trim()) {
      setError('Terminal Name and Terminal Code are required.');
      return;
    }

    if (!createFormData.warehouse_id) {
      setError('Please select a warehouse for this terminal.');
      return;
    }

    try {
      await posApi.createTerminal({
        terminal_name: createFormData.terminal_name.trim(),
        terminal_code: createFormData.terminal_code.trim().toUpperCase(),
        branch_id: createFormData.branch_id ? Number(createFormData.branch_id) : null,
        warehouse_id: Number(createFormData.warehouse_id),
        status: createFormData.status,
        default_cash_account_id: createFormData.default_cash_account_id ? Number(createFormData.default_cash_account_id) : null,
        default_card_account_id: createFormData.default_card_account_id ? Number(createFormData.default_card_account_id) : null,
        default_bkash_account_id: createFormData.default_bkash_account_id ? Number(createFormData.default_bkash_account_id) : null,
        default_nagad_account_id: createFormData.default_nagad_account_id ? Number(createFormData.default_nagad_account_id) : null,
        default_bank_account_id: createFormData.default_bank_account_id ? Number(createFormData.default_bank_account_id) : null,
        receipt_header: createFormData.receipt_header,
        receipt_footer: createFormData.receipt_footer,
      });

      setSuccessMessage(`Terminal "${createFormData.terminal_name}" created successfully.`);
      setCreateModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create terminal.');
    }
  };

  const handleOpenTerminalSettings = (term: PosTerminal) => {
    setSelectedTerminal(term);
    setFormData({
      terminal_name: term.terminal_name,
      terminal_code: term.terminal_code,
      branch_id: term.branch_id || '',
      warehouse_id: term.warehouse_id || '',
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
      if (!term.payment_methods || term.payment_methods.length === 0) {
        state[pm.id] = true;
      } else {
        state[pm.id] = attachedIds.includes(pm.id);
      }
    });

    setTerminalMethodsState(state);
    setMethodsModalOpen(true);
  };

  const handleToggleTerminalStatus = async (term: PosTerminal) => {
    setError(null);
    const nextStatus = term.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await posApi.updateTerminal(term.id, { status: nextStatus });
      setSuccessMessage(`Terminal ${term.terminal_name} is now ${nextStatus}.`);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || `Failed to ${nextStatus === 'ACTIVE' ? 'activate' : 'deactivate'} terminal.`);
    }
  };

  const handleSaveTerminal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTerminal) return;
    setError(null);

    try {
      await posApi.updateTerminal(selectedTerminal.id, {
        terminal_name: formData.terminal_name,
        terminal_code: formData.terminal_code,
        branch_id: formData.branch_id ? Number(formData.branch_id) : null,
        warehouse_id: formData.warehouse_id ? Number(formData.warehouse_id) : undefined,
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Monitor className="w-7 h-7 text-blue-600" />
            POS Terminal Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure physical counter terminals, branch/warehouse assignments, GL accounts, and enabled payment methods.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Terminal
        </button>
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

      {/* Search & Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by terminal name, code or branch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-700 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-700 font-medium"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Terminals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 text-center py-12 text-slate-400">Loading terminals...</div>
        ) : filteredTerminals.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-white rounded-lg border border-dashed border-slate-300 p-8 space-y-3">
            <Monitor className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-600 font-medium">
              {terminals.length === 0 ? 'No POS terminals found for this organization.' : 'No POS terminals match your filters.'}
            </p>
            <p className="text-xs text-slate-400">
              {terminals.length === 0 ? 'Create your first counter terminal to enable POS sales.' : 'Try adjusting your search query or filter options.'}
            </p>
            {terminals.length === 0 && (
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Create POS Terminal
              </button>
            )}
          </div>
        ) : (
          filteredTerminals.map((term) => (
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
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleTerminalStatus(term)}
                    className={`p-1.5 rounded transition-colors ${
                      term.status === 'ACTIVE'
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-600'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                    }`}
                    title={term.status === 'ACTIVE' ? 'Deactivate Terminal' : 'Activate Terminal'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
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

              {/* Branch & Warehouse Information */}
              <div className="flex flex-wrap gap-3 text-xs text-slate-600 pt-1">
                <div className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span>Branch: </span>
                  <span className="font-medium text-slate-800">{term.branch?.name || 'All Branches'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <WarehouseIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Warehouse: </span>
                  <span className="font-medium text-slate-800">{term.warehouse?.name || 'Assigned Warehouse'}</span>
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

      {/* Create Terminal Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4 my-8">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Create New POS Terminal
              </h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTerminal} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Terminal Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Counter 01"
                    value={createFormData.terminal_name}
                    onChange={(e) => setCreateFormData({ ...createFormData, terminal_name: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Terminal Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. POS-01"
                    value={createFormData.terminal_code}
                    onChange={(e) => setCreateFormData({ ...createFormData, terminal_code: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Branch (Optional)</label>
                  <select
                    value={createFormData.branch_id}
                    onChange={(e) => setCreateFormData({ ...createFormData, branch_id: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded text-xs bg-white"
                  >
                    <option value="">All Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Warehouse <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={createFormData.warehouse_id}
                    onChange={(e) => setCreateFormData({ ...createFormData, warehouse_id: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded text-xs bg-white"
                  >
                    <option value="" disabled>-- Select Warehouse --</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Initial Status</label>
                <select
                  value={createFormData.status}
                  onChange={(e) => setCreateFormData({ ...createFormData, status: e.target.value as any })}
                  className="w-full px-3 py-1.5 border rounded text-xs bg-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="pt-2 border-t">
                <span className="text-xs font-bold text-slate-700 block mb-2">Default Terminal GL Accounts (Optional)</span>
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Default Cash GL</label>
                    <select
                      value={createFormData.default_cash_account_id}
                      onChange={(e) => setCreateFormData({ ...createFormData, default_cash_account_id: e.target.value })}
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
                      value={createFormData.default_card_account_id}
                      onChange={(e) => setCreateFormData({ ...createFormData, default_card_account_id: e.target.value })}
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
                      value={createFormData.default_bkash_account_id}
                      onChange={(e) => setCreateFormData({ ...createFormData, default_bkash_account_id: e.target.value })}
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
                  value={createFormData.receipt_footer}
                  onChange={(e) => setCreateFormData({ ...createFormData, receipt_footer: e.target.value })}
                  placeholder="Thank you for shopping with us!"
                  className="w-full px-3 py-1.5 border rounded text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3.5 py-1.5 border rounded text-xs text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded shadow-xs"
                >
                  Create Terminal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Terminal Settings / Edit Modal */}
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Terminal Code</label>
                  <input
                    type="text"
                    required
                    value={formData.terminal_code}
                    onChange={(e) => setFormData({ ...formData, terminal_code: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Branch</label>
                  <select
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded text-xs bg-white"
                  >
                    <option value="">All Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Warehouse</label>
                  <select
                    value={formData.warehouse_id}
                    onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded text-xs bg-white"
                  >
                    <option value="">Assign Warehouse</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>
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
