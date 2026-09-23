import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { 
  Package, 
  ArrowLeft, 
  Save, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Warehouse as WarehouseIcon,
  Building2,
  Calendar,
  Layers,
  MapPin,
  Clock,
  Info
} from 'lucide-react';
import { PurchaseOrder, CreateGoodsReceiptPayload } from '../../types/purchase';
import { StorageLocation, Warehouse } from '../../types/organization';
import { getPurchaseOrders, getPurchaseOrder } from '../../api/purchaseOrders';
import { createGoodsReceipt, postGoodsReceipt, generateNextGrNumber } from '../../api/goodsReceipts';
import { getWarehouses, getStorageLocations } from '../../api/organization';
import { formatCurrency } from '../../utils/currency';

interface ReceivingLineItem {
  purchase_order_item_id: number;
  product_id: number;
  product_name: string;
  sku: string;
  ordered_quantity: number;
  already_received: number;
  pending_quantity: number;
  received_quantity: number;
  unit_cost: number;
  line_total: number;
  batch_number: string;
  expiry_date: string;
  storage_location_id: number | null;
  error?: string | null;
}

export function GoodsReceiptForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPoId = searchParams.get('po_id');

  // Form State
  const [availablePos, setAvailablePos] = useState<PurchaseOrder[]>([]);
  const [selectedPoId, setSelectedPoId] = useState<number | ''>(initialPoId ? Number(initialPoId) : '');
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | ''>('');
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  
  const [receiptNumber, setReceiptNumber] = useState(generateNextGrNumber());
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [items, setItems] = useState<ReceivingLineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState<'DRAFT' | 'POST'>('DRAFT');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load available approved/partially received POs & warehouses
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [poRes, whRes] = await Promise.all([
        getPurchaseOrders(),
        getWarehouses()
      ]);

      const validPos = (poRes.data || []).filter(
        (po) => po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED'
      );
      setAvailablePos(validPos);
      setWarehouses(whRes.data || []);

      if (initialPoId) {
        handlePoSelect(Number(initialPoId));
      }
    } catch (err) {
      console.error('Failed to load initial form data:', err);
    }
  };

  // When PO is selected
  const handlePoSelect = async (poId: number) => {
    setSelectedPoId(poId);
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await getPurchaseOrder(poId);
      const po = res.data;
      setSelectedPo(po);
      setSelectedWarehouseId(po.warehouse_id);

      // Load storage locations for the warehouse
      if (po.warehouse_id) {
        loadLocations(po.warehouse_id);
      }

      // Map line items
      const mappedItems: ReceivingLineItem[] = (po.items || []).map((it) => {
        const pending = Number(it.pending_quantity ?? (Number(it.quantity) - Number(it.received_quantity || 0)));
        return {
          purchase_order_item_id: it.id || 0,
          product_id: it.product_id,
          product_name: it.product?.name || `Product #${it.product_id}`,
          sku: it.variant?.sku || it.product?.sku || 'N/A',
          ordered_quantity: Number(it.quantity),
          already_received: Number(it.received_quantity || 0),
          pending_quantity: pending,
          received_quantity: pending > 0 ? pending : 0,
          unit_cost: Number(it.unit_cost),
          line_total: (pending > 0 ? pending : 0) * Number(it.unit_cost),
          batch_number: '',
          expiry_date: '',
          storage_location_id: null,
          error: null,
        };
      });

      setItems(mappedItems);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load purchase order details');
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async (whId: number) => {
    try {
      const locRes = await getStorageLocations({ warehouse_id: whId, is_active: true });
      setStorageLocations(locRes.data || []);
    } catch (err) {
      console.warn('Failed to load storage locations:', err);
      setStorageLocations([]);
    }
  };

  const handleWarehouseChange = (whId: number) => {
    setSelectedWarehouseId(whId);
    loadLocations(whId);
    // Reset locations if changed
    setItems((prev) => prev.map((item) => ({ ...item, storage_location_id: null })));
  };

  const handleQuantityChange = (idx: number, val: string) => {
    const num = parseFloat(val);
    setItems((prev) => {
      const next = [...prev];
      const target = { ...next[idx] };

      if (isNaN(num) || num < 0) {
        target.received_quantity = 0;
        target.error = 'Quantity must be at least 0';
      } else if (num > target.pending_quantity) {
        target.received_quantity = num;
        target.error = `Receive quantity cannot exceed pending quantity (${target.pending_quantity})`;
      } else {
        target.received_quantity = num;
        target.error = null;
      }

      target.line_total = target.received_quantity * target.unit_cost;
      next[idx] = target;
      return next;
    });
  };

  const handleItemFieldChange = (idx: number, field: keyof ReceivingLineItem, val: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  // Summary calculations
  const totalItemsCount = items.length;
  const totalReceivingQty = items.reduce((sum, it) => sum + (Number(it.received_quantity) || 0), 0);
  const totalReceivingCost = items.reduce((sum, it) => sum + (Number(it.line_total) || 0), 0);
  const hasErrors = items.some((it) => !!it.error);
  const hasZeroTotal = totalReceivingQty <= 0;

  // Save / Post Handlers
  const handleSubmit = async (isPost: boolean) => {
    setErrorMessage(null);

    if (!selectedPoId || !selectedPo) {
      setErrorMessage('Please select an approved Purchase Order.');
      return;
    }

    if (hasErrors) {
      setErrorMessage('Please resolve quantity validation errors before submitting.');
      return;
    }

    if (hasZeroTotal) {
      setErrorMessage('At least one item must have a receive quantity greater than 0.');
      return;
    }

    if (isPost) {
      setSubmitMode('POST');
      setIsConfirmModalOpen(true);
      return;
    }

    executeSubmission(false);
  };

  const executeSubmission = async (isPost: boolean) => {
    setIsConfirmModalOpen(false);
    setSubmitting(true);
    setErrorMessage(null);

    const payload: CreateGoodsReceiptPayload = {
      purchase_order_id: Number(selectedPoId),
      receipt_number: receiptNumber,
      receipt_date: receiptDate,
      items: items
        .filter((it) => it.received_quantity > 0)
        .map((it) => ({
          purchase_order_item_id: it.purchase_order_item_id,
          received_quantity: it.received_quantity,
          storage_location_id: it.storage_location_id ? Number(it.storage_location_id) : null,
          batch_number: it.batch_number.trim() || null,
          expiry_date: it.expiry_date || null,
        })),
    };

    try {
      const createRes = await createGoodsReceipt(payload);
      const receiptId = createRes.data.id;

      if (isPost) {
        await postGoodsReceipt(receiptId);
        setSuccessMessage('Goods Receipt posted successfully. Stock and accounting updated.');
        navigate(`/purchases/goods-receipts/${receiptId}`, {
          state: { successMessage: 'Goods Receipt posted successfully.' }
        });
      } else {
        setSuccessMessage('Goods Receipt saved as DRAFT successfully.');
        navigate('/purchases/goods-receipts', {
          state: { successMessage: 'Goods Receipt draft saved successfully.' }
        });
      }
    } catch (err: any) {
      console.error('Submission failed:', err);
      setErrorMessage(err.message || 'Failed to submit goods receipt.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/purchases/goods-receipts"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-indigo-600" />
              Create Goods Receipt
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Receive procured items into warehouse inventory with batch, expiry, and location tracking.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={submitting || hasErrors || hasZeroTotal || !selectedPo}
            onClick={() => handleSubmit(false)}
            className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Save className="w-3.5 h-3.5" /> Save Draft
          </button>
          <button
            type="button"
            disabled={submitting || hasErrors || hasZeroTotal || !selectedPo}
            onClick={() => handleSubmit(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Send className="w-3.5 h-3.5" /> Post Goods Receipt
          </button>
        </div>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Header Info Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Select Purchase Order */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Purchase Order <span className="text-rose-500">*</span>
          </label>
          <select
            value={selectedPoId}
            onChange={(e) => handlePoSelect(Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white font-medium"
          >
            <option value="">-- Select Approved PO --</option>
            {availablePos.map((po) => (
              <option key={po.id} value={po.id}>
                {po.po_number} ({po.supplier?.name} • {po.status})
              </option>
            ))}
          </select>
          {selectedPo && (
            <div className="text-[10px] text-slate-400 mt-1">
              Order Date: {selectedPo.order_date}
            </div>
          )}
        </div>

        {/* Supplier (Read Only from PO) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Supplier / Vendor</label>
          <input
            type="text"
            readOnly
            value={selectedPo?.supplier?.name || 'N/A (Select PO)'}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium cursor-not-allowed"
          />
          {selectedPo?.supplier && (
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              Code: {selectedPo.supplier.supplier_code}
            </div>
          )}
        </div>

        {/* Warehouse */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Receiving Warehouse <span className="text-rose-500">*</span>
          </label>
          <select
            value={selectedWarehouseId}
            onChange={(e) => handleWarehouseChange(Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white font-medium"
          >
            <option value="">-- Select Warehouse --</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name} ({wh.code})
              </option>
            ))}
          </select>
          <div className="text-[10px] text-slate-400 mt-1">
            {storageLocations.length} storage location bins active
          </div>
        </div>

        {/* Receipt Number & Date */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Receipt Reference & Date <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              placeholder="GR-2026-0001"
              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <input
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      </div>

      {/* Receiving Items Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm">Receiving Line Items</h3>
            <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[11px] font-mono font-semibold">
              {items.length} Lines
            </span>
          </div>
          <span className="text-xs text-slate-500">
            Authoritative pending quantities enforced from PO.
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <span>Loading line items from Purchase Order...</span>
          </div>
        ) : items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-3 px-3 min-w-[200px]">Product / SKU</th>
                  <th className="py-3 px-2 text-center w-16">Ordered</th>
                  <th className="py-3 px-2 text-center w-16">Received</th>
                  <th className="py-3 px-2 text-center w-20">Pending</th>
                  <th className="py-3 px-3 w-28">Receive Qty</th>
                  <th className="py-3 px-3 text-right w-24">Unit Cost</th>
                  <th className="py-3 px-3 text-right w-28">Total</th>
                  <th className="py-3 px-3 w-32">Batch #</th>
                  <th className="py-3 px-3 w-32">Expiry Date</th>
                  <th className="py-3 px-3 min-w-[160px]">Storage Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {items.map((item, idx) => (
                  <tr key={idx} className={item.error ? 'bg-rose-50/40' : 'hover:bg-slate-50/50'}>
                    {/* Product */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{item.product_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</div>
                      {item.error && (
                        <div className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {item.error}
                        </div>
                      )}
                    </td>

                    {/* Ordered */}
                    <td className="py-3 px-2 text-center font-mono text-slate-500 font-medium">
                      {item.ordered_quantity}
                    </td>

                    {/* Received */}
                    <td className="py-3 px-2 text-center font-mono text-slate-500 font-medium">
                      {item.already_received}
                    </td>

                    {/* Pending */}
                    <td className="py-3 px-2 text-center font-mono font-bold text-indigo-700 bg-indigo-50/50">
                      {item.pending_quantity}
                    </td>

                    {/* Receive Qty Input */}
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        min="0"
                        max={item.pending_quantity}
                        step="any"
                        value={item.received_quantity}
                        onChange={(e) => handleQuantityChange(idx, e.target.value)}
                        className={`w-full px-2.5 py-1.5 border rounded-lg font-mono font-bold text-xs outline-none focus:ring-2 ${
                          item.error
                            ? 'border-rose-300 bg-rose-50 text-rose-800 focus:ring-rose-500/20'
                            : 'border-slate-300 focus:ring-indigo-500/20 text-slate-900'
                        }`}
                      />
                    </td>

                    {/* Unit Cost */}
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      {formatCurrency(item.unit_cost)}
                    </td>

                    {/* Total */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(item.line_total)}
                    </td>

                    {/* Batch Number */}
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        placeholder="e.g. BATCH-01"
                        value={item.batch_number}
                        onChange={(e) => handleItemFieldChange(idx, 'batch_number', e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </td>

                    {/* Expiry Date */}
                    <td className="py-3 px-3">
                      <input
                        type="date"
                        value={item.expiry_date}
                        onChange={(e) => handleItemFieldChange(idx, 'expiry_date', e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </td>

                    {/* Storage Location */}
                    <td className="py-3 px-3">
                      <select
                        value={item.storage_location_id || ''}
                        onChange={(e) =>
                          handleItemFieldChange(
                            idx,
                            'storage_location_id',
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                      >
                        <option value="">-- General Bin --</option>
                        {storageLocations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} ({loc.code})
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">
            <Info className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600">No Purchase Order selected</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Select an approved Purchase Order above to automatically load receivable items.
            </p>
          </div>
        )}

        {/* Totals Summary Footer */}
        {items.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-xs text-slate-600">
              <div>
                <span className="text-slate-400 block text-[10px]">TOTAL LINES</span>
                <span className="font-bold text-slate-800 text-sm">{totalItemsCount}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">TOTAL RECEIVING QTY</span>
                <span className="font-bold text-indigo-700 text-sm font-mono">{totalReceivingQty}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-600">Total Receipt Valuation:</span>
              <span className="text-lg font-bold font-mono text-indigo-600">
                {formatCurrency(totalReceivingCost)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Posting */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-base">
                <Send className="w-5 h-5" />
                <span>Post Goods Receipt?</span>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-600">
              <p className="font-medium text-slate-800">
                Are you sure you want to permanently post Goods Receipt <span className="font-mono font-bold text-slate-900">{receiptNumber}</span>?
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2 text-amber-800">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Important Operational Effects:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-900/90 pl-1">
                  <li>Warehouse inventory will immediately increase via <code className="font-mono bg-amber-100 px-1 rounded">InventoryService::stockIn()</code>.</li>
                  <li>Immutable <code className="font-mono bg-amber-100 px-1 rounded">StockMovement</code> records will be generated.</li>
                  <li>Purchase Order received & pending quantities will be updated.</li>
                  <li>Batch and storage location bins will be updated.</li>
                  <li>Automated GL Journal (<span className="font-semibold">DR Inventory Asset, CR AP Clearing</span>) will post.</li>
                </ul>
              </div>

              <p className="text-[11px] text-slate-400 italic">
                * Note: Once posted, this Goods Receipt cannot be edited or reversed directly.
              </p>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => executeSubmission(true)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Posting Goods Receipt...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm & Post</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
