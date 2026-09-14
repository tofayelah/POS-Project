import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { ArrowLeft, Save, AlertCircle, CheckCircle, Package, Info } from 'lucide-react';
import { Category, Brand, Unit, ProductType, TaxType, EntityStatus, ProductPayload } from '../../types/product';
import { getCategories, getBrands, getUnits, getProduct, createProduct, updateProduct } from '../../api/products';
import { VariantBuilder, VariantRowItem } from '../../components/products/VariantBuilder';

export function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

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

  useEffect(() => {
    loadPrerequisites();
  }, []);

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
          setTaxRate(p.tax_rate || 0);
          setTaxType(p.tax_type || 'exclusive');
          setReorderLevel(p.reorder_level || 0);
          setStatus(p.status || 'active');

          if (p.product_type === 'simple' && p.variants?.[0]) {
            const v = p.variants[0];
            setSimpleSku(v.sku);
            setSimpleCostPrice(Number(v.cost_price));
            setSimpleSellingPrice(Number(v.selling_price));
            setSimpleWholesalePrice(Number(v.wholesale_price || v.selling_price));
            setSimpleMrp(Number(v.mrp || v.selling_price));
            setSimpleBarcode(v.primary_barcode?.barcode || v.barcodes?.[0]?.barcode || '');
          } else if (p.product_type === 'variable' && p.variants) {
            const rows: VariantRowItem[] = p.variants.map((v: any) => ({
              id: v.id,
              sku: v.sku,
              variant_name: v.variant_name,
              cost_price: Number(v.cost_price),
              selling_price: Number(v.selling_price),
              wholesale_price: Number(v.wholesale_price || v.selling_price),
              mrp: Number(v.mrp || v.selling_price),
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
      company_id: 1,
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
        setSuccess('Product master updated successfully.');
      } else {
        await createProduct(payload);
        setSuccess('Product master created successfully.');
      }
      setTimeout(() => {
        navigate('/products');
      }, 750);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save product master record.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="py-12 text-center text-xs text-slate-400">Loading catalog record...</div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/products"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {isEdit ? 'Edit Product Catalog Item' : 'New Product Master Item'}
            </h1>
            <p className="text-xs text-slate-500">
              {isEdit ? 'Update core catalog attributes and SKU definitions' : 'Create a master catalog record with variants and barcodes'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Product'}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-3">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Scope Disclaimer Banner */}
      <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-start gap-2.5">
        <Info className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
        <div>
          <strong className="font-semibold">Catalog Master Isolation:</strong> This screen configures the master catalog definition, variant matrix, and barcode registrations. No stock quantities or inventory balance entries are altered here.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Information */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Package className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              General Catalog Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Product Name */}
            <div className="md:col-span-8 space-y-1">
              <label className="text-xs font-medium text-slate-700">Product Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Classic Cotton Bra or Daily Cotton Camisole"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                required
              />
            </div>

            {/* Product Code */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-xs font-medium text-slate-700">Catalog Code / Style No.</label>
              <input
                type="text"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                placeholder="e.g. BRA-CC-100"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            {/* Category */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-xs font-medium text-slate-700">Category *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parent ? `${c.parent.name} > ` : ''}{c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-xs font-medium text-slate-700">Brand</label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None / Unbranded</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-xs font-medium text-slate-700">Base Unit of Measure *</label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Unit...</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.short_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="md:col-span-12 space-y-1">
              <label className="text-xs font-medium text-slate-700">Product Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details regarding fabric, fit, styling, wash care..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Tax Settings */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-xs font-medium text-slate-700">Tax Rate (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-4 space-y-1">
              <label className="text-xs font-medium text-slate-700">Tax Application</label>
              <select
                value={taxType}
                onChange={(e) => setTaxType(e.target.value as TaxType)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="exclusive">Exclusive of Tax</option>
                <option value="inclusive">Inclusive in Price</option>
                <option value="exempt">Tax Exempt</option>
              </select>
            </div>

            {/* Reorder Threshold */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-xs font-medium text-slate-700">Reorder Alert Threshold</label>
              <input
                type="number"
                min="0"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(parseInt(e.target.value) || 0)}
                placeholder="Alert quantity"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Product Type & Variant Selection */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                Product Type & SKU Structure
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose whether this product sells as a single standard SKU or multiple variations (Color/Size)
              </p>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setProductType('simple')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  productType === 'simple'
                    ? 'bg-white text-blue-600 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Simple Product (Single SKU)
              </button>
              <button
                type="button"
                onClick={() => setProductType('variable')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  productType === 'variable'
                    ? 'bg-white text-purple-600 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Variable Product (Matrix)
              </button>
            </div>
          </div>

          {productType === 'simple' ? (
            /* Simple Product Pricing & SKU Form */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4 space-y-1">
                <label className="text-xs font-medium text-slate-700">SKU Code *</label>
                <input
                  type="text"
                  value={simpleSku}
                  onChange={(e) => setSimpleSku(e.target.value)}
                  placeholder="e.g. CAM-001-STD"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
              </div>

              <div className="md:col-span-4 space-y-1">
                <label className="text-xs font-medium text-slate-700">Primary Barcode</label>
                <input
                  type="text"
                  value={simpleBarcode}
                  onChange={(e) => setSimpleBarcode(e.target.value)}
                  placeholder="Scan or enter barcode"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div className="md:col-span-4 space-y-1">
                <label className="text-xs font-medium text-slate-700">Cost Price (৳)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={simpleCostPrice}
                  onChange={(e) => setSimpleCostPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                />
              </div>

              <div className="md:col-span-4 space-y-1">
                <label className="text-xs font-medium text-slate-700">Default Selling Price (৳) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={simpleSellingPrice}
                  onChange={(e) => setSimpleSellingPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-right font-semibold text-slate-800"
                  required
                />
              </div>

              <div className="md:col-span-4 space-y-1">
                <label className="text-xs font-medium text-slate-700">Wholesale Price (৳)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={simpleWholesalePrice}
                  onChange={(e) => setSimpleWholesalePrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                />
              </div>

              <div className="md:col-span-4 space-y-1">
                <label className="text-xs font-medium text-slate-700">Maximum Retail Price (MRP ৳)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={simpleMrp}
                  onChange={(e) => setSimpleMrp(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                />
              </div>
            </div>
          ) : (
            /* Variable Product Matrix Builder */
            <div className="space-y-4">
              <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl text-purple-900 text-xs">
                <strong>Variant Matrix Generator:</strong> Select attribute dimensions below. You can define base pricing templates to populate all rows automatically, or adjust them individually in the matrix.
              </div>

              {/* Template Pricing Helpers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div>
                  <label className="text-[11px] text-slate-500 font-medium">Default Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={simpleCostPrice}
                    onChange={(e) => setSimpleCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white text-right"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium">Default Selling Price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={simpleSellingPrice}
                    onChange={(e) => setSimpleSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white text-right font-medium"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium">Default Wholesale</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={simpleWholesalePrice}
                    onChange={(e) => setSimpleWholesalePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white text-right"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium">Default MRP</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={simpleMrp}
                    onChange={(e) => setSimpleMrp(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white text-right"
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
            className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 px-6 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Product'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
