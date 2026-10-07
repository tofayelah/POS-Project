import React, { useEffect, useState } from 'react';
import { Tag, Search, CheckCircle, XCircle, RefreshCw, Eye, EyeOff, Star, Sparkles } from 'lucide-react';
import { ecommerceApi } from '../../api/ecommerce';
import { CatalogProduct } from '../../types/ecommerce';
import { useLanguage } from '../../i18n';

export function CatalogManagement() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const res = await ecommerceApi.getCatalog({ search, page });
      setProducts(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Failed to load catalog', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadCatalog();
  };

  const handleTogglePublish = async (p: CatalogProduct) => {
    try {
      setUpdatingId(p.id);
      await ecommerceApi.updateCatalogPublishing(p.id, {
        is_published: !p.is_published,
        visibility: p.visibility || 'BOTH',
      });
      setProducts(products.map((item) => (item.id === p.id ? { ...item, is_published: !item.is_published } : item)));
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleBadge = async (p: CatalogProduct, field: 'featured' | 'new_arrival' | 'best_seller') => {
    try {
      setUpdatingId(p.id);
      const updatedValue = !p[field];
      await ecommerceApi.updateCatalogPublishing(p.id, {
        is_published: p.is_published,
        [field]: updatedValue,
      });
      setProducts(products.map((item) => (item.id === p.id ? { ...item, [field]: updatedValue } : item)));
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Storefront Catalog Publishing</h1>
          <p className="text-sm text-slate-500">Publish products to the online storefront and highlight featured items</p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 w-64"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900"
          >
            Search
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Price (৳)</th>
                <th className="py-3 px-4 text-center">Visibility</th>
                <th className="py-3 px-4 text-center">Badges & Highlights</th>
                <th className="py-3 px-4 text-center">Published</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading catalog...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No products found
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{p.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{p.slug}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{p.category_name || 'General'}</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-800">
                      ৳{Number(p.selling_price).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-slate-100 text-slate-700">
                        {p.visibility || 'BOTH'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleToggleBadge(p, 'featured')}
                          disabled={updatingId === p.id}
                          title="Featured"
                          className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                            p.featured
                              ? 'bg-amber-50 border-amber-300 text-amber-700 font-bold'
                              : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleBadge(p, 'new_arrival')}
                          disabled={updatingId === p.id}
                          title="New Arrival"
                          className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                            p.new_arrival
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold'
                              : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleTogglePublish(p)}
                        disabled={updatingId === p.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                          p.is_published
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {p.is_published ? (
                          <>
                            <Eye className="w-3.5 h-3.5" /> Published
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" /> Draft
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
export default CatalogManagement;
