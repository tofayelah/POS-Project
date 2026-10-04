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
  ArrowRight,
  Ban
} from 'lucide-react';
import { GoodsReceipt, GoodsReceiptStatus } from '../../types/purchase';
import { getGoodsReceipts, postGoodsReceipt, cancelGoodsReceipt } from '../../api/goodsReceipts';
import { formatCurrency } from '../../utils/currency';
import { DocumentHeader } from '../../components/common/DocumentHeader';
import { PageHeader } from '../../components/common/PageHeader';
import { TableContainer } from '../../components/common/TableContainer';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { useLanguage } from '../../i18n';

export function GoodsReceiptList() {
  const { t } = useLanguage();
  const location = useLocation();
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [successMessage, setSuccessMessage] = useState<string | null>(
    (location.state as any)?.successMessage || null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Detail & Action Modals
  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceipt | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [postConfirmReceipt, setPostConfirmReceipt] = useState<GoodsReceipt | null>(null);
  const [cancelConfirmReceipt, setCancelConfirmReceipt] = useState<GoodsReceipt | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadReceipts();
  }, [statusFilter]);

  const loadReceipts = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await getGoodsReceipts({
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setReceipts(res.data);
    } catch (err: any) {
      console.error('Failed to load goods receipts:', err);
      setErrorMessage(err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadReceipts();
  };

  const handlePostReceipt = async () => {
    if (!postConfirmReceipt) return;
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await postGoodsReceipt(postConfirmReceipt.id);
      setSuccessMessage(t('goodsReceipts.successPost'));
      setPostConfirmReceipt(null);
      loadReceipts();
      if (selectedReceipt && selectedReceipt.id === postConfirmReceipt.id) {
        setSelectedReceipt({ ...selectedReceipt, status: 'POSTED' });
      }
    } catch (err: any) {
      setErrorMessage(err.message || t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelReceipt = async () => {
    if (!cancelConfirmReceipt) return;
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await cancelGoodsReceipt(cancelConfirmReceipt.id);
      setSuccessMessage(t('goodsReceipts.successCancel'));
      setCancelConfirmReceipt(null);
      loadReceipts();
      if (selectedReceipt && selectedReceipt.id === cancelConfirmReceipt.id) {
        setSelectedReceipt({ ...selectedReceipt, status: 'CANCELLED' });
      }
    } catch (err: any) {
      setErrorMessage(err.message || t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: GoodsReceiptStatus) => {
    switch (status) {
      case 'POSTED':
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3 h-3" /> {t('goodsReceipts.statusPosted')}
          </span>
        );
      case 'DRAFT':
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-1 w-fit">
            <Clock className="w-3 h-3" /> {t('goodsReceipts.statusDraft')}
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-md flex items-center gap-1 w-fit">
            <Ban className="w-3 h-3" /> {t('goodsReceipts.statusCancelled')}
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
      {/* Top Header */}
      <PageHeader
        title={t('goodsReceipts.title')}
        subtitle={t('goodsReceipts.subtitle')}
        actions={
          <Link
            to="/purchases/goods-receipts/create"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> {t('goodsReceipts.create')}
          </Link>
        }
      />

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
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            {t('goodsReceipts.totalReceipts')}
          </span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">{totalCount}</span>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">
            {t('goodsReceipts.postedReceipts')}
          </span>
          <span className="text-2xl font-bold text-emerald-700 mt-1 block">{postedCount}</span>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider block">
            {t('goodsReceipts.draftReceipts')}
          </span>
          <span className="text-2xl font-bold text-amber-700 mt-1 block">{draftCount}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('goodsReceipts.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="ALL">{t('goodsReceipts.statusAll')}</option>
            <option value="POSTED">{t('goodsReceipts.statusPosted')}</option>
            <option value="DRAFT">{t('goodsReceipts.statusDraft')}</option>
            <option value="CANCELLED">{t('goodsReceipts.statusCancelled')}</option>
          </select>

          <button
            onClick={loadReceipts}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer"
            title={t('common.refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Section */}
      <TableContainer>
        {loading ? (
          <LoadingState message={t('common.loading')} />
        ) : receipts.length === 0 ? (
          <EmptyState
            title={t('goodsReceipts.empty')}
            description={t('goodsReceipts.emptyDesc')}
          />
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold">
                <th className="py-3 px-4">{t('goodsReceipts.receiptNumber')}</th>
                <th className="py-3 px-4">{t('goodsReceipts.receiptDate')}</th>
                <th className="py-3 px-4">{t('goodsReceipts.supplier')}</th>
                <th className="py-3 px-4">{t('goodsReceipts.purchaseOrder')}</th>
                <th className="py-3 px-4">{t('goodsReceipts.warehouse')}</th>
                <th className="py-3 px-4 text-center">{t('goodsReceipts.items')}</th>
                <th className="py-3 px-4">{t('goodsReceipts.status')}</th>
                <th className="py-3 px-4 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receipts.map((gr) => {
                const itemCount = gr.items?.length || 0;
                const poNumber = gr.purchaseOrder?.po_number || gr.purchase_order?.po_number || 'N/A';
                const supplierName = gr.supplier?.name || 'N/A';
                const warehouseName = gr.warehouse?.name || 'N/A';

                return (
                  <tr key={gr.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      <Link
                        to={`/purchases/goods-receipts/${gr.id}`}
                        className="text-indigo-600 hover:text-indigo-800 hover:underline font-semibold"
                      >
                        {gr.receipt_number}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{gr.receipt_date}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{supplierName}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {gr.purchase_order_id ? (
                        <Link
                          to={`/purchases/orders`}
                          className="hover:text-indigo-600 hover:underline"
                        >
                          {poNumber}
                        </Link>
                      ) : (
                        poNumber
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{warehouseName}</td>
                    <td className="py-3 px-4 text-center text-slate-600 font-medium">
                      {itemCount}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(gr.status)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedReceipt(gr);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title={t('goodsReceipts.viewDetails')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <Link
                          to={`/purchases/goods-receipts/${gr.id}`}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title={t('goodsReceipts.viewDetails')}
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Link>

                        {gr.status === 'DRAFT' && (
                          <>
                            <button
                              onClick={() => setPostConfirmReceipt(gr)}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title={t('goodsReceipts.post')}
                            >
                              <Send className="w-3 h-3" /> {t('goodsReceipts.post')}
                            </button>
                            <button
                              onClick={() => setCancelConfirmReceipt(gr)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title={t('goodsReceipts.cancelReceipt')}
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </TableContainer>

      {/* Quick View Modal */}
      {isDetailModalOpen && selectedReceipt && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm">
                  {t('goodsReceipts.detailsTitle')} — {selectedReceipt.receipt_number}
                </h3>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">{t('goodsReceipts.receiptDate')}</span>
                  <p className="font-semibold text-slate-700 mt-0.5">{selectedReceipt.receipt_date}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">{t('goodsReceipts.supplier')}</span>
                  <p className="font-semibold text-slate-700 mt-0.5">{selectedReceipt.supplier?.name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">{t('goodsReceipts.warehouse')}</span>
                  <p className="font-semibold text-slate-700 mt-0.5">{selectedReceipt.warehouse?.name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">{t('goodsReceipts.status')}</span>
                  <div className="mt-0.5">{getStatusBadge(selectedReceipt.status)}</div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-700 mb-2">{t('goodsReceipts.items')}</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">{t('goodsReceipts.product')}</th>
                        <th className="py-2 px-3 text-right">{t('goodsReceipts.receiveNow')}</th>
                        <th className="py-2 px-3 text-right">{t('goodsReceipts.unitCost')}</th>
                        <th className="py-2 px-3 text-right">{t('goodsReceipts.totalCost')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedReceipt.items || []).map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3">
                            <span className="font-medium text-slate-800 block">
                              {it.product?.name || `Product #${it.product_id}`}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {it.product_variant?.sku || it.product?.code || 'N/A'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-700">
                            {Number(it.received_quantity).toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {formatCurrency(Number(it.unit_cost))}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-900">
                            {formatCurrency(Number(it.total_cost || Number(it.received_quantity) * Number(it.unit_cost)))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedReceipt.notes && (
                <div className="p-3 bg-amber-50/50 border border-amber-200/50 rounded-xl text-slate-600">
                  <span className="font-semibold text-amber-800 text-[11px] block">{t('goodsReceipts.notes')}:</span>
                  <p className="mt-0.5">{selectedReceipt.notes}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <Link
                to={`/purchases/goods-receipts/${selectedReceipt.id}`}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" /> {t('goodsReceipts.print')} / {t('goodsReceipts.viewDetails')}
              </Link>
              <div className="flex items-center gap-2">
                {selectedReceipt.status === 'DRAFT' && (
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      setPostConfirmReceipt(selectedReceipt);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" /> {t('goodsReceipts.post')}
                  </button>
                )}
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post Confirmation Modal */}
      {postConfirmReceipt && (
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
                  {postConfirmReceipt.receipt_number}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {t('goodsReceipts.postConfirmMessage')}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setPostConfirmReceipt(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handlePostReceipt}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? t('goodsReceipts.posting') : t('goodsReceipts.post')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelConfirmReceipt && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-xl border border-rose-200">
                <Ban className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {t('goodsReceipts.cancelConfirmTitle')}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {cancelConfirmReceipt.receipt_number}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {t('goodsReceipts.cancelConfirmMessage')}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setCancelConfirmReceipt(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCancelReceipt}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? t('goodsReceipts.cancelling') : t('goodsReceipts.cancelReceipt')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
