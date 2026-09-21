import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { 
  FileText, 
  ArrowLeft, 
  Save, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Search, 
  Building2, 
  Warehouse as WarehouseIcon, 
  Calendar, 
  Clock, 
  Truck, 
  DollarSign, 
  AlertCircle, 
  RefreshCw, 
  Check, 
  X, 
  HelpCircle,
  Package,
  Layers,
  ShieldCheck,
  UserCheck,
  ExternalLink
} from 'lucide-react';
import { Supplier } from '../../types/supplier';
import { Warehouse } from '../../types/organization';
import { Product, ProductVariant } from '../../types/product';
import { PurchaseOrderStatus, CreatePurchaseOrderPayload } from '../../types/purchase';
import { getSuppliers } from '../../api/suppliers';
import { getWarehouses } from '../../api/organization';
import { getProducts } from '../../api/products';
import { 
  createPurchaseOrder, 
  getPurchaseOrder, 
  generateNextPoNumber 
} from '../../api/purchaseOrders';
import { formatCurrency } from '../../utils/currency';

interface FormLineItem {
  tempId: string;
  product_id: number;
  product_variant_id: number;
  product_name: string;
  sku: string;
  variant_name?: string;
  quantity: number;
  unit_cost: number;
  discount: number;
  tax: number;
}

// Resilient default products catalog matching customer business verticals
const FALLBACK_PRODUCTS = [
  {
    id: 1,
    name: 'Samsung Galaxy A55 5G (8GB/256GB)',
    sku: 'SAM-A55-256',
    category_name: 'Mobile & Electronics',
    variant_id: 1,
    variant_name: 'Awesome Navy (IMEI Tracking)',
    cost_price: 34500,
    selling_price: 42000,
  },
  {
    id: 2,
    name: 'iPhone 15 Pro Max (256GB Dual SIM)',
    sku: 'APP-IP15PM-256',
    category_name: 'Mobile & Electronics',
    variant_id: 2,
    variant_name: 'Natural Titanium',
    cost_price: 135000,
    selling_price: 152000,
  },
  {
    id: 3,
    name: 'LEGO City High-Speed Train Set 60197',
    sku: 'TOY-LEGO-TRN',
    category_name: 'Toys & Kids',
    variant_id: 3,
    variant_name: 'Full Building Set 677 Pcs',
    cost_price: 11200,
    selling_price: 14500,
  },
  {
    id: 4,
    name: 'Remote Control Monster Truck 4WD',
    sku: 'TOY-RC-TRK',
    category_name: 'Toys & Kids',
    variant_id: 4,
    variant_name: '1:12 Scale Red / 2.4GHz',
    cost_price: 3200,
    selling_price: 4800,
  },
  {
    id: 5,
    name: 'Men 100% Combed Cotton Boxer Brief (Pack of 3)',
    sku: 'APP-BX-03',
    category_name: 'Undergarments & Apparel',
    variant_id: 5,
    variant_name: 'Size L / Multi-Color Navy-Black-Grey',
    cost_price: 650,
    selling_price: 1100,
  },
  {
    id: 6,
    name: 'Seamless Stretch Thermal Base Undergarment Set',
    sku: 'APP-THM-SET',
    category_name: 'Undergarments & Apparel',
    variant_id: 6,
    variant_name: 'Size XL / Charcoal Grey',
    cost_price: 950,
    selling_price: 1650,
  },
  {
    id: 7,
    name: 'Aroma Miniket Premium Rice (50kg Bag)',
    sku: 'GRO-MNK-50',
    category_name: 'Supermarket & FMCG',
    variant_id: 7,
    variant_name: 'Standard 50kg Polythene Lined',
    cost_price: 3600,
    selling_price: 4100,
  },
];

