import React, { useState, useEffect } from 'react';
import { Tag, Plus, Search, RefreshCw, Edit, Trash2, CheckCircle, AlertCircle, X } from 'lucide-react';
import { getBrands, createBrand, updateBrand, deleteBrand } from '../../api/products';
import { Brand } from '../../types/product';

export const BrandList: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchBrands();
  }, [searchTerm]);

  const fetchBrands = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getBrands({ search: searchTerm || undefined });
      if (res.success) {
        setBrands(res.data || []);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load brands.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (b?: Brand) => {
    if (b) {
      setEditingBrand(b);
      setName(b.name || '');
      setCode(b.code || '');
    } else {
      setEditingBrand(null);
      setName('');
      setCode('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        code: code.trim() || undefined,
      };

      if (editingBrand) {
        await updateBrand(Number(editingBrand.id), payload);
        setSuccessMessage(`Brand "${name}" updated successfully.`);
      } else {
        await createBrand(payload);
        setSuccessMessage(`Brand "${name}" created successfully.`);
      }

      setIsModalOpen(false);
      fetchBrands();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save brand.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (b: Brand) => {
    if (!window.confirm(`Are you sure you want to delete brand "${b.name}"?`)) return;
    try {
      await deleteBrand(Number(b.id));
      setSuccessMessage(`Brand "${b.name}" deleted.`);
      fetchBrands();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete brand.');
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Tag className="w-7 h-7 text-indigo-600 shrink-0" />
            Brand Management
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">Manage manufacturer and distributor product brands</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-xs cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Brand
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
              placeholder="Search brands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
            />
          </div>
          <button
            onClick={() => fetchBrands()}
            className="p-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors self-end sm:self-auto cursor-pointer"
            title="Refresh brands"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-100 uppercase text-xs font-bold text-slate-800 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">Brand Name</th>
                <th className="px-4 py-3.5">Code</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-slate-500 font-medium">Loading brands...</td>
                </tr>
              ) : brands.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-slate-500 font-medium">No brands found.</td>
                </tr>
              ) : (
                brands.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-900">{b.name}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600 font-medium">{b.code || '—'}</td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleOpenModal(b)}
                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                        title="Edit brand"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(b)}
                        className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="Delete brand"
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
                {editingBrand ? 'Edit Brand' : 'Add New Brand'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Brand Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Samsung"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Brand Code / Short Identifier
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. SAMS"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
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
                  {isSaving ? 'Saving...' : 'Save Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
