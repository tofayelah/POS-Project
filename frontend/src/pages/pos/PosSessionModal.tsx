import React, { useState, useEffect } from 'react';
import { Play, LogOut, X, AlertCircle, DollarSign, Terminal } from 'lucide-react';
import { PosTerminal, PosSession, posApi } from '../../api/pos';

interface PosSessionModalProps {
  isOpen: boolean;
  mode: 'open' | 'close';
  onClose: () => void;
  currentSession: PosSession | null;
  onSessionOpened: (session: PosSession) => void;
  onSessionClosed: (session: PosSession) => void;
  cashierName?: string;
  cashSalesTotal?: number;
}

export const PosSessionModal: React.FC<PosSessionModalProps> = ({
  isOpen,
  mode,
  onClose,
  currentSession,
  onSessionOpened,
  onSessionClosed,
  cashierName = 'Cashier',
  cashSalesTotal = 0,
}) => {
  const [terminals, setTerminals] = useState<PosTerminal[]>([]);
  const [selectedTerminalId, setSelectedTerminalId] = useState<number | ''>('');
  const [openingCash, setOpeningCash] = useState<string>('0');
  const [closingCash, setClosingCash] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setNotes('');
      if (mode === 'open') {
        loadTerminals();
        setOpeningCash('0');
      } else if (mode === 'close' && currentSession) {
        const expected = Number(currentSession.opening_cash) + cashSalesTotal;
        setClosingCash(expected.toString());
      }
    }
  }, [isOpen, mode, currentSession, cashSalesTotal]);

  const loadTerminals = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await posApi.getTerminals({ status: 'ACTIVE' });
      if (res.success && res.data) {
        const activeTerminals = res.data.filter((t) => t.status === 'ACTIVE');
        setTerminals(activeTerminals);
        if (activeTerminals.length > 0) {
          setSelectedTerminalId(activeTerminals[0].id);
        } else {
          setSelectedTerminalId('');
        }
      } else {
        setTerminals([]);
        setSelectedTerminalId('');
      }
    } catch (err: any) {
      console.error('Failed to load terminals', err);
      setError(err?.response?.data?.message || 'Could not fetch POS terminals. Please verify terminal setup.');
      setTerminals([]);
      setSelectedTerminalId('');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTerminalId) {
      setError('Please select a POS Terminal');
      return;
    }
    const cash = parseFloat(openingCash);
    if (isNaN(cash) || cash < 0) {
      setError('Please enter a valid opening cash amount (>= 0)');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await posApi.openSession(Number(selectedTerminalId), cash, notes);
      if (res.success && res.data) {
        onSessionOpened(res.data);
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to open POS session');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession) return;

    const cash = parseFloat(closingCash);
    if (isNaN(cash) || cash < 0) {
      setError('Please enter a valid closing cash amount');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await posApi.closeSession(currentSession.id, cash, notes);
      if (res.success && res.data) {
        onSessionClosed(res.data);
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to close POS session');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const expectedCash = currentSession
    ? Number(currentSession.opening_cash) + cashSalesTotal
    : 0;
  const countedCash = parseFloat(closingCash) || 0;
  const difference = countedCash - expectedCash;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden flex flex-col border border-slate-300">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            {mode === 'open' ? (
              <Play className="w-5 h-5 text-emerald-400" />
            ) : (
              <LogOut className="w-5 h-5 text-amber-400" />
            )}
            <h2 className="font-bold text-sm tracking-wide">
              {mode === 'open' ? 'Open POS Counter Session' : 'Close POS Session & Cash Out'}
            </h2>
          </div>
          {mode === 'close' && (
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {mode === 'open' ? (
          /* OPEN SESSION FORM */
          <form onSubmit={handleOpenSession} className="p-5 space-y-4 text-xs">
            <div className="bg-blue-50 border border-blue-200 p-3 rounded text-blue-900 text-[11px] leading-relaxed">
              <span className="font-bold">Retail Counter Ready:</span> Opening a session initializes your cash float, unlocks USB barcode scanning, and binds your transactions to this register.
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Cashier
              </label>
              <input
                type="text"
                disabled
                value={cashierName}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded font-semibold text-slate-700"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Select POS Terminal <span className="text-rose-500">*</span>
              </label>
              {terminals.length === 0 && !loading ? (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>No active POS terminal available. Please contact an administrator.</span>
                </div>
              ) : (
                <div className="relative">
                  <Terminal className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    required
                    value={selectedTerminalId}
                    onChange={(e) => setSelectedTerminalId(Number(e.target.value))}
                    disabled={loading || terminals.length === 0}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded font-medium focus:ring-2 focus:ring-emerald-500 text-xs disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="" disabled>-- Select Terminal --</option>
                    {terminals.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.terminal_name} — {t.terminal_code}{t.branch?.name ? ` (${t.branch.name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Opening Cash Float (৳) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded font-mono font-bold text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Starting cash in till (change float)</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Opening Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Shift notes or opening drawer remarks..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || terminals.length === 0 || !selectedTerminalId}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                {loading ? 'Opening Session...' : 'Start POS Session & Begin Selling'}
              </button>
            </div>
          </form>
        ) : (
          /* CLOSE SESSION FORM */
          <form onSubmit={handleCloseSession} className="p-5 space-y-4 text-xs">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Session Number:</span>
                <span className="font-bold text-slate-900">{currentSession?.session_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Opening Float:</span>
                <span className="font-semibold">৳ {Number(currentSession?.opening_cash || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cash Sales (Live):</span>
                <span className="font-semibold text-emerald-700">+৳ {cashSalesTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-xs text-slate-900">
                <span>Expected in Till:</span>
                <span>৳ {expectedCash.toFixed(2)}</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Closing Cash Counted (৳) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded font-mono font-bold text-base focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Difference Badge */}
            <div
              className={`p-2.5 rounded font-mono font-bold text-center text-xs border ${
                difference === 0
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : difference > 0
                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}
            >
              {difference === 0
                ? '✓ Cash Balanced (Difference: ৳ 0.00)'
                : difference > 0
                ? `+ Cash Excess / Surplus: ৳ ${difference.toFixed(2)}`
                : `- Cash Shortage: ৳ ${Math.abs(difference).toFixed(2)}`}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Closing Remarks / Shift Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Reason for discrepancy or end-of-day summary..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-2 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded shadow-xs transition-colors"
              >
                {loading ? 'Closing Session...' : 'Confirm & Close Register'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
