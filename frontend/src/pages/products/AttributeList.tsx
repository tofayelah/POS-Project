import React, { useState, useEffect } from 'react';
import { Sliders, Plus, Search, RefreshCw, Edit, Trash2, CheckCircle, AlertCircle, X } from 'lucide-react';
import { getAttributes, createAttribute, updateAttribute, deleteAttribute } from '../../api/products';
import { Attribute, AttributeValue } from '../../types/product';

export const AttributeList: React.FC = () => {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAttr, setEditingAttr] = useState<Attribute | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [valueInput, setValueInput] = useState('');
  const [valuesList, setValuesList] = useState<{ id?: number; value: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchAttributes();
  }, [searchTerm]);

  const fetchAttributes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAttributes({ search: searchTerm || undefined });
      if (res.success) {
        setAttributes(res.data || []);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load attributes.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (attr?: Attribute) => {
    if (attr) {
      setEditingAttr(attr);
      setName(attr.name || '');
      setCode(attr.code || '');
      setValuesList(
        attr.values?.map((v) => ({
          id: Number(v.id),
          value: v.value,
        })) || []
      );
    } else {
      setEditingAttr(null);
      setName('');
      setCode('');
      setValuesList([]);
    }
    setValueInput('');
    setIsModalOpen(true);
  };

  const handleAddValuePill = () => {
    const val = valueInput.trim();
    if (!val) return;
    if (valuesList.some((v) => v.value.toLowerCase() === val.toLowerCase())) return;
    setValuesList([...valuesList, { value: val }]);
    setValueInput('');
  };

  const handleRemoveValuePill = (idx: number) => {
    setValuesList(valuesList.filter((_, i) => i !== idx));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        code: code.trim() || undefined,
        values: valuesList.map((v) => v.value),
      };

      if (editingAttr) {
        await updateAttribute(Number(editingAttr.id), payload as any);
        setSuccessMessage(`Attribute "${name}" updated successfully.`);
      } else {
        await createAttribute(payload as any);
        setSuccessMessage(`Attribute "${name}" created successfully.`);
      }

      setIsModalOpen(false);
      fetchAttributes();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save attribute.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (attr: Attribute) => {
    if (!window.confirm(`Are you sure you want to delete attribute "${attr.name}"?`)) return;
    try {
      await deleteAttribute(Number(attr.id));
      setSuccessMessage(`Attribute "${attr.name}" deleted.`);
      fetchAttributes();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete attribute.');
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Sliders className="w-7 h-7 text-indigo-600 shrink-0" />
            Product Variant Attributes Master
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">Manage reusable matrix attributes (Capacity, Color, Size, Material)</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-xs cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Attribute
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
              placeholder="Search attributes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
            />
          </div>
          <button
            onClick={() => fetchAttributes()}
            className="p-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors self-end sm:self-auto cursor-pointer"
            title="Refresh attributes"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-100 uppercase text-xs font-bold text-slate-800 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 w-48">Attribute Name</th>
                <th className="px-4 py-3.5 w-36">Code</th>
                <th className="px-4 py-3.5">Configured Values</th>
                <th className="px-4 py-3.5 text-right w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500 font-medium">Loading attributes...</td>
                </tr>
              ) : attributes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500 font-medium">No attributes found.</td>
                </tr>
              ) : (
                attributes.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-900">{a.name}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600 font-medium">{a.code || '—'}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {a.values && a.values.length > 0 ? (
                          a.values.map((v) => (
                            <span
                              key={v.id}
                              className="px-2.5 py-1 bg-indigo-50 text-indigo-800 rounded text-xs font-semibold border border-indigo-200"
                            >
                              {v.value}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-xs italic">No values configured</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleOpenModal(a)}
                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                        title="Edit attribute"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(a)}
                        className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="Delete attribute"
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

      {/* Attribute Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingAttr ? 'Edit Attribute' : 'Add New Attribute'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Attribute Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Capacity"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. capacity"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Attribute Values (e.g. 150ml, 240ml, 300ml)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={valueInput}
                    onChange={(e) => setValueInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddValuePill();
                      }
                    }}
                    placeholder="Type value and press Enter..."
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={handleAddValuePill}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    Add Value
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 min-h-16">
                  {valuesList.length === 0 ? (
                    <span className="text-xs text-slate-400">No values added yet.</span>
                  ) : (
                    valuesList.map((v, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-300 rounded-md text-xs font-medium text-slate-800 shadow-2xs"
                      >
                        {v.value}
                        <button
                          type="button"
                          onClick={() => handleRemoveValuePill(idx)}
                          className="text-slate-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
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
                  {isSaving ? 'Saving...' : 'Save Attribute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
