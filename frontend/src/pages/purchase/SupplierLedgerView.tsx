import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, Building2, RotateCcw, Plus, Printer, ArrowLeft, 
  Calendar, Search, Filter, ArrowUpRight, CheckCircle2, TrendingDown,
  DollarSign, FileText
} from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router';
import { getSuppliers } from '../../api/suppliers';
import { getPurchases } from '../../api/purchases';
import { getSupplierReturns } from '../../api/supplierReturns';
import { Supplier } from '../../types/supplier';
import { PurchaseInvoice, SupplierReturn } from '../../types/purchase';
import { useCompany } from '../../contexts/CompanyContext';

interface LedgerRow {
  id: string | number;
  date: string;
  reference: string;
  type: 'PURCHASE_INVOICE' | 'SUPPLIER_RETURN' | 'PAYMENT' | 'OPENING';
  description: string;
  debit: number;   // Deductions / Returns / Payments (reduces payable owed)
  credit: number;  // Invoices (increases payable owed)
  runningBalance: number;
}

export const SupplierLedgerView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { company } = useCompany();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | ''>(id ? Number(id) : '');
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [returns, setReturns] = useState<SupplierReturn[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const supRes = await getSuppliers();
        const supList = Array.isArray(supRes.data) ? supRes.data : (supRes.data as any)?.data || [];
        setSuppliers(supList);

        if (!selectedSupplierId && supList.length > 0) {
          setSelectedSupplierId(supList[0].id);
        }

        const invRes = await getPurchases();
        setInvoices(invRes.data || []);

        const retRes = await getSupplierReturns();
        setReturns(retRes.data || []);
      } catch (err) {
        console.error('Failed to load ledger data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const activeSupplier = useMemo(() => {
    return suppliers.find((s) => s.id === Number(selectedSupplierId)) || null;
  }, [suppliers, selectedSupplierId]);

  // Compute ledger entries
  const ledgerEntries = useMemo(() => {
    if (!selectedSupplierId) return [];

    const supInvoices = invoices.filter((inv) => Number(inv.supplier_id) === Number(selectedSupplierId));
    const supReturns = returns.filter((ret) => Number(ret.supplier_id) === Number(selectedSupplierId));

    const rawRows: Array<Omit<LedgerRow, 'runningBalance'>> = [];

    // Invoices add to Credit (increasing payable)
    supInvoices.forEach((inv) => {
      rawRows.push({
        id: `inv-${inv.id}`,
        date: inv.invoice_date || inv.created_at || '2026-10-01',
        reference: inv.invoice_number,
        type: 'PURCHASE_INVOICE',
        description: `Purchase Invoice #${inv.invoice_number} (Ref: ${inv.supplier_invoice_number || 'Direct'})`,
        debit: 0,
        credit: Number(inv.grand_total || inv.total_amount || 0),
      });

      // If invoice was partially or fully paid, record a payment debit
      const paid = Number(inv.paid_amount || 0);
      if (paid > 0) {
        rawRows.push({
          id: `pay-${inv.id}`,
          date: inv.invoice_date || inv.created_at || '2026-10-01',
          reference: `PMT-${inv.invoice_number}`,
          type: 'PAYMENT',
          description: `Payment against Invoice #${inv.invoice_number}`,
          debit: paid,
          credit: 0,
        });
      }
    });

    // Supplier Returns (Debit Notes) add to Debit (decreasing payable)
    // "Settlement & Debit Terms a Supplier Lezer theke Supplier return amount bad jabe"
    supReturns.forEach((ret) => {
      rawRows.push({
        id: `ret-${ret.id}`,
        date: ret.return_date || ret.created_at || '2026-10-12',
        reference: ret.return_number,
        type: 'SUPPLIER_RETURN',
        description: `Supplier Return / Debit Note #${ret.return_number} (Reason: ${ret.return_reason_general || 'Defective'})`,
        debit: Number(ret.grand_total || 0),
        credit: 0,
      });
    });

    // Sort chronologically
    rawRows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance (Credit increases payable, Debit decreases payable)
    let currentBalance = 0;
    const finalRows: LedgerRow[] = [];

    // Check if supplier has opening balance
    if (activeSupplier && Number(activeSupplier.current_balance || 0) > 0 && rawRows.length === 0) {
      finalRows.push({
        id: 'opening',
        date: activeSupplier.created_at?.slice(0, 10) || '2026-10-01',
        reference: 'OB-001',
        type: 'OPENING',
        description: 'Opening Balance (Carried Forward)',
        debit: 0,
        credit: Number(activeSupplier.current_balance || 0),
        runningBalance: Number(activeSupplier.current_balance || 0),
      });
      currentBalance = Number(activeSupplier.current_balance || 0);
    }

    rawRows.forEach((row) => {
      currentBalance = currentBalance + row.credit - row.debit;
      finalRows.push({
        ...row,
        runningBalance: currentBalance,
      });
    });

    return finalRows;
  }, [selectedSupplierId, invoices, returns, activeSupplier]);

  const filteredEntries = useMemo(() => {
    return ledgerEntries.filter((row) => {
      if (startDate && row.date < startDate) return false;
      if (endDate && row.date > endDate) return false;
      if (searchFilter) {
        const s = searchFilter.toLowerCase();
        return (
          row.reference.toLowerCase().includes(s) ||
          row.description.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [ledgerEntries, startDate, endDate, searchFilter]);

  const totalDebits = useMemo(() => {
    return filteredEntries.reduce((sum, r) => sum + r.debit, 0);
  }, [filteredEntries]);

  const totalCredits = useMemo(() => {
    return filteredEntries.reduce((sum, r) => sum + r.credit, 0);
  }, [filteredEntries]);

  const netBalance = useMemo(() => {
    return filteredEntries.length > 0 
      ? filteredEntries[filteredEntries.length - 1].runningBalance 
      : (activeSupplier?.current_balance ?? 0);
  }, [filteredEntries, activeSupplier]);

  const totalReturnsDeducted = useMemo(() => {
    return filteredEntries
      .filter((r) => r.type === 'SUPPLIER_RETURN')
      .reduce((sum, r) => sum + r.debit, 0);
  }, [filteredEntries]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/purchases/suppliers')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            title="Back to Suppliers"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl font-black text-slate-900">
                Supplier General Ledger (সাপ্লায়ার খতিয়ান)
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Authoritative accounts payable ledger: Invoices (+Cr), Payments (-Dr), and Supplier Returns (-Dr Debit Notes)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to={`/purchases/returns/create?supplier_id=${selectedSupplierId}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <RotateCcw className="w-4 h-4" />
            + New Supplier Return
          </Link>

          <Link
            to="/purchases/invoices/create"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            + New Purchase Invoice
          </Link>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition"
          >
            <Printer className="w-4 h-4" />
            Print Ledger
          </button>
        </div>
      </div>

      {/* Supplier Selector & KPI Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Selector Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Select Supplier
          </label>
          <select
            value={selectedSupplierId}
            onChange={(e) => {
              const newId = Number(e.target.value);
              setSelectedSupplierId(newId);
              navigate(`/purchases/suppliers/${newId}/ledger`, { replace: true });
            }}
            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
          >
            {suppliers.map((sup) => (
              <option key={sup.id} value={sup.id}>
                {sup.name} ({sup.supplier_code})
              </option>
            ))}
          </select>

          {activeSupplier && (
            <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-100">
              <p><strong>Contact:</strong> {activeSupplier.contact_person || 'N/A'}</p>
              <p><strong>Phone:</strong> {activeSupplier.mobile || activeSupplier.contact_phone || 'N/A'}</p>
              <p><strong>BIN/Tax:</strong> {activeSupplier.tax_number || 'N/A'}</p>
            </div>
          )}
        </div>

        {/* KPI 1: Net Outstanding Balance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Net Closing Balance (বর্তমান দেনা)
          </span>
          <div className="mt-2">
            <span className={`text-2xl font-black font-mono ${netBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              ৳{Math.abs(netBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="block text-[11px] font-bold mt-1 text-slate-500">
              {netBalance > 0 ? 'Due to Supplier (Payable)' : netBalance < 0 ? 'Supplier Advance (Credit Balance)' : 'Fully Settled (৳0.00)'}
            </span>
          </div>
        </div>

        {/* KPI 2: Total Invoices (Credits) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Invoiced (+Credits)
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-indigo-900">
              ৳{totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="block text-[11px] text-slate-500 mt-1">
              Gross procurement billings
            </span>
          </div>
        </div>

        {/* KPI 3: Supplier Returns (Debit Notes) Deducted */}
        <div className="bg-rose-50/70 p-5 rounded-2xl border border-rose-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-rose-600" />
              Returns Deducted (-Debits)
            </span>
            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full">
              Debit Notes
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-rose-700">
              - ৳{totalReturnsDeducted.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="block text-[11px] text-rose-800 font-medium mt-1">
              Deducted directly from Supplier Ledger
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search reference, voucher, notes..."
              value={searchFilter || ''}
              onChange={(e) => setSearchFilter(e.target.value || '')}
              className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 w-64"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold">From:</span>
            <input
              type="date"
              value={startDate || ''}
              onChange={(e) => setStartDate(e.target.value || '')}
              className="p-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold">To:</span>
            <input
              type="date"
              value={endDate || ''}
              onChange={(e) => setEndDate(e.target.value || '')}
              className="p-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
            />
          </div>
        </div>

        <div className="text-slate-500 font-medium">
          Showing <strong>{filteredEntries.length}</strong> transactions
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Reference / Voucher</th>
                <th className="px-4 py-3.5">Transaction Type</th>
                <th className="px-4 py-3.5">Particulars / Description</th>
                <th className="px-4 py-3.5 text-right text-rose-700">Debit (- বাদ)</th>
                <th className="px-4 py-3.5 text-right text-indigo-900">Credit (+ দেনা)</th>
                <th className="px-4 py-3.5 text-right font-bold">Balance (জের)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No ledger transactions found for this supplier.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((row, index) => (
                  <tr key={`ledger-${row.id ?? index}-${index}`} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-slate-700">
                      {row.date}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {row.reference}
                    </td>
                    <td className="px-4 py-3">
                      {row.type === 'SUPPLIER_RETURN' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">
                          <RotateCcw className="w-3 h-3" /> Supplier Return (Debit Note)
                        </span>
                      ) : row.type === 'PURCHASE_INVOICE' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800">
                          <FileText className="w-3 h-3" /> Purchase Invoice
                        </span>
                      ) : row.type === 'PAYMENT' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Payment Made
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-800">
                          Opening Balance
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                      {row.description}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-rose-700">
                      {row.debit > 0 ? `৳${row.debit.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-indigo-900">
                      {row.credit > 0 ? `৳${row.credit.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-black text-slate-900">
                      ৳{row.runningBalance.toFixed(2)}{' '}
                      <span className="text-[10px] text-slate-500 font-normal">
                        {row.runningBalance >= 0 ? 'Dr' : 'Cr'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredEntries.length > 0 && (
              <tfoot className="bg-slate-100/80 font-bold border-t-2 border-slate-300">
                <tr>
                  <td colSpan={4} className="px-4 py-3.5 text-right uppercase tracking-wider text-slate-700">
                    Totals:
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-black text-rose-700">
                    ৳{totalDebits.toFixed(2)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-black text-indigo-900">
                    ৳{totalCredits.toFixed(2)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-black text-slate-900 text-sm">
                    ৳{netBalance.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
