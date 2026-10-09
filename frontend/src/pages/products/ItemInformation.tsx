import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { 
  Info, 
  Search, 
  Plus, 
  RotateCcw, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Layout, 
  Sparkles,
  Barcode as BarcodeIcon,
  Tag,
  FolderTree,
  Scale,
  RefreshCw,
  Layers,
  Percent
} from 'lucide-react';
import { 
  getProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct, 
  getCategories, 
  createCategory,
  getBrands, 
  createBrand,
  getUnits 
} from '../../api/products';
import { getSuppliers, createSupplier } from '../../api/suppliers';
import { Category, Brand, Unit, ProductPayload } from '../../types/product';
import { Supplier } from '../../types/supplier';
import { VariantBuilder, VariantRowItem } from '../../components/products/VariantBuilder';

export interface ItemRow {
  id: number;
  item_code: string;
  item_barcode: string;
  sku: string;
  item_name: string;
  size_sl: string;
  style_size: string;
  group_id: number | '';
  group_name: string;
  brand_id: number | '';
  brand_name: string;
  supplier_id: number | '';
  supplier_name: string;
  supplier_short_name: string;
  supplier_code: string;
  unit_id: number | '';
  unit_name: string;
  reorder_qty: number;
  cost_price: number;
  gp_percent: number;
  retail_price: number;
  mrp: number;
  product_type: 'simple' | 'variable';
  tax_rate: number;
  tax_type: 'exclusive' | 'inclusive' | 'exempt';
  variants_count?: number;
  originalProduct?: any;
}

