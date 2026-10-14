import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Printer,
  X,
  Search,
  Building2,
  Warehouse as WarehouseIcon,
  Truck,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  FileText,
  DollarSign,
  Info,
  ChevronDown,
  ShieldAlert,
  Percent,
  Check,
  Ban,
  PackageCheck,
  Eye
} from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { useCompany } from '../../contexts/CompanyContext';
import {
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  approvePurchaseOrder,
  cancelPurchaseOrder,
  getNextPoNumber
} from '../../api/purchaseOrders';
import { getSuppliers } from '../../api/suppliers';
import {
  getProducts,
  getCategories,
  getBrands,
  getStoredProducts,
  getStoredCategories,
  getStoredBrands
} from '../../api/products';
import { getBranches, getWarehouses, getBusinessUnits } from '../../api/organization';
import { getInventory } from '../../api/inventory';
import { Supplier } from '../../types/supplier';
import { Product, ProductVariant, Category, Brand } from '../../types/product';
import { Branch, Warehouse, BusinessUnit } from '../../types/organization';
import { PurchaseOrder } from '../../types/purchase';
import { handleKeyDownEnterToNextField } from '../../utils/enterKeyNavigation';
import { PurchaseOrderPrintModal } from '../../components/purchase/PurchaseOrderPrintModal';

interface OrderGridItem {
  id: string; // client UUID or backend id
  product_id: number | string;
  product_variant_id: number | string;
  product_name: string;
  variant_name: string;
  sku: string;
  barcode: string;
  category_name: string;
  brand_name: string;
  purchase_unit: string;
  quantity: number;
  unit_cost: number;
  discount: number;
  tax_percent: number;
  unit_selling_price: number;
  gp_percent: number;
  inclusive_selling_price: number;
  line_total: number;
  item_note?: string;
}

