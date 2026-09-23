import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { 
  Package, 
  Plus, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Eye, 
  Send, 
  AlertCircle, 
  X, 
  Printer, 
  Warehouse as WarehouseIcon,
  Building2,
  FileText,
  Boxes,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { GoodsReceipt, GoodsReceiptStatus } from '../../types/purchase';
import { getGoodsReceipts, postGoodsReceipt } from '../../api/goodsReceipts';
import { formatCurrency } from '../../utils/currency';

export function GoodsReceiptList() {
  const location = useLocation();
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [successMessage, setSuccessMessage] = useState<string | null>(
    (location.state as any)?.successMessage || null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Detail Modal State
  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceipt | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [postingId, setPostingId] = useState<number | null>(null);

  useEffect(() => {
    loadReceipts();
  }, [statusFilter]);

  const loadReceipts = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await getGoodsReceipts({
        search,
        status: statusFilter,
      });
      setReceipts(res.data);
    } catch (err: any) {
      console.error('Failed to load goods receipts:', err);
      setErrorMessage(err.message || 'Failed to load goods receipts.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadReceipts();
  };

  const handlePostReceipt = async (id: number) => {
    if (!window.confirm('Are you sure you want to permanently post this Goods Receipt to inventory and AP clearing?')) {
      return;
    }

    setPostingId(id);
    setErrorMessage(null);
    try {
      await postGoodsReceipt(id);
      setSuccessMessage('Goods Receipt posted successfully. Stock and accounting updated.');
      loadReceipts();
      if (selectedReceipt && selectedReceipt.id === id) {
        setSelectedReceipt({ ...selectedReceipt, status: 'POSTED' });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to post Goods Receipt.');
    } finally {
      setPostingId(null);
    }
  };

  const getStatusBadge = (status: GoodsReceiptStatus) => {
    switch (status) {
      case 'POSTED':
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3 h-3" /> Posted
          </span>
        );
      case 'DRAFT':
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-1 w-fit">
            <Clock className="w-3 h-3" /> Draft
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-md w-fit">
            Cancelled
          </span>
        );
      default:
        return <span className="px-2 py-0.5 text-[11px] text-slate-600 bg-slate-100 rounded">{status}</span>;
    }
  };

  // KPIs
  const totalCount = receipts.length;
  const postedCount = receipts.filter((r) => r.status === 'POSTED').length;
  const draftCount = receipts.filter((r) => r.status === 'DRAFT').length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            Goods Receipts
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log and inspect physical warehouse stock intake against approved Purchase Orders.
          </p>
        </div>

        <Link
          to="/purchases/goods-receipts/create"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer w-fit"
        >
          <Plus className="w-4 h-4" /> Create Goods Receipt
        </Link>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Total Receipts</span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">{totalCount}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-emerald-600 text-xs font-semibold uppercase tracking-wider block">Posted to Stock</span>
          <span className="text-2xl font-bold font-mono text-emerald-700 mt-1 block">{postedCount}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-amber-600 text-xs font-semibold uppercase tracking-wider block">Draft Receipts</span>
          <span className="text-2xl font-bold font-mono text-amber-700 mt-1 block">{draftCount}</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search GR #, PO #, supplier, warehouse..."
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </form>

        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          {['ALL', 'DRAFT', 'POSTED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Receipts' : st}
            </button>
          ))}
          <button
            type="button"
            onClick={loadReceipts}
            title="Refresh list"
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-500 shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Receipt Date</th>
                <th className="py-3 px-4">Purchase Order</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Warehouse</th>
                <th className="py-3 px-4 text-center">Lines</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading goods receipts...</span>
                    </div>
                  </td>
                </tr>
              ) : receipts.length > 0 ? (
                receipts.map((gr) => (
                  <tr key={gr.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Receipt Number */}
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReceipt(gr);
                          setIsDetailModalOpen(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-mono font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {gr.receipt_number}
                      </button>
                    </td>

                    {/* Receipt Date */}
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {gr.receipt_date}
                    </td>

                    {/* PO Reference */}
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {gr.purchase_order?.po_number || gr.purchaseOrder?.po_number || `PO #${gr.purchase_order_id}`}
                    </td>

                    {/* Supplier */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{gr.supplier?.name || `Supplier #${gr.supplier_id}`}</div>
                      {gr.supplier?.supplier_code && (
                        <div className="text-[10px] text-slate-400 font-mono">{gr.supplier.supplier_code}</div>
                      )}
                    </td>

                    {/* Warehouse */}
                    <td className="py-3 px-4 text-slate-600">
                      {gr.warehouse?.name || `Warehouse #${gr.warehouse_id}`}
                    </td>

                    {/* Lines Count */}
                    <td className="py-3 px-4 text-center font-mono">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium">
                        {gr.items?.length || 1}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {getStatusBadge(gr.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right space-x-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReceipt(gr);
                          setIsDetailModalOpen(true);
                        }}
                        title="View Details"
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {gr.status === 'DRAFT' && (
                        <button
                          type="button"
                          disabled={postingId === gr.id}
                          onClick={() => handlePostReceipt(gr.id)}
                          title="Post Goods Receipt"
                          className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No goods receipts found</p>
                    <p className="text-xs text-slate-400 mt-1">Receive stock from an approved purchase order.</p>
                    <Link
                      to="/purchases/goods-receipts/create"
                      className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create Goods Receipt
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Goods Receipt Details Modal */}
      {isDetailModalOpen && selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    Goods Receipt: {selectedReceipt.receipt_number}
                  </h3>
                  {getStatusBadge(selectedReceipt.status)}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Receipt Date: {selectedReceipt.receipt_date} &bull; Warehouse: {selectedReceipt.warehouse?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-slate-400 block font-semibold mb-1">Procurement Reference</span>
                  <div className="font-bold text-slate-900 text-sm">
                    PO: {selectedReceipt.purchase_order?.po_number || selectedReceipt.purchaseOrder?.po_number || `#${selectedReceipt.purchase_order_id}`}
                  </div>
                  <div className="text-slate-600 mt-1">Vendor: <span className="font-semibold text-slate-800">{selectedReceipt.supplier?.name}</span></div>
                  {selectedReceipt.supplier?.supplier_code && (
                    <div className="text-slate-500">Code: {selectedReceipt.supplier.supplier_code}</div>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block font-semibold mb-1">Receiving Destination</span>
                  <div className="font-bold text-slate-900 text-sm">{selectedReceipt.warehouse?.name}</div>
                  <div className="text-slate-600 mt-1">
                    Status: <span className="font-semibold text-slate-800">{selectedReceipt.status}</span>
                  </div>
                  {selectedReceipt.posted_at && (
                    <div className="text-slate-500 mt-0.5">Posted At: {selectedReceipt.posted_at}</div>
                  )}
                </div>
              </div>

              {/* Items Breakdown */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2">Received Inventory Items</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                        <th className="py-2.5 px-3">Product / SKU</th>
                        <th className="py-2.5 px-3 text-center">Received Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Cost</th>
                        <th className="py-2.5 px-3 text-right">Total Cost</th>
                        <th className="py-2.5 px-3">Batch & Expiry</th>
                        <th className="py-2.5 px-3">Location Bin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {selectedReceipt.items && selectedReceipt.items.length > 0 ? (
                        selectedReceipt.items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-2.5 px-3">
                              <div className="font-medium text-slate-900">
                                {it.product?.name || `Product #${it.product_id}`}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                SKU: {it.product_variant?.sku || 'N/A'}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-700">
                              {it.received_quantity}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                              {formatCurrency(it.unit_cost)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(it.total_cost || it.received_quantity * it.unit_cost)}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px]">
                              {it.batch_number ? (
                                <div>
                                  <span className="font-semibold text-slate-800">{it.batch_number}</span>
                                  {it.expiry_date && (
                                    <span className="text-slate-400 block text-[10px]">Exp: {it.expiry_date}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">No batch</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {it.storage_location?.name || (it.storage_location_id ? `Bin #${it.storage_location_id}` : 'General Bin')}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-slate-400">
                            No item details loaded for this receipt.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Accounting & Inventory Card */}
              {selectedReceipt.status === 'POSTED' ? (
                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
                  <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>Automated Accounting Journal (Gate 1.5 GRNI)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-[11px]">
                    <div className="p-2.5 bg-white border border-indigo-100 rounded-lg">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">DEBIT</span>
                      <span className="font-semibold text-slate-800">Inventory Asset (1500)</span>
                      <span className="text-slate-500 block text-[10px]">Merchandise Inventory In-Transit</span>
                    </div>
                    <div className="p-2.5 bg-white border border-indigo-100 rounded-lg">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">CREDIT</span>
                      <span className="font-semibold text-slate-800">AP Clearing / GRNI</span>
                      <span className="text-slate-500 block text-[10px]">Goods Received Not Invoiced</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 italic mt-1">
                    Journal Key: <span className="font-mono font-semibold">PURCHASE-GR-{selectedReceipt.id}</span> &bull; Stock movements immutably registered in warehouse ledger.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Draft receipt. Inventory and accounting journal entries will post when finalized.</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print Receipt
              </button>

              <div className="flex items-center gap-2">
                {selectedReceipt.status === 'DRAFT' && (
                  <button
                    type="button"
                    disabled={postingId === selectedReceipt.id}
                    onClick={() => handlePostReceipt(selectedReceipt.id)}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" /> Post to Stock
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-lg cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
