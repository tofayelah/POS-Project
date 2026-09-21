import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ChevronRight, 
  Printer, 
  Eye, 
  Building2, 
  Warehouse as WarehouseIcon,
  DollarSign,
  AlertCircle,
  X,
  Calendar
} from 'lucide-react';
import { PurchaseOrder, PurchaseOrderStatus } from '../../types/purchase';
import { 
  getPurchaseOrders, 
  approvePurchaseOrder, 
  cancelPurchaseOrder 
} from '../../api/purchaseOrders';
import { formatCurrency } from '../../utils/currency';

export function PurchaseOrderList() {
  const location = useLocation();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [successMessage, setSuccessMessage] = useState<string | null>(
    (location.state as any)?.successMessage || null
  );
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await getPurchaseOrders({
        search,
        status: statusFilter,
      });
      setOrders(res.data);
    } catch (err) {
      console.error('Failed to load purchase orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders();
  };

  const handleApprove = async (id: number) => {
    try {
      await approvePurchaseOrder(id);
      setSuccessMessage(`Purchase order approved successfully.`);
      loadOrders();
      if (selectedPo && selectedPo.id === id) {
        setSelectedPo({ ...selectedPo, status: 'APPROVED' });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to approve purchase order.');
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this purchase order?')) return;
    try {
      await cancelPurchaseOrder(id);
      setSuccessMessage(`Purchase order marked as cancelled.`);
      loadOrders();
      if (selectedPo && selectedPo.id === id) {
        setSelectedPo({ ...selectedPo, status: 'CANCELLED' });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to cancel purchase order.');
    }
  };

  // KPI Calculations
  const totalCount = orders.length;
  const approvedCount = orders.filter((o) => o.status === 'APPROVED' || o.status === 'FULLY_RECEIVED').length;
  const draftCount = orders.filter((o) => o.status === 'DRAFT').length;
  const totalAmount = orders.reduce((sum, o) => sum + (Number(o.grand_total) || 0), 0);

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case 'DRAFT':
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-1 w-fit">
            <Clock className="w-3 h-3" /> Draft
          </span>
        );
      case 'PARTIALLY_RECEIVED':
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-1 w-fit">
            Partially Received
          </span>
        );
      case 'FULLY_RECEIVED':
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-md flex items-center gap-1 w-fit">
            Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-md flex items-center gap-1 w-fit">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold text-slate-600 bg-slate-100 rounded-md w-fit">
            {status}
          </span>
        );
    }
  };

  return (
    <div id="purchase-order-list-page" className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 id="purchase-orders-heading" className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-indigo-600" />
            <span>Purchase Orders</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, track, and approve procurement orders across vendors and regional stock warehouses.
          </p>
        </div>

        <Link
          to="/purchases/orders/new"
          id="btn-create-new-po"
          className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs hover:shadow flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Purchase Order</span>
        </Link>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div id="po-success-banner" className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Total Orders</span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">{totalCount}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-600 block">Approved Orders</span>
          <span className="text-xl font-bold text-emerald-700 mt-1 block">{approvedCount}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-600 block">Draft / Pending</span>
          <span className="text-xl font-bold text-amber-700 mt-1 block">{draftCount}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-indigo-600 block">Total Procurement Value</span>
          <span className="text-xl font-bold font-mono text-indigo-700 mt-1 block">{formatCurrency(totalAmount)}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="po-search-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search PO #, supplier, warehouse..."
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </form>

        {/* Status Filters */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          {['ALL', 'DRAFT', 'APPROVED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED'].map((st) => (
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
              {st === 'ALL' ? 'All Orders' : st.replace('_', ' ')}
            </button>
          ))}
          <button
            type="button"
            onClick={loadOrders}
            title="Refresh list"
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-500 shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3 px-4">PO Reference</th>
                <th className="py-3 px-4">Order Date</th>
                <th className="py-3 px-4">Supplier / Vendor</th>
                <th className="py-3 px-4">Warehouse</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
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
                      <span>Loading purchase orders...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length > 0 ? (
                orders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* PO Reference */}
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPo(po);
                          setIsDetailModalOpen(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-mono font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>{po.po_number}</span>
                      </button>
                    </td>

                    {/* Dates */}
                    <td className="py-3 px-4 text-slate-600">
                      <div>{po.order_date}</div>
                      {po.expected_date && (
                        <div className="text-[10px] text-slate-400 mt-0.5">Exp: {po.expected_date}</div>
                      )}
                    </td>

                    {/* Supplier */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{po.supplier?.name || `Supplier #${po.supplier_id}`}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {po.supplier?.supplier_code} {po.supplier?.mobile && `• ${po.supplier.mobile}`}
                      </div>
                    </td>

                    {/* Warehouse */}
                    <td className="py-3 px-4 text-slate-600">
                      {po.warehouse?.name || `Warehouse #${po.warehouse_id}`}
                    </td>

                    {/* Items Count */}
                    <td className="py-3 px-4 text-center font-mono">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium">
                        {po.items?.length || 1}
                      </span>
                    </td>

                    {/* Grand Total */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(po.grand_total)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">{getStatusBadge(po.status)}</td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPo(po);
                          setIsDetailModalOpen(true);
                        }}
                        title="View Details"
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {po.status === 'DRAFT' && (
                        <button
                          type="button"
                          onClick={() => handleApprove(po.id)}
                          title="Approve Order"
                          className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No purchase orders found</p>
                    <p className="text-xs text-slate-400 mt-1">Get started by creating your first purchase order.</p>
                    <Link
                      to="/purchases/orders/new"
                      className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create Purchase Order
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PO Detail & Inspection Modal */}
      {isDetailModalOpen && selectedPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Top */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">Purchase Order: {selectedPo.po_number}</h3>
                  {getStatusBadge(selectedPo.status)}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ordered on {selectedPo.order_date} &bull; Warehouse: {selectedPo.warehouse?.name}
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

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Supplier & Delivery Info Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-slate-400 block font-semibold mb-1">Vendor Details</span>
                  <div className="font-bold text-slate-900 text-sm">{selectedPo.supplier?.name}</div>
                  <div className="text-slate-600 mt-0.5">Code: {selectedPo.supplier?.supplier_code}</div>
                  <div className="text-slate-600">Mobile: {selectedPo.supplier?.mobile}</div>
                  {selectedPo.supplier?.address && (
                    <div className="text-slate-500 mt-1">{selectedPo.supplier.address}</div>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block font-semibold mb-1">Logistics & Warehouse</span>
                  <div className="font-bold text-slate-900 text-sm">{selectedPo.warehouse?.name}</div>
                  <div className="text-slate-600 mt-0.5">Code: {selectedPo.warehouse?.code}</div>
                  <div className="text-slate-600 mt-1">
                    Expected Delivery: <span className="font-medium text-slate-800">{selectedPo.expected_date || 'Standard'}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2">Itemized Order Breakdown</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                        <th className="py-2 px-3">Product</th>
                        <th className="py-2 px-3 text-center">Qty</th>
                        <th className="py-2 px-3 text-right">Unit Cost</th>
                        <th className="py-2 px-3 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {selectedPo.items && selectedPo.items.length > 0 ? (
                        selectedPo.items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-2.5 px-3">
                              <div className="font-medium text-slate-900">{it.product?.name || `Product #${it.product_id}`}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                SKU: {it.variant?.sku || it.product?.sku || 'N/A'} {it.variant?.variant_name && `• ${it.variant.variant_name}`}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-semibold">{it.quantity}</td>
                            <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(it.unit_cost)}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold">{formatCurrency(it.line_total)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400">
                            No item details loaded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1.5 text-right">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span className="font-mono text-slate-800">{formatCurrency(selectedPo.subtotal)}</span>
                  </div>
                  {Number(selectedPo.discount_total) > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Discount:</span>
                      <span className="font-mono text-slate-800">- {formatCurrency(selectedPo.discount_total)}</span>
                    </div>
                  )}
                  {Number(selectedPo.shipping_cost) > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Shipping:</span>
                      <span className="font-mono text-slate-800">+{formatCurrency(selectedPo.shipping_cost)}</span>
                    </div>
                  )}
                  {Number(selectedPo.tax_total) > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Tax / VAT:</span>
                      <span className="font-mono text-slate-800">+{formatCurrency(selectedPo.tax_total)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-sm text-slate-900">
                    <span>Grand Total:</span>
                    <span className="font-mono text-indigo-600">{formatCurrency(selectedPo.grand_total)}</span>
                  </div>
                </div>
              </div>

              {selectedPo.notes && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="font-bold text-slate-700 block mb-1">Order Notes:</span>
                  <p className="text-slate-600">{selectedPo.notes}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print PO
              </button>

              <div className="flex items-center gap-2">
                {selectedPo.status === 'DRAFT' && (
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedPo.id)}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve PO
                  </button>
                )}
                {selectedPo.status !== 'CANCELLED' && (
                  <button
                    type="button"
                    onClick={() => handleCancel(selectedPo.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel Order
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-lg cursor-pointer"
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
