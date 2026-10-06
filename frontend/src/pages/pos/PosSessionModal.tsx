import React, { useState, useEffect } from 'react';
import {
  Play,
  LogOut,
  X,
  AlertCircle,
  DollarSign,
  Terminal,
  ArrowDownCircle,
  ArrowUpCircle,
  FileText,
  Calculator,
  CheckCircle,
} from 'lucide-react';
import { PosTerminal, PosSession, posApi } from '../../api/pos';
import { useLanguage } from '../../i18n';

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

const BD_DENOMINATIONS = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

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
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'close' | 'cash_in' | 'cash_out' | 'summary'>('close');

  const [terminals, setTerminals] = useState<PosTerminal[]>([]);
  const [selectedTerminalId, setSelectedTerminalId] = useState<number | ''>('');
  const [openingCash, setOpeningCash] = useState<string>('0');
  const [closingCash, setClosingCash] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Cash In / Out Form State
  const [movementAmount, setMovementAmount] = useState<string>('');
  const [movementReason, setMovementReason] = useState<string>('');
  const [movementReference, setMovementReference] = useState<string>('');
  const [movementNotes, setMovementNotes] = useState<string>('');

  // Authoritative Reconciliation Data
  const [reconData, setReconData] = useState<any | null>(null);

  // Denominations Counter State
  const [showDenom, setShowDenom] = useState(false);
  const [denomCounts, setDenomCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMessage(null);
      setNotes('');
      setActiveTab('close');
      setMovementAmount('');
      setMovementReason('');
      setMovementReference('');
      setMovementNotes('');

      if (mode === 'open') {
        loadTerminals();
        setOpeningCash('0');
      } else if (mode === 'close' && currentSession) {
        fetchReconciliation(currentSession.id);
      }
    }
  }, [isOpen, mode, currentSession]);

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
      setError(err?.response?.data?.message || 'Could not fetch POS terminals. Please verify terminal setup.');
      setTerminals([]);
      setSelectedTerminalId('');
    } finally {
      setLoading(false);
    }
  };

  const fetchReconciliation = async (sessionId: number) => {
    try {
      setLoading(true);
      const res = await posApi.getSessionReconciliation(sessionId);
      if (res.success && res.data) {
        setReconData(res.data);
        const exp = res.data.cash?.expected_cash ?? (Number(currentSession?.opening_cash || 0) + cashSalesTotal);
        setClosingCash(exp.toString());
      }
    } catch (err: any) {
      // Fallback to local expected cash
      const exp = Number(currentSession?.opening_cash || 0) + cashSalesTotal;
      setClosingCash(exp.toString());
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
      const res = await posApi.closeSession(
        currentSession.id,
        cash,
        notes,
        Object.keys(denomCounts).length > 0 ? denomCounts : undefined
      );
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

  const handleCashIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession) return;
    const amount = parseFloat(movementAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid positive cash in amount.');
      return;
    }
    if (!movementReason.trim()) {
      setError('Please enter a reason for cash in.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await posApi.cashIn(currentSession.id, {
        amount,
        reason: movementReason.trim(),
        reference: movementReference.trim() || undefined,
        notes: movementNotes.trim() || undefined,
      });
      if (res.success) {
        setSuccessMessage(`Successfully added ৳${amount.toFixed(2)} to drawer.`);
        setMovementAmount('');
        setMovementReason('');
        setMovementReference('');
        setMovementNotes('');
        await fetchReconciliation(currentSession.id);
        setTimeout(() => setActiveTab('close'), 1200);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process cash in.');
    } finally {
      setLoading(false);
    }
  };

  const handleCashOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession) return;
    const amount = parseFloat(movementAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid positive cash out amount.');
      return;
    }
    if (!movementReason.trim()) {
      setError('Please enter a reason for cash out.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await posApi.cashOut(currentSession.id, {
        amount,
        reason: movementReason.trim(),
        reference: movementReference.trim() || undefined,
        notes: movementNotes.trim() || undefined,
      });
      if (res.success) {
        setSuccessMessage(`Successfully deducted ৳${amount.toFixed(2)} from drawer.`);
        setMovementAmount('');
        setMovementReason('');
        setMovementReference('');
        setMovementNotes('');
        await fetchReconciliation(currentSession.id);
        setTimeout(() => setActiveTab('close'), 1200);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process cash out.');
    } finally {
      setLoading(false);
    }
  };

  const updateDenomCount = (d: number, count: number) => {
    const updated = { ...denomCounts, [d]: Math.max(0, count) };
    setDenomCounts(updated);
    let total = 0;
    for (const [k, v] of Object.entries(updated)) {
      total += Number(k) * Number(v);
    }
    setClosingCash(total.toFixed(2));
  };

  if (!isOpen) return null;

  const expectedCash = reconData?.cash?.expected_cash ?? (
    currentSession ? Number(currentSession.opening_cash) + cashSalesTotal : 0
  );
  const countedCash = parseFloat(closingCash) || 0;
  const difference = countedCash - expectedCash;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-slate-300 max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            {mode === 'open' ? (
              <Play className="w-5 h-5 text-emerald-400" />
            ) : (
              <LogOut className="w-5 h-5 text-amber-400" />
            )}
            <h2 className="font-bold text-sm tracking-wide">
              {mode === 'open'
                ? t('posShift.openShift') || 'Open POS Counter Session'
                : t('posShift.title') || 'POS Drawer / Shift Management'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher for Active Session */}
        {mode === 'close' && currentSession && (
          <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
            <button
              onClick={() => { setActiveTab('close'); setError(null); setSuccessMessage(null); }}
              className={`flex-1 py-2.5 px-3 border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'close'
                  ? 'border-rose-600 text-rose-600 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
              {t('posShift.closeShift') || 'Close Shift'}
            </button>
            <button
              onClick={() => { setActiveTab('cash_in'); setError(null); setSuccessMessage(null); }}
              className={`flex-1 py-2.5 px-3 border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'cash_in'
                  ? 'border-emerald-600 text-emerald-600 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownCircle className="w-3.5 h-3.5" />
              {t('posShift.cashIn') || 'Cash In'}
            </button>
            <button
              onClick={() => { setActiveTab('cash_out'); setError(null); setSuccessMessage(null); }}
              className={`flex-1 py-2.5 px-3 border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'cash_out'
                  ? 'border-amber-600 text-amber-600 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpCircle className="w-3.5 h-3.5" />
              {t('posShift.cashOut') || 'Cash Out'}
            </button>
            <button
              onClick={() => { setActiveTab('summary'); setError(null); setSuccessMessage(null); }}
              className={`flex-1 py-2.5 px-3 border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'summary'
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              {t('posShift.tenderSummary') || 'Summary'}
            </button>
          </div>
        )}

        {/* Status Alerts */}
        {error && (
          <div className="mx-5 mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-5 mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="overflow-y-auto flex-1">
          {mode === 'open' ? (
            /* OPEN SESSION FORM */
            <form onSubmit={handleOpenSession} className="p-5 space-y-4 text-xs">
              <div className="bg-blue-50 border border-blue-200 p-3 rounded text-blue-900 text-[11px] leading-relaxed">
                <span className="font-bold">Retail Counter Ready:</span> Opening a session initializes your cash float, unlocks USB barcode scanning, and binds your transactions to this register.
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t('posShift.cashier') || 'Cashier'}
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
                  {t('posShift.terminal') || 'Select POS Terminal'} <span className="text-rose-500">*</span>
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
                  {t('posShift.openingCash') || 'Opening Cash Float (৳)'} <span className="text-rose-500">*</span>
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
                  {t('posShift.notes') || 'Opening Notes (Optional)'}
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
          ) : activeTab === 'cash_in' ? (
            /* CASH IN FORM */
            <form onSubmit={handleCashIn} className="p-5 space-y-4 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded text-emerald-950 text-[11px] leading-relaxed">
                <span className="font-bold">Cash In (Float Addition):</span> Safely record physical cash added to the till from vault or change replenishment.
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t('posShift.amount') || 'Amount (৳)'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded font-mono font-bold text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t('posShift.reason') || 'Reason'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder="e.g. Added change float / Vault transfer"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t('posShift.reference') || 'Reference #'}
                </label>
                <input
                  type="text"
                  value={movementReference}
                  onChange={(e) => setMovementReference(e.target.value)}
                  placeholder="Voucher or Slip #"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('close')}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-xs transition-colors"
                >
                  {loading ? 'Processing...' : 'Confirm Cash In'}
                </button>
              </div>
            </form>
          ) : activeTab === 'cash_out' ? (
            /* CASH OUT FORM */
            <form onSubmit={handleCashOut} className="p-5 space-y-4 text-xs">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded text-amber-950 text-[11px] leading-relaxed">
                <span className="font-bold">Cash Out (Drawer Drop / Expense):</span> Safely record cash removed from the drawer for petty cash expenses or bank drops.
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t('posShift.amount') || 'Amount (৳)'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  placeholder="e.g. 2000"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded font-mono font-bold text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t('posShift.reason') || 'Reason'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder="e.g. Bank deposit / Office tea expense"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t('posShift.reference') || 'Reference #'}
                </label>
                <input
                  type="text"
                  value={movementReference}
                  onChange={(e) => setMovementReference(e.target.value)}
                  placeholder="Receipt or Voucher #"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('close')}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-2 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded shadow-xs transition-colors"
                >
                  {loading ? 'Processing...' : 'Confirm Cash Out'}
                </button>
              </div>
            </form>
          ) : activeTab === 'summary' ? (
            /* SHIFT RECONCILIATION SUMMARY */
            <div className="p-5 space-y-4 text-xs font-mono">
              <div className="bg-slate-900 text-white p-3.5 rounded space-y-1 text-[11px]">
                <div className="flex justify-between font-bold text-emerald-400 text-xs">
                  <span>Shift: {currentSession?.session_number}</span>
                  <span>{currentSession?.status}</span>
                </div>
                <div className="text-slate-300">Terminal: {currentSession?.terminal?.terminal_name || 'Counter'}</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded space-y-1.5">
                <div className="font-bold text-slate-800 border-b border-slate-200 pb-1 mb-1">Physical Cash Movement:</div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Opening Float:</span>
                  <span>৳ {Number(reconData?.cash?.opening_cash || currentSession?.opening_cash || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Cash Sales:</span>
                  <span>+৳ {Number(reconData?.cash?.cash_sales || cashSalesTotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-blue-700">
                  <span>Cash In:</span>
                  <span>+৳ {Number(reconData?.cash?.cash_in || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>Cash Out:</span>
                  <span>-৳ {Number(reconData?.cash?.cash_out || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-700">
                  <span>Cash Refunds:</span>
                  <span>-৳ {Number(reconData?.cash?.cash_refunds || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-900">
                  <span>Expected in Till:</span>
                  <span>৳ {expectedCash.toFixed(2)}</span>
                </div>
              </div>

              {reconData?.non_cash && (
                <div className="bg-slate-50 border border-slate-200 p-3 rounded space-y-1.5">
                  <div className="font-bold text-slate-800 border-b border-slate-200 pb-1 mb-1">Non-Cash Tenders:</div>
                  <div className="flex justify-between text-slate-600">
                    <span>Card Sales:</span>
                    <span>৳ {Number(reconData.non_cash.card_total || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>bKash Sales:</span>
                    <span>৳ {Number(reconData.non_cash.bkash_total || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Nagad Sales:</span>
                    <span>৳ {Number(reconData.non_cash.nagad_total || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-purple-700">
                    <span>Store Credit:</span>
                    <span>৳ {Number(reconData.non_cash.store_credit_total || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-indigo-700">
                    <span>Loyalty Points Value:</span>
                    <span>৳ {Number(reconData.non_cash.point_redemption_total || 0).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('close')}
                className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded"
              >
                Back to Closing
              </button>
            </div>
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
                  <span className="text-slate-500">Cash Sales:</span>
                  <span className="font-semibold text-emerald-700">+৳ {Number(reconData?.cash?.cash_sales || cashSalesTotal).toFixed(2)}</span>
                </div>
                {Number(reconData?.cash?.cash_in || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cash In:</span>
                    <span className="font-semibold text-blue-700">+৳ {Number(reconData.cash.cash_in).toFixed(2)}</span>
                  </div>
                )}
                {Number(reconData?.cash?.cash_out || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cash Out:</span>
                    <span className="font-semibold text-amber-700">-৳ {Number(reconData.cash.cash_out).toFixed(2)}</span>
                  </div>
                )}
                {Number(reconData?.cash?.cash_refunds || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cash Refunds:</span>
                    <span className="font-semibold text-rose-700">-৳ {Number(reconData.cash.cash_refunds).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-xs text-slate-900">
                  <span>{t('posShift.expectedCash') || 'Expected in Till:'}</span>
                  <span>৳ {expectedCash.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-slate-700">
                    {t('posShift.closingCash') || 'Closing Cash Counted (৳)'} <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowDenom(!showDenom)}
                    className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold"
                  >
                    <Calculator className="w-3 h-3" />
                    {showDenom ? 'Hide Denominations' : 'Count Notes'}
                  </button>
                </div>

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

              {/* Denominations counter accordion */}
              {showDenom && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
                  <div className="font-bold text-slate-700 text-[11px]">{t('posShift.denominations') || 'Denomination Counter:'}</div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {BD_DENOMINATIONS.map((denom) => (
                      <div key={denom} className="flex items-center gap-1.5 bg-white p-1.5 border border-slate-200 rounded">
                        <span className="w-12 font-mono font-bold text-slate-700">৳{denom}:</span>
                        <input
                          type="number"
                          min="0"
                          value={denomCounts[denom] || ''}
                          onChange={(e) => updateDenomCount(denom, parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full px-1.5 py-1 text-center font-mono border border-slate-300 rounded text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Difference Badge */}
              <div
                className={`p-2.5 rounded font-mono font-bold text-center text-xs border ${
                  Math.abs(difference) < 0.0001
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : difference > 0
                    ? 'bg-blue-50 text-blue-800 border-blue-300'
                    : 'bg-rose-50 text-rose-800 border-rose-300'
                }`}
              >
                {Math.abs(difference) < 0.0001
                  ? '✓ Cash Balanced (Discrepancy: ৳ 0.00)'
                  : difference > 0
                  ? `+ Cash Excess / Surplus: ৳ ${difference.toFixed(2)}`
                  : `- Cash Shortage: ৳ ${Math.abs(difference).toFixed(2)}`}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t('posShift.notes') || 'Closing Remarks / Shift Notes'}
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
    </div>
  );
};