export function PurchaseOrderForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);

  // Core Lookup States
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>(FALLBACK_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [poNumber, setPoNumber] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState('');
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [warehouseId, setWarehouseId] = useState<number | ''>('');
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [otherCost, setOtherCost] = useState<number>(0);
  const [discountTotal, setDiscountTotal] = useState<number>(0);
  const [taxTotal, setTaxTotal] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');

  // Line items
  const [items, setItems] = useState<FormLineItem[]>([]);

  // Product quick-search bar state
  const [productSearch, setProductSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    loadPrerequisites();
  }, [id]);

  const loadPrerequisites = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Generate PO Number
      if (!isEditMode) {
        setPoNumber(generateNextPoNumber());
      }

      // 2. Fetch Suppliers
      const supRes: any = await getSuppliers({ all: true });
      const supList: Supplier[] = Array.isArray(supRes)
        ? supRes
        : Array.isArray(supRes?.data)
        ? supRes.data
        : (supRes?.data?.data || []);
      setSuppliers(supList);
      if (supList.length > 0 && !supplierId) {
        setSupplierId(supList[0].id);
      }

      // 3. Fetch Warehouses
      const whRes = await getWarehouses();
      const whList: Warehouse[] = whRes.data || [];
      setWarehouses(whList);
      if (whList.length > 0 && !warehouseId) {
        setWarehouseId(whList[0].id);
      }

      // 4. Fetch Products
      try {
        const prodRes: any = await getProducts();
        const apiProds: any[] = Array.isArray(prodRes) ? prodRes : (prodRes?.data || []);
        if (apiProds.length > 0) {
          const mapped: any[] = [];
          apiProds.forEach((p: any) => {
            if (p.variants && p.variants.length > 0) {
              p.variants.forEach((v: any) => {
                mapped.push({
                  id: p.id,
                  name: p.name,
                  sku: v.sku || p.product_code || `PRD-${p.id}`,
                  category_name: p.category?.name || 'General',
                  variant_id: v.id || 1,
                  variant_name: v.variant_name || 'Standard',
                  cost_price: Number(v.cost_price) || 0,
                  selling_price: Number(v.selling_price) || 0,
                });
              });
            } else {
              mapped.push({
                id: p.id,
                name: p.name,
                sku: p.product_code || `PRD-${p.id}`,
                category_name: p.category?.name || 'General',
                variant_id: 1,
                variant_name: 'Standard',
                cost_price: 0,
                selling_price: 0,
              });
            }
          });
          if (mapped.length > 0) {
            setAvailableProducts(mapped);
          }
        }
      } catch {
        // Fallback to FALLBACK_PRODUCTS
      }

      // 5. If edit mode, load existing PO
      if (id) {
        const poRes = await getPurchaseOrder(Number(id));
        const po = poRes.data;
        if (po) {
          setPoNumber(po.po_number);
          setOrderDate(po.order_date || new Date().toISOString().split('T')[0]);
          setExpectedDate(po.expected_date || '');
          setSupplierId(po.supplier_id);
          setWarehouseId(po.warehouse_id);
          setShippingCost(Number(po.shipping_cost) || 0);
          setOtherCost(Number(po.other_cost) || 0);
          setDiscountTotal(Number(po.discount_total) || 0);
          setTaxTotal(Number(po.tax_total) || 0);
          setNotes(po.notes || '');

          if (po.items && po.items.length > 0) {
            setItems(
              po.items.map((it: any, idx: number) => ({
                tempId: `existing-${it.id || idx}`,
                product_id: it.product_id,
                product_variant_id: it.product_variant_id,
                product_name: it.product?.name || `Product #${it.product_id}`,
                sku: it.variant?.sku || it.product?.product_code || 'SKU-N/A',
                variant_name: it.variant?.variant_name || 'Standard',
                quantity: Number(it.quantity) || 1,
                unit_cost: Number(it.unit_cost) || 0,
                discount: Number(it.discount) || 0,
                tax: Number(it.tax) || 0,
              }))
            );
          }
        }
      } else {
        // Add 1 default sample item if empty
        if (items.length === 0 && FALLBACK_PRODUCTS.length > 0) {
          const sample = FALLBACK_PRODUCTS[0];
          setItems([
            {
              tempId: `temp-${Date.now()}-1`,
              product_id: sample.id,
              product_variant_id: sample.variant_id,
              product_name: sample.name,
              sku: sample.sku,
              variant_name: sample.variant_name,
              quantity: 20,
              unit_cost: sample.cost_price,
              discount: 0,
              tax: 0,
            },
          ]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize purchase order form.');
    } finally {
      setLoading(false);
    }
  };

  // Selected Supplier details
  const selectedSupplier = useMemo(() => {
    return suppliers.find((s) => s.id === Number(supplierId));
  }, [suppliers, supplierId]);

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const line = (item.quantity * item.unit_cost) - (item.discount || 0) + (item.tax || 0);
      return sum + line;
    }, 0);
  }, [items]);

  const grandTotal = useMemo(() => {
    const total = subtotal + Number(shippingCost || 0) + Number(otherCost || 0) + Number(taxTotal || 0) - Number(discountTotal || 0);
    return total > 0 ? total : 0;
  }, [subtotal, shippingCost, otherCost, taxTotal, discountTotal]);

  // Add Product to line items
  const handleAddProduct = (prod: any) => {
    const existingIndex = items.findIndex(
      (it) => it.product_id === prod.id && it.product_variant_id === prod.variant_id
    );

    if (existingIndex >= 0) {
      // Increment quantity
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          tempId: `temp-${Date.now()}-${Math.random()}`,
          product_id: prod.id,
          product_variant_id: prod.variant_id,
          product_name: prod.name,
          sku: prod.sku,
          variant_name: prod.variant_name,
          quantity: 1,
          unit_cost: prod.cost_price || 0,
          discount: 0,
          tax: 0,
        },
      ]);
    }

    setProductSearch('');
    setIsSearchOpen(false);
  };

  // Add Blank Row
  const handleAddBlankRow = () => {
    const defaultProd = availableProducts[0] || {
      id: 1,
      variant_id: 1,
      name: 'Custom Ordered Item',
      sku: 'CUSTOM-01',
      variant_name: 'Standard',
      cost_price: 1000,
    };

    setItems([
      ...items,
      {
        tempId: `temp-${Date.now()}-${Math.random()}`,
        product_id: defaultProd.id,
        product_variant_id: defaultProd.variant_id,
        product_name: defaultProd.name,
        sku: defaultProd.sku,
        variant_name: defaultProd.variant_name,
        quantity: 1,
        unit_cost: defaultProd.cost_price || 0,
        discount: 0,
        tax: 0,
      },
    ]);
  };

  // Update item field
  const handleUpdateItem = (index: number, field: keyof FormLineItem, val: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    setItems(updated);
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Filtered search products
  const searchResults = useMemo(() => {
    if (!productSearch.trim()) return [];
    const q = productSearch.toLowerCase();
    return availableProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.category_name && p.category_name.toLowerCase().includes(q))
    );
  }, [availableProducts, productSearch]);

  // Form Submission
  const handleSubmit = async (e: React.FormEvent, submitStatus: PurchaseOrderStatus = 'DRAFT') => {
    e.preventDefault();
    setError(null);

    if (!supplierId) {
      setError('Please select a Supplier.');
      return;
    }

    if (!warehouseId) {
      setError('Please select a Destination Warehouse.');
      return;
    }

    if (!poNumber.trim()) {
      setError('PO Number is required.');
      return;
    }

    if (items.length === 0) {
      setError('Please add at least one line item to this purchase order.');
      return;
    }

    // Check invalid quantities or costs
    for (let i = 0; i < items.length; i++) {
      if (items[i].quantity <= 0) {
        setError(`Row #${i + 1} (${items[i].product_name}): Quantity must be greater than zero.`);
        return;
      }
      if (items[i].unit_cost < 0) {
        setError(`Row #${i + 1} (${items[i].product_name}): Unit cost cannot be negative.`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload: CreatePurchaseOrderPayload = {
        supplier_id: Number(supplierId),
        warehouse_id: Number(warehouseId),
        po_number: poNumber.trim(),
        order_date: orderDate,
        expected_date: expectedDate || null,
        shipping_cost: Number(shippingCost) || 0,
        other_cost: Number(otherCost) || 0,
        discount_total: Number(discountTotal) || 0,
        tax_total: Number(taxTotal) || 0,
        notes: notes.trim() || null,
        status: submitStatus,
        items: items.map((it) => ({
          product_id: it.product_id,
          product_variant_id: it.product_variant_id,
          quantity: Number(it.quantity),
          unit_cost: Number(it.unit_cost),
          discount: Number(it.discount) || 0,
          tax: Number(it.tax) || 0,
        })),
      };

      const res = await createPurchaseOrder(payload);
      navigate('/purchases/orders', {
        state: { successMessage: `Purchase Order ${poNumber} created successfully.` },
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save purchase order. Please verify required fields.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div id="po-form-loading" className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-slate-500 font-medium">Initializing purchase order builder...</span>
        </div>
      </div>
    );
  }

  return (
    <div id="purchase-order-form-page" className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Breadcrumb & Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link to="/purchases/orders" className="hover:text-indigo-600 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Purchase Orders
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">{isEditMode ? 'Edit PO' : 'New Order'}</span>
          </div>
          <h1 id="po-form-title" className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-indigo-600" />
            <span>{isEditMode ? `Edit Purchase Order #${poNumber}` : 'Create Purchase Order'}</span>
          </h1>
          <p className="text-xs text-slate-500">
            Issue formal procurement requests, specify delivery terms, and order inventory from authorized vendors.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/purchases/orders"
            id="btn-cancel-po"
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </Link>
          <button
            type="button"
            id="btn-save-draft-po"
            disabled={saving}
            onClick={(e) => handleSubmit(e, 'DRAFT')}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save as Draft</span>
          </button>
          <button
            type="button"
            id="btn-submit-approve-po"
            disabled={saving}
            onClick={(e) => handleSubmit(e, 'APPROVED')}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs hover:shadow cursor-pointer flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{saving ? 'Processing...' : 'Submit & Approve PO'}</span>
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {error && (
        <div id="po-form-error-alert" className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Section 1: Order Metadata & Parties */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card A: Order Identity & Dates */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Purchase Order Details</span>
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
              Step 1 of 3
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label htmlFor="po-number-input" className="block font-semibold text-slate-700 mb-1">
                PO Reference Number <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id="po-number-input"
                  type="text"
                  required
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="PO-2026-0001"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
                <button
                  type="button"
                  onClick={() => setPoNumber(generateNextPoNumber())}
                  title="Generate Next Sequence Number"
                  className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="order-date-input" className="block font-semibold text-slate-700 mb-1">
                  Order Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="order-date-input"
                    type="date"
                    required
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="expected-date-input" className="block font-semibold text-slate-700 mb-1">
                  Expected Delivery
                </label>
                <div className="relative">
                  <input
                    id="expected-date-input"
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="warehouse-select" className="block font-semibold text-slate-700 mb-1">
                Destination Warehouse / Stock Location <span className="text-rose-500">*</span>
              </label>
              <select
                id="warehouse-select"
                required
                value={warehouseId}
                onChange={(e) => setWarehouseId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Card B: Supplier / Vendor Selection */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <UserCheck className="w-4 h-4 text-purple-600" />
              <span>Vendor / Supplier Selection</span>
            </div>
            <Link
              to="/purchases/suppliers/new"
              target="_blank"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> New Supplier <ExternalLink className="w-3 h-3 ml-0.5" />
            </Link>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label htmlFor="supplier-select" className="block font-semibold text-slate-700 mb-1">
                Select Authorized Vendor <span className="text-rose-500">*</span>
              </label>
              <select
                id="supplier-select"
                required
                value={supplierId}
                onChange={(e) => setSupplierId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
              >
                <option value="">-- Choose Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.supplier_code}) &bull; {s.mobile}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Supplier Live Information Card */}
            {selectedSupplier ? (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{selectedSupplier.name}</span>
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 font-mono text-[10px] rounded border border-purple-200 font-bold">
                      {selectedSupplier.supplier_code}
                    </span>
                  </div>
                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                    {selectedSupplier.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-400 block">Contact Person</span>
                    <span className="text-slate-800 font-medium">{selectedSupplier.contact_person || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Phone</span>
                    <span className="text-slate-800 font-medium">{selectedSupplier.mobile}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Email</span>
                    <span className="text-slate-800 font-medium truncate">{selectedSupplier.email || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Payment Terms</span>
                    <span className="text-indigo-700 font-semibold">{selectedSupplier.payment_terms || 'Net 30 Days'}</span>
                  </div>
                </div>

                {selectedSupplier.address && (
                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    <span className="text-slate-400 font-medium">Billing Address: </span>
                    {selectedSupplier.address}, {selectedSupplier.city}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Please select a vendor to associate pricing agreements and order history.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Order Line Items (Interactive Builder) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Table Header & Search Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600" />
              <span>Purchase Order Line Items</span>
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full font-bold">
                {items.length} Items
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Add products, specify quantities and unit cost prices to generate line subtotals.
            </p>
          </div>

          {/* Quick Product Search & Add Bar */}
          <div className="flex items-center gap-2 relative">
            <div className="relative w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="search-product-input"
                type="text"
                value={productSearch}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setIsSearchOpen(true);
                }}
                placeholder="Search product name or SKU..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />

              {/* Autocomplete Dropdown */}
              {isSearchOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsSearchOpen(false)} />
                  <div className="absolute right-0 mt-1 w-96 max-h-72 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 overflow-y-auto">
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      Catalog Products & SKUs
                    </div>
                    {searchResults.length > 0 ? (
                      searchResults.map((prod) => (
                        <button
                          key={`${prod.id}-${prod.variant_id}`}
                          type="button"
                          onClick={() => handleAddProduct(prod)}
                          className="w-full px-3 py-2 text-left hover:bg-indigo-50/70 transition-colors flex items-center justify-between border-b border-slate-50"
                        >
                          <div>
                            <div className="text-xs font-semibold text-slate-800 line-clamp-1">{prod.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                              <span>SKU: {prod.sku}</span>
                              <span>&bull;</span>
                              <span>{prod.variant_name}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold text-indigo-600">
                              {formatCurrency(prod.cost_price)}
                            </span>
                            <span className="text-[10px] text-slate-400 block">Cost Price</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400">
                        {productSearch ? 'No matching product found.' : 'Type to search catalog...'}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleAddBlankRow}
              id="btn-add-blank-row"
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Row</span>
            </button>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3 min-w-[260px]">Product / Item Description</th>
                <th className="py-2.5 px-3 w-28 text-center">Quantity</th>
                <th className="py-2.5 px-3 w-32 text-right">Unit Cost (৳)</th>
                <th className="py-2.5 px-3 w-28 text-right">Discount (৳)</th>
                <th className="py-2.5 px-3 w-28 text-right">Tax / VAT (৳)</th>
                <th className="py-2.5 px-3 w-36 text-right">Line Total</th>
                <th className="py-2.5 px-3 w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {items.map((item, index) => {
                const lineTotal = (item.quantity * item.unit_cost) - (item.discount || 0) + (item.tax || 0);

                return (
                  <tr key={item.tempId} className="hover:bg-slate-50/50 transition-colors">
                    {/* Index */}
                    <td className="py-3 px-3 text-center text-slate-400 font-mono">
                      {index + 1}
                    </td>

                    {/* Product Name & SKU */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{item.product_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono text-[10px]">
                          {item.sku}
                        </span>
                        {item.variant_name && item.variant_name !== 'Standard' && (
                          <span className="text-slate-500 text-[10px]">{item.variant_name}</span>
                        )}
                      </div>
                    </td>

                    {/* Quantity Stepper */}
                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(index, 'quantity', Math.max(1, Number(e.target.value) || 1))}
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-center text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </td>

                    {/* Unit Cost */}
                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.unit_cost}
                        onChange={(e) => handleUpdateItem(index, 'unit_cost', Math.max(0, Number(e.target.value) || 0))}
                        className="w-28 px-2 py-1 border border-slate-300 rounded text-right text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </td>

                    {/* Discount */}
                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.discount}
                        onChange={(e) => handleUpdateItem(index, 'discount', Math.max(0, Number(e.target.value) || 0))}
                        className="w-24 px-2 py-1 border border-slate-200 rounded text-right text-xs font-mono text-slate-600 outline-none"
                      />
                    </td>

                    {/* Tax */}
                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.tax}
                        onChange={(e) => handleUpdateItem(index, 'tax', Math.max(0, Number(e.target.value) || 0))}
                        className="w-24 px-2 py-1 border border-slate-200 rounded text-right text-xs font-mono text-slate-600 outline-none"
                      />
                    </td>

                    {/* Line Subtotal */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-xs">
                      {formatCurrency(lineTotal)}
                    </td>

                    {/* Delete Action */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        title="Remove item"
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {items.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-sm text-slate-600">No items added to this purchase order yet.</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Use the search bar above to select products from your catalog or click quick add below.
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-4">
                      {FALLBACK_PRODUCTS.slice(0, 3).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleAddProduct(p)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors"
                        >
                          + Add {p.name.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Cost Totals & Commercial Terms */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Order Notes & Terms */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900 border-b border-slate-100 pb-2.5">
            <Truck className="w-4 h-4 text-indigo-600" />
            <span>Delivery Instructions & Commercial Notes</span>
          </div>

          <div>
            <label htmlFor="notes-textarea" className="block font-semibold text-slate-700 mb-1">
              Supplier Instructions / Order Remarks
            </label>
            <textarea
              id="notes-textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Please deliver to Warehouse Gate 2. Inspection required prior to goods acceptance."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label htmlFor="payment-terms-select" className="block font-semibold text-slate-700 mb-1">
                Payment Terms
              </label>
              <select
                id="payment-terms-select"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white outline-none"
              >
                <option value="Net 30 Days">Net 30 Days</option>
                <option value="Net 15 Days">Net 15 Days</option>
                <option value="Cash on Delivery (COD)">Cash on Delivery (COD)</option>
                <option value="100% Advance Payment">100% Advance Payment</option>
                <option value="50% Advance, 50% on Receipt">50% Advance, 50% on Receipt</option>
              </select>
            </div>

            <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg">
              <span className="font-bold text-indigo-900 block mb-1">ERP Ledger Guard</span>
              <p className="text-[11px] text-indigo-700 leading-relaxed">
                Approving this PO will commit procurement liabilities and enable partial or full Goods Receipts (GRN).
              </p>
            </div>
          </div>
        </div>

        {/* Right Col: Cost Breakdown & Grand Total Card */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3.5 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <span className="font-bold text-sm text-slate-900">Order Cost Summary</span>
            <span className="text-[11px] font-mono text-slate-400">BDT (৳) Currency</span>
          </div>

          <div className="space-y-2.5">
            {/* Items Subtotal */}
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Items Subtotal:</span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                {formatCurrency(subtotal)}
              </span>
            </div>

            {/* Discount Total */}
            <div className="flex items-center justify-between">
              <label htmlFor="discount-total-input" className="text-slate-500">Overall Discount (৳):</label>
              <input
                id="discount-total-input"
                type="number"
                min="0"
                step="any"
                value={discountTotal}
                onChange={(e) => setDiscountTotal(Math.max(0, Number(e.target.value) || 0))}
                className="w-28 px-2 py-1 border border-slate-200 rounded text-right font-mono text-slate-700 outline-none"
              />
            </div>

            {/* Shipping Cost */}
            <div className="flex items-center justify-between">
              <label htmlFor="shipping-cost-input" className="text-slate-500">Freight & Shipping (৳):</label>
              <input
                id="shipping-cost-input"
                type="number"
                min="0"
                step="any"
                value={shippingCost}
                onChange={(e) => setShippingCost(Math.max(0, Number(e.target.value) || 0))}
                className="w-28 px-2 py-1 border border-slate-200 rounded text-right font-mono text-slate-700 outline-none"
              />
            </div>

            {/* Other Costs */}
            <div className="flex items-center justify-between">
              <label htmlFor="other-cost-input" className="text-slate-500">Other / Handling (৳):</label>
              <input
                id="other-cost-input"
                type="number"
                min="0"
                step="any"
                value={otherCost}
                onChange={(e) => setOtherCost(Math.max(0, Number(e.target.value) || 0))}
                className="w-28 px-2 py-1 border border-slate-200 rounded text-right font-mono text-slate-700 outline-none"
              />
            </div>

            {/* Tax Total */}
            <div className="flex items-center justify-between">
              <label htmlFor="tax-total-input" className="text-slate-500">Tax / VAT Amount (৳):</label>
              <input
                id="tax-total-input"
                type="number"
                min="0"
                step="any"
                value={taxTotal}
                onChange={(e) => setTaxTotal(Math.max(0, Number(e.target.value) || 0))}
                className="w-28 px-2 py-1 border border-slate-200 rounded text-right font-mono text-slate-700 outline-none"
              />
            </div>
          </div>

          {/* Grand Total Box */}
          <div className="p-4 bg-slate-900 text-white rounded-xl space-y-1 mt-4">
            <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
              Net Payable Grand Total
            </span>
            <div id="grand-total-display" className="text-2xl font-bold font-mono tracking-tight text-emerald-400">
              {formatCurrency(grandTotal)}
            </div>
            <div className="text-[10px] text-slate-400">
              Includes all line items, applicable taxes and logistics fees.
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={saving}
              onClick={(e) => handleSubmit(e, 'DRAFT')}
              className="w-1/2 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer text-center"
            >
              Save Draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={(e) => handleSubmit(e, 'APPROVED')}
              className="w-1/2 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs cursor-pointer text-center"
            >
              Approve PO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
