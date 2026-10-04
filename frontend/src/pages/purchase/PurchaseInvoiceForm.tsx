import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router';
import { 
  ArrowLeft, 
  Save, 
  Send, 
  Plus, 
  Trash2, 
  AlertCircle, 
  FileText,
  Building2,
  Package,
  Layers
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { createPurchase } from '../../api/purchases';
import { getSuppliers } from '../../api/suppliers';
import { getPurchaseOrders } from '../../api/purchaseOrders';
import { getGoodsReceipts } from '../../api/goodsReceipts';
import { getWarehouses } from '../../api/organization';
import { getProducts } from '../../api/products';
import { formatCurrency } from '../../utils/currency';
import { useLanguage } from '../../i18n';
import { Supplier } from '../../types/supplier';
import { Warehouse } from '../../types/organization';
import { Product, ProductVariant } from '../../types/product';
import { PurchaseOrder } from '../../types/purchase';
import { GoodsReceipt } from '../../types/purchase';

interface InvoiceLineItem {
  product_id: number;
  product_variant_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  unit_cost: number;
  discount: number;
  tax: number;
  line_total: number;
}

export function PurchaseInvoiceForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  // Reference options
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Form State
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<number | ''>('');
  const [purchaseOrderId, setPurchaseOrderId] = useState<number | ''>('');
  const [goodsReceiptId, setGoodsReceiptId] = useState<number | ''>('');
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [otherCost, setOtherCost] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  // Line Items
  const [items, setItems] = useState<InvoiceLineItem[]>([]);

  // Product Selection Modal/Row State
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [selectedVariantId, setSelectedVariantId] = useState<number | ''>('');
  const [addItemQty, setAddItemQty] = useState<number>(1);
  const [addItemCost, setAddItemCost] = useState<number>(0);

  // Status/Loading
  const [loading, setLoading] = useState<boolean>(false);
  const [initLoading, setInitLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadPrerequisites();
  }, []);

  const loadPrerequisites = async () => {
    setInitLoading(true);
    try {
      const [supRes, whRes, poRes, grRes, prodRes] = await Promise.all([
        getSuppliers(),
        getWarehouses(),
        getPurchaseOrders({ status: 'APPROVED' }),
        getGoodsReceipts({ status: 'POSTED' }),
        getProducts({ per_page: 100 }),
      ]);

      const supList = Array.isArray(supRes.data) ? supRes.data : ((supRes as any).data?.data || []);
      const whList = Array.isArray(whRes.data) ? whRes.data : ((whRes as any).data?.data || []);
      const poList = Array.isArray(poRes.data) ? poRes.data : ((poRes as any).data?.data || []);
      const grList = Array.isArray(grRes.data) ? grRes.data : ((grRes as any).data?.data || []);
      const prodList = Array.isArray(prodRes.data) ? prodRes.data : ((prodRes as any).data?.data || []);

      setSuppliers(supList);
      setWarehouses(whList);
      setPurchaseOrders(poList);
      setGoodsReceipts(grList);
      setProducts(prodList);

      // Check query parameters (e.g. ?po_id=12 or ?gr_id=5)
      const params = new URLSearchParams(location.search);
      const qPoId = params.get('po_id');
      const qGrId = params.get('gr_id');

      if (qGrId) {
        const targetGr = grList.find((g: GoodsReceipt) => g.id === Number(qGrId));
        if (targetGr) {
          handleSelectGoodsReceipt(targetGr);
        }
      } else if (qPoId) {
        const targetPo = poList.find((p: PurchaseOrder) => p.id === Number(qPoId));
        if (targetPo) {
          handleSelectPurchaseOrder(targetPo);
        }
      }
    } catch (err: any) {
      console.error('Failed to load prerequisites:', err);
      setErrorMessage(err.message || 'Failed to load initial form data.');
    } finally {
      setInitLoading(false);
    }
  };

  const handleSelectPurchaseOrder = (po: PurchaseOrder) => {
    setPurchaseOrderId(po.id);
    setSupplierId(po.supplier_id);
    if (po.warehouse_id) {
      setWarehouseId(po.warehouse_id);
    }

    if (po.items && po.items.length > 0) {
      const mappedItems: InvoiceLineItem[] = po.items.map((pi) => {
        const qty = Number(pi.quantity);
        const cost = Number(pi.unit_cost);
        const disc = Number(pi.discount || 0);
        const tax = Number(pi.tax || 0);
        return {
          product_id: pi.product_id,
          product_variant_id: pi.product_variant_id,
          product_name: pi.product?.name || `Product #${pi.product_id}`,
          sku: pi.variant?.sku || `SKU-${pi.product_variant_id}`,
          quantity: qty,
          unit_cost: cost,
          discount: disc,
          tax: tax,
          line_total: Math.max(0, qty * cost - disc + tax),
        };
      });
      setItems(mappedItems);
    }
  };

  const handleSelectGoodsReceipt = (gr: GoodsReceipt) => {
    setGoodsReceiptId(gr.id);
    setSupplierId(gr.supplier_id);
    if (gr.warehouse_id) {
      setWarehouseId(gr.warehouse_id);
    }
    if (gr.purchase_order_id) {
      setPurchaseOrderId(gr.purchase_order_id);
    }

    if (gr.items && gr.items.length > 0) {
      const mappedItems: InvoiceLineItem[] = gr.items.map((gi) => {
        const qty = Number(gi.received_quantity);
        const cost = Number(gi.unit_cost);
        return {
          product_id: gi.product_id,
          product_variant_id: gi.product_variant_id,
          product_name: gi.product?.name || `Product #${gi.product_id}`,
          sku: gi.product_variant?.sku || `SKU-${gi.product_variant_id}`,
          quantity: qty,
          unit_cost: cost,
          discount: 0,
          tax: 0,
          line_total: qty * cost,
        };
      });
      setItems(mappedItems);
    }
  };

  const handleAddItem = () => {
    if (!selectedProductId || !selectedVariantId || addItemQty <= 0) {
      return;
    }

    const prod = products.find((p) => p.id === Number(selectedProductId));
    const variant = prod?.variants?.find((v: ProductVariant) => v.id === Number(selectedVariantId));

    const existingIdx = items.findIndex(
      (it) => it.product_variant_id === Number(selectedVariantId)
    );

    if (existingIdx >= 0) {
      const updated = [...items];
      updated[existingIdx].quantity += addItemQty;
      updated[existingIdx].line_total = 
        updated[existingIdx].quantity * updated[existingIdx].unit_cost -
        updated[existingIdx].discount +
        updated[existingIdx].tax;
      setItems(updated);
    } else {
      const newItem: InvoiceLineItem = {
        product_id: Number(selectedProductId),
        product_variant_id: Number(selectedVariantId),
        product_name: prod?.name || `Product #${selectedProductId}`,
        sku: variant?.sku || `SKU-${selectedVariantId}`,
        quantity: addItemQty,
        unit_cost: addItemCost > 0 ? addItemCost : Number(variant?.purchase_price ?? variant?.cost_price ?? 0),
        discount: 0,
        tax: 0,
        line_total: addItemQty * (addItemCost > 0 ? addItemCost : Number(variant?.purchase_price ?? variant?.cost_price ?? 0)),
      };
      setItems([...items, newItem]);
    }

    // Reset line input
    setSelectedProductId('');
    setSelectedVariantId('');
    setAddItemQty(1);
    setAddItemCost(0);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof InvoiceLineItem,
    value: number
  ) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    const qty = Number(updated[index].quantity);
    const cost = Number(updated[index].unit_cost);
    const disc = Number(updated[index].discount || 0);
    const tax = Number(updated[index].tax || 0);
    updated[index].line_total = Math.max(0, qty * cost - disc + tax);
    setItems(updated);
  };

  // Preview Totals
  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unit_cost, 0);
  const discountTotal = items.reduce((sum, it) => sum + Number(it.discount || 0), 0);
  const taxTotal = items.reduce((sum, it) => sum + Number(it.tax || 0), 0);
  const grandTotal = Math.max(
    0,
    subtotal - discountTotal + taxTotal + Number(shippingCost || 0) + Number(otherCost || 0)
  );

  const handleSubmit = async (postImmediately: boolean) => {
    setErrorMessage(null);

    if (!supplierId) {
      setErrorMessage(t('purchases.validation.supplierRequired', 'Please select a supplier.'));
      return;
    }

    if (!supplierInvoiceNumber.trim()) {
      setErrorMessage(t('purchases.validation.invoiceNumberRequired', 'Supplier invoice number is required.'));
      return;
    }

    if (!invoiceDate) {
      setErrorMessage(t('purchases.validation.dateRequired', 'Invoice date is required.'));
      return;
    }

    if (items.length === 0) {
      setErrorMessage(t('purchases.validation.itemsRequired', 'Please add at least one line item.'));
      return;
    }

    for (const it of items) {
      if (it.quantity <= 0) {
        setErrorMessage(t('purchases.validation.invalidQuantity', 'Item quantities must be greater than zero.'));
        return;
      }
      if (it.unit_cost < 0) {
        setErrorMessage(t('purchases.validation.invalidCost', 'Item cost cannot be negative.'));
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        supplier_id: Number(supplierId),
        supplier_invoice_number: supplierInvoiceNumber.trim(),
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        warehouse_id: warehouseId ? Number(warehouseId) : null,
        purchase_order_id: purchaseOrderId ? Number(purchaseOrderId) : null,
        goods_receipt_id: goodsReceiptId ? Number(goodsReceiptId) : null,
        shipping_cost: Number(shippingCost || 0),
        other_cost: Number(otherCost || 0),
        notes: notes.trim() || null,
        post_immediately: postImmediately,
        items: items.map((it) => ({
          product_id: it.product_id,
          product_variant_id: it.product_variant_id,
          quantity: it.quantity,
          unit_cost: it.unit_cost,
          discount: it.discount,
          tax: it.tax,
        })),
      };

      const res = await createPurchase(payload);

      navigate('/purchases/invoices', {
        state: {
          successMessage: postImmediately
            ? t('purchases.success.posted', 'Purchase invoice created and posted to Accounts Payable successfully!')
            : t('purchases.success.created', 'Draft purchase invoice created successfully!'),
        },
      });
    } catch (err: any) {
      console.error('Failed to create purchase invoice:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to create Purchase Invoice.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === Number(selectedProductId));

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <PageHeader
        breadcrumbs={[
          { label: t('purchases.breadcrumb', 'Purchases'), to: '/purchases/invoices' },
          { label: t('purchases.create.title', 'Create Purchase Invoice') },
        ]}
        title={t('purchases.create.title', 'Create Purchase Invoice')}
        subtitle={t('purchases.create.subtitle', 'Record vendor invoice, reconcile with PO/Goods Receipt, and post to Accounts Payable.')}
        actions={
          <Link
            to="/purchases/invoices"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t('common.cancel', 'Cancel')}
          </Link>
        }
      />

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {initLoading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <span>Loading procurement data...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Information Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileText className="w-4 h-4 text-indigo-600" />
                {t('purchases.form.generalInfo', 'Invoice Header & Supplier')}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Supplier */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('purchases.form.supplier', 'Supplier / Vendor')} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white font-medium"
                  >
                    <option value="">Select Supplier...</option>
                    {suppliers.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name} ({sup.supplier_code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Supplier Invoice Number */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('purchases.form.supplierInvoiceNo', 'Supplier Invoice #')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={supplierInvoiceNumber}
                    onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV-2026-9081"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono font-medium"
                  />
                </div>

                {/* Invoice Date */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('purchases.form.invoiceDate', 'Invoice Date')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('purchases.form.dueDate', 'Due Date')}
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  />
                </div>
              </div>

              {/* Source Document References */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2 border-t border-slate-100">
                {/* Warehouse */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('purchases.form.warehouse', 'Destination Warehouse')}
                  </label>
                  <select
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  >
                    <option value="">Select Warehouse...</option>
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name} ({wh.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Link PO */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('purchases.form.purchaseOrder', 'Link Purchase Order')}
                  </label>
                  <select
                    value={purchaseOrderId}
                    onChange={(e) => {
                      const idVal = e.target.value ? Number(e.target.value) : '';
                      setPurchaseOrderId(idVal);
                      if (idVal) {
                        const target = purchaseOrders.find((p) => p.id === idVal);
                        if (target) handleSelectPurchaseOrder(target);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  >
                    <option value="">No PO Linked</option>
                    {purchaseOrders.map((po) => (
                      <option key={po.id} value={po.id}>
                        {po.po_number} ({formatCurrency(po.grand_total)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Link Goods Receipt */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('purchases.form.goodsReceipt', 'Link Goods Receipt')}
                  </label>
                  <select
                    value={goodsReceiptId}
                    onChange={(e) => {
                      const idVal = e.target.value ? Number(e.target.value) : '';
                      setGoodsReceiptId(idVal);
                      if (idVal) {
                        const target = goodsReceipts.find((g) => g.id === idVal);
                        if (target) handleSelectGoodsReceipt(target);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  >
                    <option value="">No GR Linked</option>
                    {goodsReceipts.map((gr) => (
                      <option key={gr.id} value={gr.id}>
                        {gr.receipt_number} ({gr.receipt_date})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Line Items Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-600" />
                  {t('purchases.form.lineItems', 'Billed Line Items')}
                </h3>
                <span className="text-xs text-slate-500">
                  {items.length} {t('purchases.form.itemsCount', 'items added')}
                </span>
              </div>

              {/* Add Product Row */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs items-end">
                <div className="sm:col-span-5">
                  <label className="block font-semibold text-slate-600 mb-1">Product</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      const pId = e.target.value ? Number(e.target.value) : '';
                      setSelectedProductId(pId);
                      setSelectedVariantId('');
                      if (pId) {
                        const prod = products.find((p) => p.id === pId);
                        if (prod?.variants && prod.variants.length > 0) {
                          setSelectedVariantId(prod.variants[0].id);
                          setAddItemCost(Number(prod.variants[0].purchase_price ?? prod.variants[0].cost_price ?? 0));
                        }
                      }
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Select Product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-semibold text-slate-600 mb-1">Variant / SKU</label>
                  <select
                    value={selectedVariantId}
                    disabled={!selectedProductId}
                    onChange={(e) => {
                      const vId = e.target.value ? Number(e.target.value) : '';
                      setSelectedVariantId(vId);
                      if (vId && selectedProduct?.variants) {
                        const v = selectedProduct.variants.find((vr: ProductVariant) => vr.id === vId);
                        if (v) setAddItemCost(Number(v.purchase_price ?? v.cost_price ?? 0));
                      }
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Select SKU...</option>
                    {selectedProduct?.variants?.map((v: ProductVariant) => (
                      <option key={v.id} value={v.id}>
                        {v.sku} {v.variant_name ? `(${v.variant_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-600 mb-1">Qty</label>
                  <input
                    type="number"
                    min="0.0001"
                    step="any"
                    value={addItemQty}
                    onChange={(e) => setAddItemQty(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!selectedProductId || !selectedVariantId || addItemQty <= 0}
                    className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-3">Item / SKU</th>
                      <th className="py-2.5 px-3 text-right w-24">Quantity</th>
                      <th className="py-2.5 px-3 text-right w-28">Unit Cost</th>
                      <th className="py-2.5 px-3 text-right w-24">Discount</th>
                      <th className="py-2.5 px-3 text-right w-24">Tax</th>
                      <th className="py-2.5 px-3 text-right w-32">Line Total</th>
                      <th className="py-2.5 px-3 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.length > 0 ? (
                      items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{item.product_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              min="0.0001"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 text-right font-mono font-medium border border-slate-300 rounded text-xs"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_cost}
                              onChange={(e) => handleItemChange(idx, 'unit_cost', parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1 text-right font-mono font-medium border border-slate-300 rounded text-xs"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.discount}
                              onChange={(e) => handleItemChange(idx, 'discount', parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 text-right font-mono text-slate-600 border border-slate-300 rounded text-xs"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.tax}
                              onChange={(e) => handleItemChange(idx, 'tax', parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 text-right font-mono text-slate-600 border border-slate-300 rounded text-xs"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(item.line_total)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          No line items added yet. Add items above or select an approved PO / Goods Receipt.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Notes */}
              <div className="pt-2">
                <label className="block font-semibold text-slate-700 mb-1 text-xs">
                  {t('purchases.form.notes', 'Notes & Terms')}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional vendor terms, payment conditions, or notes..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Right Column (Financial Summary & Posting) */}
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                {t('purchases.form.summary', 'Financial Valuation (BDT)')}
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(subtotal)}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Item Discount:</span>
                  <span className="font-mono text-emerald-700">-{formatCurrency(discountTotal)}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>VAT / Tax Total:</span>
                  <span className="font-mono text-slate-800">+{formatCurrency(taxTotal)}</span>
                </div>

                {/* Additional costs */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Shipping Cost:</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={shippingCost}
                      onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 text-right font-mono border border-slate-300 rounded text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Other Cost:</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={otherCost}
                      onChange={(e) => setOtherCost(parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 text-right font-mono border border-slate-300 rounded text-xs"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t-2 border-slate-200 flex justify-between items-baseline">
                  <span className="font-bold text-slate-900 text-sm">Grand Total:</span>
                  <span className="font-mono font-extrabold text-indigo-700 text-lg">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Accounting Info Box */}
              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-1.5 text-[11px] text-indigo-900">
                <div className="font-bold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Double-Entry GL Accounting</span>
                </div>
                <p className="text-slate-600 text-[10px] leading-relaxed">
                  Upon posting, this invoice debits <strong>AP Clearing (GRNI)</strong> and credits <strong>Accounts Payable</strong>. Inventory was already increased during Goods Receipt.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSubmit(true)}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {t('purchases.actions.saveAndPost', 'Save & Post to AP')}
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSubmit(false)}
                  className="w-full py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Save className="w-4 h-4 text-slate-500" />
                  {t('purchases.actions.saveDraft', 'Save as Draft')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