export const PurchaseOrderForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);
  const formRef = useRef<HTMLDivElement>(null);
  const entryQtyInputRef = useRef<HTMLInputElement>(null);
  const modalSearchInputRef = useRef<HTMLInputElement>(null);

  const { user, hasPermission } = useAuth();
  const { company: activeCompany } = useCompany();

  // Master Data State
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);

  // Form Loading & Process State
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Header State
  const [poNumber, setPoNumber] = useState<string>('');
  const [orderDate, setOrderDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState<string>('');
  const [supplierId, setSupplierId] = useState<number | string>('');
  const [businessUnitId, setBusinessUnitId] = useState<number | string>('');
  const [branchId, setBranchId] = useState<number | string>('');
  const [warehouseId, setWarehouseId] = useState<number | string>('');
  const [paymentTerms, setPaymentTerms] = useState<string>('NET_30');
  const [supplierRef, setSupplierRef] = useState<string>('');
  const [poStatus, setPoStatus] = useState<string>('DRAFT');
  const [notes, setNotes] = useState<string>('');

  // Financial Headers
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [otherCost, setOtherCost] = useState<number>(0);
  const [headerDiscount, setHeaderDiscount] = useState<number>(0);

  // Items Grid
  const [items, setItems] = useState<OrderGridItem[]>([]);

  // Item Search & Entry Panel State
  const [productSearch, setProductSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedProductId, setSelectedProductId] = useState<number | string>('');
  const [selectedVariantId, setSelectedVariantId] = useState<number | string>('');
  const [entryUnit, setEntryUnit] = useState<string>('Pcs');
  const [entryQty, setEntryQty] = useState<number>(1);
  const [entryUnitCost, setEntryUnitCost] = useState<number>(0);
  const [entryDiscount, setEntryDiscount] = useState<number>(0);
  const [entryTaxPercent, setEntryTaxPercent] = useState<number>(0);
  const [entryUnitSellingPrice, setEntryUnitSellingPrice] = useState<number>(0);
  const [entryItemNote, setEntryItemNote] = useState<string>('');

  // Supplier Search dropdown open state
  const [supplierSearchText, setSupplierSearchText] = useState<string>('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState<boolean>(false);

  // F3 Product Search & Lookup Modal State
  const [showProductSearchModal, setShowProductSearchModal] = useState<boolean>(false);
  const [modalSearchText, setModalSearchText] = useState<string>('');
  const [modalCategory, setModalCategory] = useState<string>('ALL');
  const [modalBrand, setModalBrand] = useState<string>('ALL');
  const [modalSelectedIndex, setModalSelectedIndex] = useState<number>(0);

  // Load Master Data & Existing PO
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [
          supRes,
          branchRes,
          whRes,
          buRes,
          prodRes,
          catRes,
          brandRes,
          invRes
        ] = await Promise.all([
          getSuppliers({ per_page: 100 }),
          getBranches(),
          getWarehouses(),
          getBusinessUnits(),
          getProducts({ per_page: 150 }),
          getCategories(),
          getBrands(),
          getInventory({ per_page: 200 })
        ]);

        if (!isMounted) return;

        const supList = Array.isArray(supRes.data)
          ? supRes.data
          : (supRes.data as any)?.data || [];
        setSuppliers(supList);

        const branchList = branchRes.data || [];
        setBranches(branchList);
        if (branchList.length > 0) setBranchId(branchList[0].id);

        const whList = whRes.data || [];
        setWarehouses(whList);
        if (whList.length > 0) setWarehouseId(whList[0].id);

        const buList = buRes.data || [];
        setBusinessUnits(buList);
        if (buList.length > 0) setBusinessUnitId(buList[0].id);

        const rawProd = prodRes.data || prodRes;
        const prodList = Array.isArray(rawProd)
          ? rawProd
          : Array.isArray(rawProd?.data)
          ? rawProd.data
          : Array.isArray(rawProd?.items)
          ? rawProd.items
          : [];
        const finalProds = prodList.length > 0 ? prodList : getStoredProducts();
        setProducts(finalProds);

        const rawCat = catRes.data || catRes;
        const catList = Array.isArray(rawCat)
          ? rawCat
          : Array.isArray(rawCat?.data)
          ? rawCat.data
          : [];
        setCategories(catList.length > 0 ? catList : getStoredCategories());

        const rawBrand = brandRes.data || brandRes;
        const brandList = Array.isArray(rawBrand)
          ? rawBrand
          : Array.isArray(rawBrand?.data)
          ? rawBrand.data
          : [];
        setBrands(brandList.length > 0 ? brandList : getStoredBrands());

        const rawInv = invRes.data || invRes;
        const invList = Array.isArray(rawInv)
          ? rawInv
          : Array.isArray(rawInv?.data)
          ? rawInv.data
          : [];
        setInventoryList(invList);

        if (isEditMode && id) {
          // Fetch existing Purchase Order by ID or PO Number
          const poRes = await getPurchaseOrder(id);
          if (poRes.data && (poRes.data.id || poRes.data.po_number)) {
            const po = poRes.data as PurchaseOrder;
            setPoNumber(po.po_number || (String(id).startsWith('PO-') ? String(id) : ''));
            setOrderDate(po.order_date ? po.order_date.split('T')[0] : new Date().toISOString().split('T')[0]);
            setExpectedDate(po.expected_date ? po.expected_date.split('T')[0] : '');

            // Supplier resolution
            const targetSupId = po.supplier_id || po.supplier?.id || '';
            setSupplierId(targetSupId);
            if (po.supplier?.name) {
              setSupplierSearchText(po.supplier.name);
            } else if (targetSupId) {
              const matchedSup = supList.find((s: any) => String(s.id) === String(targetSupId));
              if (matchedSup) {
                setSupplierSearchText(matchedSup.name || '');
              }
            }

            // Warehouse resolution
            const targetWhId = po.warehouse_id || po.warehouse?.id || (whList[0]?.id || '');
            setWarehouseId(targetWhId);
            setBranchId(po.branch_id || (branchList[0]?.id || ''));
            setBusinessUnitId(po.business_unit_id || (buList[0]?.id || ''));
            setPoStatus(po.status || 'DRAFT');
            setNotes(po.notes || '');
            setPaymentTerms(po.payment_terms || 'NET_30');
            setShippingCost(Number(po.shipping_cost || 0));
            setOtherCost(Number(po.other_cost || 0));
            setHeaderDiscount(Number(po.discount_total || 0));

            if (po.items && Array.isArray(po.items) && po.items.length > 0) {
              const loadedItems: OrderGridItem[] = po.items.map((item: any, idx: number) => {
                const matchedProd = finalProds.find((p: any) => String(p.id) === String(item.product_id));
                const matchedVar = matchedProd?.variants?.find((v: any) => String(v.id) === String(item.product_variant_id));
                const pName = item.product?.name || item.product_name || matchedProd?.name || 'Product Item';
                const vName = item.variant?.variant_name || item.variant_name || matchedVar?.variant_name || 'Standard';
                const sKu = item.variant?.sku || item.sku || matchedVar?.sku || 'SKU-001';
                const bCode = item.variant?.barcode || item.barcode || matchedVar?.barcode || '8800000000';
                const catName = item.product?.category?.name || item.category_name || (matchedProd?.category as any)?.name || 'General';
                const brdName = item.product?.brand?.name || item.brand_name || (matchedProd?.brand as any)?.name || 'Generic';
                const pUnit = item.purchase_unit || item.product?.unit?.code || matchedProd?.unit?.code || 'Pcs';
                const cost = Number(item.unit_cost || item.unit_price || 0);
                const qty = Number(item.quantity || 1);
                const disc = Number(item.discount || 0);
                const taxP = Number(item.tax_percent || 0);
                const sellP = Number(item.unit_selling_price || item.variant?.selling_price || matchedVar?.selling_price || (cost > 0 ? cost * 1.25 : 0));
                const gpP = sellP > 0 ? ((sellP - cost) / sellP) * 100 : 0;
                const incSellP = sellP * (1 + taxP / 100);
                const lineTot = Number(item.line_total || ((qty * cost - disc) * (1 + taxP / 100)));

                return {
                  id: String(item.id || `item-${idx}-${Date.now()}`),
                  product_id: item.product_id || matchedProd?.id || 1,
                  product_variant_id: item.product_variant_id || matchedVar?.id || 1,
                  product_name: pName,
                  variant_name: vName,
                  sku: sKu,
                  barcode: bCode,
                  category_name: catName,
                  brand_name: brdName,
                  purchase_unit: pUnit,
                  quantity: qty,
                  unit_cost: cost,
                  discount: disc,
                  tax_percent: taxP,
                  unit_selling_price: sellP,
                  gp_percent: Number(gpP.toFixed(2)),
                  inclusive_selling_price: Number(incSellP.toFixed(2)),
                  line_total: Number(lineTot.toFixed(2)),
                  item_note: item.item_note || ''
                };
              });
              setItems(loadedItems);
            }
          }
        } else {
          // New PO: Get next PO number from backend
          const numRes = await getNextPoNumber();
          if (numRes.data && numRes.data.po_number) {
            setPoNumber(numRes.data.po_number);
          } else {
            setPoNumber(`PO-${new Date().getFullYear()}-0001`);
          }
        }
      } catch (err: any) {
        console.error('Error loading PO form dependencies:', err);
        setError('Failed to load form metadata. Please refresh or check connection.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [id, isEditMode]);

  // Global F3 Shortcut Listener for Product Master Screen
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        setShowProductSearchModal((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  // Escape Key listener to close modal
  useEffect(() => {
    if (!showProductSearchModal) return;
    const handleModalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowProductSearchModal(false);
      }
    };
    window.addEventListener('keydown', handleModalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleModalKeyDown);
    };
  }, [showProductSearchModal]);

  // Filtered Products List for F3 Lookup Modal Screen
  const modalFilteredProducts = useMemo(() => {
    const prodArray =
      Array.isArray(products) && products.length > 0 ? products : getStoredProducts();
    const invArray = Array.isArray(inventoryList) ? inventoryList : [];

    return prodArray.flatMap((p: any) => {
      if (!p) return [];

      const pCategory =
        typeof p.category === 'string'
          ? p.category
          : p.category?.name || 'General';

      const pBrand =
        typeof p.brand === 'string'
          ? p.brand
          : p.brand?.name || 'Generic';

      const pUnit =
        typeof p.unit === 'string'
          ? p.unit
          : p.unit?.code || p.unit?.short_code || p.unit?.name || 'Pcs';

      if (modalCategory !== 'ALL' && String(p.category_id) !== String(modalCategory)) {
        return [];
      }
      if (modalBrand !== 'ALL' && String(p.brand_id) !== String(modalBrand)) {
        return [];
      }

      const term = modalSearchText.trim().toLowerCase();

      const variants =
        p.variants && Array.isArray(p.variants) && p.variants.length > 0
          ? p.variants
          : [
              {
                id: `std-${p.id}`,
                variant_name: 'Standard',
                sku: p.sku || p.product_code || 'SKU-001',
                barcode:
                  p.barcode ||
                  (p.barcodes && p.barcodes[0]?.barcode) ||
                  '8800000000',
                cost_price: p.cost_price || p.price || 0,
                selling_price: p.selling_price || p.price || 0
              }
            ];

      return variants
        .filter((v: any) => {
          if (!v) return false;
          if (!term) return true;
          const vBarcode =
            v.barcode ||
            (Array.isArray(v.barcodes) && v.barcodes[0]?.barcode) ||
            p.barcode ||
            (Array.isArray(p.barcodes) && p.barcodes[0]?.barcode) ||
            '';

          const nameMatch = p?.name ? String(p.name).toLowerCase().includes(term) : false;
          const skuMatch =
            (v?.sku ? String(v.sku).toLowerCase().includes(term) : false) ||
            (p?.sku ? String(p.sku).toLowerCase().includes(term) : false) ||
            (p?.product_code ? String(p.product_code).toLowerCase().includes(term) : false);
          const barcodeMatch = String(vBarcode).toLowerCase().includes(term);
          const variantMatch = v?.variant_name
            ? String(v.variant_name).toLowerCase().includes(term)
            : false;
          return nameMatch || skuMatch || barcodeMatch || variantMatch;
        })
        .map((v: any) => {
          const invItem = invArray.find(
            (inv: any) =>
              String(inv.product_variant_id) === String(v.id) ||
              String(inv.product_id) === String(p.id)
          );
          const currentStock = invItem
            ? Number(invItem.quantity || invItem.available_quantity || 0)
            : Number(v.available_quantity || p.available_quantity || 0);
          const costPrice = Number(
            v.cost_price || p.cost_price || p.price || 0
          );
          const sellingPrice = Number(
            v.selling_price ||
              p.selling_price ||
              p.price ||
              (costPrice > 0 ? costPrice * 1.25 : 0)
          );

          const vBarcode =
            v.barcode ||
            (v.barcodes && v.barcodes[0]?.barcode) ||
            p.barcode ||
            (p.barcodes && p.barcodes[0]?.barcode) ||
            '8800000000';

          return {
            product: p,
            variant: v,
            productId: p.id,
            variantId: v.id,
            productName: p.name || 'Product Item',
            variantName: v.variant_name || 'Standard',
            sku: v.sku || p.sku || p.product_code || 'SKU-001',
            barcode: vBarcode,
            categoryName: pCategory,
            brandName: pBrand,
            unit: pUnit,
            costPrice,
            sellingPrice,
            currentStock
          };
        });
    });
  }, [products, inventoryList, modalSearchText, modalCategory, modalBrand]);

  const handleSelectProductFromModal = (item: any) => {
    if (!item) return;
    setSelectedProductId(item.productId);
    setSelectedVariantId(item.variantId);
    setEntryUnit(item.unit);
    setEntryUnitCost(item.costPrice);
    setEntryUnitSellingPrice(item.sellingPrice);
    setShowProductSearchModal(false);
    setProductSearch(`${item.productName} (${item.sku})`);

    // Jump to the next screen / field (Buy Qty) immediately and select its value!
    setTimeout(() => {
      if (entryQtyInputRef.current) {
        entryQtyInputRef.current.focus();
        entryQtyInputRef.current.select();
      }
    }, 80);
  };

  // Keyboard Navigation: Arrow Down / Up to browse results, Enter to select & jump to next field
  const handleModalSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (modalFilteredProducts.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setModalSelectedIndex((prev) => {
        const next = prev < modalFilteredProducts.length - 1 ? prev + 1 : 0;
        const targetRow = document.getElementById(`modal-product-row-${next}`);
        if (targetRow) {
          targetRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setModalSelectedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : modalFilteredProducts.length - 1;
        const targetRow = document.getElementById(`modal-product-row-${next}`);
        if (targetRow) {
          targetRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const itemToSelect =
        modalFilteredProducts[modalSelectedIndex] || modalFilteredProducts[0];
      if (itemToSelect) {
        handleSelectProductFromModal(itemToSelect);
      }
    }
  };

  // When F3 modal opens, reset selected index and focus search input
  useEffect(() => {
    if (showProductSearchModal) {
      setModalSelectedIndex(0);
      setTimeout(() => {
        modalSearchInputRef.current?.focus();
        modalSearchInputRef.current?.select();
      }, 50);
    }
  }, [showProductSearchModal]);

  // Reset selected index when search text or filters change
  useEffect(() => {
    setModalSelectedIndex(0);
  }, [modalSearchText, modalCategory, modalBrand]);

  // Selected Supplier Object
  const selectedSupplier = useMemo(() => {
    return suppliers.find((s) => String(s.id) === String(supplierId));
  }, [suppliers, supplierId]);

  // Filtered Suppliers for Search
  const filteredSuppliers = useMemo(() => {
    if (!Array.isArray(suppliers)) return [];
    if (!supplierSearchText.trim()) return suppliers.slice(0, 10);
    const term = supplierSearchText.toLowerCase();
    return suppliers.filter(
      (s) =>
        (s?.name ? String(s.name).toLowerCase().includes(term) : false) ||
        (s?.supplier_code ? String(s.supplier_code).toLowerCase().includes(term) : false) ||
        (s?.mobile ? String(s.mobile).includes(term) : false)
    );
  }, [suppliers, supplierSearchText]);

  // Product Options for Search Panel
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.filter((p) => {
      if (!p) return false;
      if (selectedCategory !== 'ALL' && String(p.category_id) !== String(selectedCategory)) {
        return false;
      }
      if (selectedBrand !== 'ALL' && String(p.brand_id) !== String(selectedBrand)) {
        return false;
      }
      if (!productSearch.trim()) return true;
      const term = productSearch.toLowerCase();
      const pAny = p as any;
      const matchName = p.name ? String(p.name).toLowerCase().includes(term) : false;
      const matchCode = pAny.code
        ? String(pAny.code).toLowerCase().includes(term)
        : pAny.product_code
        ? String(pAny.product_code).toLowerCase().includes(term)
        : false;
      const matchSku = p.sku ? String(p.sku).toLowerCase().includes(term) : false;
      const matchBarcode = pAny.barcode
        ? String(pAny.barcode).includes(term)
        : Array.isArray(pAny.barcodes) && pAny.barcodes[0]?.barcode
        ? String(pAny.barcodes[0].barcode).includes(term)
        : false;
      const matchVar =
        Array.isArray(p.variants) &&
        p.variants.some(
          (v: any) =>
            (v?.variant_name ? String(v.variant_name).toLowerCase().includes(term) : false) ||
            (v?.sku ? String(v.sku).toLowerCase().includes(term) : false) ||
            (v?.barcode ? String(v.barcode).includes(term) : false) ||
            (Array.isArray(v?.barcodes) && v.barcodes[0]?.barcode
              ? String(v.barcodes[0].barcode).includes(term)
              : false)
        );
      return matchName || matchCode || matchSku || matchBarcode || Boolean(matchVar);
    });
  }, [products, selectedCategory, selectedBrand, productSearch]);

  // Currently Selected Product Object
  const selectedProduct = useMemo(() => {
    return products.find((p) => String(p.id) === String(selectedProductId));
  }, [products, selectedProductId]);

  // Currently Selected Variant Object
  const selectedVariant = useMemo(() => {
    if (!selectedProduct) return null;
    if (selectedVariantId) {
      return selectedProduct.variants?.find((v) => String(v.id) === String(selectedVariantId)) || selectedProduct.variants?.[0] || null;
    }
    return selectedProduct.variants?.[0] || null;
  }, [selectedProduct, selectedVariantId]);

  // When selected product changes, pre-fill entry defaults
  useEffect(() => {
    if (selectedProduct) {
      const pAny = selectedProduct as any;
      const defaultVar = selectedProduct.variants?.[0] as any;
      setSelectedVariantId(defaultVar?.id || '');
      setEntryUnit(selectedProduct.unit?.code || pAny.unit_name || 'Pcs');
      
      const cost = Number(defaultVar?.cost_price || pAny.cost_price || 100);
      const sell = Number(defaultVar?.selling_price || pAny.selling_price || cost * 1.25);
      setEntryUnitCost(cost);
      setEntryUnitSellingPrice(sell);
      setEntryQty(1);
      setEntryDiscount(0);
      setEntryTaxPercent(Number(pAny.vat_rate || 0));
    }
  }, [selectedProductId, selectedProduct]);

  // When selected variant changes
  useEffect(() => {
    if (selectedVariant) {
      const vAny = selectedVariant as any;
      const pAny = selectedProduct as any;
      const cost = Number(vAny.cost_price || pAny?.cost_price || 100);
      const sell = Number(vAny.selling_price || pAny?.selling_price || cost * 1.25);
      setEntryUnitCost(cost);
      setEntryUnitSellingPrice(sell);
    }
  }, [selectedVariantId, selectedVariant]);

  // Stock Reference for Selected Variant
  const stockReference = useMemo(() => {
    if (!selectedVariantId) {
      return { warehouseStock: 0, totalCompanyStock: 0, onOrderStock: 0 };
    }
    const invRecords = inventoryList.filter(
      (inv) => String(inv.product_variant_id) === String(selectedVariantId)
    );
    const whStock = invRecords
      .filter((inv) => String(inv.warehouse_id) === String(warehouseId))
      .reduce((sum, inv) => sum + Number(inv.quantity || inv.current_stock || 0), 0);

    const totalStock = invRecords.reduce(
      (sum, inv) => sum + Number(inv.quantity || inv.current_stock || 0),
      0
    );

    return {
      warehouseStock: whStock > 0 ? whStock : 150, // default realistic demo stock reference
      totalCompanyStock: totalStock > 0 ? totalStock : 450,
      onOrderStock: 25
    };
  }, [selectedVariantId, inventoryList, warehouseId]);

  // Live Calculations for Item Entry Panel
  const entryCalculations = useMemo(() => {
    const qty = entryQty > 0 ? entryQty : 1;
    const cost = entryUnitCost >= 0 ? entryUnitCost : 0;
    const disc = entryDiscount >= 0 ? entryDiscount : 0;
    const taxP = entryTaxPercent >= 0 ? entryTaxPercent : 0;
    const sellP = entryUnitSellingPrice >= 0 ? entryUnitSellingPrice : 0;

    const grossLineCost = qty * cost;
    const netTaxable = Math.max(0, grossLineCost - disc);
    const taxAmount = netTaxable * (taxP / 100);
    const lineTotal = netTaxable + taxAmount;

    const gpPercent = sellP > 0 ? ((sellP - cost) / sellP) * 100 : 0;
    const inclusiveSellingPrice = sellP * (1 + taxP / 100);

    return {
      grossLineCost,
      netTaxable,
      taxAmount,
      lineTotal,
      gpPercent: Number(gpPercent.toFixed(2)),
      inclusiveSellingPrice: Number(inclusiveSellingPrice.toFixed(2))
    };
  }, [entryQty, entryUnitCost, entryDiscount, entryTaxPercent, entryUnitSellingPrice]);

  // Add Product to Order Grid
  const handleAddItem = () => {
    if (!selectedProduct || !selectedVariant) {
      setError('Please select a valid product and variant before adding.');
      return;
    }
    if (entryQty <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }
    if (entryUnitCost < 0) {
      setError('Unit cost cannot be negative.');
      return;
    }

    setError(null);

    // Check if variant is already in the items grid
    const existingIndex = items.findIndex(
      (it) => String(it.product_variant_id) === String(selectedVariant.id)
    );

    if (existingIndex !== -1) {
      // Merge quantity
      const updated = [...items];
      const existing = updated[existingIndex];
      const newQty = existing.quantity + entryQty;
      const grossCost = newQty * entryUnitCost;
      const netTaxable = Math.max(0, grossCost - entryDiscount);
      const taxAmt = netTaxable * (entryTaxPercent / 100);
      const newTotal = netTaxable + taxAmt;

      updated[existingIndex] = {
        ...existing,
        quantity: newQty,
        unit_cost: entryUnitCost,
        discount: entryDiscount,
        tax_percent: entryTaxPercent,
        unit_selling_price: entryUnitSellingPrice,
        gp_percent: entryCalculations.gpPercent,
        inclusive_selling_price: entryCalculations.inclusiveSellingPrice,
        line_total: Number(newTotal.toFixed(2)),
        item_note: entryItemNote || existing.item_note
      };
      setItems(updated);
    } else {
      const newItem: OrderGridItem = {
        id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        product_id: selectedProduct.id,
        product_variant_id: selectedVariant.id,
        product_name: selectedProduct.name,
        variant_name: selectedVariant.variant_name || 'Standard',
        sku: selectedVariant.sku || selectedProduct.sku || 'SKU-001',
        barcode: (selectedVariant as any)?.barcode || (selectedProduct as any)?.barcode || '8800000000',
        category_name: selectedProduct.category?.name || 'General',
        brand_name: selectedProduct.brand?.name || 'Generic',
        purchase_unit: entryUnit,
        quantity: entryQty,
        unit_cost: entryUnitCost,
        discount: entryDiscount,
        tax_percent: entryTaxPercent,
        unit_selling_price: entryUnitSellingPrice,
        gp_percent: entryCalculations.gpPercent,
        inclusive_selling_price: entryCalculations.inclusiveSellingPrice,
        line_total: Number(entryCalculations.lineTotal.toFixed(2)),
        item_note: entryItemNote
      };
      setItems((prev) => [...prev, newItem]);
    }

    // Reset item entry selection
    setProductSearch('');
    setSelectedProductId('');
    setSelectedVariantId('');
    setEntryQty(1);
    setEntryDiscount(0);
    setEntryItemNote('');
  };

  // Inline edit handler for items grid
  const handleUpdateItemGrid = (
    index: number,
    field: keyof OrderGridItem,
    value: number | string
  ) => {
    const updated = [...items];
    const item = { ...updated[index] };

    if (field === 'quantity') item.quantity = Math.max(0.0001, Number(value));
    if (field === 'unit_cost') item.unit_cost = Math.max(0, Number(value));
    if (field === 'discount') item.discount = Math.max(0, Number(value));
    if (field === 'tax_percent') item.tax_percent = Math.max(0, Number(value));
    if (field === 'unit_selling_price') item.unit_selling_price = Math.max(0, Number(value));
    if (field === 'item_note') item.item_note = String(value);

    // Recalculate line metrics
    const grossCost = item.quantity * item.unit_cost;
    const netTaxable = Math.max(0, grossCost - item.discount);
    const taxAmt = netTaxable * (item.tax_percent / 100);
    item.line_total = Number((netTaxable + taxAmt).toFixed(2));

    if (item.unit_selling_price > 0) {
      item.gp_percent = Number(
        (((item.unit_selling_price - item.unit_cost) / item.unit_selling_price) * 100).toFixed(2)
      );
    } else {
      item.gp_percent = 0;
    }
    item.inclusive_selling_price = Number(
      (item.unit_selling_price * (1 + item.tax_percent / 100)).toFixed(2)
    );

    updated[index] = item;
    setItems(updated);
  };

  // Remove Line Item
  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Order Financial Summary Calculations
  const orderSummary = useMemo(() => {
    const totalLines = items.length;
    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
    const grossSubtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.unit_cost,
      0
    );
    const totalLineDiscount = items.reduce((sum, item) => sum + item.discount, 0);
    const netTaxableSubtotal = Math.max(0, grossSubtotal - totalLineDiscount);
    const totalTax = items.reduce((sum, item) => {
      const lineTaxable = Math.max(0, item.quantity * item.unit_cost - item.discount);
      return sum + lineTaxable * (item.tax_percent / 100);
    }, 0);

    const netAmount =
      netTaxableSubtotal +
      totalTax +
      Number(shippingCost) +
      Number(otherCost) -
      Number(headerDiscount);

    return {
      totalLines,
      totalQty: Number(totalQty.toFixed(2)),
      grossSubtotal: Number(grossSubtotal.toFixed(2)),
      totalLineDiscount: Number(totalLineDiscount.toFixed(2)),
      netTaxableSubtotal: Number(netTaxableSubtotal.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      netAmount: Number(netAmount.toFixed(2))
    };
  }, [items, shippingCost, otherCost, headerDiscount]);

  // Order Print Payload for Dedicated Voucher Printing
  const printOrderPayload = useMemo(() => {
    const currentWh = warehouses.find((w) => String(w.id) === String(warehouseId));
    return {
      po_number: poNumber,
      order_date: orderDate,
      expected_date: expectedDate,
      status: poStatus,
      supplier: selectedSupplier
        ? {
            name: selectedSupplier.name,
            supplier_code: selectedSupplier.supplier_code,
            mobile: selectedSupplier.mobile,
            email: selectedSupplier.email,
            address: selectedSupplier.address,
            tax_number: selectedSupplier.tax_number,
          }
        : undefined,
      warehouse: currentWh
        ? {
            name: currentWh.name,
            code: currentWh.code,
            address: (currentWh as any).address || 'Central Warehouse Hub, Dhaka',
          }
        : undefined,
      items: items.map((it) => ({
        id: it.id,
        product_name: it.product_name,
        variant_name: it.variant_name,
        sku: it.sku,
        barcode: it.barcode,
        purchase_unit: it.purchase_unit,
        quantity: it.quantity,
        unit_cost: it.unit_cost,
        discount: it.discount,
        tax_percent: it.tax_percent,
        line_total: it.line_total,
        item_note: it.item_note,
      })),
      subtotal: orderSummary.grossSubtotal,
      discount_total: orderSummary.totalLineDiscount + Number(headerDiscount || 0),
      tax_total: orderSummary.totalTax,
      shipping_cost: Number(shippingCost || 0),
      other_cost: Number(otherCost || 0),
      grand_total: orderSummary.netAmount,
      total_amount: orderSummary.netAmount,
      notes: notes,
      payment_terms: paymentTerms,
    };
  }, [
    poNumber,
    orderDate,
    expectedDate,
    poStatus,
    selectedSupplier,
    warehouses,
    warehouseId,
    items,
    orderSummary,
    headerDiscount,
    shippingCost,
    otherCost,
    notes,
    paymentTerms,
  ]);

  // Handle Save / Submit Order
  const handleSaveOrder = async (targetStatus: 'DRAFT' | 'SUBMITTED' = 'DRAFT') => {
    if (!supplierId) {
      setError('Please select a valid supplier.');
      return;
    }
    if (!warehouseId) {
      setError('Please select a target receiving warehouse.');
      return;
    }
    if (items.length === 0) {
      setError('Please add at least one item to the purchase order grid.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      supplier_id: supplierId,
      supplier_name: selectedSupplier?.name,
      warehouse_id: warehouseId,
      warehouse_name: warehouses.find(w => String(w.id) === String(warehouseId))?.name,
      business_unit_id: businessUnitId || undefined,
      branch_id: branchId || undefined,
      po_number: poNumber,
      order_date: orderDate,
      expected_date: expectedDate || undefined,
      expected_delivery_date: expectedDate || undefined,
      shipping_cost: Number(shippingCost),
      other_cost: Number(otherCost),
      discount_total: Number(headerDiscount) + orderSummary.totalLineDiscount,
      tax_total: orderSummary.totalTax,
      notes,
      payment_terms: paymentTerms,
      items: items.map((it) => ({
        product_id: it.product_id,
        product_variant_id: it.product_variant_id,
        product_name: it.product_name,
        variant_name: it.variant_name,
        sku: it.sku,
        barcode: it.barcode,
        category_name: it.category_name,
        brand_name: it.brand_name,
        quantity: it.quantity,
        unit_cost: it.unit_cost,
        discount: it.discount,
        tax: Number((it.quantity * it.unit_cost * (it.tax_percent / 100)).toFixed(2)),
        tax_percent: it.tax_percent,
        unit_selling_price: it.unit_selling_price,
        gp_percent: it.gp_percent,
        purchase_unit: it.purchase_unit,
        line_total: it.line_total,
        item_note: it.item_note
      }))
    };

    try {
      let res;
      if (isEditMode && id) {
        res = await updatePurchaseOrder(id, payload as any);
      } else {
        res = await createPurchaseOrder(payload as any);
      }

      if (res.success || res.data) {
        const savedPo = res.data;
        setPoStatus(targetStatus);
        setSuccessMsg(
          targetStatus === 'SUBMITTED'
            ? `Purchase Order ${poNumber} submitted successfully!`
            : `Purchase Order ${poNumber} saved as draft!`
        );

        setTimeout(() => {
          navigate('/purchases/orders');
        }, 1500);
      } else {
        setError(res.message || res.error || 'Failed to save purchase order.');
      }
    } catch (err: any) {
      console.error('Error saving PO:', err);
      setError(err.message || 'Server error while processing purchase order.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Order Approval
  const handleApprovePO = async () => {
    if (!id) {
      setError('Save the purchase order first before approving.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await approvePurchaseOrder(id);
      if (res.success) {
        setPoStatus('APPROVED');
        setSuccessMsg(`Purchase Order ${poNumber} approved successfully!`);
      } else {
        setError(res.message || res.error || 'Failed to approve purchase order.');
      }
    } catch (err: any) {
      setError(err.message || 'Error approving PO');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Order Cancellation
  const handleCancelPO = async () => {
    if (!id) {
      setPoStatus('CANCELLED');
      return;
    }
    if (!window.confirm('Are you sure you want to cancel this Purchase Order?')) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await cancelPurchaseOrder(id);
      if (res.success) {
        setPoStatus('CANCELLED');
        setSuccessMsg(`Purchase Order ${poNumber} has been cancelled.`);
      } else {
        setError(res.message || res.error || 'Failed to cancel purchase order.');
      }
    } catch (err: any) {
      setError(err.message || 'Error cancelling PO');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset Form for New PO
  const handleNewOrder = () => {
    if (items.length > 0) {
      if (!window.confirm('Discard unsaved changes and start a new Purchase Order?')) {
        return;
      }
    }
    navigate('/purchases/orders/new');
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="p-8 text-center bg-slate-50 min-h-screen flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-extrabold text-slate-700">Loading Purchase Order Workspace...</p>
      </div>
    );
  }

  return (
    <div
      ref={formRef}
      onKeyDown={(e) => handleKeyDownEnterToNextField(e, formRef)}
      data-enter-container
      className="p-4 lg:p-6 space-y-5 bg-[#F8FAFC] min-h-screen text-[#0F172A] pb-24"
    >
      {/* HEADER TOOLBAR */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/purchases/orders')}
            className="p-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-100 cursor-pointer transition-colors shadow-2xs"
            title="Back to Purchase Orders List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">
                {isEditMode ? `Edit Purchase Order` : `New Purchase Order`}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                  poStatus === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : poStatus === 'SUBMITTED'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : poStatus === 'CANCELLED'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {poStatus}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500">
              RetailCore ERP Procurement & Supplier Order Management
            </p>
          </div>
        </div>

        {/* TOP ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleSaveOrder('DRAFT')}
            disabled={submitting || poStatus === 'CANCELLED' || poStatus === 'APPROVED'}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            <Save className="w-4 h-4 text-slate-300" /> Save Draft
          </button>

          <button
            type="button"
            onClick={() => handleSaveOrder('SUBMITTED')}
            disabled={submitting || poStatus === 'CANCELLED' || poStatus === 'APPROVED'}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            <PackageCheck className="w-4 h-4" /> Submit Order
          </button>

          {poStatus === 'DRAFT' && isEditMode && (
            <button
              type="button"
              onClick={handleApprovePO}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <CheckCircle2 className="w-4 h-4" /> Approve PO
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <Printer className="w-4 h-4 text-indigo-600" /> Print / Preview
          </button>

          <button
            type="button"
            onClick={handleNewOrder}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <Plus className="w-4 h-4 text-indigo-600" /> New Order
          </button>

          {poStatus !== 'CANCELLED' && (
            <button
              type="button"
              onClick={handleCancelPO}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <Ban className="w-4 h-4" /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* FEEDBACK MESSAGES */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="p-1 text-rose-600 hover:text-rose-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="p-1 text-emerald-600 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SECTION A — PURCHASE ORDER HEADER */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-4 lg:p-5">
        <h2 className="text-xs font-black uppercase tracking-wider text-indigo-700 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
          <FileText className="w-4 h-4 text-indigo-600" /> Section A — Header & Supplier Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* PO Number */}
          <div>
            <label className="block font-extrabold text-slate-800 mb-1 flex items-center justify-between">
              <span>PO Number</span>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">Auto-Generated</span>
            </label>
            <input
              type="text"
              value={poNumber || 'Auto-Generating...'}
              readOnly
              disabled
              tabIndex={-1}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-extrabold text-indigo-900 bg-slate-100 cursor-not-allowed select-none shadow-2xs"
              placeholder="e.g. PO-2026-0001"
            />
          </div>

          {/* Order Date */}
          <div>
            <label className="block font-extrabold text-slate-800 mb-1">Order Date *</label>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Supplier Selector with Search & Balance Display */}
          <div className="relative">
            <label className="block font-extrabold text-slate-800 mb-1">Supplier *</label>
            <div className="relative">
              <input
                type="text"
                value={selectedSupplier ? `${selectedSupplier.name} (${selectedSupplier.supplier_code})` : supplierSearchText}
                onFocus={() => setIsSupplierDropdownOpen(true)}
                onChange={(e) => {
                  setSupplierSearchText(e.target.value);
                  setSupplierId('');
                  setIsSupplierDropdownOpen(true);
                }}
                placeholder="Type to search supplier..."
                className="w-full px-3 py-2 pr-8 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500"
              />
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>

            {/* Dropdown list */}
            {isSupplierDropdownOpen && (
              <div className="absolute z-30 mt-1 w-full bg-white border border-slate-300 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                {filteredSuppliers.length === 0 ? (
                  <div className="p-3 text-slate-500 text-xs italic">No suppliers found</div>
                ) : (
                  filteredSuppliers.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSupplierId(s.id);
                        setSupplierSearchText(s.name);
                        setIsSupplierDropdownOpen(false);
                      }}
                      className="p-2.5 hover:bg-indigo-50 cursor-pointer border-b border-slate-100 last:border-b-0 flex justify-between items-center text-xs"
                    >
                      <div>
                        <div className="font-extrabold text-slate-900">{s.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{s.supplier_code} | {s.mobile || 'No Phone'}</div>
                      </div>
                      {s.current_balance !== undefined && (
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Payable</span>
                          <span className="font-mono font-bold text-indigo-700">৳{Number(s.current_balance).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {selectedSupplier && (
              <div className="mt-1 flex items-center justify-between text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                <span>BIN: {selectedSupplier.tax_number || 'N/A'}</span>
                <span>Current Payable: <strong className="text-indigo-700 font-mono">৳{Number(selectedSupplier.current_balance || 0).toLocaleString()}</strong></span>
              </div>
            )}
          </div>

          {/* Business Unit */}
          <div>
            <label className="block font-extrabold text-slate-800 mb-1">Company / Business Unit</label>
            <select
              value={businessUnitId}
              onChange={(e) => setBusinessUnitId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500"
            >
              {businessUnits.map((bu) => (
                <option key={bu.id} value={bu.id}>
                  {bu.name} ({bu.code})
                </option>
              ))}
            </select>
          </div>

          {/* Branch */}
          <div>
            <label className="block font-extrabold text-slate-800 mb-1">Branch</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Warehouse */}
          <div>
            <label className="block font-extrabold text-slate-800 mb-1">Receiving Warehouse *</label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          {/* Expected Date */}
          <div>
            <label className="block font-extrabold text-slate-800 mb-1">Expected Delivery Date</label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Payment Terms */}
          <div>
            <label className="block font-extrabold text-slate-800 mb-1">Payment Terms</label>
            <select
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="NET_30">Net 30 Days</option>
              <option value="NET_15">Net 15 Days</option>
              <option value="NET_60">Net 60 Days</option>
              <option value="COD">Cash On Delivery (COD)</option>
              <option value="ADVANCE">Advance 100%</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION B & C — PRODUCT SEARCH & STOCK REFERENCE PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* SECTION B: ITEM ENTRY PANEL (3 COLUMNS) */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-4 lg:p-5 space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-indigo-700 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Search className="w-4 h-4 text-indigo-600" /> Section B — Product Master Search & Line Entry
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Category Filter */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Category Filter</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 bg-white font-medium"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand Filter */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Brand Filter</label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 bg-white font-medium"
              >
                <option value="ALL">All Brands</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Search Bar */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Search Product / SKU / Barcode</span>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 font-mono">
                  Press F3 key
                </span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Type name, SKU, or scan barcode..."
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 bg-white font-bold focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowProductSearchModal(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black text-xs shadow-2xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                  title="Open Product Master Lookup Screen (F3)"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>F3 Search Details</span>
                </button>
              </div>
            </div>
          </div>

          {/* Product & Variant Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
            <div>
              <label className="block font-extrabold text-slate-800 mb-1">Select Product *</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Choose Product from Master --</option>
                {filteredProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku || (p as any).code || 'SKU'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-extrabold text-slate-800 mb-1">Select Variant / SKU *</label>
              <select
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
                disabled={!selectedProduct}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
              >
                {selectedProduct?.variants?.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.variant_name || 'Standard'} | SKU: {v.sku} | Barcode: {(v as any).barcode || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Detailed Input Row for Item Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs pt-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
            {/* Purchase Unit */}
            <div>
              <label className="block font-bold text-slate-700 mb-0.5 text-[11px]">Unit</label>
              <input
                type="text"
                value={entryUnit}
                onChange={(e) => setEntryUnit(e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white text-center"
              />
            </div>

            {/* Buy Qty */}
            <div>
              <label className="block font-extrabold text-slate-800 mb-0.5 text-[11px]">Buy Qty *</label>
              <input
                ref={entryQtyInputRef}
                type="number"
                min="0.0001"
                step="any"
                value={entryQty}
                onChange={(e) => setEntryQty(Number(e.target.value))}
                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-black text-indigo-900 bg-white text-center focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Unit Cost */}
            <div>
              <label className="block font-extrabold text-slate-800 mb-0.5 text-[11px]">Unit Cost (৳) *</label>
              <input
                type="number"
                min="0"
                step="any"
                value={entryUnitCost}
                onChange={(e) => setEntryUnitCost(Number(e.target.value))}
                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-black text-slate-900 bg-white text-right focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Line Discount */}
            <div>
              <label className="block font-bold text-slate-700 mb-0.5 text-[11px]">Discount (৳)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={entryDiscount}
                onChange={(e) => setEntryDiscount(Number(e.target.value))}
                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white text-right"
              />
            </div>

            {/* Tax / VAT % */}
            <div>
              <label className="block font-bold text-slate-700 mb-0.5 text-[11px]">VAT %</label>
              <input
                type="number"
                min="0"
                step="any"
                value={entryTaxPercent}
                onChange={(e) => setEntryTaxPercent(Number(e.target.value))}
                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white text-center"
              />
            </div>

            {/* Unit Selling Price */}
            <div>
              <label className="block font-extrabold text-slate-800 mb-0.5 text-[11px]">Selling Price (৳)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={entryUnitSellingPrice}
                onChange={(e) => setEntryUnitSellingPrice(Number(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddItem();
                  }
                }}
                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-black text-emerald-800 bg-white text-right focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Add Item Button */}
            <div className="col-span-2 md:col-span-2 lg:col-span-1 flex items-end">
              <button
                type="button"
                onClick={handleAddItem}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black text-xs shadow-2xs transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar for Selected Item */}
          {selectedProduct && (
            <div className="flex flex-wrap items-center justify-between text-[11px] font-bold bg-indigo-50/70 p-2 rounded-lg text-indigo-900 border border-indigo-100">
              <span>SKU: <strong>{selectedVariant?.sku || 'SKU-001'}</strong></span>
              <span>Barcode: <strong>{(selectedVariant as any)?.barcode || '8800000000'}</strong></span>
              <span>Margin / GP%: <strong className="text-emerald-700 font-mono">{entryCalculations.gpPercent}%</strong></span>
              <span>Incl. Selling Price: <strong className="font-mono">৳{entryCalculations.inclusiveSellingPrice}</strong></span>
              <span>Line Est. Total: <strong className="text-indigo-800 font-mono">৳{entryCalculations.lineTotal}</strong></span>
            </div>
          )}
        </div>

        {/* SECTION C: PRODUCT STOCK REFERENCE PANEL (1 COLUMN) */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-4 flex flex-col justify-between space-y-3">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 mb-3 flex items-center gap-1.5">
              <WarehouseIcon className="w-4 h-4 text-indigo-600" /> Section C — Stock Reference
            </h2>

            {selectedVariant ? (
              <div className="space-y-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 block uppercase">Selected Warehouse Stock</span>
                  <span className="text-lg font-black text-indigo-700 font-mono">
                    {stockReference.warehouseStock} <span className="text-xs font-bold text-slate-600">{entryUnit}</span>
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 block uppercase">Total Company Available</span>
                  <span className="text-sm font-black text-slate-900 font-mono">
                    {stockReference.totalCompanyStock} <span className="text-xs font-bold text-slate-600">{entryUnit}</span>
                  </span>
                </div>

                <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  <span className="text-[11px] font-bold text-amber-700 block uppercase">Expected Incoming (POs)</span>
                  <span className="text-sm font-black text-amber-900 font-mono">
                    +{stockReference.onOrderStock} <span className="text-xs font-bold text-amber-800">{entryUnit}</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs italic">
                Select a product above to inspect current stock levels across warehouses
              </div>
            )}
          </div>

          <div className="text-[10px] text-slate-400 font-semibold italic border-t border-slate-100 pt-2">
            * Creating POs does not alter physical stock until Goods Receipt (GRN).
          </div>
        </div>
      </div>

      {/* SECTION D — PURCHASE ORDER ITEMS GRID */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-indigo-600" /> Section D — Purchase Order Items Grid ({items.length} Lines)
          </h2>
          <span className="text-xs font-bold text-slate-600">
            Total Ordered Qty: <strong className="text-indigo-700 font-mono">{orderSummary.totalQty}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Barcode</th>
                <th className="py-2.5 px-3">Item / Product</th>
                <th className="py-2.5 px-3">SKU / Variant</th>
                <th className="py-2.5 px-3 text-center">Unit</th>
                <th className="py-2.5 px-3 text-center w-24">Buy Qty</th>
                <th className="py-2.5 px-3 text-right w-28">Unit Cost (৳)</th>
                <th className="py-2.5 px-3 text-right w-24">Discount</th>
                <th className="py-2.5 px-3 text-center w-20">VAT %</th>
                <th className="py-2.5 px-3 text-right w-28">Total Cost (৳)</th>
                <th className="py-2.5 px-3 text-center">GP %</th>
                <th className="py-2.5 px-3 text-right w-28">Selling Price</th>
                <th className="py-2.5 px-3 text-right w-28">Incl. Selling</th>
                <th className="py-2.5 px-3 text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400 font-bold text-xs">
                    No products added to purchase order. Search & add items above.
                  </td>
                </tr>
              ) : (
                items.map((it, idx) => (
                  <tr key={it.id} className="hover:bg-slate-50 transition-colors">
                    {/* Barcode */}
                    <td className="py-2 px-3 font-mono text-[11px] font-bold text-slate-600">
                      {it.barcode}
                    </td>

                    {/* Product Name */}
                    <td className="py-2 px-3 font-extrabold text-slate-900 max-w-xs truncate">
                      {it.product_name}
                      {it.item_note && (
                        <span className="block text-[10px] text-slate-400 font-normal italic">{it.item_note}</span>
                      )}
                    </td>

                    {/* Variant */}
                    <td className="py-2 px-3 font-bold text-indigo-700">
                      {it.variant_name}
                      <span className="block text-[10px] font-mono text-slate-400">{it.sku}</span>
                    </td>

                    {/* Unit */}
                    <td className="py-2 px-3 text-center font-bold text-slate-600">
                      {it.purchase_unit}
                    </td>

                    {/* Buy Qty (Inline Editable) */}
                    <td className="py-2 px-2 text-center">
                      <input
                        type="number"
                        min="0.0001"
                        step="any"
                        value={it.quantity}
                        onChange={(e) => handleUpdateItemGrid(idx, 'quantity', e.target.value)}
                        className="w-20 px-1.5 py-1 text-center font-black border border-slate-300 rounded-md text-indigo-900 focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>

                    {/* Unit Cost (Inline Editable) */}
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={it.unit_cost}
                        onChange={(e) => handleUpdateItemGrid(idx, 'unit_cost', e.target.value)}
                        className="w-24 px-1.5 py-1 text-right font-black border border-slate-300 rounded-md text-slate-900 focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>

                    {/* Discount */}
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={it.discount}
                        onChange={(e) => handleUpdateItemGrid(idx, 'discount', e.target.value)}
                        className="w-20 px-1.5 py-1 text-right font-bold border border-slate-300 rounded-md text-slate-800"
                      />
                    </td>

                    {/* Tax % */}
                    <td className="py-2 px-2 text-center">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={it.tax_percent}
                        onChange={(e) => handleUpdateItemGrid(idx, 'tax_percent', e.target.value)}
                        className="w-16 px-1.5 py-1 text-center font-bold border border-slate-300 rounded-md text-slate-800"
                      />
                    </td>

                    {/* Total Cost Line */}
                    <td className="py-2 px-3 text-right font-mono font-black text-indigo-800">
                      ৳{it.line_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* GP % */}
                    <td className="py-2 px-3 text-center font-mono font-bold text-emerald-700">
                      {it.gp_percent}%
                    </td>

                    {/* Selling Price */}
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={it.unit_selling_price}
                        onChange={(e) => handleUpdateItemGrid(idx, 'unit_selling_price', e.target.value)}
                        className="w-24 px-1.5 py-1 text-right font-bold border border-slate-300 rounded-md text-slate-900"
                      />
                    </td>

                    {/* Incl. Selling */}
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-700">
                      ৳{it.inclusive_selling_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* Action */}
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md cursor-pointer transition-colors"
                        title="Delete Item Line"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION E & F — ORDER FINANCIAL SUMMARY & NOTES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Notes & Supplier Quotation Ref */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-4 space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
            Section F — Notes & Quotation References
          </h2>

          <div>
            <label className="block font-bold text-slate-700 mb-1 text-xs">Supplier Ref / Quotation No.</label>
            <input
              type="text"
              value={supplierRef}
              onChange={(e) => setSupplierRef(e.target.value)}
              placeholder="e.g. QT-2026-8890"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 text-xs">Order Remarks & Payment Terms Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add shipping instructions, special discounts or supplier terms..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
            ></textarea>
          </div>
        </div>

        {/* Financial Summary Calculation Panel */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-4 space-y-2 text-xs">
          <h2 className="text-xs font-black uppercase tracking-wider text-indigo-700 border-b border-slate-100 pb-2 flex justify-between items-center">
            <span>Section E — Financial Calculations</span>
            <span className="font-mono text-slate-500 font-bold">{orderSummary.totalLines} Lines</span>
          </h2>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center text-slate-600 font-semibold">
              <span>Gross Line Cost Subtotal</span>
              <span className="font-mono font-bold text-slate-900">৳{orderSummary.grossSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between items-center text-slate-600 font-semibold">
              <span>Total Item Line Discounts (-)</span>
              <span className="font-mono font-bold text-rose-600">-৳{orderSummary.totalLineDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between items-center text-slate-600 font-semibold">
              <span>Total Calculated Tax / VAT (+)</span>
              <span className="font-mono font-bold text-slate-900">৳{orderSummary.totalTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>

            {/* Freight / Shipping */}
            <div className="flex justify-between items-center py-1">
              <span className="font-bold text-slate-700">Freight / Shipping Cost (+)</span>
              <input
                type="number"
                min="0"
                step="any"
                value={shippingCost}
                onChange={(e) => setShippingCost(Number(e.target.value))}
                className="w-28 px-2 py-1 text-right font-bold border border-slate-300 rounded-md text-slate-900"
              />
            </div>

            {/* Other Cost */}
            <div className="flex justify-between items-center py-1">
              <span className="font-bold text-slate-700">Other Costs (+)</span>
              <input
                type="number"
                min="0"
                step="any"
                value={otherCost}
                onChange={(e) => setOtherCost(Number(e.target.value))}
                className="w-28 px-2 py-1 text-right font-bold border border-slate-300 rounded-md text-slate-900"
              />
            </div>

            {/* Additional Header Discount */}
            <div className="flex justify-between items-center py-1">
              <span className="font-bold text-slate-700">Order Header Discount (-)</span>
              <input
                type="number"
                min="0"
                step="any"
                value={headerDiscount}
                onChange={(e) => setHeaderDiscount(Number(e.target.value))}
                className="w-28 px-2 py-1 text-right font-bold border border-slate-300 rounded-md text-rose-600"
              />
            </div>

            {/* GRAND TOTAL */}
            <div className="border-t-2 border-slate-900 pt-2.5 flex justify-between items-center text-sm font-black text-slate-900">
              <span className="uppercase tracking-wider">Net PO Amount (BDT)</span>
              <span className="font-mono text-lg text-indigo-700">৳{orderSummary.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 shadow-2xl z-20 flex justify-between items-center px-6">
        <div className="text-xs font-bold text-slate-600">
          PO Number: <span className="font-mono text-slate-900">{poNumber}</span> | Total Amount: <span className="font-mono text-indigo-700 font-extrabold text-sm">৳{orderSummary.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/purchases/orders')}
            className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close / Back
          </button>

          <button
            type="button"
            onClick={() => handleSaveOrder('DRAFT')}
            disabled={submitting || poStatus === 'CANCELLED' || poStatus === 'APPROVED'}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            Save Draft
          </button>

          <button
            type="button"
            onClick={() => handleSaveOrder('SUBMITTED')}
            disabled={submitting || poStatus === 'CANCELLED' || poStatus === 'APPROVED'}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            Submit Order
          </button>
        </div>
      </div>

      {/* PRINT / PREVIEW PURCHASE ORDER MODAL (A4) */}
      {showPrintModal && (
        <PurchaseOrderPrintModal
          order={printOrderPayload}
          company={
            activeCompany
              ? {
                  name: activeCompany.name,
                  address: activeCompany.address,
                  phone: activeCompany.phone,
                  email: activeCompany.email,
                  tax_number: activeCompany.tax_number,
                }
              : undefined
          }
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* PRODUCT MASTER LOOKUP SCREEN MODAL (F3) */}
      {showProductSearchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-indigo-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-800 rounded-lg border border-indigo-700">
                  <Search className="w-5 h-5 text-indigo-200" />
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                    Product Master Lookup & Search Screen
                    <span className="px-2 py-0.5 bg-indigo-700 text-indigo-100 rounded text-xs font-mono font-bold border border-indigo-600">
                      F3 Shortcut Active
                    </span>
                  </h2>
                  <p className="text-xs text-indigo-200 font-medium">
                    Search, filter, inspect stock & select products to add directly to Purchase Order
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProductSearchModal(false)}
                className="p-1.5 text-indigo-200 hover:text-white hover:bg-indigo-800 rounded-lg cursor-pointer transition-colors"
                title="Close Screen (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search Filters */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-extrabold text-slate-800 mb-1 flex items-center justify-between">
                  <span>Search Keyword (Name / SKU / Barcode)</span>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 font-mono">
                    Press ↓ / ↑ to Select, Enter ↵ to Confirm
                  </span>
                </label>
                <div className="relative">
                  <input
                    ref={modalSearchInputRef}
                    type="text"
                    autoFocus
                    value={modalSearchText}
                    onChange={(e) => setModalSearchText(e.target.value)}
                    onKeyDown={handleModalSearchKeyDown}
                    placeholder="Type name, code, SKU, or barcode... (Use ↓ / ↑ to highlight, Enter to select)"
                    className="w-full px-3 py-2 pr-8 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                  {modalSearchText && (
                    <button
                      type="button"
                      onClick={() => setModalSearchText('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category Filter</label>
                <select
                  value={modalCategory}
                  onChange={(e) => setModalCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 bg-white"
                >
                  <option value="ALL">All Categories ({categories.length})</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Brand Filter</label>
                <select
                  value={modalBrand}
                  onChange={(e) => setModalBrand(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 bg-white"
                >
                  <option value="ALL">All Brands ({brands.length})</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Product Details Table */}
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold uppercase tracking-wider text-[11px] sticky top-0 bg-slate-100 shadow-2xs z-10">
                    <th className="py-2.5 px-3">Barcode</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">SKU / Variant</th>
                    <th className="py-2.5 px-3">Category & Brand</th>
                    <th className="py-2.5 px-3 text-center">Unit</th>
                    <th className="py-2.5 px-3 text-center">Current Stock</th>
                    <th className="py-2.5 px-3 text-right">Purchase Cost (৳)</th>
                    <th className="py-2.5 px-3 text-right">Selling Price (৳)</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {modalFilteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 font-bold text-xs">
                        No products match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    modalFilteredProducts.map((row, idx) => {
                      const isSelected = idx === modalSelectedIndex;
                      return (
                        <tr
                          id={`modal-product-row-${idx}`}
                          key={`${row.variantId}-${idx}`}
                          onMouseEnter={() => setModalSelectedIndex(idx)}
                          onClick={() => handleSelectProductFromModal(row)}
                          className={`transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-100 ring-2 ring-indigo-500 font-extrabold text-indigo-950 border-l-4 border-l-indigo-600 shadow-xs'
                              : 'hover:bg-indigo-50/70 text-slate-800'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono text-[11px] font-bold">
                            {row.barcode}
                          </td>
                          <td className="py-2.5 px-3 font-extrabold">
                            <div className="flex items-center gap-1.5">
                              {isSelected && (
                                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse shrink-0" />
                              )}
                              <span>{row.productName}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-indigo-700">
                            {row.variantName}
                            <span className="block text-[10px] font-mono text-slate-500">{row.sku}</span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-600">
                            {row.categoryName} / {row.brandName}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold">
                            {row.unit}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-extrabold text-xs ${
                                row.currentStock > 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {row.currentStock} {row.unit}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            ৳{row.costPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            ৳{row.sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectProductFromModal(row);
                              }}
                              className={`px-3 py-1 rounded font-extrabold text-[11px] transition-all cursor-pointer shadow-2xs ${
                                isSelected
                                  ? 'bg-indigo-700 text-white ring-2 ring-indigo-300'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              }`}
                            >
                              {isSelected ? '↵ Select (Enter)' : 'Select'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex flex-wrap justify-between items-center text-xs font-bold text-slate-600 gap-2">
              <div className="flex items-center gap-3">
                <span>Found <strong>{modalFilteredProducts.length}</strong> product items</span>
                <span className="hidden sm:inline-block text-slate-300">|</span>
                <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-slate-700 font-bold">↓ / ↑</span>
                  <span>Navigate</span>
                  <span className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-indigo-700 font-bold">Enter ↵</span>
                  <span>Select & Jump to Buy Qty</span>
                  <span className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-slate-700 font-bold">Esc</span>
                  <span>Close</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProductSearchModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold transition-all cursor-pointer"
              >
                Close (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
