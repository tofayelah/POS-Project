import React, { useState, useEffect } from 'react';
import { 
  Store, Calendar, Download, Printer, Search, Building2, MapPin, CheckCircle2 
} from 'lucide-react';
import { 
  getBoothWisePurchaseReport, 
  BoothWisePurchaseRecord, 
  PurchaseReportFilters,
  exportReportToCsv
} from '../../../api/purchaseReports';
import { PurchaseReportFilterBar } from '../../../components/purchase/reports/PurchaseReportFilterBar';
import { PurchaseReportPrintModal } from '../../../components/purchase/reports/PurchaseReportPrintModal';

export const BoothWisePurchaseReport: React.FC = () => {
  const [filters, setFilters] = useState<PurchaseReportFilters>({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });
  const [data, setData] = useState<BoothWisePurchaseRecord[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getBoothWisePurchaseReport(filters);
      setData(res.data);
      setSummary(res.summary);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate Booth Wise Purchase report.');
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
    getBoothWisePurchaseReport(initial).then((res) => {
      setData(res.data);
      setSummary(res.summary);
    });
  };

  const handleExportExcel = () => {
    const headers = [
      'Booth / Branch Code',
      'Booth / Branch Name',
      'Address',
      'Voucher Count',
      'Supplier Count',
      'Total Quantity',
      'Gross Purchase (BDT)',
      'Discount (BDT)',
      'Tax/VAT (BDT)',
      'Net Purchase Amount (BDT)',
    ];
    const rows = data.map((r) => [
      r.booth_code,
      r.booth_name,
      r.location,
      r.voucher_count,
      r.supplier_count,
      r.total_quantity,
      r.gross_amount,
      r.discount_amount,
      r.tax_amount,
      r.net_amount,
    ]);
    exportReportToCsv(`Booth_Wise_Purchase_${filters.start_date || 'all'}_to_${filters.end_date || 'all'}`, headers, rows);
  };

  const printColumns = [
    { key: 'booth_code', label: 'Booth Code' },
    { key: 'booth_name', label: 'Booth / Branch Name' },
    { key: 'voucher_count', label: 'Vouchers', align: 'right' as const },
    { key: 'supplier_count', label: 'Suppliers', align: 'right' as const },
    { key: 'total_quantity', label: 'Total Qty', align: 'right' as const },
    { key: 'gross_amount', label: 'Gross (৳)', align: 'right' as const },
    { key: 'discount_amount', label: 'Discount (৳)', align: 'right' as const },
    { key: 'tax_amount', label: 'VAT (৳)', align: 'right' as const },
    { key: 'net_amount', label: 'Net Purchase (৳)', align: 'right' as const },
  ];

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
            <span>Purchase & Procurement Reports</span>
            <span>/</span>
            <span>Report #5</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Store className="w-7 h-7 text-indigo-600 shrink-0" />
            Booth Wise Purchase
          </h1>
          <p className="text-xs font-medium text-slate-600 mt-1">
            Comparative purchase spending, voucher volume, and vendor diversification aggregated by Branch / Booth
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
        showWarehouseFilter={false}
        showVoucherSearch={false}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3.5">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Booths Active</span>
          <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
            {summary.total_booths || data.length}
          </span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total Vouchers</span>
          <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
            {(summary.total_vouchers ?? 0).toLocaleString()}
          </span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total Quantity</span>
          <span className="text-xl font-black text-indigo-950 font-mono mt-1 block">
            {(summary.total_quantity ?? 0).toLocaleString()}
          </span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Gross Spend</span>
          <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
            ৳{(summary.total_gross ?? 0).toLocaleString('en-BD')}
          </span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total VAT</span>
          <span className="text-xl font-black text-indigo-700 font-mono mt-1 block">
            ৳{(summary.total_tax ?? 0).toLocaleString('en-BD')}
          </span>
        </div>
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-900 block">Net Spend</span>
          <span className="text-xl font-black text-indigo-950 font-mono mt-1 block">
            ৳{(summary.total_net ?? 0).toLocaleString('en-BD')}
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            Booth & Branch Procurement Comparison
          </h3>
          <div className="text-xs text-slate-500 font-medium">Currency: BDT (৳)</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/75">
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Booth / Branch</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Location / Address</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Voucher Count</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Suppliers</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Total Qty</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Gross Purchase</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Discount</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Tax/VAT</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Net Purchase Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Search className="w-8 h-8 text-slate-400 stroke-1" />
                      <p className="text-sm font-bold text-slate-700">No booth transactions found</p>
                      <p className="text-xs text-slate-500">No purchases mapped to selected branches in this interval</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.booth_code} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3.5">
                      <div className="font-bold text-slate-900">{row.booth_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{row.booth_code}</div>
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-600 max-w-xs truncate">{row.location}</td>
                    <td className="py-2.5 px-3.5 font-mono text-right font-semibold text-indigo-700">{row.voucher_count}</td>
                    <td className="py-2.5 px-3.5 font-mono text-right font-medium text-slate-700">{row.supplier_count}</td>
                    <td className="py-2.5 px-3.5 font-mono text-right font-bold text-slate-900">{row.total_quantity.toLocaleString()}</td>
                    <td className="py-2.5 px-3.5 font-mono text-right text-slate-800">৳{row.gross_amount.toLocaleString('en-BD')}</td>
                    <td className="py-2.5 px-3.5 font-mono text-right text-amber-700">৳{row.discount_amount.toLocaleString('en-BD')}</td>
                    <td className="py-2.5 px-3.5 font-mono text-right text-indigo-700">৳{row.tax_amount.toLocaleString('en-BD')}</td>
                    <td className="py-2.5 px-3.5 font-mono text-right font-black text-slate-950">৳{row.net_amount.toLocaleString('en-BD')}</td>
                  </tr>
                ))
              )}
            </tbody>
            {data.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                  <td colSpan={2} className="py-3 px-3.5 text-slate-900 uppercase font-black tracking-wider text-[11px]">
                    Total Summary ({data.length} Booths / Outlets)
                  </td>
                  <td className="py-3 px-3.5 font-mono text-right font-black text-indigo-950">{summary.total_vouchers}</td>
                  <td className="py-3 px-3.5 font-mono text-right font-bold text-slate-600">-</td>
                  <td className="py-3 px-3.5 font-mono text-right font-black text-slate-950">{summary.total_quantity}</td>
                  <td className="py-3 px-3.5 font-mono text-right font-bold text-slate-900">৳{(summary.total_gross ?? 0).toLocaleString('en-BD')}</td>
                  <td className="py-3 px-3.5 font-mono text-right font-bold text-amber-700">৳{(summary.total_discount ?? 0).toLocaleString('en-BD')}</td>
                  <td className="py-3 px-3.5 font-mono text-right font-bold text-indigo-700">৳{(summary.total_tax ?? 0).toLocaleString('en-BD')}</td>
                  <td className="py-3 px-3.5 font-mono text-right font-black text-indigo-950">৳{(summary.total_net ?? 0).toLocaleString('en-BD')}</td>
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
        title="Booth Wise Purchase Report"
        subtitle="Operational procurement spend comparison across branches and booths"
        dateRangeStr={`${filters.start_date || 'Inception'} to ${filters.end_date || 'Current'}`}
        columns={printColumns}
        data={data}
        summaryFields={[
          { label: 'Total Booths', value: data.length },
          { label: 'Total Vouchers', value: summary.total_vouchers ?? 0 },
          { label: 'Total Quantity', value: summary.total_quantity ?? 0 },
          { label: 'Net Spend (৳)', value: summary.total_net ?? 0 },
        ]}
      />
    </div>
  );
};
