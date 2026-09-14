import React, { useState, useEffect } from 'react';
import { Plus, Search, FolderTree, Edit2, Trash2, X, Check, AlertCircle, ChevronRight, CornerDownRight } from 'lucide-react';
import { Category } from '../../types/product';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../api/products';

export function CategoryList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState('');
  const [formParentId, setFormParentId] = useState<number | ''>('');
  const [formDescription, setFormDescription] = useState('');
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, [search]);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCategories({ search: search.trim() || undefined, all: true });
      setCategories(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (cat?: Category) => {
    if (cat) {
      setEditingCategory(cat);
      setFormName(cat.name);
      setFormParentId(cat.parent_id || '');
      setFormDescription(cat.description || '');
      setFormSortOrder(cat.sort_order || 0);
    } else {
      setEditingCategory(null);
      setFormName('');
      setFormParentId('');
      setFormDescription('');
      setFormSortOrder(categories.length + 1);
    }
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setModalError('Category Name is required.');
      return;
    }
    setSaving(true);
    setModalError(null);

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: formName.trim(),
          parent_id: formParentId ? Number(formParentId) : null,
          description: formDescription.trim() || null,
          sort_order: formSortOrder,
        });
      } else {
        await createCategory({
          company_id: 1,
          name: formName.trim(),
          parent_id: formParentId ? Number(formParentId) : null,
          description: formDescription.trim() || null,
          sort_order: formSortOrder,
          status: 'active',
        });
      }
      setIsModalOpen(false);
      loadCategories();
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to save category.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!confirm(`Are you sure you want to delete category '${cat.name}'?`)) return;
    try {
      await deleteCategory(cat.id);
      loadCategories();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete category');
    }
  };

  // Group into root and child categories for clear hierarchical display
  const rootCategories = categories.filter((c) => !c.parent_id);
  const getSubcategories = (parentId: number) => categories.filter((c) => c.parent_id === parentId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Product Categories</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize catalog items into hierarchical multi-level categories
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Category</span>
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
            placeholder="Search categories by name..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Hierarchy Card View */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading categories...</div>
        ) : error ? (
          <div className="p-6 text-center text-xs text-rose-600">{error}</div>
        ) : categories.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">No categories found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rootCategories.map((root) => {
              const children = getSubcategories(root.id);
              return (
                <div key={root.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                  {/* Root Category Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FolderTree className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-sm">{root.name}</span>
                          <span className="text-[11px] font-mono text-slate-400">/{root.slug}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 font-medium rounded-full">
                            {children.length} Subcategories
                          </span>
                          <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                            {root.products_count || 0} Products
                          </span>
                        </div>
                        {root.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{root.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenModal(root)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit Category"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(root)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Subcategories */}
                  {children.length > 0 && (
                    <div className="mt-3 pl-6 space-y-2 border-l-2 border-slate-100 ml-2">
                      {children.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between p-2.5 bg-slate-50/80 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-800 text-xs">{sub.name}</span>
                                <span className="text-[10px] font-mono text-slate-400">/{sub.slug}</span>
                                <span className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded">
                                  {sub.products_count || 0} Products
                                </span>
                              </div>
                              {sub.description && (
                                <p className="text-[11px] text-slate-500">{sub.description}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenModal(sub)}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white rounded transition-colors cursor-pointer"
                              title="Edit Subcategory"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(sub)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded transition-colors cursor-pointer"
                              title="Delete Subcategory"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-base font-semibold text-slate-800">
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Category Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Undergarments, Bra, Baby Care..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Parent Category</label>
                <select
                  value={formParentId}
                  onChange={(e) => setFormParentId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">None (Top-Level Category)</option>
                  {categories
                    .filter((c) => !editingCategory || c.id !== editingCategory.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.parent ? `— ${c.name}` : c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Category purpose or styling details..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Display Sort Order</label>
                <input
                  type="number"
                  value={formSortOrder}
                  onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                  {saving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
