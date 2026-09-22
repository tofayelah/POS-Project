import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Filter, 
  Network,
  Phone,
  Mail
} from 'lucide-react';
import { Branch, BusinessUnit } from '../../types/organization';
import { 
  getBranches, 
  getBusinessUnits, 
  createBranch, 
  updateBranch, 
  deleteBranch 
} from '../../api/organization';

export function BranchList() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [buFilter, setBuFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [error, setError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formBuId, setFormBuId] = useState<number | ''>('');
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete Dialog State
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [brRes, buRes] = await Promise.all([
        getBranches(),
        getBusinessUnits().catch(() => ({ data: [] })),
      ]);
      setBranches(brRes.data || []);
      setBusinessUnits(buRes.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load branches.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      setFormBuId(branch.business_unit_id);
      setFormName(branch.name);
      setFormCode(branch.code);
      setFormPhone(branch.phone || '');
      setFormEmail(branch.email || '');
      setFormAddress(branch.address || '');
      setFormStatus(branch.status || 'active');
    } else {
      setEditingBranch(null);
      setFormBuId(businessUnits.length > 0 ? businessUnits[0].id : '');
      setFormName('');
      setFormCode('');
      setFormPhone('');
      setFormEmail('');
      setFormAddress('');
      setFormStatus('active');
    }
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBuId) {
      setModalError('Please select a Business Unit.');
      return;
    }
    if (!formName.trim()) {
      setModalError('Branch Name is required.');
      return;
    }
    if (!formCode.trim()) {
      setModalError('Branch Code is required.');
      return;
    }

    setSaving(true);
    setModalError(null);

    try {
      if (editingBranch) {
        await updateBranch(editingBranch.id, {
          business_unit_id: Number(formBuId),
          name: formName.trim(),
          code: formCode.trim().toUpperCase(),
          phone: formPhone.trim() || null,
          email: formEmail.trim() || null,
          address: formAddress.trim() || null,
          status: formStatus,
        });
        setFeedbackMessage('Branch updated successfully.');
      } else {
        await createBranch({
          business_unit_id: Number(formBuId),
          name: formName.trim(),
          code: formCode.trim().toUpperCase(),
          phone: formPhone.trim() || null,
          email: formEmail.trim() || null,
          address: formAddress.trim() || null,
          status: formStatus,
        });
        setFeedbackMessage('Branch created successfully.');
      }
      setIsModalOpen(false);
      loadData();
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to save branch.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingBranch) return;
    setDeleting(true);
    try {
      await deleteBranch(deletingBranch.id);
      setFeedbackMessage('Branch deleted successfully.');
      setDeletingBranch(null);
      loadData();
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete branch. It may have linked warehouses or orders.');
      setDeletingBranch(null);
    } finally {
      setDeleting(false);
    }
  };

  const filteredBranches = branches.filter((branch) => {
    const matchesSearch = 
      branch.name.toLowerCase().includes(search.toLowerCase()) ||
      branch.code.toLowerCase().includes(search.toLowerCase()) ||
      (branch.phone && branch.phone.toLowerCase().includes(search.toLowerCase())) ||
      (branch.email && branch.email.toLowerCase().includes(search.toLowerCase())) ||
      (branch.address && branch.address.toLowerCase().includes(search.toLowerCase())) ||
      (branch.business_unit?.name && branch.business_unit.name.toLowerCase().includes(search.toLowerCase()));

    const matchesBu = buFilter === 'all' || branch.business_unit_id === Number(buFilter);
    const matchesStatus = statusFilter === 'all' || branch.status === statusFilter;

    return matchesSearch && matchesBu && matchesStatus;
  });

  return (
    <div id="branches-page" className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-6 h-6 text-emerald-600" />
            <h1 id="branches-page-title" className="text-2xl font-bold text-slate-900 tracking-tight">Branches</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage your physical retail stores, regional offices, and branch outlets.
          </p>
        </div>
        <button
          id="btn-add-branch"
          type="button"
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Branch</span>
        </button>
      </div>

      {/* Feedback Messages */}
      {feedbackMessage && (
        <div id="branch-success-alert" className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {error && (
        <div id="branch-error-alert" className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="branch-search-input"
            type="text"
            placeholder="Search branches, codes, contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Business Unit Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">BU:</span>
            <select
              id="branch-bu-filter"
              value={buFilter}
              onChange={(e) => setBuFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white text-slate-700"
            >
              <option value="all">All Business Units</option>
              {businessUnits.map((bu) => (
                <option key={bu.id} value={bu.id}>
                  {bu.name} ({bu.code})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Status:</span>
            <select
              id="branch-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white text-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Branches Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div id="branches-loading" className="flex items-center justify-center p-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-slate-500 font-medium">Loading branches...</span>
            </div>
          </div>
        ) : filteredBranches.length === 0 ? (
          <div id="branches-empty-state" className="p-12 text-center">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No branches found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {search || buFilter !== 'all' ? 'Try adjusting your filters.' : 'Add your first branch outlet or retail store location.'}
            </p>
            {!search && buFilter === 'all' && (
              <button
                id="btn-empty-add-branch"
                type="button"
                onClick={() => handleOpenModal()}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Branch</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table id="branches-table" className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <th className="px-6 py-3.5">Branch</th>
                  <th className="px-6 py-3.5">Code</th>
                  <th className="px-6 py-3.5">Business Unit</th>
                  <th className="px-6 py-3.5">Contact Details</th>
                  <th className="px-6 py-3.5">Address</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredBranches.map((branch) => (
                  <tr key={branch.id} id={`branch-row-${branch.id}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                        {branch.code.slice(0, 2)}
                      </div>
                      <span>{branch.name}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-700">
                      <span className="bg-slate-100 px-2 py-1 rounded font-semibold border border-slate-200">
                        {branch.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      <span className="inline-flex items-center gap-1.5 text-xs bg-sky-50 text-sky-800 px-2.5 py-1 rounded-md border border-sky-100 font-medium">
                        <Network className="w-3 h-3 text-sky-600" />
                        {branch.business_unit?.name || 'Assigned Division'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 space-y-1">
                      {branch.phone && (
                        <div className="flex items-center gap-1 text-slate-700">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{branch.phone}</span>
                        </div>
                      )}
                      {branch.email && (
                        <div className="flex items-center gap-1 text-slate-500">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{branch.email}</span>
                        </div>
                      )}
                      {!branch.phone && !branch.email && <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                      {branch.address || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        id={`branch-status-${branch.id}`}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          branch.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {branch.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        id={`btn-edit-branch-${branch.id}`}
                        type="button"
                        onClick={() => handleOpenModal(branch)}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                        title="Edit Branch"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        id={`btn-delete-branch-${branch.id}`}
                        type="button"
                        onClick={() => setDeletingBranch(branch)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        title="Delete Branch"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div id="modal-branch-form" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 id="modal-branch-title" className="text-base font-bold text-slate-900">
                {editingBranch ? 'Edit Branch' : 'New Branch'}
              </h2>
              <button
                id="btn-close-branch-modal"
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="p-6 space-y-4">
              {modalError && (
                <div id="modal-branch-error" className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label htmlFor="branch-form-bu" className="block text-xs font-semibold text-slate-700 mb-1">
                  Parent Business Unit *
                </label>
                <select
                  id="branch-form-bu"
                  required
                  value={formBuId}
                  onChange={(e) => setFormBuId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900 bg-white"
                >
                  <option value="" disabled>Select Business Unit</option>
                  {businessUnits.map((bu) => (
                    <option key={bu.id} value={bu.id}>
                      {bu.name} ({bu.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="branch-form-name" className="block text-xs font-semibold text-slate-700 mb-1">
                  Branch Name *
                </label>
                <input
                  id="branch-form-name"
                  type="text"
                  required
                  placeholder="e.g. Dhanmondi Flagship Outlet"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="branch-form-code" className="block text-xs font-semibold text-slate-700 mb-1">
                  Branch Code *
                </label>
                <input
                  id="branch-form-code"
                  type="text"
                  required
                  placeholder="e.g. DHN-01"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900 font-mono uppercase"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Unique code within business unit</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="branch-form-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone
                  </label>
                  <input
                    id="branch-form-phone"
                    type="text"
                    placeholder="e.g. +880 1711-223344"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900"
                  />
                </div>

                <div>
                  <label htmlFor="branch-form-email" className="block text-xs font-semibold text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    id="branch-form-email"
                    type="email"
                    placeholder="branch@sonaribd.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="branch-form-address" className="block text-xs font-semibold text-slate-700 mb-1">
                  Physical Address
                </label>
                <textarea
                  id="branch-form-address"
                  rows={2}
                  placeholder="Street, Area, City..."
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="branch-form-status" className="block text-xs font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  id="branch-form-status"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900 bg-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  id="btn-cancel-branch-form"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-branch-form"
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                >
                  {saving ? 'Saving...' : editingBranch ? 'Update Branch' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingBranch && (
        <div id="modal-delete-branch" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Delete Branch?</h3>
            <p className="text-sm text-slate-500 mt-2">
              Are you sure you want to delete <span className="font-semibold text-slate-800">{deletingBranch.name}</span> ({deletingBranch.code})? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                id="btn-cancel-delete-branch"
                type="button"
                onClick={() => setDeletingBranch(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete-branch"
                type="button"
                disabled={deleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
