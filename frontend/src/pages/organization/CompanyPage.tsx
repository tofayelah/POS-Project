import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Edit3, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  DollarSign, 
  Clock, 
  Network, 
  Warehouse as WarehouseIcon, 
  CheckCircle2, 
  AlertCircle,
  X,
  FileCheck
} from 'lucide-react';
import { Link } from 'react-router';
import { Company } from '../../types/organization';
import { getCompany, updateCompany, getBusinessUnits, getBranches, getWarehouses } from '../../api/organization';

export function CompanyPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Stats
  const [buCount, setBuCount] = useState(0);
  const [branchCount, setBranchCount] = useState(0);
  const [warehouseCount, setWarehouseCount] = useState(0);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    code: '',
    phone: '',
    email: '',
    address: '',
    country: 'Bangladesh',
    currency_code: 'BDT',
    timezone: 'Asia/Dhaka',
    tax_number: '',
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [compRes, buRes, brRes, whRes] = await Promise.all([
        getCompany(),
        getBusinessUnits().catch(() => ({ data: [] })),
        getBranches().catch(() => ({ data: [] })),
        getWarehouses().catch(() => ({ data: [] })),
      ]);

      if (compRes.data) {
        setCompany(compRes.data);
      }
      setBuCount(buRes.data?.length || 0);
      setBranchCount(brRes.data?.length || 0);
      setWarehouseCount(whRes.data?.length || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load company details.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = () => {
    if (!company) return;
    setFormData({
      name: company.name || '',
      legal_name: company.legal_name || '',
      code: company.code || '',
      phone: company.phone || '',
      email: company.email || '',
      address: company.address || '',
      country: company.country || 'Bangladesh',
      currency_code: company.currency_code || 'BDT',
      timezone: company.timezone || 'Asia/Dhaka',
      tax_number: company.tax_number || '',
      status: company.status || 'active',
    });
    setModalError(null);
    setIsEditModalOpen(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setModalError('Company Name is required.');
      return;
    }
    if (!formData.code.trim()) {
      setModalError('Company Code is required.');
      return;
    }

    setSaving(true);
    setModalError(null);
    try {
      const res = await updateCompany({
        name: formData.name.trim(),
        legal_name: formData.legal_name.trim() || null,
        code: formData.code.trim(),
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        country: formData.country.trim(),
        currency_code: formData.currency_code.trim(),
        timezone: formData.timezone.trim(),
        tax_number: formData.tax_number.trim() || null,
        status: formData.status,
      });

      setCompany(res.data);
      setIsEditModalOpen(false);
      setSuccessMessage('Company details updated successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to update company.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div id="company-loading" className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-slate-500 font-medium">Loading company profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div id="company-profile-page" className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 id="company-page-title" className="text-2xl font-bold text-slate-900 tracking-tight">Company Profile</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your master organization entity, legal registration, and global defaults.
          </p>
        </div>
        <button
          id="btn-edit-company-profile"
          type="button"
          onClick={handleOpenEditModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
        >
          <Edit3 className="w-4 h-4" />
          <span>Edit Profile</span>
        </button>
      </div>

      {/* Alert Notifications */}
      {successMessage && (
        <div id="company-success-alert" className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div id="company-error-alert" className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Overview Card */}
      <div id="company-hero-card" className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-2xl shadow-sm">
              {company?.name ? company.name.charAt(0).toUpperCase() : 'C'}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 id="company-name-display" className="text-xl font-bold text-slate-900">{company?.name}</h2>
                <span id="company-status-badge" className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                  company?.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                }`}>
                  {company?.status?.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-slate-500 font-medium mt-0.5">{company?.legal_name || 'Legal entity registered'}</p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">Code: {company?.code}</span>
                {company?.tax_number && (
                  <span className="flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5 text-slate-400" />
                    BIN/Tax: {company.tax_number}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Link
              to="/business-units"
              id="link-quick-bu"
              className="flex-1 md:flex-initial text-center px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors"
            >
              Business Units ({buCount})
            </Link>
            <Link
              to="/branches"
              id="link-quick-branches"
              className="flex-1 md:flex-initial text-center px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors"
            >
              Branches ({branchCount})
            </Link>
            <Link
              to="/warehouses"
              id="link-quick-warehouses"
              className="flex-1 md:flex-initial text-center px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors"
            >
              Warehouses ({warehouseCount})
            </Link>
          </div>
        </div>
      </div>

      {/* Structural Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Registration & Legal */}
        <div id="company-card-legal" className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm border-b border-slate-100 pb-3">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Registration & Identity</span>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Company Name</span>
              <span className="text-slate-800 font-medium">{company?.name}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Legal / Registered Name</span>
              <span className="text-slate-800 font-medium">{company?.legal_name || '—'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Organization Identifier Code</span>
              <span className="text-slate-800 font-mono font-medium">{company?.code}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Tax / BIN ID</span>
              <span className="text-slate-800 font-mono">{company?.tax_number || '—'}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Contact & Headquarters */}
        <div id="company-card-contact" className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm border-b border-slate-100 pb-3">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>Contact & Headquarters</span>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Official Email</span>
              <span className="text-slate-800 font-medium flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {company?.email || '—'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Support / Contact Phone</span>
              <span className="text-slate-800 font-medium flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {company?.phone || '—'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Country</span>
              <span className="text-slate-800 font-medium flex items-center gap-1.5 mt-0.5">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                {company?.country || 'Bangladesh'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Headquarters Address</span>
              <span className="text-slate-700 text-xs leading-relaxed block mt-0.5">
                {company?.address || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Localization & Financial Standards */}
        <div id="company-card-finance" className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm border-b border-slate-100 pb-3">
            <DollarSign className="w-4 h-4 text-amber-600" />
            <span>Financial & Regional Defaults</span>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Base Currency</span>
              <span className="text-slate-800 font-medium flex items-center gap-1.5 mt-0.5">
                <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded font-mono font-semibold text-xs">
                  {company?.currency_code || 'BDT'}
                </span>
                <span className="text-xs text-slate-500">(Bangladeshi Taka)</span>
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">System Timezone</span>
              <span className="text-slate-800 font-medium flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {company?.timezone || 'Asia/Dhaka'} (UTC+06:00)
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Hierarchy Structure</span>
              <span className="text-xs text-slate-600 leading-relaxed block mt-0.5">
                Multi-unit structure: Company &gt; Business Units &gt; Branches &gt; Warehouses
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Entity Status</span>
              <span className="text-emerald-700 font-semibold text-xs flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Authorized Master Company
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Organizational Hierarchy Summary Block */}
      <div id="company-hierarchy-summary" className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 mb-2">Organizational Hierarchy</h3>
        <p className="text-sm text-slate-500 mb-6">
          This company sits at the root of the RetailCore ERP tree. Business units, branches, and warehouses operate within its legal and accounting scope.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-sky-50/60 border border-sky-100 rounded-lg flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sky-800 font-semibold text-sm">
                <Network className="w-4 h-4 text-sky-600" />
                <span>Business Units</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Operational divisions</p>
            </div>
            <span className="text-2xl font-bold text-sky-900">{buCount}</span>
          </div>

          <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-lg flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Branches</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Retail locations & outlets</p>
            </div>
            <span className="text-2xl font-bold text-emerald-900">{branchCount}</span>
          </div>

          <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-lg flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-indigo-800 font-semibold text-sm">
                <WarehouseIcon className="w-4 h-4 text-indigo-600" />
                <span>Warehouses</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Stockholding hubs</p>
            </div>
            <span className="text-2xl font-bold text-indigo-900">{warehouseCount}</span>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div id="modal-edit-company" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 id="modal-edit-company-title" className="text-lg font-bold text-slate-900">Edit Company Profile</h2>
              <button
                id="btn-close-company-modal"
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCompany} className="flex-1 overflow-y-auto p-6 space-y-4">
              {modalError && (
                <div id="modal-error-alert" className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="company-name-input" className="block text-xs font-semibold text-slate-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    id="company-name-input"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                    placeholder="e.g. Apex Retail Ltd"
                  />
                </div>

                <div>
                  <label htmlFor="company-code-input" className="block text-xs font-semibold text-slate-700 mb-1">
                    Company Code *
                  </label>
                  <input
                    id="company-code-input"
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 font-mono"
                    placeholder="e.g. APEX-01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="company-legal-name-input" className="block text-xs font-semibold text-slate-700 mb-1">
                    Legal / Registered Name
                  </label>
                  <input
                    id="company-legal-name-input"
                    type="text"
                    value={formData.legal_name}
                    onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                    placeholder="e.g. Apex Retail Holdings Limited"
                  />
                </div>

                <div>
                  <label htmlFor="company-tax-input" className="block text-xs font-semibold text-slate-700 mb-1">
                    Tax / BIN Number
                  </label>
                  <input
                    id="company-tax-input"
                    type="text"
                    value={formData.tax_number}
                    onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                    placeholder="e.g. BIN-19283746501"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="company-email-input" className="block text-xs font-semibold text-slate-700 mb-1">
                    Official Email
                  </label>
                  <input
                    id="company-email-input"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                    placeholder="e.g. admin@sonaribd.com"
                  />
                </div>

                <div>
                  <label htmlFor="company-phone-input" className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    id="company-phone-input"
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                    placeholder="e.g. +880 1700-000000"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="company-address-input" className="block text-xs font-semibold text-slate-700 mb-1">
                  Headquarters Address
                </label>
                <textarea
                  id="company-address-input"
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                  placeholder="Street, City, Country"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="company-country-input" className="block text-xs font-semibold text-slate-700 mb-1">
                    Country
                  </label>
                  <input
                    id="company-country-input"
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                  />
                </div>

                <div>
                  <label htmlFor="company-currency-input" className="block text-xs font-semibold text-slate-700 mb-1">
                    Currency Code
                  </label>
                  <input
                    id="company-currency-input"
                    type="text"
                    value={formData.currency_code}
                    onChange={(e) => setFormData({ ...formData, currency_code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 font-mono"
                    placeholder="BDT"
                  />
                </div>

                <div>
                  <label htmlFor="company-timezone-input" className="block text-xs font-semibold text-slate-700 mb-1">
                    Timezone
                  </label>
                  <input
                    id="company-timezone-input"
                    type="text"
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                    placeholder="Asia/Dhaka"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="company-status-select" className="block text-xs font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  id="company-status-select"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 bg-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  id="btn-cancel-company-edit"
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-company-edit"
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
