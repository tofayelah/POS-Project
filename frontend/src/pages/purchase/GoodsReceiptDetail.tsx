import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { 
  Package, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Send, 
  Printer, 
  AlertCircle, 
  FileText, 
  Building2, 
  Warehouse as WarehouseIcon,
  Layers,
  Calendar,
  Boxes
} from 'lucide-react';
import { GoodsReceipt } from '../../types/purchase';
import { getGoodsReceipt, postGoodsReceipt } from '../../api/goodsReceipts';
import { formatCurrency } from '../../utils/currency';

export function GoodsReceiptDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState<GoodsReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadReceipt(Number(id));
    }
  }, [id]);

  const loadReceipt = async (receiptId: number) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await getGoodsReceipt(receiptId);
      setReceipt(res.data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load goods receipt.');
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!receipt) return;
    if (!window.confirm('Are you sure you want to permanently post this Goods Receipt to inventory and AP clearing?')) {
      return;
    }

    setPosting(true);
    setErrorMessage(null);
    try {
      await postGoodsReceipt(receipt.id);
      setSuccessMessage('Goods Receipt posted successfully. Inventory increased and AP Clearing accrued.');
      loadReceipt(receipt.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to post Goods Receipt.');
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <span>Loading Goods Receipt details...</span>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="p-12 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Goods Receipt Not Found</h2>
        <p className="text-xs text-slate-500">The requested receipt #{id} does not exist or could not be loaded.</p>
        <Link
          to="/purchases/goods-receipts"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Goods Receipts
        </Link>
      </div>
    );
  }

  const totalCost = (receipt.items || []).reduce(
    (sum, it) => sum + (Number(it.total_cost) || Number(it.received_quantity) * Number(it.unit_cost)),
    0
  );
  const totalQty = (receipt.items || []).reduce((sum, it) => sum + Number(it.received_quantity), 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/purchases/goods-receipts"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 font-mono">
                {receipt.receipt_number}
              </h1>
              {receipt.status === 'POSTED' ? (
                <span className="px-2 py-0.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> POSTED
                </span>
              ) : (
                <span className="px-2 py-0.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> DRAFT
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Goods Receipt &bull; Date: {receipt.receipt_date} &bull; Warehouse: {receipt.warehouse?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          {receipt.status === 'DRAFT' && (
            <button
              type="button"
              disabled={posting}
              onClick={handlePost}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" /> Post to Stock
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Info Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
        <div>
          <span className="text-slate-400 block font-semibold uppercase text-[10px] mb-1">Supplier / Vendor</span>
          <div className="font-bold text-slate-900 text-sm">{receipt.supplier?.name}</div>
          <div className="text-slate-600 mt-0.5">Code: {receipt.supplier?.supplier_code}</div>
          {receipt.supplier?.mobile && <div className="text-slate-500">Tel: {receipt.supplier.mobile}</div>}
        </div>

        <div>
          <span className="text-slate-400 block font-semibold uppercase text-[10px] mb-1">Procurement Reference</span>
          <div className="font-mono font-bold text-indigo-700 text-sm">
            {receipt.purchase_order?.po_number || receipt.purchaseOrder?.po_number || `PO #${receipt.purchase_order_id}`}
          </div>
          <Link
            to="/purchases/orders"
            className="text-indigo-600 hover:underline text-[11px] mt-1 inline-block"
          >
            View Purchase Order &rarr;
          </Link>
        </div>

        <div>
          <span className="text-slate-400 block font-semibold uppercase text-[10px] mb-1">Destination & Audit</span>
          <div className="font-bold text-slate-800">{receipt.warehouse?.name}</div>
          <div className="text-slate-500 mt-0.5">Status: <span className="font-semibold text-slate-700">{receipt.status}</span></div>
          {receipt.posted_at && (
            <div className="text-slate-400 text-[10px] mt-0.5">Posted: {receipt.posted_at}</div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Received Items Breakdown</h3>
          <span className="text-xs text-slate-500">
            Total Qty: <strong className="text-indigo-600 font-mono">{totalQty}</strong> units
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-4 text-center">Received Qty</th>
                <th className="py-3 px-4 text-right">Unit Cost</th>
                <th className="py-3 px-4 text-right">Total Cost</th>
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4">Storage Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {receipt.items && receipt.items.length > 0 ? (
                receipt.items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {it.product?.name || `Product #${it.product_id}`}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        SKU: {it.product_variant?.sku || 'N/A'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-indigo-700">
                      {it.received_quantity}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {formatCurrency(it.unit_cost)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(it.total_cost || Number(it.received_quantity) * Number(it.unit_cost))}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      {it.batch_number || <span className="text-slate-400 italic">None</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {it.expiry_date || <span className="text-slate-400 italic">None</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {it.storage_location?.name || (it.storage_location_id ? `Bin #${it.storage_location_id}` : 'General Bin')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No item records attached to this receipt.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Valuation Total Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">Valuation reflects moving average unit cost.</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Total Receipt Value:</span>
            <span className="text-lg font-bold font-mono text-indigo-600">
              {formatCurrency(totalCost)}
            </span>
          </div>
        </div>
      </div>

      {/* Accounting & Inventory Traceability Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Double-Entry Journal Entry */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
            <Layers className="w-4 h-4" />
            <span>Accounting Journal Entry</span>
          </div>
          {receipt.status === 'POSTED' ? (
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 font-mono text-[11px] flex justify-between">
                <span>Journal Key:</span>
                <span className="font-bold text-indigo-600">PURCHASE-GR-{receipt.id}</span>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden text-[11px]">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-1.5 px-3">Account</th>
                      <th className="py-1.5 px-3 text-right">Debit</th>
                      <th className="py-1.5 px-3 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2 px-3">
                        <span className="font-semibold text-slate-800">Merchandise Inventory Asset</span>
                        <span className="block text-[10px] text-slate-400">Account #1500 (Asset)</span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(totalCost)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-400">-</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3">
                        <span className="font-semibold text-slate-800">AP Clearing / GRNI</span>
                        <span className="block text-[10px] text-slate-400">Account #2000 (Liability)</span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-400">-</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-indigo-700">
                        {formatCurrency(totalCost)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-slate-400 italic">
                * Accrues inventory asset and Goods Received Not Invoiced liability.
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              Journal entry will be automatically generated upon posting.
            </p>
          )}
        </div>

        {/* Inventory Movement Traceability */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
            <Boxes className="w-4 h-4" />
            <span>Warehouse Stock Ledger</span>
          </div>
          {receipt.status === 'POSTED' ? (
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 font-mono text-[11px] flex justify-between">
                <span>Operation:</span>
                <span className="font-bold text-emerald-700">STOCK_IN</span>
              </div>
              <ul className="space-y-1.5 text-slate-600 text-[11px] pl-1">
                <li>&bull; Handled via authoritative <code className="font-mono bg-slate-100 px-1 rounded">InventoryService::stockIn()</code></li>
                <li>&bull; Recalculated moving-average unit valuation</li>
                <li>&bull; Updated warehouse inventory counts & batch records</li>
                <li>&bull; Created immutable <code className="font-mono bg-slate-100 px-1 rounded">StockMovement</code> ledger records</li>
              </ul>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              Stock movement ledger records will be immutably written upon posting.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
