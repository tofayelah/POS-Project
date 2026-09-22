import React, { useState, useEffect, FormEvent } from 'react';
import { 
  Boxes, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Building2,
  Filter
} from 'lucide-react';
import { StorageLocation, Warehouse } from '../../types/organization';
import { 
  getStorageLocations, 
  getWarehouses, 
  createStorageLocation, 
  updateStorageLocation, 
  deleteStorageLocation 
} from '../../api/organization';

export function StorageLocationList() {
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [error, setError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StorageLocation | null>(null);
  const [formWarehouseId, setFormWarehouseId] = useState<number | ''>('');
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete State
  const [deletingLocation, setDeletingLocation] = useState<StorageLocation | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [locRes, whRes] = await Promise.all([
        getStorageLocations(),
        getWarehouses().catch(() => ({ data: [] })),
      ]);
      setLocations(locRes.data || []);
      setWarehouses(whRes.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load storage locations.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (location?: StorageLocation) => {
    setModalError(null);
    if (location) {
      setEditingLocation(location);
      setFormWarehouseId(location.warehouse_id);
      setFormName(location.name);
      setFormCode(location.code);
      setFormDescription(location.description || '');
      setFormIsActive(location.is_active);
    } else {
      setEditingLocation(null);
      setFormWarehouseId(warehouses.length > 0 ? warehouses[0].id : '');
      setFormName('');
      setFormCode('');
      setFormDescription('');
      setFormIsActive(true);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLocation(null);
    setModalError(null);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!formWarehouseId) {
      setModalError('Please select a warehouse.');
      return;
    }
    if (!formName.trim() || !formCode.trim()) {
      setModalError('Name and code are required.');
      return;
    }

    setSaving(true);
    setModalError(null);

    try {
      if (editingLocation) {
        await updateStorageLocation(editingLocation.id, {
          name: formName.trim(),
          description: formDescription.trim() || null,
          is_active: formIsActive,
        });
        setFeedbackMessage(`Storage location "${formName.trim()}" updated successfully.`);
      } else {
        await createStorageLocation({
          warehouse_id: Number(formWarehouseId),
          code: formCode.trim().toUpperCase(),
          name: formName.trim(),
          description: formDescription.trim() || null,
          is_active: formIsActive,
        });
        setFeedbackMessage(`Storage location "${formName.trim()}" created successfully.`);
      }
      handleCloseModal();
      await loadData();
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to save storage location.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingLocation) return;
    setDeleting(true);
    try {
      await deleteStorageLocation(deletingLocation.id);
      setFeedbackMessage(`Storage location "${deletingLocation.name}" removed successfully.`);
      setDeletingLocation(null);
      await loadData();
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Cannot delete storage location.');
      setDeletingLocation(null);
    } finally {
      setDeleting(false);
    }
  };

  const filteredLocations = locations.filter((loc) => {
    const matchesSearch =
      loc.name.toLowerCase().includes(search.toLowerCase()) ||
      loc.code.toLowerCase().includes(search.toLowerCase()) ||
      (loc.warehouse?.name && loc.warehouse.name.toLowerCase().includes(search.toLowerCase()));

    const matchesWarehouse = warehouseFilter === 'ALL' || loc.warehouse_id === Number(warehouseFilter);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && loc.is_active) ||
      (statusFilter === 'inactive' && !loc.is_active);

    return matchesSearch && matchesWarehouse && matchesStatus;
  });

  return (
    <div id="storage-locations-page" className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-6 h-6 text-indigo-600" />
            <h1 id="storage-locations-title" className="text-2xl font-bold text-slate-900 tracking-tight">
              Storage Locations
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage granular inventory storage locations (Aisles, Racks, Shelves, Bins) scoped to your warehouses.
          </p>
        </div>
        <button
          id="btn-add-storage-location"
          type="button"
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Storage Location</span>
        </button>
      </div>

      {/* Notifications */}
      {feedbackMessage && (
        <div id="feedback-alert" className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-medium">{feedbackMessage}</p>
        </div>
      )}

      {error && (
        <div id="error-alert" className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button type="button" onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="search-storage-locations"
            type="text"
            placeholder="Search by code, name, or warehouse..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Warehouse Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              id="filter-warehouse"
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              aria-label="Filter by Warehouse"
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Warehouses</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            aria-label="Filter by Status"
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm">Loading storage locations...</p>
          </div>
        ) : filteredLocations.length === 0 ? (
          <div id="storage-locations-empty" className="p-12 text-center">
            <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No storage locations found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {search || warehouseFilter !== 'ALL' || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Create your first storage location (Aisle, Rack, or Bin).'}
            </p>
            {!search && warehouseFilter === 'ALL' && (
              <button
                type="button"
                onClick={() => handleOpenModal()}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Location</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table id="storage-locations-table" className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <th className="px-6 py-3.5">Location Name & Code</th>
                  <th className="px-6 py-3.5">Warehouse</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLocations.map((loc) => (
                  <tr key={loc.id} id={`loc-row-${loc.id}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{loc.name}</div>
                      <div className="font-mono text-xs text-slate-500 mt-0.5">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-medium">
                          {loc.code}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-700 text-xs">
                        <Building2 className="w-4 h-4 text-indigo-500" />
                        <span className="font-medium">{loc.warehouse?.name || 'Warehouse #' + loc.warehouse_id}</span>
                        {loc.warehouse?.code && (
                          <span className="text-slate-400">({loc.warehouse.code})</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-xs max-w-xs truncate">
                      {loc.description || <span className="text-slate-400 italic">No notes</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          loc.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {loc.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        id={`btn-edit-loc-${loc.id}`}
                        type="button"
                        onClick={() => handleOpenModal(loc)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                        title="Edit Storage Location"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        id={`btn-delete-loc-${loc.id}`}
                        type="button"
                        onClick={() => setDeletingLocation(loc)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        title="Delete Storage Location"
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
        <div id="modal-storage-location" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-base font-semibold text-slate-900">
                {editingLocation ? 'Edit Storage Location' : 'New Storage Location'}
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Warehouse <span className="text-rose-500">*</span>
                </label>
                <select
                  id="input-warehouse-id"
                  value={formWarehouseId}
                  disabled={!!editingLocation}
                  onChange={(e) => setFormWarehouseId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                  required
                >
                  <option value="" disabled>Select Warehouse</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code})
                    </option>
                  ))}
                </select>
                {editingLocation && (
                  <p className="text-[11px] text-slate-400 mt-1">Warehouse cannot be modified once created.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Location Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-location-code"
                    type="text"
                    value={formCode}
                    disabled={!!editingLocation}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="e.g. AISLE-A1"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Unique within warehouse</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Location Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-location-name"
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Aisle A Rack 1"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Description / Notes
                </label>
                <textarea
                  id="input-location-description"
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional notes regarding shelf capacity, temperature, or placement..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  id="input-location-active"
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <label htmlFor="input-location-active" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Active Storage Location
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-lg text-sm font-medium text-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-storage-location"
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editingLocation ? 'Update Location' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingLocation && (
        <div id="modal-delete-location" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Delete Storage Location</h3>
                <p className="text-xs text-slate-500">Confirm permanent deletion</p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Are you sure you want to delete storage location <strong className="text-slate-900">{deletingLocation.name}</strong> ({deletingLocation.code})?
            </p>
            <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-200">
              <strong>Delete Safety Rule:</strong> If this location contains active inventory stock, deletion will be safely rejected.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingLocation(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-lg text-sm font-medium text-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete-location"
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer disabled:opacity-60"
              >
                {deleting ? 'Deleting...' : 'Delete Location'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
