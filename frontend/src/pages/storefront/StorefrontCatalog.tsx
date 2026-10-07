import React, { useEffect, useState } from 'react';
import { Search, Filter, ShoppingBag, ArrowLeft, RefreshCw, Star } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { storefrontApi } from '../../api/storefront';
import { CatalogProduct, EcommerceCategory } from '../../types/ecommerce';

export function StorefrontCatalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<EcommerceCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const search = searchParams.get('search') || '';
  const selectedCat = searchParams.get('category_id') ? Number(searchParams.get('category_id')) : undefined;

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await storefrontApi.getCategories();
        setCategories(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const res = await storefrontApi.getProducts('MAIN', {
          search: search || undefined,
          category_id: selectedCat,
          page,
          per_page: 12,
        });
        setProducts(res.data.data);
        setTotal(res.data.total);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, [search, selectedCat, page]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/store" className="flex items-center gap-2 text-slate-700 hover:text-emerald-600 font-semibold text-sm">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <div className="font-bold text-slate-800">Product Catalog</div>
          <Link to="/store/cart" className="p-2 rounded-full bg-emerald-50 text-emerald-700">
            <ShoppingBag className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full flex flex-col md:flex-row gap-6">
        {/* Category Sidebar */}
        <aside className="w-full md:w-64 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Categories</h3>
            <div className="space-y-1">
              <button
                onClick={() => {
                  searchParams.delete('category_id');
                  setSearchParams(searchParams);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  !selectedCat ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                All Products
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    searchParams.set('category_id', String(c.id));
                    setSearchParams(searchParams);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    selectedCat === c.id ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <section className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Showing {total} available products</span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-2">
              <div className="font-bold text-slate-700">No products found</div>
              <p className="text-xs text-slate-400">Try adjusting your search or category filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
              {products.map((p) => (
                <Link
                  key={p.id}
                  to={`/store/products/${p.slug}`}
                  className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-all flex flex-col"
                >
                  <div className="aspect-square bg-slate-100 flex items-center justify-center relative overflow-hidden">
                    <div className="text-3xl font-extrabold text-slate-300">
                      {p.name.charAt(0)}
                    </div>
                    {p.badge && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white uppercase">
                        {p.badge}
                      </span>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 uppercase font-semibold">{p.category_name || 'Item'}</span>
                      <h3 className="font-semibold text-slate-800 text-sm line-clamp-1 group-hover:text-emerald-600 transition-colors">
                        {p.name}
                      </h3>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-extrabold text-base text-slate-900">
                        ৳{Number(p.selling_price).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs font-bold text-emerald-600 group-hover:underline">
                        Details
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
export default StorefrontCatalog;
