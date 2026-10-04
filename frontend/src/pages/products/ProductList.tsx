import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Plus,
  Search,
  Barcode as BarcodeIcon,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Power,
  ChevronLeft,
  ChevronRight,
  Package,
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
import { PageHeader } from '../../components/common/PageHeader';
import { TableContainer } from '../../components/common/TableContainer';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { BarcodeModal } from '../../components/products/BarcodeModal';
import { ProductDetailsModal } from '../../components/products/ProductDetailsModal';
import { formatCurrency } from '../../utils/format';
import { useLanguage } from '../../i18n';

export function ProductList() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  // State
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
  const [perPage] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Barcode Lookup Quick Tool
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Details Modal
  const [detailsProductId, setDetailsProductId] = useState<number | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Barcode Modal
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedProductName, setSelectedProductName] = useState<string>('');
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

  // Confirmation Modals State
  const [confirmStatusModal, setConfirmStatusModal] = useState<{
    isOpen: boolean;
    product: Product | null;
    isActivating: boolean;
  }>({
    isOpen: false,
    product: null,
    isActivating: false,
  });

  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    product: Product | null;
  }>({
    isOpen: false,
    product: null,
  });

  const [isActionPending, setIsActionPending] = useState(false);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      const [catRes, brandRes] = await Promise.all([
        getCategories({ all: true }),
        getBrands({ all: true }),
      ]);
      setCategories(catRes.data || []);
      setBrands(brandRes.data || []);
    } catch (err) {
      console.error('Error loading filters', err);
    }
  };

  const loadProducts = useCallback(async () => {
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
        per_page: perPage,
      });
      setProducts(res.data || []);
      setTotalPages(res.meta?.last_page || 1);
      setTotalCount(res.meta?.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, brandId, productType, status, page, perPage]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleOpenStatusConfirm = (product: Product) => {
    const isActivating = product.status !== 'active';
    setConfirmStatusModal({
      isOpen: true,
      product,
      isActivating,
    });
  };

  const handleExecuteStatusToggle = async () => {
    const { product, isActivating } = confirmStatusModal;
    if (!product) return;

    setIsActionPending(true);
    try {
      if (isActivating) {
        await activateProduct(product.id);
      } else {
        await deactivateProduct(product.id);
      }
      setConfirmStatusModal({ isOpen: false, product: null, isActivating: false });
      loadProducts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update product status');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleOpenDeleteConfirm = (product: Product) => {
    setConfirmDeleteModal({
      isOpen: true,
      product,
    });
  };

  const handleExecuteDelete = async () => {
    const { product } = confirmDeleteModal;
    if (!product) return;

    setIsActionPending(true);
    try {
      await deleteProduct(product.id);
      setConfirmDeleteModal({ isOpen: false, product: null });
      loadProducts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete product');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleBarcodeLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeSearch.trim()) return;
    setLookupError(null);
    setLookupResult(null);
    setIsLookingUp(true);

    try {
      const res = await lookupBarcode(barcodeSearch.trim());
      setLookupResult(res.data);
    } catch (err: any) {
      setLookupError(
        err.response?.data?.message ||
          t('products.lookupNotFound').replace('{barcode}', barcodeSearch.trim())
      );
    } finally {
      setIsLookingUp(false);
    }
  };

  const openBarcodeModal = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      setSelectedVariant(product.variants[0]);
      setSelectedProductName(product.name);
      setIsBarcodeModalOpen(true);
    }
  };

  const openDetailsModal = (productId: number) => {
    setDetailsProductId(productId);
    setIsDetailsOpen(true);
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

  const fromRecord = totalCount === 0 ? 0 : (page - 1) * perPage + 1;
  const toRecord = Math.min(page * perPage, totalCount);

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <PageHeader
        title={t('products.title')}
        subtitle={t('products.subtitle')}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadProducts()}
              className="p-2 text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer shadow-2xs"
              title={t('common.refresh')}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <Link
              to="/products/new"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('products.createProduct')}</span>
            </Link>
          </div>
        }
      />

      {/* Barcode Quick Lookup Widget */}
      <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <BarcodeIcon className="w-4 h-4 text-indigo-600" />
            <span>{t('products.barcodeLookupTitle')}</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            {t('products.barcodeLookupSubtitle')}
          </span>
        </div>
        <form onSubmit={handleBarcodeLookup} className="flex gap-2">
          <input
            type="text"
            value={barcodeSearch}
            onChange={(e) => setBarcodeSearch(e.target.value)}
            placeholder={t('products.barcodeLookupPlaceholder')}
            className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono transition-all"
          />
          <button
            type="submit"
            disabled={isLookingUp}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            {isLookingUp ? t('common.loading') : t('products.lookup')}
          </button>
        </form>

        {lookupError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{lookupError}</span>
          </div>
        )}

        {lookupResult && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between font-bold text-emerald-950 flex-wrap gap-2">
              <span>
                {t('products.lookupResolved')}: {lookupResult.variant?.product_name} — {lookupResult.variant?.variant_name}
              </span>
              <span className="font-mono text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                {lookupResult.barcode} ({lookupResult.barcode_type})
              </span>
            </div>
            <div className="text-slate-600 flex gap-4 text-[11px] flex-wrap font-medium">
              <span>
                SKU: <strong className="font-mono text-slate-800">{lookupResult.variant?.sku}</strong>
              </span>
              <span>
                {t('products.sellingPrice')}:{' '}
                <strong className="text-emerald-700 font-bold">
                  {formatCurrency(lookupResult.variant?.selling_price || 0)}
                </strong>
              </span>
              <span>
                {t('products.mrp')}:{' '}
                <strong className="text-slate-800 font-semibold">
                  {formatCurrency(lookupResult.variant?.mrp || 0)}
                </strong>
              </span>
              <span>
                {t('products.taxRate')}:{' '}
                <strong className="text-slate-800">{lookupResult.variant?.tax_rate || 0}%</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t('products.searchPlaceholder')}
              className="w-full pl-9.5 pr-3.5 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t('products.allCategories')}</option>
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
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t('products.allBrands')}</option>
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
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t('products.allTypes')}</option>
              <option value="simple">{t('products.typeSimple')}</option>
              <option value="variable">{t('products.typeVariable')}</option>
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
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t('products.allStatuses')}</option>
              <option value="active">{t('common.active')}</option>
              <option value="inactive">{t('common.inactive')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Table Container */}
      <TableContainer
        footerContent={
          <>
            <span>
              {t('products.showingRecords')
                .replace('{from}', String(fromRecord))
                .replace('{to}', String(toRecord))
                .replace('{total}', String(totalCount))}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>{t('common.previous')}</span>
              </button>
              <span className="font-bold text-slate-700 px-1">
                {page} / {totalPages || 1}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span>{t('common.next')}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        }
      >
        {loading ? (
          <LoadingState message={t('common.loading')} />
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600 font-medium">{error}</div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title={t('products.noProductsFound')}
            description={t('products.noProductsFoundDesc')}
            action={
              <Link
                to="/products/new"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t('products.createProduct')}</span>
              </Link>
            }
          />
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600">
                <th className="py-3 px-4 font-bold">{t('products.productName')} & {t('products.productCode')}</th>
                <th className="py-3 px-4 font-bold">{t('products.classification')}</th>
                <th className="py-3 px-3 font-bold">{t('common.type')}</th>
                <th className="py-3 px-3 font-bold">{t('products.pricingRange')}</th>
                <th className="py-3 px-3 font-bold">{t('products.unit')}</th>
                <th className="py-3 px-3 font-bold text-center">{t('products.reorderThreshold')}</th>
                <th className="py-3 px-3 font-bold text-center">{t('common.status')}</th>
                <th className="py-3 px-4 font-bold text-right">{t('products.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-bold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer" onClick={() => openDetailsModal(p.id)}>
                        {p.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {p.product_code ? `Code: ${p.product_code}` : 'No Code'}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{p.category?.name || '—'}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {p.brand?.name || t('products.unbranded')}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    {p.product_type === 'variable' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        {t('products.typeVariable')} ({p.variants_count || p.variants?.length || 0})
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {t('products.typeSimple')}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900">{formatPriceRange(p)}</td>
                  <td className="py-3 px-3 text-slate-600 font-medium">
                    {p.unit?.short_code || p.unit?.name || 'pcs'}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-mono font-bold">
                      {p.reorder_level}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => handleOpenStatusConfirm(p)}
                      title={`Toggle status (currently ${p.status})`}
                      className="cursor-pointer"
                    >
                      <StatusBadge status={p.status} />
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openDetailsModal(p.id)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title={t('products.viewDetails')}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openBarcodeModal(p)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title={t('products.manageBarcodes')}
                      >
                        <BarcodeIcon className="w-4 h-4" />
                      </button>
                      <Link
                        to={`/products/${p.id}/edit`}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        title={t('products.edit')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleOpenStatusConfirm(p)}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        title={p.status === 'active' ? t('products.deactivate') : t('products.activate')}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteConfirm(p)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title={t('products.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableContainer>

      {/* Product Details Modal */}
      <ProductDetailsModal
        isOpen={isDetailsOpen}
        productId={detailsProductId}
        onClose={() => setIsDetailsOpen(false)}
        onEdit={(id) => navigate(`/products/${id}/edit`)}
      />

      {/* Barcode Manager Modal */}
      <BarcodeModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        variant={selectedVariant}
        productName={selectedProductName}
        onUpdated={loadProducts}
      />

      {/* Status Toggle Confirmation Modal */}
      {confirmStatusModal.isOpen && confirmStatusModal.product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    confirmStatusModal.isActivating
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      : 'bg-amber-50 text-amber-600 border border-amber-100'
                  }`}
                >
                  {confirmStatusModal.isActivating ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Power className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {confirmStatusModal.isActivating
                      ? t('products.activateConfirm')
                      : t('products.deactivateConfirm')}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {confirmStatusModal.isActivating
                      ? t('products.activateConfirmDesc').replace(
                          '{name}',
                          confirmStatusModal.product.name
                        )
                      : t('products.deactivateConfirmDesc').replace(
                          '{name}',
                          confirmStatusModal.product.name
                        )}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isActionPending}
                  onClick={() =>
                    setConfirmStatusModal({ isOpen: false, product: null, isActivating: false })
                  }
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  disabled={isActionPending}
                  onClick={handleExecuteStatusToggle}
                  className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors cursor-pointer ${
                    confirmStatusModal.isActivating
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {isActionPending
                    ? t('common.loading')
                    : confirmStatusModal.isActivating
                    ? t('products.activate')
                    : t('products.deactivate')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteModal.isOpen && confirmDeleteModal.product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {t('products.deleteConfirm')}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('products.deleteConfirmDesc').replace(
                      '{name}',
                      confirmDeleteModal.product.name
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isActionPending}
                  onClick={() => setConfirmDeleteModal({ isOpen: false, product: null })}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  disabled={isActionPending}
                  onClick={handleExecuteDelete}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isActionPending ? t('common.loading') : t('products.delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
