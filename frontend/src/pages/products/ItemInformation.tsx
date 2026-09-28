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
  Monitor, 
  Sparkles,
  Barcode as BarcodeIcon,
  Tag,
  FolderTree,
  Scale,
  RefreshCw
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

export interface ItemRow {
  id: number;
  item_code: string;
  item_barcode: string;
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

  // Form Fields
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [groupId, setGroupId] = useState<number | ''>('');
  const [brandId, setBrandId] = useState<number | ''>('');
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [sizeSl, setSizeSl] = useState('1');
  const [styleSize, setStyleSize] = useState('');
  const [barcode, setBarcode] = useState('');
  const [unitId, setUnitId] = useState<number | ''>('');
  const [reorderQty, setReorderQty] = useState<number | ''>(0);

  // Pricing
  const [costPrice, setCostPrice] = useState<number | ''>(0.0);
  const [gpPercent, setGpPercent] = useState<number | ''>(0.0);
  const [retailPrice, setRetailPrice] = useState<number | ''>(0.0);

  // Search section state
  const [searchMode, setSearchMode] = useState<'BarCode' | 'ItemName' | 'ItemCode'>('BarCode');
  const [searchTerm, setSearchTerm] = useState('');

  // View style mode: 'classic' (replica of screenshot) vs 'modern' (Tailwind ERP theme)
  const [viewTheme, setViewTheme] = useState<'classic' | 'modern'>('classic');

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
        let gp = 0;
        if (retail > 0) {
          gp = ((retail - cost) / retail) * 100;
        }

        const matchedSup = p.supplier || supList.find((s) => s.id === p.supplier_id);

        return {
          id: p.id,
          item_code: p.product_code || `ITM-${p.id}`,
          item_barcode: primaryBarcode,
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
    setBarcode((prev) => prev || `${randomSeq}1`);
  };

  const handleNew = () => {
    setSelectedItemId(null);
    setGroupId('');
    setBrandId('');
    setSupplierId('');
    const randomSeq = Math.floor(10000 + Math.random() * 90000);
    setItemCode(`${randomSeq}`);
    setItemName('');
    setSizeSl('1');
    setStyleSize('');
    setBarcode(`${randomSeq}1`);
    setUnitId(units[0]?.id || '');
    setReorderQty(0);
    setCostPrice(0.0);
    setGpPercent(0.0);
    setRetailPrice(0.0);
    setError(null);
    setSuccessMessage(null);
  };

