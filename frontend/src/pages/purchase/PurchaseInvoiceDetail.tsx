import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { 
  ArrowLeft, 
  Send, 
  CreditCard, 
  Printer, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Building2, 
  FileText,
  XCircle,
  Package
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { DocumentHeader } from '../../components/common/DocumentHeader';
import { getPurchase, postPurchaseInvoice, cancelPurchaseInvoice } from '../../api/purchases';
import { formatCurrency } from '../../utils/currency';
import { useLanguage } from '../../i18n';
import { PurchaseInvoice, PurchaseInvoiceStatus, PurchasePaymentStatus } from '../../types/purchase';
import { SupplierPaymentModal } from '../../components/purchase/SupplierPaymentModal';

export function PurchaseInvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [invoice, setInvoice] = useState<PurchaseInvoice | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (id) {
      loadInvoice(Number(id));
    }
  }, [id]);

  const loadInvoice = async (invoiceId: number) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await getPurchase(invoiceId);
      setInvoice(res.data);
    } catch (err: any) {
      console.error('Failed to load purchase invoice:', err);
      setErrorMessage(err.message || 'Failed to load purchase invoice.');
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!invoice) return;
    if (!window.confirm('Are you sure you want to permanently post this Purchase Invoice? This will debit AP Clearing and credit Accounts Payable, updating Supplier Ledger.')) {
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await postPurchaseInvoice(invoice.id);
      setSuccessMessage('Purchase invoice successfully posted to Accounts Payable.');
      setInvoice(res.data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to post purchase invoice.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!invoice) return;
    if (!window.confirm('Are you sure you want to cancel this draft purchase invoice?')) {
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await cancelPurchaseInvoice(invoice.id);
      setSuccessMessage('Purchase invoice cancelled.');
      setInvoice(res.data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to cancel purchase invoice.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: PurchaseInvoiceStatus) => {
    switch (status) {
      case 'POSTED':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-1.5 w-fit">
            <CheckCircle2 className="w-3.5 h-3.5" /> Posted
          </span>
        );
      case 'DRAFT':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-1.5 w-fit">
            <Clock className="w-3.5 h-3.5" /> Draft
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1.5 w-fit">
            <XCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      default:
        return <span className="px-2.5 py-1 text-xs text-slate-600 bg-slate-100 rounded-lg">{status}</span>;
    }
  };

  const getPaymentBadge = (status?: PurchasePaymentStatus) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-100/60 rounded-lg w-fit">
            PAID
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-100/60 rounded-lg w-fit">
            PARTIAL
          </span>
        );
      case 'DUE':
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-100/60 rounded-lg w-fit">
            DUE
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <span>Loading purchase invoice...</span>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-12 text-center">
        <p className="text-sm font-semibold text-slate-700">Invoice not found</p>
        <Link to="/purchases/invoices" className="text-xs text-indigo-600 hover:underline mt-2 inline-block">
          Return to invoice list
        </Link>
      </div>
    );
  }

  const paid = Number(invoice.paid_amount ?? 0);
  const due = Number(invoice.due_amount ?? Math.max(0, Number(invoice.grand_total) - paid));

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        breadcrumbs={[
          { label: t('purchases.breadcrumb', 'Purchases'), to: '/purchases/invoices' },
          { label: invoice.supplier_invoice_number },
        ]}
        title={`Invoice: ${invoice.supplier_invoice_number}`}
        subtitle={`Vendor Bill #${invoice.id} • Date: ${invoice.invoice_date}`}
        badge={
          <div className="flex items-center gap-2">
            {getStatusBadge(invoice.status)}
            {getPaymentBadge(invoice.payment_status)}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>

            {invoice.status === 'DRAFT' && (
              <>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleCancel}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" /> Cancel Invoice
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handlePost}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" /> Post to AP
                </button>
              </>
            )}

            {invoice.status === 'POSTED' && due > 0 && (
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer shadow-xs"
              >
                <CreditCard className="w-3.5 h-3.5" /> Pay Supplier
              </button>
            )}
          </div>
        }
      />

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Document Header for Printing */}
      <DocumentHeader 
        title="PURCHASE INVOICE" 
        subtitle="Vendor Accounts Payable Bill" 
        docNumber={invoice.supplier_invoice_number} 
        docDate={invoice.invoice_date} 
      />

      {/* Vendor & Financial Settlement Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Supplier Profile */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Vendor / Supplier Information
          </span>
          <div className="text-base font-bold text-slate-900">{invoice.supplier?.name}</div>
          <div className="text-xs text-slate-600 space-y-0.5">
            <div>Code: <span className="font-mono font-medium">{invoice.supplier?.supplier_code}</span></div>
            {invoice.supplier?.mobile && <div>Phone: {invoice.supplier.mobile}</div>}
            {invoice.supplier?.email && <div>Email: {invoice.supplier.email}</div>}
          </div>
          <div className="pt-2">
            <Link
              to={`/purchases/suppliers/${invoice.supplier_id}/ledger`}
              className="text-xs text-purple-600 hover:underline font-semibold inline-flex items-center gap-1"
            >
              View Supplier Statement & Ledger &rarr;
            </Link>
          </div>
        </div>

        {/* Financial Settlement */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Financial Settlement Summary
          </span>
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Invoice Grand Total:</span>
              <span className="font-mono font-bold text-slate-900">{formatCurrency(invoice.grand_total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Settled (Paid):</span>
              <span className="font-mono font-medium text-emerald-700">{formatCurrency(paid)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-1 font-bold">
              <span className="text-slate-700">Due Outstanding:</span>
              <span className="font-mono text-amber-700 text-sm">{formatCurrency(due)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Associations & References */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Purchase Order</span>
          <span className="font-mono font-bold text-slate-800">
            {invoice.purchase_order?.po_number || invoice.purchaseOrder?.po_number || 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Goods Receipt</span>
          <span className="font-mono font-bold text-slate-800">
            {invoice.goods_receipt?.receipt_number || (invoice.goods_receipt_id ? `GR #${invoice.goods_receipt_id}` : 'N/A')}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Warehouse</span>
          <span className="font-semibold text-slate-800">
            {invoice.warehouse?.name || 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Due Date</span>
          <span className="font-mono text-slate-700">
            {invoice.due_date || 'None'}
          </span>
        </div>
      </div>

      {/* Billed Items Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-indigo-600" />
            Billed Line Items
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-4">Item & SKU</th>
                <th className="py-2.5 px-4 text-right">Quantity</th>
                <th className="py-2.5 px-4 text-right">Unit Cost</th>
                <th className="py-2.5 px-4 text-right">Discount</th>
                <th className="py-2.5 px-4 text-right">Tax</th>
                <th className="py-2.5 px-4 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {invoice.items && invoice.items.length > 0 ? (
                invoice.items.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-900">{it.product?.name || `Product #${it.product_id}`}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{it.variant?.sku || it.product_variant?.sku || `SKU-${it.product_variant_id}`}</div>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-medium">{Number(it.quantity)}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(it.unit_cost)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-500">{formatCurrency(it.discount || 0)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-500">{formatCurrency(it.tax || 0)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">{formatCurrency(it.line_total)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No items found on this invoice.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200 font-mono text-xs">
              <tr>
                <td colSpan={5} className="py-2 px-4 text-right text-slate-600 font-medium">Subtotal:</td>
                <td className="py-2 px-4 text-right font-bold text-slate-900">{formatCurrency(invoice.subtotal || 0)}</td>
              </tr>
              {Number(invoice.discount_total || 0) > 0 && (
                <tr>
                  <td colSpan={5} className="py-1 px-4 text-right text-slate-600">Discount:</td>
                  <td className="py-1 px-4 text-right text-emerald-700">-{formatCurrency(invoice.discount_total || 0)}</td>
                </tr>
              )}
              {Number(invoice.tax_total || 0) > 0 && (
                <tr>
                  <td colSpan={5} className="py-1 px-4 text-right text-slate-600">Tax / VAT:</td>
                  <td className="py-1 px-4 text-right text-slate-800">+{formatCurrency(invoice.tax_total || 0)}</td>
                </tr>
              )}
              {Number(invoice.shipping_cost || 0) > 0 && (
                <tr>
                  <td colSpan={5} className="py-1 px-4 text-right text-slate-600">Shipping:</td>
                  <td className="py-1 px-4 text-right text-slate-800">+{formatCurrency(invoice.shipping_cost || 0)}</td>
                </tr>
              )}
              <tr className="border-t border-slate-200">
                <td colSpan={5} className="py-2.5 px-4 text-right text-slate-900 font-bold text-sm">Grand Total:</td>
                <td className="py-2.5 px-4 text-right font-extrabold text-indigo-700 text-sm">{formatCurrency(invoice.grand_total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* General Ledger Journal Reference */}
      {invoice.status === 'POSTED' ? (
        <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
          <div className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>General Ledger Journal Posting (Gate 1.5 AP Entry)</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-[11px]">
            <div className="p-2.5 bg-white border border-indigo-100 rounded-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">DEBIT</span>
              <span className="font-semibold text-slate-800">AP Clearing / GRNI</span>
              <span className="text-slate-500 block text-[10px]">Offsets goods receipt accrual</span>
            </div>
            <div className="p-2.5 bg-white border border-indigo-100 rounded-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">CREDIT</span>
              <span className="font-semibold text-slate-800">Accounts Payable</span>
              <span className="text-slate-500 block text-[10px]">Vendor liability confirmed</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 italic mt-1">
            Journal Idempotency Key: <span className="font-mono font-semibold">PURCHASE-INV-{invoice.id}</span> &bull; Supplier ledger updated.
          </p>
        </div>
      ) : (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
          <Clock className="w-4 h-4 shrink-0 text-amber-600" />
          <span>Draft invoice. Post to transfer GRNI accrual into Accounts Payable liability.</span>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <SupplierPaymentModal
          invoice={invoice}
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={() => {
            setIsPaymentModalOpen(false);
            setSuccessMessage('Payment recorded and allocated successfully.');
            loadInvoice(invoice.id);
          }}
        />
      )}
    </div>
  );
}
