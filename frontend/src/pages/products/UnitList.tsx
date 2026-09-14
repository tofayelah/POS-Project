import React, { useState, useEffect } from 'react';
import { Plus, Search, Scale, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import { Unit } from '../../types/product';
import { getUnits, createUnit, updateUnit, deleteUnit } from '../../api/products';

export function UnitList() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [formName, setFormName] = useState('');
  const [formShortCode, setFormShortCode] = useState('');
  const [formDecimalAllowed, setFormDecimalAllowed] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUnits();
  }, [search]);

  const loadUnits = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getUnits({ search: search.trim() || undefined, all: true });
      setUnits(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load units');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (unit?: Unit) => {
    if (unit) {
      setEditingUnit(unit);
      setFormName(unit.name);
      setFormShortCode(unit.short_code);
      setFormDecimalAllowed(unit.decimal_allowed);
    } else {
      setEditingUnit(null);
      setFormName('');
      setFormShortCode('');
      setFormDecimalAllowed(false);
    }
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formShortCode.trim()) {
      setModalError('Unit Short Code is required.');
      return;
    }
    setSaving(true);
    setModalError(null);

    try {
      if (editingUnit) {
        await updateUnit(editingUnit.id, {
          name: formName.trim() || formShortCode.toUpperCase(),
          short_code: formShortCode.trim().toLowerCase(),
          decimal_allowed: formDecimalAllowed,
        });
      } else {
        await createUnit({
          company_id: 1,
          name: formName.trim() || formShortCode.toUpperCase(),
          short_code: formShortCode.trim().toLowerCase(),
          decimal_allowed: formDecimalAllowed,
          status: 'active',
        });
      }
      setIsModalOpen(false);
      loadUnits();
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to save unit.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUnit = async (unit: Unit) => {
    if (!confirm(`Are you sure you want to delete unit '${unit.name}'?`)) return;
    try {
      await deleteUnit(unit.id);
      loadUnits();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete unit');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Units of Measure</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Standard sales and packaging unit definitions
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Unit</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search units by name or code..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Units Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading units...</div>
        ) : error ? (
          <div className="p-6 text-center text-xs text-rose-600">{error}</div>
        ) : units.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">No units found.</div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="py-3 px-4 font-semibold">Unit Name</th>
                <th className="py-3 px-4 font-semibold">Short Code</th>
                <th className="py-3 px-4 font-semibold text-center">Allow Decimals</th>
                <th className="py-3 px-4 font-semibold text-center">Products Count</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {units.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Scale className="w-3.5 h-3.5 text-blue-600" />
                      <span className="font-semibold text-slate-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-slate-700">{u.short_code}</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        u.decimal_allowed
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {u.decimal_allowed ? 'Yes (0.00)' : 'No (Integers Only)'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium">
                      {u.products_count || 0}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenModal(u)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit Unit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUnit(u)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Unit"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-base font-semibold text-slate-800">
                {editingUnit ? 'Edit Unit' : 'Create Unit'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Unit Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Piece, Dozen, Pack, Meter..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Short Code *</label>
                <input
                  type="text"
                  value={formShortCode}
                  onChange={(e) => setFormShortCode(e.target.value)}
                  placeholder="e.g. pcs, dz, pk, m..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formDecimalAllowed}
                    onChange={(e) => setFormDecimalAllowed(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Allow Fractional/Decimal Quantities (e.g. 1.5 meters or 2.25 kg)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
