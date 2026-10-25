import React, { useState, useEffect } from 'react';
import { 
  Warehouse, Download, Printer, Search, ArrowRight, RefreshCw, 
  FileSpreadsheet, BarChart3, Building2
} from 'lucide-react';
import { Link } from 'react-router';
import { 
  getWarehouseWisePurchaseReport, 
  WarehouseWisePurchaseRecord, 
  PurchaseReportFilters,
  exportReportToCsv,
  exportReportToExcel
} from '../../../api/purchaseReports';
import { PurchaseReportFilterBar } from '../../../components/purchase/reports/PurchaseReportFilterBar';
import { PurchaseReportPrintModal } from '../../../components/purchase/reports/PurchaseReportPrintModal';

export const WarehouseWisePurchaseReport: React.FC = () => {
  const [filters, setFilters] = useState<PurchaseReportFilters>({
    start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });
  const [data, setData] = useState<WarehouseWisePurchaseRecord[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getWarehouseWisePurchaseReport(filters);
      setData(res.data);
      setSummary(res.summary);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate Warehouse Wise Purchase report.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportCsv = () => {
    const headers = ['Warehouse Code', 'Warehouse Name', 'Invoice Count', 'Total Quantity', 'Gross Amount (BDT)', 'Discount (BDT)', 'Tax/VAT (BDT)', 'Net Purchase (BDT)'];
    const rows = data.map((r) => [
      `'${r.warehouse_code}`,
      r.warehouse_name,
      r.invoice_count,
      r.total_quantity,
      r.gross_amount,
      r.discount_amount,
      r.tax_amount,
      r.net_amount,
    ]);
    exportReportToCsv('warehouse_wise_purchase_report', headers, rows);
  };

  const handleExportExcel = () => {
    const headers = ['Warehouse Code', 'Warehouse Name', 'Invoice Count', 'Total Quantity', 'Gross Amount (BDT)', 'Discount (BDT)', 'Tax/VAT (BDT)', 'Net Purchase (BDT)'];
    const rows = data.map((r) => [
      r.warehouse_code,
      r.warehouse_name,
      r.invoice_count,
      r.total_quantity,
      `৳${r.gross_amount.toLocaleString()}`,
      `৳${r.discount_amount.toLocaleString()}`,
      `৳${r.tax_amount.toLocaleString()}`,
      `৳${r.net_amount.toLocaleString()}`,
    ]);
    exportReportToExcel('warehouse_wise_purchase', 'Warehouse Wise Purchase Report', headers, rows);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
            <Link to="/purchases/reports" className="hover:underline">Purchase Reports</Link>
            <span>/</span>
            <span>Warehouse Wise Purchase</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Warehouse className="w-7 h-7 text-indigo-600 shrink-0" />
            Warehouse Wise Purchase Report
          </h1>
          <p className="text-xs font-medium text-slate-600 mt-1">
            Comparative purchase spending, goods inward distribution, and inventory valuation across warehouses
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
          getWarehouseWisePurchaseReport(resetF).then((res) => {
            setData(res.data);
            setSummary(res.summary);
          });
        }}
        onExportExcel={handleExportExcel}
        isLoading={isLoading}
        showWarehouseFilter={true}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Warehouses</span>
          <div className="text-xl font-black text-slate-900 mt-1">{summary.total_warehouses || 0}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Invoices Processed</span>
          <div className="text-xl font-black text-slate-900 mt-1">{summary.total_invoices || 0}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Quantity</span>
          <div className="text-xl font-black text-slate-900 mt-1">{summary.total_quantity || 0}</div>
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
                <th className="p-3.5">Code</th>
                <th className="p-3.5">Warehouse Name</th>
                <th className="p-3.5 text-right">Invoices</th>
                <th className="p-3.5 text-right">Total Quantity</th>
                <th className="p-3.5 text-right">Gross Amount</th>
                <th className="p-3.5 text-right text-rose-600">Discount</th>
                <th className="p-3.5 text-right text-blue-600">Tax/VAT</th>
                <th className="p-3.5 text-right font-black text-indigo-700">Net Spend (BDT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Aggregating warehouse purchase data...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No warehouse purchase transactions found.
                  </td>
                </tr>
              ) : (
                data.map((r) => (
                  <tr key={r.warehouse_id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 font-bold font-mono text-indigo-600">{r.warehouse_code}</td>
                    <td className="p-3.5 font-bold text-slate-800">{r.warehouse_name}</td>
                    <td className="p-3.5 text-right font-medium">{r.invoice_count}</td>
                    <td className="p-3.5 text-right font-medium">{r.total_quantity}</td>
                    <td className="p-3.5 text-right font-mono">৳{r.gross_amount.toLocaleString()}</td>
                    <td className="p-3.5 text-right font-mono text-rose-600">৳{r.discount_amount.toLocaleString()}</td>
                    <td className="p-3.5 text-right font-mono text-blue-600">৳{r.tax_amount.toLocaleString()}</td>
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
        title="Warehouse Wise Purchase Report"
        dateRange={`${filters.start_date} to ${filters.end_date}`}
        headers={['Code', 'Warehouse Name', 'Invoices', 'Quantity', 'Gross (BDT)', 'Discount', 'VAT', 'Net Spend (BDT)']}
        rows={data.map((r) => [
          r.warehouse_code,
          r.warehouse_name,
          r.invoice_count,
          r.total_quantity,
          `৳${r.gross_amount.toLocaleString()}`,
          `৳${r.discount_amount.toLocaleString()}`,
          `৳${r.tax_amount.toLocaleString()}`,
          `৳${r.net_amount.toLocaleString()}`,
        ])}
        summaryCards={[
          { label: 'Warehouses', value: summary.total_warehouses || 0 },
          { label: 'Total Invoices', value: summary.total_invoices || 0 },
          { label: 'Total Net Spend', value: `৳${(summary.total_net || 0).toLocaleString()}` },
        ]}
      />
    </div>
  );
};
