import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Columns,
  Maximize2,
  SlidersHorizontal,
  MoveHorizontal,
  ChevronDown,
  Check,
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
import { generateSupplierBarcode, generateSupplierShortName } from '../../utils/supplierUtils';
import { Category, Brand, Unit, Product, ProductPayload } from '../../types/product';
import { Supplier } from '../../types/supplier';

export interface ColumnDef {
  id: string;
  label: string;
  minWidth: number;
  defaultWidth: number;
  align?: 'left' | 'center' | 'right';
  canHide?: boolean;
}

export const DEFAULT_CATALOG_COLUMNS: ColumnDef[] = [
  { id: 'item', label: 'Item / SKU', minWidth: 160, defaultWidth: 260, align: 'left', canHide: false },
  { id: 'barcode', label: 'Barcode', minWidth: 120, defaultWidth: 170, align: 'left', canHide: true },
  { id: 'category_brand', label: 'Category & Brand', minWidth: 120, defaultWidth: 170, align: 'left', canHide: true },
  { id: 'cost', label: 'Cost (৳)', minWidth: 80, defaultWidth: 105, align: 'right', canHide: true },
  { id: 'retail', label: 'Retail (৳)', minWidth: 80, defaultWidth: 110, align: 'right', canHide: true },
  { id: 'gp', label: 'GP %', minWidth: 65, defaultWidth: 85, align: 'center', canHide: true },
  { id: 'stock', label: 'Stock', minWidth: 70, defaultWidth: 90, align: 'right', canHide: true },
  { id: 'status', label: 'Status', minWidth: 75, defaultWidth: 95, align: 'center', canHide: true },
  { id: 'action', label: 'Action', minWidth: 90, defaultWidth: 105, align: 'right', canHide: false },
];

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

  // Dynamic Column Resizing & Customization State
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('retailcore_item_info_col_widths_v2');
      if (saved) {
        return {
          ...Object.fromEntries(DEFAULT_CATALOG_COLUMNS.map((c) => [c.id, c.defaultWidth])),
          ...JSON.parse(saved),
        };
      }
    } catch {
      // fallback
    }
    return Object.fromEntries(DEFAULT_CATALOG_COLUMNS.map((c) => [c.id, c.defaultWidth]));
  });

  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('retailcore_item_info_col_visibility_v2');
      if (saved) {
        return {
          ...Object.fromEntries(DEFAULT_CATALOG_COLUMNS.map((c) => [c.id, true])),
          ...JSON.parse(saved),
        };
      }
    } catch {
      // fallback
    }
    return Object.fromEntries(DEFAULT_CATALOG_COLUMNS.map((c) => [c.id, true]));
  });

  const [isWrapText, setIsWrapText] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('retailcore_item_info_wrap_mode_v2');
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return false;
  });

  const [showColumnMenu, setShowColumnMenu] = useState<boolean>(false);
  const [activeResizingCol, setActiveResizingCol] = useState<string | null>(null);
  const columnMenuRef = useRef<HTMLDivElement>(null);

  // Close column dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(e.target as Node)) {
        setShowColumnMenu(false);
      }
    };
    if (showColumnMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColumnMenu]);

  // Resizing mouse drag handlers
  const handleResizeStart = (colId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const colDef = DEFAULT_CATALOG_COLUMNS.find((c) => c.id === colId);
    const minWidth = colDef?.minWidth || 60;
    const maxWidth = 800;
    const startWidth = columnWidths[colId] || colDef?.defaultWidth || 120;

    setActiveResizingCol(colId);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    let currentWidth = startWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      currentWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + delta));
      setColumnWidths((prev) => ({
        ...prev,
        [colId]: currentWidth,
      }));
    };

    const onMouseUp = () => {
      setActiveResizingCol(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      setColumnWidths((latest) => {
        try {
          localStorage.setItem('retailcore_item_info_col_widths_v2', JSON.stringify(latest));
        } catch {
          // ignore
        }
        return latest;
      });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const resetColumnWidth = (colId: string) => {
    const colDef = DEFAULT_CATALOG_COLUMNS.find((c) => c.id === colId);
    if (!colDef) return;
    setColumnWidths((prev) => {
      const updated = { ...prev, [colId]: colDef.defaultWidth };
      try {
        localStorage.setItem('retailcore_item_info_col_widths_v2', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const resetAllColumnWidths = () => {
    const defaults = Object.fromEntries(DEFAULT_CATALOG_COLUMNS.map((c) => [c.id, c.defaultWidth]));
    setColumnWidths(defaults);
    try {
      localStorage.setItem('retailcore_item_info_col_widths_v2', JSON.stringify(defaults));
    } catch {
      // ignore
    }
  };

  const autoFitAllColumns = () => {
    const expanded: Record<string, number> = {
      item: 380,
      barcode: 200,
      category_brand: 220,
      cost: 120,
      retail: 120,
      gp: 90,
      stock: 95,
      status: 100,
      action: 110,
    };
    setColumnWidths(expanded);
    try {
      localStorage.setItem('retailcore_item_info_col_widths_v2', JSON.stringify(expanded));
    } catch {
      // ignore
    }
  };

  const toggleColumnVisibility = (colId: string) => {
    setColumnVisibility((prev) => {
      const updated = { ...prev, [colId]: !prev[colId] };
      try {
        localStorage.setItem('retailcore_item_info_col_visibility_v2', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const toggleWrapText = () => {
    setIsWrapText((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('retailcore_item_info_wrap_mode_v2', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const activeColumns = useMemo(() => {
    return DEFAULT_CATALOG_COLUMNS.filter((col) => columnVisibility[col.id] !== false);
  }, [columnVisibility]);

  const totalTableWidth = useMemo(() => {
    return activeColumns.reduce((sum, col) => sum + (columnWidths[col.id] || col.defaultWidth), 0);
  }, [activeColumns, columnWidths]);

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
        const existingIdx = mergedProds.findIndex((p) => Number(p.id) === Number(sp.id));
        if (existingIdx >= 0) {
          mergedProds[existingIdx] = {
            ...sp,
            ...mergedProds[existingIdx],
            supplier_id: (mergedProds[existingIdx] as any).supplier_id ?? (sp as any).supplier_id,
            supplier_short_name: (mergedProds[existingIdx] as any).supplier_short_name ?? (sp as any).supplier_short_name,
            barcode: (mergedProds[existingIdx] as any).barcode || (sp as any).barcode || sp.variants?.[0]?.barcodes?.[0]?.barcode,
            cost_price: (mergedProds[existingIdx] as any).cost_price ?? (sp as any).cost_price ?? sp.variants?.[0]?.cost_price,
            retail_price: (mergedProds[existingIdx] as any).retail_price ?? (sp as any).retail_price ?? sp.variants?.[0]?.selling_price,
            stock_quantity: (mergedProds[existingIdx] as any).stock_quantity ?? (sp as any).stock_quantity,
            variants: (mergedProds[existingIdx].variants && mergedProds[existingIdx].variants.length > 0)
              ? mergedProds[existingIdx].variants
              : sp.variants,
          };
        } else {
          mergedProds.unshift(sp);
        }
      });

      // Eradicate any legacy '880' barcode prefix and format with Supplier Short Name
      const sanitizedProds = mergedProds.map((prod) => {
        let b = (prod as any).barcode || prod.variants?.[0]?.barcodes?.[0]?.barcode || '';
        if (b && b.startsWith('880')) {
          const sup = loadedSupps.find((s) => Number(s.id) === Number(prod.supplier_id || prod.supplier?.id));
          const supShort = prod.supplier_short_name || prod.supplier?.short_name || sup?.short_name || (sup?.name ? generateSupplierShortName(sup.name) : 'SUP');
          b = `${supShort}-${b.replace(/^880/, '').padStart(8, '0').slice(-8)}`;
        }
        return {
          ...prod,
          barcode: b,
        };
      });

      setProducts(sanitizedProds);
      setCategories(loadedCats);
      setBrands(loadedBrands);
      setUnits(loadedUnits);
      setSuppliers(loadedSupps);

      // Defaults for creation if not editing
      if (!editingId) {
        const catIdToUse = loadedCats.length > 0 ? Number(loadedCats[0].id) : '';
        const brandIdToUse = loadedBrands.length > 0 ? Number(loadedBrands[0].id) : '';
        const unitIdToUse = loadedUnits.length > 0 ? Number(loadedUnits[0].id) : '';
        const suppIdToUse = loadedSupps.length > 0 ? Number(loadedSupps[0].id) : '';

        if (!categoryId && catIdToUse) setCategoryId(catIdToUse);
        if (!brandId && brandIdToUse) setBrandId(brandIdToUse);
        if (!unitId && unitIdToUse) setUnitId(unitIdToUse);
        if (!supplierId && suppIdToUse) setSupplierId(suppIdToUse);

        // Auto Generate Item Code, SKU, and Barcode automatically on load if empty
        if (!productCode || !sku || !barcode) {
          const auto = generateAutoCodes(catIdToUse, brandIdToUse, name, suppIdToUse, loadedCats, loadedBrands, loadedSupps);
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

  const handleAutoGenerateSku = () => {
    const auto = generateAutoCodes();
    setSku(auto.sku);
    if (!barcode) {
      setBarcode(auto.barcode);
    }
  };

  const handleAutoGenerateBarcode = () => {
    setBarcode(generateSupplierBarcode(supplierId, undefined, suppliers));
  };

  const handleSupplierChange = (val: number | '') => {
    setSupplierId(val);
    if (!editingId) {
      const newBarcode = generateSupplierBarcode(val, undefined, suppliers);
      setBarcode(newBarcode);
    } else {
      if (!barcode || barcode.startsWith('880')) {
        setBarcode(generateSupplierBarcode(val, undefined, suppliers));
      }
    }
  };

  const handleCategoryChange = (val: number | '') => {
    setCategoryId(val);
    if (!editingId) {
      const auto = generateAutoCodes(val, brandId, name, supplierId);
      setSku(auto.sku);
      if (!barcode) setBarcode(auto.barcode);
      if (!productCode) setProductCode(auto.code);
    }
  };

  const handleBrandChange = (val: number | '') => {
    setBrandId(val);
    if (!editingId) {
      const auto = generateAutoCodes(categoryId, val, name, supplierId);
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
    const auto = generateAutoCodes(catIdToUse, brandIdToUse, '', suppIdToUse);
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
    const foundSupplierId = prod.supplier_id ? Number(prod.supplier_id) : (prod.supplier?.id ? Number(prod.supplier.id) : '');
    setSupplierId(foundSupplierId);
    setProductType((prod.product_type as any) || 'simple');
    setStatus((prod.status?.toUpperCase() as any) || 'ACTIVE');
    setReorderLevel(prod.reorder_level || 10);
    setTaxRate(prod.tax_rate || 0);
    setTaxType((prod.tax_type as any) || 'exclusive');
    setDescription(prod.description || '');

    const variants = prod.variants || [];
    const v0 = variants[0];
    const cPrice = Number(v0?.cost_price ?? (prod as any).cost_price ?? (prod as any).cost ?? 0);
    const rPrice = Number(v0?.selling_price ?? v0?.price ?? (prod as any).retail_price ?? prod.price ?? (prod as any).selling_price ?? 0);
    const mrpPrice = Number(v0?.mrp ?? (prod as any).mrp ?? rPrice);
    let bCode = (prod as any).barcode || v0?.barcodes?.[0]?.barcode || v0?.barcode || (prod as any).primary_barcode || '';

    // Strip legacy 880 prefix and assign supplier short name barcode
    if (bCode.startsWith('880')) {
      const sShort = prod.supplier_short_name || prod.supplier?.short_name;
      bCode = generateSupplierBarcode(sShort || foundSupplierId, undefined, suppliers);
    }

    setCostPrice(cPrice);
    setRetailPrice(rPrice);
    setMrp(mrpPrice);
    if (cPrice > 0 && rPrice > 0) {
      setGpPercent(Number((((rPrice - cPrice) / cPrice) * 100).toFixed(2)));
    } else {
      setGpPercent(20);
    }
    setBarcode(bCode);
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

    const selectedSupplier = suppliers.find((s) => Number(s.id) === Number(supplierId));
    const calculatedSupplierShortName = selectedSupplier?.short_name || (selectedSupplier?.name ? generateSupplierShortName(selectedSupplier.name) : undefined);

    const payload: ProductPayload = {
      name: name.trim(),
      product_code: finalCode,
      sku: finalSku,
      category_id: Number(categoryId),
      brand_id: brandId ? Number(brandId) : undefined,
      supplier_id: supplierId ? Number(supplierId) : undefined,
      supplier_short_name: calculatedSupplierShortName,
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
            ? [{ barcode: barcode.trim(), barcode_type: 'CODE-128', is_primary: true }]
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
        const matchesCode = Boolean(p.product_code?.toLowerCase().includes(q));
        const matchesSku =
          Boolean(p.sku?.toLowerCase().includes(q)) ||
          Boolean(p.variants?.some((v) => v.sku?.toLowerCase().includes(q)));
        const matchesBarcode =
          String(p.barcode || (p as any).primary_barcode || '').toLowerCase().includes(q) ||
          Boolean(p.variants?.some((v) =>
            v.barcodes?.some((b: any) => String(b.barcode).toLowerCase().includes(q)) ||
            String(v.barcode || '').toLowerCase().includes(q)
          ));
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
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Preferred Supplier</label>
                  {supplierId && (
                    <span className="text-[10px] font-extrabold text-teal-700 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-md">
                      Prefix: {suppliers.find((s) => Number(s.id) === Number(supplierId))?.short_name || generateSupplierShortName(suppliers.find((s) => Number(s.id) === Number(supplierId))?.name || '') || 'SUP'}
                    </span>
                  )}
                </div>
                <select
                  value={supplierId}
                  onChange={(e) => handleSupplierChange(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="">Select Supplier...</option>
                  {suppliers.map((s) => {
                    const shortName = s.short_name || generateSupplierShortName(s.name || '');
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} ({shortName ? `${shortName} • ` : ''}{s.supplier_code})
                      </option>
                    );
                  })}
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
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <span>Primary Barcode</span>
                    <span className="text-[10px] font-semibold text-slate-500">(Supplier Short Name + Digits)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateBarcode}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
                    title="Regenerate Barcode using Supplier Short Name"
                  >
                    <RefreshCw className="w-3 h-3" /> Regenerate
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={barcode}
                    readOnly
                    tabIndex={-1}
                    placeholder="SUP-AUTO"
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

              {/* Controls Row: Filters on Left, Dynamic Column Controls on Right */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                {/* Left: Dropdown Filters */}
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
                      className="text-[11px] font-bold text-rose-600 hover:underline shrink-0 cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>

                {/* Right: Dynamic Column Resizing & Customization Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Column Visibility Selector Dropdown */}
                  <div className="relative" ref={columnMenuRef}>
                    <button
                      type="button"
                      onClick={() => setShowColumnMenu(!showColumnMenu)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        showColumnMenu
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                      title="Customize visible columns (hide/show)"
                    >
                      <Columns className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Columns</span>
                      <span className="px-1.5 py-0.2 rounded-md bg-indigo-100 text-indigo-700 font-extrabold text-[10px]">
                        {activeColumns.length}/{DEFAULT_CATALOG_COLUMNS.length}
                      </span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>

                    {showColumnMenu && (
                      <div
                        className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                          <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                            Column Visibility
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const allVisible = Object.fromEntries(DEFAULT_CATALOG_COLUMNS.map((c) => [c.id, true]));
                              setColumnVisibility(allVisible);
                              try {
                                localStorage.setItem('retailcore_item_info_col_visibility_v2', JSON.stringify(allVisible));
                              } catch {}
                            }}
                            className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                          >
                            Show All
                          </button>
                        </div>

                        <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                          {DEFAULT_CATALOG_COLUMNS.map((col) => {
                            const isChecked = columnVisibility[col.id] !== false;
                            return (
                              <label
                                key={col.id}
                                className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                                  isChecked ? 'hover:bg-slate-50 text-slate-800' : 'text-slate-400 hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={col.canHide === false}
                                    onChange={() => toggleColumnVisibility(col.id)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                                  />
                                  <span className="font-semibold">{col.label}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {columnWidths[col.id] || col.defaultWidth}px
                                </span>
                              </label>
                            );
                          })}
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <button
                            type="button"
                            onClick={resetAllColumnWidths}
                            className="text-slate-600 hover:text-indigo-600 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" /> Reset Sizes
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowColumnMenu(false)}
                            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Wrap Text / Full Details Toggle */}
                  <button
                    type="button"
                    onClick={toggleWrapText}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isWrapText
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                    title={isWrapText ? 'Wrap text is ON (all hidden text is visible)' : 'Click to wrap text and see all hidden details'}
                  >
                    <MoveHorizontal className="w-3.5 h-3.5" />
                    <span>{isWrapText ? 'Full Text (Wrap)' : 'Single Line'}</span>
                  </button>

                  {/* Auto-Expand / Fit All Content */}
                  <button
                    type="button"
                    onClick={autoFitAllColumns}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors"
                    title="Auto-expand columns to wide view"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Reset Column Sizes */}
                  <button
                    type="button"
                    onClick={resetAllColumnWidths}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors"
                    title="Reset column widths to default"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Catalog Table */}
            <div className="overflow-x-auto max-h-[680px]">
              <table
                className="w-full text-left border-collapse text-xs table-fixed"
                style={{ minWidth: `${Math.max(totalTableWidth, 850)}px` }}
              >
                <colgroup>
                  {activeColumns.map((col) => (
                    <col
                      key={col.id}
                      style={{ width: `${columnWidths[col.id] || col.defaultWidth}px` }}
                    />
                  ))}
                </colgroup>
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold uppercase tracking-wider sticky top-0 z-10 shadow-2xs">
                    {activeColumns.map((col) => (
                      <th
                        key={col.id}
                        style={{ width: `${columnWidths[col.id] || col.defaultWidth}px` }}
                        className={`relative py-3 px-3 select-none group/th transition-colors ${
                          activeResizingCol === col.id ? 'bg-indigo-50 text-indigo-900' : ''
                        } ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 overflow-hidden pr-2">
                          <span className="truncate">{col.label}</span>
                        </div>

                        {/* Draggable Resizer Handle */}
                        <div
                          className={`absolute right-0 top-0 bottom-0 w-3 cursor-col-resize select-none touch-none flex items-center justify-center transition-colors group-hover/th:bg-indigo-500/20 ${
                            activeResizingCol === col.id ? 'bg-indigo-600 opacity-100' : ''
                          }`}
                          onMouseDown={(e) => handleResizeStart(col.id, e)}
                          onDoubleClick={() => resetColumnWidth(col.id)}
                          title={`Drag to resize "${col.label}" (Double-click to reset)`}
                        >
                          <div
                            className={`w-[2px] h-4 rounded-full transition-colors ${
                              activeResizingCol === col.id ? 'bg-white' : 'bg-slate-300 group-hover/th:bg-indigo-600'
                            }`}
                          />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan={activeColumns.length} className="py-12 text-center text-slate-400 font-medium">
                        Loading catalog master list...
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={activeColumns.length} className="py-12 text-center text-slate-400">
                        <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-bold text-slate-600">No items match your criteria.</p>
                        <p className="text-xs text-slate-400">Try adjusting your search or filters.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const isEditingThis = editingId === Number(p.id);
                      const v0 = p.variants?.[0];
                      const cost = Number(v0?.cost_price ?? (p as any).cost_price ?? (p as any).cost ?? 0);
                      const retail = Number(v0?.selling_price ?? (p as any).retail_price ?? (p as any).price ?? p.price ?? (p as any).selling_price ?? 0);
                      const gp = cost > 0 ? (((retail - cost) / cost) * 100).toFixed(1) : '0.0';
                      const stockQty = (p.variants && p.variants.length > 0)
                        ? p.variants.reduce((s, v) => s + (v.available_quantity || 0), 0)
                        : Number((p as any).stock_quantity ?? (p as any).stock ?? 0);
                      let primaryBarcode =
                        (p as any).barcode ||
                        (p as any).primary_barcode ||
                        v0?.barcodes?.[0]?.barcode ||
                        v0?.barcode ||
                        (p as any).barcodes?.[0]?.barcode ||
                        (p as any).barcodes?.[0] ||
                        (p.variants && p.variants.flatMap((v) => v.barcodes || []).find((b: any) => b?.barcode)?.barcode) ||
                        '';

                      if (primaryBarcode && primaryBarcode.startsWith('880')) {
                        const supShort = p.supplier_short_name || p.supplier?.short_name || (p.supplier?.name ? generateSupplierShortName(p.supplier.name) : 'SUP');
                        primaryBarcode = `${supShort}-${primaryBarcode.replace(/^880/, '').padStart(8, '0').slice(-8)}`;
                      }

                      return (
                        <tr
                          key={p.id}
                          className={`transition-colors hover:bg-indigo-50/40 cursor-pointer ${
                            isEditingThis ? 'bg-indigo-50/80 font-bold border-l-4 border-indigo-600' : ''
                          }`}
                          onDoubleClick={() => populateFormForEdit(p)}
                        >
                          {/* Item Identity Column */}
                          {columnVisibility.item !== false && (
                            <td className="p-3 align-top overflow-hidden">
                              <div className="flex items-start gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-slate-100 font-black text-indigo-700 flex items-center justify-center shrink-0 border border-slate-200/80 mt-0.5">
                                  {p.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div
                                    className={`font-bold text-slate-900 ${
                                      isWrapText ? 'break-words leading-snug' : 'truncate'
                                    }`}
                                    title={p.name}
                                  >
                                    {p.name}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                                    <span className="text-indigo-700 font-semibold">{p.sku || p.product_code || 'NO-SKU'}</span>
                                    {p.unit?.short_code && (
                                      <span className="text-slate-400">({p.unit.short_code})</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          )}

                          {/* Barcode Column */}
                          {columnVisibility.barcode !== false && (
                            <td className="p-3 font-mono text-xs align-top overflow-hidden">
                              {primaryBarcode ? (
                                <div className="flex flex-col gap-1 items-start">
                                  <div
                                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100/90 rounded-lg text-slate-800 font-bold border border-slate-200/80 shadow-2xs max-w-full"
                                    title={`Barcode: ${primaryBarcode}`}
                                  >
                                    <BarcodeIcon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                    <span className="tracking-wider text-[11px] font-mono truncate">{primaryBarcode}</span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic font-normal">No Barcode</span>
                              )}
                            </td>
                          )}

                          {/* Category & Brand Column */}
                          {columnVisibility.category_brand !== false && (
                            <td className="p-3 align-top overflow-hidden">
                              <div
                                className={`font-semibold text-slate-800 ${
                                  isWrapText ? 'break-words' : 'truncate'
                                }`}
                                title={p.category?.name || 'Unassigned'}
                              >
                                {p.category?.name || 'Unassigned'}
                              </div>
                              <div
                                className={`text-[10px] text-slate-500 font-medium ${
                                  isWrapText ? 'break-words' : 'truncate'
                                }`}
                                title={p.brand?.name || 'Generic'}
                              >
                                {p.brand?.name || 'Generic'}
                              </div>
                            </td>
                          )}

                          {/* Cost Column */}
                          {columnVisibility.cost !== false && (
                            <td className="p-2 text-right font-mono font-medium text-slate-700 align-top">
                              ৳{cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          )}

                          {/* Retail Column */}
                          {columnVisibility.retail !== false && (
                            <td className="p-2 text-right font-mono font-extrabold text-slate-900 align-top">
                              ৳{retail.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          )}

                          {/* GP % Badge Column */}
                          {columnVisibility.gp !== false && (
                            <td className="p-2 text-center align-top">
                              <span className="inline-block px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {gp}%
                              </span>
                            </td>
                          )}

                          {/* Stock Column */}
                          {columnVisibility.stock !== false && (
                            <td className="p-2 text-right align-top">
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
                          )}

                          {/* Status Column */}
                          {columnVisibility.status !== false && (
                            <td className="p-2 text-center align-top">
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
                          )}

                          {/* Actions Column */}
                          {columnVisibility.action !== false && (
                            <td className="p-3 text-right align-top">
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
                          )}
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
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-800 font-bold">
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
