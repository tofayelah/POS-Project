import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router';
import {
  SlidersHorizontal,
  Package,
  Warehouse as WarehouseIcon,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  Layers,
  History,
  X,
  Search,
  Send,
  Boxes,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { TableContainer } from '../../components/common/TableContainer';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import {
  adjustStock,
  recordDamageLoss,
  getInventory,
  getWarehouses,
  getStorageLocations,
} from '../../api/inventory';
import { getProducts } from '../../api/products';
import type { Warehouse, StorageLocation, InventoryItem } from '../../types/inventory';
import type { Product, ProductVariant } from '../../types/product';
import { getActiveTenantId } from '../../api/organization';
import { formatCurrency, formatNumber } from '../../utils/format';
import { useLanguage } from '../../i18n';

type AdjustmentActionType = 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'DAMAGE' | 'LOSS';

interface AdjustmentFormState {
  warehouseId: string;
  productId: string;
  productVariantId: string;
  actionType: AdjustmentActionType;
  quantity: string;
  reason: string;
  notes: string;
  storageLocationId: string;
}

export function StockAdjustments() {
  const { t } = useLanguage();

  // Reference Data State
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingReferences, setIsLoadingReferences] = useState<boolean>(true);

  // Form State
  const [formData, setFormData] = useState<AdjustmentFormState>({
    warehouseId: '',
    productId: '',
    productVariantId: '',
    actionType: 'ADJUSTMENT_IN',
    quantity: '',
    reason: '',
    notes: '',
    storageLocationId: '',
  });

  // Selected Entities
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [currentAvailableStock, setCurrentAvailableStock] = useState<number | null>(null);
  const [isLoadingStock, setIsLoadingStock] = useState<boolean>(false);

  // UI Flow State
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Decimal formatting helper
  const formatDecimalQty = (val: string | number | undefined | null): string => {
    if (val === null || val === undefined || val === '') return '0.000';
    const num = Number(val);
    if (isNaN(num)) return String(val);
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  };

  // Initial reference data loading
  useEffect(() => {
    let isMounted = true;
    async function loadInitialData() {
      setIsLoadingReferences(true);
      try {
        const [warehouseRes, productRes] = await Promise.all([
          getWarehouses(),
          getProducts({ per_page: 100 }),
        ]);

        if (isMounted) {
          const whList = warehouseRes?.data || (Array.isArray(warehouseRes) ? warehouseRes : []);
          setWarehouses(whList);

          const prodList = productRes?.data?.data || productRes?.data || (Array.isArray(productRes) ? productRes : []);
          setProducts(prodList);
        }
      } catch (err) {
        console.error('Failed to load initial adjustment reference data:', err);
      } finally {
        if (isMounted) setIsLoadingReferences(false);
      }
    }

    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load storage locations when warehouse changes
  useEffect(() => {
    let isMounted = true;
    async function loadLocations() {
      if (!formData.warehouseId) {
        setStorageLocations([]);
        return;
      }
      try {
        const res = await getStorageLocations({ warehouse_id: formData.warehouseId });
        const locs = res?.data || (Array.isArray(res) ? res : []);
        if (isMounted) setStorageLocations(locs);
      } catch (err) {
        console.error('Failed to load storage locations:', err);
        if (isMounted) setStorageLocations([]);
      }
    }

    loadLocations();
    return () => {
      isMounted = false;
    };
  }, [formData.warehouseId]);

  // Load authoritative current stock when warehouse and variant are both selected
  const fetchCurrentStock = useCallback(async (warehouseId: string, variantId: string) => {
    if (!warehouseId || !variantId) {
      setCurrentAvailableStock(null);
      return;
    }

    setIsLoadingStock(true);
    try {
      const response = await getInventory({
        warehouse_id: warehouseId,
        product_variant_id: variantId,
      });

      const items: InventoryItem[] = response?.data?.data || response?.data || (Array.isArray(response) ? response : []);
      if (items.length > 0) {
        const matched = items[0];
        const avail = Number(matched.available_quantity ?? matched.quantity ?? 0);
        setCurrentAvailableStock(avail);
      } else {
        // No prior stock record in this warehouse => 0
        setCurrentAvailableStock(0);
      }
    } catch (err) {
      console.error('Failed to fetch authoritative stock level:', err);
      setCurrentAvailableStock(null);
    } finally {
      setIsLoadingStock(false);
    }
  }, []);

  useEffect(() => {
    if (formData.warehouseId && formData.productVariantId) {
      fetchCurrentStock(formData.warehouseId, formData.productVariantId);
    } else {
      setCurrentAvailableStock(null);
    }
  }, [formData.warehouseId, formData.productVariantId, fetchCurrentStock]);

  // Handle Product Selection
  const handleProductChange = (productId: string) => {
    const prod = products.find((p) => String(p.id) === String(productId)) || null;
    setSelectedProduct(prod);

    // Auto-select first variant if variable or simple
    if (prod && prod.variants && prod.variants.length > 0) {
      const firstVar = prod.variants[0];
      setSelectedVariant(firstVar);
      setFormData((prev) => ({
        ...prev,
        productId,
        productVariantId: firstVar.id ? String(firstVar.id) : '',
      }));
    } else {
      setSelectedVariant(null);
      setFormData((prev) => ({
        ...prev,
        productId,
        productVariantId: '',
      }));
    }
    setFieldErrors((prev) => ({ ...prev, productId: '', productVariantId: '' }));
  };

  // Handle Variant Selection
  const handleVariantChange = (variantId: string) => {
    if (!selectedProduct || !selectedProduct.variants) return;
    const variant = selectedProduct.variants.find((v) => String(v.id) === String(variantId)) || null;
    setSelectedVariant(variant);
    setFormData((prev) => ({ ...prev, productVariantId: variantId }));
    setFieldErrors((prev) => ({ ...prev, productVariantId: '' }));
  };

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.warehouseId) {
      errors.warehouseId = t('inventory.warehouseRequired', 'Please select a warehouse.');
    }
    if (!formData.productId) {
      errors.productId = t('inventory.productRequired', 'Please select a product.');
    }
    if (!formData.productVariantId) {
      errors.productVariantId = t('inventory.productRequired', 'Please select a product variant.');
    }

    const numQty = parseFloat(formData.quantity);
    if (isNaN(numQty) || numQty <= 0) {
      errors.quantity = t('inventory.qtyPositive', 'Quantity must be greater than 0.');
    } else {
      // Check unit decimal rule if unit decimal_allowed is defined
      const unit = selectedProduct?.unit;
      if (unit && !unit.decimal_allowed && !Number.isInteger(numQty)) {
        errors.quantity = t(
          'inventory.decimalNotAllowed',
          'This unit ({unit}) does not allow fractional quantities. Please enter a whole number.',
          { unit: unit.short_code || unit.name }
        );
      }

      // Check stock sufficiency for reductions
      const isReduction = formData.actionType !== 'ADJUSTMENT_IN';
      if (isReduction && currentAvailableStock !== null && numQty > currentAvailableStock) {
        errors.quantity = t(
          'inventory.insufficientStock',
          'Adjustment quantity cannot exceed available stock ({avail}).',
          { avail: formatDecimalQty(currentAvailableStock) }
        );
      }
    }

    if (!formData.reason || !formData.reason.trim()) {
      errors.reason = t('inventory.reasonRequired', 'Reason is required for stock adjustment.');
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Open confirmation modal
  const handleInitiateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccessMessage(null);

    if (validateForm()) {
      setShowConfirmModal(true);
    }
  };

  // Execute Submission
  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setServerError(null);

    const companyId = getActiveTenantId();
    const qty = parseFloat(formData.quantity);
    const whId = parseInt(formData.warehouseId, 10);
    const varId = parseInt(formData.productVariantId, 10);
    const locId = formData.storageLocationId ? parseInt(formData.storageLocationId, 10) : null;

    try {
      if (formData.actionType === 'ADJUSTMENT_IN') {
        await adjustStock({
          company_id: companyId,
          warehouse_id: whId,
          product_variant_id: varId,
          type: 'add',
          quantity: qty,
          reason: formData.reason.trim(),
          notes: formData.notes?.trim() || undefined,
          storage_location_id: locId,
        });
      } else if (formData.actionType === 'ADJUSTMENT_OUT') {
        await adjustStock({
          company_id: companyId,
          warehouse_id: whId,
          product_variant_id: varId,
          type: 'subtract',
          quantity: qty,
          reason: formData.reason.trim(),
          notes: formData.notes?.trim() || undefined,
          storage_location_id: locId,
        });
      } else if (formData.actionType === 'DAMAGE') {
        await recordDamageLoss({
          company_id: companyId,
          warehouse_id: whId,
          product_variant_id: varId,
          type: 'damage',
          quantity: qty,
          reason: formData.reason.trim(),
          notes: formData.notes?.trim() || undefined,
          storage_location_id: locId,
        });
      } else if (formData.actionType === 'LOSS') {
        await recordDamageLoss({
          company_id: companyId,
          warehouse_id: whId,
          product_variant_id: varId,
          type: 'loss',
          quantity: qty,
          reason: formData.reason.trim(),
          notes: formData.notes?.trim() || undefined,
          storage_location_id: locId,
        });
      }

      // Success
      setSuccessMessage(t('inventory.adjustmentSuccess', 'Stock adjustment recorded successfully.'));
      setShowConfirmModal(false);

      // Refresh authoritative stock
      fetchCurrentStock(formData.warehouseId, formData.productVariantId);

      // Reset transaction inputs
      setFormData((prev) => ({
        ...prev,
        quantity: '',
        reason: '',
        notes: '',
      }));
    } catch (err: unknown) {
      console.error('Stock adjustment submission failed:', err);
      const apiErr = err as {
        response?: {
          status?: number;
          data?: {
            message?: string;
            errors?: Record<string, string[]>;
          };
        };
        message?: string;
      };

      if (apiErr.response?.status === 403) {
        setServerError('Unauthorized: You do not have permission to adjust inventory in this company.');
      } else if (apiErr.response?.status === 409) {
        setServerError(apiErr.response.data?.message || 'Conflict: Insufficient warehouse stock or concurrent movement.');
      } else if (apiErr.response?.status === 422) {
        const validationMsgs = apiErr.response.data?.errors;
        if (validationMsgs) {
          const firstKey = Object.keys(validationMsgs)[0];
          setServerError(validationMsgs[firstKey][0] || 'Validation failed. Please verify form inputs.');
        } else {
          setServerError(apiErr.response.data?.message || 'Validation failed.');
        }
      } else {
        setServerError(apiErr.response?.data?.message || apiErr.message || 'Failed to submit stock adjustment.');
      }
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate projected new stock
  const projectedStock = useMemo(() => {
    if (currentAvailableStock === null) return null;
    const qty = parseFloat(formData.quantity);
    if (isNaN(qty) || qty <= 0) return currentAvailableStock;
    if (formData.actionType === 'ADJUSTMENT_IN') {
      return currentAvailableStock + qty;
    }
    return Math.max(0, currentAvailableStock - qty);
  }, [currentAvailableStock, formData.quantity, formData.actionType]);

  const unitSymbol = selectedProduct?.unit?.short_code || selectedProduct?.unit?.name || 'units';

  return (
    <div className="space-y-6" data-testid="stock-adjustments-page">
      {/* 1. Page Header */}
      <PageHeader
        title={t('inventory.adjustmentsTitle', 'Stock Adjustment')}
        subtitle={t(
          'inventory.adjustmentsSubtitle',
          'Record stock increases, decreases, damages, and write-offs'
        )}
        breadcrumbs={[
          { label: t('nav.dashboard', 'Dashboard'), to: '/dashboard' },
          { label: t('inventory.title', 'Inventory'), to: '/inventory' },
          { label: t('inventory.adjustments', 'Stock Adjustments') },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/inventory"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition-colors"
            >
              <Package className="w-4 h-4 text-slate-500" />
              <span>{t('inventory.stockLevels', 'Stock Levels')}</span>
            </Link>

            <Link
              to="/inventory/movements"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition-colors"
              data-testid="link-view-movements"
            >
              <History className="w-4 h-4 text-slate-500" />
              <span>{t('inventory.viewMovements', 'View Movements')}</span>
            </Link>

            <Link
              to="/inventory/transfers"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition-colors"
            >
              <Send className="w-4 h-4 text-slate-500" />
              <span>{t('inventory.transfers', 'Stock Transfers')}</span>
            </Link>
          </div>
        }
      />

      {/* Notifications */}
      {successMessage && (
        <div
          className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between shadow-xs animate-in fade-in"
          data-testid="adjustment-success-banner"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">{successMessage}</span>
          </div>
          <Link
            to="/inventory/movements"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline ml-3 shrink-0"
          >
            {t('inventory.viewMovements', 'View Movements')} →
          </Link>
        </div>
      )}

      {serverError && (
        <div
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2.5 shadow-xs animate-in fade-in"
          data-testid="adjustment-error-banner"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{serverError}</span>
        </div>
      )}

      {/* 2. Main Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Controls (2 Cols) */}
        <div className="lg:col-span-2">
          <form
            onSubmit={handleInitiateSubmit}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5"
            data-testid="stock-adjustment-form"
          >
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
              {t('inventory.newAdjustment', 'New Stock Adjustment')}
            </h2>

            {/* Warehouse Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                {t('inventory.warehouse', 'Warehouse')} *
              </label>
              <div className="relative">
                <WarehouseIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <select
                  aria-label={t('inventory.selectWarehouse', 'Select Warehouse')}
                  value={formData.warehouseId}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      warehouseId: e.target.value,
                      storageLocationId: '',
                    }));
                    setFieldErrors((prev) => ({ ...prev, warehouseId: '' }));
                  }}
                  className={`w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm bg-slate-50 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium ${
                    fieldErrors.warehouseId ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                  }`}
                  data-testid="select-adjustment-warehouse"
                >
                  <option value="">-- {t('inventory.selectWarehouse', 'Select Warehouse')} --</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} {w.code ? `(${w.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {fieldErrors.warehouseId && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">{fieldErrors.warehouseId}</p>
              )}
            </div>

            {/* Product & Variant Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Product */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  {t('products.product', 'Product')} *
                </label>
                <div className="relative">
                  <Package className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <select
                    aria-label={t('products.product', 'Product')}
                    value={formData.productId}
                    onChange={(e) => handleProductChange(e.target.value)}
                    className={`w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm bg-slate-50 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium ${
                      fieldErrors.productId ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                    }`}
                    data-testid="select-adjustment-product"
                  >
                    <option value="">-- {t('inventory.selectProduct', 'Select Product')} --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.product_code ? `(${p.product_code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {fieldErrors.productId && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1">{fieldErrors.productId}</p>
                )}
              </div>

              {/* Variant */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  {t('products.variants', 'Variant / SKU')} *
                </label>
                <div className="relative">
                  <Layers className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <select
                    aria-label={t('products.variants', 'Variant / SKU')}
                    value={formData.productVariantId}
                    onChange={(e) => handleVariantChange(e.target.value)}
                    disabled={!selectedProduct || !selectedProduct.variants || selectedProduct.variants.length === 0}
                    className={`w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm bg-slate-50 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium disabled:opacity-50 ${
                      fieldErrors.productVariantId ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                    }`}
                    data-testid="select-adjustment-variant"
                  >
                    <option value="">-- {t('products.variants', 'Select Variant')} --</option>
                    {selectedProduct?.variants?.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.sku} {v.variant_name ? `(${v.variant_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {fieldErrors.productVariantId && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1">{fieldErrors.productVariantId}</p>
                )}
              </div>
            </div>

            {/* Adjustment Type Cards */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                {t('inventory.adjustmentType', 'Adjustment Type')} *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5" data-testid="adjustment-type-selector">
                {/* 1. Adjustment In */}
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, actionType: 'ADJUSTMENT_IN' }))}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    formData.actionType === 'ADJUSTMENT_IN'
                      ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                  data-testid="btn-type-in"
                >
                  <ArrowDownLeft
                    className={`w-5 h-5 mb-1 ${
                      formData.actionType === 'ADJUSTMENT_IN' ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      {t('inventory.adjustmentIn', 'Adjustment In')}
                    </div>
                    <div className="text-[10px] text-slate-500">+ Stock (Add)</div>
                  </div>
                </button>

                {/* 2. Adjustment Out */}
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, actionType: 'ADJUSTMENT_OUT' }))}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    formData.actionType === 'ADJUSTMENT_OUT'
                      ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                  data-testid="btn-type-out"
                >
                  <ArrowUpRight
                    className={`w-5 h-5 mb-1 ${
                      formData.actionType === 'ADJUSTMENT_OUT' ? 'text-amber-600' : 'text-slate-400'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      {t('inventory.adjustmentOut', 'Adjustment Out')}
                    </div>
                    <div className="text-[10px] text-slate-500">- Stock (Reduce)</div>
                  </div>
                </button>

                {/* 3. Damage */}
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, actionType: 'DAMAGE' }))}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    formData.actionType === 'DAMAGE'
                      ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                  data-testid="btn-type-damage"
                >
                  <AlertTriangle
                    className={`w-5 h-5 mb-1 ${
                      formData.actionType === 'DAMAGE' ? 'text-rose-600' : 'text-slate-400'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      {t('inventory.damage', 'Damage')}
                    </div>
                    <div className="text-[10px] text-slate-500">- Defective / Broken</div>
                  </div>
                </button>

                {/* 4. Loss */}
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, actionType: 'LOSS' }))}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    formData.actionType === 'LOSS'
                      ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                  data-testid="btn-type-loss"
                >
                  <TrendingDown
                    className={`w-5 h-5 mb-1 ${
                      formData.actionType === 'LOSS' ? 'text-rose-600' : 'text-slate-400'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      {t('inventory.loss', 'Loss')}
                    </div>
                    <div className="text-[10px] text-slate-500">- Missing / Shrinkage</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Quantity & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Quantity */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  {t('inventory.adjustmentQty', 'Adjustment Quantity')} *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0.0001"
                    value={formData.quantity}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, quantity: e.target.value }));
                      setFieldErrors((prev) => ({ ...prev, quantity: '' }));
                    }}
                    placeholder="0.0000"
                    className={`w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 border rounded-xl font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                      fieldErrors.quantity ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                    }`}
                    data-testid="input-adjustment-quantity"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 uppercase font-sans">
                    {unitSymbol}
                  </span>
                </div>
                {fieldErrors.quantity && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1">{fieldErrors.quantity}</p>
                )}
              </div>

              {/* Storage Location (Optional) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  {t('inventory.storageLocation', 'Storage Location')}
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <select
                    aria-label={t('inventory.storageLocation', 'Storage Location')}
                    value={formData.storageLocationId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, storageLocationId: e.target.value }))}
                    disabled={!formData.warehouseId || storageLocations.length === 0}
                    className="w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium disabled:opacity-50"
                    data-testid="select-adjustment-location"
                  >
                    <option value="">{t('inventory.selectStorageLocation', 'Select Location (Optional)')}</option>
                    {storageLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} {loc.code ? `(${loc.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                {t('inventory.reason', 'Reason')} *
              </label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, reason: e.target.value }));
                  setFieldErrors((prev) => ({ ...prev, reason: '' }));
                }}
                placeholder={t('inventory.reasonPlaceholder', 'e.g. Physical inventory count variance, damp damage...')}
                className={`w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                  fieldErrors.reason ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                }`}
                data-testid="input-adjustment-reason"
              />
              {fieldErrors.reason && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">{fieldErrors.reason}</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                {t('inventory.notes', 'Notes / Remarks')}
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder={t('inventory.notesPlaceholder', 'Additional audit details (optional)...')}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                data-testid="textarea-adjustment-notes"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                data-testid="btn-submit-adjustment"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>{t('inventory.confirmAdjustment', 'Apply Stock Adjustment')}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Context & Impact Summary (1 Col) */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4" data-testid="adjustment-summary-card">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
              {t('inventory.currentStock', 'Stock Impact Summary')}
            </h3>

            {/* Warehouse context */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{t('inventory.warehouse', 'Warehouse')}</span>
              <span className="font-semibold text-slate-800">
                {warehouses.find((w) => String(w.id) === String(formData.warehouseId))?.name || '-'}
              </span>
            </div>

            {/* Product context */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{t('products.product', 'Product')}</span>
              <span className="font-semibold text-slate-800 truncate max-w-[160px]">
                {selectedProduct?.name || '-'}
              </span>
            </div>

            {/* Variant context */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">SKU</span>
              <span className="font-mono font-bold text-slate-900">
                {selectedVariant?.sku || '-'}
              </span>
            </div>

            {/* Current Available Stock */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">
                {t('inventory.currentStock', 'Current Stock')}
              </span>
              <span className="text-sm font-mono font-extrabold text-slate-900" data-testid="current-stock-display">
                {isLoadingStock ? (
                  <span className="text-slate-400">...</span>
                ) : currentAvailableStock !== null ? (
                  `${formatDecimalQty(currentAvailableStock)} ${unitSymbol}`
                ) : (
                  '-'
                )}
              </span>
            </div>

            {/* Adjustment Operation Badge */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{t('inventory.adjustmentType', 'Type')}</span>
              <span className="font-bold">
                {formData.actionType === 'ADJUSTMENT_IN' ? (
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    + {t('inventory.adjustmentIn', 'Adjustment In')}
                  </span>
                ) : formData.actionType === 'ADJUSTMENT_OUT' ? (
                  <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    - {t('inventory.adjustmentOut', 'Adjustment Out')}
                  </span>
                ) : formData.actionType === 'DAMAGE' ? (
                  <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    - {t('inventory.damage', 'Damage')}
                  </span>
                ) : (
                  <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    - {t('inventory.loss', 'Loss')}
                  </span>
                )}
              </span>
            </div>

            {/* Projected New Stock */}
            <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900">
                {t('inventory.newStock', 'Projected Stock')}
              </span>
              <span className="text-base font-mono font-extrabold text-indigo-900" data-testid="projected-stock-display">
                {projectedStock !== null ? `${formatDecimalQty(projectedStock)} ${unitSymbol}` : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Confirmation Dialog Modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
          data-testid="adjustment-confirm-modal"
        >
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                {t('inventory.confirmAdjustment', 'Confirm Stock Adjustment')}
              </h3>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs sm:text-sm">
              <p className="text-slate-600">
                {t(
                  'inventory.confirmAdjustmentDesc',
                  'Are you sure you want to apply this stock adjustment? This action will create an immutable stock movement entry.'
                )}
              </p>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 font-medium text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('inventory.warehouse', 'Warehouse')}:</span>
                  <span className="font-semibold text-slate-800">
                    {warehouses.find((w) => String(w.id) === String(formData.warehouseId))?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('products.product', 'Product')}:</span>
                  <span className="font-semibold text-slate-800">{selectedProduct?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SKU:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedVariant?.sku}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('inventory.adjustmentType', 'Type')}:</span>
                  <span className="font-bold text-slate-800">{formData.actionType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('inventory.quantity', 'Quantity')}:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatDecimalQty(formData.quantity)} {unitSymbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('inventory.reason', 'Reason')}:</span>
                  <span className="text-slate-800 truncate max-w-[200px]">{formData.reason}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                data-testid="btn-cancel-modal"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                data-testid="btn-confirm-adjustment"
              >
                {isSubmitting ? (
                  <span>{t('inventory.submitting', 'Submitting...')}</span>
                ) : (
                  <span>{t('inventory.confirmAdjustment', 'Confirm Adjustment')}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default StockAdjustments;
