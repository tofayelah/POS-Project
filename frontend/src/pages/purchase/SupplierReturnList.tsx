import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, Plus, Search, RefreshCw, Eye, AlertCircle, CheckCircle, Clock, 
  Printer, Trash2, Edit3, Filter, FileText, ArrowUpRight, DollarSign, Building2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { getSupplierReturns, deleteSupplierReturn } from '../../api/supplierReturns';
import { SupplierReturn } from '../../types/purchase';
import { useCompany } from '../../contexts/CompanyContext';
import { SupplierReturnPrintModal } from '../../components/purchase/SupplierReturnPrintModal';

export const SupplierReturnList: React.FC = () => {
  const navigate = useNavigate();
  const { company: activeCompany } = useCompany();

  const [returns, setReturns] = useState<SupplierReturn[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Print modal state
  const [selectedPrintReturn, setSelectedPrintReturn] = useState<SupplierReturn | null>(null);

  useEffect(() => {
    fetchReturns();
  }, [searchTerm, statusFilter]);

  const fetchReturns = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getSupplierReturns({
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setReturns(res.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load supplier returns.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number | string, returnNo: string) => {
    if (!window.confirm(`Are you sure you want to delete return voucher ${returnNo}?`)) {
      return;
    }
    try {
      await deleteSupplierReturn(id);
      fetchReturns();
    } catch (err: any) {
      alert(`Failed to delete return: ${err?.message || ''}`);
    }
  };

  // KPIs
  const totalReturnVolume = returns.reduce((sum, r) => sum + Number(r.grand_total || 0), 0);
  const postedCount = returns.filter((r) => r.status === 'POSTED').length;
  const draftCount = returns.filter((r) => r.status === 'DRAFT').length;
  const totalPayableAdjusted = returns
    .filter((r) => r.settlement_type === 'PAYABLE_ADJUSTMENT' && r.status === 'POSTED')
    .reduce((sum, r) => sum + Number(r.grand_total || 0), 0);

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800">
              Procurement & Purchase
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Debit Notes Register</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5 mt-1">
            <RotateCcw className="w-7 h-7 text-rose-600 shrink-0" />
            Supplier Returns (Purchase Returns)
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-0.5">
            Manage goods returned to vendors, issue debit notes, and adjust accounts payable
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/purchases/returns/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Supplier Return
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Return Volume
          </span>
          <p className="text-2xl font-bold text-slate-900 font-mono">
            ৳{totalReturnVolume.toFixed(2)}
          </p>
          <p className="text-[11px] text-slate-500">{returns.length} return records</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Payables Deducted (Debit Notes)
          </span>
          <p className="text-2xl font-bold text-emerald-700 font-mono">
            ৳{totalPayableAdjusted.toFixed(2)}
          </p>
          <p className="text-[11px] text-slate-500">Credited to vendor ledgers</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Posted Returns
          </span>
          <p className="text-2xl font-bold text-slate-900 font-mono">{postedCount} Posted</p>
          <p className="text-[11px] text-slate-500">Inventory updated</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
            Draft Returns
          </span>
          <p className="text-2xl font-bold text-amber-700 font-mono">{draftCount} Drafts</p>
          <p className="text-[11px] text-slate-500">Pending final inspection</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search return #, supplier name, purchase bill ref, or challan #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="POSTED">Posted Only</option>
            <option value="DRAFT">Drafts Only</option>
          </select>

          <button
            onClick={fetchReturns}
            className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-slate-700 cursor-pointer"
            title="Refresh returns"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4">Return # / Date</th>
                <th className="py-3.5 px-4">Supplier</th>
                <th className="py-3.5 px-4">Purchase Bill Ref</th>
                <th className="py-3.5 px-4">Items Summary</th>
                <th className="py-3.5 px-4">Settlement Mode</th>
                <th className="py-3.5 px-4 text-right">Debit Total</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-rose-600 mb-2" />
                    Loading supplier returns...
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RotateCcw className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-base font-bold text-slate-800">No Supplier Returns Found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {searchTerm ? 'No results matched your search term.' : 'Click "New Supplier Return" to create your first return.'}
                    </p>
                    {!searchTerm && (
                      <Link
                        to="/purchases/returns/create"
                        className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold"
                      >
                        <Plus className="w-4 h-4" />
                        Create Supplier Return
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                returns.map((ret, index) => {
                  const rowKey = `ret-${ret.id ?? 'row'}-${ret.return_number ?? 'v'}-${index}`;
                  return (
                    <tr key={rowKey} className="hover:bg-slate-50/80 transition-colors">
                      {/* Return # and Date */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <span className="text-rose-700">{ret.return_number}</span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">{ret.return_date}</p>
                      </td>

                    {/* Supplier */}
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 text-sm">{ret.supplier_name}</p>
                      {ret.supplier?.supplier_code && (
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {ret.supplier.supplier_code} {ret.supplier.mobile ? `| ${ret.supplier.mobile}` : ''}
                        </p>
                      )}
                    </td>

                    {/* Original Bill */}
                    <td className="py-3.5 px-4">
                      {ret.purchase_invoice_number ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono font-bold text-xs border border-indigo-200">
                          {ret.purchase_invoice_number}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">Direct Product Return</span>
                      )}
                      {ret.supplier_invoice_number && (
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Challan: {ret.supplier_invoice_number}
                        </p>
                      )}
                    </td>

                    {/* Items */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-800">
                        {ret.items?.length || 0} product(s)
                      </span>
                      {ret.items && ret.items[0] && (
                        <p className="text-[11px] text-slate-500 truncate max-w-[200px] mt-0.5">
                          {ret.items[0].product_name} ({ret.items[0].return_qty} {ret.items[0].unit_name || 'pcs'})
                        </p>
                      )}
                    </td>

                    {/* Settlement Mode */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                        {ret.settlement_type === 'PAYABLE_ADJUSTMENT'
                          ? 'Debit Note (Payable)'
                          : ret.settlement_type === 'CASH_REFUND'
                          ? 'Cash Refund'
                          : ret.settlement_type === 'BANK_REFUND'
                          ? 'Bank Transfer'
                          : 'Store Credit'}
                      </span>
                    </td>

                    {/* Total Amount */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-mono font-bold text-sm text-slate-900">
                        ৳{Number(ret.grand_total || 0).toFixed(2)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          ret.status === 'POSTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ret.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPrintReturn(ret);
                          }}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Print A4 Debit Note Voucher"
                        >
                          <Printer className="w-4 h-4 text-indigo-700" />
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate(`/purchases/returns/${ret.id}/edit`)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit return"
                        >
                          <Edit3 className="w-4 h-4 text-amber-700" />
                        </button>

                        {ret.status === 'DRAFT' && (
                          <button
                            type="button"
                            onClick={() => handleDelete(ret.id, ret.return_number)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete draft"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Modal */}
      {selectedPrintReturn && (
        <SupplierReturnPrintModal
          returnData={selectedPrintReturn}
          company={{
            name: activeCompany?.name,
            address: activeCompany?.address,
            phone: activeCompany?.phone,
            email: activeCompany?.email,
            tax_number: activeCompany?.tax_number,
          }}
          onClose={() => setSelectedPrintReturn(null)}
        />
      )}
    </div>
  );
};
