import React, { useState, useEffect } from 'react';
import { Scale, Plus, Search, RefreshCw, Edit, Trash2, CheckCircle, AlertCircle, X } from 'lucide-react';
import { getUnits, createUnit, updateUnit, deleteUnit } from '../../api/products';
import { Unit } from '../../types/product';

export const UnitList: React.FC = () => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [decimalAllowed, setDecimalAllowed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchUnits();
  }, [searchTerm]);

  const fetchUnits = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getUnits({ search: searchTerm || undefined });
      if (res.success) {
        setUnits(res.data || []);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load units.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (u?: Unit) => {
    if (u) {
      setEditingUnit(u);
      setName(u.name || '');
      setShortCode(u.short_code || '');
      setDecimalAllowed(Boolean(u.decimal_allowed));
    } else {
      setEditingUnit(null);
      setName('');
      setShortCode('');
      setDecimalAllowed(false);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !shortCode.trim()) return;

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        short_code: shortCode.trim().toUpperCase(),
        decimal_allowed: decimalAllowed,
      };

      if (editingUnit) {
        await updateUnit(Number(editingUnit.id), payload);
        setSuccessMessage(`Unit "${name}" updated successfully.`);
      } else {
        await createUnit(payload);
        setSuccessMessage(`Unit "${name}" created successfully.`);
      }

      setIsModalOpen(false);
      fetchUnits();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save unit.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (u: Unit) => {
    if (!window.confirm(`Are you sure you want to delete unit "${u.name}"?`)) return;
    try {
      await deleteUnit(Number(u.id));
      setSuccessMessage(`Unit "${u.name}" deleted.`);
      fetchUnits();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete unit.');
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Scale className="w-7 h-7 text-indigo-600 shrink-0" />
            Measurement Units Master
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">Units of measure (PCS, KG, BOX, ML) & fractional decimal quantity rules</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-xs cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Unit
        </button>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-sm font-medium flex items-center gap-2 shadow-2xs">
          <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-sm font-medium flex items-center gap-2 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-rose-700 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search units..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
            />
          </div>
          <button
            onClick={() => fetchUnits()}
            className="p-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors self-end sm:self-auto cursor-pointer"
            title="Refresh units"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-100 uppercase text-xs font-bold text-slate-800 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">Unit Name</th>
                <th className="px-4 py-3.5">Short Code</th>
                <th className="px-4 py-3.5">Fractional Precision Rule</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500 font-medium">Loading units...</td>
                </tr>
              ) : units.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500 font-medium">No units found.</td>
                </tr>
              ) : (
                units.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-900">{u.name}</td>
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-indigo-700">{u.short_code}</td>
                    <td className="px-4 py-3.5 text-xs">
                      {u.decimal_allowed ? (
                        <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 font-bold">
                          Fractional / Decimals Allowed
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold">
                          Whole Integers Only
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleOpenModal(u)}
                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                        title="Edit unit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="Delete unit"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingUnit ? 'Edit Unit' : 'Add New Unit'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Unit Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kilogram"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Short Code *
                </label>
                <input
                  type="text"
                  required
                  value={shortCode}
                  onChange={(e) => setShortCode(e.target.value)}
                  placeholder="e.g. KG"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <input
                  type="checkbox"
                  id="decimal_allowed"
                  checked={decimalAllowed}
                  onChange={(e) => setDecimalAllowed(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="decimal_allowed" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Allow fractional / decimal quantities (e.g. 1.5 KG)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSaving ? 'Saving...' : 'Save Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
