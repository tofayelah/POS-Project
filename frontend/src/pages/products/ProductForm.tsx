import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { Save, AlertCircle, CheckCircle, Package, Info, Percent } from 'lucide-react';
import {
  Category,
  Brand,
  Unit,
  ProductType,
  TaxType,
  EntityStatus,
  ProductPayload,
} from '../../types/product';
import {
  getCategories,
  getBrands,
  getUnits,
  getProduct,
  createProduct,
  updateProduct,
} from '../../api/products';
import { VariantBuilder, VariantRowItem } from '../../components/products/VariantBuilder';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingState } from '../../components/common/LoadingState';
import { useCompany } from '../../contexts/CompanyContext';
import { useLanguage } from '../../i18n';

export function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { companyId, company } = useCompany();
  const activeCompanyId = companyId || company?.id || 1;

  // Reference options
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(isEdit);

  // Form State
  const [name, setName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [brandId, setBrandId] = useState<number | ''>('');
  const [unitId, setUnitId] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [productType, setProductType] = useState<ProductType>('simple');
  const [taxRate, setTaxRate] = useState<number>(0);
  const [taxType, setTaxType] = useState<TaxType>('exclusive');
  const [reorderLevel, setReorderLevel] = useState<number>(10);
  const [status, setStatus] = useState<EntityStatus>('active');

  // Simple Product Pricing & SKU State
  const [simpleSku, setSimpleSku] = useState('');
  const [simpleCostPrice, setSimpleCostPrice] = useState<number>(0);
  const [simpleSellingPrice, setSimpleSellingPrice] = useState<number>(0);
  const [simpleWholesalePrice, setSimpleWholesalePrice] = useState<number>(0);
  const [simpleMrp, setSimpleMrp] = useState<number>(0);
  const [simpleBarcode, setSimpleBarcode] = useState('');

  // Variable Product Variants State
  const [variantRows, setVariantRows] = useState<VariantRowItem[]>([]);

  // Submission State
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Selected Unit helper
  const selectedUnit = units.find((u) => u.id === Number(unitId));
  const isDecimalAllowed = selectedUnit?.decimal_allowed ?? false;

  useEffect(() => {
    loadPrerequisites();
  }, [id]);

  const loadPrerequisites = async () => {
    try {
      const [catRes, brandRes, unitRes] = await Promise.all([
        getCategories({ all: true }),
        getBrands({ all: true }),
        getUnits({ all: true }),
      ]);
      setCategories(catRes.data || []);
      setBrands(brandRes.data || []);
      setUnits(unitRes.data || []);

      if (isEdit && id) {
        const prodRes = await getProduct(Number(id));
        const p = prodRes.data;
        if (p) {
          setName(p.name);
          setProductCode(p.product_code || '');
          setCategoryId(p.category_id);
          setBrandId(p.brand_id || '');
          setUnitId(p.unit_id);
          setDescription(p.description || '');
          setProductType(p.product_type);
          setTaxRate(Number(p.tax_rate) || 0);
          setTaxType(p.tax_type || 'exclusive');
          setReorderLevel(Number(p.reorder_level) || 0);
          setStatus(p.status || 'active');

          if (p.product_type === 'simple' && p.variants?.[0]) {
            const v = p.variants[0];
            setSimpleSku(v.sku);
            setSimpleCostPrice(Number(v.cost_price));
            setSimpleSellingPrice(Number(v.selling_price));
            setSimpleWholesalePrice(Number(v.wholesale_price ?? v.selling_price));
            setSimpleMrp(Number(v.mrp ?? v.selling_price));
            setSimpleBarcode(v.primary_barcode?.barcode || v.barcodes?.[0]?.barcode || '');
          } else if (p.product_type === 'variable' && p.variants) {
            const rows: VariantRowItem[] = p.variants.map((v: any) => ({
              id: v.id,
              sku: v.sku,
              variant_name: v.variant_name,
              cost_price: Number(v.cost_price),
              selling_price: Number(v.selling_price),
              wholesale_price: Number(v.wholesale_price ?? v.selling_price),
              mrp: Number(v.mrp ?? v.selling_price),
              barcode: v.primary_barcode?.barcode || v.barcodes?.[0]?.barcode || '',
              attribute_value_ids: v.attribute_values?.map((av: any) => av.id) || [],
              status: v.status || 'active',
            }));
            setVariantRows(rows);
          }
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load product data.');
    } finally {
      setLoadingInitial(false);
    }
  };

  // Auto-generate a default simple SKU from name or product code if empty
  const handleNameChange = (val: string) => {
    setName(val);
    if (!simpleSku && val) {
      const code = val.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '');
      setSimpleSku(`${code || 'SKU'}-001`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError('Product Name is required.');
      return;
    }
    if (!categoryId) {
      setError('Category is required.');
      return;
    }
    if (!unitId) {
      setError('Base Unit of Measure is required.');
      return;
    }

    // Decimal validation check for reorder level
    if (!isDecimalAllowed && reorderLevel % 1 !== 0) {
      setError(t('products.decimalNotAllowedNotice'));
      return;
    }

    let variantsPayload: ProductPayload['variants'] = [];

    if (productType === 'simple') {
      if (!simpleSku.trim()) {
        setError('SKU code is required for the simple product.');
        return;
      }
      if (simpleSellingPrice <= 0) {
        setError('Selling price must be greater than 0.');
        return;
      }

      variantsPayload = [
        {
          sku: simpleSku.trim(),
          variant_name: 'Standard',
          cost_price: simpleCostPrice || 0,
          selling_price: simpleSellingPrice || 0,
          wholesale_price: simpleWholesalePrice || simpleSellingPrice || 0,
          mrp: simpleMrp || simpleSellingPrice || 0,
          status: 'active',
          attribute_value_ids: [],
          barcodes: simpleBarcode.trim()
            ? [
                {
                  barcode: simpleBarcode.trim(),
                  barcode_type: 'EAN',
                  is_primary: true,
                },
              ]
            : [],
        },
      ];
    } else {
      // Variable product
      if (variantRows.length === 0) {
        setError('At least one variant must be created for a variable product.');
        return;
      }
      for (const r of variantRows) {
        if (!r.sku.trim()) {
          setError('All variants in the matrix must have a non-empty SKU.');
          return;
        }
        if (r.selling_price <= 0) {
          setError(`Selling price for SKU '${r.sku}' must be greater than 0.`);
          return;
        }
      }

      variantsPayload = variantRows.map((r) => ({
        id: r.id,
        sku: r.sku.trim(),
        variant_name: r.variant_name,
        cost_price: r.cost_price || 0,
        selling_price: r.selling_price || 0,
        wholesale_price: r.wholesale_price || r.selling_price || 0,
        mrp: r.mrp || r.selling_price || 0,
        status: r.status || 'active',
        attribute_value_ids: r.attribute_value_ids,
        barcodes: r.barcode.trim()
          ? [
              {
                barcode: r.barcode.trim(),
                barcode_type: 'EAN',
                is_primary: true,
              },
            ]
          : [],
      }));
    }

    const payload: ProductPayload = {
      company_id: activeCompanyId,
      category_id: Number(categoryId),
      brand_id: brandId ? Number(brandId) : null,
      unit_id: Number(unitId),
      name: name.trim(),
      product_code: productCode.trim() || null,
      description: description.trim() || null,
      product_type: productType,
      has_variants: productType === 'variable',
      tax_rate: Number(taxRate) || 0,
      tax_type: taxType,
      reorder_level: Number(reorderLevel) || 0,
      status,
      variants: variantsPayload,
    };

    setSaving(true);
    try {
      if (isEdit && id) {
        await updateProduct(Number(id), payload);
        setSuccess(t('products.saveSuccess'));
      } else {
        await createProduct(payload);
        setSuccess(t('products.saveSuccess'));
      }
      setTimeout(() => {
        navigate('/products');
      }, 750);
    } catch (err: any) {
      if (err.response?.data?.errors) {
        const errorMessages = Object.values(err.response.data.errors).flat().join(' ');
        setError(errorMessages || err.response?.data?.message || 'Validation failed.');
      } else {
        setError(err.response?.data?.message || 'Failed to save product master record.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loadingInitial) {
    return <LoadingState message={t('common.loading')} />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <PageHeader
        breadcrumbs={[
          { label: t('products.title'), to: '/products' },
          { label: isEdit ? t('products.editProduct') : t('products.createProduct') },
        ]}
        title={isEdit ? t('products.editProduct') : t('products.createProduct')}
        subtitle={t('products.subtitle')}
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/products"
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
            >
              {t('common.cancel')}
            </Link>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? t('products.submitting') : t('common.save')}</span>
            </button>
          </div>
        }
      />

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs flex items-center gap-3">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Scope Disclaimer Banner */}
      <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-blue-900 text-xs flex items-start gap-2.5">
        <Info className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
        <div>
          <strong className="font-semibold">Catalog Master Isolation:</strong> This screen configures the master catalog definition, variant matrix, and barcode registrations. No stock quantities or inventory balance entries are altered here.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Information */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Package className="w-4 h-4 text-indigo-600" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {t('products.basicInfo')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Product Name */}
            <div className="md:col-span-8 space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                {t('products.productName')} *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={t('products.namePlaceholder')}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                required
              />
            </div>

            {/* Product Code */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                {t('products.productCode')}
              </label>
              <input
                type="text"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                placeholder={t('products.codePlaceholder')}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            {/* Category */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                {t('products.category')} *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">{t('products.selectCategory')}...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parent ? `${c.parent.name} > ` : ''}{c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                {t('products.brand')}
              </label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">{t('products.unbranded')}</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                {t('products.unit')} *
              </label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">{t('products.selectUnit')}...</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.short_code}) {u.decimal_allowed ? '— [Decimals Allowed]' : '— [Integer Only]'}
                  </option>
                ))}
              </select>
              {selectedUnit && (
                <p className={`text-[11px] font-medium pt-0.5 ${isDecimalAllowed ? 'text-indigo-600' : 'text-slate-500'}`}>
                  {isDecimalAllowed ? t('products.decimalAllowedNotice') : t('products.decimalNotAllowedNotice')}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="md:col-span-12 space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                {t('products.description')}
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('products.descriptionPlaceholder')}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Pricing, Tax, and Reorder Rules */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Percent className="w-4 h-4 text-indigo-600" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {t('products.pricingAndTax')} & {t('products.unitAndInventory')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Tax Rate */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                {t('products.taxRate')}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Tax Type */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                {t('products.taxType')}
              </label>
              <select
                value={taxType}
                onChange={(e) => setTaxType(e.target.value as TaxType)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="exclusive">{t('products.taxExclusive')}</option>
                <option value="inclusive">{t('products.taxInclusive')}</option>
                <option value="exempt">{t('products.taxExempt')}</option>
              </select>
            </div>

            {/* Reorder Threshold */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                {t('products.reorderLevel')}
              </label>
              <input
                type="number"
                step={isDecimalAllowed ? '0.01' : '1'}
                min="0"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(parseFloat(e.target.value) || 0)}
                placeholder="Alert quantity"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              {selectedUnit && (
                <span className="text-[10px] text-slate-400 block">
                  {selectedUnit.short_code} ({isDecimalAllowed ? 'Decimal allowed' : 'Whole number only'})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Product Type & Variant Matrix / Single SKU */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {t('products.variantsAndSkus')}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose whether this product sells as a single standard SKU or multiple variations (Color/Size)
              </p>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setProductType('simple')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  productType === 'simple'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('products.typeSimple')}
              </button>
              <button
                type="button"
                onClick={() => setProductType('variable')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  productType === 'variable'
                    ? 'bg-white text-purple-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('products.typeVariable')}
              </button>
            </div>
          </div>

          {productType === 'simple' ? (
            /* Simple Product Pricing & SKU Form */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4 space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  {t('products.sku')} *
                </label>
                <input
                  type="text"
                  value={simpleSku}
                  onChange={(e) => setSimpleSku(e.target.value)}
                  placeholder={t('products.skuPlaceholder')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  required
                />
              </div>

              <div className="md:col-span-4 space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  {t('products.barcode')}
                </label>
                <input
                  type="text"
                  value={simpleBarcode}
                  onChange={(e) => setSimpleBarcode(e.target.value)}
                  placeholder={t('products.barcodePlaceholder')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="md:col-span-4 space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  {t('products.costPrice')} (৳)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">৳</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={simpleCostPrice}
                    onChange={(e) => setSimpleCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-right"
                  />
                </div>
              </div>

              <div className="md:col-span-4 space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  {t('products.sellingPrice')} (৳) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-emerald-600 font-bold text-xs">৳</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={simpleSellingPrice}
                    onChange={(e) => setSimpleSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-right font-bold text-emerald-700"
                    required
                  />
                </div>
              </div>

              <div className="md:col-span-4 space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  {t('products.wholesalePrice')} (৳)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">৳</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={simpleWholesalePrice}
                    onChange={(e) => setSimpleWholesalePrice(parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-right"
                  />
                </div>
              </div>

              <div className="md:col-span-4 space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  {t('products.mrp')} (৳)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">৳</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={simpleMrp}
                    onChange={(e) => setSimpleMrp(parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-right"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Variable Product Matrix Builder */
            <div className="space-y-4">
              <div className="p-3.5 bg-purple-50/60 border border-purple-200/80 rounded-2xl text-purple-900 text-xs">
                <strong>Variant Matrix Generator:</strong> Select attribute dimensions below. You can define base pricing templates to populate all rows automatically, or adjust them individually in the matrix.
              </div>

              {/* Template Pricing Helpers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl">
                <div>
                  <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                    {t('products.costPrice')} (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={simpleCostPrice}
                    onChange={(e) => setSimpleCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white text-right font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                    {t('products.sellingPrice')} (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={simpleSellingPrice}
                    onChange={(e) => setSimpleSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white text-right font-mono font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                    {t('products.wholesalePrice')} (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={simpleWholesalePrice}
                    onChange={(e) => setSimpleWholesalePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white text-right font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                    {t('products.mrp')} (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={simpleMrp}
                    onChange={(e) => setSimpleMrp(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white text-right font-mono"
                  />
                </div>
              </div>

              <VariantBuilder
                productCodePrefix={productCode || name.slice(0, 4)}
                baseCostPrice={simpleCostPrice}
                baseSellingPrice={simpleSellingPrice}
                baseWholesalePrice={simpleWholesalePrice}
                baseMrp={simpleMrp}
                initialVariants={variantRows}
                onChange={(rows) => setVariantRows(rows)}
              />
            </div>
          )}
        </div>

        {/* Form Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            to="/products"
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
          >
            {t('common.cancel')}
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 px-6 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? t('products.submitting') : t('common.save')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
