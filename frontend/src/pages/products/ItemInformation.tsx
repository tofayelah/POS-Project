import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  Save,
  RotateCcw,
  Sparkles,
  Barcode as BarcodeIcon,
  Tag,
  Layers,
  Scale,
  Building2,
  AlertCircle,
  CheckCircle2,
  X,
  Download,
  Filter,
  TrendingUp,
  Info,
  ChevronRight,
  ShieldAlert,
  Boxes,
  HelpCircle,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getBrands,
  getUnits,
  createCategory,
  createBrand,
  getStoredProducts,
} from '../../api/products';
import { getSuppliers } from '../../api/suppliers';
import { Category, Brand, Unit, Product, ProductPayload } from '../../types/product';
import { Supplier } from '../../types/supplier';

export const ItemInformation: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlProductId = searchParams.get('id');

  // Master Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Page & Form State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Selected Item for Edit Mode
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form Fields State
  const [productType, setProductType] = useState<'simple' | 'variable' | 'service' | 'combo'>('simple');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [brandId, setBrandId] = useState<number | ''>('');
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [productCode, setProductCode] = useState<string>('');
  const [sku, setSku] = useState<string>('');
  const [barcode, setBarcode] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [sizeStyle, setSizeStyle] = useState<string>('');
  const [unitId, setUnitId] = useState<number | ''>('');
  const [reorderLevel, setReorderLevel] = useState<number>(10);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [taxType, setTaxType] = useState<'inclusive' | 'exclusive' | 'exempt'>('exclusive');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [gpPercent, setGpPercent] = useState<number>(20);
  const [retailPrice, setRetailPrice] = useState<number>(0);
  const [mrp, setMrp] = useState<number>(0);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [description, setDescription] = useState<string>('');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterBrand, setFilterBrand] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Inline Modals
  const [showAddCategoryModal, setShowAddCategoryModal] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatCode, setNewCatCode] = useState<string>('');

  const [showAddBrandModal, setShowAddBrandModal] = useState<boolean>(false);
  const [newBrandName, setNewBrandName] = useState<string>('');
  const [newBrandCode, setNewBrandCode] = useState<string>('');

  const [viewProductDetail, setViewProductDetail] = useState<Product | null>(null);

  // Initial Load
  useEffect(() => {
    loadAllMasterData();
  }, []);

  // Handle URL parameter editing
  useEffect(() => {
    if (urlProductId && products.length > 0) {
      const pid = Number(urlProductId);
      const found = products.find((p) => Number(p.id) === pid);
      if (found) {
        populateFormForEdit(found);
      }
    }
  }, [urlProductId, products]);

  const loadAllMasterData = async () => {
    setIsLoading(true);
    try {
      const [prodsRes, catsRes, brandsRes, unitsRes, suppsRes] = await Promise.all([
        getProducts({ all: true }),
        getCategories({ all: true }),
        getBrands({ all: true }),
        getUnits({ all: true }),
        getSuppliers().catch(() => ({ success: true, data: [] })),
      ]);

      const loadedProds: Product[] = Array.isArray(prodsRes.data)
        ? prodsRes.data
        : prodsRes.data?.data || [];
      const loadedCats: Category[] = Array.isArray(catsRes.data)
        ? catsRes.data
        : catsRes.data?.data || [];
      const loadedBrands: Brand[] = Array.isArray(brandsRes.data)
        ? brandsRes.data
        : brandsRes.data?.data || [];
      const loadedUnits: Unit[] = Array.isArray(unitsRes.data)
        ? unitsRes.data
        : unitsRes.data?.data || [];
      const loadedSupps: Supplier[] = Array.isArray(suppsRes.data)
        ? suppsRes.data
        : (suppsRes.data as any)?.data || [];

      const storedLocal = getStoredProducts();
      const mergedProds = [...loadedProds];
      storedLocal.forEach((sp) => {
        if (!mergedProds.some((p) => Number(p.id) === Number(sp.id))) {
          mergedProds.unshift(sp);
        }
      });

      setProducts(mergedProds);
      setCategories(loadedCats);
      setBrands(loadedBrands);
      setUnits(loadedUnits);
      setSuppliers(loadedSupps);

      // Defaults for creation if not editing
      if (!editingId) {
        const catIdToUse = loadedCats.length > 0 ? Number(loadedCats[0].id) : '';
        const brandIdToUse = loadedBrands.length > 0 ? Number(loadedBrands[0].id) : '';
        const unitIdToUse = loadedUnits.length > 0 ? Number(loadedUnits[0].id) : '';

        if (!categoryId && catIdToUse) setCategoryId(catIdToUse);
        if (!brandId && brandIdToUse) setBrandId(brandIdToUse);
        if (!unitId && unitIdToUse) setUnitId(unitIdToUse);

        // Auto Generate Item Code, SKU, and Barcode automatically on load if empty
        if (!productCode || !sku || !barcode) {
          const auto = generateAutoCodes(catIdToUse, brandIdToUse, name, loadedCats, loadedBrands);
          if (!productCode) setProductCode(auto.code);
          if (!sku) setSku(auto.sku);
          if (!barcode) setBarcode(auto.barcode);
        }
      }
    } catch (err) {
      console.error('Failed to load Item Master data:', err);
      showFeedback('error', 'Failed to load configuration data from server.');
    } finally {
      setIsLoading(false);
    }
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  // Pricing & GP% Dynamic Math Helpers
  const handleCostPriceChange = (val: number) => {
    setCostPrice(val);
    if (gpPercent !== 0) {
      const calculatedRetail = Number((val * (1 + gpPercent / 100)).toFixed(2));
      setRetailPrice(calculatedRetail);
      if (mrp === 0 || mrp < calculatedRetail) {
        setMrp(calculatedRetail);
      }
    } else if (retailPrice > 0) {
      const calcGp = val > 0 ? Number((((retailPrice - val) / val) * 100).toFixed(2)) : 0;
      setGpPercent(calcGp);
    }
  };

  const handleGpPercentChange = (val: number) => {
    setGpPercent(val);
    if (costPrice > 0) {
      const calculatedRetail = Number((costPrice * (1 + val / 100)).toFixed(2));
      setRetailPrice(calculatedRetail);
      if (mrp === 0 || mrp < calculatedRetail) {
        setMrp(calculatedRetail);
      }
    }
  };

  const handleRetailPriceChange = (val: number) => {
    setRetailPrice(val);
    if (costPrice > 0) {
      const calcGp = Number((((val - costPrice) / costPrice) * 100).toFixed(2));
      setGpPercent(calcGp);
    }
    if (mrp === 0 || mrp < val) {
      setMrp(val);
    }
  };

  // Mathematical EAN-13 Check Digit Calculator
  const calculateEAN13CheckDigit = (first12Digits: string): number => {
    let oddSum = 0;
    let evenSum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(first12Digits.charAt(i), 10) || 0;
      if (i % 2 === 0) {
        oddSum += digit;
      } else {
        evenSum += digit;
      }
    }
    const total = oddSum + evenSum * 3;
    const remainder = total % 10;
    return remainder === 0 ? 0 : 10 - remainder;
  };

  const generateValidEAN13 = (prefix = '880'): string => {
    const randomDigits = Math.floor(10000008 + Math.random() * 89999991).toString();
    const first12 = (prefix + randomDigits).substring(0, 12);
    const checkDigit = calculateEAN13CheckDigit(first12);
    return `${first12}${checkDigit}`;
  };

  // Auto Code / SKU / Barcode Generators
  const generateAutoCodes = (
    targetCatId?: number | '',
    targetBrandId?: number | '',
    targetName?: string,
    catList = categories,
    brandList = brands
  ) => {
    const nextNum = Math.floor(1000 + Math.random() * 9000);
    const code = `PRD-${nextNum}`;

    const cId = targetCatId ?? categoryId;
    const bId = targetBrandId ?? brandId;
    const iName = targetName ?? name;

    const selectedCat = catList.find((c) => Number(c.id) === Number(cId));
    const selectedBrand = brandList.find((b) => Number(b.id) === Number(bId));

    const catPrefix = selectedCat?.code || selectedCat?.name?.substring(0, 3).toUpperCase() || 'CAT';
    const brandPrefix = selectedBrand?.code || selectedBrand?.name?.substring(0, 3).toUpperCase() || 'BRD';
    const namePart = iName ? iName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase() : 'ITEM';
    const randDigits = Math.floor(100 + Math.random() * 900);

    const generatedSku = `${brandPrefix}-${catPrefix}-${namePart}${randDigits}`;
    const generatedBarcode = generateValidEAN13('880');

    return { code, sku: generatedSku, barcode: generatedBarcode };
  };

  const handleAutoGenerateCode = () => {
    const nextNum = Math.floor(1000 + Math.random() * 9000);
    setProductCode(`PRD-${nextNum}`);
  };

  const handleAutoGenerateSku = () => {
    const auto = generateAutoCodes();
    setSku(auto.sku);
    if (!barcode) {
      setBarcode(auto.barcode);
    }
  };

  const handleAutoGenerateBarcode = () => {
    setBarcode(generateValidEAN13('880'));
  };

  const handleCategoryChange = (val: number | '') => {
    setCategoryId(val);
    if (!editingId) {
      const auto = generateAutoCodes(val, brandId, name);
      setSku(auto.sku);
      if (!barcode) setBarcode(auto.barcode);
      if (!productCode) setProductCode(auto.code);
    }
  };

  const handleBrandChange = (val: number | '') => {
    setBrandId(val);
    if (!editingId) {
      const auto = generateAutoCodes(categoryId, val, name);
      setSku(auto.sku);
      if (!barcode) setBarcode(auto.barcode);
      if (!productCode) setProductCode(auto.code);
    }
  };

  // Reset Form
  const handleResetForm = () => {
    setEditingId(null);
    setSearchParams({});
    setName('');
    setSizeStyle('');
    setDescription('');
    setCostPrice(0);
    setGpPercent(20);
    setRetailPrice(0);
    setMrp(0);
    setReorderLevel(10);
    setTaxRate(0);
    setTaxType('exclusive');
    setProductType('simple');
    setStatus('ACTIVE');

    const catIdToUse = categories.length > 0 ? Number(categories[0].id) : '';
    const brandIdToUse = brands.length > 0 ? Number(brands[0].id) : '';
    const unitIdToUse = units.length > 0 ? Number(units[0].id) : '';
    const suppIdToUse = suppliers.length > 0 ? Number(suppliers[0].id) : '';

    if (catIdToUse !== '') setCategoryId(catIdToUse);
    if (brandIdToUse !== '') setBrandId(brandIdToUse);
    if (unitIdToUse !== '') setUnitId(unitIdToUse);
    if (suppIdToUse !== '') setSupplierId(suppIdToUse);

    // Auto-generate fresh Item Code, SKU, and Barcode on form reset
    const auto = generateAutoCodes(catIdToUse, brandIdToUse, '');
    setProductCode(auto.code);
    setSku(auto.sku);
    setBarcode(auto.barcode);
  };

  // Keyboard Navigation: Enter key moves focus to next field in sequence
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      // Allow default Enter behavior in textareas and on buttons (e.g. submit or modal trigger)
      if (target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') {
        return;
      }

      e.preventDefault(); // Intercept Enter to prevent unintended form submit on intermediate fields

      const form = e.currentTarget;
      const selector = 'input:not([type="hidden"]):not([disabled]), select:not([disabled]), button[type="submit"]';
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

  // Populate Form for Editing
  const populateFormForEdit = (prod: Product) => {
    setEditingId(Number(prod.id));
    setSearchParams({ id: String(prod.id) });
    setName(prod.name || '');
    setProductCode(prod.product_code || '');
    setSku(prod.sku || '');
    setCategoryId(prod.category_id ? Number(prod.category_id) : '');
    setBrandId(prod.brand_id ? Number(prod.brand_id) : '');
    setUnitId(prod.unit_id ? Number(prod.unit_id) : '');
    setProductType((prod.product_type as any) || 'simple');
    setStatus((prod.status?.toUpperCase() as any) || 'ACTIVE');
    setReorderLevel(prod.reorder_level || 10);
    setTaxRate(prod.tax_rate || 0);
    setTaxType((prod.tax_type as any) || 'exclusive');
    setDescription(prod.description || '');

    const variants = prod.variants || [];
    if (variants.length > 0) {
      const v0 = variants[0];
      setCostPrice(Number(v0.cost_price) || 0);
      const retail = Number(v0.selling_price || v0.price) || 0;
      setRetailPrice(retail);
      setMrp(Number(v0.mrp) || retail);
      const cPrice = Number(v0.cost_price) || 0;
      if (cPrice > 0 && retail > 0) {
        setGpPercent(Number((((retail - cPrice) / cPrice) * 100).toFixed(2)));
      } else {
        setGpPercent(20);
      }
      if (v0.barcodes && v0.barcodes.length > 0) {
        setBarcode(v0.barcodes[0].barcode || '');
      } else {
        setBarcode('');
      }
    } else {
      setCostPrice(0);
      setRetailPrice(Number(prod.price) || 0);
      setMrp(Number(prod.price) || 0);
      setGpPercent(20);
      setBarcode('');
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!name.trim()) {
      showFeedback('error', 'Item Name is required.');
      return;
    }
    if (!categoryId) {
      showFeedback('error', 'Please select a Category/Group.');
      return;
    }
    if (!unitId) {
      showFeedback('error', 'Please select a Unit of Measure.');
      return;
    }

    // Check product_type support in backend
    if (productType === 'service' || productType === 'combo') {
      showFeedback(
        'error',
        `Product type "${productType.toUpperCase()}" requires the upcoming Service & Kit/Combo Management module. Please select "simple" or "variable" for direct Item Master records.`
      );
      return;
    }

    const finalCode = productCode.trim() || `PRD-${Math.floor(1000 + Math.random() * 9000)}`;
    const finalSku = sku.trim() || `${finalCode}-SKU`;

    setIsSaving(true);

    const payload: ProductPayload = {
      name: name.trim(),
      product_code: finalCode,
      sku: finalSku,
      category_id: Number(categoryId),
      brand_id: brandId ? Number(brandId) : undefined,
      unit_id: Number(unitId),
      product_type: productType,
      has_variants: productType === 'variable',
      reorder_level: Number(reorderLevel),
      tax_rate: Number(taxRate),
      tax_type: taxType,
      status: (status.toLowerCase() as any) || 'active',
      description: description.trim() || undefined,
      variants: [
        {
          id: editingId ? undefined : 1,
          sku: finalSku,
          variant_name: sizeStyle ? `${name.trim()} (${sizeStyle})` : name.trim(),
          cost_price: Number(costPrice),
          selling_price: Number(retailPrice),
          mrp: Number(mrp) || Number(retailPrice),
          status: (status.toLowerCase() as any) || 'active',
          barcodes: barcode.trim()
            ? [{ barcode: barcode.trim(), barcode_type: 'EAN', is_primary: true }]
            : [],
        },
      ],
    };

    try {
      if (editingId) {
        const res = await updateProduct(editingId, payload);
        if (res.success) {
          showFeedback('success', `Item "${name}" updated successfully.`);
          if (res.data) {
            const updatedItem = res.data;
            setProducts((prev) =>
              prev.map((p) => (Number(p.id) === Number(editingId) ? { ...p, ...updatedItem } : p))
            );
          }
          await loadAllMasterData();
        } else {
          showFeedback('error', res.message || 'Failed to update item.');
        }
      } else {
        const res = await createProduct(payload);
        if (res.success) {
          showFeedback('success', `Item "${name}" created successfully.`);
          handleResetForm();
          // Reset table filter states so newly added item is not filtered out
          setSearchQuery('');
          setFilterCategory('ALL');
          setFilterBrand('ALL');
          setFilterStatus('ALL');

          if (res.data) {
            const createdItem = res.data;
            setProducts((prev) => [createdItem, ...prev.filter((p) => Number(p.id) !== Number(createdItem.id))]);
          }
          await loadAllMasterData();
        } else {
          showFeedback('error', res.message || 'Failed to create item.');
        }
      }
    } catch (err: any) {
      showFeedback('error', err?.response?.data?.message || 'Server error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Handler
  const handleDeleteProduct = async (id: number, prodName: string) => {
    if (!window.confirm(`Are you sure you want to delete item "${prodName}"?`)) return;

    try {
      const res = await deleteProduct(id);
      if (res.success) {
        showFeedback('success', `Item "${prodName}" deleted successfully.`);
        if (editingId === id) {
          handleResetForm();
        }
        await loadAllMasterData();
      } else {
        showFeedback('error', res.message || 'Failed to delete item.');
      }
    } catch (err: any) {
      showFeedback('error', 'Error deleting item.');
    }
  };

  // Inline Category Creation
  const handleCreateCategoryInline = async () => {
    if (!newCatName.trim()) {
      showFeedback('error', 'Category Name is required.');
      return;
    }
    try {
      const res = await createCategory({
        name: newCatName.trim(),
        code: newCatCode.trim() || undefined,
        status: 'active',
      });
      if (res.success && res.data) {
        const createdCat = res.data;
        setCategories((prev) => [createdCat, ...prev.filter((c) => Number(c.id) !== Number(createdCat.id))]);
        setCategoryId(Number(createdCat.id));
        setNewCatName('');
        setNewCatCode('');
        setShowAddCategoryModal(false);
        showFeedback('success', `Category "${createdCat.name}" added successfully.`);
      } else {
        showFeedback('error', res.message || 'Failed to add category.');
      }
    } catch (err: any) {
      showFeedback('error', err?.response?.data?.message || err?.message || 'Failed to add category.');
    }
  };

  // Inline Brand Creation
  const handleCreateBrandInline = async () => {
    if (!newBrandName.trim()) {
      showFeedback('error', 'Brand Name is required.');
      return;
    }
    try {
      const res = await createBrand({
        name: newBrandName.trim(),
        code: newBrandCode.trim() || undefined,
        status: 'active',
      });
      if (res.success && res.data) {
        const createdBrand = res.data;
        setBrands((prev) => [createdBrand, ...prev.filter((b) => Number(b.id) !== Number(createdBrand.id))]);
        setBrandId(Number(createdBrand.id));
        setNewBrandName('');
        setNewBrandCode('');
        setShowAddBrandModal(false);
        showFeedback('success', `Brand "${createdBrand.name}" added successfully.`);
      } else {
        showFeedback('error', res.message || 'Failed to add brand.');
      }
    } catch (err: any) {
      showFeedback('error', err?.response?.data?.message || err?.message || 'Failed to add brand.');
    }
  };

  // Filtered Products Catalog
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name?.toLowerCase().includes(q);
        const matchesCode = p.product_code?.toLowerCase().includes(q);
        const matchesSku = p.sku?.toLowerCase().includes(q);
        const matchesBarcode = p.variants?.some((v) =>
          v.barcodes?.some((b: any) => String(b.barcode).toLowerCase().includes(q))
        );
        if (!matchesName && !matchesCode && !matchesSku && !matchesBarcode) return false;
      }

      // Category
      if (filterCategory !== 'ALL' && Number(p.category_id) !== Number(filterCategory)) {
        return false;
      }

      // Brand
      if (filterBrand !== 'ALL' && Number(p.brand_id) !== Number(filterBrand)) {
        return false;
      }

      // Status
      if (filterStatus !== 'ALL') {
        const pStatus = (p.status || 'ACTIVE').toUpperCase();
        if (pStatus !== filterStatus) return false;
      }

      return true;
    });
  }, [products, searchQuery, filterCategory, filterBrand, filterStatus]);

  // Catalog Metrics Summary
  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => (p.status || 'ACTIVE').toUpperCase() === 'ACTIVE').length;
    const lowStock = products.filter((p) => {
      const totalStock = p.variants?.reduce((sum, v) => sum + (v.available_quantity || 0), 0) || 0;
      return totalStock <= (p.reorder_level || 10);
    }).length;

    let gpSum = 0;
    let count = 0;
    products.forEach((p) => {
      const v0 = p.variants?.[0];
      if (v0 && Number(v0.cost_price) > 0 && Number(v0.selling_price) > 0) {
        const cost = Number(v0.cost_price);
        const retail = Number(v0.selling_price);
        gpSum += ((retail - cost) / cost) * 100;
        count++;
      }
    });
    const avgGp = count > 0 ? (gpSum / count).toFixed(1) : '20.0';

    return { total, active, lowStock, avgGp };
  }, [products]);

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['ID', 'Item Code', 'SKU', 'Item Name', 'Category', 'Brand', 'Cost Price (BDT)', 'Retail Price (BDT)', 'GP %', 'Reorder Level', 'Status'];
    const rows = filteredProducts.map((p) => {
      const v0 = p.variants?.[0];
      const cost = Number(v0?.cost_price || 0);
      const retail = Number(v0?.selling_price || p.price || 0);
      const gp = cost > 0 ? (((retail - cost) / cost) * 100).toFixed(1) : '0.0';
      return [
        p.id,
        `"${p.product_code || ''}"`,
        `"${p.sku || ''}"`,
        `"${p.name || ''}"`,
        `"${p.category?.name || ''}"`,
        `"${p.brand?.name || ''}"`,
        cost,
        retail,
        `"${gp}%"`,
        p.reorder_level || 10,
        p.status || 'ACTIVE',
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RetailCore_Item_Master_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto text-slate-800">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl text-white shadow-sm ring-1 ring-indigo-500/30">
            <BarcodeIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Item Information Master
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                POS ERP V2
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Unified Product Master Data, SKUs, Retail Pricing & Supplier Catalog Management
            </p>
          </div>
        </div>

        {/* Action Buttons & Quick Stats Header Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadAllMasterData}
            title="Refresh Product Catalog"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export CSV
          </button>
          <button
            onClick={handleResetForm}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + New Item
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-sm font-semibold flex items-center justify-between shadow-2xs transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 hover:bg-black/5 rounded-lg text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main 2-Column Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Item Master Form (5 cols on desktop) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden sticky top-6">
          <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                {editingId ? `Edit Item Master #${editingId}` : 'New Item Master Entry'}
              </h2>
            </div>
            {editingId && (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Editing Mode
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="p-5 space-y-5 text-xs">
            {/* Section 1: Classification */}
            <div className="space-y-3 p-3.5 bg-slate-50/50 rounded-xl border border-slate-100">
              <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-500" /> Item Classification
              </div>

              {/* Product Type */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Type</label>
                <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-lg">
                  {(['simple', 'variable', 'service', 'combo'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setProductType(type)}
                      className={`py-1.5 text-[11px] font-bold rounded-md capitalize transition-all cursor-pointer ${
                        productType === type
                          ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category & Brand Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Category Dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Category / Group <span className="text-rose-500">*</span></label>
                    <button
                      type="button"
                      onClick={() => setShowAddCategoryModal(true)}
                      className="text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add New
                    </button>
                  </div>
                  <select
                    value={categoryId}
                    onChange={(e) => handleCategoryChange(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    required
                  >
                    <option value="">Select Category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.code ? `(${c.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Brand Dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Brand</label>
                    <button
                      type="button"
                      onClick={() => setShowAddBrandModal(true)}
                      className="text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add New
                    </button>
                  </div>
                  <select
                    value={brandId}
                    onChange={(e) => handleBrandChange(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="">Select Brand...</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.code ? `(${b.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preferred Supplier */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Preferred Supplier</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="">Select Supplier...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.supplier_code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Section 2: Codes & Identifiers */}
            <div className="space-y-3 p-3.5 bg-slate-50/50 rounded-xl border border-slate-100">
              <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <BarcodeIcon className="w-3.5 h-3.5 text-cyan-600" /> Item Codes & Barcodes
                </div>
                <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-full">
                  Read-Only (System Auto-Generated)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Item Code */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Item Code</label>
                  <input
                    type="text"
                    value={productCode}
                    readOnly
                    tabIndex={-1}
                    placeholder="PRD-AUTO"
                    className="w-full p-2 bg-slate-100/90 border border-slate-200 rounded-lg font-mono font-bold text-slate-700 cursor-not-allowed select-all focus:outline-hidden"
                  />
                </div>

                {/* SKU Code */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">SKU Code</label>
                  <input
                    type="text"
                    value={sku}
                    readOnly
                    tabIndex={-1}
                    placeholder="SKU-AUTO"
                    className="w-full p-2 bg-slate-100/90 border border-slate-200 rounded-lg font-mono font-bold text-indigo-700 cursor-not-allowed select-all focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Barcode */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Primary Barcode (EAN-13)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={barcode}
                    readOnly
                    tabIndex={-1}
                    placeholder="EAN-AUTO"
                    className="w-full p-2 pl-8 bg-slate-100/90 border border-slate-200 rounded-lg font-mono font-bold text-slate-800 cursor-not-allowed select-all focus:outline-hidden"
                  />
                  <BarcodeIcon className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>
            </div>

            {/* Section 3: Item Identity & Specs */}
            <div className="space-y-3 p-3.5 bg-slate-50/50 rounded-xl border border-slate-100">
              <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-emerald-600" /> Specification & UOM
              </div>

              {/* Item Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Item Name / Product Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Samsung Galaxy A54 5G 128GB Black"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Size / Style */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Size SL / Style</label>
                  <input
                    type="text"
                    value={sizeStyle}
                    onChange={(e) => setSizeStyle(e.target.value)}
                    placeholder="e.g. XL / 42 / 128GB"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* UOM */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit (UOM) <span className="text-rose-500">*</span></label>
                  <select
                    value={unitId}
                    onChange={(e) => setUnitId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    required
                  >
                    <option value="">Select...</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.short_code || 'pcs'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reorder Level */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reorder Level</label>
                  <input
                    type="number"
                    min="0"
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Pricing & GP% Dynamics */}
            <div className="space-y-3 p-3.5 bg-slate-50/50 rounded-xl border border-slate-100">
              <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-600" /> Pricing & Profit Margin (GP%)
                </span>
                <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                  Auto Dynamic Calc
                </span>
              </div>

              {/* Tax / VAT */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">VAT / Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tax Type</label>
                  <select
                    value={taxType}
                    onChange={(e) => setTaxType(e.target.value as any)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="exclusive">Exclusive</option>
                    <option value="inclusive">Inclusive</option>
                    <option value="exempt">Exempt</option>
                  </select>
                </div>
              </div>

              {/* Cost Price, GP%, Retail Price, MRP */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Cost Price */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cost Price (৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPrice}
                    onChange={(e) => handleCostPriceChange(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* GP % */}
                <div>
                  <label className="block font-bold text-indigo-700 mb-1">GP %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={gpPercent}
                    onChange={(e) => handleGpPercentChange(Number(e.target.value))}
                    className="w-full p-2 bg-indigo-50/60 border border-indigo-200 rounded-lg font-mono font-extrabold text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Retail Price */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Retail Price (৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={retailPrice}
                    onChange={(e) => handleRetailPriceChange(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono font-extrabold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* MRP */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">MRP (৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={mrp}
                    onChange={(e) => setMrp(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Status & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className={`w-full p-2 rounded-lg font-bold text-xs border focus:ring-2 focus:ring-indigo-500 focus:outline-hidden ${
                    status === 'ACTIVE'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-slate-100 border-slate-300 text-slate-700'
                  }`}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Description / Notes</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional item summary or tags..."
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear Form
              </button>

              <div className="flex items-center gap-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(editingId, name)}
                    className="px-3 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className={`w-4 h-4 ${isSaving ? 'animate-bounce' : ''}`} />
                  {isSaving ? 'Saving...' : editingId ? 'Update Item Master' : 'Save Item Master'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: Searchable Catalog Grid & Master Table (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Total Items</span>
              <p className="text-xl font-black text-slate-900 mt-0.5">{stats.total}</p>
            </div>
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-600 uppercase">Active Catalog</span>
              <p className="text-xl font-black text-emerald-700 mt-0.5">{stats.active}</p>
            </div>
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-amber-600 uppercase">Low Stock Alert</span>
              <p className="text-xl font-black text-amber-700 mt-0.5">{stats.lowStock}</p>
            </div>
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-indigo-600 uppercase">Average GP %</span>
              <p className="text-xl font-black text-indigo-700 mt-0.5">{stats.avgGp}%</p>
            </div>
          </div>

          {/* Catalog Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {/* Catalog Toolbar / Filters */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Search Box */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by SKU, Barcode, Code, Item Name..."
                    className="w-full p-2 pl-9 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="text-xs font-bold text-slate-500 whitespace-nowrap">
                  Showing <span className="text-slate-900 font-extrabold">{filteredProducts.length}</span> of {products.length} items
                </div>
              </div>

              {/* Dropdown Filters */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <span className="font-bold text-slate-400 flex items-center gap-1 shrink-0">
                  <Filter className="w-3.5 h-3.5" /> Filters:
                </span>

                {/* Category Filter */}
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* Brand Filter */}
                <select
                  value={filterBrand}
                  onChange={(e) => setFilterBrand(e.target.value)}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="ALL">All Brands</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="INACTIVE">Inactive Only</option>
                </select>

                {(filterCategory !== 'ALL' || filterBrand !== 'ALL' || filterStatus !== 'ALL') && (
                  <button
                    onClick={() => {
                      setFilterCategory('ALL');
                      setFilterBrand('ALL');
                      setFilterStatus('ALL');
                    }}
                    className="text-[11px] font-bold text-rose-600 hover:underline shrink-0"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* Catalog Table */}
            <div className="overflow-x-auto max-h-[680px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold uppercase tracking-wider sticky top-0 z-10">
                    <th className="py-3 px-3">Item / SKU</th>
                    <th className="py-3 px-3">Barcode</th>
                    <th className="py-3 px-3">Category & Brand</th>
                    <th className="py-3 px-2 text-right">Cost (৳)</th>
                    <th className="py-3 px-2 text-right">Retail (৳)</th>
                    <th className="py-3 px-2 text-center">GP %</th>
                    <th className="py-3 px-2 text-right">Stock</th>
                    <th className="py-3 px-2 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                        Loading catalog master list...
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-bold text-slate-600">No items match your criteria.</p>
                        <p className="text-xs text-slate-400">Try adjusting your search or filters.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const isEditingThis = editingId === Number(p.id);
                      const v0 = p.variants?.[0];
                      const cost = Number(v0?.cost_price || 0);
                      const retail = Number(v0?.selling_price || p.price || 0);
                      const gp = cost > 0 ? (((retail - cost) / cost) * 100).toFixed(1) : '0.0';
                      const stockQty = p.variants?.reduce((s, v) => s + (v.available_quantity || 0), 0) || 0;
                      const primaryBarcode = v0?.barcodes?.[0]?.barcode;

                      return (
                        <tr
                          key={p.id}
                          className={`transition-colors hover:bg-indigo-50/40 cursor-pointer ${
                            isEditingThis ? 'bg-indigo-50/80 font-bold border-l-4 border-indigo-600' : ''
                          }`}
                          onDoubleClick={() => populateFormForEdit(p)}
                        >
                          {/* Item Identity */}
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-slate-100 font-black text-indigo-700 flex items-center justify-center shrink-0 border border-slate-200/80">
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 truncate max-w-[180px]">{p.name}</div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                                  <span className="text-indigo-700 font-semibold">{p.sku || p.product_code || 'NO-SKU'}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Barcode Column */}
                          <td className="p-3 font-mono text-xs">
                            {primaryBarcode ? (
                              <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100/90 rounded-lg text-slate-800 font-bold border border-slate-200/80 shadow-2xs">
                                <BarcodeIcon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span className="tracking-wider text-[11px] font-mono">{primaryBarcode}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic font-normal">No Barcode</span>
                            )}
                          </td>

                          {/* Category & Brand */}
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{p.category?.name || 'Unassigned'}</div>
                            <div className="text-[10px] text-slate-500 font-medium">{p.brand?.name || 'Generic'}</div>
                          </td>

                          {/* Cost */}
                          <td className="p-2 text-right font-mono font-medium text-slate-700">
                            ৳{cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>

                          {/* Retail */}
                          <td className="p-2 text-right font-mono font-extrabold text-slate-900">
                            ৳{retail.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>

                          {/* GP % Badge */}
                          <td className="p-2 text-center">
                            <span className="inline-block px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {gp}%
                            </span>
                          </td>

                          {/* Stock */}
                          <td className="p-2 text-right">
                            <span
                              className={`font-mono font-extrabold ${
                                stockQty <= (p.reorder_level || 10)
                                  ? 'text-amber-600'
                                  : 'text-slate-800'
                              }`}
                            >
                              {stockQty}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="p-2 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                (p.status || 'ACTIVE').toUpperCase() === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {p.status || 'ACTIVE'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setViewProductDetail(p)}
                                title="Quick View"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => populateFormForEdit(p)}
                                title="Edit Item"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(Number(p.id), p.name)}
                                title="Delete Item"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Inline Quick Add Category */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-600" />
                Add New Category
              </h3>
              <button onClick={() => setShowAddCategoryModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Category Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Health & Cosmetics"
                  className="w-full p-2.5 border border-slate-200 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category Code (Optional)</label>
                <input
                  type="text"
                  value={newCatCode}
                  onChange={(e) => setNewCatCode(e.target.value)}
                  placeholder="e.g. HLTH"
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddCategoryModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-xs hover:bg-slate-50 text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCategoryInline}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-sm"
              >
                Save Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Inline Quick Add Brand */}
      {showAddBrandModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Add New Brand
              </h3>
              <button onClick={() => setShowAddBrandModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Brand Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="e.g. Unilever Bangladesh"
                  className="w-full p-2.5 border border-slate-200 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Brand Code (Optional)</label>
                <input
                  type="text"
                  value={newBrandCode}
                  onChange={(e) => setNewBrandCode(e.target.value)}
                  placeholder="e.g. UNI"
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddBrandModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-xs hover:bg-slate-50 text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateBrandInline}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-sm"
              >
                Save Brand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Quick View Item Detail */}
      {viewProductDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-extrabold text-lg flex items-center justify-center">
                  {viewProductDetail.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">{viewProductDetail.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Code: {viewProductDetail.product_code || 'N/A'} | SKU: {viewProductDetail.sku || 'N/A'}
                  </p>
                </div>
              </div>
              <button onClick={() => setViewProductDetail(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-slate-500">Category:</span>
                  <p className="font-bold text-slate-900">{viewProductDetail.category?.name || 'General'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Brand:</span>
                  <p className="font-bold text-slate-900">{viewProductDetail.brand?.name || 'Generic'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Reorder Threshold:</span>
                  <p className="font-bold text-slate-900">{viewProductDetail.reorder_level || 10} pcs</p>
                </div>
                <div>
                  <span className="text-slate-500">Tax Rate:</span>
                  <p className="font-bold text-slate-900">{viewProductDetail.tax_rate || 0}% ({viewProductDetail.tax_type || 'exclusive'})</p>
                </div>
              </div>

              {/* Variant Matrix */}
              <div>
                <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
                  Variant & Pricing Detail
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-bold text-slate-700">
                      <tr>
                        <th className="p-2">Variant</th>
                        <th className="p-2 text-right">Cost</th>
                        <th className="p-2 text-right">Retail</th>
                        <th className="p-2 text-center">Barcode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(viewProductDetail.variants || []).map((v) => (
                        <tr key={v.id}>
                          <td className="p-2 font-semibold text-slate-800">{v.variant_name || v.sku}</td>
                          <td className="p-2 text-right font-mono">৳{Number(v.cost_price || 0).toFixed(2)}</td>
                          <td className="p-2 text-right font-mono font-bold text-indigo-700">৳{Number(v.selling_price || 0).toFixed(2)}</td>
                          <td className="p-2 text-center font-mono text-[10px] text-slate-500">
                            {v.barcodes?.[0]?.barcode || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  const p = viewProductDetail;
                  setViewProductDetail(null);
                  populateFormForEdit(p);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-sm flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit in Form
              </button>
              <button
                type="button"
                onClick={() => setViewProductDetail(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-xs hover:bg-slate-50 text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemInformation;
