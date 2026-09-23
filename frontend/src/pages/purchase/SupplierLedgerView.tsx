import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { 
  FileText, 
  ArrowLeft, 
  Calendar, 
  Printer, 
  RefreshCw, 
  Building2, 
  AlertCircle,
  CreditCard,
  DollarSign
} from 'lucide-react';
import { SupplierLedgerRecord } from '../../types/purchase';
import { getSupplierLedger } from '../../api/purchases';
import { formatCurrency } from '../../utils/currency';

export function SupplierLedgerView() {
  const { id } = useParams<{ id: string }>();
  const [ledger, setLedger] = useState<SupplierLedgerRecord[]>([]);
  const [supplier, setSupplier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadLedger(Number(id));
    }
  }, [id]);

  const loadLedger = async (supId: number) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await getSupplierLedger(supId, {
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setLedger(res.data);
      setSupplier(res.summary?.supplier);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load supplier ledger.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (id) {
      loadLedger(Number(id));
    }
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'BILL':
        return <span className="px-2 py-0.5 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded">BILL (Invoice)</span>;
      case 'PAYMENT':
        return <span className="px-2 py-0.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded">PAYMENT</span>;
      case 'OPENING_BALANCE':
        return <span className="px-2 py-0.5 text-[11px] font-bold text-slate-700 bg-slate-100 rounded">OPENING</span>;
      default:
        return <span className="px-2 py-0.5 text-[11px] text-slate-600 bg-slate-100 rounded">{type}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/purchases/payables"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-purple-600" />
              Supplier Statement & Ledger
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Itemized running balance and transaction timeline for vendor accounts.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Printer className="w-3.5 h-3.5" /> Print Statement
        </button>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Supplier Profile Card */}
      {supplier && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{supplier.name}</h2>
              <span className="font-mono text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200 font-bold">
                {supplier.supplier_code}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Mobile: {supplier.mobile || 'N/A'} &bull; Email: {supplier.email || 'N/A'}
            </p>
          </div>

          <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-right">
            <span className="text-[10px] font-bold uppercase text-purple-600 tracking-wider block">
              Current Running Balance
            </span>
            <span className="text-xl font-bold font-mono text-purple-900">
              {formatCurrency(supplier.balance || 0)}
            </span>
          </div>
        </div>
      )}

      {/* Filter */}
      <form onSubmit={handleFilter} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <span className="font-semibold text-slate-700">Date Range:</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/20"
        />
        <span className="text-slate-400">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/20"
        />
        <button
          type="submit"
          className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold cursor-pointer shadow-xs"
        >
          Filter
        </button>
      </form>

      {/* Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4 text-right">Debit (Paid)</th>
                <th className="py-3 px-4 text-right">Credit (Billed)</th>
                <th className="py-3 px-4 text-right">Balance</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading ledger transactions...</span>
                    </div>
                  </td>
                </tr>
              ) : ledger.length > 0 ? (
                ledger.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-600">{row.transaction_date}</td>
                    <td className="py-3 px-4">{getTransactionBadge(row.transaction_type)}</td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      {row.reference_type ? `${row.reference_type} #${row.reference_id}` : 'Direct'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 font-medium">
                      {Number(row.debit) > 0 ? formatCurrency(row.debit) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-700 font-medium">
                      {Number(row.credit) > 0 ? formatCurrency(row.credit) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-purple-900">
                      {formatCurrency(row.balance_after)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">{row.notes || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No ledger transactions found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
