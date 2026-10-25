import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, Download, Printer, Search, Phone, Wallet, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { 
  getSupplierWisePurchaseReport, 
  SupplierWisePurchaseRecord, 
  PurchaseReportFilters,
  exportReportToCsv
} from '../../../api/purchaseReports';
import { PurchaseReportFilterBar } from '../../../components/purchase/reports/PurchaseReportFilterBar';
import { PurchaseReportPrintModal } from '../../../components/purchase/reports/PurchaseReportPrintModal';

export const SupplierWisePurchaseReport: React.FC = () => {
  const [filters, setFilters] = useState<PurchaseReportFilters>({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });
  const [data, setData] = useState<SupplierWisePurchaseRecord[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getSupplierWisePurchaseReport(filters);
      setData(res.data);
      setSummary(res.summary);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate Supplier Wise Purchase report.');
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
    getSupplierWisePurchaseReport(initial).then((res) => {
      setData(res.data);
      setSummary(res.summary);
    });
  };

  const handleExportExcel = () => {
    const headers = [
      'Supplier Code',
      'Supplier Name',
      'Contact Mobile',
      'Voucher Count',
      'Total Items / Lines',
      'Total Quantity',
      'Gross Purchase (BDT)',
      'Total Discount (BDT)',
      'Total Tax/VAT (BDT)',
      'Net Purchase (BDT)',
      'Paid Amount (BDT)',
      'Due Balance (BDT)',
    ];
    const rows = data.map((r) => [
      r.supplier_code,
      r.supplier_name,
      r.contact_mobile,
      r.voucher_count,
      r.total_items,
      r.total_quantity,
      r.gross_amount,
      r.discount_amount,
      r.tax_amount,
      r.net_amount,
      r.paid_amount,
      r.due_amount,
    ]);
    exportReportToCsv(`Supplier_Wise_Purchase_${filters.start_date || 'all'}_to_${filters.end_date || 'all'}`, headers, rows);
  };

  const printColumns = [
    { key: 'supplier_code', label: 'Supplier Code' },
    { key: 'supplier_name', label: 'Supplier Name' },
    { key: 'voucher_count', label: 'Vouchers', align: 'right' as const },
    { key: 'total_quantity', label: 'Total Qty', align: 'right' as const },
    { key: 'gross_amount', label: 'Gross (৳)', align: 'right' as const },
    { key: 'discount_amount', label: 'Discount (৳)', align: 'right' as const },
    { key: 'tax_amount', label: 'VAT (৳)', align: 'right' as const },
    { key: 'net_amount', label: 'Net Spend (৳)', align: 'right' as const },
    { key: 'paid_amount', label: 'Paid (৳)', align: 'right' as const },
    { key: 'due_amount', label: 'Due Balance (৳)', align: 'right' as const },
  ];

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
            <span>Purchase & Procurement Reports</span>
            <span>/</span>
            <span>Report #8</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-indigo-600 shrink-0" />
            Supplier Wise Purchase
          </h1>
          <p className="text-xs font-medium text-slate-600 mt-1">
            Supplier procurement volume, spend concentration, settlement tracking, and outstanding payable balances
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
        showBranchFilter={false}
        showWarehouseFilter={false}
        showVoucherSearch={false}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Suppliers</span>
          <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
            {summary.total_suppliers || data.length}
          </span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Vouchers</span>
          <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
            {(summary.total_vouchers ?? 0).toLocaleString()}
          </span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total Qty</span>
          <span className="text-xl font-black text-indigo-950 font-mono mt-1 block">
            {(summary.total_quantity ?? 0).toLocaleString()}
          </span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Gross Purchase</span>
          <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
            ৳{(summary.total_gross ?? 0).toLocaleString('en-BD')}
          </span>
        </div>
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-900 block">Paid Amount</span>
          <span className="text-xl font-black text-emerald-950 font-mono mt-1 block">
            ৳{(summary.total_paid ?? 0).toLocaleString('en-BD')}
          </span>
        </div>
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-900 block">Due Balance</span>
          <span className="text-xl font-black text-rose-950 font-mono mt-1 block">
            ৳{(summary.total_due ?? 0).toLocaleString('en-BD')}
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            Supplier Spending & Settlement Register
          </h3>
          <div className="text-xs text-slate-500 font-medium">Currency: BDT (৳)</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/75">
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Supplier</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Contact</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Vouchers</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Lines</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Total Qty</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Gross Purchase</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Discount</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Tax/VAT</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Net Purchase</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Paid</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Due Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Search className="w-8 h-8 text-slate-400 stroke-1" />
                      <p className="text-sm font-bold text-slate-700">No supplier purchases found</p>
                      <p className="text-xs text-slate-500">No transactions recorded for the selected suppliers</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.supplier_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3.5">
                      <div className="font-bold text-slate-900">{row.supplier_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{row.supplier_code}</div>
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-700">{row.contact_mobile}</td>
                    <td className="py-2.5 px-3.5 font-mono text-right font-semibold text-indigo-700">{row.voucher_count}</td>
                    <td className="py-2.5 px-3.5 font-mono text-right text-slate-600">{row.total_items}</td>
                    <td className="py-2.5 px-3.5 font-mono text-right font-bold text-slate-900">{row.total_quantity.toLocaleString()}</td>
                    <td className="py-2.5 px-3.5 font-mono text-right text-slate-800">৳{row.gross_amount.toLocaleString('en-BD')}</td>
                    <td className="py-2.5 px-3.5 font-mono text-right text-amber-700">৳{row.discount_amount.toLocaleString('en-BD')}</td>
                    <td className="py-2.5 px-3.5 font-mono text-right text-indigo-700">৳{row.tax_amount.toLocaleString('en-BD')}</td>
                    <td className="py-2.5 px-3.5 font-mono text-right font-black text-slate-950">৳{row.net_amount.toLocaleString('en-BD')}</td>
                    <td className="py-2.5 px-3.5 font-mono text-right font-bold text-emerald-700">৳{row.paid_amount.toLocaleString('en-BD')}</td>
                    <td className="py-2.5 px-3.5 font-mono text-right font-black text-rose-700">৳{row.due_amount.toLocaleString('en-BD')}</td>
                  </tr>
                ))
              )}
            </tbody>
            {data.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                  <td colSpan={2} className="py-3 px-3.5 text-slate-900 uppercase font-black tracking-wider text-[11px]">
                    Total Summary ({data.length} Suppliers)
                  </td>
                  <td className="py-3 px-3.5 font-mono text-right font-black text-indigo-950">{summary.total_vouchers}</td>
                  <td></td>
                  <td className="py-3 px-3.5 font-mono text-right font-black text-slate-950">{summary.total_quantity}</td>
                  <td className="py-3 px-3.5 font-mono text-right font-bold text-slate-900">৳{(summary.total_gross ?? 0).toLocaleString('en-BD')}</td>
                  <td></td>
                  <td></td>
                  <td className="py-3 px-3.5 font-mono text-right font-black text-indigo-950">৳{(summary.total_net ?? 0).toLocaleString('en-BD')}</td>
                  <td className="py-3 px-3.5 font-mono text-right font-black text-emerald-800">৳{(summary.total_paid ?? 0).toLocaleString('en-BD')}</td>
                  <td className="py-3 px-3.5 font-mono text-right font-black text-rose-800">৳{(summary.total_due ?? 0).toLocaleString('en-BD')}</td>
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
        title="Supplier Wise Purchase Report"
        subtitle="Consolidated vendor volume, purchase spend, payments, and due balances"
        dateRangeStr={`${filters.start_date || 'Inception'} to ${filters.end_date || 'Current'}`}
        columns={printColumns}
        data={data}
        summaryFields={[
          { label: 'Suppliers', value: data.length },
          { label: 'Total Invoices', value: summary.total_vouchers ?? 0 },
          { label: 'Net Spend (৳)', value: summary.total_net ?? 0 },
          { label: 'Total Due (৳)', value: summary.total_due ?? 0 },
        ]}
      />
    </div>
  );
};
