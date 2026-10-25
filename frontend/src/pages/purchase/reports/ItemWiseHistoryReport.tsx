import React, { useState, useEffect } from 'react';
import { 
  History, Calendar, Download, Printer, Search, ArrowUpDown, Layers, CheckCircle2 
} from 'lucide-react';
import { 
  getItemWiseHistoryReport, 
  ItemWiseHistoryRecord, 
  PurchaseReportFilters,
  exportReportToCsv
} from '../../../api/purchaseReports';
import { PurchaseReportFilterBar } from '../../../components/purchase/reports/PurchaseReportFilterBar';
import { PurchaseReportPrintModal } from '../../../components/purchase/reports/PurchaseReportPrintModal';

export const ItemWiseHistoryReport: React.FC = () => {
  const [filters, setFilters] = useState<PurchaseReportFilters>({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });
  const [data, setData] = useState<ItemWiseHistoryRecord[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getItemWiseHistoryReport(filters);
      setData(res.data);
      setSummary(res.summary);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate Item Wise Purchase History report.');
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
    getItemWiseHistoryReport(initial).then((res) => {
      setData(res.data);
      setSummary(res.summary);
    });
  };

  const handleExportExcel = () => {
    const headers = [
      'Transaction Date',
      'Voucher / Invoice No',
      'PO Number',
      'SKU',
      'Product Name',
      'Supplier',
      'Branch',
      'Warehouse',
      'Unit',
      'Quantity',
      'Unit Cost (BDT)',
      'Discount (BDT)',
      'Tax/VAT (BDT)',
      'Net Amount (BDT)',
      'Status',
    ];
    const rows = data.map((r) => [
      r.date,
      r.voucher_number,
      r.po_number,
      r.sku,
      r.product_name,
      r.supplier_name,
      r.branch_name,
      r.warehouse_name,
      r.unit,
      r.quantity,
      r.unit_cost,
      r.discount,
      r.tax,
      r.net_amount,
      r.status,
    ]);
    exportReportToCsv(`Item_Wise_Purchase_History_${filters.start_date || 'all'}_to_${filters.end_date || 'all'}`, headers, rows);
  };

  const printColumns = [
    { key: 'date', label: 'Date' },
    { key: 'voucher_number', label: 'Voucher No' },
    { key: 'sku', label: 'SKU' },
    { key: 'product_name', label: 'Product Name' },
    { key: 'supplier_name', label: 'Supplier' },
    { key: 'quantity', label: 'Qty', align: 'right' as const },
    { key: 'unit_cost', label: 'Unit Cost', align: 'right' as const },
    { key: 'net_amount', label: 'Line Net (৳)', align: 'right' as const },
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
            <span>Report #7</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <History className="w-7 h-7 text-indigo-600 shrink-0" />
            Item Wise Purchase History
          </h1>
          <p className="text-xs font-medium text-slate-600 mt-1">
            Chronological audit trail detailing every line-item transaction, unit rate, and supplier receipt over time
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3.5">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Transactions</span>
          <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
            {summary.total_transactions || data.length}
          </span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total Qty</span>
          <span className="text-xl font-black text-indigo-950 font-mono mt-1 block">
            {(summary.total_quantity ?? 0).toLocaleString()}
          </span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total Discount</span>
          <span className="text-xl font-black text-amber-700 font-mono mt-1 block">
            ৳{(summary.total_discount ?? 0).toLocaleString('en-BD')}
          </span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total VAT / Tax</span>
          <span className="text-xl font-black text-indigo-700 font-mono mt-1 block">
            ৳{(summary.total_tax ?? 0).toLocaleString('en-BD')}
          </span>
        </div>
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-900 block">Cumulative Net</span>
          <span className="text-xl font-black text-indigo-950 font-mono mt-1 block">
            ৳{(summary.total_net ?? 0).toLocaleString('en-BD')}
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            Chronological Item Ledger
          </h3>
          <div className="text-xs text-slate-500 font-medium">Currency: BDT (৳)</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/75">
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Date</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Voucher No</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">PO No</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Item Details</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Supplier</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Branch / Depot</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Qty</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Unit Cost</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Discount</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Tax/VAT</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Net Amount</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Search className="w-8 h-8 text-slate-400 stroke-1" />
                      <p className="text-sm font-bold text-slate-700">No item transaction history found</p>
                      <p className="text-xs text-slate-500">No matching purchase records in this timeframe</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3.5 font-semibold text-slate-800 whitespace-nowrap">{row.date}</td>
                    <td className="py-2.5 px-3.5 font-mono font-bold text-indigo-700 whitespace-nowrap">{row.voucher_number}</td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-600 whitespace-nowrap">{row.po_number}</td>
                    <td className="py-2.5 px-3.5">
                      <div className="font-bold text-slate-900">{row.product_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">SKU: {row.sku}</div>
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-800 font-medium">{row.supplier_name}</td>
                    <td className="py-2.5 px-3.5 text-slate-700">
                      <div>{row.branch_name}</div>
                      <div className="text-[10px] text-slate-500">{row.warehouse_name}</div>
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-right font-black text-slate-950">{row.quantity} {row.unit}</td>
                    <td className="py-2.5 px-3.5 font-mono text-right text-slate-700">৳{row.unit_cost.toLocaleString('en-BD')}</td>
                    <td className="py-2.5 px-3.5 font-mono text-right text-amber-700">৳{row.discount.toLocaleString('en-BD')}</td>
                    <td className="py-2.5 px-3.5 font-mono text-right text-indigo-700">৳{row.tax.toLocaleString('en-BD')}</td>
                    <td className="py-2.5 px-3.5 font-mono text-right font-black text-slate-950">৳{row.net_amount.toLocaleString('en-BD')}</td>
                    <td className="py-2.5 px-3.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        row.status === 'POSTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
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
                  <td colSpan={6} className="py-3 px-3.5 text-slate-900 uppercase font-black tracking-wider text-[11px]">
                    Total Summary ({data.length} Transactions)
                  </td>
                  <td className="py-3 px-3.5 font-mono text-right font-black text-slate-950">{summary.total_quantity}</td>
                  <td></td>
                  <td className="py-3 px-3.5 font-mono text-right font-bold text-amber-700">৳{(summary.total_discount ?? 0).toLocaleString('en-BD')}</td>
                  <td className="py-3 px-3.5 font-mono text-right font-bold text-indigo-700">৳{(summary.total_tax ?? 0).toLocaleString('en-BD')}</td>
                  <td className="py-3 px-3.5 font-mono text-right font-black text-indigo-950">৳{(summary.total_net ?? 0).toLocaleString('en-BD')}</td>
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
        title="Item Wise Purchase History Report"
        subtitle="Chronological audit log of item receipts, unit costs, and transaction dates"
        dateRangeStr={`${filters.start_date || 'Inception'} to ${filters.end_date || 'Current'}`}
        columns={printColumns}
        data={data}
        summaryFields={[
          { label: 'Transactions', value: data.length },
          { label: 'Total Quantity', value: summary.total_quantity ?? 0 },
          { label: 'Total Net (৳)', value: summary.total_net ?? 0 },
        ]}
      />
    </div>
  );
};
