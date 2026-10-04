import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router';
import { 
  Package, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Send, 
  Printer, 
  AlertCircle, 
  Building2, 
  Warehouse as WarehouseIcon,
  Calendar,
  Boxes,
  Ban,
  X
} from 'lucide-react';
import { GoodsReceipt } from '../../types/purchase';
import { getGoodsReceipt, postGoodsReceipt, cancelGoodsReceipt } from '../../api/goodsReceipts';
import { formatCurrency } from '../../utils/currency';
import { DocumentHeader } from '../../components/common/DocumentHeader';
import { useLanguage } from '../../i18n';

export function GoodsReceiptDetail() {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [receipt, setReceipt] = useState<GoodsReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    (location.state as any)?.successMessage || null
  );

  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

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
      setErrorMessage(err.message || t('goodsReceipts.notFoundDesc'));
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!receipt) return;
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await postGoodsReceipt(receipt.id);
      setSuccessMessage(t('goodsReceipts.successPost'));
      setIsPostModalOpen(false);
      loadReceipt(receipt.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to post Goods Receipt.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!receipt) return;
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await cancelGoodsReceipt(receipt.id);
      setSuccessMessage(t('goodsReceipts.successCancel'));
      setIsCancelModalOpen(false);
      loadReceipt(receipt.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to cancel Goods Receipt.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <span>{t('common.loading')}</span>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="p-12 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">{t('goodsReceipts.notFound')}</h2>
        <p className="text-xs text-slate-500">{t('goodsReceipts.notFoundDesc')}</p>
        <Link
          to="/purchases/goods-receipts"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {t('goodsReceipts.backToList')}
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
    <div className="space-y-6 max-w-5xl mx-auto pb-12 print:p-0 print:m-0 print:max-w-none">
      {/* Top Navigation / Actions */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 print:hidden">
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
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t('goodsReceipts.statusPosted')}
                </span>
              ) : receipt.status === 'CANCELLED' ? (
                <span className="px-2 py-0.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-md flex items-center gap-1">
                  <Ban className="w-3.5 h-3.5" /> {t('goodsReceipts.statusCancelled')}
                </span>
              ) : (
                <span className="px-2 py-0.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {t('goodsReceipts.statusDraft')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('goodsReceipts.receiptDate')}: {receipt.receipt_date} &bull; {t('goodsReceipts.warehouse')}: {receipt.warehouse?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> {t('goodsReceipts.print')}
          </button>

          {receipt.status === 'DRAFT' && (
            <>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className="px-3 py-1.5 border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <Ban className="w-3.5 h-3.5" /> {t('goodsReceipts.cancelReceipt')}
              </button>
              <button
                type="button"
                onClick={() => setIsPostModalOpen(true)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <Send className="w-3.5 h-3.5" /> {t('goodsReceipts.post')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Authoritative Document Header */}
      <DocumentHeader 
        title="GOODS RECEIPT NOTE (GRN)" 
        docNumber={receipt.receipt_number} 
        docDate={receipt.receipt_date} 
      />

      {/* Alerts */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center justify-between print:hidden">
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
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Info Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
        <div>
          <span className="text-slate-400 block font-semibold uppercase text-[10px] mb-1">
            {t('goodsReceipts.supplier')}
          </span>
          <div className="font-bold text-slate-900 text-sm">{receipt.supplier?.name}</div>
          <div className="text-slate-600 mt-0.5">Code: {receipt.supplier?.supplier_code}</div>
          {receipt.supplier?.mobile && <div className="text-slate-500">Tel: {receipt.supplier.mobile}</div>}
        </div>

        <div>
          <span className="text-slate-400 block font-semibold uppercase text-[10px] mb-1">
            {t('goodsReceipts.purchaseOrder')}
          </span>
          <div className="font-mono font-bold text-indigo-700 text-sm">
            {receipt.purchaseOrder?.po_number || receipt.purchase_order?.po_number || `PO #${receipt.purchase_order_id}`}
          </div>
          <Link
            to="/purchases/orders"
            className="text-indigo-600 hover:underline text-[11px] mt-1 inline-block print:hidden"
          >
            View Purchase Order &rarr;
          </Link>
        </div>

        <div>
          <span className="text-slate-400 block font-semibold uppercase text-[10px] mb-1">
            {t('goodsReceipts.warehouse')} & Audit
          </span>
          <div className="font-bold text-slate-800">{receipt.warehouse?.name}</div>
          <div className="text-slate-500 mt-0.5">
            {t('goodsReceipts.status')}: <span className="font-semibold text-slate-700">{receipt.status}</span>
          </div>
          {receipt.posted_at && (
            <div className="text-slate-400 text-[10px] mt-0.5">
              {t('goodsReceipts.postedAt')}: {receipt.posted_at}
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">{t('goodsReceipts.items')}</h3>
          <span className="text-xs text-slate-500">
            {t('goodsReceipts.totalQuantity')}: <strong className="text-indigo-600 font-mono">{totalQty}</strong> units
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3 px-4">{t('goodsReceipts.product')} / {t('goodsReceipts.sku')}</th>
                <th className="py-3 px-4 text-center">{t('goodsReceipts.receiveNow')}</th>
                <th className="py-3 px-4 text-right">{t('goodsReceipts.unitCost')}</th>
                <th className="py-3 px-4 text-right">{t('goodsReceipts.lineTotal')}</th>
                <th className="py-3 px-4">{t('goodsReceipts.batchNumber')}</th>
                <th className="py-3 px-4">{t('goodsReceipts.expiryDate')}</th>
                <th className="py-3 px-4">{t('goodsReceipts.storageLocation')}</th>
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
                        SKU: {it.productVariant?.sku || it.product_variant?.sku || it.product?.code || 'N/A'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-indigo-700">
                      {Number(it.received_quantity).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {formatCurrency(Number(it.unit_cost))}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(Number(it.total_cost || Number(it.received_quantity) * Number(it.unit_cost)))}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      {it.batch_number || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {it.expiry_date || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {it.storage_location?.name || (it as any).storageLocation?.name || '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-slate-400">
                    No line items found on this Goods Receipt.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
              <tr>
                <td className="py-3 px-4 text-right">{t('common.total')}:</td>
                <td className="py-3 px-4 text-center font-mono text-indigo-700">{totalQty.toLocaleString()}</td>
                <td className="py-3 px-4"></td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                  {formatCurrency(totalCost)}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Notes / Footer */}
      {receipt.notes && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs text-xs space-y-1">
          <span className="font-semibold text-slate-700 block">{t('goodsReceipts.notes')}:</span>
          <p className="text-slate-600 leading-relaxed">{receipt.notes}</p>
        </div>
      )}

      {/* Post Confirmation Modal */}
      {isPostModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150 print:hidden">
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
                  {receipt.receipt_number}
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
                onClick={() => setIsPostModalOpen(false)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handlePost}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? t('goodsReceipts.posting') : t('goodsReceipts.post')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150 print:hidden">
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
                  {receipt.receipt_number}
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
                onClick={() => setIsCancelModalOpen(false)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCancel}
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
