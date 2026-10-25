import React, { useState, useEffect } from 'react';
import { 
  Layers, Download, Printer, Search, RefreshCw, FileSpreadsheet, 
  PieChart as PieIcon, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router';
import { 
  getCategoryWisePurchaseReport, 
  CategoryWisePurchaseRecord, 
  PurchaseReportFilters,
  exportReportToCsv,
  exportReportToExcel
} from '../../../api/purchaseReports';
import { PurchaseReportFilterBar } from '../../../components/purchase/reports/PurchaseReportFilterBar';
import { PurchaseReportPrintModal } from '../../../components/purchase/reports/PurchaseReportPrintModal';

export const CategoryWisePurchaseReport: React.FC = () => {
  const [filters, setFilters] = useState<PurchaseReportFilters>({
    start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });
  const [data, setData] = useState<CategoryWisePurchaseRecord[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getCategoryWisePurchaseReport(filters);
      setData(res.data);
      setSummary(res.summary);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate Category Wise Purchase report.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportCsv = () => {
    const headers = ['Category Name', 'Item Lines', 'Total Quantity', 'Net Spend (BDT)', 'Spend Share %'];
    const rows = data.map((r) => [
      r.category_name,
      r.item_lines,
      r.total_quantity,
      r.net_amount,
      `${r.share_pct}%`,
    ]);
    exportReportToCsv('category_wise_purchase_report', headers, rows);
  };

  const handleExportExcel = () => {
    const headers = ['Category Name', 'Item Lines', 'Total Quantity', 'Net Spend (BDT)', 'Spend Share %'];
    const rows = data.map((r) => [
      r.category_name,
      r.item_lines,
      r.total_quantity,
      `৳${r.net_amount.toLocaleString()}`,
      `${r.share_pct}%`,
    ]);
    exportReportToExcel('category_wise_purchase', 'Category Wise Purchase Report', headers, rows);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
            <Link to="/purchases/reports" className="hover:underline">Purchase Reports</Link>
            <span>/</span>
            <span>Category Wise Purchase</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-indigo-600 shrink-0" />
            Category Wise Purchase Report
          </h1>
          <p className="text-xs font-medium text-slate-600 mt-1">
            Product classification spend breakdown, inventory diversification, and category-level cost allocation
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
          getCategoryWisePurchaseReport(resetF).then((res) => {
            setData(res.data);
            setSummary(res.summary);
          });
        }}
        onExportExcel={handleExportExcel}
        isLoading={isLoading}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Categories</span>
          <div className="text-xl font-black text-slate-900 mt-1">{summary.total_categories || 0}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Purchased Line Items</span>
          <div className="text-xl font-black text-slate-900 mt-1">{summary.total_lines || 0}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Units Purchased</span>
          <div className="text-xl font-black text-slate-900 mt-1">{summary.total_quantity || 0}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Total Category Spend</span>
          <div className="text-xl font-black text-indigo-600 mt-1">৳{(summary.total_net || 0).toLocaleString()}</div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3.5">Category Name</th>
                <th className="p-3.5 text-right">Line Items</th>
                <th className="p-3.5 text-right">Quantity</th>
                <th className="p-3.5 text-right font-black text-indigo-700">Net Spend (BDT)</th>
                <th className="p-3.5 text-right">Spend Share</th>
                <th className="p-3.5">Distribution Bar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Calculating category purchase breakdown...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No category purchase records found.
                  </td>
                </tr>
              ) : (
                data.map((r) => (
                  <tr key={r.category_id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                      <span>{r.category_name}</span>
                    </td>
                    <td className="p-3.5 text-right font-medium">{r.item_lines}</td>
                    <td className="p-3.5 text-right font-medium">{r.total_quantity}</td>
                    <td className="p-3.5 text-right font-black font-mono text-indigo-700">৳{r.net_amount.toLocaleString()}</td>
                    <td className="p-3.5 text-right font-bold text-slate-700">{r.share_pct}%</td>
                    <td className="p-3.5">
                      <div className="w-full bg-slate-100 rounded-full h-2 max-w-[120px] overflow-hidden">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${Math.min(100, r.share_pct)}%` }}
                        ></div>
                      </div>
                    </td>
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
        title="Category Wise Purchase Report"
        dateRange={`${filters.start_date} to ${filters.end_date}`}
        headers={['Category Name', 'Item Lines', 'Total Quantity', 'Net Spend (BDT)', 'Share %']}
        rows={data.map((r) => [
          r.category_name,
          r.item_lines,
          r.total_quantity,
          `৳${r.net_amount.toLocaleString()}`,
          `${r.share_pct}%`,
        ])}
        summaryCards={[
          { label: 'Categories', value: summary.total_categories || 0 },
          { label: 'Total Units', value: summary.total_quantity || 0 },
          { label: 'Total Spend', value: `৳${(summary.total_net || 0).toLocaleString()}` },
        ]}
      />
    </div>
  );
};
