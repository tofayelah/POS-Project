import React, { useState, useEffect } from 'react';
import { 
  Scale, Download, Printer, Search, RefreshCw, FileSpreadsheet, 
  ArrowRight, ShieldCheck, CheckCircle2, HelpCircle, Layers
} from 'lucide-react';
import { Link } from 'react-router';
import { 
  getPurchaseReconciliationReport, 
  PurchaseReconciliationData, 
  PurchaseReportFilters,
  exportReportToCsv,
  exportReportToExcel
} from '../../../api/purchaseReports';
import { PurchaseReportFilterBar } from '../../../components/purchase/reports/PurchaseReportFilterBar';
import { PurchaseReportPrintModal } from '../../../components/purchase/reports/PurchaseReportPrintModal';

export const PurchaseReconciliationReport: React.FC = () => {
  const [filters, setFilters] = useState<PurchaseReportFilters>({});
  const [data, setData] = useState<PurchaseReconciliationData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getPurchaseReconciliationReport(filters);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate Purchase Reconciliation report.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportCsv = () => {
    if (!data) return;
    const headers = ['Reconciliation Dimension', 'Amount / Value (BDT)', 'Description'];
    const rows = [
      ['Purchase Order Commitments', `৳${data.po_commitments.toLocaleString()}`, 'Total legally approved purchase orders'],
      ['Goods Receipt Inward Value', `৳${data.grn_received_value.toLocaleString()}`, 'Physical deliveries inspected and received into warehouse'],
      ['Posted Purchase Invoices', `৳${data.invoiced_posted_value.toLocaleString()}`, 'Authoritative AP financial invoices booked in GL'],
      ['Paid to Suppliers', `৳${data.paid_to_suppliers.toLocaleString()}`, 'Cash and bank disbursements made against invoices'],
      ['Accounts Payable Due Balance', `৳${data.ap_due_balance.toLocaleString()}`, 'Outstanding vendor credit balance awaiting settlement'],
      ['Uninvoiced Goods Receipts Value', `৳${data.uninvoiced_receipts_value.toLocaleString()}`, 'Physical inventory received without supplier bill'],
      ['Reconciliation Variance', `৳${data.variance.toLocaleString()}`, 'Open PO fulfillment balance in progress'],
    ];
    exportReportToCsv('purchase_reconciliation_3way_matching', headers, rows);
  };

  const recon = data || {
    po_commitments: 0,
    grn_received_value: 0,
    invoiced_posted_value: 0,
    paid_to_suppliers: 0,
    ap_due_balance: 0,
    uninvoiced_receipts_value: 0,
    variance: 0,
    status: 'CALCULATING',
    reconciliation_notes: [],
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
            <Link to="/purchases/reports" className="hover:underline">Purchase Reports</Link>
            <span>/</span>
            <span>3-Way Purchase Reconciliation</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Scale className="w-7 h-7 text-indigo-600 shrink-0" />
            3-Way Purchase Reconciliation Report
          </h1>
          <p className="text-xs font-medium text-slate-600 mt-1">
            End-to-end reconciliation connecting Purchase Orders (POs) ➔ Goods Receipts (GRNs) ➔ Posted Invoices ➔ AP Ledger
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPrintOpen(true)}
            disabled={!data}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Preview
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!data}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 shadow-2xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Export Reconciliation
          </button>
        </div>
      </div>

      {/* 3-Way Reconciliation Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pillar 1: PO Commitments */}
        <div className="p-5 bg-white rounded-2xl border-2 border-indigo-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                Pillar 1: Orders
              </span>
              <span className="text-xs font-bold text-slate-400">Step 1</span>
            </div>
            <h3 className="text-sm font-black text-slate-900">Purchase Order Commitments</h3>
            <p className="text-xs text-slate-500 mt-1">Total legally contracted orders placed with approved vendors.</p>
            <div className="text-2xl font-black text-indigo-950 mt-4">
              ৳{recon.po_commitments.toLocaleString()}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
            <Link to="/purchases/reports/ordered-vouchers" className="hover:underline flex items-center gap-1">
              Inspect PO Register <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Pillar 2: GRN Deliveries */}
        <div className="p-5 bg-white rounded-2xl border-2 border-emerald-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                Pillar 2: Goods Receipts
              </span>
              <span className="text-xs font-bold text-slate-400">Step 2</span>
            </div>
            <h3 className="text-sm font-black text-slate-900">Physical Inward Received Value</h3>
            <p className="text-xs text-slate-500 mt-1">Warehouse inspected stock received against contracted PO unit prices.</p>
            <div className="text-2xl font-black text-emerald-950 mt-4">
              ৳{recon.grn_received_value.toLocaleString()}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
            <Link to="/purchases/reports/received-vouchers" className="hover:underline flex items-center gap-1">
              Inspect GRN Receipts <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Pillar 3: Financial Invoices */}
        <div className="p-5 bg-white rounded-2xl border-2 border-purple-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md">
                Pillar 3: Invoices & AP
              </span>
              <span className="text-xs font-bold text-slate-400">Step 3</span>
            </div>
            <h3 className="text-sm font-black text-slate-900">Posted Financial Invoices</h3>
            <p className="text-xs text-slate-500 mt-1">Authoritative Accounts Payable liability recognized in general ledger.</p>
            <div className="text-2xl font-black text-purple-950 mt-4">
              ৳{recon.invoiced_posted_value.toLocaleString()}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-700">
            <Link to="/purchases/reports/date-wise" className="hover:underline flex items-center gap-1">
              Inspect Invoice Detail <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Settlement & AP Subledger Reconciliation Breakdown */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
          Accounts Payable & Cash Settlement Audit
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Settled Cash / Bank</span>
            <div className="text-lg font-black text-slate-900 mt-1">৳{recon.paid_to_suppliers.toLocaleString()}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Disbursements posted</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-amber-700 uppercase">Outstanding Vendor AP</span>
            <div className="text-lg font-black text-amber-700 mt-1">৳{recon.ap_due_balance.toLocaleString()}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Unsettled vendor credit</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-indigo-700 uppercase">Uninvoiced GRN Value</span>
            <div className="text-lg font-black text-indigo-700 mt-1">৳{recon.uninvoiced_receipts_value.toLocaleString()}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Goods received awaiting bill</span>
          </div>
        </div>
      </div>

      {/* Explanatory Variance Audit Notes */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
            Reconciliation Notes & Legitimacy Explanations
          </h4>
        </div>
        <ul className="space-y-2 text-xs text-slate-600">
          {(recon.reconciliation_notes || []).map((note, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0"></span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Print Modal */}
      <PurchaseReportPrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="3-Way Purchase Reconciliation Report"
        dateRange="Cumulative Procurement Reconciliation"
        headers={['Dimension', 'Amount (BDT)', 'Operational Meaning']}
        rows={[
          ['Purchase Orders (POs)', `৳${recon.po_commitments.toLocaleString()}`, 'Approved legally binding order commitments'],
          ['Goods Receipts (GRNs)', `৳${recon.grn_received_value.toLocaleString()}`, 'Physical inventory inspected and booked in depot'],
          ['Posted Purchase Invoices', `৳${recon.invoiced_posted_value.toLocaleString()}`, 'Authoritative AP general ledger liability'],
          ['Supplier Disbursements', `৳${recon.paid_to_suppliers.toLocaleString()}`, 'Cleared payment settlements'],
          ['Accounts Payable Due', `৳${recon.ap_due_balance.toLocaleString()}`, 'Active supplier liability balance'],
        ]}
        summaryCards={[
          { label: 'PO Commitments', value: `৳${recon.po_commitments.toLocaleString()}` },
          { label: 'GRN Inward', value: `৳${recon.grn_received_value.toLocaleString()}` },
          { label: 'Invoiced AP', value: `৳${recon.invoiced_posted_value.toLocaleString()}` },
        ]}
      />
    </div>
  );
};
