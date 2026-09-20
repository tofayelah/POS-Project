import React, { useState, useEffect } from 'react';
import { 
  Network, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Filter, 
  Building2 
} from 'lucide-react';
import { BusinessUnit } from '../../types/organization';
import { 
  getBusinessUnits, 
  createBusinessUnit, 
  updateBusinessUnit, 
  deleteBusinessUnit 
} from '../../api/organization';

export function BusinessUnitList() {
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [error, setError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<BusinessUnit | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete Dialog State
  const [deletingUnit, setDeletingUnit] = useState<BusinessUnit | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadBusinessUnits();
  }, []);

  const loadBusinessUnits = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getBusinessUnits();
      setUnits(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load business units');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (unit?: BusinessUnit) => {
    if (unit) {
      setEditingUnit(unit);
      setFormName(unit.name);
      setFormCode(unit.code);
      setFormDescription(unit.description || '');
      setFormStatus(unit.status || 'active');
    } else {
      setEditingUnit(null);
      setFormName('');
      setFormCode('');
      setFormDescription('');
      setFormStatus('active');
    }
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setModalError('Business Unit Name is required.');
      return;
    }
    if (!formCode.trim()) {
      setModalError('Unit Code is required.');
      return;
    }

    setSaving(true);
    setModalError(null);

    try {
      if (editingUnit) {
        await updateBusinessUnit(editingUnit.id, {
          name: formName.trim(),
          code: formCode.trim().toUpperCase(),
          description: formDescription.trim() || null,
          status: formStatus,
        });
        setFeedbackMessage('Business Unit updated successfully.');
      } else {
        await createBusinessUnit({
          name: formName.trim(),
          code: formCode.trim().toUpperCase(),
          description: formDescription.trim() || null,
          status: formStatus,
        });
        setFeedbackMessage('Business Unit created successfully.');
      }
      setIsModalOpen(false);
      loadBusinessUnits();
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to save business unit.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUnit) return;
    setDeleting(true);
    try {
      await deleteBusinessUnit(deletingUnit.id);
      setFeedbackMessage('Business Unit deleted successfully.');
      setDeletingUnit(null);
      loadBusinessUnits();
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete business unit. It may be linked to branches.');
      setDeletingUnit(null);
    } finally {
      setDeleting(false);
    }
  };

  const filteredUnits = units.filter((unit) => {
    const matchesSearch = 
      unit.name.toLowerCase().includes(search.toLowerCase()) ||
      unit.code.toLowerCase().includes(search.toLowerCase()) ||
      (unit.description && unit.description.toLowerCase().includes(search.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || unit.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div id="business-units-page" className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-6 h-6 text-blue-600" />
            <h1 id="bu-page-title" className="text-2xl font-bold text-slate-900 tracking-tight">Business Units</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Organize operational divisions, product lines, and business verticals.
          </p>
        </div>
        <button
          id="btn-add-business-unit"
          type="button"
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Business Unit</span>
        </button>
      </div>

      {/* Feedback Messages */}
      {feedbackMessage && (
        <div id="bu-success-alert" className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {error && (
        <div id="bu-error-alert" className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="bu-search-input"
            type="text"
            placeholder="Search by name, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          <select
            id="bu-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div id="bu-loading" className="flex items-center justify-center p-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-slate-500 font-medium">Loading business units...</span>
            </div>
          </div>
        ) : filteredUnits.length === 0 ? (
          <div id="bu-empty-state" className="p-12 text-center">
            <Network className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No business units found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {search ? 'Try adjusting your search query or filter.' : 'Get started by creating your first business unit division.'}
            </p>
            {!search && (
              <button
                id="btn-empty-add-bu"
                type="button"
                onClick={() => handleOpenModal()}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Business Unit</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table id="business-units-table" className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <th className="px-6 py-3.5">Unit Name</th>
                  <th className="px-6 py-3.5">Code</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Created</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredUnits.map((unit) => (
                  <tr key={unit.id} id={`bu-row-${unit.id}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                        {unit.code.slice(0, 2)}
                      </div>
                      <span>{unit.name}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-700">
                      <span className="bg-slate-100 px-2 py-1 rounded font-semibold border border-slate-200">
                        {unit.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                      {unit.description || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        id={`bu-status-${unit.id}`}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          unit.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {unit.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {unit.created_at ? new Date(unit.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        id={`btn-edit-bu-${unit.id}`}
                        type="button"
                        onClick={() => handleOpenModal(unit)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                        title="Edit Business Unit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        id={`btn-delete-bu-${unit.id}`}
                        type="button"
                        onClick={() => setDeletingUnit(unit)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        title="Delete Business Unit"
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
        <div id="modal-bu-form" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 id="modal-bu-title" className="text-base font-bold text-slate-900">
                {editingUnit ? 'Edit Business Unit' : 'New Business Unit'}
              </h2>
              <button
                id="btn-close-bu-modal"
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="p-6 space-y-4">
              {modalError && (
                <div id="modal-bu-error" className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label htmlFor="bu-form-name" className="block text-xs font-semibold text-slate-700 mb-1">
                  Business Unit Name *
                </label>
                <input
                  id="bu-form-name"
                  type="text"
                  required
                  placeholder="e.g. Retail Fashion Division"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="bu-form-code" className="block text-xs font-semibold text-slate-700 mb-1">
                  Unit Code *
                </label>
                <input
                  id="bu-form-code"
                  type="text"
                  required
                  placeholder="e.g. FASHION"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 font-mono uppercase"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Unique identifier within company</span>
              </div>

              <div>
                <label htmlFor="bu-form-desc" className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  id="bu-form-desc"
                  rows={2}
                  placeholder="Operational scope or notes..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="bu-form-status" className="block text-xs font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  id="bu-form-status"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 bg-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  id="btn-cancel-bu-form"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-bu-form"
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                >
                  {saving ? 'Saving...' : editingUnit ? 'Update Unit' : 'Create Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingUnit && (
        <div id="modal-delete-bu" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Delete Business Unit?</h3>
            <p className="text-sm text-slate-500 mt-2">
              Are you sure you want to delete <span className="font-semibold text-slate-800">{deletingUnit.name}</span> ({deletingUnit.code})? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                id="btn-cancel-delete-bu"
                type="button"
                onClick={() => setDeletingUnit(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete-bu"
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
