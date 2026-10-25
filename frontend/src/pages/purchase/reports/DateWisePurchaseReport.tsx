import React, { useState, useEffect } from 'react';
import { 
  FileText, Calendar, Filter, Download, Printer, ArrowUpDown, 
  CheckCircle2, AlertCircle, XCircle, Clock, Search, Layers, RefreshCw
} from 'lucide-react';
import { 
  getDateWisePurchaseReport, 
  DateWisePurchaseRecord, 
  PurchaseReportFilters,
  exportReportToCsv
} from '../../../api/purchaseReports';
import { PurchaseReportFilterBar } from '../../../components/purchase/reports/PurchaseReportFilterBar';
import { PurchaseReportPrintModal } from '../../../components/purchase/reports/PurchaseReportPrintModal';

export const DateWisePurchaseReport: React.FC = () => {
  const [filters, setFilters] = useState<PurchaseReportFilters>({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });
  const [data, setData] = useState<DateWisePurchaseRecord[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getDateWisePurchaseReport(filters);
      setData(res.data);
      setSummary(res.summary);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate Date Wise Purchase report.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleReset = () => {
    const today = new Date().toISOString().split('T')[0];
    const initial = { start_date: today, end_date: today };
    setFilters(initial);
    getDateWisePurchaseReport(initial).then((res) => {
      setData(res.data);
      setSummary(res.summary);
    });
  };

  const handleExportExcel = () => {
    const headers = [
      'Date',
      'Invoice / Voucher No',
      'PO Number',
      'Supplier Code',
      'Supplier Name',
      'Branch',
      'Warehouse',
      'Item Count',
      'Total Qty',
      'Subtotal (BDT)',
      'Discount (BDT)',
      'Tax/VAT (BDT)',
      'Net Purchase Amount (BDT)',
      'Status',
    ];
    const rows = data.map((r) => [
      r.date,
      r.voucher_number,
      r.po_number,
      r.supplier_code,
      r.supplier_name,
      r.branch_name,
      r.warehouse_name,
      r.items_count,
      r.total_quantity,
      r.subtotal,
      r.discount,
      r.tax,
      r.net_amount,
      r.status,
    ]);
    exportReportToCsv(`Date_Wise_Purchase_${filters.start_date || 'all'}_to_${filters.end_date || 'all'}`, headers, rows);
  };

  const printColumns = [
    { key: 'date', label: 'Date' },
    { key: 'voucher_number', label: 'Voucher No' },
    { key: 'po_number', label: 'PO No' },
    { key: 'supplier_name', label: 'Supplier' },
    { key: 'branch_name', label: 'Branch' },
    { key: 'total_quantity', label: 'Total Qty', align: 'right' as const },
    { key: 'subtotal', label: 'Subtotal (৳)', align: 'right' as const },
    { key: 'discount', label: 'Discount (৳)', align: 'right' as const },
    { key: 'tax', label: 'VAT (৳)', align: 'right' as const },
    { key: 'net_amount', label: 'Net Total (৳)', align: 'right' as const },
    { key: 'status', label: 'Status', align: 'center' as const },
  ];

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
            <span>Purchase & Procurement Reports</span>
            <span>/</span>
            <span>Report #1</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-indigo-600 shrink-0" />
            Date Wise Purchase
          </h1>
          <p className="text-xs font-medium text-slate-600 mt-1">
            Chronological transactional log of posted financial purchase invoices and supplier receipts
          </p>
        </div>
      </div>

      {/* Filter Component */}
      <PurchaseReportFilterBar
        filters={filters}
        onChange={setFilters}
        onSearch={loadReport}
        onReset={handleReset}
        onPrintPreview={() => setIsPrintOpen(true)}
        onExportExcel={handleExportExcel}
        isLoading={isLoading}
      />

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center justify-between">
          <span>Error loading report: {error}</span>
          <button type="button" onClick={loadReport} className="underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Vouchers</span>
          <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
            {summary.total_purchases || data.length}
          </span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total Qty</span>
          <span className="text-xl font-black text-indigo-950 font-mono mt-1 block">
            {(summary.total_quantity ?? 0).toLocaleString()}
          </span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Subtotal</span>
          <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
            ৳{(summary.total_subtotal ?? 0).toLocaleString('en-BD')}
          </span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Discount</span>
          <span className="text-xl font-black text-amber-700 font-mono mt-1 block">
            ৳{(summary.total_discount ?? 0).toLocaleString('en-BD')}
          </span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">VAT / Tax</span>
          <span className="text-xl font-black text-indigo-700 font-mono mt-1 block">
            ৳{(summary.total_tax ?? 0).toLocaleString('en-BD')}
          </span>
        </div>
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-900 block">Net Purchase</span>
          <span className="text-xl font-black text-indigo-950 font-mono mt-1 block">
            ৳{(summary.total_gross_purchases ?? 0).toLocaleString('en-BD')}
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Purchase Invoice Register
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-100 text-indigo-800">
              {data.length} records
            </span>
          </div>
          <div className="text-xs text-slate-500 font-medium">Currency: BDT (৳)</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/75">
                <th className="py-3 px-3 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Date</th>
                <th className="py-3 px-3 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Voucher No</th>
                <th className="py-3 px-3 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">PO No</th>
                <th className="py-3 px-3 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Supplier</th>
                <th className="py-3 px-3 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Branch / Depot</th>
                <th className="py-3 px-3 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Items</th>
                <th className="py-3 px-3 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Qty</th>
                <th className="py-3 px-3 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Subtotal</th>
                <th className="py-3 px-3 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Discount</th>
                <th className="py-3 px-3 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Tax/VAT</th>
                <th className="py-3 px-3 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Net Amount</th>
                <th className="py-3 px-3 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Search className="w-8 h-8 text-slate-400 stroke-1" />
                      <p className="text-sm font-bold text-slate-700">No purchase records found</p>
                      <p className="text-xs text-slate-500">Try adjusting your date range or removing filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">{row.date}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-700 whitespace-nowrap">{row.voucher_number}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">{row.po_number}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{row.supplier_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{row.supplier_code}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      <div>{row.branch_name}</div>
                      <div className="text-[10px] text-slate-500">{row.warehouse_name}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right font-medium text-slate-700">{row.items_count}</td>
                    <td className="py-2.5 px-3 font-mono text-right font-bold text-slate-900">{row.total_quantity}</td>
                    <td className="py-2.5 px-3 font-mono text-right text-slate-800">৳{row.subtotal.toLocaleString('en-BD')}</td>
                    <td className="py-2.5 px-3 font-mono text-right text-amber-700">৳{row.discount.toLocaleString('en-BD')}</td>
                    <td className="py-2.5 px-3 font-mono text-right text-indigo-700">৳{row.tax.toLocaleString('en-BD')}</td>
                    <td className="py-2.5 px-3 font-mono text-right font-black text-slate-950">৳{row.net_amount.toLocaleString('en-BD')}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        row.status === 'POSTED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : row.status === 'CANCELLED'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {data.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                  <td colSpan={6} className="py-3 px-3 text-slate-900 uppercase font-black tracking-wider text-[11px]">
                    Total Summary ({data.length} Vouchers)
                  </td>
                  <td className="py-3 px-3 font-mono text-right font-black text-slate-950">{summary.total_quantity}</td>
                  <td className="py-3 px-3 font-mono text-right font-bold text-slate-900">৳{(summary.total_subtotal ?? 0).toLocaleString('en-BD')}</td>
                  <td className="py-3 px-3 font-mono text-right font-bold text-amber-700">৳{(summary.total_discount ?? 0).toLocaleString('en-BD')}</td>
                  <td className="py-3 px-3 font-mono text-right font-bold text-indigo-700">৳{(summary.total_tax ?? 0).toLocaleString('en-BD')}</td>
                  <td className="py-3 px-3 font-mono text-right font-black text-indigo-950">৳{(summary.total_gross_purchases ?? 0).toLocaleString('en-BD')}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Print Modal */}
      <PurchaseReportPrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="Date Wise Purchase Report"
        subtitle="Authoritative log of posted financial purchase invoices"
        dateRangeStr={`${filters.start_date || 'Inception'} to ${filters.end_date || 'Current'}`}
        columns={printColumns}
        data={data}
        summaryFields={[
          { label: 'Total Invoices', value: data.length },
          { label: 'Total Quantity', value: summary.total_quantity ?? 0 },
          { label: 'Total Subtotal', value: summary.total_subtotal ?? 0 },
          { label: 'Net Purchase', value: summary.total_gross_purchases ?? 0 },
        ]}
      />
    </div>
  );
};
