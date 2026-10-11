import React, { useState, useEffect } from 'react';
import { Sliders, Plus, Search, RefreshCw, Edit, Trash2, CheckCircle, AlertCircle, X, Tag } from 'lucide-react';
import { getAttributes, createAttribute, updateAttribute, deleteAttribute } from '../../api/products';
import api from '../../api/axios';
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
  const [valuesList, setValuesList] = useState<{ id?: number | string; value: string; code?: string }[]>([]);
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
      setValuesList((attr.values || []).map((v) => ({ id: v.id, value: v.value, code: v.code })));
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
    if (!valueInput.trim()) return;
    const valText = valueInput.trim();
    if (valuesList.some((v) => v.value.toLowerCase() === valText.toLowerCase())) {
      setValueInput('');
      return;
    }
    setValuesList([...valuesList, { value: valText, code: valText.toLowerCase().replace(/[^a-z0-9]/g, '') }]);
    setValueInput('');
  };

  const handleRemoveValuePill = (index: number) => {
    setValuesList(valuesList.filter((_, idx) => idx !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        code: code.trim() || undefined,
        values: valuesList,
      };

      if (editingAttr) {
        await updateAttribute(Number(editingAttr.id), payload);
        setSuccessMessage(`Attribute "${name}" updated.`);
      } else {
        await createAttribute(payload);
        setSuccessMessage(`Attribute "${name}" created.`);
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
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Sliders className="w-7 h-7 text-indigo-600" />
            Product Variant Attributes Master
          </h1>
          <p className="text-sm text-slate-500">Manage reusable matrix attributes (Capacity, Color, Size, Material)</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Attribute
        </button>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700 p-4 space-y-4">
        <div className="flex justify-between items-center">
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search attributes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={() => fetchAttributes()}
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase text-xs font-semibold text-slate-700 dark:text-slate-200">
              <tr>
                <th className="px-4 py-3 w-48">Attribute Name</th>
                <th className="px-4 py-3 w-36">Code</th>
                <th className="px-4 py-3">Configured Values</th>
                <th className="px-4 py-3 text-right w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">Loading attributes...</td>
                </tr>
              ) : attributes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">No attributes found.</td>
                </tr>
              ) : (
                attributes.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{a.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{a.code || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {a.values && a.values.length > 0 ? (
                          a.values.map((v) => (
                            <span
                              key={v.id}
                              className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 rounded text-xs font-medium border border-indigo-100"
                            >
                              {v.value}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-xs italic">No values configured</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleOpenModal(a)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(a)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                {editingAttr ? 'Edit Attribute' : 'Add New Attribute'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Attribute Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Capacity"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. capacity"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-lg text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddValuePill}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700"
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
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-300 rounded-full text-xs font-medium text-slate-800 shadow-2xs"
                      >
                        {v.value}
                        <button
                          type="button"
                          onClick={() => handleRemoveValuePill(idx)}
                          className="text-slate-400 hover:text-rose-600 ml-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
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
