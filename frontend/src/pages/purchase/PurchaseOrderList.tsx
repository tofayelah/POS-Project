import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { 
  FileText, 
  Plus, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Printer, 
  Eye, 
  AlertCircle,
  X,
  Package
} from 'lucide-react';
import { PurchaseOrder, PurchaseOrderStatus } from '../../types/purchase';
import { DocumentHeader } from '../../components/common/DocumentHeader';
import { 
  getPurchaseOrders, 
  approvePurchaseOrder, 
  cancelPurchaseOrder 
} from '../../api/purchaseOrders';
import { formatCurrency } from '../../utils/currency';
import { useLanguage } from '../../i18n';
import { PageHeader, TableContainer, StatusBadge, LoadingState, EmptyState } from '../../components/common';

export function PurchaseOrderList() {
  const { t } = useLanguage();
  const location = useLocation();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [successMessage, setSuccessMessage] = useState<string | null>(
    (location.state as any)?.successMessage || null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Confirmation Modals
  const [approvingPo, setApprovingPo] = useState<PurchaseOrder | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [cancellingPo, setCancellingPo] = useState<PurchaseOrder | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await getPurchaseOrders({
        search: search.trim() || undefined,
        status: statusFilter,
      });
      setOrders(res.data);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to load purchase orders.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders();
  };

  const handleApproveConfirm = async () => {
    if (!approvingPo) return;
    setIsApproving(true);
    try {
      await approvePurchaseOrder(approvingPo.id);
      setSuccessMessage(t('purchaseOrders.approveSuccess'));
      setApprovingPo(null);
      loadOrders();
      if (selectedPo && selectedPo.id === approvingPo.id) {
        setSelectedPo({ ...selectedPo, status: 'APPROVED' });
      }
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to approve purchase order.');
      setApprovingPo(null);
    } finally {
      setIsApproving(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancellingPo) return;
    setIsCancelling(true);
    try {
      await cancelPurchaseOrder(cancellingPo.id);
      setSuccessMessage(t('purchaseOrders.cancelSuccess'));
      setCancellingPo(null);
      loadOrders();
      if (selectedPo && selectedPo.id === cancellingPo.id) {
        setSelectedPo({ ...selectedPo, status: 'CANCELLED' });
      }
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to cancel purchase order.');
      setCancellingPo(null);
    } finally {
      setIsCancelling(false);
    }
  };

  // KPI Calculations
  const totalCount = orders.length;
  const approvedCount = orders.filter((o) => o.status === 'APPROVED' || o.status === 'FULLY_RECEIVED').length;
  const draftCount = orders.filter((o) => o.status === 'DRAFT').length;
  const totalAmount = orders.reduce((sum, o) => sum + (Number(o.grand_total) || 0), 0);

  return (
    <div id="purchase-order-list-page" className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title={t('purchaseOrders.title')}
        subtitle={t('purchaseOrders.subtitle')}
        actions={
          <Link
            to="/purchases/orders/new"
            id="btn-create-new-po"
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs hover:shadow flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('purchaseOrders.newOrder')}</span>
          </Link>
        }
      />

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

      {/* Error Banner */}
      {errorMessage && (
        <div id="po-error-banner" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">{t('purchaseOrders.totalOrders')}</span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">{totalCount}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-600 block">{t('purchaseOrders.approvedOrders')}</span>
          <span className="text-xl font-bold text-emerald-700 mt-1 block">{approvedCount}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-600 block">{t('purchaseOrders.draftOrders')}</span>
          <span className="text-xl font-bold text-amber-700 mt-1 block">{draftCount}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-indigo-600 block">{t('purchaseOrders.totalValue')}</span>
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
            placeholder={t('purchaseOrders.searchPlaceholder')}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </form>

        {/* Status Filters */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          {['ALL', 'DRAFT', 'APPROVED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CANCELLED'].map((st) => (
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
              {st === 'ALL' ? t('purchaseOrders.allStatuses') : t(`purchaseOrders.status.${st.toLowerCase()}` as any)}
            </button>
          ))}
          <button
            type="button"
            onClick={loadOrders}
            title={t('common.refresh')}
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-500 shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <TableContainer>
        {loading ? (
          <LoadingState message={t('common.loading')} />
        ) : orders.length === 0 ? (
          <EmptyState
            title={t('purchaseOrders.noOrdersFound')}
            description={t('purchaseOrders.noOrdersFoundDesc')}
            action={
              <Link
                to="/purchases/orders/new"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> {t('purchaseOrders.newOrder')}
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">{t('purchaseOrders.poNumber')}</th>
                  <th className="py-3 px-4">{t('purchaseOrders.orderDate')}</th>
                  <th className="py-3 px-4">{t('purchaseOrders.supplier')}</th>
                  <th className="py-3 px-4">{t('purchaseOrders.warehouse')}</th>
                  <th className="py-3 px-4 text-center">{t('purchaseOrders.items')}</th>
                  <th className="py-3 px-4 text-right">{t('purchaseOrders.grandTotal')}</th>
                  <th className="py-3 px-4">{t('purchaseOrders.status')}</th>
                  <th className="py-3 px-4 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {orders.map((po) => (
                  <tr key={po.id} id={`po-row-${po.id}`} className="hover:bg-slate-50/70 transition-colors">
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
                    <td className="py-3 px-4">
                      <StatusBadge status={po.status} />
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right space-x-1">
                      {/* View Details */}
                      <button
                        id={`btn-view-po-${po.id}`}
                        type="button"
                        onClick={() => {
                          setSelectedPo(po);
                          setIsDetailModalOpen(true);
                        }}
                        title={t('common.view')}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Approve button for DRAFT */}
                      {po.status === 'DRAFT' && (
                        <button
                          id={`btn-approve-po-${po.id}`}
                          type="button"
                          onClick={() => setApprovingPo(po)}
                          title={t('purchaseOrders.approve')}
                          className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Receive Goods link for APPROVED / PARTIALLY_RECEIVED */}
                      {(po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED') && (
                        <Link
                          id={`btn-grn-po-${po.id}`}
                          to={`/purchases/goods-receipts/create?po_id=${po.id}`}
                          title={t('purchaseOrders.receiveGoods')}
                          className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer inline-flex items-center"
                        >
                          <Package className="w-3.5 h-3.5" />
                        </Link>
                      )}

                      {/* Cancel button */}
                      {po.status !== 'CANCELLED' && po.status !== 'FULLY_RECEIVED' && (
                        <button
                          id={`btn-cancel-po-${po.id}`}
                          type="button"
                          onClick={() => setCancellingPo(po)}
                          title={t('purchaseOrders.cancel')}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TableContainer>

      {/* PO Detail & Inspection Modal */}
      {isDetailModalOpen && selectedPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Top */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{t('purchaseOrders.title')}: {selectedPo.po_number}</h3>
                  <StatusBadge status={selectedPo.status} />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('purchaseOrders.orderDate')}: {selectedPo.order_date} &bull; {t('purchaseOrders.warehouse')}: {selectedPo.warehouse?.name}
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
              <DocumentHeader 
                title="PURCHASE ORDER" 
                docNumber={selectedPo.po_number} 
                docDate={selectedPo.order_date} 
              />

              {/* Supplier & Delivery Info Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-slate-400 block font-semibold mb-1">{t('purchaseOrders.supplier')}</span>
                  <div className="font-bold text-slate-900 text-sm">{selectedPo.supplier?.name}</div>
                  <div className="text-slate-600 mt-0.5">Code: {selectedPo.supplier?.supplier_code}</div>
                  <div className="text-slate-600">Mobile: {selectedPo.supplier?.mobile}</div>
                  {selectedPo.supplier?.address && (
                    <div className="text-slate-500 mt-1">{selectedPo.supplier.address}</div>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block font-semibold mb-1">{t('purchaseOrders.warehouse')}</span>
                  <div className="font-bold text-slate-900 text-sm">{selectedPo.warehouse?.name}</div>
                  <div className="text-slate-600 mt-0.5">Code: {selectedPo.warehouse?.code}</div>
                  <div className="text-slate-600 mt-1">
                    {t('purchaseOrders.expectedDate')}: <span className="font-medium text-slate-800">{selectedPo.expected_date || 'Standard'}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2">{t('purchaseOrders.items')}</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                        <th className="py-2 px-3">{t('purchaseOrders.product')}</th>
                        <th className="py-2 px-3 text-center">{t('purchaseOrders.quantity')}</th>
                        <th className="py-2 px-3 text-right">{t('purchaseOrders.unitCost')}</th>
                        <th className="py-2 px-3 text-right">{t('purchaseOrders.lineTotal')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {selectedPo.items && selectedPo.items.length > 0 ? (
                        selectedPo.items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-2.5 px-3">
                              <div className="font-medium text-slate-900">{it.product?.name || `Product #${it.product_id}`}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                SKU: {it.variant?.sku || it.product?.product_code || 'N/A'} {it.variant?.variant_name && `• ${it.variant.variant_name}`}
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
                    <span>{t('purchaseOrders.subtotal')}:</span>
                    <span className="font-mono text-slate-800">{formatCurrency(selectedPo.subtotal)}</span>
                  </div>
                  {Number(selectedPo.discount_total) > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>{t('purchaseOrders.discountTotal')}:</span>
                      <span className="font-mono text-slate-800">- {formatCurrency(selectedPo.discount_total)}</span>
                    </div>
                  )}
                  {Number(selectedPo.shipping_cost) > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>{t('purchaseOrders.shippingCost')}:</span>
                      <span className="font-mono text-slate-800">+{formatCurrency(selectedPo.shipping_cost)}</span>
                    </div>
                  )}
                  {Number(selectedPo.tax_total) > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>{t('purchaseOrders.taxTotal')}:</span>
                      <span className="font-mono text-slate-800">+{formatCurrency(selectedPo.tax_total)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-sm text-slate-900">
                    <span>{t('purchaseOrders.grandTotal')}:</span>
                    <span className="font-mono text-indigo-600">{formatCurrency(selectedPo.grand_total)}</span>
                  </div>
                </div>
              </div>

              {selectedPo.notes && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="font-bold text-slate-700 block mb-1">{t('purchaseOrders.notes')}:</span>
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
                <Printer className="w-3.5 h-3.5" /> {t('common.print')}
              </button>

              <div className="flex items-center gap-2">
                {selectedPo.status === 'DRAFT' && (
                  <button
                    type="button"
                    onClick={() => {
                      setApprovingPo(selectedPo);
                    }}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> {t('purchaseOrders.approve')}
                  </button>
                )}
                {(selectedPo.status === 'APPROVED' || selectedPo.status === 'PARTIALLY_RECEIVED') && (
                  <Link
                    to={`/purchases/goods-receipts/create?po_id=${selectedPo.id}`}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Package className="w-3.5 h-3.5" /> {t('purchaseOrders.receiveGoods')}
                  </Link>
                )}
                {selectedPo.status !== 'CANCELLED' && selectedPo.status !== 'FULLY_RECEIVED' && (
                  <button
                    type="button"
                    onClick={() => {
                      setCancellingPo(selectedPo);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                  >
                    {t('purchaseOrders.cancel')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-lg cursor-pointer"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {approvingPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">{t('purchaseOrders.approveConfirm')}</h3>
            <p className="text-sm text-slate-500 mt-2">
              {t('purchaseOrders.approveConfirmDesc', { number: approvingPo.po_number })}
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setApprovingPo(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={isApproving}
                onClick={handleApproveConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
              >
                {isApproving ? t('common.loading') : t('purchaseOrders.approve')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancellingPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">{t('purchaseOrders.cancelConfirm')}</h3>
            <p className="text-sm text-slate-500 mt-2">
              {t('purchaseOrders.cancelConfirmDesc', { number: cancellingPo.po_number })}
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setCancellingPo(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleCancelConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
              >
                {isCancelling ? t('common.loading') : t('purchaseOrders.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
