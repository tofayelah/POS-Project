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
import { createGoodsReceipt, postGoodsReceipt, getNextGrNumber } from '../../api/goodsReceipts';
import { getWarehouses, getStorageLocations } from '../../api/organization';
import { getProducts } from '../../api/products';
import { formatCurrency } from '../../utils/currency';
import { useLanguage } from '../../i18n';

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
  const { t } = useLanguage();
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
  
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  
  const [items, setItems] = useState<ReceivingLineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [productsList, setProductsList] = useState<any[]>([]);

  // Load available approved/partially received POs & warehouses & next receipt number
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [poRes, whRes, prodRes, nextNumber] = await Promise.all([
        getPurchaseOrders({ per_page: 100 }),
        getWarehouses(),
        getProducts({ per_page: 250 }).catch(() => ({ data: [] })),
        getNextGrNumber(),
      ]);

      setReceiptNumber(nextNumber);

      const validPos = (poRes.data || []).filter(
        (po) => po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED'
      );
      setAvailablePos(validPos);
      setWarehouses(whRes.data || []);
      const prods = Array.isArray(prodRes?.data) ? prodRes.data : (prodRes?.data?.data || []);
      setProductsList(prods);

      if (initialPoId) {
        handlePoSelect(Number(initialPoId), prods);
      }
    } catch (err) {
      console.error('Failed to load initial form data:', err);
    }
  };

  // When PO is selected
  const handlePoSelect = async (poId: number, fallbackProds?: any[]) => {
    setSelectedPoId(poId);
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await getPurchaseOrder(poId);
      const po = res.data;
      setSelectedPo(po);
      setSelectedWarehouseId(po.warehouse_id);

      // Load storage locations for the destination warehouse
      if (po.warehouse_id) {
        loadLocations(po.warehouse_id);
      }

      const activeProds = fallbackProds || productsList;

      // Map line items
      const mappedItems: ReceivingLineItem[] = (po.items || []).map((it) => {
        const pending = Number(it.pending_quantity ?? (Number(it.quantity) - Number(it.received_quantity || 0)));
        const resolvedProd = activeProds.find((p: any) => p.id === it.product_id);
        const resolvedVariant = resolvedProd?.variants?.find((v: any) => v.id === it.product_variant_id);
        return {
          purchase_order_item_id: it.id || 0,
          product_id: it.product_id,
          product_name: it.product?.name || resolvedProd?.name || `Product #${it.product_id}`,
          sku: it.variant?.sku || resolvedVariant?.sku || resolvedProd?.product_code || it.product?.product_code || 'N/A',
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
        target.error = t('goodsReceipts.overReceiveError', { pending: target.pending_quantity });
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
      setErrorMessage(t('goodsReceipts.poRequired'));
      return;
    }

    if (hasErrors) {
      setErrorMessage('Please resolve quantity validation errors before submitting.');
      return;
    }

    if (hasZeroTotal) {
      setErrorMessage(t('goodsReceipts.atLeastOneItem'));
      return;
    }

    if (isPost) {
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
      receipt_number: receiptNumber.trim() || undefined as any,
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
        navigate(`/purchases/goods-receipts/${receiptId}`, {
          state: { successMessage: t('goodsReceipts.successPost') }
        });
      } else {
        navigate('/purchases/goods-receipts', {
          state: { successMessage: t('goodsReceipts.successCreate') }
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
              {t('goodsReceipts.createTitle')}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('goodsReceipts.createSubtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={submitting || hasErrors || hasZeroTotal || !selectedPo}
            onClick={() => handleSubmit(false)}
            className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Save className="w-3.5 h-3.5" /> {submitting ? t('goodsReceipts.saving') : t('goodsReceipts.saveDraft')}
          </button>
          <button
            type="button"
            disabled={submitting || hasErrors || hasZeroTotal || !selectedPo}
            onClick={() => handleSubmit(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Send className="w-3.5 h-3.5" /> {t('goodsReceipts.post')}
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
            {t('goodsReceipts.purchaseOrder')} <span className="text-rose-500">*</span>
          </label>
          <select
            value={selectedPoId}
            onChange={(e) => handlePoSelect(Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white font-medium"
          >
            <option value="">-- {t('goodsReceipts.selectPo')} --</option>
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
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('goodsReceipts.supplier')}</label>
          <input
            type="text"
            readOnly
            value={selectedPo?.supplier?.name || `N/A (${t('goodsReceipts.selectPo')})`}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium cursor-not-allowed"
          />
          {selectedPo?.supplier && (
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              Code: {selectedPo.supplier.supplier_code}
            </div>
          )}
        </div>

        {/* Destination Warehouse */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            {t('goodsReceipts.warehouse')} <span className="text-rose-500">*</span>
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
            {t('goodsReceipts.receiptNumber')} & {t('goodsReceipts.receiptDate')} <span className="text-rose-500">*</span>
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
            <h3 className="font-bold text-slate-900 text-sm">{t('goodsReceipts.items')}</h3>
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
                  <th className="py-3 px-3 min-w-[200px]">{t('goodsReceipts.product')} / {t('goodsReceipts.sku')}</th>
                  <th className="py-3 px-2 text-center w-16">{t('goodsReceipts.orderedQty')}</th>
                  <th className="py-3 px-2 text-center w-16">{t('goodsReceipts.receivedQty')}</th>
                  <th className="py-3 px-2 text-center w-20">{t('goodsReceipts.remainingQty')}</th>
                  <th className="py-3 px-3 w-28">{t('goodsReceipts.receiveNow')}</th>
                  <th className="py-3 px-3 text-right w-24">{t('goodsReceipts.unitCost')}</th>
                  <th className="py-3 px-3 text-right w-28">{t('goodsReceipts.lineTotal')}</th>
                  <th className="py-3 px-3 w-32">{t('goodsReceipts.batchNumber')}</th>
                  <th className="py-3 px-3 w-32">{t('goodsReceipts.expiryDate')}</th>
                  <th className="py-3 px-3 min-w-[160px]">{t('goodsReceipts.storageLocation')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, idx) => (
                  <tr key={idx} className={it.error ? 'bg-rose-50/40' : 'hover:bg-slate-50/50'}>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800">{it.product_name}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">{it.sku}</div>
                      {it.error && (
                        <div className="text-[10px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{it.error}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center font-semibold text-slate-600">
                      {it.ordered_quantity}
                    </td>
                    <td className="py-3 px-2 text-center text-slate-500">
                      {it.already_received}
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-indigo-700 bg-indigo-50/40 rounded">
                      {it.pending_quantity}
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        min="0"
                        max={it.pending_quantity}
                        step="any"
                        value={it.received_quantity}
                        onChange={(e) => handleQuantityChange(idx, e.target.value)}
                        className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-semibold text-slate-800 outline-none transition-all ${
                          it.error 
                            ? 'border-rose-400 bg-rose-50/20 focus:ring-2 focus:ring-rose-500/20' 
                            : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                        }`}
                      />
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-600">
                      {formatCurrency(it.unit_cost)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {formatCurrency(it.line_total)}
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        placeholder="LOT-1234"
                        value={it.batch_number}
                        onChange={(e) => handleItemFieldChange(idx, 'batch_number', e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="date"
                        value={it.expiry_date}
                        onChange={(e) => handleItemFieldChange(idx, 'expiry_date', e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={it.storage_location_id || ''}
                        onChange={(e) => handleItemFieldChange(idx, 'storage_location_id', e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 bg-white"
                      >
                        <option value="">-- {t('goodsReceipts.selectLocation')} --</option>
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
          <div className="p-8 text-center text-slate-400 text-xs">
            {t('goodsReceipts.poRequired')}
          </div>
        )}

        {/* Footer Summary */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-xs">
            <div>
              <span className="text-slate-500 block">{t('goodsReceipts.items')}:</span>
              <span className="font-bold text-slate-800 text-sm">{totalItemsCount}</span>
            </div>
            <div>
              <span className="text-slate-500 block">{t('goodsReceipts.totalQuantity')}:</span>
              <span className="font-bold text-slate-800 text-sm">{totalReceivingQty.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block">{t('goodsReceipts.totalValuation')}:</span>
              <span className="font-bold text-indigo-700 text-base">{formatCurrency(totalReceivingCost)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={submitting || hasErrors || hasZeroTotal || !selectedPo}
              onClick={() => handleSubmit(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" /> {submitting ? t('goodsReceipts.saving') : t('goodsReceipts.saveDraft')}
            </button>
            <button
              type="button"
              disabled={submitting || hasErrors || hasZeroTotal || !selectedPo}
              onClick={() => handleSubmit(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Send className="w-3.5 h-3.5" /> {t('goodsReceipts.post')}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {t('goodsReceipts.postConfirmTitle')}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {receiptNumber} • {formatCurrency(totalReceivingCost)}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {t('goodsReceipts.postConfirmMessage')}
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>{t('goodsReceipts.supplier')}:</span>
                <span className="font-semibold text-slate-800">{selectedPo?.supplier?.name}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{t('goodsReceipts.warehouse')}:</span>
                <span className="font-semibold text-slate-800">
                  {warehouses.find((w) => w.id === selectedWarehouseId)?.name}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{t('goodsReceipts.totalQuantity')}:</span>
                <span className="font-semibold text-slate-800">{totalReceivingQty.toLocaleString()} units</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => executeSubmission(true)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {submitting ? t('goodsReceipts.posting') : t('goodsReceipts.post')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
