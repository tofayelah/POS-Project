import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { 
  FileText, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Eye, 
  Send, 
  AlertCircle, 
  X, 
  Printer, 
  CreditCard,
  Building2,
  Calendar,
  Layers,
  DollarSign
} from 'lucide-react';
import { PurchaseInvoice, PurchaseInvoiceStatus, PurchasePaymentStatus } from '../../types/purchase';
import { getPurchases, postPurchaseInvoice } from '../../api/purchases';
import { formatCurrency } from '../../utils/currency';
import { SupplierPaymentModal } from '../../components/purchase/SupplierPaymentModal';

export function PurchaseList() {
  const location = useLocation();
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('ALL');
  
  const [successMessage, setSuccessMessage] = useState<string | null>(
    (location.state as any)?.successMessage || null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Detail Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [postingId, setPostingId] = useState<number | null>(null);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<PurchaseInvoice | null>(null);

  useEffect(() => {
    loadInvoices();
  }, [statusFilter, paymentStatusFilter]);

  const loadInvoices = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await getPurchases({
        search,
        status: statusFilter,
        payment_status: paymentStatusFilter,
      });
      setInvoices(res.data);
    } catch (err: any) {
      console.error('Failed to load purchase invoices:', err);
      setErrorMessage(err.message || 'Failed to load purchase invoices.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadInvoices();
  };

  const handlePostInvoice = async (id: number) => {
    if (!window.confirm('Are you sure you want to permanently post this Purchase Invoice? This will debit AP Clearing and credit Accounts Payable, updating Supplier Ledger.')) {
      return;
    }

    setPostingId(id);
    setErrorMessage(null);
    try {
      await postPurchaseInvoice(id);
      setSuccessMessage('Purchase Invoice posted successfully. AP Clearing debited and Accounts Payable credited.');
      loadInvoices();
      if (selectedInvoice && selectedInvoice.id === id) {
        setSelectedInvoice({ ...selectedInvoice, status: 'POSTED' });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to post Purchase Invoice.');
    } finally {
      setPostingId(null);
    }
  };

  const openPaymentModal = (inv: PurchaseInvoice) => {
    setPaymentInvoice(inv);
    setIsPaymentModalOpen(true);
  };

  const getStatusBadge = (status: PurchaseInvoiceStatus) => {
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

  const getPaymentBadge = (status?: PurchasePaymentStatus) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="px-2 py-0.5 text-[11px] font-bold text-emerald-700 bg-emerald-100/60 rounded-md w-fit">
            PAID
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="px-2 py-0.5 text-[11px] font-bold text-blue-700 bg-blue-100/60 rounded-md w-fit">
            PARTIAL
          </span>
        );
      case 'DUE':
      default:
        return (
          <span className="px-2 py-0.5 text-[11px] font-bold text-amber-700 bg-amber-100/60 rounded-md w-fit">
            DUE
          </span>
        );
    }
  };

  // KPIs
  const totalInvoices = invoices.length;
  const totalAmount = invoices.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
  const totalDue = invoices.reduce((sum, inv) => sum + (Number(inv.due_amount ?? inv.grand_total) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Purchase Invoices (AP Bills)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage vendor bills, AP Clearing offsets, Accounts Payable liabilities, and settlements.
          </p>
        </div>

        <Link
          to="/purchases/payables"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-xs w-fit"
        >
          <CreditCard className="w-4 h-4 text-purple-600" /> View Supplier Payables
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
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Total Invoices</span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">{totalInvoices}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Billed Volume</span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">{formatCurrency(totalAmount)}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-amber-600 text-xs font-semibold uppercase tracking-wider block">Total Outstanding Due</span>
          <span className="text-2xl font-bold font-mono text-amber-700 mt-1 block">{formatCurrency(totalDue)}</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Invoice #, PO #, supplier..."
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </form>

        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          {['ALL', 'DRAFT', 'POSTED'].map((st) => (
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
              {st === 'ALL' ? 'All Status' : st}
            </button>
          ))}
          <button
            type="button"
            onClick={loadInvoices}
            title="Refresh list"
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-500 shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Invoice Date</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">PO Reference</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Due</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading purchase invoices...</span>
                    </div>
                  </td>
                </tr>
              ) : invoices.length > 0 ? (
                invoices.map((inv) => {
                  const paid = Number(inv.paid_amount ?? 0);
                  const due = Number(inv.due_amount ?? Math.max(0, Number(inv.grand_total) - paid));
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Invoice # */}
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setIsDetailModalOpen(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-800 font-mono font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {inv.supplier_invoice_number}
                        </button>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        {inv.invoice_date}
                      </td>

                      {/* Supplier */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{inv.supplier?.name || `Supplier #${inv.supplier_id}`}</div>
                        {inv.supplier?.supplier_code && (
                          <div className="text-[10px] text-slate-400 font-mono">{inv.supplier.supplier_code}</div>
                        )}
                      </td>

                      {/* PO Reference */}
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        {inv.purchase_order?.po_number || inv.purchaseOrder?.po_number || 'N/A'}
                      </td>

                      {/* Grand Total */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(inv.grand_total)}
                      </td>

                      {/* Paid */}
                      <td className="py-3 px-4 text-right font-mono text-emerald-700 font-medium">
                        {formatCurrency(paid)}
                      </td>

                      {/* Due */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                        {formatCurrency(due)}
                      </td>

                      {/* Payment Status */}
                      <td className="py-3 px-4">
                        {getPaymentBadge(inv.payment_status)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {getStatusBadge(inv.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setIsDetailModalOpen(true);
                          }}
                          title="View Details"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {inv.status === 'DRAFT' && (
                          <button
                            type="button"
                            disabled={postingId === inv.id}
                            onClick={() => handlePostInvoice(inv.id)}
                            title="Post Invoice"
                            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {inv.status === 'POSTED' && due > 0 && (
                          <button
                            type="button"
                            onClick={() => openPaymentModal(inv)}
                            title="Pay Supplier"
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No purchase invoices found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Purchase invoices track supplier bills and general ledger payables.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {isDetailModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    Invoice: {selectedInvoice.supplier_invoice_number}
                  </h3>
                  {getStatusBadge(selectedInvoice.status)}
                  {getPaymentBadge(selectedInvoice.payment_status)}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vendor Bill &bull; Date: {selectedInvoice.invoice_date}
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
              {/* Vendor & Finance Summary */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-slate-400 block font-semibold mb-1">Supplier / Vendor</span>
                  <div className="font-bold text-slate-900 text-sm">{selectedInvoice.supplier?.name}</div>
                  <div className="text-slate-600 mt-0.5">Code: {selectedInvoice.supplier?.supplier_code}</div>
                  {selectedInvoice.supplier?.mobile && (
                    <div className="text-slate-500">Tel: {selectedInvoice.supplier.mobile}</div>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block font-semibold mb-1">Financial Settlement</span>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Grand Total:</span>
                      <span className="font-mono font-bold text-slate-900">{formatCurrency(selectedInvoice.grand_total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Paid Amount:</span>
                      <span className="font-mono font-medium text-emerald-700">
                        {formatCurrency(selectedInvoice.paid_amount || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1 font-bold">
                      <span className="text-slate-700">Due Outstanding:</span>
                      <span className="font-mono text-amber-700">
                        {formatCurrency(selectedInvoice.due_amount ?? selectedInvoice.grand_total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* General Ledger Journal Reference */}
              {selectedInvoice.status === 'POSTED' ? (
                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
                  <div className="font-bold text-indigo-900 flex items-center gap-1.5">
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
                      <span className="font-semibold text-slate-800">Accounts Payable (2000)</span>
                      <span className="text-slate-500 block text-[10px]">Vendor liability confirmed</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 italic mt-1">
                    Journal Key: <span className="font-mono font-semibold">PURCHASE-INV-{selectedInvoice.id}</span> &bull; Supplier ledger updated.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Draft invoice. Post to transfer GRNI accrual into Accounts Payable liability.</span>
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
                <Printer className="w-3.5 h-3.5" /> Print
              </button>

              <div className="flex items-center gap-2">
                {selectedInvoice.status === 'DRAFT' && (
                  <button
                    type="button"
                    disabled={postingId === selectedInvoice.id}
                    onClick={() => handlePostInvoice(selectedInvoice.id)}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" /> Post Invoice
                  </button>
                )}
                {selectedInvoice.status === 'POSTED' && (Number(selectedInvoice.due_amount ?? 1) > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      openPaymentModal(selectedInvoice);
                    }}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Pay Supplier
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

      {/* Supplier Payment Modal */}
      {isPaymentModalOpen && paymentInvoice && (
        <SupplierPaymentModal
          invoice={paymentInvoice}
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setPaymentInvoice(null);
          }}
          onSuccess={() => {
            setIsPaymentModalOpen(false);
            setPaymentInvoice(null);
            setSuccessMessage('Payment allocated successfully to invoice.');
            loadInvoices();
          }}
        />
      )}
    </div>
  );
}
