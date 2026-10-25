import React, { useState, useEffect } from 'react';
import { 
  XCircle, Calendar, Download, Printer, Search, ShieldAlert, AlertTriangle, CheckCircle2 
} from 'lucide-react';
import { 
  getCancelledVouchersReport, 
  CancelledVoucherRecord, 
  PurchaseReportFilters,
  exportReportToCsv
} from '../../../api/purchaseReports';
import { PurchaseReportFilterBar } from '../../../components/purchase/reports/PurchaseReportFilterBar';
import { PurchaseReportPrintModal } from '../../../components/purchase/reports/PurchaseReportPrintModal';

export const CancelledVouchersReport: React.FC = () => {
  const [filters, setFilters] = useState<PurchaseReportFilters>({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });
  const [data, setData] = useState<CancelledVoucherRecord[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getCancelledVouchersReport(filters);
      setData(res.data);
      setSummary(res.summary);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate Cancelled Vouchers report.');
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
    getCancelledVouchersReport(initial).then((res) => {
      setData(res.data);
      setSummary(res.summary);
    });
  };

  const handleExportExcel = () => {
    const headers = [
      'Cancellation Date',
      'Voucher / PO Number',
      'Voucher Type',
      'Supplier Name',
      'Branch / Warehouse',
      'Total Amount (BDT)',
      'Cancelled By',
      'Reason / Remarks',
      'Prior Status',
    ];
    const rows = data.map((r) => [
      r.cancellation_date,
      r.voucher_number,
      r.voucher_type,
      r.supplier_name,
      r.branch_warehouse,
      r.total_amount,
      r.cancelled_by,
      r.reason,
      r.prior_status,
    ]);
    exportReportToCsv(`Cancelled_Vouchers_${filters.start_date || 'all'}_to_${filters.end_date || 'all'}`, headers, rows);
  };

  const printColumns = [
    { key: 'cancellation_date', label: 'Date' },
    { key: 'voucher_number', label: 'Voucher / PO No' },
    { key: 'voucher_type', label: 'Type' },
    { key: 'supplier_name', label: 'Supplier' },
    { key: 'total_amount', label: 'Amount (৳)', align: 'right' as const },
    { key: 'cancelled_by', label: 'Cancelled By' },
    { key: 'reason', label: 'Reason / Notes' },
  ];

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-rose-700 uppercase tracking-wider mb-1">
            <span>Purchase & Procurement Reports</span>
            <span>/</span>
            <span>Report #9</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <XCircle className="w-7 h-7 text-rose-600 shrink-0" />
            Vouchers Cancelled
          </h1>
          <p className="text-xs font-medium text-slate-600 mt-1">
            Audit register of revoked purchase orders and voided purchase invoices for compliance and anti-fraud monitoring
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
        showStatusFilter={false}
        showBranchFilter={false}
        showWarehouseFilter={false}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white rounded-xl border border-rose-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 block">Total Cancelled</span>
          <span className="text-2xl font-black text-rose-950 font-mono mt-1 block">
            {summary.total_cancelled || data.length}
          </span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Cancelled Invoices</span>
          <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
            {summary.total_cancelled_invoices || 0}
          </span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Cancelled POs</span>
          <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
            {summary.total_cancelled_orders || 0}
          </span>
        </div>
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-900 block">Value Prevented</span>
          <span className="text-2xl font-black text-rose-950 font-mono mt-1 block">
            ৳{(summary.total_amount_prevented ?? 0).toLocaleString('en-BD')}
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            Cancelled Vouchers Audit Trail
          </h3>
          <div className="text-xs text-rose-700 font-bold flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            Compliance & Discrepancy Log
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/75">
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Cancelled Date</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Voucher / PO Number</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Voucher Type</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Supplier</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Branch / Depot</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Original Amount</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Cancelled By</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Cancellation Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 stroke-1" />
                      <p className="text-sm font-bold text-slate-700">No cancelled vouchers</p>
                      <p className="text-xs text-slate-500">All purchase vouchers are active in this timeframe</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="py-2.5 px-3.5 font-semibold text-slate-800 whitespace-nowrap">{row.cancellation_date}</td>
                    <td className="py-2.5 px-3.5 font-mono font-bold text-rose-700 whitespace-nowrap">{row.voucher_number}</td>
                    <td className="py-2.5 px-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.voucher_type === 'Purchase Invoice'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {row.voucher_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-bold text-slate-900">{row.supplier_name}</td>
                    <td className="py-2.5 px-3.5 text-slate-600">{row.branch_warehouse}</td>
                    <td className="py-2.5 px-3.5 font-mono text-right font-black text-slate-900">৳{row.total_amount.toLocaleString('en-BD')}</td>
                    <td className="py-2.5 px-3.5 text-slate-800 font-medium">{row.cancelled_by}</td>
                    <td className="py-2.5 px-3.5 text-slate-600 max-w-xs truncate">{row.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
            {data.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                  <td colSpan={5} className="py-3 px-3.5 text-slate-900 uppercase font-black tracking-wider text-[11px]">
                    Total Cancelled ({data.length} Records)
                  </td>
                  <td className="py-3 px-3.5 font-mono text-right font-black text-rose-800">
                    ৳{(summary.total_amount_prevented ?? 0).toLocaleString('en-BD')}
                  </td>
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
        title="Vouchers Cancelled Report"
        subtitle="Internal audit register of revoked purchase orders and invoices"
        dateRangeStr={`${filters.start_date || 'Inception'} to ${filters.end_date || 'Current'}`}
        columns={printColumns}
        data={data}
        summaryFields={[
          { label: 'Total Records', value: data.length },
          { label: 'Value Prevented (৳)', value: summary.total_amount_prevented ?? 0 },
        ]}
      />
    </div>
  );
};
