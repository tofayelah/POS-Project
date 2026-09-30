import React, { useState, useEffect } from 'react';
import {
  Pause,
  X,
  Play,
  Trash2,
  Clock,
  User,
  ShoppingBag,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { posApi, PosHeldSale, CartItem } from '../../api/pos';

interface PosHoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: number;
  currentCart: CartItem[];
  currentGrandTotal: number;
  onHoldCurrentCart: () => Promise<boolean>;
  onResumeSale: (heldSale: PosHeldSale, action: 'replace' | 'hold_and_replace') => Promise<void>;
  onCountUpdate?: (count: number) => void;
}

export const PosHoldModal: React.FC<PosHoldModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  currentCart,
  currentGrandTotal,
  onHoldCurrentCart,
  onResumeSale,
  onCountUpdate,
}) => {
  const [heldSales, setHeldSales] = useState<PosHeldSale[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [isHoldingCurrent, setIsHoldingCurrent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Overwrite confirmation dialog state
  const [pendingResumeSale, setPendingResumeSale] = useState<PosHeldSale | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadHeldSales();
    } else {
      setPendingResumeSale(null);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, sessionId]);

  const loadHeldSales = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await posApi.getHeldSales(sessionId);
      if (res.success && Array.isArray(res.data)) {
        setHeldSales(res.data);
        onCountUpdate?.(res.data.length);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to fetch held invoices.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleHoldCurrent = async () => {
    if (currentCart.length === 0) return;
    try {
      setIsHoldingCurrent(true);
      setErrorMessage(null);
      const ok = await onHoldCurrentCart();
      if (ok) {
        setSuccessMessage('Current sale successfully held.');
        await loadHeldSales();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to hold current cart.');
    } finally {
      setIsHoldingCurrent(false);
    }
  };

  const handleResumeClick = (heldSale: PosHeldSale) => {
    if (currentCart.length > 0) {
      // Prompt user with active cart overwrite protection
      setPendingResumeSale(heldSale);
    } else {
      // Resume directly
      executeResume(heldSale, 'replace');
    }
  };

  const executeResume = async (heldSale: PosHeldSale, action: 'replace' | 'hold_and_replace') => {
    try {
      setActionLoadingId(heldSale.id);
      setErrorMessage(null);
      await onResumeSale(heldSale, action);
      setPendingResumeSale(null);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resume held invoice.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDiscard = async (id: number, invoiceNum: string) => {
    if (!window.confirm(`Discard held invoice ${invoiceNum}? This cannot be undone.`)) {
      return;
    }
    try {
      setActionLoadingId(id);
      setErrorMessage(null);
      await posApi.deleteHeldSale(id);
      setSuccessMessage(`Invoice ${invoiceNum} discarded.`);
      await loadHeldSales();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to discard held sale.');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-md">
              <Pause className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-tight">Held & Suspended Invoices</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {heldSales.length} Held
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Suspend active customer transactions and resume at any time without stock or GL side effects
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadHeldSales}
              disabled={isLoading}
              title="Refresh list"
              className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action & Feedback Subheader */}
        <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600 font-medium">
            {currentCart.length > 0 ? (
              <span className="flex items-center gap-1.5 text-slate-800 font-semibold">
                <ShoppingBag className="w-4 h-4 text-blue-600" />
                Active cart has {currentCart.length} item(s) (Total: ৳{currentGrandTotal.toFixed(2)})
              </span>
            ) : (
              <span className="text-slate-500">Active cart is empty</span>
            )}
          </div>

          <button
            onClick={handleHoldCurrent}
            disabled={currentCart.length === 0 || isHoldingCurrent}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-300 disabled:text-slate-500 text-white text-xs font-bold rounded-md flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Pause className="w-3.5 h-3.5" />
            {isHoldingCurrent ? 'Holding Cart...' : 'Hold Current Cart (F6)'}
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="mx-5 mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-md text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-5 mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Active Cart Overwrite Prompt Dialog */}
        {pendingResumeSale && (
          <div className="m-5 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-sm text-amber-900">
                  Active Cart Contains {currentCart.length} Item(s)
                </h4>
                <p className="text-xs text-amber-800 mt-1">
                  Loading held invoice <strong>{pendingResumeSale.invoice_number}</strong> will overwrite the items currently in the cart.
                  How would you like to proceed?
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => executeResume(pendingResumeSale, 'hold_and_replace')}
                    disabled={actionLoadingId === pendingResumeSale.id}
                    className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold rounded shadow-xs"
                  >
                    Hold Current & Load This
                  </button>
                  <button
                    onClick={() => executeResume(pendingResumeSale, 'replace')}
                    disabled={actionLoadingId === pendingResumeSale.id}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded shadow-xs"
                  >
                    Discard Current & Load
                  </button>
                  <button
                    onClick={() => setPendingResumeSale(null)}
                    disabled={actionLoadingId === pendingResumeSale.id}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Held Invoices List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {isLoading && heldSales.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
              Loading held invoices...
            </div>
          ) : heldSales.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="font-bold text-slate-700 text-sm">No Held Invoices</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                When a customer needs to pause their checkout, press <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-300 text-slate-800 font-bold">F6</kbd> to hold the cart and serve the next customer.
              </p>
            </div>
          ) : (
            heldSales.map((held) => {
              const itemCount = held.items?.length || 0;
              const totalQuantity = held.items?.reduce((s, i) => s + Number(i.quantity), 0) || 0;
              const formattedDate = held.created_at
                ? new Date(held.created_at).toLocaleString([], {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })
                : held.sale_date;

              return (
                <div
                  key={held.id}
                  className="bg-white border border-slate-300 rounded-lg p-3.5 hover:border-blue-400 transition-colors shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  {/* Left: Invoice Info & Customer */}
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {held.invoice_number}
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {formattedDate}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs pt-0.5">
                      <span className="flex items-center gap-1 text-slate-700 font-medium">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {held.customer ? held.customer.name : 'Walk-in Customer'}
                        {held.customer?.mobile && (
                          <span className="text-slate-400 font-mono text-[11px]">({held.customer.mobile})</span>
                        )}
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-600">
                        {itemCount} item(s) • Qty: <strong>{totalQuantity.toFixed(0)}</strong>
                      </span>
                    </div>

                    {/* Preview of first 3 item names */}
                    {held.items && held.items.length > 0 && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                        {held.items
                          .map((i) => `${i.product_name_snapshot || 'Item'} (x${Number(i.quantity)})`)
                          .join(', ')}
                      </p>
                    )}

                    {held.notes && (
                      <p className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded inline-block">
                        Note: {held.notes}
                      </p>
                    )}
                  </div>

                  {/* Right: Grand Total & Action Buttons */}
                  <div className="flex items-center gap-4 justify-between md:justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Total</span>
                      <span className="font-mono font-extrabold text-base text-slate-900">
                        ৳ {Number(held.grand_total || 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleResumeClick(held)}
                        disabled={actionLoadingId === held.id}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-md flex items-center gap-1 transition-colors shadow-xs"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        {actionLoadingId === held.id ? 'Loading...' : 'Resume'}
                      </button>
                      <button
                        onClick={() => handleDiscard(held.id, held.invoice_number)}
                        disabled={actionLoadingId === held.id}
                        title="Discard held invoice"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>Press <kbd className="font-mono bg-white px-1 py-0.5 rounded border border-slate-300 font-bold">Esc</kbd> to close</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
