import React, { useState, useEffect } from 'react';
import { Package, ArrowLeft, Save, AlertCircle, Sparkles, Layers, Info, Barcode as BarcodeIcon, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { getProduct, createProduct, updateProduct, getCategories, getBrands, getUnits } from '../../api/products';
import { getSuppliers } from '../../api/suppliers';
import { generateSupplierBarcode, generateSupplierShortName } from '../../utils/supplierUtils';
import { taxApi } from '../../api/tax';
import { Category, Brand, Unit, ProductPayload } from '../../types/product';
import { Supplier } from '../../types/supplier';
import { VariantBuilder, VariantRowItem } from '../../components/products/VariantBuilder';

export const ProductForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState<number | ''>('');
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

  // Keyboard Navigation: Enter key moves focus sequentially to the next visible field/column
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      // Allow default Enter in textarea and on submit button
      if (target.tagName === 'TEXTAREA' || (target.tagName === 'BUTTON' && target.getAttribute('type') === 'submit')) {
        return;
      }

      e.preventDefault(); // Intercept Enter to prevent unintended form submit

      const form = e.currentTarget;
      const selector = 'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button[type="submit"]';
      const elements = Array.from(form.querySelectorAll<HTMLElement>(selector)).filter(
        (el) => el.tabIndex !== -1 && el.offsetParent !== null
      );

      const currentIndex = elements.indexOf(target);
      if (currentIndex !== -1 && currentIndex < elements.length - 1) {
        const nextEl = elements[currentIndex + 1];
        nextEl.focus();
        if (nextEl instanceof HTMLInputElement && nextEl.type !== 'checkbox' && nextEl.type !== 'radio') {
          nextEl.select?.();
        }
      }
    }
  };

  // Auto Code / SKU / Barcode Generators (Omit 880, prefix with Supplier Short Name)
  const generateAutoCodes = (
    targetCatId?: number | '',
    targetBrandId?: number | '',
    targetName?: string,
    targetSupplierId?: number | '',
    catList = categories,
    brandList = brands,
    suppList = suppliers
  ) => {
    const nextNum = Math.floor(1000 + Math.random() * 9000);
    const code = `PRD-${nextNum}`;

    const cId = targetCatId ?? categoryId;
    const bId = targetBrandId ?? brandId;
    const sId = targetSupplierId ?? supplierId;
    const iName = targetName ?? name;

    const selectedCat = catList.find((c) => Number(c.id) === Number(cId));
    const selectedBrand = brandList.find((b) => Number(b.id) === Number(bId));

    const catPrefix = selectedCat?.code || selectedCat?.name?.substring(0, 3).toUpperCase() || 'CAT';
    const brandPrefix = selectedBrand?.code || selectedBrand?.name?.substring(0, 3).toUpperCase() || 'BRD';
    const namePart = iName ? iName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase() : 'ITEM';
    const randDigits = Math.floor(100 + Math.random() * 900);

    const generatedSku = `${brandPrefix}-${catPrefix}-${namePart}${randDigits}`;
    const generatedBarcode = generateSupplierBarcode(sId, brandPrefix, suppList);

    return { code, sku: generatedSku, barcode: generatedBarcode };
  };

  const handleAutoGenerateCode = () => {
    const nextNum = Math.floor(1000 + Math.random() * 9000);
    setProductCode(`PRD-${nextNum}`);
  };

  const handleRegenerateSku = () => {
    const auto = generateAutoCodes(categoryId, brandId, name, supplierId);
    setSimpleSku(auto.sku);
  };

  const handleRegenerateBarcode = () => {
    const auto = generateAutoCodes(categoryId, brandId, name, supplierId);
    setSimpleBarcode(auto.barcode);
  };

  const handleRegenerateAllCodes = () => {
    const auto = generateAutoCodes(categoryId, brandId, name, supplierId);
    setProductCode(auto.code);
    setSimpleSku(auto.sku);
    setSimpleBarcode(auto.barcode);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEdit) {
      const auto = generateAutoCodes(categoryId, brandId, val, supplierId);
      setSimpleSku(auto.sku);
      if (!productCode) setProductCode(auto.code);
      if (!simpleBarcode) setSimpleBarcode(auto.barcode);
    }
  };

  const handleCategoryChange = (val: number | '') => {
    setCategoryId(val);
    if (!isEdit) {
      const auto = generateAutoCodes(val, brandId, name, supplierId);
      setSimpleSku(auto.sku);
    }
  };

  const handleBrandChange = (val: number | '') => {
    setBrandId(val);
    if (!isEdit) {
      const auto = generateAutoCodes(categoryId, val, name, supplierId);
      setSimpleSku(auto.sku);
      if (!supplierId) {
        setSimpleBarcode(auto.barcode);
      }
    }
  };

  const handleSupplierChange = (val: number | '') => {
    setSupplierId(val);
    if (!isEdit) {
      const auto = generateAutoCodes(categoryId, brandId, name, val);
      setSimpleBarcode(auto.barcode);
    }
  };

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    setIsLoading(true);
    try {
      const [catRes, brandRes, unitRes, taxRes, suppsRes] = await Promise.all([
        getCategories({ all: true }),
        getBrands({ all: true }),
        getUnits({ all: true }),
        taxApi.getCategories().catch(() => ({ data: { data: [] } })),
        getSuppliers().catch(() => ({ success: true, data: [] })),
      ]);

      const loadedCats = catRes.data || [];
      const loadedBrands = brandRes.data || [];
      const loadedUnits = unitRes.data || [];
      const loadedSupps: Supplier[] = Array.isArray(suppsRes.data)
        ? suppsRes.data
        : (suppsRes.data as any)?.data || [];

      setCategories(loadedCats);
      setBrands(loadedBrands);
      setUnits(loadedUnits);
      setTaxProfiles((taxRes as any).data?.data || (taxRes as any).data || []);
      setSuppliers(loadedSupps);

      if (isEdit && id) {
        await loadProductDetails(Number(id), loadedSupps);
      } else {
        // Set defaults for creation
        const defaultCatId = loadedCats[0] ? Number(loadedCats[0].id) : '';
        const defaultUnitId = loadedUnits[0] ? Number(loadedUnits[0].id) : '';
        const defaultBrandId = loadedBrands[0] ? Number(loadedBrands[0].id) : '';
        const defaultSuppId = loadedSupps[0] ? Number(loadedSupps[0].id) : '';

        if (defaultCatId) setCategoryId(defaultCatId);
        if (defaultUnitId) setUnitId(defaultUnitId);
        if (defaultBrandId) setBrandId(defaultBrandId);
        if (defaultSuppId) setSupplierId(defaultSuppId);

        // Auto-generate fresh Product Code, SKU, and Barcode
        const auto = generateAutoCodes(
          defaultCatId,
          defaultBrandId,
          '',
          defaultSuppId,
          loadedCats,
          loadedBrands,
          loadedSupps
        );
        setProductCode(auto.code);
        setSimpleSku(auto.sku);
        setSimpleBarcode(auto.barcode);
      }
    } catch (err: any) {
      setErrorMessage('Failed to load master configuration data.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProductDetails = async (productId: number, suppList = suppliers) => {
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
        const suppIdVal = p.supplier_id ? Number(p.supplier_id) : (p.supplier?.id ? Number(p.supplier.id) : '');
        setSupplierId(suppIdVal);
        setProductType(p.product_type === 'variable' ? 'variable' : 'simple');
        setTaxRate(Number(p.tax_rate) || 0);
        setTaxType(p.tax_type || 'exclusive');
        setReorderLevel(Number(p.reorder_level) || 0);
        setStatus(p.status || 'active');

        const variants = p.variants || [];
        if (p.product_type === 'simple' && variants.length > 0) {
          const v0 = variants[0];
          setSimpleSku(v0.sku || p.sku || '');
          setSimpleCostPrice(Number(v0.cost_price ?? (p as any).cost_price) || 0);
          setSimpleSellingPrice(Number(v0.selling_price ?? (p as any).retail_price ?? p.price) || 0);
          setSimpleWholesalePrice(Number(v0.wholesale_price ?? (p as any).wholesale_price) || Number(v0.selling_price) || 0);
          setSimpleMrp(Number(v0.mrp ?? (p as any).mrp) || Number(v0.selling_price) || 0);
          
          let bCode = v0.barcodes?.[0]?.barcode || v0.barcode || (p as any).barcode || '';
          if (bCode.startsWith('880')) {
            const sShort = p.supplier_short_name || p.supplier?.short_name;
            bCode = generateSupplierBarcode(sShort || suppIdVal, undefined, suppList);
          }
          setSimpleBarcode(bCode);
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
            ? [{ barcode: simpleBarcode.trim(), barcode_type: 'CODE-128', is_primary: true }]
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
          ? [{ barcode: r.barcode.trim(), barcode_type: 'CODE-128', is_primary: true }]
          : [],
        status: r.status,
      }));
    }

    const selectedSupplier = suppliers.find((s) => Number(s.id) === Number(supplierId));
    const calculatedSupplierShortName = selectedSupplier?.short_name || (selectedSupplier?.name ? generateSupplierShortName(selectedSupplier.name) : undefined);

    const payload: ProductPayload = {
      name: name.trim(),
      product_code: productCode.trim() || undefined,
      description: description.trim() || undefined,
      category_id: Number(categoryId),
      brand_id: brandId ? Number(brandId) : undefined,
      supplier_id: supplierId ? Number(supplierId) : undefined,
      supplier_short_name: calculatedSupplierShortName,
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
        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-6">
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
                  placeholder="e.g. Samsung Galaxy A54 5G 128GB Black"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 placeholder:text-slate-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800">
                    Product Code
                  </label>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-sm">
                    Read-Only (Auto)
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    placeholder="PRD-AUTO"
                    value={productCode}
                    className="w-full px-3 py-2 pr-8 bg-slate-100/90 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-700 cursor-not-allowed select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAutoGenerateCode}
                    className="absolute right-2 top-2 p-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                    title="Regenerate Product Code"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Category *
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => handleCategoryChange(Number(e.target.value))}
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
                  onChange={(e) => handleBrandChange(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="" className="text-slate-900">None (Generic)</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id} className="text-slate-900">{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800">
                    Preferred Supplier
                  </label>
                  {supplierId && (
                    <span className="text-[10px] font-extrabold text-teal-700 bg-teal-50 border border-teal-200/80 px-1.5 py-0.5 rounded-sm">
                      Prefix: {suppliers.find((s) => Number(s.id) === Number(supplierId))?.short_name || generateSupplierShortName(suppliers.find((s) => Number(s.id) === Number(supplierId))?.name || '') || 'SUP'}
                    </span>
                  )}
                </div>
                <select
                  value={supplierId}
                  onChange={(e) => handleSupplierChange(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="" className="text-slate-900">None (General)</option>
                  {suppliers.map((s) => {
                    const shortName = s.short_name || generateSupplierShortName(s.name || '');
                    return (
                      <option key={s.id} value={s.id} className="text-slate-900">
                        {s.name} ({shortName ? `${shortName} • ` : ''}{s.supplier_code})
                      </option>
                    );
                  })}
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  3. Single Item SKU &amp; Pricing Defaults
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Auto-Generated System Codes
                  </span>
                  <button
                    type="button"
                    onClick={handleRegenerateAllCodes}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Regenerate both SKU and Barcode"
                  >
                    <RefreshCw className="w-3 h-3" /> Regenerate Codes
                  </button>
                </div>
              </div>

              {/* Read-Only Codes Info Notice */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs font-medium text-indigo-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarcodeIcon className="w-4 h-4 text-indigo-700 shrink-0" />
                  <span>
                    SKU Code and Barcode are automatically generated with Supplier Short Name &amp; Category identifiers. <strong>Read-Only</strong> to prevent POS and inventory scan mismatch.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SKU Code */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>SKU Code *</span>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/70 border border-indigo-200 px-1.5 py-0.5 rounded-sm">
                        Read-Only (Auto)
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={handleRegenerateSku}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Regenerate SKU Code"
                    >
                      <RefreshCw className="w-3 h-3" /> Regenerate
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    readOnly
                    tabIndex={-1}
                    placeholder="SKU-AUTO"
                    value={simpleSku}
                    className="w-full px-3 py-2 bg-slate-100/90 border border-slate-300 rounded-lg text-sm font-mono font-bold text-indigo-700 cursor-not-allowed select-all focus:outline-none"
                  />
                </div>

                {/* Barcode (Primary EAN/UPC) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>Barcode (Primary EAN/UPC)</span>
                      <span className="text-[10px] font-bold text-slate-700 bg-slate-200/80 border border-slate-300 px-1.5 py-0.5 rounded-sm">
                        Read-Only (Auto)
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={handleRegenerateBarcode}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Regenerate Barcode using Supplier Short Name"
                    >
                      <RefreshCw className="w-3 h-3" /> Regenerate
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      tabIndex={-1}
                      placeholder="SUP-AUTO"
                      value={simpleBarcode}
                      className="w-full px-3 py-2 pl-9 bg-slate-100/90 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-800 cursor-not-allowed select-all focus:outline-none"
                    />
                    <BarcodeIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
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
