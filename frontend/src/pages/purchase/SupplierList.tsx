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
  Eye, 
  X, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  BadgeCheck,
  Ban
} from 'lucide-react';
import { getSuppliers, deleteSupplier, updateSupplier } from '../../api/suppliers';
import { getBusinessUnits } from '../../api/organization';
import { Supplier } from '../../types/supplier';
import { BusinessUnit } from '../../types/organization';
import { formatCurrency } from '../../utils/currency';
import { useLanguage } from '../../i18n';
import { PageHeader, TableContainer, StatusBadge, LoadingState, EmptyState } from '../../components/common';

export function SupplierList() {
  const { t } = useLanguage();
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

  // Status Toggle Modal
  const [statusToggleSupplier, setStatusToggleSupplier] = useState<Supplier | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Delete Confirmation State
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleToggleStatus = async () => {
    if (!statusToggleSupplier) return;
    setTogglingStatus(true);
    const nextStatus = statusToggleSupplier.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateSupplier(statusToggleSupplier.id, { status: nextStatus });
      setSuccessMessage(t('suppliers.statusUpdated'));
      setStatusToggleSupplier(null);
      fetchSuppliers();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update supplier status.');
      setStatusToggleSupplier(null);
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSupplier) return;
    setDeleting(true);
    try {
      await deleteSupplier(deletingSupplier.id);
      setSuccessMessage(t('suppliers.deleteSuccess'));
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
      <PageHeader
        title={t('suppliers.title')}
        subtitle={t('suppliers.subtitle')}
        actions={
          <Link
            to="/purchases/suppliers/new"
            id="btn-create-supplier"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('suppliers.addSupplier')}</span>
          </Link>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">{t('suppliers.totalSuppliers')}</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">{t('suppliers.activeSuppliers')}</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">{t('suppliers.totalBalance')}</span>
          <p className="text-2xl font-bold text-indigo-700 mt-1">
            {formatCurrency(totalOpeningBalance)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">{t('suppliers.totalCreditLimit')}</span>
          <p className="text-2xl font-bold text-slate-700 mt-1">
            {formatCurrency(totalCreditLimit)}
          </p>
        </div>
      </div>

      {/* Feedback Messages */}
      {error && (
        <div id="supplier-error-alert" className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-700 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-rose-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div id="supplier-success-alert" className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-700 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="p-1 hover:bg-emerald-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="supplier-search-input"
            type="text"
            placeholder={t('suppliers.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <select
            id="supplier-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="border border-slate-300 rounded-lg text-sm py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="ALL">{t('suppliers.allStatuses')}</option>
            <option value="ACTIVE">{t('status.active')}</option>
            <option value="INACTIVE">{t('status.inactive')}</option>
          </select>

          {/* Business Unit Filter */}
          <select
            id="supplier-bu-filter"
            value={buFilter}
            onChange={(e) => setBuFilter(e.target.value)}
            className="border border-slate-300 rounded-lg text-sm py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="ALL">{t('suppliers.allBus')}</option>
            {businessUnits.map((bu) => (
              <option key={bu.id} value={bu.id}>
                {bu.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Supplier Data Table */}
      <TableContainer>
        {loading ? (
          <LoadingState message={t('common.loading')} />
        ) : suppliers.length === 0 ? (
          <EmptyState
            title={t('suppliers.noSuppliersFound')}
            description={t('suppliers.noSuppliersFoundDesc')}
            action={
              <Link
                to="/purchases/suppliers/new"
                id="btn-empty-new-supplier"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t('suppliers.addSupplier')}</span>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table id="suppliers-table" className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <th className="px-5 py-3.5">{t('suppliers.supplierName')} & {t('suppliers.supplierCode')}</th>
                  <th className="px-5 py-3.5">{t('suppliers.contactPerson')}</th>
                  <th className="px-5 py-3.5">{t('suppliers.mobile')} / {t('suppliers.email')}</th>
                  <th className="px-5 py-3.5">{t('suppliers.city')}</th>
                  <th className="px-5 py-3.5">{t('suppliers.businessUnit')}</th>
                  <th className="px-5 py-3.5">{t('suppliers.paymentTerms')}</th>
                  <th className="px-5 py-3.5">{t('suppliers.openingBalance')} / {t('suppliers.creditLimit')}</th>
                  <th className="px-5 py-3.5">{t('suppliers.status')}</th>
                  <th className="px-5 py-3.5 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {suppliers.map((s) => (
                  <tr key={s.id} id={`supplier-row-${s.id}`} className="hover:bg-slate-50/70 transition-colors">
                    {/* Name & Code */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-100 uppercase">
                          {s.short_name || s.name.substring(0, 2)}
                        </div>
                        <div>
                          <div 
                            onClick={() => setViewSupplier(s)}
                            className="font-semibold text-slate-900 hover:text-indigo-600 cursor-pointer flex items-center gap-2 flex-wrap"
                          >
                            <span>{s.name}</span>
                            {s.short_name && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 rounded tracking-wider">
                                {s.short_name}
                              </span>
                            )}
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
                        {formatCurrency(s.opening_balance)}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Limit: {formatCurrency(s.credit_limit)}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <StatusBadge status={s.status} />
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right space-x-1 whitespace-nowrap">
                      {/* View */}
                      <button
                        id={`btn-view-supplier-${s.id}`}
                        type="button"
                        onClick={() => setViewSupplier(s)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                        title={t('common.view')}
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Edit */}
                      <button
                        id={`btn-edit-supplier-${s.id}`}
                        type="button"
                        onClick={() => navigate(`/purchases/suppliers/${s.id}/edit`)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                        title={t('common.edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {/* Toggle Status (Activate / Deactivate) */}
                      <button
                        id={`btn-toggle-status-supplier-${s.id}`}
                        type="button"
                        onClick={() => setStatusToggleSupplier(s)}
                        className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                          s.status === 'ACTIVE'
                            ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                            : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                        }`}
                        title={s.status === 'ACTIVE' ? t('products.deactivate') : t('products.activate')}
                      >
                        {s.status === 'ACTIVE' ? <Ban className="w-4 h-4" /> : <BadgeCheck className="w-4 h-4" />}
                      </button>

                      {/* Delete */}
                      <button
                        id={`btn-delete-supplier-${s.id}`}
                        type="button"
                        onClick={() => setDeletingSupplier(s)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        title={t('common.delete')}
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
      </TableContainer>

      {/* Quick View Profile Drawer/Modal */}
      {viewSupplier && (
        <div id="modal-view-supplier" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm uppercase">
                  {viewSupplier.short_name || viewSupplier.name.substring(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">{viewSupplier.name}</h2>
                    {viewSupplier.short_name && (
                      <span className="px-2 py-0.5 text-xs font-bold bg-indigo-100 text-indigo-800 rounded border border-indigo-200">
                        {viewSupplier.short_name}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded font-semibold inline-block mt-0.5">
                    {viewSupplier.supplier_code}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewSupplier(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              {/* Financial Status Summary */}
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-900 uppercase tracking-wider">{t('suppliers.status')}</span>
                  <StatusBadge status={viewSupplier.status} />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <span className="text-xs text-slate-500 font-medium">{t('suppliers.openingBalance')}</span>
                    <p className="text-lg font-bold text-slate-900">
                      {formatCurrency(viewSupplier.opening_balance)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium">{t('suppliers.creditLimit')}</span>
                    <p className="text-lg font-bold text-slate-900">
                      {formatCurrency(viewSupplier.credit_limit)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('suppliers.contactPerson')}</h3>
                <div className="space-y-2 text-slate-700 bg-white border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 w-28">{t('suppliers.contactPerson')}:</span>
                    <span className="font-semibold text-slate-800">{viewSupplier.contact_person || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 w-28">{t('suppliers.mobile')}:</span>
                    <span className="font-mono">{viewSupplier.mobile || '—'}</span>
                  </div>
                  {viewSupplier.alternate_mobile && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500 w-28">{t('suppliers.alternateMobile')}:</span>
                      <span className="font-mono">{viewSupplier.alternate_mobile}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 w-28">{t('suppliers.email')}:</span>
                    <span>{viewSupplier.email || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 w-28">{t('suppliers.taxNumber')}:</span>
                    <span className="font-mono">{viewSupplier.tax_number || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('suppliers.address')}</h3>
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
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('suppliers.notes')}</h3>
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
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 cursor-pointer"
              >
                {t('common.close')}
              </button>
              <div className="flex items-center gap-2">
                <Link
                  to={`/purchases/suppliers/${viewSupplier.id}/ledger`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-medium cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{t('suppliers.viewLedger')}</span>
                </Link>
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
                  <span>{t('suppliers.editSupplier')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Toggle Modal */}
      {statusToggleSupplier && (
        <div id="modal-status-toggle-supplier" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              {statusToggleSupplier.status === 'ACTIVE'
                ? t('suppliers.deactivateConfirm')
                : t('suppliers.activateConfirm')}
            </h3>
            <p className="text-sm text-slate-500 mt-2">
              {statusToggleSupplier.status === 'ACTIVE'
                ? t('suppliers.deactivateConfirmDesc', { name: statusToggleSupplier.name })
                : t('suppliers.activateConfirmDesc', { name: statusToggleSupplier.name })}
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStatusToggleSupplier(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={togglingStatus}
                onClick={handleToggleStatus}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
                  statusToggleSupplier.status === 'ACTIVE'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {togglingStatus ? t('common.loading') : t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSupplier && (
        <div id="modal-delete-supplier" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">{t('suppliers.deleteConfirm')}</h3>
            <p className="text-sm text-slate-500 mt-2">
              {t('suppliers.deleteConfirmDesc', { name: deletingSupplier.name })}
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                id="btn-cancel-delete-supplier"
                type="button"
                onClick={() => setDeletingSupplier(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                id="btn-confirm-delete-supplier"
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
              >
                {deleting ? t('common.loading') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