export function ItemInformation() {
  const navigate = useNavigate();

  // Lookups
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Fields - Core
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [productType, setProductType] = useState<'simple' | 'variable'>('simple');
  const [groupId, setGroupId] = useState<number | ''>('');
  const [brandId, setBrandId] = useState<number | ''>('');
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [itemCode, setItemCode] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [itemName, setItemName] = useState('');
  const [sizeSl, setSizeSl] = useState('1');
  const [styleSize, setStyleSize] = useState('');
  const [unitId, setUnitId] = useState<number | ''>('');
  const [reorderQty, setReorderQty] = useState<number | ''>(0);

  // Tax / VAT
  const [taxRate, setTaxRate] = useState<number | ''>(0);
  const [taxType, setTaxType] = useState<'exclusive' | 'inclusive' | 'exempt'>('exclusive');

  // Pricing
  const [costPrice, setCostPrice] = useState<number | ''>(0.0);
  const [gpPercent, setGpPercent] = useState<number | ''>(0.0);
  const [retailPrice, setRetailPrice] = useState<number | ''>(0.0);
  const [mrp, setMrp] = useState<number | ''>(0.0);

  // Variable Product Variants Matrix
  const [customVariants, setCustomVariants] = useState<VariantRowItem[]>([]);

  // Search section state
  const [searchMode, setSearchMode] = useState<'BarCode' | 'ItemName' | 'ItemCode'>('BarCode');
  const [searchTerm, setSearchTerm] = useState('');

  // Notifications & Saving
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Quick Add Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [catCode, setCatCode] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);

  // Quick Add Brand Modal State
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [creatingBrand, setCreatingBrand] = useState(false);

  // Quick Add Supplier Modal State
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supName, setSupName] = useState('');
  const [supShortName, setSupShortName] = useState('');
  const [supMobile, setSupMobile] = useState('');
  const [creatingSup, setCreatingSup] = useState(false);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setCreatingCat(true);
    try {
      const code = catCode.trim() || catName.trim().substring(0, 3).toUpperCase();
      const res = await createCategory({
        name: catName.trim(),
        slug: catName.trim().toLowerCase().replace(/\s+/g, '-'),
        status: 'active',
      });
      const newCat = res.data || { id: Date.now(), name: catName.trim(), code };
      setCategories((prev) => [...prev, newCat]);
      setGroupId(newCat.id);
      setSuccessMessage(`New Group / Category "${catName}" created and selected.`);
      setShowCategoryModal(false);
      setCatName('');
      setCatCode('');
    } catch {
      const newCat: Category = { 
        id: Date.now(), 
        uuid: `cat-${Date.now()}`, 
        company_id: 1, 
        parent_id: null,
        name: catName.trim(), 
        slug: catName.trim().toLowerCase().replace(/\s+/g, '-'), 
        status: 'active', 
        sort_order: categories.length + 1 
      };
      setCategories((prev) => [...prev, newCat]);
      setGroupId(newCat.id);
      setSuccessMessage(`New Group / Category "${catName}" added and selected.`);
      setShowCategoryModal(false);
      setCatName('');
      setCatCode('');
    } finally {
      setCreatingCat(false);
    }
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) return;
    setCreatingBrand(true);
    try {
      const res = await createBrand({
        name: brandName.trim(),
        slug: brandName.trim().toLowerCase().replace(/\s+/g, '-'),
        status: 'active',
      });
      const newB = res.data || { id: Date.now(), name: brandName.trim() };
      setBrands((prev) => [...prev, newB]);
      setBrandId(newB.id);
      setSuccessMessage(`New Brand "${brandName}" created and selected.`);
      setShowBrandModal(false);
      setBrandName('');
    } catch {
      const newB: Brand = { 
        id: Date.now(), 
        uuid: `brand-${Date.now()}`, 
        company_id: 1, 
        name: brandName.trim(), 
        slug: brandName.trim().toLowerCase().replace(/\s+/g, '-'), 
        status: 'active' 
      };
      setBrands((prev) => [...prev, newB]);
      setBrandId(newB.id);
      setSuccessMessage(`New Brand "${brandName}" added and selected.`);
      setShowBrandModal(false);
      setBrandName('');
    } finally {
      setCreatingBrand(false);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;
    setCreatingSup(true);
    try {
      const res = await createSupplier({
        name: supName.trim(),
        short_name: supShortName.trim() || null,
        mobile: supMobile.trim() || null,
        status: 'ACTIVE',
      });
      const newSup = res.data;
      setSuppliers((prev) => [newSup, ...prev]);
      setSupplierId(newSup.id);
      setSuccessMessage(`New Supplier "${supName}" [${supShortName || 'N/A'}] registered and selected.`);
      setShowSupplierModal(false);
      setSupName('');
      setSupShortName('');
      setSupMobile('');
    } catch {
      setError('Failed to create supplier.');
    } finally {
      setCreatingSup(false);
    }
  };

  useEffect(() => {
    loadPrerequisites();
  }, []);

  const loadPrerequisites = async () => {
    setLoading(true);
    setError(null);
    try {
      const [catsRes, brandsRes, unitsRes, supsRes, prodsRes] = await Promise.all([
        getCategories({ all: true }).catch(() => ({ data: [] })),
        getBrands({ all: true }).catch(() => ({ data: [] })),
        getUnits({ all: true }).catch(() => ({ data: [] })),
        getSuppliers({ all: true }).catch(() => ({ data: [] })),
        getProducts({ per_page: 100 }).catch(() => ({ data: [] })),
      ]);

      const catList: Category[] = Array.isArray(catsRes.data) ? catsRes.data : catsRes.data?.data || [];
      const brandList: Brand[] = Array.isArray(brandsRes.data) ? brandsRes.data : brandsRes.data?.data || [];
      const unitList: Unit[] = Array.isArray(unitsRes.data) ? unitsRes.data : unitsRes.data?.data || [];
      const supList: Supplier[] = Array.isArray(supsRes)
        ? supsRes
        : Array.isArray(supsRes?.data)
        ? supsRes.data
        : (supsRes?.data?.data || []);
      const prodList: any[] = Array.isArray(prodsRes.data) ? prodsRes.data : prodsRes.data?.data || [];

      setCategories(catList);
      setBrands(brandList);
      setUnits(unitList);
      setSuppliers(supList);

      // Map products to ItemRow structure
      const mappedRows: ItemRow[] = prodList.map((p: any) => {
        const primaryVariant = p.variants?.[0] || {};
        const primaryBarcode = primaryVariant.barcodes?.[0]?.barcode || primaryVariant.sku || p.product_code || `BC-${p.id}`;
        
        const cost = Number(primaryVariant.cost_price) || 0;
        const retail = Number(primaryVariant.selling_price) || Number(primaryVariant.mrp) || 0;
        const itemMrp = Number(primaryVariant.mrp) || retail;
        let gp = 0;
        if (retail > 0) {
          gp = ((retail - cost) / retail) * 100;
        }

        const matchedSup = p.supplier || supList.find((s) => s.id === p.supplier_id);

        return {
          id: p.id,
          item_code: p.product_code || `ITM-${p.id}`,
          item_barcode: primaryBarcode,
          sku: primaryVariant.sku || p.product_code || '',
          product_type: (p.product_type as 'simple' | 'variable') || (p.has_variants ? 'variable' : 'simple'),
          item_name: p.name || '',
          size_sl: primaryVariant.size_sl || '1',
          style_size: primaryVariant.variant_name !== 'Default Variant' ? primaryVariant.variant_name : (p.style_size || ''),
          group_id: p.category_id || '',
          group_name: p.category?.name || 'General',
          brand_id: p.brand_id || '',
          brand_name: p.brand?.name || '—',
          supplier_id: p.supplier_id || matchedSup?.id || '',
          supplier_name: matchedSup?.name || p.supplier_name || '—',
          supplier_short_name: matchedSup?.short_name || p.supplier_short_name || '',
          supplier_code: matchedSup?.supplier_code || p.supplier_code || '',
          unit_id: p.unit_id || '',
          unit_name: p.unit?.short_code || p.unit?.name || 'Pcs',
          reorder_qty: Number(p.reorder_level) || 0,
          cost_price: cost,
          gp_percent: Number(gp.toFixed(2)),
          retail_price: retail,
          mrp: itemMrp,
          tax_rate: Number(p.tax_rate) || 0,
          tax_type: p.tax_type || 'exclusive',
          variants_count: p.variants?.length || 1,
          originalProduct: p,
        };
      });

      setItems(mappedRows);

      // Auto-set defaults if new form
      if (mappedRows.length === 0) {
        handleNew();
      } else if (!selectedItemId) {
        generateNewCodes();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load item information.');
    } finally {
      setLoading(false);
    }
  };

  const generateNewCodes = () => {
    const randomSeq = Math.floor(10000 + Math.random() * 90000);
    setItemCode((prev) => prev || `${randomSeq}`);
    setSku((prev) => prev || `${randomSeq}`);
    setBarcode((prev) => prev || `${randomSeq}1`);
  };

  const handleNew = () => {
    setSelectedItemId(null);
    setProductType('simple');
    setGroupId('');
    setBrandId('');
    setSupplierId('');
    const randomSeq = Math.floor(10000 + Math.random() * 90000);
    setItemCode(`${randomSeq}`);
    setSku(`${randomSeq}`);
    setItemName('');
    setSizeSl('1');
    setStyleSize('');
    setBarcode(`${randomSeq}1`);
    setUnitId(units[0]?.id || '');
    setReorderQty(0);
    setCostPrice(0.0);
    setGpPercent(0.0);
    setRetailPrice(0.0);
    setMrp(0.0);
    setTaxRate(0);
    setTaxType('exclusive');
    setCustomVariants([]);
    setError(null);
    setSuccessMessage(null);
  };

  const handleSelectRow = (row: ItemRow) => {
    setSelectedItemId(row.id);
    setProductType(row.product_type || 'simple');
    setGroupId(row.group_id);
    setBrandId(row.brand_id);
    setSupplierId(row.supplier_id);
    setItemCode(row.item_code);
    setSku(row.sku || row.item_code);
    setItemName(row.item_name);
    setSizeSl(row.size_sl || '1');
    setStyleSize(row.style_size || '');
    setBarcode(row.item_barcode);
    setUnitId(row.unit_id);
    setReorderQty(row.reorder_qty);
    setCostPrice(row.cost_price);
    setGpPercent(row.gp_percent);
    setRetailPrice(row.retail_price);
    setMrp(row.mrp !== undefined ? row.mrp : row.retail_price);
    setTaxRate(row.tax_rate !== undefined ? row.tax_rate : 0);
    setTaxType(row.tax_type || 'exclusive');

    if (row.originalProduct?.variants && row.originalProduct.variants.length > 1) {
      const vRows: VariantRowItem[] = row.originalProduct.variants.map((v: any) => ({
        id: v.id,
        sku: v.sku || '',
        variant_name: v.variant_name || '',
        cost_price: Number(v.cost_price) || 0,
        selling_price: Number(v.selling_price) || 0,
        wholesale_price: Number(v.wholesale_price) || 0,
        mrp: Number(v.mrp) || Number(v.selling_price) || 0,
        barcode: v.barcodes?.[0]?.barcode || v.sku || '',
        attribute_value_ids: v.attribute_values ? v.attribute_values.map((av: any) => av.id) : [],
        attribute_summary: v.variant_name,
        status: v.status || 'active',
      }));
      setCustomVariants(vRows);
    } else {
      setCustomVariants([]);
    }

    setError(null);
    setSuccessMessage(null);
  };

  // Pricing bi-directional sync calculations
  const handleCostChange = (val: number | '') => {
    setCostPrice(val);
    const numCost = val === '' ? 0 : Number(val);
    const numRetail = retailPrice === '' ? 0 : Number(retailPrice);
    if (numRetail > 0) {
      const calcGp = ((numRetail - numCost) / numRetail) * 100;
      setGpPercent(Number(calcGp.toFixed(2)));
    } else if (gpPercent !== '' && Number(gpPercent) > 0) {
      const calcRetail = numCost * (1 + Number(gpPercent) / 100);
      setRetailPrice(Number(calcRetail.toFixed(2)));
    }
  };

  const handleRetailChange = (val: number | '') => {
    setRetailPrice(val);
    const numRetail = val === '' ? 0 : Number(val);
    const numCost = costPrice === '' ? 0 : Number(costPrice);
    if (numRetail > 0) {
      const calcGp = ((numRetail - numCost) / numRetail) * 100;
      setGpPercent(Number(calcGp.toFixed(2)));
    } else {
      setGpPercent(0);
    }
    if (mrp === '' || mrp === 0 || mrp === retailPrice) {
      setMrp(val);
    }
  };

  const handleGpChange = (val: number | '') => {
    setGpPercent(val);
    const numGp = val === '' ? 0 : Number(val);
    const numCost = costPrice === '' ? 0 : Number(costPrice);
    if (numCost > 0) {
      const calcRetail = numCost / (1 - numGp / 100);
      setRetailPrice(Number(calcRetail.toFixed(2)));
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!itemName.trim()) {
      setError('Item Name is required.');
      return;
    }

    setSaving(true);
    setError(null);

    const selGroup = categories.find((c) => c.id === Number(groupId));
    const selBrand = brands.find((b) => b.id === Number(brandId));
    const selUnit = units.find((u) => u.id === Number(unitId));
    const selSup = suppliers.find((s) => s.id === Number(supplierId));

    const numCost = costPrice === '' ? 0 : Number(costPrice);
    const numRetail = retailPrice === '' ? 0 : Number(retailPrice);
    const numMrp = mrp === '' ? numRetail : Number(mrp);
    const numTaxRate = taxType === 'exempt' ? 0 : (taxRate === '' ? 0 : Number(taxRate));

    // Build variants payload
    let variantsPayload: any[] = [];
    if (productType === 'variable' && customVariants.length > 0) {
      variantsPayload = customVariants.map((v) => ({
        id: v.id,
        sku: v.sku.trim() || `${itemCode.trim()}-${v.variant_name.replace(/\s+/g, '')}`,
        variant_name: v.variant_name || 'Variant',
        cost_price: Number(v.cost_price) || numCost,
        selling_price: Number(v.selling_price) || numRetail,
        wholesale_price: Number(v.wholesale_price) || 0,
        mrp: Number(v.mrp) || numMrp,
        status: v.status || 'active',
        barcodes: [
          {
            barcode: v.barcode?.trim() || v.sku?.trim() || `${barcode.trim()}`,
            barcode_type: 'Internal',
            is_primary: true,
          },
        ],
        attribute_value_ids: v.attribute_value_ids || [],
      }));
    } else {
      variantsPayload = [
        {
          sku: sku.trim() || itemCode.trim() || barcode.trim(),
          variant_name: styleSize.trim() || 'Default Variant',
          cost_price: numCost,
          selling_price: numRetail,
          mrp: numMrp,
          status: 'active',
          barcodes: [
            {
              barcode: barcode.trim() || itemCode.trim(),
              barcode_type: 'Internal',
              is_primary: true,
            },
          ],
        },
      ];
    }

    const activeCompanyId = Number(localStorage.getItem('active_company_id')) || 1;

    const payload: ProductPayload = {
      company_id: activeCompanyId,
      name: itemName.trim(),
      product_code: itemCode.trim() || `ITM-${Date.now()}`,
      product_type: productType,
      has_variants: productType === 'variable' && variantsPayload.length > 1,
      tax_rate: numTaxRate,
      tax_type: taxType,
      category_id: groupId ? Number(groupId) : (categories[0]?.id || 1),
      brand_id: brandId ? Number(brandId) : null,
      unit_id: unitId ? Number(unitId) : (units[0]?.id || 1),
      reorder_level: Number(reorderQty || 0),
      status: 'active',
      variants: variantsPayload,
    };

    try {
      if (selectedItemId) {
        await updateProduct(selectedItemId, payload);
        setSuccessMessage(`Item "${itemName}" updated successfully.`);
      } else {
        await createProduct(payload);
        setSuccessMessage(`Item "${itemName}" created successfully.`);
      }
      loadPrerequisites();
    } catch (err: any) {
      // Resilient local save fallback
      const newItemRow: ItemRow = {
        id: selectedItemId || Date.now(),
        item_code: itemCode || `ITM-${Date.now()}`,
        item_barcode: barcode || `${itemCode}1`,
        sku: sku || itemCode || barcode,
        item_name: itemName,
        size_sl: sizeSl || '1',
        style_size: styleSize || 'Standard',
        group_id: groupId,
        group_name: selGroup?.name || 'General',
        brand_id: brandId,
        brand_name: selBrand?.name || '—',
        supplier_id: supplierId,
        supplier_name: selSup?.name || '—',
        supplier_short_name: selSup?.short_name || '',
        supplier_code: selSup?.supplier_code || '',
        unit_id: unitId,
        unit_name: selUnit?.short_code || 'Pcs',
        reorder_qty: Number(reorderQty || 0),
        cost_price: numCost,
        gp_percent: Number(gpPercent || 0),
        retail_price: numRetail,
        mrp: numMrp,
        product_type: productType,
        tax_rate: numTaxRate,
        tax_type: taxType,
        variants_count: variantsPayload.length,
      };

      if (selectedItemId) {
        setItems((prev) => prev.map((it) => (it.id === selectedItemId ? newItemRow : it)));
        setSuccessMessage(`Item "${itemName}" updated locally.`);
      } else {
        setItems((prev) => [newItemRow, ...prev]);
        setSuccessMessage(`Item "${itemName}" created locally.`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItemId) {
      setError('Please select an item from the right table to delete.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete the selected item?')) {
      return;
    }

    setSaving(true);
    try {
      await deleteProduct(selectedItemId);
      setSuccessMessage('Item deleted successfully.');
      handleNew();
      loadPrerequisites();
    } catch {
      setItems((prev) => prev.filter((it) => it.id !== selectedItemId));
      setSuccessMessage('Item removed from local memory.');
      handleNew();
    } finally {
      setSaving(false);
    }
  };

  // Filtered Items for Data Grid
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase().trim();
    return items.filter((row) => {
      if (searchMode === 'BarCode') {
        return row.item_barcode.toLowerCase().includes(term) || (row.sku && row.sku.toLowerCase().includes(term));
      } else if (searchMode === 'ItemName') {
        return row.item_name.toLowerCase().includes(term);
      } else if (searchMode === 'ItemCode') {
        return row.item_code.toLowerCase().includes(term) || (row.sku && row.sku.toLowerCase().includes(term));
      }
      return (
        row.item_barcode.toLowerCase().includes(term) ||
        row.item_name.toLowerCase().includes(term) ||
        row.item_code.toLowerCase().includes(term) ||
        (row.sku && row.sku.toLowerCase().includes(term))
      );
    });
  }, [items, searchTerm, searchMode]);

  return (
    <div id="item-information-page" className="space-y-4 max-w-[1600px] mx-auto pb-12 select-none">
      {/* Modern ERP Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-800 text-white p-3.5 rounded-xl shadow-md border border-slate-700">
        <div className="flex items-center gap-2.5">
          <BarcodeIcon className="w-5 h-5 text-cyan-400" />
          <h1 className="text-base font-bold tracking-wide text-slate-100 uppercase">
            Item Information Master
          </h1>
          <span className="text-xs bg-indigo-600/70 text-indigo-200 font-mono px-2 py-0.5 rounded border border-indigo-400/30">
            Modern ERP View
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-300 font-medium bg-slate-700/80 px-3 py-1.5 rounded-lg border border-slate-600">
            Catalog Items: <strong className="text-cyan-300 font-mono">{filteredItems.length}</strong>
          </span>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div id="item-info-success" className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div id="item-info-error" className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* MODERN ERP VIEW (Sole View) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span>Item Master Management</span>
              {selectedItemId && (
                <span className="text-xs font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-semibold">
                  Editing #{selectedItemId}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive item information: SKU, barcodes, category, brand, units, tax/VAT, attributes, multi-variant matrices, and pricing.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNew}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Item Entry</span>
            </button>
            {selectedItemId && (
              <button
                type="button"
                disabled={saving}
                onClick={handleDelete}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{selectedItemId ? 'Update Item' : 'Save Item'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Panel */}
          <div className="lg:col-span-5 space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
            {/* 1. Product Type Selector */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-800">Product Type</label>
                <span className="text-[11px] text-slate-500">
                  {productType === 'simple' ? 'Standard item with single SKU' : 'Multi-variant item with attribute matrix'}
                </span>
              </div>
              <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setProductType('simple')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    productType === 'simple'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Simple Product
                </button>
                <button
                  type="button"
                  onClick={() => setProductType('variable')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    productType === 'variable'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Variable Product
                </button>
              </div>
            </div>

            {/* 2. Category & Brand */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Category / Group</label>
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(true)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add New
                  </button>
                </div>
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Brand</label>
                  <button
                    type="button"
                    onClick={() => setShowBrandModal(true)}
                    className="text-[11px] font-bold text-purple-600 hover:text-purple-800 flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add New
                  </button>
                </div>
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  <option value="">Select Brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. Item Code, SKU & Barcode */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Item Code</label>
                <input
                  type="text"
                  value={itemCode}
                  onChange={(e) => {
                    const val = e.target.value;
                    setItemCode(val);
                    if (!sku || sku === itemCode) {
                      setSku(val);
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">SKU</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. SHIRT-01"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Barcode</label>
                <div className="relative">
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                  />
                  <button
                    type="button"
                    title="Generate New Code & Barcode"
                    onClick={generateNewCodes}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Preferred Supplier */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Preferred Supplier</label>
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(true)}
                  className="text-[11px] font-bold text-teal-600 hover:text-teal-800 flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add New Supplier
                </button>
              </div>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.short_name ? `[${s.short_name}]` : ''} ({s.supplier_code})
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Item Name / Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Item Description / Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. Premium Cotton Shirt"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
              />
            </div>

            {/* 6. Flat Attributes (Size SL & Style/Size) for Simple Product */}
            {productType === 'simple' && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Size SL</label>
                  <input
                    type="text"
                    value={sizeSl}
                    onChange={(e) => setSizeSl(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-center font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Style / Size</label>
                  <input
                    type="text"
                    value={styleSize}
                    onChange={(e) => setStyleSize(e.target.value)}
                    placeholder="e.g. Slim Fit / L"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}

            {/* 7. Unit of Measure & Reorder Level */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Unit of Measure</label>
                <select
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                >
                  <option value="">Select Unit</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.short_code || u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reorder Level Qty</label>
                <input
                  type="number"
                  min="0"
                  value={reorderQty}
                  onChange={(e) => setReorderQty(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-right"
                />
              </div>
            </div>

            {/* 8. Tax / VAT Configuration */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-white rounded-lg border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tax / VAT Rate (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full pl-3 pr-7 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-900"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">%</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Type</label>
                <select
                  value={taxType}
                  onChange={(e) => {
                    const val = e.target.value as 'exclusive' | 'inclusive' | 'exempt';
                    setTaxType(val);
                    if (val === 'exempt') {
                      setTaxRate(0);
                    }
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-medium text-slate-900"
                >
                  <option value="exclusive">Exclusive (Added to price)</option>
                  <option value="inclusive">Inclusive (Embedded)</option>
                  <option value="exempt">Exempt (0% VAT)</option>
                </select>
              </div>
            </div>

            {/* 9. Pricing Cards: Cost, GP%, Retail, MRP */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-800">Pricing & Margins</label>
                <span className="text-[11px] text-slate-500 font-medium">Auto-syncs GP% and retail price</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Cost Price (৳)</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPrice}
                    onChange={(e) => handleCostChange(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-sm font-bold text-slate-900 border-none p-0 focus:ring-0 mt-1"
                  />
                </div>

                <div className="bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-200/80 shadow-2xs">
                  <span className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider block">GP %</span>
                  <input
                    type="number"
                    step="0.01"
                    value={gpPercent}
                    onChange={(e) => handleGpChange(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-sm font-bold text-indigo-900 border-none p-0 focus:ring-0 mt-1 bg-transparent"
                  />
                </div>

                <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200/80 shadow-2xs">
                  <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider block">Retail Price (৳)</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={retailPrice}
                    onChange={(e) => handleRetailChange(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-sm font-bold text-emerald-900 border-none p-0 focus:ring-0 mt-1 bg-transparent"
                  />
                </div>

                <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-200/80 shadow-2xs">
                  <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider block">MRP (৳)</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={mrp}
                    onChange={(e) => setMrp(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 500"
                    className="w-full text-sm font-bold text-amber-900 border-none p-0 focus:ring-0 mt-1 bg-transparent"
                  />
                </div>
              </div>
            </div>

            {/* 10. Multi-variant Matrix via VariantBuilder for Variable Product */}
            {productType === 'variable' && (
              <div className="pt-4 border-t border-slate-300">
                <div className="mb-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Product Attributes & Variant Matrix
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Define attribute options (Size, Color, etc.) to generate variants with individual SKUs and barcodes.
                  </p>
                </div>
                <VariantBuilder
                  productCodePrefix={itemCode || 'ITM'}
                  baseCostPrice={Number(costPrice) || 0}
                  baseSellingPrice={Number(retailPrice) || 0}
                  baseWholesalePrice={0}
                  baseMrp={Number(mrp) || Number(retailPrice) || 0}
                  initialVariants={customVariants}
                  onChange={(v) => setCustomVariants(v)}
                />
              </div>
            )}
          </div>

          {/* Table Panel */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search catalog by Barcode, SKU, Item Name, or Code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-slate-500 font-medium">
                  Showing <strong>{filteredItems.length}</strong> items
                </span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs bg-white">
              <table className="w-full text-xs text-left border-collapse min-w-[700px]">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">BarCode</th>
                    <th className="px-3 py-2.5">SKU</th>
                    <th className="px-3 py-2.5">Item Name</th>
                    <th className="px-3 py-2.5 text-center">Type</th>
                    <th className="px-3 py-2.5">Supplier</th>
                    <th className="px-3 py-2.5">Group</th>
                    <th className="px-3 py-2.5 text-right">Retail (৳)</th>
                    <th className="px-3 py-2.5 text-right">MRP (৳)</th>
                    <th className="px-3 py-2.5 text-center">Reorder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                        No matching items found. Click <strong>New Item Entry</strong> to add a new product.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => handleSelectRow(row)}
                        className={`cursor-pointer transition-colors ${
                          selectedItemId === row.id ? 'bg-indigo-50/80 font-semibold text-indigo-900' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-3 py-2.5 font-mono text-slate-600">{row.item_barcode}</td>
                        <td className="px-3 py-2.5 font-mono text-indigo-700 font-semibold">{row.sku || row.item_code}</td>
                        <td className="px-3 py-2.5 font-bold text-slate-900">{row.item_name}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              row.product_type === 'variable'
                                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {row.product_type}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900">
                              {row.supplier_name} {row.supplier_short_name ? `(${row.supplier_short_name})` : ''}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">{row.group_name}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                          ৳{row.retail_price.toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium text-amber-900">
                          ৳{(row.mrp || row.retail_price).toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono">{row.reorder_qty}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg text-[11px] text-slate-600 flex items-center justify-between font-mono">
              <span>Catalog Records: <strong>{filteredItems.length}</strong></span>
              <span>Active Selection: <strong>{selectedItemId ? `ID #${selectedItemId}` : 'None (New Item Form)'}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK ADD CATEGORY / GROUP MODAL */}
      {showCategoryModal && (
        <div id="modal-quick-category" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-indigo-600" />
                Add New Category / Group
              </h3>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Category / Group Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Menswear / Electronics"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 font-medium"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Code / Short Code</label>
                <input
                  type="text"
                  placeholder="e.g. MENS"
                  value={catCode}
                  onChange={(e) => setCatCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase font-mono text-slate-900"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-3 py-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingCat}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 cursor-pointer"
                >
                  {creatingCat ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD BRAND MODAL */}
      {showBrandModal && (
        <div id="modal-quick-brand" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-600" />
                Add New Brand
              </h3>
              <button
                type="button"
                onClick={() => setShowBrandModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateBrand} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Brand Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nike / Samsung / Apex"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-slate-900 font-medium"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBrandModal(false)}
                  className="px-3 py-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingBrand}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50 cursor-pointer"
                >
                  {creatingBrand ? 'Saving...' : 'Save Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* QUICK ADD SUPPLIER MODAL */}
      {showSupplierModal && (
        <div id="modal-quick-supplier" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-teal-600" />
                Register New Supplier / Vendor
              </h3>
              <button
                type="button"
                onClick={() => setShowSupplierModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Supplier / Vendor Legal Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TM International / Apex Leather"
                  value={supName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSupName(val);
                    if (!supShortName) {
                      const words = val.trim().split(/\s+/);
                      if (words.length > 0) {
                        const generated = words.map(w => w[0]?.toUpperCase() || '').join('').substring(0, 8);
                        setSupShortName(generated);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900 font-medium"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Supplier Short Name / Alias <span className="text-xs text-teal-600 font-normal">(e.g. TMI)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. TMI"
                  value={supShortName}
                  onChange={(e) => setSupShortName(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile / Phone</label>
                <input
                  type="text"
                  placeholder="e.g. +880 1711-000000"
                  value={supMobile}
                  onChange={(e) => setSupMobile(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-3 py-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSup}
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium disabled:opacity-50 cursor-pointer"
                >
                  {creatingSup ? 'Saving...' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
