import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Edit2,
  RefreshCw,
  AlertCircle,
  Phone,
  Building,
  CheckCircle2,
  Wallet,
  Eye,
  PowerOff,
  Trash2,
  X,
  BookOpen,
  Mail,
  MapPin,
  Building2,
  CreditCard,
  AlertTriangle,
  Check,
  Receipt,
  FileText,
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router';
import { getSuppliers, updateSupplier, deleteSupplier } from '../../api/suppliers';
import { Supplier } from '../../types/supplier';
import { formatBDT } from '../../utils/supplierUtils';

export const SupplierList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const justSavedState = location.state as {
    justSavedId?: number;
    justSavedCode?: string;
    justSavedName?: string;
  } | null;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [bannerVisible, setBannerVisible] = useState<boolean>(Boolean(justSavedState?.justSavedName));

  // Modal states
  const [selectedSupplierForView, setSelectedSupplierForView] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  const fetchSupplierData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSuppliers({
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        all: true,
      });

      if (res?.data) {
        if (Array.isArray(res.data)) {
          setSuppliers(res.data);
        } else if ('data' in res.data && Array.isArray((res.data as any).data)) {
          setSuppliers((res.data as any).data);
        } else {
          setSuppliers([]);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch suppliers:', err);
      setError('Unable to load suppliers list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchSupplierData();
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm, statusFilter]);

  // Auto-dismiss success toast after 4s
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  const filteredSuppliers = suppliers.filter((s) => {
    if (statusFilter === 'ACTIVE' && s.status !== 'ACTIVE') return false;
    if (statusFilter === 'INACTIVE' && s.status !== 'INACTIVE') return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.name?.toLowerCase().includes(term) ||
      s.short_name?.toLowerCase().includes(term) ||
      s.supplier_code?.toLowerCase().includes(term) ||
      s.contact_person?.toLowerCase().includes(term) ||
      s.mobile?.toLowerCase().includes(term) ||
      s.tax_number?.toLowerCase().includes(term) ||
      s.bank_name?.toLowerCase().includes(term) ||
      s.bank_account_no?.toLowerCase().includes(term) ||
      s.notes?.toLowerCase().includes(term)
    );
  });

  // Calculate summary metrics
  const totalSuppliersCount = suppliers.length;
  const activeSuppliersCount = suppliers.filter((s) => s.status === 'ACTIVE').length;
  const inactiveSuppliersCount = suppliers.filter((s) => s.status !== 'ACTIVE').length;
  const totalPayablesAmount = suppliers.reduce(
    (sum, s) => sum + (Number(s.current_balance) || 0),
    0
  );

  // Toggle active/inactive status
  const handleToggleStatus = async (supplier: Supplier) => {
    const newStatus = supplier.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setActionLoadingId(supplier.id);
    try {
      await updateSupplier(supplier.id, { status: newStatus });
      setSuppliers((prev) =>
        prev.map((s) => (s.id === supplier.id ? { ...s, status: newStatus } : s))
      );
      if (selectedSupplierForView?.id === supplier.id) {
        setSelectedSupplierForView((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      setSuccessToast(
        `Supplier "${supplier.name}" ${
          newStatus === 'ACTIVE' ? 'activated' : 'deactivated'
        } successfully.`
      );
    } catch (err: any) {
      console.error('Failed to update status:', err);
      setError(`Failed to change status for ${supplier.name}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Confirm and delete supplier
  const handleDeleteConfirm = async () => {
    if (!supplierToDelete) return;
    const id = supplierToDelete.id;
    const name = supplierToDelete.name;
    setActionLoadingId(id);
    try {
      await deleteSupplier(id);
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
      if (selectedSupplierForView?.id === id) {
        setSelectedSupplierForView(null);
      }
      setSupplierToDelete(null);
      setSuccessToast(`Supplier "${name}" deleted successfully.`);
    } catch (err: any) {
      console.error('Failed to delete supplier:', err);
      setError(`Failed to delete supplier "${name}"`);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>Purchase</span>
            <span>/</span>
            <span className="text-slate-800 font-bold">Suppliers & Vendors</span>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2 sm:gap-2.5">
              <Truck className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600" />
              Suppliers & Vendors
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
              {filteredSuppliers.length} Total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Manage supplier directories, contacts, short codes, tax numbers, and account payables
          </p>
        </div>
        <Link
          to="/purchases/suppliers/new"
          id="btn-add-supplier"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-indigo-700 shadow-xs cursor-pointer transition-colors w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" /> Add Supplier
        </Link>
      </div>

      {/* Summary KPI Cards directly under Suppliers & Vendors */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
        id="supplier-summary-cards"
      >
        {/* Total Suppliers */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Suppliers
            </p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {totalSuppliersCount}{' '}
              <span className="text-sm font-semibold text-slate-500">জন</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">সবগুলো নিবন্ধিত ভেন্ডর</p>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Active Suppliers */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Suppliers
            </p>
            <h3 className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
              {activeSuppliersCount}{' '}
              <span className="text-sm font-semibold text-slate-500">জন</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              {inactiveSuppliersCount} জন Inactive / Deactivated
            </p>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Total Payables */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Payables
            </p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
              {formatBDT(totalPayablesAmount)}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">মোট প্রদেয় বাকি টাকা</p>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="p-3 sm:p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-emerald-900 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs sm:text-sm font-bold">{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Just Saved Banner */}
      {bannerVisible && justSavedState?.justSavedName && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-emerald-900 shadow-xs">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-bold">
                Supplier &quot;{justSavedState.justSavedName}&quot; (ID:{' '}
                <span className="font-mono font-black">{justSavedState.justSavedCode}</span>) saved successfully!
              </p>
              <p className="text-xs text-emerald-700 font-medium mt-0.5">
                The record is active and ready for purchase orders and receipts.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBannerVisible(false)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative w-full sm:w-72 md:w-80 lg:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, code, phone, tax/BIN, bank..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden xs:inline">
              Status:
            </span>
            <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200">
              {['ALL', 'ACTIVE', 'INACTIVE'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 sm:px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st === 'ACTIVE' ? 'Active' : 'Inactive'}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={fetchSupplierData}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3 sm:p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-rose-800 text-sm font-medium">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-700 hover:text-rose-900 p-1 rounded-lg hover:bg-rose-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Supplier Table Container (Fully Responsive with horizontal scroll) */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
          <table className="w-full text-left text-sm text-slate-700 min-w-[1050px]">
            <thead className="bg-slate-50/90 uppercase text-[11px] font-extrabold text-slate-700 tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 sm:px-5 py-3.5 whitespace-nowrap">Supplier Name</th>
                <th className="px-4 sm:px-5 py-3.5 whitespace-nowrap">Code / Short Name</th>
                <th className="px-4 sm:px-5 py-3.5 whitespace-nowrap">Contact Person</th>
                <th className="px-4 sm:px-5 py-3.5 whitespace-nowrap">Phone / Mobile</th>
                <th className="px-4 sm:px-5 py-3.5 whitespace-nowrap">Tax Number / BIN / VAT Reg</th>
                <th className="px-4 sm:px-5 py-3.5 whitespace-nowrap">Additional Notes & Banking Info</th>
                <th className="px-4 sm:px-5 py-3.5 whitespace-nowrap">Current Balance</th>
                <th className="px-4 sm:px-5 py-3.5 whitespace-nowrap">Status</th>
                <th className="px-4 sm:px-5 py-3.5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold">Loading suppliers...</p>
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Building className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">No suppliers found</p>
                    <p className="text-xs text-slate-400 mt-1">Get started by creating your first supplier profile.</p>
                    <Link
                      to="/purchases/suppliers/new"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 mt-3 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Supplier Now
                    </Link>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => {
                  const isJustAdded =
                    (justSavedState?.justSavedCode && supplier.supplier_code === justSavedState.justSavedCode) ||
                    (justSavedState?.justSavedId && supplier.id === justSavedState.justSavedId);
                  const isProcessing = actionLoadingId === supplier.id;

                  return (
                    <tr
                      key={supplier.id}
                      className={`transition-colors ${
                        isJustAdded ? 'bg-emerald-50/70 hover:bg-emerald-50' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Supplier Name */}
                      <td className="px-4 sm:px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedSupplierForView(supplier)}
                            className="font-bold text-slate-900 hover:text-indigo-600 text-left transition-colors cursor-pointer"
                            title="Click to view full details"
                          >
                            {supplier.name}
                          </button>
                          {isJustAdded && (
                            <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-emerald-100 text-emerald-800 rounded">
                              NEW
                            </span>
                          )}
                        </div>
                        {supplier.address && (
                          <div className="text-xs text-slate-400 truncate max-w-xs">{supplier.address}</div>
                        )}
                      </td>

                      {/* Code / Short Name */}
                      <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-md">
                            {supplier.supplier_code}
                          </span>
                          {supplier.short_name && (
                            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              {supplier.short_name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Contact Person */}
                      <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap">
                        {supplier.contact_person ? (
                          <div>
                            <div className="font-semibold text-slate-800">{supplier.contact_person}</div>
                            {supplier.contact_designation && (
                              <div className="text-xs text-slate-500">{supplier.contact_designation}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* Phone / Mobile */}
                      <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap">
                        {supplier.mobile ? (
                          <div className="flex items-center gap-1 text-slate-700 font-medium">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{supplier.mobile}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* Tax Number / BIN / VAT Reg */}
                      <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap">
                        {supplier.tax_number ? (
                          <div className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-800 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                            <Receipt className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="font-semibold">{supplier.tax_number}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* Additional Notes & Banking Info */}
                      <td className="px-4 sm:px-5 py-3.5 max-w-xs">
                        <div className="space-y-1 text-xs">
                          {(supplier.bank_name || supplier.bank_account_no) ? (
                            <div className="flex items-center gap-1.5 text-slate-800 font-semibold truncate">
                              <CreditCard className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate">
                                {supplier.bank_name || 'Bank'}
                                {supplier.bank_account_no && (
                                  <span className="font-mono text-slate-600 font-normal ml-1">
                                    (A/C: {supplier.bank_account_no})
                                  </span>
                                )}
                              </span>
                            </div>
                          ) : null}
                          {supplier.notes ? (
                            <div
                              className="flex items-start gap-1.5 text-slate-600 text-[11px] line-clamp-1"
                              title={supplier.notes}
                            >
                              <FileText className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                              <span className="truncate">{supplier.notes}</span>
                            </div>
                          ) : null}
                          {!supplier.bank_name && !supplier.bank_account_no && !supplier.notes && (
                            <span className="text-xs text-slate-400 italic">—</span>
                          )}
                        </div>
                      </td>

                      {/* Current Balance */}
                      <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`font-mono font-bold text-xs ${
                            (supplier.current_balance || 0) > 0
                              ? 'text-rose-600'
                              : (supplier.current_balance || 0) < 0
                              ? 'text-emerald-600'
                              : 'text-slate-600'
                          }`}
                        >
                          {formatBDT(supplier.current_balance)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            supplier.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              supplier.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          {supplier.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 sm:px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* 1. View button */}
                          <button
                            type="button"
                            id={`btn-view-supplier-${supplier.id}`}
                            onClick={() => setSelectedSupplierForView(supplier)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 bg-white hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                            title="View Supplier Details"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-400" />
                            View
                          </button>

                          {/* 2. Edit button */}
                          <button
                            type="button"
                            id={`btn-edit-supplier-${supplier.id}`}
                            onClick={() => navigate(`/purchases/suppliers/${supplier.id}/edit`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 bg-white hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                            title="Edit Supplier"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                            Edit
                          </button>

                          {/* 3. Deactive / Activate button */}
                          <button
                            type="button"
                            id={`btn-toggle-status-supplier-${supplier.id}`}
                            disabled={isProcessing}
                            onClick={() => handleToggleStatus(supplier)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors cursor-pointer shadow-2xs ${
                              supplier.status === 'ACTIVE'
                                ? 'text-amber-800 bg-amber-50/70 hover:bg-amber-100/70 border-amber-200/60'
                                : 'text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100/70 border-emerald-200/60'
                            }`}
                            title={supplier.status === 'ACTIVE' ? 'Deactivate Supplier' : 'Activate Supplier'}
                          >
                            {supplier.status === 'ACTIVE' ? (
                              <>
                                <PowerOff className="w-3.5 h-3.5 text-amber-600" />
                                Deactive
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Activate
                              </>
                            )}
                          </button>

                          {/* 4. Delete button */}
                          <button
                            type="button"
                            id={`btn-delete-supplier-${supplier.id}`}
                            disabled={isProcessing}
                            onClick={() => setSupplierToDelete(supplier)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-600 bg-white hover:text-rose-700 hover:bg-rose-50/60 hover:border-rose-200 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                            title="Delete Supplier"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                            Delete
                          </button>
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

      {/* ======================================================== */}
      {/* SUPPLIER DETAILS VIEW MODAL (Responsive for all screens) */}
      {/* ======================================================== */}
      {selectedSupplierForView && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          id="supplier-view-modal"
        >
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/70 rounded-t-2xl sm:rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md font-bold text-base sm:text-lg uppercase shrink-0">
                  {(selectedSupplierForView.short_name || selectedSupplierForView.name).slice(0, 3)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">
                      {selectedSupplierForView.name}
                    </h2>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        selectedSupplierForView.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          selectedSupplierForView.status === 'ACTIVE'
                            ? 'bg-emerald-500'
                            : 'bg-rose-500'
                        }`}
                      />
                      {selectedSupplierForView.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                      ID: {selectedSupplierForView.supplier_code}
                    </span>
                    {selectedSupplierForView.short_name && (
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        Short: {selectedSupplierForView.short_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-supplier-modal"
                onClick={() => setSelectedSupplierForView(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 sm:p-2 rounded-xl hover:bg-slate-200/60 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
              {/* Financial Balance Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Current Balance / Payables
                  </p>
                  <p
                    className={`text-xl sm:text-2xl font-black font-mono mt-0.5 ${
                      (selectedSupplierForView.current_balance || 0) > 0
                        ? 'text-rose-600'
                        : 'text-slate-900'
                    }`}
                  >
                    {formatBDT(selectedSupplierForView.current_balance)}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Opening Balance: {formatBDT(selectedSupplierForView.opening_balance)}
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* View Ledger Action in Financial Summary */}
                  <button
                    type="button"
                    id="btn-modal-summary-ledger"
                    onClick={() => {
                      navigate(`/purchases/suppliers/${selectedSupplierForView.id}/ledger`);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors cursor-pointer w-full sm:w-auto"
                  >
                    <BookOpen className="w-4 h-4" /> View Ledger
                  </button>
                </div>
              </div>

              {/* Tax & Regulatory Info */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-slate-400" /> Tax & Regulatory Identification
                  </h3>
                  <Link
                    to={`/purchases/suppliers/${selectedSupplierForView.id}/edit`}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    Edit Tax Info ↗
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-xs font-bold text-slate-400 block">Tax Number / BIN / VAT Reg</span>
                    <span className="font-mono font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                      {selectedSupplierForView.tax_number || (
                        <span className="italic text-slate-400 font-normal">Not provided</span>
                      )}
                    </span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-xs font-bold text-slate-400 block">Payment Terms</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {selectedSupplierForView.payment_terms || 'Standard (Net 30)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-slate-400" /> Contact Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-xs font-bold text-slate-400 block">Contact Person</span>
                    <span className="font-semibold text-slate-800">
                      {selectedSupplierForView.contact_person || '—'}
                    </span>
                    {selectedSupplierForView.contact_designation && (
                      <span className="text-xs text-slate-500 block">
                        ({selectedSupplierForView.contact_designation})
                      </span>
                    )}
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-xs font-bold text-slate-400 block">Primary Mobile</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-indigo-600" />
                      {selectedSupplierForView.mobile || '—'}
                    </span>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-xs font-bold text-slate-400 block">Alternative Phone</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {selectedSupplierForView.contact_phone || '—'}
                    </span>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-xs font-bold text-slate-400 block">Email Address</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {selectedSupplierForView.email || '—'}
                    </span>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl sm:col-span-2">
                    <span className="text-xs font-bold text-slate-400 block">Office / Factory Address</span>
                    <span className="font-medium text-slate-700 flex items-start gap-1.5 mt-0.5">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      {selectedSupplierForView.address || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Banking & Settlement Details */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-slate-400" /> Bank Account Details
                  </h3>
                  <Link
                    to={`/purchases/suppliers/${selectedSupplierForView.id}/edit`}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    Edit Bank Info ↗
                  </Link>
                </div>
                <div className="p-4 bg-white border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-xs font-bold text-slate-400 block">Bank Name</span>
                    <span className="font-semibold text-slate-800">
                      {selectedSupplierForView.bank_name || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 block">Account Number</span>
                    <span className="font-mono font-bold text-slate-800">
                      {selectedSupplierForView.bank_account_no || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 block">Branch / Routing</span>
                    <span className="font-medium text-slate-700">
                      {selectedSupplierForView.bank_branch || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Internal Notes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-slate-400" /> Additional Notes & Banking Info / Internal Remarks
                  </h3>
                  <Link
                    to={`/purchases/suppliers/${selectedSupplierForView.id}/edit`}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    Edit Notes ↗
                  </Link>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 leading-relaxed">
                  {selectedSupplierForView.notes || (
                    <span className="italic text-slate-400">
                      No internal notes recorded yet. Click "Edit Notes" to add terms or bank instructions.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions Footer: View Ledger, Edit Supplier, Close */}
            <div className="px-4 sm:px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl sm:rounded-b-3xl flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* 1. View Ledger Button */}
                <button
                  type="button"
                  id="btn-modal-view-ledger"
                  onClick={() => {
                    navigate(`/purchases/suppliers/${selectedSupplierForView.id}/ledger`);
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer w-full sm:w-auto"
                >
                  <BookOpen className="w-4 h-4" /> View Ledger
                </button>

                {/* 2. Edit Supplier Button */}
                <button
                  type="button"
                  id="btn-modal-edit-supplier"
                  onClick={() => {
                    navigate(`/purchases/suppliers/${selectedSupplierForView.id}/edit`);
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-colors cursor-pointer w-full sm:w-auto"
                >
                  <Edit2 className="w-4 h-4" /> Edit Supplier
                </button>
              </div>

              {/* Close Button */}
              <button
                type="button"
                id="btn-modal-close-view"
                onClick={() => setSelectedSupplierForView(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer w-full sm:w-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DELETE CONFIRMATION MODAL                                */}
      {/* ======================================================== */}
      {supplierToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          id="supplier-delete-modal"
        >
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-5 sm:p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                Delete Supplier
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to delete supplier{' '}
                <span className="font-bold text-slate-900">{supplierToDelete.name}</span> (ID:{' '}
                <span className="font-mono font-bold text-indigo-700">
                  {supplierToDelete.supplier_code}
                </span>
                )? This action will remove the supplier directory entry.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                id="btn-cancel-delete"
                onClick={() => setSupplierToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete"
                onClick={handleDeleteConfirm}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Delete Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
