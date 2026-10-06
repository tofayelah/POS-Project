import React, { useState, useEffect } from 'react';
import {
  Clock,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  FileText,
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  Eye,
  ShieldCheck,
  X,
} from 'lucide-react';
import { posApi, PosSession, PosCashMovement } from '../../api/pos';
import { useLanguage } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';

export const PosShiftManagement: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [shifts, setShifts] = useState<PosSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Detail Modal
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);
  const [shiftReconciliation, setShiftReconciliation] = useState<any | null>(null);
  const [reconLoading, setReconLoading] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approving, setApproving] = useState(false);
  const [approvalSuccess, setApprovalSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadShifts();
  }, [page, statusFilter, fromDate, toDate]);

  const loadShifts = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = { page };
      if (statusFilter) params.status = statusFilter;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;

      const res = await posApi.getShifts(params);
      if (res.success && res.data) {
        setShifts(res.data.data || []);
        setTotalPages(res.data.last_page || 1);
        setTotalCount(res.data.total || 0);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load shift records.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (id: number) => {
    setSelectedShiftId(id);
    setApprovalSuccess(null);
    setApprovalNotes('');
    try {
      setReconLoading(true);
      const res = await posApi.getSessionReconciliation(id);
      if (res.success) {
        setShiftReconciliation(res.data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not fetch shift details.');
    } finally {
      setReconLoading(false);
    }
  };

  const handleApproveVariance = async () => {
    if (!selectedShiftId) return;
    try {
      setApproving(true);
      const res = await posApi.approveShiftVariance(selectedShiftId, approvalNotes.trim() || undefined);
      if (res.success) {
        setApprovalSuccess('Variance approved successfully by supervisor.');
        await handleOpenDetail(selectedShiftId);
        loadShifts();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to approve shift variance.');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            {t('posShift.title') || 'POS Shift & Drawer Management'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Audit cashier registers, physical drawer cash movements, tender reconciliations, and cash variances.
          </p>
        </div>

        <button
          onClick={loadShifts}
          disabled={loading}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center text-xs">
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-600">Filters:</span>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-2.5 py-1.5 border border-slate-300 rounded font-medium focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">OPEN</option>
          <option value="CLOSED">CLOSED</option>
        </select>

        <div className="flex items-center gap-1">
          <span className="text-slate-500">From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            className="px-2 py-1 border border-slate-300 rounded"
          />
        </div>

        <div className="flex items-center gap-1">
          <span className="text-slate-500">To:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            className="px-2 py-1 border border-slate-300 rounded"
          />
        </div>

        {(statusFilter || fromDate || toDate) && (
          <button
            onClick={() => { setStatusFilter(''); setFromDate(''); setToDate(''); setPage(1); }}
            className="text-indigo-600 hover:text-indigo-800 font-semibold"
          >
            Clear Filters
          </button>
        )}

        <div className="ml-auto text-slate-400">
          Showing {shifts.length} of {totalCount} shifts
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Shifts Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4">Session #</th>
                <th className="py-3 px-4">Terminal / Branch</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4">Opened At</th>
                <th className="py-3 px-4 text-right">Opening Float</th>
                <th className="py-3 px-4 text-right">Expected</th>
                <th className="py-3 px-4 text-right">Closing Cash</th>
                <th className="py-3 px-4 text-right">Variance</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shifts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    {loading ? 'Loading shift records...' : 'No POS shifts found matching criteria.'}
                  </td>
                </tr>
              ) : (
                shifts.map((s) => {
                  const variance = Number(s.cash_difference || 0);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {s.session_number}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{s.terminal?.terminal_name || 'Terminal'}</div>
                        <div className="text-[10px] text-slate-500">{s.terminal?.branch?.name || 'Main Branch'}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {s.cashier?.name || 'Cashier'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {s.opened_at ? new Date(s.opened_at).toLocaleString() : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        ৳{Number(s.opening_cash || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {s.expected_cash !== null && s.expected_cash !== undefined ? `৳${Number(s.expected_cash).toFixed(2)}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {s.closing_cash !== null && s.closing_cash !== undefined ? `৳${Number(s.closing_cash).toFixed(2)}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {s.status === 'CLOSED' ? (
                          Math.abs(variance) < 0.0001 ? (
                            <span className="text-emerald-600">৳0.00</span>
                          ) : variance > 0 ? (
                            <span className="text-blue-600">+৳{variance.toFixed(2)}</span>
                          ) : (
                            <span className="text-rose-600">-৳{Math.abs(variance).toFixed(2)}</span>
                          )
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.status === 'OPEN'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenDetail(s.id)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex justify-between items-center text-xs">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-slate-500 font-medium">Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Shift Details Modal */}
      {selectedShiftId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col border border-slate-300 max-h-[90vh]">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h2 className="font-bold text-sm tracking-wide">
                  Shift Z-Report: {shiftReconciliation?.session_info?.session_number || `#${selectedShiftId}`}
                </h2>
              </div>
              <button
                onClick={() => setSelectedShiftId(null)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
              {reconLoading ? (
                <div className="py-8 text-center text-slate-400">Loading reconciliation data...</div>
              ) : shiftReconciliation ? (
                <>
                  {approvalSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>{approvalSuccess}</span>
                    </div>
                  )}

                  {/* Header info */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded border border-slate-200 text-[11px]">
                    <div>
                      <div className="text-slate-500">Terminal:</div>
                      <div className="font-bold text-slate-800">{shiftReconciliation.session_info?.terminal?.name}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Cashier:</div>
                      <div className="font-bold text-slate-800">{shiftReconciliation.session_info?.cashier?.name}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Opened At:</div>
                      <div>{new Date(shiftReconciliation.session_info?.opened_at).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Closed At:</div>
                      <div>{shiftReconciliation.session_info?.closed_at ? new Date(shiftReconciliation.session_info.closed_at).toLocaleString() : 'STILL OPEN'}</div>
                    </div>
                  </div>

                  {/* Cash Flow */}
                  <div className="bg-white p-3 rounded border border-slate-200 space-y-1.5">
                    <div className="font-bold text-slate-900 border-b pb-1">Physical Cash Drawer:</div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Opening Cash Float:</span>
                      <span>৳{Number(shiftReconciliation.cash?.opening_cash || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <span>Cash Sales:</span>
                      <span>+৳{Number(shiftReconciliation.cash?.cash_sales || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-blue-700">
                      <span>Cash In:</span>
                      <span>+৳{Number(shiftReconciliation.cash?.cash_in || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-amber-700">
                      <span>Cash Out:</span>
                      <span>-৳{Number(shiftReconciliation.cash?.cash_out || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-rose-700">
                      <span>Cash Refunds:</span>
                      <span>-৳{Number(shiftReconciliation.cash?.cash_refunds || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-1 border-t text-slate-900">
                      <span>Expected in Till:</span>
                      <span>৳{Number(shiftReconciliation.cash?.expected_cash || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>Actual Counted:</span>
                      <span>৳{Number(shiftReconciliation.cash?.actual_cash || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-1 border-t">
                      <span>Variance:</span>
                      <span className={Number(shiftReconciliation.cash?.variance || 0) < 0 ? 'text-rose-600' : Number(shiftReconciliation.cash?.variance || 0) > 0 ? 'text-blue-600' : 'text-emerald-600'}>
                        ৳{Number(shiftReconciliation.cash?.variance || 0).toFixed(2)} ({shiftReconciliation.cash?.variance_status || 'BALANCED'})
                      </span>
                    </div>
                  </div>

                  {/* Tender Reconciliation */}
                  {shiftReconciliation.non_cash && (
                    <div className="bg-white p-3 rounded border border-slate-200 space-y-1.5">
                      <div className="font-bold text-slate-900 border-b pb-1">Non-Cash Tenders:</div>
                      <div className="flex justify-between text-slate-600">
                        <span>Card Payments:</span>
                        <span>৳{Number(shiftReconciliation.non_cash?.card_total || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>bKash Payments:</span>
                        <span>৳{Number(shiftReconciliation.non_cash?.bkash_total || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Nagad Payments:</span>
                        <span>৳{Number(shiftReconciliation.non_cash?.nagad_total || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-purple-700">
                        <span>Store Credit Payments:</span>
                        <span>৳{Number(shiftReconciliation.non_cash?.store_credit_total || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-indigo-700">
                        <span>Loyalty Points Redeemed:</span>
                        <span>৳{Number(shiftReconciliation.non_cash?.point_redemption_total || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Cash Movements Ledger */}
                  {Array.isArray(shiftReconciliation.cash_movements) && shiftReconciliation.cash_movements.length > 0 && (
                    <div className="bg-white p-3 rounded border border-slate-200 space-y-2">
                      <div className="font-bold text-slate-900 border-b pb-1">Drawer Cash Movements:</div>
                      <div className="space-y-1.5 text-[11px]">
                        {shiftReconciliation.cash_movements.map((m: PosCashMovement) => (
                          <div key={m.id} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                            <div>
                              <span className={`font-bold mr-1.5 ${m.type === 'CASH_IN' ? 'text-emerald-700' : 'text-amber-700'}`}>
                                [{m.type}]
                              </span>
                              <span>{m.reason}</span>
                              {m.reference && <span className="text-slate-400 ml-1">({m.reference})</span>}
                            </div>
                            <span className="font-bold">৳{Number(m.amount).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Supervisor Variance Approval */}
                  {shiftReconciliation.session_info?.variance_status && shiftReconciliation.session_info.variance_status !== 'BALANCED' && (
                    <div className="bg-amber-50 border border-amber-200 p-3.5 rounded space-y-2 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900">
                        <ShieldCheck className="w-4 h-4 text-amber-700" />
                        Supervisor Variance Governance
                      </div>
                      {shiftReconciliation.session_info?.variance_approved_at ? (
                        <div className="text-emerald-800 text-[11px]">
                          ✓ Variance approved by {shiftReconciliation.session_info.variance_approved_by?.name || 'Supervisor'} on {new Date(shiftReconciliation.session_info.variance_approved_at).toLocaleString()}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-amber-800 text-[11px]">
                            This shift ended with a cash discrepancy. An authorized supervisor or administrator must review and approve this variance.
                          </p>
                          <textarea
                            value={approvalNotes}
                            onChange={(e) => setApprovalNotes(e.target.value)}
                            placeholder="Approval notes / supervisor review remarks..."
                            className="w-full p-2 border border-amber-300 rounded text-xs bg-white"
                            rows={2}
                          />
                          <button
                            onClick={handleApproveVariance}
                            disabled={approving}
                            className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded text-xs transition-colors"
                          >
                            {approving ? 'Approving...' : 'Approve Shift Variance'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
