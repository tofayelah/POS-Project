import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  Plus,
  Search,
  Barcode as BarcodeIcon,
  Filter,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Layers,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import { Product, Category, Brand, ProductType, EntityStatus, ProductVariant } from '../../types/product';
import {
  getProducts,
  getCategories,
  getBrands,
  activateProduct,
  deactivateProduct,
  deleteProduct,
  lookupBarcode,
} from '../../api/products';
import { BarcodeModal } from '../../components/products/BarcodeModal';

import { formatCurrency } from '../../utils/currency';

export function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [brandId, setBrandId] = useState<string>('');
  const [productType, setProductType] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Barcode Lookup Quick Tool
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Barcode Modal
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedProductName, setSelectedProductName] = useState<string>('');
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [search, categoryId, brandId, productType, status, page]);

  const loadFilterOptions = async () => {
    try {
      const [catRes, brandRes] = await Promise.all([getCategories({ all: true }), getBrands({ all: true })]);
      setCategories(catRes.data || []);
      setBrands(brandRes.data || []);
    } catch (err) {
      console.error('Error loading filters', err);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProducts({
        search: search.trim() || undefined,
        category_id: categoryId ? Number(categoryId) : undefined,
        brand_id: brandId ? Number(brandId) : undefined,
        product_type: productType ? (productType as ProductType) : undefined,
        status: status ? (status as EntityStatus) : undefined,
        page,
        per_page: 10,
      });
      setProducts(res.data || []);
      setTotalPages(res.meta?.last_page || 1);
      setTotalCount(res.meta?.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (product: Product) => {
    try {
      if (product.status === 'active') {
        await deactivateProduct(product.id);
      } else {
        await activateProduct(product.id);
      }
      loadProducts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to toggle product status');
    }
  };

  const handleDeleteProduct = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete product '${name}'? This will soft-delete the catalog item and its variants.`)) {
      return;
    }
    try {
      await deleteProduct(id);
      loadProducts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete product');
    }
  };

  const handleBarcodeLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeSearch.trim()) return;
    setLookupError(null);
    setLookupResult(null);

    try {
      const res = await lookupBarcode(barcodeSearch.trim());
      setLookupResult(res.data);
    } catch (err: any) {
      setLookupError(err.response?.data?.message || `No active variant found matching barcode '${barcodeSearch}'`);
    }
  };

  const openBarcodeModal = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      setSelectedVariant(product.variants[0]);
      setSelectedProductName(product.name);
      setIsBarcodeModalOpen(true);
    }
  };

  const formatPriceRange = (product: Product) => {
    if (!product.variants || product.variants.length === 0) return '—';
    const prices = product.variants.map((v) => Number(v.selling_price));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) {
      return formatCurrency(min);
    }
    return `${formatCurrency(min)} - ${formatCurrency(max)}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Product Master</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Central catalog management for products, variant matrix SKUs, and barcodes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadProducts()}
            className="p-2 text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/products/new"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Product</span>
          </Link>
        </div>
      </div>

      {/* Barcode Quick Lookup Widget */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <BarcodeIcon className="w-4 h-4 text-blue-600" />
            <span>Instant Barcode Scanner / POS Verification</span>
          </div>
          <span className="text-[11px] text-slate-400">Verifies live barcode-to-SKU resolution</span>
        </div>
        <form onSubmit={handleBarcodeLookup} className="flex gap-2">
          <input
            type="text"
            value={barcodeSearch}
            onChange={(e) => setBarcodeSearch(e.target.value)}
            placeholder="Scan barcode or enter EAN/UPC (e.g. 8901234500018)..."
            className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
          <button
            type="submit"
            className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Lookup
          </button>
        </form>

        {lookupError && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{lookupError}</span>
          </div>
        )}

        {lookupResult && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-1">
            <div className="flex items-center justify-between font-semibold text-emerald-900">
              <span>Resolved: {lookupResult.variant?.product_name} — {lookupResult.variant?.variant_name}</span>
              <span className="font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">{lookupResult.barcode} ({lookupResult.barcode_type})</span>
            </div>
            <div className="text-slate-600 flex gap-4 text-[11px]">
              <span>SKU: <strong className="font-mono">{lookupResult.variant?.sku}</strong></span>
              <span>Selling Price: <strong>{formatCurrency(lookupResult.variant?.selling_price || 0)}</strong></span>
              <span>MRP: <strong>{formatCurrency(lookupResult.variant?.mrp || 0)}</strong></span>
              <span>Tax Rate: <strong>{lookupResult.variant?.tax_rate || 0}%</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search product name, code, SKU, or barcode..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div className="md:col-span-2">
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Brand Filter */}
          <div className="md:col-span-2">
            <select
              value={brandId}
              onChange={(e) => {
                setBrandId(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Product Type Filter */}
          <div className="md:col-span-2">
            <select
              value={productType}
              onChange={(e) => {
                setProductType(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="simple">Simple</option>
              <option value="variable">Variable</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading catalog items...</div>
        ) : error ? (
          <div className="p-6 text-center text-xs text-rose-600">{error}</div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Layers className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-medium text-slate-700">No products found</p>
            <p className="text-xs text-slate-400">Try adjusting your filters or click 'Create Product'</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-3 px-4 font-semibold">Product Name & Code</th>
                  <th className="py-3 px-4 font-semibold">Category & Brand</th>
                  <th className="py-3 px-3 font-semibold">Type</th>
                  <th className="py-3 px-3 font-semibold">Price Range</th>
                  <th className="py-3 px-3 font-semibold">Unit</th>
                  <th className="py-3 px-3 font-semibold text-center">Reorder Threshold</th>
                  <th className="py-3 px-3 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {p.product_code ? `Code: ${p.product_code}` : 'No Code'}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800">{p.category?.name || '—'}</div>
                      <div className="text-[11px] text-slate-400">{p.brand?.name || 'Unbranded'}</div>
                    </td>
                    <td className="py-3 px-3">
                      {p.product_type === 'variable' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                          Variable ({p.variants_count || p.variants?.length || 0} SKUs)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          Simple
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-900">{formatPriceRange(p)}</td>
                    <td className="py-3 px-3 text-slate-600">{p.unit?.short_code || p.unit?.name || 'pcs'}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-mono">
                        {p.reorder_level}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggleStatus(p)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors cursor-pointer"
                        style={{
                          backgroundColor: p.status === 'active' ? '#ecfdf5' : '#f1f5f9',
                          color: p.status === 'active' ? '#047857' : '#64748b',
                        }}
                      >
                        {p.status === 'active' ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-slate-400" />
                            <span>Inactive</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openBarcodeModal(p)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Manage Barcodes"
                        >
                          <BarcodeIcon className="w-4 h-4" />
                        </button>
                        <Link
                          to={`/products/${p.id}/edit`}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Catalog Item"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Total: <strong>{totalCount}</strong> products
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages || 1}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Barcode Manager Modal */}
      <BarcodeModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        variant={selectedVariant}
        productName={selectedProductName}
        onUpdated={loadProducts}
      />
    </div>
  );
}
