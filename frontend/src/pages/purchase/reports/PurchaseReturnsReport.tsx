import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, Download, Printer, Search, RefreshCw, FileSpreadsheet, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router';
import { 
  getPurchaseReturnsReport, 
  PurchaseReturnRecord, 
  PurchaseReportFilters,
  exportReportToCsv,
  exportReportToExcel
} from '../../../api/purchaseReports';
import { PurchaseReportFilterBar } from '../../../components/purchase/reports/PurchaseReportFilterBar';
import { PurchaseReportPrintModal } from '../../../components/purchase/reports/PurchaseReportPrintModal';

export const PurchaseReturnsReport: React.FC = () => {
  const [filters, setFilters] = useState<PurchaseReportFilters>({});
  const [data, setData] = useState<PurchaseReturnRecord[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getPurchaseReturnsReport(filters);
      setData(res.data);
      setSummary(res.summary);
    } catch (err: any) {
      setError(err?.message || 'Failed to load purchase returns.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportCsv = () => {
    const headers = ['Return Number', 'Date', 'Supplier', 'Invoice Number', 'Warehouse', 'Returned Qty', 'Debit Total (BDT)', 'Status', 'Reason'];
    const rows = data.map((r) => [
      r.return_number,
      r.return_date,
      r.supplier_name,
      r.invoice_number,
      r.warehouse_name,
      r.total_qty,
      r.grand_total,
      r.status,
      r.reason,
    ]);
    exportReportToCsv('purchase_returns_debit_notes_report', headers, rows);
  };

  const handleExportExcel = () => {
    const headers = ['Return Number', 'Date', 'Supplier', 'Invoice Number', 'Warehouse', 'Returned Qty', 'Debit Total (BDT)', 'Status', 'Reason'];
    const rows = data.map((r) => [
      r.return_number,
      r.return_date,
      r.supplier_name,
      r.invoice_number,
      r.warehouse_name,
      r.total_qty,
      `৳${r.grand_total.toLocaleString()}`,
      r.status,
      r.reason,
    ]);
    exportReportToExcel('purchase_returns_debit_notes', 'Purchase Returns & Debit Notes Report', headers, rows);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
            <Link to="/purchases/reports" className="hover:underline">Purchase Reports</Link>
            <span>/</span>
            <span>Purchase Returns & Debit Notes</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <RotateCcw className="w-7 h-7 text-indigo-600 shrink-0" />
            Purchase Returns & Debit Notes Report
          </h1>
          <p className="text-xs font-medium text-slate-600 mt-1">
            Returned supplier merchandise, damaged batch adjustments, and issued debit notes reducing accounts payable
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPrintOpen(true)}
            disabled={data.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Preview
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={data.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 shadow-2xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Excel Export
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <PurchaseReportFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onSearch={loadData}
        onReset={() => {
          setFilters({});
          getPurchaseReturnsReport({}).then((res) => {
            setData(res.data);
            setSummary(res.summary);
          });
        }}
        onExportExcel={handleExportExcel}
        isLoading={isLoading}
        showSupplierFilter={true}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Returns</span>
          <div className="text-xl font-black text-slate-900 mt-1">{summary.total_returns || 0}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Units Returned</span>
          <div className="text-xl font-black text-slate-900 mt-1">{summary.total_qty_returned || 0}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Total Debit Note Adjustments</span>
          <div className="text-xl font-black text-rose-600 mt-1">৳{(summary.total_debit_amount || 0).toLocaleString()}</div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3.5">Return #</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Supplier</th>
                <th className="p-3.5">Invoice Ref</th>
                <th className="p-3.5">Warehouse</th>
                <th className="p-3.5 text-right">Qty</th>
                <th className="p-3.5 text-right font-black text-rose-700">Debit Total (BDT)</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading supplier returns ledger...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No purchase return or debit note transactions found.
                  </td>
                </tr>
              ) : (
                data.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 font-bold font-mono text-indigo-600">
                      <Link to="/purchases/returns" className="hover:underline">{r.return_number}</Link>
                    </td>
                    <td className="p-3.5 text-slate-600">{r.return_date}</td>
                    <td className="p-3.5 font-bold text-slate-800">{r.supplier_name}</td>
                    <td className="p-3.5 font-mono text-slate-600">{r.invoice_number}</td>
                    <td className="p-3.5 text-slate-700">{r.warehouse_name}</td>
                    <td className="p-3.5 text-right font-medium">{r.total_qty}</td>
                    <td className="p-3.5 text-right font-black font-mono text-rose-700">৳{r.grand_total.toLocaleString()}</td>
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600">{r.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Modal */}
      <PurchaseReportPrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="Purchase Returns & Debit Notes Report"
        dateRange="Supplier Return Adjustments"
        headers={['Return #', 'Date', 'Supplier', 'Invoice Ref', 'Warehouse', 'Qty', 'Debit Total', 'Status', 'Reason']}
        rows={data.map((r) => [
          r.return_number,
          r.return_date,
          r.supplier_name,
          r.invoice_number,
          r.warehouse_name,
          r.total_qty,
          `৳${r.grand_total.toLocaleString()}`,
          r.status,
          r.reason,
        ])}
        summaryCards={[
          { label: 'Returns', value: summary.total_returns || 0 },
          { label: 'Total Units', value: summary.total_qty_returned || 0 },
          { label: 'Debit Total', value: `৳${(summary.total_debit_amount || 0).toLocaleString()}` },
        ]}
      />
    </div>
  );
};
