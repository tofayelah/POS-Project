import React, { useState, useEffect } from 'react';
import { 
  Clock, Calendar, Download, Printer, Search, CheckCircle2, 
  ExternalLink, ArrowRight, AlertTriangle 
} from 'lucide-react';
import { Link } from 'react-router';
import { 
  getPendingApprovalReport, 
  PendingApprovalVoucherRecord, 
  PurchaseReportFilters,
  exportReportToCsv
} from '../../../api/purchaseReports';
import { PurchaseReportFilterBar } from '../../../components/purchase/reports/PurchaseReportFilterBar';
import { PurchaseReportPrintModal } from '../../../components/purchase/reports/PurchaseReportPrintModal';

export const PendingApprovalReport: React.FC = () => {
  const [filters, setFilters] = useState<PurchaseReportFilters>({
    start_date: '',
    end_date: '',
  });
  const [data, setData] = useState<PendingApprovalVoucherRecord[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getPendingApprovalReport(filters);
      setData(res.data);
      setSummary(res.summary);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate Pending Approval report.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleReset = () => {
    const initial = { start_date: '', end_date: '' };
    setFilters(initial);
    getPendingApprovalReport(initial).then((res) => {
      setData(res.data);
      setSummary(res.summary);
    });
  };

  const handleExportExcel = () => {
    const headers = [
      'Creation Date',
      'Voucher / PO Number',
      'Voucher Type',
      'Supplier Name',
      'Branch / Warehouse',
      'Total Amount (BDT)',
      'Created By',
      'Aging (Days)',
      'Current Status',
    ];
    const rows = data.map((r) => [
      r.voucher_date,
      r.voucher_number,
      r.voucher_type,
      r.supplier_name,
      r.branch_warehouse,
      r.total_amount,
      r.created_by,
      r.aging_days,
      r.status,
    ]);
    exportReportToCsv(`Vouchers_Waiting_For_Approval_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  const printColumns = [
    { key: 'voucher_date', label: 'Date' },
    { key: 'voucher_number', label: 'Voucher No' },
    { key: 'voucher_type', label: 'Type' },
    { key: 'supplier_name', label: 'Supplier' },
    { key: 'total_amount', label: 'Amount (৳)', align: 'right' as const },
    { key: 'aging_days', label: 'Aging (Days)', align: 'center' as const },
    { key: 'created_by', label: 'Initiated By' },
    { key: 'status', label: 'Status', align: 'center' as const },
  ];

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">
            <span>Purchase & Procurement Reports</span>
            <span>/</span>
            <span>Report #10</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Clock className="w-7 h-7 text-amber-600 shrink-0" />
            Vouchers Waiting for Approval
          </h1>
          <p className="text-xs font-medium text-slate-600 mt-1">
            Actionable procurement queue tracking pending approval purchase orders and unposted draft vouchers with aging days
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
        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">Total Awaiting Action</span>
          <span className="text-2xl font-black text-amber-950 font-mono mt-1 block">
            {summary.total_pending || data.length}
          </span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Pending Invoices</span>
          <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
            {summary.total_pending_invoices || 0}
          </span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Pending POs</span>
          <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
            {summary.total_pending_orders || 0}
          </span>
        </div>
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-900 block">Committed Pipeline Value</span>
          <span className="text-2xl font-black text-indigo-950 font-mono mt-1 block">
            ৳{(summary.total_pending_value ?? 0).toLocaleString('en-BD')}
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            Pending Approval Queue & Aging Log
          </h3>
          <div className="text-xs text-amber-700 font-bold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Requires Management Review
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/75">
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Initiated Date</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Voucher No</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Voucher Type</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Supplier</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Location</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Amount</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Initiated By</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-center">Aging Days</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-center">Status</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 stroke-1" />
                      <p className="text-sm font-bold text-slate-700">Approval queue clear</p>
                      <p className="text-xs text-slate-500">No vouchers or purchase orders are currently pending approval</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="py-2.5 px-3.5 font-semibold text-slate-800 whitespace-nowrap">{row.voucher_date}</td>
                    <td className="py-2.5 px-3.5 font-mono font-bold text-indigo-700 whitespace-nowrap">{row.voucher_number}</td>
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
                    <td className="py-2.5 px-3.5 text-slate-800 font-medium">{row.created_by}</td>
                    <td className="py-2.5 px-3.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-black font-mono ${
                        row.aging_days > 5
                          ? 'bg-rose-100 text-rose-800'
                          : row.aging_days > 2
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {row.aging_days} {row.aging_days === 1 ? 'day' : 'days'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                        {row.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      <Link
                        to={row.action_route}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 rounded-md transition-colors"
                      >
                        <span>Review</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {data.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                  <td colSpan={5} className="py-3 px-3.5 text-slate-900 uppercase font-black tracking-wider text-[11px]">
                    Total Queue ({data.length} Pending Records)
                  </td>
                  <td className="py-3 px-3.5 font-mono text-right font-black text-indigo-950">
                    ৳{(summary.total_pending_value ?? 0).toLocaleString('en-BD')}
                  </td>
                  <td colSpan={4}></td>
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
        title="Vouchers Waiting for Approval Report"
        subtitle="Operational procurement approval queue with transaction aging"
        dateRangeStr={`${filters.start_date || 'Inception'} to ${filters.end_date || 'Current'}`}
        columns={printColumns}
        data={data}
        summaryFields={[
          { label: 'Pending Total', value: data.length },
          { label: 'Pipeline Spend (৳)', value: summary.total_pending_value ?? 0 },
        ]}
      />
    </div>
  );
};
