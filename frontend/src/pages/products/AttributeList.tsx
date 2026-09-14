import React, { useState, useEffect } from 'react';
import { Plus, Search, Layers, Edit2, Trash2, X, AlertCircle, Tag } from 'lucide-react';
import { Attribute, AttributeValue } from '../../types/product';
import { getAttributes, createAttribute, updateAttribute, deleteAttribute } from '../../api/products';

export function AttributeList() {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Modal State for Attribute
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formValues, setFormValues] = useState<string[]>([]);
  const [newValueInput, setNewValueInput] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAttributes();
  }, [search]);

  const loadAttributes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAttributes({ search: search.trim() || undefined });
      setAttributes(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load attributes');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (attr?: Attribute) => {
    if (attr) {
      setEditingAttribute(attr);
      setFormName(attr.name);
      setFormCode(attr.code || '');
      setFormValues((attr.values || []).map((v) => v.value));
    } else {
      setEditingAttribute(null);
      setFormName('');
      setFormCode('');
      setFormValues([]);
    }
    setNewValueInput('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleAddValueTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = newValueInput.trim();
    if (!val) return;
    if (formValues.map((v) => v.toLowerCase()).includes(val.toLowerCase())) {
      setModalError(`Value '${val}' already added.`);
      return;
    }
    setFormValues([...formValues, val]);
    setNewValueInput('');
    setModalError(null);
  };

  const handleRemoveValueTag = (valToRemove: string) => {
    setFormValues(formValues.filter((v) => v !== valToRemove));
  };

  const handleSaveAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setModalError('Attribute Name is required.');
      return;
    }
    setSaving(true);
    setModalError(null);

    const valuesPayload = formValues.map((val, idx) => ({
      value: val,
      code: val.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      sort_order: idx + 1,
    }));

    try {
      if (editingAttribute) {
        await updateAttribute(editingAttribute.id, {
          name: formName.trim(),
          code: formCode.trim() || formName.trim().toLowerCase(),
          values: valuesPayload as any,
        });
      } else {
        await createAttribute({
          company_id: 1,
          name: formName.trim(),
          code: formCode.trim() || formName.trim().toLowerCase(),
          status: 'active',
          values: valuesPayload as any,
        });
      }
      setIsModalOpen(false);
      loadAttributes();
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to save attribute.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAttribute = async (attr: Attribute) => {
    if (!confirm(`Are you sure you want to delete attribute '${attr.name}' and all its values?`)) return;
    try {
      await deleteAttribute(attr.id);
      loadAttributes();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete attribute');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Product Attributes</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dimensions (Color, Size, Fabric) and discrete values used for Variant Matrix generation
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Attribute</span>
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
            placeholder="Search attributes..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Attributes Card List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading attributes...</div>
        ) : error ? (
          <div className="p-6 text-center text-xs text-rose-600">{error}</div>
        ) : attributes.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">No attributes found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {attributes.map((attr) => (
              <div key={attr.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-slate-900 text-sm">{attr.name}</span>
                      <span className="text-[11px] font-mono text-slate-400">({attr.code || attr.name.toLowerCase()})</span>
                      <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {(attr.values || []).length} Values
                      </span>
                    </div>

                    {/* Values Pills */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {(attr.values || []).map((val) => (
                        <span
                          key={val.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200"
                        >
                          <Tag className="w-3 h-3 text-slate-400" />
                          <span>{val.value}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 self-end sm:self-start">
                    <button
                      onClick={() => handleOpenModal(attr)}
                      className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Edit Attribute & Values"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAttribute(attr)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Attribute"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-base font-semibold text-slate-800">
                {editingAttribute ? 'Edit Attribute & Values' : 'Create Attribute'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAttribute} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Attribute Name *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Color, Size, Cup Size..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Internal Code</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="e.g. color, size, cup-size..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Values Tag Manager */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Attribute Values
                </label>
                <p className="text-[11px] text-slate-500">
                  Type a value (e.g. "Black", "34", "XL") and press Enter or click Add:
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newValueInput}
                    onChange={(e) => setNewValueInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddValueTag();
                      }
                    }}
                    placeholder="Add value..."
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddValueTag()}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Add Value
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg min-h-16 max-h-48 overflow-y-auto">
                  {formValues.length === 0 ? (
                    <span className="text-xs text-slate-400">No values added yet</span>
                  ) : (
                    formValues.map((val) => (
                      <span
                        key={val}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-300 rounded-md text-xs font-medium text-slate-800 shadow-2xs"
                      >
                        <span>{val}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveValueTag(val)}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
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
                  {saving ? 'Saving...' : 'Save Attribute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
