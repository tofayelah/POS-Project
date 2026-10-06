import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Eye,
  Filter,
  DollarSign,
  FileText,
  Package,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import { getMatchExceptions, getPpvSummary } from '../../api/procurement';
import { ThreeWayMatchAudit } from '../../types/procurement';

export const ThreeWayMatchingExceptions: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [audits, setAudits] = useState<ThreeWayMatchAudit[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'EXCEPTION' | 'MATCHED'>('ALL');
  const [selectedAudit, setSelectedAudit] = useState<ThreeWayMatchAudit | null>(null);

  const [ppvSummary, setPpvSummary] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [excRes, ppvRes] = await Promise.all([
        getMatchExceptions(100),
        getPpvSummary(90),
      ]);
      if (excRes && excRes.audits) {
        setAudits(excRes.audits);
      }
      if (ppvRes) {
        setPpvSummary(ppvRes);
      }
    } catch (err) {
      console.error('Failed to load 3-way match exceptions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredAudits = audits.filter((a) => {
    if (filterType === 'EXCEPTION') return a.has_exceptions;
    if (filterType === 'MATCHED') return a.match_status === 'MATCHED';
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-teal-400" />
            {t('procurement.matching.title', 'Three-Way Matching & PPV Exception Inspector')}
          </h1>
          <p className="text-sm text-slate-400">
            {t('procurement.matching.subtitle', 'Continuous reconciliation across Purchase Orders, Goods Receipts, and Invoices with Purchase Price Variance tracking.')}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 uppercase font-semibold">Total Audited Invoices</span>
          <div className="text-2xl font-bold text-slate-100 mt-1">{audits.length}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 uppercase font-semibold">Exceptions Detected</span>
          <div className="text-2xl font-bold text-rose-400 mt-1">
            {audits.filter((a) => a.has_exceptions).length}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 uppercase font-semibold">Net PPV (Last 90 Days)</span>
          <div className="text-2xl font-bold mt-1 text-slate-100 flex items-center gap-2">
            <span className={ppvSummary?.net_ppv > 0 ? 'text-rose-400' : 'text-emerald-400'}>
              ৳{Math.abs(ppvSummary?.net_ppv ?? 0).toLocaleString()}
            </span>
            <span className="text-xs uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
              {ppvSummary?.summary_status ?? 'NEUTRAL'}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-xl">
        <button
          onClick={() => setFilterType('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            filterType === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All Invoices ({audits.length})
        </button>
        <button
          onClick={() => setFilterType('EXCEPTION')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            filterType === 'EXCEPTION' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Exceptions ({audits.filter((a) => a.has_exceptions).length})
        </button>
        <button
          onClick={() => setFilterType('MATCHED')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            filterType === 'MATCHED' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Clean Matched ({audits.filter((a) => a.match_status === 'MATCHED').length})
        </button>
      </div>

      {/* Audits Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950 text-slate-400 text-xs uppercase border-b border-slate-800">
            <tr>
              <th className="p-3.5">Supplier Invoice</th>
              <th className="p-3.5">PO Number</th>
              <th className="p-3.5">Goods Receipt</th>
              <th className="p-3.5">Supplier</th>
              <th className="p-3.5 text-center">Match Status</th>
              <th className="p-3.5 text-center">Exceptions</th>
              <th className="p-3.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredAudits.map((a) => (
              <tr key={a.purchase_id} className="hover:bg-slate-800/40">
                <td className="p-3.5 font-mono font-semibold text-slate-100">
                  {a.supplier_invoice_number}
                </td>
                <td className="p-3.5 font-mono text-slate-300">{a.po_number || 'No PO'}</td>
                <td className="p-3.5 font-mono text-slate-300">{a.receipt_number || 'No GR'}</td>
                <td className="p-3.5 text-slate-400 text-xs">{a.supplier_name}</td>
                <td className="p-3.5 text-center">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    a.match_status === 'MATCHED'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : a.match_status === 'EXCEPTION'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {a.match_status}
                  </span>
                </td>
                <td className="p-3.5 text-center">
                  {a.has_exceptions ? (
                    <span className="text-xs text-rose-400 font-bold bg-rose-950/40 px-2 py-0.5 rounded">
                      {a.exceptions.length} Issues
                    </span>
                  ) : (
                    <span className="text-xs text-emerald-400 font-medium">None</span>
                  )}
                </td>
                <td className="p-3.5 text-center">
                  <button
                    onClick={() => setSelectedAudit(a)}
                    className="p-1.5 hover:bg-slate-800 text-teal-400 rounded transition"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Audit Detail Inspector Modal */}
      {selectedAudit && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-400" />
                  3-Way Match Audit Inspector
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  Invoice: {selectedAudit.supplier_invoice_number} • PO: {selectedAudit.po_number || 'N/A'} • GR: {selectedAudit.receipt_number || 'N/A'}
                </p>
              </div>
              <button onClick={() => setSelectedAudit(null)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Exceptions Alert Box */}
              {selectedAudit.has_exceptions && (
                <div className="p-3.5 bg-rose-950/20 border border-rose-800/40 rounded-xl space-y-2">
                  <h4 className="font-bold text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Detected Reconciliation Exceptions:
                  </h4>
                  <ul className="list-disc list-inside text-rose-300 space-y-1">
                    {selectedAudit.exceptions.map((ex, idx) => (
                      <li key={idx}>
                        <span className="font-semibold font-mono">[{ex.type}]</span> {ex.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Line-by-line comparison */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[11px]">
                    <tr>
                      <th className="p-2.5">Item Variant</th>
                      <th className="p-2.5 text-center">PO Qty</th>
                      <th className="p-2.5 text-center">GR Qty</th>
                      <th className="p-2.5 text-center">Inv Qty</th>
                      <th className="p-2.5 text-right">PO Price</th>
                      <th className="p-2.5 text-right">Inv Price</th>
                      <th className="p-2.5 text-center">Matches</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {selectedAudit.line_matches.map((lm, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="p-2.5 font-mono text-slate-200">Variant #{lm.product_variant_id}</td>
                        <td className="p-2.5 text-center font-mono">{lm.ordered_quantity}</td>
                        <td className="p-2.5 text-center font-mono">{lm.received_quantity}</td>
                        <td className="p-2.5 text-center font-mono font-bold text-slate-100">{lm.invoiced_quantity}</td>
                        <td className="p-2.5 text-right font-mono">৳{lm.po_unit_cost}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-100">৳{lm.invoiced_unit_cost}</td>
                        <td className="p-2.5 text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            lm.quantity_match && lm.price_match
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {lm.quantity_match && lm.price_match ? 'OK' : 'MISMATCH'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
