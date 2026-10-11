import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Filter, RefreshCw, Eye, Edit, CheckCircle, XCircle, ChevronLeft, ChevronRight, AlertCircle, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { getProducts, getCategories, getBrands, activateProduct, deactivateProduct, deleteProduct } from '../../api/products';
import { Product, Category, Brand } from '../../types/product';

export const ProductList: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadMasterData();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [page, searchTerm, selectedCategory, selectedBrand, selectedType, selectedStatus]);

  const loadMasterData = async () => {
    try {
      const [catRes, brandRes] = await Promise.all([
        getCategories({ all: true }),
        getBrands({ all: true }),
      ]);
      setCategories(catRes.data || []);
      setBrands(brandRes.data || []);
    } catch (err) {
      console.error('Failed to load master filters', err);
    }
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getProducts({
        search: searchTerm || undefined,
        category_id: selectedCategory || undefined,
        brand_id: selectedBrand || undefined,
        product_type: selectedType || undefined,
        status: selectedStatus || undefined,
        page,
        per_page: 15,
      });

      if (res.success) {
        setProducts(res.data || []);
        if (res.meta) {
          setPage(res.meta.current_page || 1);
          setLastPage(res.meta.last_page || 1);
          setTotal(res.meta.total || 0);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load product catalog.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (product: Product) => {
    try {
      if (product.status === 'active') {
        await deactivateProduct(Number(product.id));
        setActionSuccess(`Product "${product.name}" deactivated.`);
      } else {
        await activateProduct(Number(product.id));
        setActionSuccess(`Product "${product.name}" activated.`);
      }
      fetchProducts();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Are you sure you want to soft-delete "${product.name}"?`)) return;
    try {
      await deleteProduct(Number(product.id));
      setActionSuccess(`Product "${product.name}" deleted.`);
      fetchProducts();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete product.');
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedBrand('');
    setSelectedType('');
    setSelectedStatus('');
    setPage(1);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Package className="w-7 h-7 text-indigo-700 shrink-0" />
            Product Catalog Master
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Central Product Information Management (PIM), SKUs, barcodes, pricing, and variants
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/products/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-sm font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add New Product
          </Link>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-sm font-medium flex items-center gap-2 shadow-2xs">
          <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-sm font-medium flex items-center gap-2 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-rose-700 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters Bar & Panel */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, code, SKU or barcode..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-white border border-slate-300 text-slate-900 font-medium rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="" className="text-slate-900">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="text-slate-900">{c.name}</option>
            ))}
          </select>

          {/* Brand Filter */}
          <select
            value={selectedBrand}
            onChange={(e) => {
              setSelectedBrand(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-white border border-slate-300 text-slate-900 font-medium rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="" className="text-slate-900">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id} className="text-slate-900">{b.name}</option>
            ))}
          </select>

          {/* Product Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-white border border-slate-300 text-slate-900 font-medium rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="" className="text-slate-900">All Product Types</option>
            <option value="simple" className="text-slate-900">Simple</option>
            <option value="variable" className="text-slate-900">Variable</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-white border border-slate-300 text-slate-900 font-medium rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="" className="text-slate-900">All Statuses</option>
            <option value="active" className="text-slate-900">Active</option>
            <option value="inactive" className="text-slate-900">Inactive</option>
          </select>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-xs font-semibold text-slate-700">
          <div>
            Showing <span className="font-bold text-slate-900">{products.length}</span> of <span className="font-bold text-slate-900">{total}</span> items
          </div>
          <div className="flex items-center gap-2">
            {(searchTerm || selectedCategory || selectedBrand || selectedType || selectedStatus) && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-200 font-medium text-xs cursor-pointer transition-colors"
              >
                Reset Filters
              </button>
            )}
            <button
              onClick={() => fetchProducts()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 hover:bg-slate-100 font-medium text-xs cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-700 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Product Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-sm text-slate-800">
            <thead className="bg-slate-100 text-slate-800 uppercase text-xs font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">Product Info</th>
                <th className="px-4 py-3.5">Category / Brand</th>
                <th className="px-4 py-3.5">Type</th>
                <th className="px-4 py-3.5">SKU(s) & Barcodes</th>
                <th className="px-4 py-3.5 text-right">Price Range (৳)</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-600">
                    <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3 text-indigo-700" />
                    <span className="font-semibold text-slate-800">Loading catalog items...</span>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center bg-slate-50/50">
                    <div className="max-w-md mx-auto space-y-2">
                      <Package className="w-10 h-10 text-slate-400 mx-auto" />
                      <h3 className="text-base font-bold text-slate-800">No products found matching the search criteria.</h3>
                      <p className="text-xs font-medium text-slate-600">
                        Try resetting your search filters or click 'Add New Product' to create a new master record.
                      </p>
                      {(searchTerm || selectedCategory || selectedBrand || selectedType) && (
                        <button
                          onClick={handleResetFilters}
                          className="mt-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold inline-block cursor-pointer transition-colors"
                        >
                          Clear All Search Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const variants = p.variants || [];
                  const primaryVariant = variants[0];
                  const minPrice = variants.length > 0
                    ? Math.min(...variants.map((v) => Number(v.selling_price || 0)))
                    : 0;
                  const maxPrice = variants.length > 0
                    ? Math.max(...variants.map((v) => Number(v.selling_price || 0)))
                    : 0;

                  const priceDisplay = minPrice === maxPrice
                    ? `৳${minPrice.toFixed(2)}`
                    : `৳${minPrice.toFixed(2)} - ৳${maxPrice.toFixed(2)}`;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-indigo-100 border border-indigo-200 text-indigo-800 flex items-center justify-center font-bold text-sm shrink-0">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                            <div className="text-xs text-slate-600 font-mono font-medium">Code: {p.product_code || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <div className="font-bold text-slate-900">{p.category?.name || 'General'}</div>
                        <div className="text-slate-600 font-medium">{p.brand?.name || 'No Brand'}</div>
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <span className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                          p.product_type === 'variable'
                            ? 'bg-purple-100 text-purple-900 border border-purple-200'
                            : 'bg-blue-100 text-blue-900 border border-blue-200'
                        }`}>
                          {p.product_type === 'variable' ? `${variants.length} Variants` : 'Simple'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono">
                        {primaryVariant ? (
                          <div>
                            <div className="font-bold text-slate-900">{primaryVariant.sku}</div>
                            {primaryVariant.barcodes && primaryVariant.barcodes.length > 0 && (
                              <div className="text-slate-600 text-[11px] font-medium">BC: {primaryVariant.barcodes[0].barcode}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 font-sans">No SKU</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900 font-mono text-sm">
                        {priceDisplay}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => handleToggleStatus(p)}
                          className={`px-3 py-1 text-xs rounded-full font-bold inline-flex items-center gap-1 cursor-pointer transition-colors border ${
                            p.status === 'active'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {p.status === 'active' ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-700" /> Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-slate-500" /> Inactive
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => navigate(`/products/item-information?id=${p.id}`)}
                          className="p-1.5 text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-200 cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/products/${p.id}/edit`)}
                          className="p-1.5 text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200 cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="p-1.5 text-slate-700 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {lastPage > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg text-slate-800 disabled:opacity-50 hover:bg-slate-100 cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-xs font-semibold text-slate-700">
              Page <span className="font-bold text-slate-900">{page}</span> of <span className="font-bold text-slate-900">{lastPage}</span>
            </span>
            <button
              disabled={page >= lastPage}
              onClick={() => setPage(page + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg text-slate-800 disabled:opacity-50 hover:bg-slate-100 cursor-pointer transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
