import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  Eye, 
  X, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  BadgeDollarSign
} from 'lucide-react';
import { getSuppliers, deleteSupplier } from '../../api/suppliers';
import { getBusinessUnits } from '../../api/organization';
import { Supplier } from '../../types/supplier';
import { BusinessUnit } from '../../types/organization';

export function SupplierList() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [buFilter, setBuFilter] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Quick View Detail Modal
  const [viewSupplier, setViewSupplier] = useState<Supplier | null>(null);

  // Delete Confirmation State
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [suppRes, buRes] = await Promise.all([
        getSuppliers({
          search: search.trim() || undefined,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          business_unit_id: buFilter === 'ALL' ? undefined : Number(buFilter),
          all: true,
        }),
        getBusinessUnits().catch(() => ({ data: [] })),
      ]);

      const listData = Array.isArray(suppRes.data)
        ? suppRes.data
        : (suppRes.data as any)?.data || [];

      setSuppliers(listData);
      setBusinessUnits(buRes.data || []);
      setIsFallbackMode(Boolean((suppRes as any)?.isFallback));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load suppliers.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, buFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuppliers();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchSuppliers]);

  const handleDelete = async () => {
    if (!deletingSupplier) return;
    setDeleting(true);
    try {
      await deleteSupplier(deletingSupplier.id);
      setSuccessMessage(`Supplier "${deletingSupplier.name}" was successfully deleted.`);
      setDeletingSupplier(null);
      fetchSuppliers();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete supplier. Check for linked purchase orders or inventory batches.');
      setDeletingSupplier(null);
    } finally {
      setDeleting(false);
    }
  };

  // KPIs
  const totalCount = suppliers.length;
  const activeCount = suppliers.filter((s) => s.status === 'ACTIVE').length;
  const totalOpeningBalance = suppliers.reduce((acc, s) => acc + (Number(s.opening_balance) || 0), 0);
  const totalCreditLimit = suppliers.reduce((acc, s) => acc + (Number(s.credit_limit) || 0), 0);

  return (
    <div id="supplier-list-page" className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <h1 id="suppliers-page-title" className="text-2xl font-bold text-slate-900 tracking-tight">
              Suppliers & Vendors
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Maintain procurement vendor directories, credit terms, and purchase accounts.
          </p>
        </div>

        <Link
          to="/purchases/suppliers/new"
          id="btn-new-supplier"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Supplier Entry</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div id="kpi-total-suppliers" className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Suppliers</span>
            <Users className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{totalCount}</p>
          <p className="text-xs text-slate-500 mt-1">Registered procurement partners</p>
        </div>

        <div id="kpi-active-suppliers" className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active Suppliers</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{activeCount}</p>
          <p className="text-xs text-slate-500 mt-1">Ready for purchase orders</p>
        </div>

        <div id="kpi-opening-balance" className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Opening Payables</span>
            <BadgeDollarSign className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            ৳{totalOpeningBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">Carried forward supplier dues</p>
        </div>

        <div id="kpi-credit-facility" className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Total Credit Limit</span>
            <CreditCard className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-900 mt-2">
            ৳{totalCreditLimit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">Maximum allowed credit facility</p>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div id="suppliers-success-alert" className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div id="suppliers-error-alert" className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isFallbackMode && !error && (
        <div id="suppliers-fallback-notice" className="px-4 py-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
            <span>Local Resilient Storage active &bull; Auto-generated unique codes & full supplier management are enabled.</span>
          </div>
          <span className="text-[11px] font-medium text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">Offline-Ready</span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="supplier-search-input"
            type="text"
            placeholder="Search suppliers by name, code, contact, mobile, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Status:</span>
            <select
              id="supplier-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {/* Business Unit Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">BU:</span>
            <select
              id="supplier-bu-filter"
              value={buFilter}
              onChange={(e) => setBuFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white text-slate-700"
            >
              <option value="ALL">All Business Units</option>
              {businessUnits.map((bu) => (
                <option key={bu.id} value={bu.id}>
                  {bu.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Supplier Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div id="suppliers-loading" className="flex items-center justify-center p-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-slate-500 font-medium">Loading suppliers...</span>
            </div>
          </div>
        ) : suppliers.length === 0 ? (
          <div id="suppliers-empty-state" className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No suppliers found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {search || statusFilter !== 'ALL' || buFilter !== 'ALL'
                ? 'Try adjusting your search query or status filter.'
                : 'Get started by creating your first supplier entry in the system.'}
            </p>
            <div className="mt-5">
              <Link
                to="/purchases/suppliers/new"
                id="btn-empty-new-supplier"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Supplier</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table id="suppliers-table" className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <th className="px-5 py-3.5">Supplier Name & Code</th>
                  <th className="px-5 py-3.5">Contact Person</th>
                  <th className="px-5 py-3.5">Contact Info</th>
                  <th className="px-5 py-3.5">Location</th>
                  <th className="px-5 py-3.5">Business Unit</th>
                  <th className="px-5 py-3.5">Payment Terms</th>
                  <th className="px-5 py-3.5">Opening / Credit</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {suppliers.map((s) => (
                  <tr key={s.id} id={`supplier-row-${s.id}`} className="hover:bg-slate-50/70 transition-colors">
                    {/* Name & Code */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-100">
                          {s.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div 
                            onClick={() => setViewSupplier(s)}
                            className="font-semibold text-slate-900 hover:text-indigo-600 cursor-pointer"
                          >
                            {s.name}
                          </div>
                          <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                            {s.supplier_code}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Contact Person */}
                    <td className="px-5 py-4 text-xs text-slate-700">
                      {s.contact_person ? (
                        <span className="font-medium text-slate-800">{s.contact_person}</span>
                      ) : (
                        <span className="text-slate-400 italic">Not specified</span>
                      )}
                    </td>

                    {/* Contact Info */}
                    <td className="px-5 py-4 text-xs space-y-1">
                      {s.mobile && (
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{s.mobile}</span>
                        </div>
                      )}
                      {s.email && (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[150px]">{s.email}</span>
                        </div>
                      )}
                      {!s.mobile && !s.email && <span className="text-slate-400 italic">No phone/email</span>}
                    </td>

                    {/* Location */}
                    <td className="px-5 py-4 text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{s.city || s.country || '—'}</span>
                      </div>
                    </td>

                    {/* Business Unit */}
                    <td className="px-5 py-4 text-xs">
                      {s.business_unit ? (
                        <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-800 px-2 py-0.5 rounded border border-sky-100 font-medium">
                          <Building2 className="w-3 h-3 text-sky-600" />
                          {s.business_unit.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">All BUs</span>
                      )}
                    </td>

                    {/* Payment Terms */}
                    <td className="px-5 py-4 text-xs text-slate-700 font-medium">
                      <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        {s.payment_terms || 'Net 30 Days'}
                      </span>
                    </td>

                    {/* Opening / Credit */}
                    <td className="px-5 py-4 text-xs">
                      <div className="text-slate-900 font-semibold">
                        Due: ৳{Number(s.opening_balance).toLocaleString()}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Limit: ৳{Number(s.credit_limit).toLocaleString()}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        id={`supplier-status-${s.id}`}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          s.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        {s.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        id={`btn-view-supplier-${s.id}`}
                        type="button"
                        onClick={() => setViewSupplier(s)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                        title="View Supplier Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        id={`btn-edit-supplier-${s.id}`}
                        type="button"
                        onClick={() => navigate(`/purchases/suppliers/${s.id}/edit`)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                        title="Edit Supplier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        id={`btn-delete-supplier-${s.id}`}
                        type="button"
                        onClick={() => setDeletingSupplier(s)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        title="Delete Supplier"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick View Profile Drawer/Modal */}
      {viewSupplier && (
        <div id="modal-view-supplier" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                  {viewSupplier.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{viewSupplier.name}</h2>
                  <span className="font-mono text-xs text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded font-semibold">
                    {viewSupplier.supplier_code}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewSupplier(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              {/* Status and Terms */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                  <span className="text-xs text-slate-500 block">Operational Status</span>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 mt-1 rounded text-xs font-semibold ${
                    viewSupplier.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {viewSupplier.status}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Payment Terms</span>
                  <span className="font-semibold text-slate-800 mt-1 block">
                    {viewSupplier.payment_terms || 'Net 30 Days'}
                  </span>
                </div>
              </div>

              {/* Financial Profile */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Financial Dues & Limit</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white border border-slate-200 rounded-lg">
                    <span className="text-xs text-slate-500">Opening Balance (Payable)</span>
                    <p className="text-lg font-bold text-slate-900 mt-0.5">
                      ৳{Number(viewSupplier.opening_balance).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-lg">
                    <span className="text-xs text-slate-500">Credit Limit</span>
                    <p className="text-lg font-bold text-blue-700 mt-0.5">
                      ৳{Number(viewSupplier.credit_limit).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Contact Details</h3>
                <div className="space-y-2 text-slate-700 bg-white border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 w-28">Contact Person:</span>
                    <span className="font-semibold text-slate-800">{viewSupplier.contact_person || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 w-28">Mobile:</span>
                    <span className="font-mono">{viewSupplier.mobile || '—'}</span>
                  </div>
                  {viewSupplier.alternate_mobile && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500 w-28">Alternate Phone:</span>
                      <span className="font-mono">{viewSupplier.alternate_mobile}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 w-28">Email:</span>
                    <span>{viewSupplier.email || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 w-28">Tax BIN / VAT:</span>
                    <span className="font-mono">{viewSupplier.tax_number || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Location & Dispatch</h3>
                <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1 text-slate-700">
                  <p>{viewSupplier.address || 'No street address provided'}</p>
                  <p className="text-xs text-slate-500">
                    {[viewSupplier.city, viewSupplier.country].filter(Boolean).join(', ') || 'Bangladesh'}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {viewSupplier.notes && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notes & Instructions</h3>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 whitespace-pre-line">
                    {viewSupplier.notes}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewSupplier(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-100"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = viewSupplier.id;
                  setViewSupplier(null);
                  navigate(`/purchases/suppliers/${id}/edit`);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium shadow-xs cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Full Profile</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSupplier && (
        <div id="modal-delete-supplier" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Delete Supplier?</h3>
            <p className="text-sm text-slate-500 mt-2">
              Are you sure you want to delete <span className="font-semibold text-slate-800">{deletingSupplier.name}</span> ({deletingSupplier.supplier_code})?
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                id="btn-cancel-delete-supplier"
                type="button"
                onClick={() => setDeletingSupplier(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete-supplier"
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
