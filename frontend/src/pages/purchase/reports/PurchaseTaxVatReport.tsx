import React, { useState, useEffect } from 'react';
import { 
  FileCheck2, Download, Printer, Search, RefreshCw, FileSpreadsheet, ArrowRight, ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router';
import { 
  getPurchaseTaxVatReport, 
  PurchaseTaxVatRecord, 
  PurchaseReportFilters,
  exportReportToCsv,
  exportReportToExcel
} from '../../../api/purchaseReports';
import { PurchaseReportFilterBar } from '../../../components/purchase/reports/PurchaseReportFilterBar';
import { PurchaseReportPrintModal } from '../../../components/purchase/reports/PurchaseReportPrintModal';

export const PurchaseTaxVatReport: React.FC = () => {
  const [filters, setFilters] = useState<PurchaseReportFilters>({
    start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });
  const [data, setData] = useState<PurchaseTaxVatRecord[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getPurchaseTaxVatReport(filters);
      setData(res.data);
      setSummary(res.summary);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate Tax/VAT Summary report.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportCsv = () => {
    const headers = ['Date', 'Voucher Number', 'Supplier', 'Taxable Amount (BDT)', 'VAT Rate %', 'VAT Amount (BDT)', 'Net Purchase (BDT)'];
    const rows = data.map((r) => [
      r.date,
      r.voucher_number,
      r.supplier_name,
      r.taxable_amount,
      `${r.tax_rate}%`,
      r.tax_amount,
      r.net_amount,
    ]);
    exportReportToCsv('purchase_tax_vat_summary_report', headers, rows);
  };

  const handleExportExcel = () => {
    const headers = ['Date', 'Voucher Number', 'Supplier', 'Taxable Amount (BDT)', 'VAT Rate %', 'VAT Amount (BDT)', 'Net Purchase (BDT)'];
    const rows = data.map((r) => [
      r.date,
      r.voucher_number,
      r.supplier_name,
      `৳${r.taxable_amount.toLocaleString()}`,
      `${r.tax_rate}%`,
      `৳${r.tax_amount.toLocaleString()}`,
      `৳${r.net_amount.toLocaleString()}`,
    ]);
    exportReportToExcel('purchase_tax_vat_summary', 'Purchase Tax & VAT Summary (Mushak 9.1 Input VAT)', headers, rows);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
            <Link to="/purchases/reports" className="hover:underline">Purchase Reports</Link>
            <span>/</span>
            <span>Purchase Tax & VAT Summary</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileCheck2 className="w-7 h-7 text-indigo-600 shrink-0" />
            Purchase Tax & VAT Summary (Mushak 9.1 Input VAT)
          </h1>
          <p className="text-xs font-medium text-slate-600 mt-1">
            Authoritative input tax register, taxable supply calculations, and VAT rebate ledger for NBR compliance
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
          getPurchaseTaxVatReport(resetF).then((res) => {
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
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tax Invoices</span>
          <div className="text-xl font-black text-slate-900 mt-1">{summary.total_invoices || 0}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Taxable Value</span>
          <div className="text-xl font-black text-slate-900 mt-1">৳{(summary.total_taxable || 0).toLocaleString()}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Total Input VAT Rebate</span>
          <div className="text-xl font-black text-blue-600 mt-1">৳{(summary.total_vat || 0).toLocaleString()}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Total Net Spend</span>
          <div className="text-xl font-black text-indigo-600 mt-1">৳{(summary.total_net || 0).toLocaleString()}</div>
        </div>
      </div>

      {/* Compliance Note */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2.5 text-xs text-blue-800 font-medium">
        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
        <span>
          Compliant with Bangladesh VAT Act 2012 & Mushak 9.1 reporting. Input tax credits reconcile with purchase subledgers.
        </span>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Invoice / Voucher</th>
                <th className="p-3.5">Supplier</th>
                <th className="p-3.5 text-right">Taxable Supply</th>
                <th className="p-3.5 text-right font-bold text-slate-700">VAT Rate</th>
                <th className="p-3.5 text-right font-black text-blue-700">Input VAT (BDT)</th>
                <th className="p-3.5 text-right font-black text-indigo-700">Net Spend (BDT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Calculating input tax subledger...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No tax-applicable purchase vouchers found.
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
                    <td className="p-3.5 text-right font-mono">৳{r.taxable_amount.toLocaleString()}</td>
                    <td className="p-3.5 text-right font-bold text-slate-700">{r.tax_rate}%</td>
                    <td className="p-3.5 text-right font-mono font-black text-blue-700">৳{r.tax_amount.toLocaleString()}</td>
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
        title="Purchase Tax & VAT Summary (Mushak 9.1)"
        dateRange={`${filters.start_date} to ${filters.end_date}`}
        headers={['Date', 'Voucher Number', 'Supplier', 'Taxable Amount', 'VAT Rate', 'VAT Amount', 'Net Amount']}
        rows={data.map((r) => [
          r.date,
          r.voucher_number,
          r.supplier_name,
          `৳${r.taxable_amount.toLocaleString()}`,
          `${r.tax_rate}%`,
          `৳${r.tax_amount.toLocaleString()}`,
          `৳${r.net_amount.toLocaleString()}`,
        ])}
        summaryCards={[
          { label: 'Tax Invoices', value: summary.total_invoices || 0 },
          { label: 'Input VAT Rebate', value: `৳${(summary.total_vat || 0).toLocaleString()}` },
          { label: 'Net Spend', value: `৳${(summary.total_net || 0).toLocaleString()}` },
        ]}
      />
    </div>
  );
};
