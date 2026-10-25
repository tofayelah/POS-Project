import React, { useState, useEffect } from 'react';
import { 
  Percent, Download, Printer, Search, RefreshCw, FileSpreadsheet, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router';
import { 
  getPurchaseDiscountAnalysisReport, 
  PurchaseDiscountAnalysisRecord, 
  PurchaseReportFilters,
  exportReportToCsv,
  exportReportToExcel
} from '../../../api/purchaseReports';
import { PurchaseReportFilterBar } from '../../../components/purchase/reports/PurchaseReportFilterBar';
import { PurchaseReportPrintModal } from '../../../components/purchase/reports/PurchaseReportPrintModal';

export const PurchaseDiscountAnalysisReport: React.FC = () => {
  const [filters, setFilters] = useState<PurchaseReportFilters>({
    start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });
  const [data, setData] = useState<PurchaseDiscountAnalysisRecord[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getPurchaseDiscountAnalysisReport(filters);
      setData(res.data);
      setSummary(res.summary);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate Discount Analysis report.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportCsv = () => {
    const headers = ['Date', 'Voucher Number', 'Supplier', 'Subtotal (BDT)', 'Discount (BDT)', 'Discount %', 'Net Amount (BDT)'];
    const rows = data.map((r) => [
      r.date,
      r.voucher_number,
      r.supplier_name,
      r.subtotal,
      r.discount_amount,
      `${r.discount_percent}%`,
      r.net_amount,
    ]);
    exportReportToCsv('purchase_discount_analysis_report', headers, rows);
  };

  const handleExportExcel = () => {
    const headers = ['Date', 'Voucher Number', 'Supplier', 'Subtotal (BDT)', 'Discount (BDT)', 'Discount %', 'Net Amount (BDT)'];
    const rows = data.map((r) => [
      r.date,
      r.voucher_number,
      r.supplier_name,
      `৳${r.subtotal.toLocaleString()}`,
      `৳${r.discount_amount.toLocaleString()}`,
      `${r.discount_percent}%`,
      `৳${r.net_amount.toLocaleString()}`,
    ]);
    exportReportToExcel('purchase_discount_analysis', 'Purchase Discount Analysis Report', headers, rows);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
            <Link to="/purchases/reports" className="hover:underline">Purchase Reports</Link>
            <span>/</span>
            <span>Purchase Discount Analysis</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Percent className="w-7 h-7 text-indigo-600 shrink-0" />
            Purchase Discount Analysis Report
          </h1>
          <p className="text-xs font-medium text-slate-600 mt-1">
            Auditing negotiated supplier trade discounts, promotional rebates, and cost saving percentages
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
          const resetF = {
            start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0],
          };
          setFilters(resetF);
          getPurchaseDiscountAnalysisReport(resetF).then((res) => {
            setData(res.data);
            setSummary(res.summary);
          });
        }}
        onExportExcel={handleExportExcel}
        isLoading={isLoading}
        showSupplierFilter={true}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Discounted Vouchers</span>
          <div className="text-xl font-black text-slate-900 mt-1">{summary.vouchers_with_discount || 0}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Gross Pre-Discount</span>
          <div className="text-xl font-black text-slate-900 mt-1">৳{(summary.total_gross || 0).toLocaleString()}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Total Discounts Saved</span>
          <div className="text-xl font-black text-emerald-600 mt-1">৳{(summary.total_discount || 0).toLocaleString()}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Net Spend</span>
          <div className="text-xl font-black text-indigo-600 mt-1">৳{(summary.total_net || 0).toLocaleString()}</div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Voucher Number</th>
                <th className="p-3.5">Supplier</th>
                <th className="p-3.5 text-right">Subtotal</th>
                <th className="p-3.5 text-right font-black text-emerald-700">Discount Saved</th>
                <th className="p-3.5 text-right font-bold text-slate-700">Discount %</th>
                <th className="p-3.5 text-right font-black text-indigo-700">Net Spend (BDT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Auditing discount records...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No discounted purchase vouchers found.
                  </td>
                </tr>
              ) : (
                data.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 text-slate-600">{r.date}</td>
                    <td className="p-3.5 font-bold font-mono text-indigo-600">
                      <Link to="/purchases" className="hover:underline">{r.voucher_number}</Link>
                    </td>
                    <td className="p-3.5 font-bold text-slate-800">{r.supplier_name}</td>
                    <td className="p-3.5 text-right font-mono">৳{r.subtotal.toLocaleString()}</td>
                    <td className="p-3.5 text-right font-mono font-black text-emerald-700">৳{r.discount_amount.toLocaleString()}</td>
                    <td className="p-3.5 text-right font-bold text-emerald-800">{r.discount_percent}%</td>
                    <td className="p-3.5 text-right font-black font-mono text-indigo-700">৳{r.net_amount.toLocaleString()}</td>
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
        title="Purchase Discount Analysis Report"
        dateRange={`${filters.start_date} to ${filters.end_date}`}
        headers={['Date', 'Voucher Number', 'Supplier', 'Subtotal', 'Discount', 'Discount %', 'Net Spend']}
        rows={data.map((r) => [
          r.date,
          r.voucher_number,
          r.supplier_name,
          `৳${r.subtotal.toLocaleString()}`,
          `৳${r.discount_amount.toLocaleString()}`,
          `${r.discount_percent}%`,
          `৳${r.net_amount.toLocaleString()}`,
        ])}
        summaryCards={[
          { label: 'Discounted Vouchers', value: summary.vouchers_with_discount || 0 },
          { label: 'Discounts Saved', value: `৳${(summary.total_discount || 0).toLocaleString()}` },
          { label: 'Total Net Spend', value: `৳${(summary.total_net || 0).toLocaleString()}` },
        ]}
      />
    </div>
  );
};
