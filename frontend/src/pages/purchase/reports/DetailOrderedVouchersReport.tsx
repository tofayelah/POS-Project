import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Calendar, Download, Printer, Search, ArrowRight, CheckCircle2 
} from 'lucide-react';
import { 
  getDetailOrderedVouchersReport, 
  DetailOrderedVoucherRecord, 
  PurchaseReportFilters,
  exportReportToCsv
} from '../../../api/purchaseReports';
import { PurchaseReportFilterBar } from '../../../components/purchase/reports/PurchaseReportFilterBar';
import { PurchaseReportPrintModal } from '../../../components/purchase/reports/PurchaseReportPrintModal';

export const DetailOrderedVouchersReport: React.FC = () => {
  const [filters, setFilters] = useState<PurchaseReportFilters>({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });
  const [data, setData] = useState<DetailOrderedVoucherRecord[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getDetailOrderedVouchersReport(filters);
      setData(res.data);
      setSummary(res.summary);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate Detail Buy Voucher (Ordered) report.');
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
    getDetailOrderedVouchersReport(initial).then((res) => {
      setData(res.data);
      setSummary(res.summary);
    });
  };

  const handleExportExcel = () => {
    const headers = [
      'PO Date',
      'PO Number',
      'Supplier Code',
      'Supplier Name',
      'SKU',
      'Barcode',
      'Product Name',
      'Unit',
      'Ordered Qty',
      'Received Qty',
      'Outstanding Qty',
      'Unit Cost (BDT)',
      'Line Discount',
      'Tax/VAT',
      'Line Total (BDT)',
      'Order Total (BDT)',
      'Expected Delivery Date',
      'Status',
    ];
    const rows = data.map((r) => [
      r.po_date,
      r.po_number,
      r.supplier_code,
      r.supplier_name,
      r.sku,
      r.barcode,
      r.product_name,
      r.unit,
      r.ordered_quantity,
      r.received_quantity,
      r.outstanding_quantity,
      r.unit_cost,
      r.discount,
      r.tax,
      r.line_total,
      r.order_total,
      r.expected_delivery_date,
      r.status,
    ]);
    exportReportToCsv(`Detail_Buy_Voucher_Ordered_${filters.start_date || 'all'}_to_${filters.end_date || 'all'}`, headers, rows);
  };

  const printColumns = [
    { key: 'po_date', label: 'Order Date' },
    { key: 'po_number', label: 'PO No' },
    { key: 'supplier_name', label: 'Supplier' },
    { key: 'sku', label: 'SKU' },
    { key: 'product_name', label: 'Item Description' },
    { key: 'ordered_quantity', label: 'Ordered', align: 'right' as const },
    { key: 'received_quantity', label: 'Received', align: 'right' as const },
    { key: 'outstanding_quantity', label: 'Outstanding', align: 'right' as const },
    { key: 'unit_cost', label: 'Unit Cost', align: 'right' as const },
    { key: 'line_total', label: 'Line Total (৳)', align: 'right' as const },
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
            <span>Report #4</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="w-7 h-7 text-indigo-600 shrink-0" />
            Detail Buy Voucher (Ordered)
          </h1>
          <p className="text-xs font-medium text-slate-600 mt-1">
            Authoritative purchase orders register auditing commitment volumes, delivered stock, and outstanding quantities
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Orders</span>
          <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
            {summary.total_pos || 0}
          </span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Order Lines</span>
          <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
            {data.length}
          </span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Ordered Qty</span>
          <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
            {(summary.total_ordered_qty ?? 0).toLocaleString()}
          </span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">Fulfilled Qty</span>
          <span className="text-xl font-black text-emerald-800 font-mono mt-1 block">
            {(summary.total_received_qty ?? 0).toLocaleString()}
          </span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block">Outstanding Qty</span>
          <span className="text-xl font-black text-amber-800 font-mono mt-1 block">
            {(summary.total_outstanding_qty ?? 0).toLocaleString()}
          </span>
        </div>
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-900 block">Commitment Value</span>
          <span className="text-xl font-black text-indigo-950 font-mono mt-1 block">
            ৳{(summary.total_order_value ?? 0).toLocaleString('en-BD')}
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            Purchase Order Commitments & Fulfillment Register
          </h3>
          <div className="text-xs text-slate-500 font-medium">Currency: BDT (৳)</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/75">
                <th className="py-3 px-3 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">PO Date</th>
                <th className="py-3 px-3 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">PO Number</th>
                <th className="py-3 px-3 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Supplier</th>
                <th className="py-3 px-3 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Item Details</th>
                <th className="py-3 px-3 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Ordered</th>
                <th className="py-3 px-3 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Received</th>
                <th className="py-3 px-3 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Outstanding</th>
                <th className="py-3 px-3 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Unit Cost</th>
                <th className="py-3 px-3 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Line Total</th>
                <th className="py-3 px-3 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Exp. Delivery</th>
                <th className="py-3 px-3 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Search className="w-8 h-8 text-slate-400 stroke-1" />
                      <p className="text-sm font-bold text-slate-700">No purchase order lines found</p>
                      <p className="text-xs text-slate-500">Adjust date range or vendor filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">{row.po_date}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-700 whitespace-nowrap">{row.po_number}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{row.supplier_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{row.supplier_code}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{row.product_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        SKU: {row.sku} ({row.unit})
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right font-bold text-slate-900">{row.ordered_quantity}</td>
                    <td className="py-2.5 px-3 font-mono text-right font-medium text-emerald-700">{row.received_quantity}</td>
                    <td className="py-2.5 px-3 font-mono text-right font-black text-amber-700 bg-amber-50/40">
                      {row.outstanding_quantity}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right text-slate-700">৳{row.unit_cost.toLocaleString('en-BD')}</td>
                    <td className="py-2.5 px-3 font-mono text-right font-black text-slate-950">৳{row.line_total.toLocaleString('en-BD')}</td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{row.expected_delivery_date}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        row.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : row.status === 'CANCELLED'
                          ? 'bg-rose-100 text-rose-800'
                          : row.status === 'APPROVED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
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
                  <td colSpan={4} className="py-3 px-3 text-slate-900 uppercase font-black tracking-wider text-[11px]">
                    Total Summary ({data.length} PO Lines)
                  </td>
                  <td className="py-3 px-3 font-mono text-right font-black text-slate-950">{summary.total_ordered_qty}</td>
                  <td className="py-3 px-3 font-mono text-right font-black text-emerald-800">{summary.total_received_qty}</td>
                  <td className="py-3 px-3 font-mono text-right font-black text-amber-800">{summary.total_outstanding_qty}</td>
                  <td></td>
                  <td className="py-3 px-3 font-mono text-right font-black text-indigo-950">৳{(summary.total_order_value ?? 0).toLocaleString('en-BD')}</td>
                  <td colSpan={2}></td>
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
        title="Detail Buy Voucher (Ordered) Report"
        subtitle="Purchase orders register with ordered, delivered, and outstanding balances"
        dateRangeStr={`${filters.start_date || 'Inception'} to ${filters.end_date || 'Current'}`}
        columns={printColumns}
        data={data}
        summaryFields={[
          { label: 'Lines', value: data.length },
          { label: 'Ordered Qty', value: summary.total_ordered_qty ?? 0 },
          { label: 'Fulfilled Qty', value: summary.total_received_qty ?? 0 },
          { label: 'Outstanding Qty', value: summary.total_outstanding_qty ?? 0 },
        ]}
      />
    </div>
  );
};
