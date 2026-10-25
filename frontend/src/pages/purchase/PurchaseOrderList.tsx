import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Edit,
  Eye,
  Building2,
  Warehouse,
  Ban,
  X,
  FileText,
  AlertCircle,
  FilePlus
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import {
  getPurchaseOrders,
  approvePurchaseOrder,
  cancelPurchaseOrder
} from '../../api/purchaseOrders';
import { getSuppliers } from '../../api/suppliers';
import { getWarehouses } from '../../api/organization';
import { PurchaseOrder } from '../../types/purchase';
import { Supplier } from '../../types/supplier';
import { Warehouse as WarehouseType } from '../../types/organization';
import { useCompany } from '../../contexts/CompanyContext';
import { PurchaseOrderPrintModal } from '../../components/purchase/PurchaseOrderPrintModal';

export const PurchaseOrderList: React.FC = () => {
  const navigate = useNavigate();
  const { company: activeCompany } = useCompany();

  // State
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('ALL');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');

  // Print Preview Modal State
  const [previewPo, setPreviewPo] = useState<PurchaseOrder | null>(null);
  const [printModalOrder, setPrintModalOrder] = useState<any | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [poRes, supRes, whRes] = await Promise.all([
        getPurchaseOrders({ per_page: 200 }),
        getSuppliers({ per_page: 100 }),
        getWarehouses()
      ]);

      const poData = Array.isArray(poRes.data) ? poRes.data : [];
      const supList = Array.isArray(supRes.data)
        ? supRes.data
        : (supRes.data as any)?.data || [];
      const whList = Array.isArray(whRes.data) ? whRes.data : [];

      const enrichedOrders = poData.map((po: PurchaseOrder) => {
        const sup =
          po.supplier ||
          supList.find((s: any) => String(s.id) === String(po.supplier_id)) ||
          { name: `Supplier #${po.supplier_id}`, supplier_code: `SUP-${po.supplier_id}` };
        const wh =
          po.warehouse ||
          whList.find((w: any) => String(w.id) === String(po.warehouse_id)) ||
          { name: `Warehouse #${po.warehouse_id}`, code: `WH-${po.warehouse_id}` };
        return {
          ...po,
          supplier: sup,
          warehouse: wh
        };
      });

      setOrders(enrichedOrders);
      setSuppliers(supList);
      setWarehouses(whList);
    } catch (err: any) {
      console.error('Error loading purchase orders list:', err);
      setError('Failed to load purchase orders from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Purchase Orders List
  const filteredOrders = useMemo(() => {
    return orders.filter((po) => {
      if (selectedStatus !== 'ALL' && po.status !== selectedStatus) {
        return false;
      }
      if (selectedSupplier !== 'ALL' && String(po.supplier_id) !== String(selectedSupplier)) {
        return false;
      }
      if (selectedWarehouse !== 'ALL' && String(po.warehouse_id) !== String(selectedWarehouse)) {
        return false;
      }
      if (!searchTerm.trim()) return true;

      const term = searchTerm.toLowerCase();
      const matchPo = po.po_number ? String(po.po_number).toLowerCase().includes(term) : false;
      const matchSup = po.supplier?.name ? String(po.supplier.name).toLowerCase().includes(term) : false;
      const matchWh = po.warehouse?.name ? String(po.warehouse.name).toLowerCase().includes(term) : false;

      return matchPo || matchSup || matchWh;
    });
  }, [orders, selectedStatus, selectedSupplier, selectedWarehouse, searchTerm]);

  // Paginated Data
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;

  // Actions
  const handleApprove = async (id: number | string) => {
    try {
      const res = await approvePurchaseOrder(Number(id));
      if (res.success) {
        setSuccessMsg(`Purchase Order approved successfully.`);
        loadData();
      } else {
        setError(res.message || 'Failed to approve PO.');
      }
    } catch (err: any) {
      setError(err.message || 'Error approving PO.');
    }
  };

  const handleCancel = async (id: number | string) => {
    if (!window.confirm('Are you sure you want to cancel this Purchase Order?')) return;
    try {
      const res = await cancelPurchaseOrder(Number(id));
      if (res.success) {
        setSuccessMsg(`Purchase Order cancelled.`);
        loadData();
      } else {
        setError(res.message || 'Failed to cancel PO.');
      }
    } catch (err: any) {
      setError(err.message || 'Error cancelling PO.');
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 bg-[#F8FAFC] min-h-screen text-[#0F172A]">
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 lg:p-5 rounded-xl border border-[#E2E8F0] shadow-2xs">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
            <ShoppingCart className="w-7 h-7 text-indigo-700" />
            Purchase Orders Management
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Issue, track, approve and process procurement orders for suppliers & receiving warehouses
          </p>
        </div>

        <Link
          to="/purchases/orders/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black shadow-2xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create Purchase Order
        </Link>
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

      {/* SEARCH AND FILTER CONTROLS */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          {/* Search Box */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search PO #, supplier, or warehouse..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-bold bg-white"
            >
              <option value="ALL">All PO Statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="APPROVED">APPROVED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          {/* Supplier Filter */}
          <div>
            <select
              value={selectedSupplier}
              onChange={(e) => {
                setSelectedSupplier(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-bold bg-white"
            >
              <option value="ALL">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Warehouse Filter */}
          <div>
            <select
              value={selectedWarehouse}
              onChange={(e) => {
                setSelectedWarehouse(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-bold bg-white"
            >
              <option value="ALL">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* PURCHASE ORDERS TABLE */}
      <div className="bg-white rounded-xl shadow-2xs border border-[#E2E8F0] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-bold text-xs">
            Loading Purchase Orders from server...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-800">
              <thead className="bg-slate-100 uppercase text-[11px] font-extrabold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">PO Number</th>
                  <th className="px-4 py-3">Supplier Vendor</th>
                  <th className="px-4 py-3">Receiving Warehouse</th>
                  <th className="px-4 py-3">Order Date</th>
                  <th className="px-4 py-3">Expected Date</th>
                  <th className="px-4 py-3 text-right">Grand Total (৳)</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-bold text-xs">
                      No Purchase Orders found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((po) => {
                    const supName = po.supplier?.name || 'Supplier Vendor';
                    const whName = po.warehouse?.name || 'Central Warehouse';
                    const amt = Number(po.grand_total || po.total_amount || 0);

                    return (
                      <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                        {/* PO Number */}
                        <td className="px-4 py-3.5 font-mono font-black text-indigo-700 text-xs">
                          <Link to={`/purchases/orders/${po.id || po.po_number}/edit`} className="hover:underline">
                            {po.po_number}
                          </Link>
                        </td>

                        {/* Supplier */}
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          {supName}
                        </td>

                        {/* Warehouse */}
                        <td className="px-4 py-3.5 font-semibold text-slate-700">
                          {whName}
                        </td>

                        {/* Order Date */}
                        <td className="px-4 py-3.5 text-slate-600 font-medium">
                          {po.order_date ? po.order_date.split('T')[0] : 'N/A'}
                        </td>

                        {/* Expected Date */}
                        <td className="px-4 py-3.5 text-slate-600 font-medium">
                          {po.expected_date ? po.expected_date.split('T')[0] : 'N/A'}
                        </td>

                        {/* Grand Total */}
                        <td className="px-4 py-3.5 text-right font-mono font-black text-slate-900">
                          ৳{amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              po.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : po.status === 'SUBMITTED'
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : po.status === 'CANCELLED'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {po.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => navigate(`/purchases/orders/${po.id || po.po_number}/edit`)}
                              className="p-1 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md cursor-pointer transition-colors"
                              title="Edit / View Purchase Order"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => navigate(`/purchases/invoices/create?po=${po.po_number || po.id}`)}
                              className="p-1 text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50 rounded-md cursor-pointer transition-colors"
                              title="Create Purchase Entry from PO (Auto-insert items)"
                            >
                              <FilePlus className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setPreviewPo(po)}
                              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
                              title="Preview Document Summary"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setPrintModalOrder(po)}
                              className="p-1 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md cursor-pointer transition-colors"
                              title="Print Purchase Order Document (A4)"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {po.status === 'DRAFT' && (
                              <button
                                type="button"
                                onClick={() => handleApprove(po.id)}
                                className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-md cursor-pointer transition-colors"
                                title="Approve PO"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}

                            {po.status !== 'CANCELLED' && (
                              <button
                                type="button"
                                onClick={() => handleCancel(po.id)}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md cursor-pointer transition-colors"
                                title="Cancel PO"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {!loading && filteredOrders.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs font-bold text-slate-600">
            <div>
              Showing {Math.min(filteredOrders.length, (currentPage - 1) * itemsPerPage + 1)} to{' '}
              {Math.min(filteredOrders.length, currentPage * itemsPerPage)} of {filteredOrders.length} Purchase Orders
            </div>

            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-slate-300 bg-white rounded-md hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 font-mono text-slate-800">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-slate-300 bg-white rounded-md hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QUICK DOCUMENT PREVIEW MODAL */}
      {previewPo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-black text-sm uppercase text-slate-900">
                Purchase Order Document Details — {previewPo.po_number}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewPo(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Supplier Vendor</span>
                  <span className="font-extrabold text-slate-900 text-sm">{previewPo.supplier?.name || 'Supplier'}</span>
                  <span className="block text-slate-500">{previewPo.supplier?.mobile}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Receiving Warehouse</span>
                  <span className="font-extrabold text-slate-900 text-sm">{previewPo.warehouse?.name || 'Warehouse'}</span>
                  <span className="block text-slate-500">Order Date: {previewPo.order_date?.split('T')[0]}</span>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg text-indigo-950 font-bold">
                <span>Status: <strong className="uppercase">{previewPo.status}</strong></span>
                <span>Grand Total: <strong className="font-mono text-base text-indigo-700">৳{Number(previewPo.grand_total || previewPo.total_amount || 0).toLocaleString()}</strong></span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  const target = previewPo;
                  setPreviewPo(null);
                  setPrintModalOrder(target);
                }}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-black cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Printer className="w-4 h-4 text-indigo-600" /> Print Document (A4)
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetId = previewPo.id || previewPo.po_number;
                  setPreviewPo(null);
                  navigate(`/purchases/orders/${targetId}/edit`);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black cursor-pointer shadow-2xs transition-colors"
              >
                Open Full Order Form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED PURCHASE ORDER PRINT MODAL (A4) */}
      {printModalOrder && (
        <PurchaseOrderPrintModal
          order={printModalOrder}
          company={activeCompany ? {
            name: activeCompany.name,
            address: activeCompany.address,
            phone: activeCompany.phone,
            email: activeCompany.email,
            tax_number: activeCompany.tax_number,
          } : undefined}
          onClose={() => setPrintModalOrder(null)}
        />
      )}
    </div>
  );
};
