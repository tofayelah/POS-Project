import React, { useState, useEffect } from 'react';
import { Tag, Plus, Search, RefreshCw, Edit, Trash2, CheckCircle, AlertCircle, X, Sparkles, Hash, Package, ShieldCheck } from 'lucide-react';
import {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  generateNextBrandCode,
  generateBrandCodeFromName,
  getNextBrandCode,
} from '../../api/products';
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
  const [isAutoCode, setIsAutoCode] = useState(true);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchBrands();
  }, [searchTerm]);

  const fetchBrands = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getBrands({ search: searchTerm || undefined });
      const items = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];
      setBrands(items);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load brands.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = async (b?: Brand) => {
    if (b) {
      setEditingBrand(b);
      setName(b.name || '');
      setCode(b.code || '');
      setDescription((b as any).description || '');
      setStatus(((b as any).status as 'active' | 'inactive') || 'active');
      setIsAutoCode(false);
    } else {
      setEditingBrand(null);
      setName('');
      setDescription('');
      setStatus('active');
      setIsAutoCode(true);

      // System Auto-generates unique sequential brand code (e.g. BR-0006)
      const autoCode = generateNextBrandCode(brands);
      setCode(autoCode);

      // Attempt async server synchronization for next available brand code
      try {
        const serverCode = await getNextBrandCode(brands);
        if (serverCode) {
          setCode(serverCode);
        }
      } catch {}
    }
    setIsModalOpen(true);
  };

  const handleRegenerateCode = () => {
    const nextSeq = generateNextBrandCode(brands);
    setCode(nextSeq);
    setIsAutoCode(true);
  };

  const handleGenerateFromName = () => {
    if (name.trim()) {
      const nameCode = generateBrandCodeFromName(name, brands);
      setCode(nameCode);
      setIsAutoCode(true);
    } else {
      handleRegenerateCode();
    }
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingBrand && isAutoCode) {
      if (val.trim()) {
        setCode(generateBrandCodeFromName(val, brands));
      } else {
        setCode(generateNextBrandCode(brands));
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      let finalCode = code.trim();
      if (!finalCode) {
        finalCode = generateNextBrandCode(brands);
      }

      const payload = {
        name: name.trim(),
        code: finalCode,
        description: description.trim() || undefined,
        status,
      };

      if (editingBrand) {
        await updateBrand(Number(editingBrand.id), payload);
        setSuccessMessage(`Brand "${name}" (Code: ${finalCode}) updated successfully.`);
      } else {
        await createBrand(payload);
        setSuccessMessage(`Brand "${name}" (Code: ${finalCode}) created successfully.`);
      }

      setIsModalOpen(false);
      await fetchBrands();
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save brand.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (b: Brand) => {
    if (!window.confirm(`Are you sure you want to delete brand "${b.name}"?`)) return;
    try {
      await deleteBrand(Number(b.id));
      setSuccessMessage(`Brand "${b.name}" deleted.`);
      await fetchBrands();
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete brand.');
    }
  };

  const totalCount = brands.length;
  const activeCount = brands.filter((b) => (b.status || 'active') === 'active').length;
  const totalProducts = brands.reduce((acc, b) => acc + (Number((b as any).products_count) || 0), 0);

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Tag className="w-7 h-7 text-indigo-600 shrink-0" />
            Brand Management
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Manage manufacturer and distributor product brands with auto-generated unique codes
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-xs cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Brand
        </button>
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Brands</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Tag className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{totalCount}</p>
          <span className="text-xs text-slate-500 font-medium">Registered product brands</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Brands</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{activeCount}</p>
          <span className="text-xs text-emerald-700 font-semibold">Active in POS & Catalog</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Auto Code Engine</span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Sparkles className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-black text-purple-700 mt-2">Active</p>
          <span className="text-xs text-purple-700 font-medium">V2 Auto-Unique Generation</span>
        </div>
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
              placeholder="Search brands by name or code..."
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
                <th className="px-4 py-3.5">Brand Code</th>
                <th className="px-4 py-3.5">Description</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 font-medium">Loading brands...</td>
                </tr>
              ) : brands.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 font-medium">No brands found.</td>
                </tr>
              ) : (
                brands.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{b.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs">
                      {b.code ? (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 font-bold rounded border border-slate-200">
                          {b.code}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 max-w-xs truncate">
                      {(b as any).description || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {(b as any).status === 'inactive' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          Inactive
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Active
                        </span>
                      )}
                    </td>
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
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Samsung"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Brand Code *
                  </label>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    Auto Unique Code
                  </span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      setIsAutoCode(false);
                    }}
                    placeholder="e.g. BR-0006 or SAM"
                    className="w-full px-3 py-2 pr-32 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                  <div className="absolute right-1.5 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleRegenerateCode}
                      title="Generate next sequential code (BR-XXXX)"
                      className="px-2 py-1 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 border border-slate-200 rounded cursor-pointer transition-colors"
                    >
                      Sequential
                    </button>
                    {name.trim() && (
                      <button
                        type="button"
                        onClick={handleGenerateFromName}
                        title="Generate unique abbreviation code from name"
                        className="px-2 py-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded cursor-pointer transition-colors"
                      >
                        From Name
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Unique identifier auto-generated by the system. You can keep it or customize.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional brand description..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
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
