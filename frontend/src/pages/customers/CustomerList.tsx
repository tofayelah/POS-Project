import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Eye, 
  X, 
  AlertCircle, 
  Layers, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  ArrowRight,
  RefreshCw,
  UserCheck,
  UserX
} from 'lucide-react';
import { customersApi, Customer, CustomerGroup, CustomerBalance } from '../../api/customers';
import { PageHeader, TableContainer, StatusBadge, LoadingState, EmptyState } from '../../components/common';
import { formatCurrency } from '../../utils/currency';
import { useLanguage } from '../../i18n';

export function CustomerList() {
  const { t } = useLanguage();
  
  // Data state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Add / Edit Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formName, setFormName] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formAlternateMobile, setFormAlternateMobile] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formGroupId, setFormGroupId] = useState<string>('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formCountry, setFormCountry] = useState('Bangladesh');
  const [formCreditLimit, setFormCreditLimit] = useState<number | ''>(0);
  const [formPaymentTerms, setFormPaymentTerms] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [openingBalanceAmount, setOpeningBalanceAmount] = useState<number | ''>('');
  const [openingBalanceDirection, setOpeningBalanceDirection] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // View Customer Modal state
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [customerBalance, setCustomerBalance] = useState<CustomerBalance | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Delete Modal state
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await customersApi.getCustomers({
        search: search.trim() || undefined,
        customer_group_id: selectedGroup === 'ALL' ? undefined : Number(selectedGroup),
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        page: currentPage,
      });

      const responseData = res.data as any;
      if (responseData && Array.isArray(responseData.data)) {
        setCustomers(responseData.data);
        setCurrentPage(responseData.current_page || 1);
        setLastPage(responseData.last_page || 1);
        setTotalCount(responseData.total || responseData.data.length);
      } else if (Array.isArray(responseData)) {
        setCustomers(responseData);
        setCurrentPage(1);
        setLastPage(1);
        setTotalCount(responseData.length);
      } else {
        setCustomers([]);
        setTotalCount(0);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedGroup, statusFilter, currentPage]);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await customersApi.getGroups();
      setGroups(res.data || []);
    } catch (err) {
      console.error('Failed to load customer groups', err);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  const handleOpenCreateModal = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormMobile('');
    setFormAlternateMobile('');
    setFormEmail('');
    setFormGroupId('');
    setFormAddress('');
    setFormCity('');
    setFormCountry('Bangladesh');
    setFormCreditLimit(0);
    setFormPaymentTerms('');
    setFormNotes('');
    setFormStatus('ACTIVE');
    setOpeningBalanceAmount('');
    setOpeningBalanceDirection('DEBIT');
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (cust: Customer) => {
    setEditingCustomer(cust);
    setFormName(cust.name || '');
    setFormMobile(cust.mobile || '');
    setFormAlternateMobile(cust.alternate_mobile || '');
    setFormEmail(cust.email || '');
    setFormGroupId(cust.customer_group_id ? String(cust.customer_group_id) : '');
    setFormAddress(cust.address || '');
    setFormCity(cust.city || '');
    setFormCountry(cust.country || 'Bangladesh');
    setFormCreditLimit(cust.credit_limit ?? 0);
    setFormPaymentTerms(cust.payment_terms || '');
    setFormNotes(cust.notes || '');
    setFormStatus(cust.status || 'ACTIVE');
    setOpeningBalanceAmount('');
    setOpeningBalanceDirection('DEBIT');
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Customer Name is required.');
      return;
    }
    setSaving(true);
    setFormError(null);

    try {
      if (editingCustomer) {
        await customersApi.updateCustomer(editingCustomer.id, {
          name: formName.trim(),
          mobile: formMobile.trim() || undefined,
          alternate_mobile: formAlternateMobile.trim() || undefined,
          email: formEmail.trim() || undefined,
          customer_group_id: formGroupId ? Number(formGroupId) : undefined,
          address: formAddress.trim() || undefined,
          city: formCity.trim() || undefined,
          country: formCountry.trim() || undefined,
          credit_limit: formCreditLimit === '' ? 0 : Number(formCreditLimit),
          payment_terms: formPaymentTerms.trim() || undefined,
          notes: formNotes.trim() || undefined,
          status: formStatus,
        });
        setSuccessMessage('Customer updated successfully.');
      } else {
        await customersApi.createCustomer({
          name: formName.trim(),
          mobile: formMobile.trim() || undefined,
          alternate_mobile: formAlternateMobile.trim() || undefined,
          email: formEmail.trim() || undefined,
          customer_group_id: formGroupId ? Number(formGroupId) : undefined,
          address: formAddress.trim() || undefined,
          city: formCity.trim() || undefined,
          country: formCountry.trim() || undefined,
          credit_limit: formCreditLimit === '' ? 0 : Number(formCreditLimit),
          payment_terms: formPaymentTerms.trim() || undefined,
          notes: formNotes.trim() || undefined,
          status: formStatus,
          opening_balance_amount: openingBalanceAmount ? Number(openingBalanceAmount) : 0,
          opening_balance_direction: openingBalanceDirection,
        });
        setSuccessMessage('Customer created successfully.');
      }
      setIsFormModalOpen(false);
      fetchCustomers();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save customer.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenViewModal = async (cust: Customer) => {
    setViewCustomer(cust);
    setCustomerBalance(null);
    setLoadingBalance(true);
    try {
      const balanceRes = await customersApi.getBalance(cust.id);
      if (balanceRes && balanceRes.data) {
        setCustomerBalance(balanceRes.data);
      }
    } catch (err) {
      console.error('Failed to load customer balance', err);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deletingCustomer) return;
    setDeleting(true);
    try {
      await customersApi.deleteCustomer(deletingCustomer.id);
      setSuccessMessage('Customer deleted successfully.');
      setDeletingCustomer(null);
      fetchCustomers();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete customer.');
      setDeletingCustomer(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={t('customers.title', 'Customer Management')}
        subtitle={t('customers.subtitle', 'Manage customer profiles, credit limits, contact directory, and authoritative ledger balances.')}
        actions={
          <div className="flex items-center gap-3">
            <Link
              to="/customers/groups"
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition"
            >
              <Layers className="w-4 h-4 text-slate-500" />
              {t('customers.groups', 'Customer Groups')}
            </Link>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {t('customers.addCustomer', 'Add Customer')}
            </button>
          </div>
        }
      />

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            {successMessage}
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            {error}
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('common.search', 'Search by name, code, mobile, email...')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
          {/* Customer Group Filter */}
          <select
            value={selectedGroup}
            onChange={(e) => {
              setSelectedGroup(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">{t('customers.allGroups', 'All Groups')}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">{t('common.allStatus', 'All Statuses')}</option>
            <option value="ACTIVE">{t('common.active', 'Active')}</option>
            <option value="INACTIVE">{t('common.inactive', 'Inactive')}</option>
          </select>

          <button
            onClick={() => fetchCustomers()}
            title="Refresh"
            className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Table */}
      <TableContainer>
        {loading ? (
          <LoadingState message={t('common.loading', 'Loading customers...')} />
        ) : customers.length === 0 ? (
          <EmptyState
            title={t('customers.noCustomers', 'No customers found')}
            description={t('customers.noCustomersDesc', 'Get started by creating your first customer or try adjusting search filters.')}
            action={
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition"
              >
                <Plus className="w-4 h-4" />
                {t('customers.addCustomer', 'Add Customer')}
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {t('customers.code', 'Customer Code')}
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {t('customers.name', 'Customer Details')}
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {t('customers.group', 'Group')}
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {t('customers.creditLimit', 'Credit Limit')}
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {t('customers.balance', 'Due Balance')}
                  </th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {t('common.status', 'Status')}
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {t('common.actions', 'Actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {customers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-slate-900">
                      {cust.customer_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{cust.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        {cust.mobile && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {cust.mobile}
                          </span>
                        )}
                        {cust.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {cust.email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {cust.group?.name || (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-700">
                      {formatCurrency(cust.credit_limit || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      <span className={(cust.current_balance || cust.opening_balance || 0) > 0 ? 'text-amber-600' : 'text-slate-700'}>
                        {formatCurrency(cust.current_balance ?? cust.opening_balance ?? 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <StatusBadge status={cust.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenViewModal(cust)}
                          title="View Details & Balance"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(cust)}
                          title="Edit Customer"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingCustomer(cust)}
                          title="Delete Customer"
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalCount > 0 && lastPage > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-sm text-slate-600">
            <div>
              Showing page <span className="font-semibold text-slate-800">{currentPage}</span> of{' '}
              <span className="font-semibold text-slate-800">{lastPage}</span> ({totalCount} total)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              <button
                disabled={currentPage >= lastPage}
                onClick={() => setCurrentPage((p) => Math.min(lastPage, p + 1))}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </TableContainer>

      {/* Add / Edit Customer Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  {editingCustomer ? t('customers.editCustomer', 'Edit Customer') : t('customers.addCustomer', 'Add New Customer')}
                </h3>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    {t('customers.name', 'Customer Name')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Full name or company name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Mobile */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    {t('customers.mobile', 'Mobile / Phone')}
                  </label>
                  <input
                    type="text"
                    value={formMobile}
                    onChange={(e) => setFormMobile(e.target.value)}
                    placeholder="e.g. 01711000000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Alternate Mobile */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    {t('customers.altMobile', 'Alternate Mobile')}
                  </label>
                  <input
                    type="text"
                    value={formAlternateMobile}
                    onChange={(e) => setFormAlternateMobile(e.target.value)}
                    placeholder="Secondary contact"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    {t('customers.email', 'Email Address')}
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="customer@domain.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Customer Group */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    {t('customers.group', 'Customer Group')}
                  </label>
                  <select
                    value={formGroupId}
                    onChange={(e) => setFormGroupId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">None (Standard Retail)</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Credit Limit */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    {t('customers.creditLimit', 'Credit Limit (BDT)')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formCreditLimit}
                    onChange={(e) => setFormCreditLimit(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Payment Terms */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    {t('customers.paymentTerms', 'Payment Terms')}
                  </label>
                  <input
                    type="text"
                    value={formPaymentTerms}
                    onChange={(e) => setFormPaymentTerms(e.target.value)}
                    placeholder="e.g. Net 15, Net 30"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Opening Balance (Only for new customer) */}
                {!editingCustomer && (
                  <div className="md:col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="text-xs font-bold text-slate-700 uppercase">
                      Opening Balance (Initial Subledger Entry)
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Opening Amount (BDT)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={openingBalanceAmount}
                          onChange={(e) => setOpeningBalanceAmount(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="0.00"
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Direction</label>
                        <select
                          value={openingBalanceDirection}
                          onChange={(e) => setOpeningBalanceDirection(e.target.value as any)}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="DEBIT">Customer Owes Us (Receivable)</option>
                          <option value="CREDIT">We Owe Customer (Store Credit)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    {t('customers.address', 'Address')}
                  </label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="Street / Area / Shop address"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    {t('customers.city', 'City')}
                  </label>
                  <input
                    type="text"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    placeholder="e.g. Dhaka"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    {t('common.status', 'Status')}
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {saving ? t('common.saving', 'Saving...') : t('common.save', 'Save Customer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Customer Modal */}
      {viewCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{viewCustomer.name}</h3>
                <span className="text-xs font-mono font-medium text-slate-500">{viewCustomer.customer_code}</span>
              </div>
              <button onClick={() => setViewCustomer(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl">
                <div>
                  <div className="text-xs text-slate-500">Credit Limit</div>
                  <div className="font-semibold text-slate-900">{formatCurrency(viewCustomer.credit_limit || 0)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Live Due Balance</div>
                  <div className="font-bold text-base text-indigo-600">
                    {loadingBalance ? (
                      <span className="text-xs text-slate-400">Loading...</span>
                    ) : customerBalance ? (
                      formatCurrency(customerBalance.balance)
                    ) : (
                      formatCurrency(viewCustomer.current_balance ?? viewCustomer.opening_balance ?? 0)
                    )}
                  </div>
                </div>
              </div>

              {customerBalance && (
                <div className="grid grid-cols-3 gap-2 text-center p-3 border border-slate-200 rounded-lg text-xs">
                  <div>
                    <span className="text-slate-500 block">Opening</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(customerBalance.opening_balance)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Total Sales</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(customerBalance.total_sales)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Total Paid</span>
                    <span className="font-semibold text-emerald-600">{formatCurrency(customerBalance.total_paid)}</span>
                  </div>
                </div>
              )}

              <div className="space-y-2 text-slate-600 pt-2">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{viewCustomer.mobile || 'No mobile recorded'}</span>
                </div>
                {viewCustomer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>{viewCustomer.email}</span>
                  </div>
                )}
                {viewCustomer.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{viewCustomer.address}{viewCustomer.city ? `, ${viewCustomer.city}` : ''}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setViewCustomer(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900">Delete Customer?</h3>
            </div>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete <span className="font-semibold">{deletingCustomer.name}</span> ({deletingCustomer.customer_code})?
              This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCustomer(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteCustomer}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
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
