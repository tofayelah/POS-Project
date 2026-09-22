import React, { useState, useEffect, useMemo } from 'react';
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
  FileCheck,
  Plus,
  ShieldCheck,
  Smartphone,
  Gamepad2,
  Shirt,
  ShoppingCart,
  Pill,
  Store,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  Layers,
  Sparkles,
  ArrowRight,
  UserCheck,
  Lock,
  Search
} from 'lucide-react';
import { Link } from 'react-router';
import { Company, BusinessType, CreateCompanyPayload, TenantFeatures } from '../../types/organization';
import { 
  getCompanies, 
  getCompany, 
  createCompany, 
  updateCompany, 
  deleteCompany,
  setActiveTenantCompany,
  getActiveTenantId,
  BUSINESS_TYPE_CONFIG,
  getBusinessUnits, 
  getBranches, 
  getWarehouses 
} from '../../api/organization';

export function CompanyPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Filter & Search State
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Stats for currently active company
  const [buCount, setBuCount] = useState(0);
  const [branchCount, setBranchCount] = useState(0);
  const [warehouseCount, setWarehouseCount] = useState(0);

  // Modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTargetCompany, setEditingTargetCompany] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // New Tenant Form State
  const [newTenant, setNewTenant] = useState<CreateCompanyPayload>({
    name: '',
    legal_name: '',
    code: '',
    subdomain: '',
    custom_domain: '',
    business_type: 'MOBILE_ELECTRONICS',
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    plan: 'pro',
    country: 'Bangladesh',
    currency_code: 'BDT',
    timezone: 'Asia/Dhaka',
    tax_number: '',
    address: '',
    status: 'active',
    features_enabled: {
      imei_serial_tracking: true,
      warranty_management: true,
      size_color_matrix: false,
      batch_expiry_tracking: false,
      wholesale_pricing: true,
      pos_quick_checkout: true,
    },
  });

  // Edit Form State
  const [editFormData, setEditFormData] = useState({
    name: '',
    legal_name: '',
    code: '',
    subdomain: '',
    custom_domain: '',
    business_type: 'GENERAL_RETAIL' as BusinessType,
    owner_name: '',
    owner_email: '',
    phone: '',
    email: '',
    address: '',
    country: 'Bangladesh',
    currency_code: 'BDT',
    timezone: 'Asia/Dhaka',
    tax_number: '',
    status: 'active' as 'active' | 'inactive',
    features_enabled: {} as TenantFeatures,
  });

  useEffect(() => {
    loadAllData();

    const handleTenantChange = () => {
      loadAllData();
    };
    window.addEventListener('retailcore_tenant_changed', handleTenantChange);
    return () => window.removeEventListener('retailcore_tenant_changed', handleTenantChange);
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [allCompRes, currRes, buRes, brRes, whRes] = await Promise.all([
        getCompanies(),
        getCompany(),
        getBusinessUnits().catch(() => ({ data: [] })),
        getBranches().catch(() => ({ data: [] })),
        getWarehouses().catch(() => ({ data: [] })),
      ]);

      setCompanies(allCompRes.data || []);
      setActiveCompany(currRes.data);
      setBuCount(buRes.data?.length || 0);
      setBranchCount(brRes.data?.length || 0);
      setWarehouseCount(whRes.data?.length || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load tenant companies.');
    } finally {
      setLoading(false);
    }
  };

  // Switch Active Tenant
  const handleSwitchTenant = (comp: Company) => {
    setActiveTenantCompany(comp);
    setActiveCompany(comp);
    setSuccessMessage(`Switched active workspace to "${comp.name}" (${comp.subdomain || 'apex'}.sonaribd.com). Data isolation guard updated.`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Copy Subdomain Link
  const handleCopyLink = (comp: Company) => {
    const url = `https://${comp.subdomain || 'app'}.sonaribd.com`;
    navigator.clipboard.writeText(url);
    setCopiedId(comp.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open Register Modal with Auto Defaults
  const handleOpenRegisterModal = (presetType?: BusinessType) => {
    const initialType: BusinessType = presetType || 'MOBILE_ELECTRONICS';
    const config = BUSINESS_TYPE_CONFIG[initialType];

    setNewTenant({
      name: '',
      legal_name: '',
      code: '',
      subdomain: '',
      custom_domain: '',
      business_type: initialType,
      owner_name: '',
      owner_email: '',
      owner_phone: '',
      plan: 'pro',
      country: 'Bangladesh',
      currency_code: 'BDT',
      timezone: 'Asia/Dhaka',
      tax_number: '',
      address: '',
      status: 'active',
      features_enabled: { ...config.defaultFeatures },
    });
    setModalError(null);
    setIsRegisterModalOpen(true);
  };

  // Change Business Type in Register Form
  const handleSelectBusinessType = (type: BusinessType) => {
    const config = BUSINESS_TYPE_CONFIG[type];
    setNewTenant((prev) => ({
      ...prev,
      business_type: type,
      features_enabled: { ...config.defaultFeatures },
      // Auto-suggest prefix code if empty or previous matched
      code: prev.subdomain ? `${prev.subdomain.slice(0, 3).toUpperCase()}-01` : prev.code,
    }));
  };

  // Subdomain typing in Register Form
  const handleSubdomainChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setNewTenant((prev) => ({
      ...prev,
      subdomain: clean,
      code: prev.code || (clean ? `${clean.slice(0, 3).toUpperCase()}-01` : ''),
    }));
  };

  // Submit New Tenant
  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenant.name.trim()) {
      setModalError('Company Name is required.');
      return;
    }
    if (!newTenant.subdomain.trim()) {
      setModalError('Subdomain is required for client access (e.g. tofayel, arif, tamim).');
      return;
    }
    if (!newTenant.owner_name.trim()) {
      setModalError('Client Owner Full Name is required.');
      return;
    }
    if (!newTenant.owner_email.trim()) {
      setModalError('Client Owner Email is required for authentication.');
      return;
    }

    setSaving(true);
    setModalError(null);
    try {
      const res = await createCompany(newTenant);
      setSuccessMessage(res.message || `Tenant "${newTenant.name}" registered successfully.`);
      setIsRegisterModalOpen(false);
      await loadAllData();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setModalError(err.message || err.response?.data?.message || 'Failed to register company.');
    } finally {
      setSaving(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (comp?: Company) => {
    const target = comp || activeCompany;
    if (!target) return;
    setEditingTargetCompany(target);
    setEditFormData({
      name: target.name || '',
      legal_name: target.legal_name || '',
      code: target.code || '',
      subdomain: target.subdomain || '',
      custom_domain: target.custom_domain || '',
      business_type: target.business_type || 'GENERAL_RETAIL',
      owner_name: target.owner_name || '',
      owner_email: target.owner_email || target.email || '',
      phone: target.phone || target.owner_phone || '',
      email: target.email || target.owner_email || '',
      address: target.address || '',
      country: target.country || 'Bangladesh',
      currency_code: target.currency_code || 'BDT',
      timezone: target.timezone || 'Asia/Dhaka',
      tax_number: target.tax_number || '',
      status: target.status || 'active',
      features_enabled: target.features_enabled || {},
    });
    setModalError(null);
    setIsEditModalOpen(true);
  };

  // Save Edit Company
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.name.trim()) {
      setModalError('Company Name is required.');
      return;
    }
    if (!editingTargetCompany) return;

    setSaving(true);
    setModalError(null);
    try {
      await updateCompany({
        id: editingTargetCompany.id,
        name: editFormData.name.trim(),
        legal_name: editFormData.legal_name.trim() || null,
        code: editFormData.code.trim() || editingTargetCompany.code,
        subdomain: editFormData.subdomain.trim() || editingTargetCompany.subdomain,
        custom_domain: editFormData.custom_domain.trim() || null,
        business_type: editFormData.business_type,
        owner_name: editFormData.owner_name.trim() || null,
        owner_email: editFormData.owner_email.trim() || null,
        owner_phone: editFormData.phone.trim() || null,
        phone: editFormData.phone.trim() || null,
        email: editFormData.email.trim() || null,
        address: editFormData.address.trim() || null,
        country: editFormData.country.trim(),
        currency_code: editFormData.currency_code.trim(),
        timezone: editFormData.timezone.trim(),
        tax_number: editFormData.tax_number.trim() || null,
        status: editFormData.status,
        features_enabled: editFormData.features_enabled,
      });

      setSuccessMessage(`Tenant company "${editFormData.name}" updated successfully.`);
      setIsEditModalOpen(false);
      await loadAllData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setModalError(err.message || 'Failed to update company.');
    } finally {
      setSaving(false);
    }
  };

  // Helper: Icon for business type
  const getBusinessIcon = (type?: BusinessType) => {
    switch (type) {
      case 'MOBILE_ELECTRONICS':
        return <Smartphone className="w-4 h-4 text-blue-600" />;
      case 'TOYS_GAMES':
        return <Gamepad2 className="w-4 h-4 text-purple-600" />;
      case 'GARMENTS_APPAREL':
        return <Shirt className="w-4 h-4 text-rose-600" />;
      case 'GROCERY_FMCG':
        return <ShoppingCart className="w-4 h-4 text-emerald-600" />;
      case 'PHARMACY_HEALTHCARE':
        return <Pill className="w-4 h-4 text-teal-600" />;
      default:
        return <Store className="w-4 h-4 text-slate-600" />;
    }
  };

  // Filtered Companies
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchType = selectedTypeFilter === 'ALL' || c.business_type === selectedTypeFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || 
        c.name.toLowerCase().includes(q) ||
        (c.subdomain && c.subdomain.toLowerCase().includes(q)) ||
        (c.owner_name && c.owner_name.toLowerCase().includes(q)) ||
        c.code.toLowerCase().includes(q);
      return matchType && matchQuery;
    });
  }, [companies, selectedTypeFilter, searchQuery]);

  if (loading) {
    return (
      <div id="company-loading" className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-slate-500 font-medium">Loading multi-tenant company infrastructure...</span>
        </div>
      </div>
    );
  }

  return (
    <div id="company-profile-page" className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 id="company-page-title" className="text-2xl font-bold text-slate-900 tracking-tight">
              SaaS Tenant Companies
            </h1>
            <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-full">
              Multi-Customer SaaS
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Provision customer companies (Tofayel, Arif, Tamim, Tonu) with custom subdomains, tailored business type presets, and strict data isolation.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            id="btn-register-new-company"
            type="button"
            onClick={() => handleOpenRegisterModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Company (Tenant)</span>
          </button>
        </div>
      </div>

      {/* Alert Notifications */}
      {successMessage && (
        <div id="company-success-alert" className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div id="company-error-alert" className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Multi-Tenant Data Isolation & Subdomain Routing Security Callout */}
      <div id="tenant-isolation-banner" className="bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-md border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Zero-Leak Data Isolation Active
              </span>
              <span className="text-xs text-indigo-200 font-mono">
                {companies.length} Customer Tenants Deployed
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Subdomain Routing & Strict Tenant Scoping
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Each registered customer (e.g. <strong>Tofayel</strong> for Mobile sales, <strong>Arif</strong> for Toys, <strong>Tamim</strong> for Garments, <strong>Tonu</strong> for Retail) accesses the ERP through their dedicated subdomain (<code className="text-indigo-300 bg-white/10 px-1.5 py-0.5 rounded font-mono">tofayel.sonaribd.com</code>). Database queries automatically enforce <code className="text-indigo-300 bg-white/10 px-1.5 py-0.5 rounded font-mono">X-Company-ID</code> filtering so no customer can ever see or access another company's data.
            </p>
          </div>

          {/* Currently Active Workspace Scope */}
          {activeCompany && (
            <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl p-4 min-w-[280px]">
              <span className="text-[11px] font-semibold text-indigo-200 uppercase tracking-wider block">
                Current Active Scope
              </span>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm uppercase shadow-xs">
                  {activeCompany.name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-sm text-white">{activeCompany.name}</div>
                  <div className="text-[11px] text-indigo-300 font-mono">
                    {activeCompany.subdomain || 'apex'}.sonaribd.com
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-300 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" /> Isolated
                </span>
                <span className="text-emerald-300 font-medium">
                  {activeCompany.business_type_label || 'General Retail'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tenant Directory Controls: Filter by Business Type & Search */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Tenant Companies & Portals</h2>
            <p className="text-xs text-slate-500">
              Select or switch into any tenant to audit records or configure customer settings.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search company, subdomain, owner..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Business Type Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => setSelectedTypeFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              selectedTypeFilter === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Businesses ({companies.length})
          </button>

          <button
            onClick={() => setSelectedTypeFilter('MOBILE_ELECTRONICS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              selectedTypeFilter === 'MOBILE_ELECTRONICS'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-500" />
            Mobile & Electronics
          </button>

          <button
            onClick={() => setSelectedTypeFilter('TOYS_GAMES')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              selectedTypeFilter === 'TOYS_GAMES'
                ? 'bg-purple-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5 text-purple-500" />
            Toys & Kids
          </button>

          <button
            onClick={() => setSelectedTypeFilter('GARMENTS_APPAREL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              selectedTypeFilter === 'GARMENTS_APPAREL'
                ? 'bg-rose-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Shirt className="w-3.5 h-3.5 text-rose-500" />
            Apparel & Undergarments
          </button>

          <button
            onClick={() => setSelectedTypeFilter('GROCERY_FMCG')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              selectedTypeFilter === 'GROCERY_FMCG'
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5 text-emerald-500" />
            Supermarket & FMCG
          </button>

          <button
            onClick={() => setSelectedTypeFilter('GENERAL_RETAIL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              selectedTypeFilter === 'GENERAL_RETAIL'
                ? 'bg-slate-700 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Store className="w-3.5 h-3.5 text-slate-500" />
            General Retail
          </button>
        </div>
      </div>

      {/* Tenants Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCompanies.map((comp) => {
          const isActive = comp.id === activeCompany?.id;
          const config = BUSINESS_TYPE_CONFIG[comp.business_type || 'GENERAL_RETAIL'];
          const subdomainUrl = `https://${comp.subdomain || 'app'}.sonaribd.com`;

          return (
            <div
              key={comp.id}
              id={`tenant-card-${comp.id}`}
              className={`bg-white rounded-xl border transition-all duration-150 flex flex-col justify-between ${
                isActive 
                  ? 'border-indigo-600 shadow-md ring-2 ring-indigo-500/20' 
                  : 'border-slate-200 shadow-xs hover:shadow hover:border-slate-300'
              }`}
            >
              <div className="p-5 space-y-4">
                {/* Card Top: Avatar, Title, Active Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm uppercase shadow-xs shrink-0 ${
                      isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {comp.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1">
                          {comp.name}
                        </h3>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">Code: {comp.code}</span>
                    </div>
                  </div>

                  {isActive ? (
                    <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold rounded-full uppercase tracking-wider shrink-0 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                      Active Scope
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold rounded-full shrink-0">
                      Isolated
                    </span>
                  )}
                </div>

                {/* Subdomain URL Badge & Actions */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <Globe className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="font-mono text-slate-700 font-semibold truncate text-[11px]">
                      {comp.subdomain || 'apex'}.sonaribd.com
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleCopyLink(comp)}
                      title="Copy Subdomain Link"
                      className="p-1 hover:bg-slate-200/80 rounded text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    >
                      {copiedId === comp.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <a
                      href={subdomainUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Visit Subdomain"
                      className="p-1 hover:bg-slate-200/80 rounded text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Business Type Pill */}
                <div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${config?.badgeColor || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                    {getBusinessIcon(comp.business_type)}
                    <span>{comp.business_type_label || config?.label || 'General Retail'}</span>
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {config?.description}
                  </p>
                </div>

                {/* Vertical Features Highlights */}
                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Vertical Features Active
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {comp.features_enabled?.imei_serial_tracking && (
                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium border border-blue-100">
                        IMEI / Serial Tracking
                      </span>
                    )}
                    {comp.features_enabled?.warranty_management && (
                      <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-medium border border-indigo-100">
                        Warranty Cards
                      </span>
                    )}
                    {comp.features_enabled?.size_color_matrix && (
                      <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded text-[10px] font-medium border border-rose-100">
                        Size & Color Matrix
                      </span>
                    )}
                    {comp.features_enabled?.batch_expiry_tracking && (
                      <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-medium border border-emerald-100">
                        Batch & Expiry Dates
                      </span>
                    )}
                    {comp.features_enabled?.wholesale_pricing && (
                      <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-medium border border-amber-100">
                        Wholesale Tiers
                      </span>
                    )}
                  </div>
                </div>

                {/* Client Owner Contact Details */}
                <div className="text-xs text-slate-600 space-y-1 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Owner:</span>
                    <span className="font-semibold text-slate-800">{comp.owner_name || 'Central Admin'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Email:</span>
                    <span className="text-slate-700 truncate max-w-[170px]">{comp.owner_email || comp.email || '—'}</span>
                  </div>
                  {comp.phone && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">Mobile:</span>
                      <span className="text-slate-700">{comp.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 rounded-b-xl flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(comp)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-white border border-slate-200 hover:border-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  Configure
                </button>

                {isActive ? (
                  <span className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" /> Active Workspace
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSwitchTenant(comp)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <span>Switch Tenant</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredCompanies.length === 0 && (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Tenant Companies Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            No company matching "{searchQuery}" in category "{selectedTypeFilter}". You can register a new tenant company in just a few clicks.
          </p>
          <button
            onClick={() => handleOpenRegisterModal()}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Register Customer Company
          </button>
        </div>
      )}

      {/* Selected Active Company Organization & Hierarchy Details */}
      {activeCompany && (
        <div className="mt-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Active Tenant Profile: {activeCompany.name}
              </h2>
              <p className="text-xs text-slate-500">
                Legal corporate credentials and organizational hierarchy for the currently active tenant scope.
              </p>
            </div>
            <button
              onClick={() => handleOpenEditModal(activeCompany)}
              className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Profile
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Legal Registration */}
            <div id="company-card-legal" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3 text-xs">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-2.5">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Identity & Subdomain</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Company Name</span>
                <span className="text-slate-800 font-semibold text-sm">{activeCompany.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Subdomain Access URL</span>
                <span className="font-mono text-indigo-600 font-semibold">https://{activeCompany.subdomain || 'apex'}.sonaribd.com</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Legal / Registered Entity</span>
                <span className="text-slate-700">{activeCompany.legal_name || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Organization Code</span>
                <span className="text-slate-800 font-mono">{activeCompany.code}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Tax / BIN ID</span>
                <span className="text-slate-800 font-mono">{activeCompany.tax_number || '—'}</span>
              </div>
            </div>

            {/* Card 2: Contact & Regional */}
            <div id="company-card-contact" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3 text-xs">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-2.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Contact & Location</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Official Contact Email</span>
                <span className="text-slate-700 font-medium">{activeCompany.email || activeCompany.owner_email || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Official Contact Phone</span>
                <span className="text-slate-700 font-medium">{activeCompany.phone || activeCompany.owner_phone || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Base Currency & Timezone</span>
                <span className="text-slate-800 font-semibold">{activeCompany.currency_code || 'BDT'} (৳) &bull; {activeCompany.timezone || 'Asia/Dhaka'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Headquarters Address</span>
                <span className="text-slate-600 block mt-0.5">{activeCompany.address || '—'}</span>
              </div>
            </div>

            {/* Card 3: Enterprise Hierarchy */}
            <div id="company-card-hierarchy" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3 text-xs">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-2.5">
                <Network className="w-4 h-4 text-blue-600" />
                <span>Organization Units</span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Operating scopes linked under this company's legal umbrella:
              </p>
              <div className="space-y-2 pt-1">
                <Link
                  to="/business-units"
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-slate-700"
                >
                  <span className="font-medium">Business Units</span>
                  <span className="font-bold text-indigo-600 bg-white px-2 py-0.5 rounded border border-slate-200">{buCount}</span>
                </Link>
                <Link
                  to="/branches"
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-slate-700"
                >
                  <span className="font-medium">Branch Outlets</span>
                  <span className="font-bold text-indigo-600 bg-white px-2 py-0.5 rounded border border-slate-200">{branchCount}</span>
                </Link>
                <Link
                  to="/warehouses"
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-slate-700"
                >
                  <span className="font-medium">Warehouses (Main & Branch)</span>
                  <span className="font-bold text-indigo-600 bg-white px-2 py-0.5 rounded border border-slate-200">{warehouseCount}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTER NEW COMPANY (TENANT)                                     */}
      {/* ========================================================================= */}
      {isRegisterModalOpen && (
        <div 
          id="modal-register-company"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            {/* Modal Top */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-bold">Onboard New Customer Tenant</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Set up subdomain, business vertical template, owner credentials, and data isolation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {modalError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* STEP 1: BUSINESS TYPE SELECTION (User explicitly requested!) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                    <span>1. Select Business Type & Industry Vertical</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Tailors POS & inventory features</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Mobile & Electronics */}
                  <div
                    onClick={() => handleSelectBusinessType('MOBILE_ELECTRONICS')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      newTenant.business_type === 'MOBILE_ELECTRONICS'
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-slate-900">Mobile Sales</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      IMEI/Serial numbers, warranty management & specs (e.g. Tofayel).
                    </p>
                  </div>

                  {/* Toys & Kids */}
                  <div
                    onClick={() => handleSelectBusinessType('TOYS_GAMES')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      newTenant.business_type === 'TOYS_GAMES'
                        ? 'border-purple-600 bg-purple-50/50 shadow-xs ring-1 ring-purple-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                        <Gamepad2 className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-slate-900">Toys Sales</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Kids toys, age group categories & barcode scanning (e.g. Arif).
                    </p>
                  </div>

                  {/* Garments & Apparel */}
                  <div
                    onClick={() => handleSelectBusinessType('GARMENTS_APPAREL')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      newTenant.business_type === 'GARMENTS_APPAREL'
                        ? 'border-rose-600 bg-rose-50/50 shadow-xs ring-1 ring-rose-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                        <Shirt className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-slate-900">Undergarments / Apparel</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Size & color variant matrix, fabric styles & bundles (e.g. Tamim).
                    </p>
                  </div>

                  {/* Grocery & FMCG */}
                  <div
                    onClick={() => handleSelectBusinessType('GROCERY_FMCG')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      newTenant.business_type === 'GROCERY_FMCG'
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <ShoppingCart className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-slate-900">Supermarket & FMCG</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Expiry dates, batch tracking & weighing barcodes (e.g. Tonu).
                    </p>
                  </div>

                  {/* Pharmacy */}
                  <div
                    onClick={() => handleSelectBusinessType('PHARMACY_HEALTHCARE')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      newTenant.business_type === 'PHARMACY_HEALTHCARE'
                        ? 'border-teal-600 bg-teal-50/50 shadow-xs ring-1 ring-teal-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                        <Pill className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-slate-900">Pharmacy</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Drug generic names, expiry alerts & prescription tracking.
                    </p>
                  </div>

                  {/* General Retail */}
                  <div
                    onClick={() => handleSelectBusinessType('GENERAL_RETAIL')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      newTenant.business_type === 'GENERAL_RETAIL'
                        ? 'border-slate-700 bg-slate-100 shadow-xs ring-1 ring-slate-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center">
                        <Store className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-slate-900">General Retail</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Standard multi-category commerce & departmental sales.
                    </p>
                  </div>
                </div>
              </div>

              {/* STEP 2: SUBDOMAIN CONFIGURATION */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-600" />
                  <span>2. Client Subdomain Access</span>
                  <span className="text-rose-500">*</span>
                </label>

                <div className="space-y-2">
                  <div className="flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-600">
                    <span className="px-3 py-2 bg-slate-100 text-slate-500 text-xs font-mono border-r border-slate-200">
                      https://
                    </span>
                    <input
                      id="input-new-tenant-subdomain"
                      type="text"
                      required
                      value={newTenant.subdomain}
                      onChange={(e) => handleSubdomainChange(e.target.value)}
                      placeholder="tofayel"
                      className="px-3 py-2 text-xs font-mono font-bold text-indigo-900 w-full outline-none"
                    />
                    <span className="px-3 py-2 bg-slate-100 text-slate-600 text-xs font-mono font-semibold border-l border-slate-200">
                      .sonaribd.com
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">
                      Client Portal URL:{' '}
                      <strong className="text-indigo-700 font-mono">
                        https://{newTenant.subdomain || '[subdomain]'}.sonaribd.com
                      </strong>
                    </span>
                    {newTenant.subdomain ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Valid Subdomain
                      </span>
                    ) : (
                      <span className="text-slate-400">Lowercase letters and dashes only</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                    Optional Custom Domain (e.g. pos.customerdomain.com)
                  </label>
                  <input
                    type="text"
                    value={newTenant.custom_domain || ''}
                    onChange={(e) => setNewTenant({ ...newTenant, custom_domain: e.target.value })}
                    placeholder="e.g. pos.tofayelmobile.com"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* STEP 3: COMPANY IDENTITY */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>3. Company Profile & Legal Registration</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Company Display Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="input-new-tenant-name"
                      type="text"
                      required
                      value={newTenant.name}
                      onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                      placeholder="e.g. Tofayel Telecom & Mobile Gallery"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Company Code
                    </label>
                    <input
                      type="text"
                      value={newTenant.code || ''}
                      onChange={(e) => setNewTenant({ ...newTenant, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. TF-MOBI"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Legal Registered Entity Name
                    </label>
                    <input
                      type="text"
                      value={newTenant.legal_name || ''}
                      onChange={(e) => setNewTenant({ ...newTenant, legal_name: e.target.value })}
                      placeholder="e.g. Tofayel Mobile Sales & Service Ltd"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tax BIN / TIN Number
                    </label>
                    <input
                      type="text"
                      value={newTenant.tax_number || ''}
                      onChange={(e) => setNewTenant({ ...newTenant, tax_number: e.target.value })}
                      placeholder="e.g. BIN-9988776655"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* STEP 4: PRIMARY CLIENT OWNER ACCOUNT */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>4. Client Owner Administrator Account</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Owner Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="input-new-tenant-owner-name"
                      type="text"
                      required
                      value={newTenant.owner_name}
                      onChange={(e) => setNewTenant({ ...newTenant, owner_name: e.target.value })}
                      placeholder="e.g. Md. Tofayel Ahmed"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Owner Email / Login <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="input-new-tenant-owner-email"
                      type="email"
                      required
                      value={newTenant.owner_email}
                      onChange={(e) => setNewTenant({ ...newTenant, owner_email: e.target.value })}
                      placeholder="tofayelah@gmail.com"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Contact Mobile (+880...)
                    </label>
                    <input
                      type="text"
                      value={newTenant.owner_phone || ''}
                      onChange={(e) => setNewTenant({ ...newTenant, owner_phone: e.target.value })}
                      placeholder="+880 1712-345678"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* STEP 5: STRICT TENANT DATA ISOLATION CONFIRMATION */}
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Strict Multi-Tenant Isolation Guarantee</span>
                </div>
                <p className="text-emerald-700 text-[11px] leading-relaxed">
                  Upon onboarding, a unique Tenant Isolation Key will be assigned. All products, invoices, stock, suppliers, and customer ledgers will be strictly scoped. Other tenants (e.g. Arif or Tamim) cannot view or access this company's data.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-register-tenant"
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  {saving ? 'Deploying Tenant...' : 'Onboard Tenant & Deploy Subdomain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT / CONFIGURE EXISTING COMPANY                                  */}
      {/* ========================================================================= */}
      {isEditModalOpen && editingTargetCompany && (
        <div 
          id="modal-edit-company"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Configure Company: {editingTargetCompany.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update subdomain routing, vertical features, and corporate settings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company Display Name</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Subdomain Slug</label>
                  <input
                    type="text"
                    required
                    value={editFormData.subdomain}
                    onChange={(e) => setEditFormData({ ...editFormData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-indigo-900 font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Business Type Vertical</label>
                  <select
                    value={editFormData.business_type}
                    onChange={(e) => setEditFormData({ ...editFormData, business_type: e.target.value as BusinessType })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="MOBILE_ELECTRONICS">Mobile & Electronics (Mobi Sale)</option>
                    <option value="TOYS_GAMES">Toys & Kids World (Toys Sale)</option>
                    <option value="GARMENTS_APPAREL">Fashion & Apparel (Under Garments Sale)</option>
                    <option value="GROCERY_FMCG">Supermarket & FMCG</option>
                    <option value="PHARMACY_HEALTHCARE">Pharmacy & Healthcare</option>
                    <option value="GENERAL_RETAIL">General Retail & Departmental</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Organization Code</label>
                  <input
                    type="text"
                    value={editFormData.code}
                    onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Owner Full Name</label>
                  <input
                    type="text"
                    value={editFormData.owner_name}
                    onChange={(e) => setEditFormData({ ...editFormData, owner_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Owner Email</label>
                  <input
                    type="email"
                    value={editFormData.owner_email}
                    onChange={(e) => setEditFormData({ ...editFormData, owner_email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Custom Domain</label>
                  <input
                    type="text"
                    value={editFormData.custom_domain}
                    onChange={(e) => setEditFormData({ ...editFormData, custom_domain: e.target.value })}
                    placeholder="pos.clientdomain.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Headquarters Address</label>
                <textarea
                  rows={2}
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"
                />
              </div>

              {/* Feature Toggles */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-bold text-slate-800 block">Vertical Features Toggle</span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editFormData.features_enabled?.imei_serial_tracking)}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        features_enabled: { ...editFormData.features_enabled, imei_serial_tracking: e.target.checked }
                      })}
                      className="rounded text-indigo-600"
                    />
                    <span>IMEI / Serial Number Tracking</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editFormData.features_enabled?.warranty_management)}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        features_enabled: { ...editFormData.features_enabled, warranty_management: e.target.checked }
                      })}
                      className="rounded text-indigo-600"
                    />
                    <span>Warranty Management</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editFormData.features_enabled?.size_color_matrix)}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        features_enabled: { ...editFormData.features_enabled, size_color_matrix: e.target.checked }
                      })}
                      className="rounded text-indigo-600"
                    />
                    <span>Size & Color Variant Matrix</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editFormData.features_enabled?.batch_expiry_tracking)}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        features_enabled: { ...editFormData.features_enabled, batch_expiry_tracking: e.target.checked }
                      })}
                      className="rounded text-indigo-600"
                    />
                    <span>Batch & Expiry Dates</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm cursor-pointer"
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