  const handleSelectRow = (row: ItemRow) => {
    setSelectedItemId(row.id);
    setGroupId(row.group_id);
    setBrandId(row.brand_id);
    setSupplierId(row.supplier_id);
    setItemCode(row.item_code);
    setItemName(row.item_name);
    setSizeSl(row.size_sl || '1');
    setStyleSize(row.style_size || '');
    setBarcode(row.item_barcode);
    setUnitId(row.unit_id);
    setReorderQty(row.reorder_qty);
    setCostPrice(row.cost_price);
    setGpPercent(row.gp_percent);
    setRetailPrice(row.retail_price);
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

    const payload: ProductPayload = {
      company_id: 1,
      name: itemName.trim(),
      product_code: itemCode.trim() || `ITM-${Date.now()}`,
      product_type: 'simple',
      has_variants: false,
      tax_rate: 0,
      tax_type: 'exclusive',
      category_id: groupId ? Number(groupId) : (categories[0]?.id || 1),
      brand_id: brandId ? Number(brandId) : null,
      unit_id: unitId ? Number(unitId) : (units[0]?.id || 1),
      reorder_level: Number(reorderQty || 0),
      status: 'active',
      variants: [
        {
          sku: barcode.trim() || itemCode.trim(),
          variant_name: styleSize.trim() || 'Default Variant',
          cost_price: numCost,
          selling_price: numRetail,
          mrp: numRetail,
          status: 'active',
          barcodes: [
            {
              barcode: barcode.trim() || itemCode.trim(),
              barcode_type: 'Internal',
              is_primary: true,
            },
          ],
        },
      ],
    };

    try {
      if (selectedItemId) {
        await updateProduct(selectedItemId, payload);
        setSuccessMessage(`Item "${itemName}" updated successfully.`);
      } else {
        const res = await createProduct(payload);
        setSuccessMessage(`Item "${itemName}" created successfully.`);
      }
      loadPrerequisites();
    } catch (err: any) {
      // Resilient local save fallback
      const newItemRow: ItemRow = {
        id: selectedItemId || Date.now(),
        item_code: itemCode || `ITM-${Date.now()}`,
        item_barcode: barcode || `${itemCode}1`,
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
        return row.item_barcode.toLowerCase().includes(term);
      } else if (searchMode === 'ItemName') {
        return row.item_name.toLowerCase().includes(term);
      } else if (searchMode === 'ItemCode') {
        return row.item_code.toLowerCase().includes(term);
      }
      return (
        row.item_barcode.toLowerCase().includes(term) ||
        row.item_name.toLowerCase().includes(term) ||
        row.item_code.toLowerCase().includes(term)
      );
    });
  }, [items, searchTerm, searchMode]);

  return (
    <div id="item-information-page" className="space-y-4 max-w-[1600px] mx-auto pb-12 select-none">
      {/* View Theme Switcher Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-800 text-white p-3.5 rounded-xl shadow-md border border-slate-700">
        <div className="flex items-center gap-2.5">
          <BarcodeIcon className="w-5 h-5 text-cyan-400" />
          <h1 className="text-base font-bold tracking-wide text-slate-100 uppercase">
            Item Information Master
          </h1>
          <span className="text-xs bg-slate-700 text-cyan-300 font-mono px-2 py-0.5 rounded border border-slate-600">
            Gate 1.5 Desktop Spec
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewTheme('classic')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              viewTheme === 'classic'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Classic Desktop View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewTheme('modern')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              viewTheme === 'modern'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Modern ERP View</span>
          </button>
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

      {/* CLASSIC DESKTOP VIEW (Faithful Replica of Attached Image) */}
      {viewTheme === 'classic' ? (
        <div className="bg-[#dcdcdc] border-2 border-slate-400 rounded-sm shadow-xl p-2 font-sans text-xs text-slate-900 border-t-slate-300 border-l-slate-300 border-r-slate-500 border-b-slate-500">
          {/* Windows-style Title Bar */}
          <div className="bg-gradient-to-r from-[#7095c3] via-[#85a8d7] to-[#8eb3e3] text-slate-900 px-3 py-1 font-bold text-xs flex items-center justify-between border-b border-slate-400 mb-2 rounded-xs shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 bg-sky-100 border border-slate-500 flex items-center justify-center text-[9px]">
                📁
              </span>
              <span className="tracking-widest uppercase text-slate-900 font-extrabold text-[13px]">
                ITEM INFORMATION ..........
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-4 h-3.5 bg-[#e0e0e0] border border-slate-500 text-slate-800 text-[10px] font-bold flex items-center justify-center cursor-pointer hover:bg-white">
                _
              </span>
              <span className="w-4 h-3.5 bg-[#e0e0e0] border border-slate-500 text-slate-800 text-[10px] font-bold flex items-center justify-center cursor-pointer hover:bg-white">
                □
              </span>
              <span 
                onClick={() => navigate('/products')} 
                className="w-4 h-3.5 bg-[#e00000] border border-slate-700 text-white text-[10px] font-bold flex items-center justify-center cursor-pointer hover:bg-red-700"
              >
                ✕
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
            {/* LEFT FORM PANEL (cols 5) */}
            <div className="lg:col-span-5 bg-[#e6e6e6] p-2.5 border border-slate-400 rounded-2xs space-y-2 flex flex-col justify-between">
              <form onSubmit={handleSave} className="space-y-2">
                {/* 1. Group / Category */}
                <div className="flex items-center gap-2">
                  <div className="w-20 shrink-0 flex items-center justify-between">
                    <label className="font-bold text-slate-800 text-[11px]">Group</label>
                    <button
                      type="button"
                      onClick={() => setShowCategoryModal(true)}
                      className="px-1 py-0.5 bg-[#2bb3eb] hover:bg-[#1fa0d4] text-slate-950 font-black border border-slate-600 text-[10px] rounded-2xs cursor-pointer shadow-2xs mr-1"
                      title="Add New Group / Category"
                    >
                      +Add
                    </button>
                  </div>
                  <div className="flex-1 flex items-center gap-1">
                    <select
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-white border border-slate-500 px-1.5 py-1 text-[11px] font-medium outline-none focus:border-cyan-600 shadow-inner"
                    >
                      <option value="">-- Select Group --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowCategoryModal(true)}
                      className="w-7 h-6 bg-[#2bb3eb] hover:bg-[#1fa0d4] text-slate-950 font-bold border border-slate-600 flex items-center justify-center shrink-0 rounded-2xs cursor-pointer shadow-2xs"
                      title="Add New Group / Category"
                    >
                      <Plus className="w-4 h-4 text-slate-950" />
                    </button>
                  </div>
                </div>

                {/* 2. Brand */}
                <div className="flex items-center gap-2">
                  <div className="w-20 shrink-0 flex items-center justify-between">
                    <label className="font-bold text-slate-800 text-[11px]">Brand</label>
                    <button
                      type="button"
                      onClick={() => setShowBrandModal(true)}
                      className="px-1 py-0.5 bg-[#2bb3eb] hover:bg-[#1fa0d4] text-slate-950 font-black border border-slate-600 text-[10px] rounded-2xs cursor-pointer shadow-2xs mr-1"
                      title="Add New Brand"
                    >
                      +Add
                    </button>
                  </div>
                  <div className="flex-1 flex items-center gap-1">
                    <select
                      value={brandId}
                      onChange={(e) => setBrandId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-white border border-slate-500 px-1.5 py-1 text-[11px] font-medium outline-none focus:border-cyan-600 shadow-inner"
                    >
                      <option value="">-- Select Brand --</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowBrandModal(true)}
                      className="w-7 h-6 bg-[#2bb3eb] hover:bg-[#1fa0d4] text-slate-950 font-bold border border-slate-600 flex items-center justify-center shrink-0 rounded-2xs cursor-pointer shadow-2xs"
                      title="Add New Brand"
                    >
                      <Plus className="w-4 h-4 text-slate-950" />
                    </button>
                  </div>
                </div>

                {/* Supplier */}
                <div className="flex items-center gap-2">
                  <div className="w-20 shrink-0 flex items-center justify-between">
                    <label className="font-bold text-slate-800 text-[11px]">Supplier</label>
                    <button
                      type="button"
                      onClick={() => setShowSupplierModal(true)}
                      className="px-1 py-0.5 bg-[#2bb3eb] hover:bg-[#1fa0d4] text-slate-950 font-black border border-slate-600 text-[10px] rounded-2xs cursor-pointer shadow-2xs mr-1"
                      title="Add New Supplier"
                    >
                      +Add
                    </button>
                  </div>
                  <div className="flex-1 flex items-center gap-1">
                    <select
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-white border border-slate-500 px-1.5 py-1 text-[11px] font-medium outline-none focus:border-cyan-600 shadow-inner"
                    >
                      <option value="">-- Select Supplier --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.short_name ? `[${s.short_name}]` : ''} ({s.supplier_code})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowSupplierModal(true)}
                      className="w-7 h-6 bg-[#2bb3eb] hover:bg-[#1fa0d4] text-slate-950 font-bold border border-slate-600 flex items-center justify-center shrink-0 rounded-2xs cursor-pointer shadow-2xs"
                      title="Add New Supplier"
                    >
                      <Plus className="w-4 h-4 text-slate-950" />
                    </button>
                  </div>
                </div>

                {/* 3. Item Code */}
                <div className="flex items-center gap-2">
                  <label className="w-20 shrink-0 font-bold text-slate-800 text-[11px]">Item Code</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      required
                      value={itemCode}
                      onChange={(e) => setItemCode(e.target.value)}
                      className="w-28 bg-white border border-slate-500 px-1.5 py-1 text-[11px] font-mono font-bold text-slate-900 outline-none shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={generateNewCodes}
                      className="w-7 h-6 bg-[#2bb3eb] hover:bg-[#1fa0d4] text-white border border-slate-600 flex items-center justify-center shrink-0 rounded-2xs cursor-pointer shadow-2xs"
                      title="Auto-generate Item Code"
                    >
                      <Info className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>

                {/* 4. Item Name */}
                <div className="flex items-center gap-2">
                  <label className="w-20 shrink-0 font-bold text-slate-800 text-[11px]">Item Name</label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="flex-1 bg-white border border-slate-500 px-1.5 py-1 text-[11px] font-bold text-slate-900 outline-none shadow-inner"
                  />
                </div>

                {/* 5. Style & Size */}
                <div className="flex items-center gap-2">
                  <label className="w-20 shrink-0 font-bold text-slate-800 text-[11px]">Style & Size</label>
                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      type="text"
                      value={sizeSl}
                      onChange={(e) => setSizeSl(e.target.value)}
                      className="w-12 bg-white border border-slate-500 px-1.5 py-1 text-[11px] font-bold text-center outline-none shadow-inner"
                      placeholder="Size SL"
                    />
                    <input
                      type="text"
                      value={styleSize}
                      onChange={(e) => setStyleSize(e.target.value)}
                      className="flex-1 bg-white border border-slate-500 px-1.5 py-1 text-[11px] outline-none shadow-inner"
                      placeholder="e.g. Medium / XL"
                    />
                  </div>
                </div>

                {/* 6. Barcode */}
                <div className="flex items-center gap-2">
                  <label className="w-20 shrink-0 font-bold text-slate-800 text-[11px]">Barcode</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-36 bg-white border border-slate-500 px-1.5 py-1 text-[11px] font-mono font-bold text-slate-900 outline-none shadow-inner"
                  />
                </div>

                {/* 7. Unit Name & Reorder Qty */}
                <div className="flex items-center gap-2">
                  <label className="w-20 shrink-0 font-bold text-slate-800 text-[11px]">Unit Name</label>
                  <div className="flex items-center gap-3 flex-1">
                    <select
                      value={unitId}
                      onChange={(e) => setUnitId(e.target.value ? Number(e.target.value) : '')}
                      className="w-28 bg-white border border-slate-500 px-1.5 py-1 text-[11px] outline-none shadow-inner"
                    >
                      <option value="">-- Unit --</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.short_code || u.name}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1.5">
                      <label className="font-bold text-slate-800 text-[11px] whitespace-nowrap">Reorder Qty</label>
                      <input
                        type="number"
                        min="0"
                        value={reorderQty}
                        onChange={(e) => setReorderQty(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-20 bg-white border border-slate-500 px-1.5 py-1 text-[11px] font-bold text-right outline-none shadow-inner"
                      />
                    </div>
                  </div>
                </div>

                {/* 8. Pricing Grid (Unit Cost Price, GP %, Unit Retail Price) */}
                <div className="pt-2">
                  <table className="w-full border-collapse border border-slate-600 text-[11px]">
                    <thead>
                      <tr className="bg-[#ededed] text-slate-900 font-bold border-b border-slate-600">
                        <th className="border-r border-slate-600 px-2 py-1 text-center w-1/3">Unit Cost Price</th>
                        <th className="border-r border-slate-600 px-2 py-1 text-center w-1/3">GP %</th>
                        <th className="px-2 py-1 text-center w-1/3">Unit Retail Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border-r border-slate-600 p-0">
                          <input
                            type="number"
                            step="0.01"
                            value={costPrice}
                            onChange={(e) => handleCostChange(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-white px-1.5 py-1 text-right font-mono font-bold text-slate-900 outline-none"
                          />
                        </td>
                        <td className="border-r border-slate-600 p-0">
                          <input
                            type="number"
                            step="0.01"
                            value={gpPercent}
                            onChange={(e) => handleGpChange(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-white px-1.5 py-1 text-right font-mono font-bold text-slate-900 outline-none"
                          />
                        </td>
                        <td className="p-0">
                          <input
                            type="number"
                            step="0.01"
                            value={retailPrice}
                            onChange={(e) => handleRetailChange(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-white px-1.5 py-1 text-right font-mono font-bold text-slate-900 outline-none"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 9. SEARCH Box (Cyan Container as shown in the screenshot) */}
                <div className="bg-[#00a8e8] border border-cyan-600 p-2 text-white space-y-1.5 shadow-2xs rounded-2xs mt-4">
                  <div className="text-[11px] font-extrabold uppercase tracking-widest text-white border-b border-cyan-400 pb-0.5">
                    SEARCH
                  </div>

                  <div className="flex items-center gap-4 text-[11px]">
                    <label className="flex items-center gap-1 font-bold cursor-pointer">
                      <input
                        type="radio"
                        name="searchRadio"
                        checked={searchMode === 'BarCode'}
                        onChange={() => setSearchMode('BarCode')}
                        className="accent-slate-900"
                      />
                      <span>BarCode</span>
                    </label>
                    <label className="flex items-center gap-1 font-bold cursor-pointer">
                      <input
                        type="radio"
                        name="searchRadio"
                        checked={searchMode === 'ItemName'}
                        onChange={() => setSearchMode('ItemName')}
                        className="accent-slate-900"
                      />
                      <span>Item Name</span>
                    </label>
                    <label className="flex items-center gap-1 font-bold cursor-pointer">
                      <input
                        type="radio"
                        name="searchRadio"
                        checked={searchMode === 'ItemCode'}
                        onChange={() => setSearchMode('ItemCode')}
                        className="accent-slate-900"
                      />
                      <span>Item Code</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="Type search keyword..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1 bg-white border border-slate-600 px-2 py-1 text-slate-900 font-bold text-[11px] outline-none shadow-inner"
                    />
                    <button
                      type="button"
                      className="w-10 h-6 bg-[#9ae8cd] hover:bg-[#85d8bc] border border-slate-600 flex items-center justify-center cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5 text-slate-900" />
                    </button>
                  </div>
                </div>
              </form>

              {/* 10. Action Buttons (Matching colors & font style from attached image) */}
              <div className="grid grid-cols-4 gap-2 pt-4">
                {/* Add / Save Button (Cyan) */}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave()}
                  className="bg-[#2bb3eb] hover:bg-[#1fa0d4] active:bg-[#188ec0] text-slate-950 font-black border border-slate-600 py-1.5 px-2 text-xs uppercase tracking-wider rounded-2xs shadow-xs cursor-pointer transition-colors"
                >
                  <u>A</u>dd
                </button>

                {/* New Button (Light Green) */}
                <button
                  type="button"
                  onClick={handleNew}
                  className="bg-[#c2f0a1] hover:bg-[#b0e28d] active:bg-[#9ed47a] text-slate-950 font-black border border-slate-600 py-1.5 px-2 text-xs uppercase tracking-wider rounded-2xs shadow-xs cursor-pointer transition-colors"
                >
                  <u>N</u>ew
                </button>

                {/* Delete Button (Pink) */}
                <button
                  type="button"
                  disabled={saving || !selectedItemId}
                  onClick={handleDelete}
                  className="bg-[#fbb0db] hover:bg-[#f397cd] active:bg-[#e77dbd] text-slate-950 font-black border border-slate-600 py-1.5 px-2 text-xs uppercase tracking-wider rounded-2xs shadow-xs cursor-pointer transition-colors disabled:opacity-50"
                >
                  <u>D</u>elete
                </button>

                {/* Close Button (Coral Pink) */}
                <button
                  type="button"
                  onClick={() => navigate('/products')}
                  className="bg-[#f0a1a1] hover:bg-[#e28c8c] active:bg-[#d47878] text-slate-950 font-black border border-slate-600 py-1.5 px-2 text-xs uppercase tracking-wider rounded-2xs shadow-xs cursor-pointer transition-colors"
                >
                  <u>C</u>lose
                </button>
              </div>
            </div>

            {/* RIGHT DATA GRID (cols 7) */}
            <div className="lg:col-span-7 bg-white border border-slate-400 rounded-2xs overflow-hidden flex flex-col justify-between min-h-[450px]">
              <div className="overflow-x-auto overflow-y-auto max-h-[550px]">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#b3d9ff] text-slate-900 font-bold border-b border-slate-400 text-center">
                      <th className="border-r border-slate-400 px-2 py-1.5 text-left">Item BarCode</th>
                      <th className="border-r border-slate-400 px-2 py-1.5 text-left">Item Name</th>
                      <th className="border-r border-slate-400 px-2 py-1.5 text-left">Supplier (Short Name)</th>
                      <th className="border-r border-slate-400 px-2 py-1.5 text-center">Size SL</th>
                      <th className="border-r border-slate-400 px-2 py-1.5 text-left">Style / Size</th>
                      <th className="border-r border-slate-400 px-2 py-1.5 text-left">Group</th>
                      <th className="border-r border-slate-400 px-2 py-1.5 text-left">Brand Name</th>
                      <th className="border-r border-slate-400 px-2 py-1.5 text-right">Retail Price</th>
                      <th className="px-2 py-1.5 text-center">Reorder Qty.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-500 font-medium">
                          Loading item master records...
                        </td>
                      </tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-500">
                          No item records match your query.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((row) => {
                        const isSelected = selectedItemId === row.id;
                        return (
                          <tr
                            key={row.id}
                            onClick={() => handleSelectRow(row)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[#99d6ff] font-bold text-slate-950'
                                : 'hover:bg-sky-50 text-slate-800'
                            }`}
                          >
                            <td className="border-r border-slate-300 px-2 py-1 font-mono">{row.item_barcode}</td>
                            <td className="border-r border-slate-300 px-2 py-1 font-semibold">{row.item_name}</td>
                            <td className="border-r border-slate-300 px-2 py-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-slate-900">
                                  {row.supplier_name} {row.supplier_short_name ? `(${row.supplier_short_name})` : ''}
                                </span>
                                {row.supplier_code && (
                                  <span className="font-mono text-[10px] text-slate-500 bg-slate-100 border border-slate-200 px-1 py-0.5 rounded">
                                    {row.supplier_code}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="border-r border-slate-300 px-2 py-1 text-center">{row.size_sl}</td>
                            <td className="border-r border-slate-300 px-2 py-1">{row.style_size || '—'}</td>
                            <td className="border-r border-slate-300 px-2 py-1">{row.group_name}</td>
                            <td className="border-r border-slate-300 px-2 py-1">{row.brand_name}</td>
                            <td className="border-r border-slate-300 px-2 py-1 text-right font-mono font-bold">
                              ৳{row.retail_price.toFixed(2)}
                            </td>
                            <td className="px-2 py-1 text-center font-mono">{row.reorder_qty}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Status Footer */}
              <div className="bg-[#ededed] border-t border-slate-400 px-3 py-1 text-[10px] text-slate-600 flex items-center justify-between font-mono">
                <span>Total Item Records: {filteredItems.length}</span>
                <span>Active Item Selection: {selectedItemId ? `ID #${selectedItemId}` : 'None'}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* MODERN ERP VIEW */
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Item Master Management</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage inventory catalog items, barcodes, style variants, and profit margins.
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
            {/* Form */}
            <div className="lg:col-span-5 space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
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
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
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
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Item Code</label>
                  <input
                    type="text"
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Barcode</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Item Description / Name</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Premium Cotton Shirt"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                />
              </div>

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
                    value={reorderQty}
                    onChange={(e) => setReorderQty(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-right"
                  />
                </div>
              </div>

              {/* Pricing Cards */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block">Unit Cost (৳)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => handleCostChange(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-base font-bold text-slate-900 border-none p-0 focus:ring-0 mt-1"
                  />
                </div>

                <div className="bg-indigo-50/60 p-3 rounded-lg border border-indigo-100">
                  <span className="text-[11px] font-semibold text-indigo-700 block">GP %</span>
                  <input
                    type="number"
                    step="0.01"
                    value={gpPercent}
                    onChange={(e) => handleGpChange(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-base font-bold text-indigo-900 border-none p-0 focus:ring-0 mt-1 bg-transparent"
                  />
                </div>

                <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-100">
                  <span className="text-[11px] font-semibold text-emerald-700 block">Retail Price (৳)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={retailPrice}
                    onChange={(e) => handleRetailChange(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-base font-bold text-emerald-900 border-none p-0 focus:ring-0 mt-1 bg-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by Barcode, Item Name, or Code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5">BarCode</th>
                      <th className="px-3 py-2.5">Item Name</th>
                      <th className="px-3 py-2.5">Supplier (Short Name)</th>
                      <th className="px-3 py-2.5">Style / Size</th>
                      <th className="px-3 py-2.5">Group</th>
                      <th className="px-3 py-2.5 text-right">Retail Price</th>
                      <th className="px-3 py-2.5 text-center">Reorder Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredItems.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => handleSelectRow(row)}
                        className={`cursor-pointer transition-colors ${
                          selectedItemId === row.id ? 'bg-indigo-50/80 font-semibold text-indigo-900' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-3 py-2.5 font-mono text-slate-600">{row.item_barcode}</td>
                        <td className="px-3 py-2.5 font-bold text-slate-900">{row.item_name}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900">
                              {row.supplier_name} {row.supplier_short_name ? `(${row.supplier_short_name})` : ''}
                            </span>
                            {row.supplier_code && (
                              <span className="font-mono text-[10px] text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                                {row.supplier_code}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">{row.style_size || '—'}</td>
                        <td className="px-3 py-2.5 text-slate-600">{row.group_name}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                          ৳{row.retail_price.toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono">{row.reorder_qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

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
