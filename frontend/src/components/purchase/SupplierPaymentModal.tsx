import React, { useState } from 'react';
import { 
  CreditCard, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  DollarSign, 
  Calendar, 
  Layers 
} from 'lucide-react';
import { PurchaseInvoice } from '../../types/purchase';
import { createPayment, allocatePayment, generateIdempotencyKey } from '../../api/payments';
import { formatCurrency } from '../../utils/currency';

interface SupplierPaymentModalProps {
  invoice?: PurchaseInvoice | null;
  supplierId?: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SupplierPaymentModal({
  invoice,
  supplierId,
  isOpen,
  onClose,
  onSuccess,
}: SupplierPaymentModalProps) {
  if (!isOpen) return null;

  const resolvedSupplierId = invoice?.supplier_id || supplierId;
  const initialDue = invoice ? Number(invoice.due_amount ?? invoice.grand_total) : 0;

  const [amount, setAmount] = useState<string>(initialDue > 0 ? initialDue.toString() : '');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid payment amount greater than 0.');
      return;
    }

    if (invoice && numAmount > initialDue) {
      setErrorMessage(`Payment amount cannot exceed invoice due balance (${formatCurrency(initialDue)}).`);
      return;
    }

    setLoading(true);

    try {
      // 1. Create payment with idempotency key
      const idempotencyKey = generateIdempotencyKey('PAY-SUPP');
      const paymentRes = await createPayment({
        amount: numAmount,
        payment_type: 'SUPPLIER',
        payment_method: paymentMethod,
        payment_date: paymentDate,
        reference_number: referenceNumber.trim() || undefined,
        idempotency_key: idempotencyKey,
      });

      const payment = paymentRes.data;

      // 2. Allocate to invoice if invoice is present
      if (invoice && payment && payment.id) {
        await allocatePayment(payment.id, {
          allocations: [
            {
              allocatable_type: 'Purchase',
              allocatable_id: invoice.id,
              amount: numAmount,
            },
          ],
        });
      }

      onSuccess();
    } catch (err: any) {
      console.error('Payment failed:', err);
      const msg = err.response?.data?.message || err.message || 'Payment processing failed.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">Make Supplier Payment</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {invoice && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Invoice:</span>
                <span className="font-mono font-bold text-slate-900">{invoice.supplier_invoice_number}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Supplier:</span>
                <span className="font-semibold text-slate-800">{invoice.supplier?.name}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 text-amber-700 font-bold">
                <span>Outstanding Balance:</span>
                <span className="font-mono">{formatCurrency(initialDue)}</span>
              </div>
            </div>
          )}

          {/* Payment Amount */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Payment Amount (৳ Taka) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={initialDue > 0 ? initialDue : undefined}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Payment Method & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white font-medium"
              >
                <option value="CASH">Cash</option>
                <option value="BANK">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="MFS">MFS / bKash / Nagad</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Payment Date</label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Reference / Cheque #</label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. TR-99882 / CQ-1002"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing Payment...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm Payment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
