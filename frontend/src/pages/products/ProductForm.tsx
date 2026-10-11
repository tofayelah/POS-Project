import React, { useState, useEffect } from 'react';
import { Package, ArrowLeft, Save, AlertCircle, Sparkles, Layers, Info } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { getProduct, createProduct, updateProduct, getCategories, getBrands, getUnits } from '../../api/products';
import { taxApi } from '../../api/tax';
import { Category, Brand, Unit, ProductPayload } from '../../types/product';
import { VariantBuilder, VariantRowItem } from '../../components/products/VariantBuilder';

export const ProductForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [taxProfiles, setTaxProfiles] = useState<any[]>([]);

  // Form State
  const [name, setName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [brandId, setBrandId] = useState<number | ''>('');
  const [unitId, setUnitId] = useState<number | ''>('');
  const [productType, setProductType] = useState<'simple' | 'variable'>('simple');
  const [taxRate, setTaxRate] = useState<number>(0);
  const [taxType, setTaxType] = useState<'inclusive' | 'exclusive' | 'exempt'>('exclusive');
  const [reorderLevel, setReorderLevel] = useState<number>(10);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Simple Product Fields
  const [simpleSku, setSimpleSku] = useState('');
  const [simpleBarcode, setSimpleBarcode] = useState('');
  const [simpleCostPrice, setSimpleCostPrice] = useState<number>(0);
  const [simpleSellingPrice, setSimpleSellingPrice] = useState<number>(0);
  const [simpleWholesalePrice, setSimpleWholesalePrice] = useState<number>(0);
  const [simpleMrp, setSimpleMrp] = useState<number>(0);

  // Variable Product Matrix Rows
  const [variantRows, setVariantRows] = useState<VariantRowItem[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    setIsLoading(true);
    try {
      const [catRes, brandRes, unitRes, taxRes] = await Promise.all([
        getCategories({ all: true }),
        getBrands({ all: true }),
        getUnits({ all: true }),
        taxApi.getCategories().catch(() => ({ data: { data: [] } })),
      ]);

      setCategories(catRes.data || []);
      setBrands(brandRes.data || []);
      setUnits(unitRes.data || []);
      setTaxProfiles((taxRes as any).data?.data || (taxRes as any).data || []);

      if (isEdit && id) {
        await loadProductDetails(Number(id));
      } else {
        // Set defaults for creation
        if (catRes.data?.[0]) setCategoryId(Number(catRes.data[0].id));
        if (unitRes.data?.[0]) setUnitId(Number(unitRes.data[0].id));
      }
    } catch (err: any) {
      setErrorMessage('Failed to load master configuration data.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProductDetails = async (productId: number) => {
    try {
      const res = await getProduct(productId);
      if (res.success && res.data) {
        const p = res.data;
        setName(p.name || '');
        setProductCode(p.product_code || '');
        setDescription(p.description || '');
        setCategoryId(p.category_id ? Number(p.category_id) : '');
        setBrandId(p.brand_id ? Number(p.brand_id) : '');
        setUnitId(p.unit_id ? Number(p.unit_id) : '');
        setProductType(p.product_type === 'variable' ? 'variable' : 'simple');
        setTaxRate(Number(p.tax_rate) || 0);
        setTaxType(p.tax_type || 'exclusive');
        setReorderLevel(Number(p.reorder_level) || 0);
        setStatus(p.status || 'active');

        const variants = p.variants || [];
        if (p.product_type === 'simple' && variants.length > 0) {
          const v0 = variants[0];
          setSimpleSku(v0.sku || '');
          setSimpleCostPrice(Number(v0.cost_price) || 0);
          setSimpleSellingPrice(Number(v0.selling_price) || 0);
          setSimpleWholesalePrice(Number(v0.wholesale_price) || Number(v0.selling_price) || 0);
          setSimpleMrp(Number(v0.mrp) || Number(v0.selling_price) || 0);
          if (v0.barcodes && v0.barcodes.length > 0) {
            setSimpleBarcode(v0.barcodes[0].barcode || '');
          }
        } else if (p.product_type === 'variable') {
          const mappedRows: VariantRowItem[] = variants.map((v: any) => ({
            id: v.id,
            sku: v.sku,
            variant_name: v.variant_name || v.sku,
            cost_price: Number(v.cost_price) || 0,
            selling_price: Number(v.selling_price) || 0,
            wholesale_price: Number(v.wholesale_price) || Number(v.selling_price) || 0,
            mrp: Number(v.mrp) || Number(v.selling_price) || 0,
            barcode: v.barcodes?.[0]?.barcode || '',
            attribute_value_ids: (v.attribute_values || []).map((av: any) => Number(av.id)),
            status: v.status || 'active',
          }));
          setVariantRows(mappedRows);
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Failed to load product for editing.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Product name is required.');
      return;
    }
    if (!categoryId) {
      setErrorMessage('Please select a category.');
      return;
    }
    if (!unitId) {
      setErrorMessage('Please select a unit of measure.');
      return;
    }

    let finalVariants: any[] = [];

    if (productType === 'simple') {
      if (!simpleSku.trim()) {
        setErrorMessage('SKU is required for a simple product.');
        return;
      }
      finalVariants = [
        {
          sku: simpleSku.trim(),
          variant_name: name.trim(),
          cost_price: simpleCostPrice,
          selling_price: simpleSellingPrice,
          wholesale_price: simpleWholesalePrice || simpleSellingPrice,
          mrp: simpleMrp || simpleSellingPrice,
          barcodes: simpleBarcode.trim()
            ? [{ barcode: simpleBarcode.trim(), barcode_type: 'EAN', is_primary: true }]
            : [],
          status,
        },
      ];
    } else {
      if (variantRows.length === 0) {
        setErrorMessage('Variable products must have at least one variant combination.');
        return;
      }
      finalVariants = variantRows.map((r) => ({
        id: r.id,
        sku: r.sku.trim(),
        variant_name: r.variant_name,
        cost_price: r.cost_price,
        selling_price: r.selling_price,
        wholesale_price: r.wholesale_price || r.selling_price,
        mrp: r.mrp || r.selling_price,
        attribute_value_ids: r.attribute_value_ids,
        barcodes: r.barcode.trim()
          ? [{ barcode: r.barcode.trim(), barcode_type: 'EAN', is_primary: true }]
          : [],
        status: r.status,
      }));
    }

    const payload: ProductPayload = {
      name: name.trim(),
      product_code: productCode.trim() || undefined,
      description: description.trim() || undefined,
      category_id: Number(categoryId),
      brand_id: brandId ? Number(brandId) : undefined,
      unit_id: Number(unitId),
      product_type: productType,
      has_variants: productType === 'variable',
      tax_rate: taxRate,
      tax_type: taxType,
      reorder_level: reorderLevel,
      status,
      variants: finalVariants,
    };

    setIsSaving(true);
    try {
      if (isEdit && id) {
        await updateProduct(Number(id), payload);
      } else {
        await createProduct(payload);
      }
      navigate('/products');
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Failed to save product master record.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto bg-slate-50 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="p-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-indigo-700" />
              {isEdit ? 'Edit Product Master' : 'Add New Product Master'}
            </h1>
            <p className="text-sm font-medium text-slate-600">Configure catalog information, pricing, tax, and variant matrix</p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-700 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center font-semibold text-slate-600">Loading form options...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Identity Section */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2">
              1. Product Master Identity
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Baby Bottle Standard"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Product Code / Prefix
                </label>
                <input
                  type="text"
                  placeholder="e.g. BB"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Category *
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="" className="text-slate-900">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} className="text-slate-900">{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Brand
                </label>
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="" className="text-slate-900">None (Generic)</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id} className="text-slate-900">{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Base Unit of Measure *
                </label>
                <select
                  required
                  value={unitId}
                  onChange={(e) => setUnitId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="" className="text-slate-900">Select Unit</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id} className="text-slate-900">{u.name} ({u.short_code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Description / Notes
              </label>
              <textarea
                rows={2}
                placeholder="Product specifications, features, and storage details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Configuration: Tax, Reorder, Type */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2">
              2. Tax, Reorder Level & Type Configuration
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Product Structure Type
                </label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-lg text-sm font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="simple" className="text-slate-900">Simple (Single SKU)</option>
                  <option value="variable" className="text-slate-900">Variable (Matrix Attributes)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Default VAT / Tax Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Tax Calculation Mode
                </label>
                <select
                  value={taxType}
                  onChange={(e) => setTaxType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="exclusive" className="text-slate-900">Exclusive (Price + Tax)</option>
                  <option value="inclusive" className="text-slate-900">Inclusive (Tax in Price)</option>
                  <option value="exempt" className="text-slate-900">Zero-Rated / Exempt</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Low-Stock Reorder Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* Simple vs Variable Pricing Section */}
          {productType === 'simple' ? (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2">
                3. Single Item SKU & Pricing Defaults
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SKU-1001"
                    value={simpleSku}
                    onChange={(e) => setSimpleSku(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Barcode (Primary EAN/UPC)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 8901234567890"
                    value={simpleBarcode}
                    onChange={(e) => setSimpleBarcode(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Cost Price (৳) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={simpleCostPrice}
                    onChange={(e) => setSimpleCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-right font-bold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Selling Retail Price (৳) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={simpleSellingPrice}
                    onChange={(e) => setSimpleSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-right font-bold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Wholesale Price (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={simpleWholesalePrice}
                    onChange={(e) => setSimpleWholesalePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-right font-bold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    MRP / Maximum Retail Price (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={simpleMrp}
                    onChange={(e) => setSimpleMrp(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-right font-bold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2">
                3. Variable Matrix Generator & Variant Master
              </h2>

              <VariantBuilder
                productCodePrefix={productCode || 'PROD'}
                baseCostPrice={simpleCostPrice}
                baseSellingPrice={simpleSellingPrice}
                baseWholesalePrice={simpleWholesalePrice}
                baseMrp={simpleMrp}
                initialVariants={variantRows}
                onChange={(rows) => setVariantRows(rows)}
              />
            </div>
          )}

          {/* Action Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white rounded-lg text-sm font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving Master Record...' : isEdit ? 'Update Product Master' : 'Save Product Master'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
