import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { 
  CreditCard, 
  Search, 
  RefreshCw, 
  Eye, 
  Building2, 
  ArrowRight,
  TrendingDown,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { SupplierPayableItem } from '../../types/purchase';
import { getSupplierPayables } from '../../api/purchases';
import { formatCurrency } from '../../utils/currency';
import { SupplierPaymentModal } from '../../components/purchase/SupplierPaymentModal';

export function SupplierPayables() {
  const [payables, setPayables] = useState<SupplierPayableItem[]>([]);
  const [totalPayables, setTotalPayables] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Payment modal state
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    loadPayables();
  }, []);

  const loadPayables = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await getSupplierPayables();
      setPayables(res.data);
      setTotalPayables(res.summary?.total_payables || 0);
    } catch (err: any) {
      console.error('Failed to load supplier payables:', err);
      setErrorMessage(err.message || 'Failed to load supplier payables.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = payables.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.supplier_code.toLowerCase().includes(q) ||
      (s.mobile && s.mobile.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-purple-600" />
            Supplier Payables
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor total outstanding liabilities across suppliers and review ledger statements.
          </p>
        </div>

        <button
          type="button"
          onClick={loadPayables}
          className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-500 shrink-0 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
            Total Outstanding Payables
          </span>
          <span className="text-2xl font-bold font-mono text-purple-700 mt-1 block">
            {formatCurrency(totalPayables)}
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
            Suppliers with Balances
          </span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
            {payables.filter((p) => Number(p.balance) > 0).length}
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
            Total Monitored Vendors
          </span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
            {payables.length}
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendor name, code, mobile..."
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500/20"
          />
        </div>
      </div>

      {/* Payables Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3 px-4">Supplier / Vendor</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4 text-right">Total Purchases</th>
                <th className="py-3 px-4 text-right">Total Paid</th>
                <th className="py-3 px-4 text-right">Outstanding Balance</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading supplier payables report...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((sup) => (
                  <tr key={sup.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Name */}
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <Link
                        to={`/purchases/suppliers/${sup.id}/ledger`}
                        className="hover:text-purple-600 transition-colors"
                      >
                        {sup.name}
                      </Link>
                    </td>

                    {/* Code */}
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {sup.supplier_code}
                    </td>

                    {/* Contact */}
                    <td className="py-3 px-4 text-slate-500">
                      {sup.mobile || sup.email || 'N/A'}
                    </td>

                    {/* Total Purchases */}
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {formatCurrency(sup.total_purchases || 0)}
                    </td>

                    {/* Total Paid */}
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 font-medium">
                      {formatCurrency(sup.total_paid || 0)}
                    </td>

                    {/* Balance */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-purple-700">
                      {formatCurrency(sup.balance || 0)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right space-x-2">
                      <Link
                        to={`/purchases/suppliers/${sup.id}/ledger`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-md transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Statement
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No supplier payable records found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedSupplierId && (
        <SupplierPaymentModal
          supplierId={selectedSupplierId}
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedSupplierId(null);
          }}
          onSuccess={() => {
            setIsPaymentModalOpen(false);
            setSelectedSupplierId(null);
            loadPayables();
          }}
        />
      )}
    </div>
  );
}
