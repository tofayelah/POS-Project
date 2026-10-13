import React, { useState, useEffect } from 'react';
import { Layers, Plus, Search, RefreshCw, Edit, Trash2, CheckCircle, AlertCircle, X, FolderTree, GitFork, Sparkles, Hash } from 'lucide-react';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  generateNextCategoryCode,
  generateCategoryCodeFromName,
  getNextCategoryCode,
} from '../../api/products';
import { Category } from '../../types/product';

export const CategoryList: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allParents, setAllParents] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isAutoCode, setIsAutoCode] = useState(true);
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<number | ''>('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, [searchTerm]);

  const fetchCategories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getCategories({ search: searchTerm || undefined });
      const items = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];
      setCategories(items);
      const parentRes = await getCategories({ all: true });
      const parentItems = Array.isArray(parentRes?.data)
        ? parentRes.data
        : Array.isArray(parentRes)
        ? parentRes
        : [];
      setAllParents(parentItems);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load categories.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = async (cat?: Category) => {
    if (cat) {
      setEditingCategory(cat);
      setName(cat.name || '');
      setCode(cat.code || (cat as any).slug || '');
      setDescription((cat as any).description || '');
      setParentId(cat.parent_id ? Number(cat.parent_id) : '');
      setStatus((cat as any).status || 'active');
      setIsAutoCode(false);
    } else {
      setEditingCategory(null);
      setName('');
      setDescription('');
      setParentId('');
      setStatus('active');
      setIsAutoCode(true);

      // System Auto-generates unique sequential category code
      const autoCode = generateNextCategoryCode(categories);
      setCode(autoCode);

      // Attempt async server synchronization for next available code
      try {
        const serverCode = await getNextCategoryCode(categories);
        if (serverCode) {
          setCode(serverCode);
        }
      } catch {}
    }
    setIsModalOpen(true);
  };

  const handleRegenerateCode = () => {
    const nextSeq = generateNextCategoryCode(categories);
    setCode(nextSeq);
    setIsAutoCode(true);
  };

  const handleGenerateFromName = () => {
    if (name.trim()) {
      const nameCode = generateCategoryCodeFromName(name, categories);
      setCode(nameCode);
      setIsAutoCode(true);
    } else {
      handleRegenerateCode();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      // Ensure code is always uniquely filled
      let finalCode = code.trim();
      if (!finalCode) {
        finalCode = generateNextCategoryCode(categories);
      }

      const payload = {
        name: name.trim(),
        code: finalCode,
        description: description.trim() || undefined,
        parent_id: parentId ? Number(parentId) : null,
        status,
      };

      if (editingCategory) {
        await updateCategory(Number(editingCategory.id), payload);
        setSuccessMessage(`Category "${name}" (Code: ${finalCode}) updated successfully.`);
      } else {
        await createCategory(payload);
        setSuccessMessage(`Category "${name}" (Code: ${finalCode}) created successfully.`);
      }

      setIsModalOpen(false);
      await fetchCategories();
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save category.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!window.confirm(`Are you sure you want to delete or deactivate category "${cat.name}"?`)) return;
    try {
      await deleteCategory(Number(cat.id));
      setSuccessMessage(`Category "${cat.name}" processed.`);
      await fetchCategories();
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete category.');
    }
  };

  const totalCount = categories.length;
  const rootCount = categories.filter((c: any) => !c.parent_id).length;
  const subCount = categories.filter((c: any) => !!c.parent_id).length;
  const activeCount = categories.filter((c: any) => c.status === 'active' || !c.status).length;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-indigo-600 shrink-0" />
            Product Category Hierarchy
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">Organize parent-child catalog hierarchy and tax defaults</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-xs cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Categories</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Layers className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{totalCount}</p>
          <span className="text-xs text-slate-500 font-medium">Catalog structure nodes</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Root Categories</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FolderTree className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{rootCount}</p>
          <span className="text-xs text-slate-500 font-medium">Top-level categories</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Subcategories</span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-lg"><GitFork className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{subCount}</p>
          <span className="text-xs text-slate-500 font-medium">Nested subcategories</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Status</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{activeCount}</p>
          <span className="text-xs text-emerald-700 font-semibold">Active in POS & Catalog</span>
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
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
            />
          </div>
          <button
            onClick={() => fetchCategories()}
            className="p-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors self-end sm:self-auto cursor-pointer"
            title="Refresh categories"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-100 uppercase text-xs font-bold text-slate-800 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">Category Name</th>
                <th className="px-4 py-3.5">Code / Slug</th>
                <th className="px-4 py-3.5">Parent Category</th>
                <th className="px-4 py-3.5">Products Count</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">Loading categories...</td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">No categories found.</td>
                </tr>
              ) : (
                categories.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      {c.name}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 text-indigo-700 font-mono text-xs font-bold border border-slate-200">
                        {c.code || c.slug || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-700 font-medium">
                      {c.parent ? c.parent.name : <span className="text-slate-400 italic">Root Category</span>}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900">{c.products_count || 0} Products</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        c.status === 'active' || !c.status ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {c.status || 'active'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleOpenModal(c)}
                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                        title="Edit category"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="Delete category"
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

      {/* Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Baby Care"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-indigo-600" />
                    Category Code * (Unique System Code)
                  </label>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Sparkles className="w-3 h-3 text-indigo-500" />
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
                    placeholder="e.g. CAT-0008"
                    className="w-full px-3 py-2 pr-32 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                  <div className="absolute right-1.5 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleRegenerateCode}
                      title="Generate next sequential code (CAT-XXXX)"
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
                  Parent Category (Optional)
                </label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="">None (Top Level Root Category)</option>
                  {allParents
                    .filter((p) => !editingCategory || Number(p.id) !== Number(editingCategory.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
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
                  placeholder="Optional category description..."
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
                  {isSaving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
