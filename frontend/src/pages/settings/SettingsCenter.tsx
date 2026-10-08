import React, { useEffect, useState, useMemo } from 'react';
import {
  Settings,
  Building2,
  ShieldCheck,
  Receipt,
  ShoppingCart,
  Truck,
  Boxes,
  Calculator,
  Percent,
  CreditCard,
  Users,
  Briefcase,
  Globe,
  Bell,
  Hash,
  BarChart3,
  Database,
  Languages,
  FileCheck,
  Server,
  AlertTriangle,
  Save,
  RotateCcw,
  CheckCircle2,
  Lock,
  Search,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { settingsApi, SettingGroupMeta, SettingField, SystemInfoData } from '../../api/settings';
import { useLanguage } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';

interface TabItem {
  key: string;
  label: string;
  bnLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  isDangerous?: boolean;
}

const TABS: TabItem[] = [
  { key: 'general', label: 'General', bnLabel: 'সাধারণ', icon: Settings },
  { key: 'company', label: 'Company & Org', bnLabel: 'কোম্পানি ও সংস্থা', icon: Building2 },
  { key: 'security', label: 'Users & Security', bnLabel: 'ব্যবহারকারী ও নিরাপত্তা', icon: ShieldCheck, isDangerous: true },
  { key: 'pos', label: 'Point of Sale (POS)', bnLabel: 'পয়েন্ট অব সেল (পিওএস)', icon: Receipt },
  { key: 'sales', label: 'Sales & Invoicing', bnLabel: 'বিক্রয় ও ইনভয়েসিং', icon: ShoppingCart },
  { key: 'purchase', label: 'Procurement', bnLabel: 'ক্রয় ও সংগ্রহ', icon: Truck },
  { key: 'inventory', label: 'Inventory', bnLabel: 'ইনভেন্টরি ও গুদাম', icon: Boxes, isDangerous: true },
  { key: 'accounting', label: 'Accounting & GL', bnLabel: 'অ্যাকাউন্টিং ও সাধারণ খতিয়ান', icon: Calculator, isDangerous: true },
  { key: 'vat', label: 'VAT & Tax', bnLabel: 'বাংলাদেশ ভ্যাট ও কর', icon: Percent, isDangerous: true },
  { key: 'payments', label: 'Payment Tenders', bnLabel: 'পেমেন্ট ও মাধ্যম', icon: CreditCard, isDangerous: true },
  { key: 'crm', label: 'Customers & CRM', bnLabel: 'গ্রাহক ও সিআরএম', icon: Users },
  { key: 'hr', label: 'HR & Payroll', bnLabel: 'এইচআর ও পেরোল', icon: Briefcase },
  { key: 'ecommerce', label: 'E-Commerce', bnLabel: 'ই-কমার্স ও ওমনিচ্যানেল', icon: Globe },
  { key: 'notifications', label: 'Notifications', bnLabel: 'বিজ্ঞপ্তি ও অ্যালার্ট', icon: Bell },
  { key: 'numbering', label: 'Document Numbering', bnLabel: 'ডকুমেন্ট নম্বর বিন্যাস', icon: Hash },
  { key: 'bi', label: 'BI & Reporting', bnLabel: 'বিআই ও রিপোর্টিং', icon: BarChart3 },
  { key: 'maintenance', label: 'Maintenance', bnLabel: 'ব্যাকআপ ও রক্ষণাবেক্ষণ', icon: Database, isDangerous: true },
  { key: 'localization', label: 'Localization', bnLabel: 'স্থানীয়করণ ও বিন্যাস', icon: Languages },
  { key: 'audit', label: 'Audit & Compliance', bnLabel: 'অডিট ও সম্মতি', icon: FileCheck },
  { key: 'system', label: 'System Info', bnLabel: 'সিস্টেম তথ্য', icon: Server },
];

const ACRONYMS: Record<string, string> = {
  bin: 'BIN',
  tin: 'TIN',
  po: 'PO',
  grn: 'GRN',
  pos: 'POS',
  vat: 'VAT',
  vds: 'VDS',
  crm: 'CRM',
  hr: 'HR',
  bi: 'BI',
  sms: 'SMS',
  api: 'API',
  url: 'URL',
  gl: 'GL',
  cod: 'COD',
  wac: 'WAC',
  fifo: 'FIFO',
  kpi: 'KPI',
  bdt: 'BDT',
};

const formatFieldLabel = (key: string): string => {
  return key
    .split('_')
    .map((w) => {
      const lower = w.toLowerCase();
      if (ACRONYMS[lower]) return ACRONYMS[lower];
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
};

export const SettingsCenter: React.FC = () => {
  const { t, language } = useLanguage();
  const { user, hasPermission, hasRole } = useAuth();

  const [activeTab, setActiveTab] = useState<string>('general');
  const [groupsMeta, setGroupsMeta] = useState<Record<string, SettingGroupMeta>>({});
  const [groupSettings, setGroupSettings] = useState<Record<string, SettingField>>({});
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [initialData, setInitialData] = useState<Record<string, any>>({});
  const [systemInfo, setSystemInfo] = useState<SystemInfoData | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tabFilter, setTabFilter] = useState<string>('');
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Numbering preview state
  const [previewDocType, setPreviewDocType] = useState<string>('sales_invoice');
  const [previewResult, setPreviewResult] = useState<string>('');
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);

  // Check if form is dirty
  const isDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialData);
  }, [formData, initialData]);

  // Load group metadata and active tab settings
  useEffect(() => {
    loadGroupsAndActiveTab(activeTab);
  }, [activeTab]);

  const loadGroupsAndActiveTab = async (group: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const groups = await settingsApi.getGroups();
      setGroupsMeta(groups);

      if (group === 'system') {
        const sysInfo = await settingsApi.getSystemInfo();
        setSystemInfo(sysInfo);
        setGroupSettings({});
        setFormData({});
        setInitialData({});
      } else {
        const data = await settingsApi.getGroupSettings(group);
        setGroupSettings(data.settings || {});

        const rawValues: Record<string, any> = {};
        Object.entries(data.settings || {}).forEach(([k, field]) => {
          rawValues[k] = field.value;
        });

        setFormData(rawValues);
        setInitialData(rawValues);

        if (group === 'numbering') {
          fetchNumberingPreview('sales_invoice');
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Failed to load settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (newTab: string) => {
    if (isDirty) {
      const confirmed = window.confirm(
        t('settings.unsavedWarning', 'You have unsaved changes in this tab. Are you sure you want to switch tabs?')
      );
      if (!confirmed) return;
    }
    setActiveTab(newTab);
  };

  const handleInputChange = (key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleReset = () => {
    setFormData({ ...initialData });
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await settingsApi.updateGroupSettings(activeTab, formData);
      setSuccessMessage(res.message || t('settings.saveSuccess', 'Settings updated successfully.'));

      if (res.data?.settings) {
        setGroupSettings(res.data.settings);
        const updatedRaw: Record<string, any> = {};
        Object.entries(res.data.settings).forEach(([k, field]: [string, any]) => {
          updatedRaw[k] = field.value;
        });
        setFormData(updatedRaw);
        setInitialData(updatedRaw);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('settings.saveError', 'Failed to save settings.');
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const fetchNumberingPreview = async (type: string) => {
    setIsPreviewLoading(true);
    try {
      const preview = await settingsApi.previewNumbering(type);
      setPreviewResult(preview);
      setPreviewDocType(type);
    } catch {
      setPreviewResult('');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const canEditCurrentTab = useMemo(() => {
    if (hasRole('Super Admin') || hasRole('Admin')) return true;
    if (activeTab === 'system') return false;

    const groupMeta = groupsMeta[activeTab];
    if (groupMeta?.permission && hasPermission(groupMeta.permission)) {
      return true;
    }
    return hasPermission('settings.update');
  }, [user, activeTab, groupsMeta]);

  const filteredTabs = useMemo(() => {
    if (!tabFilter) return TABS;
    const q = tabFilter.toLowerCase();
    return TABS.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.bnLabel.toLowerCase().includes(q) ||
        t.key.toLowerCase().includes(q)
    );
  }, [tabFilter]);

  const currentTabItem = TABS.find((t) => t.key === activeTab) || TABS[0];
  const isDangerousTab = currentTabItem.isDangerous;

  return (
    <div className="w-full min-w-0 min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 pb-24">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800 w-full min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {t('settings.title', 'ERP Configuration Center')}
                </h1>
                {isDirty && (
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                    {t('settings.unsavedChanges', 'Unsaved Changes')}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                {t('settings.subtitle', 'Centralized enterprise settings, operational parameters, and business rules')}
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
          {activeTab !== 'system' && (
            <>
              <button
                type="button"
                onClick={handleReset}
                disabled={!isDirty || isSaving}
                className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700/80 rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t('settings.reset', 'Reset Changes')}
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || isSaving || !canEditCurrentTab}
                className="px-4.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                {isSaving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {isSaving ? t('settings.saving', 'Saving...') : t('settings.saveChanges', 'Save Configuration')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5 w-full min-w-0">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5 w-full min-w-0">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Main Responsive Layout: Left Nav Sidebar + Right Settings Form */}
      <div className="flex flex-col lg:flex-row gap-6 mt-6 w-full min-w-0 items-start">
        {/* Settings Navigation Sidebar */}
        <aside className="w-full lg:w-64 xl:w-72 lg:shrink-0 min-w-0">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 backdrop-blur-md lg:sticky lg:top-4 w-full min-w-0 shadow-sm">
            {/* Search Box */}
            <div className="relative mb-3 w-full min-w-0">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder={t('header.searchPlaceholder', 'Filter settings...')}
                value={tabFilter}
                onChange={(e) => setTabFilter(e.target.value)}
                className="w-full pl-8.5 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition box-border"
              />
            </div>

            {/* Tabs List */}
            <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-y-auto max-h-none lg:max-h-[calc(100vh-230px)] p-0.5 scrollbar-thin">
              {filteredTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => handleTabChange(tab.key)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition text-left shrink-0 lg:shrink cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate whitespace-nowrap text-xs">
                        {language === 'bn' ? tab.bnLabel : tab.label}
                      </span>
                    </div>
                    {tab.isDangerous && !isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 ml-2" title="Sensitive Module" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Settings Content Area */}
        <main className="flex-1 min-w-0 w-full">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 lg:p-7 backdrop-blur-md w-full min-w-0 shadow-sm min-h-[550px]">
            {/* Active Tab Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800/80 mb-6 w-full min-w-0">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
                  {language === 'bn' ? currentTabItem.bnLabel : currentTabItem.label}
                  {activeTab !== 'system' && !canEditCurrentTab && (
                    <span className="text-[11px] font-normal text-rose-400 flex items-center gap-1 bg-rose-500/10 px-2.5 py-0.5 rounded-lg border border-rose-500/20 shrink-0">
                      <Lock className="w-3 h-3" /> Read-Only
                    </span>
                  )}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
                  {groupsMeta[activeTab]?.description || 'Configurable options and behavior for this domain.'}
                </p>
              </div>
            </div>

            {/* Dangerous Module Warning Banner */}
            {isDangerousTab && (
              <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-3 w-full min-w-0">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-semibold text-amber-200">{t('common.warning', 'Warning')}:</span>{' '}
                  {t(
                    'settings.dangerousNotice',
                    'Notice: Modifying these settings directly affects live financial and inventory ledger operations.'
                  )}
                </div>
              </div>
            )}

            {/* Content Loading State */}
            {isLoading ? (
              <div className="py-24 flex flex-col items-center justify-center text-slate-500 gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                <span className="text-xs text-slate-400">Loading configuration parameters...</span>
              </div>
            ) : activeTab === 'system' ? (
              /* SYSTEM INFO TAB */
              <div className="space-y-6 w-full min-w-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full min-w-0">
                  <div className="p-4 sm:p-5 rounded-xl bg-slate-950/60 border border-slate-800/80 w-full min-w-0">
                    <span className="text-[11px] text-slate-400 font-medium block">
                      {t('settings.system.runtime', 'Runtime Stack')}
                    </span>
                    <span className="text-sm font-semibold text-white mt-1 block truncate">
                      {systemInfo?.system_name} ({systemInfo?.system_version})
                    </span>
                    <span className="text-xs text-indigo-400 font-mono mt-0.5 block truncate">
                      {systemInfo?.framework_version || 'Laravel 12.x / React 19'}
                    </span>
                  </div>

                  <div className="p-4 sm:p-5 rounded-xl bg-slate-950/60 border border-slate-800/80 w-full min-w-0">
                    <span className="text-[11px] text-slate-400 font-medium block">
                      {t('settings.system.database', 'Database Engine')}
                    </span>
                    <span className="text-sm font-semibold text-white mt-1 block truncate">
                      {systemInfo?.database?.toUpperCase() === 'PGSQL'
                        ? 'PostgreSQL 16 Enterprise'
                        : systemInfo?.database}
                    </span>
                    <span className="text-xs text-slate-400 font-mono mt-0.5 block truncate">
                      Host: db:5432 / DB: retailcore
                    </span>
                  </div>

                  <div className="p-4 sm:p-5 rounded-xl bg-slate-950/60 border border-slate-800/80 w-full min-w-0">
                    <span className="text-[11px] text-slate-400 font-medium block">
                      {t('settings.system.cache', 'Cache & Queues')}
                    </span>
                    <span className="text-sm font-semibold text-white mt-1 block truncate">
                      Cache: {systemInfo?.cache_driver} / Queue: {systemInfo?.queue_driver}
                    </span>
                    <span className="text-xs text-emerald-400 font-mono mt-0.5 block truncate">
                      Environment: {systemInfo?.environment}
                    </span>
                  </div>

                  <div className="p-4 sm:p-5 rounded-xl bg-slate-950/60 border border-slate-800/80 w-full min-w-0">
                    <span className="text-[11px] text-slate-400 font-medium block">
                      {t('settings.system.serverTime', 'Server Timestamp')}
                    </span>
                    <span className="text-sm font-semibold text-white mt-1 block font-mono truncate">
                      {systemInfo?.server_time}
                    </span>
                    <span className="text-xs text-slate-400 font-mono mt-0.5 block truncate">
                      Timezone: {systemInfo?.timezone}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* DYNAMIC SETTINGS GROUP FORM */
              <form onSubmit={handleSave} className="space-y-6 w-full min-w-0">
                {/* Special Document Numbering Live Preview Component */}
                {activeTab === 'numbering' && (
                  <div className="p-4 sm:p-5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 mb-6 w-full min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-indigo-300 block">
                          {t('settings.numbering.previewResult', 'Document Sequence Live Verification')}
                        </span>
                        <p className="text-xs text-indigo-400/80 mt-0.5">
                          Verify prefix, padding, and next atomic integer sequence before generation.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <select
                          value={previewDocType}
                          onChange={(e) => {
                            setPreviewDocType(e.target.value);
                            fetchNumberingPreview(e.target.value);
                          }}
                          className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="sales_invoice">Sales Invoice (INV-)</option>
                          <option value="pos_sale">POS Sale (POS-)</option>
                          <option value="purchase_order">Purchase Order (PO-)</option>
                          <option value="goods_receipt">Goods Receipt (GRN-)</option>
                          <option value="purchase_invoice">Purchase Invoice (PINV-)</option>
                          <option value="journal">Journal Voucher (JV-)</option>
                          <option value="customer">Customer Code (CUST-)</option>
                          <option value="ecommerce_order">Web Order (ORD-)</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => fetchNumberingPreview(previewDocType)}
                          disabled={isPreviewLoading}
                          className="px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-medium hover:bg-indigo-500 flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {isPreviewLoading ? 'Checking...' : t('settings.numbering.livePreview', 'Preview')}
                        </button>
                      </div>
                    </div>
                    {previewResult && (
                      <div className="mt-4 p-3 rounded-lg bg-slate-950/80 border border-indigo-500/30 flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-medium">Next Counter Preview:</span>
                        <span className="text-base font-mono font-bold text-emerald-400 tracking-wider">{previewResult}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Form Fields 2-Column Responsive Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5 w-full min-w-0">
                  {Object.entries(groupSettings).map(([key, field]: [string, SettingField]) => {
                    const value = formData[key] !== undefined ? formData[key] : field.value;
                    const isBool = field.type === 'boolean';
                    const isNumber = field.type === 'integer' || field.type === 'decimal';
                    const isSensitive = field.sensitive;
                    const labelText = formatFieldLabel(key);

                    if (isBool) {
                      return (
                        <div
                          key={key}
                          className="w-full min-w-0 flex items-center justify-between p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition"
                        >
                          <div className="pr-4 min-w-0 flex-1">
                            <label
                              onClick={() => canEditCurrentTab && handleInputChange(key, !value)}
                              className="text-xs font-semibold text-slate-200 block cursor-pointer break-words"
                            >
                              {labelText}
                            </label>
                            <p className="text-[11px] text-slate-400 block mt-1 leading-relaxed break-words">
                              {field.description || `Enable or disable ${labelText}`}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={!canEditCurrentTab}
                            onClick={() => handleInputChange(key, !value)}
                            className={`shrink-0 w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 focus:outline-none cursor-pointer ${
                              value ? 'bg-indigo-600' : 'bg-slate-800'
                            }`}
                          >
                            <div
                              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                                value ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={key}
                        className="w-full min-w-0 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition flex flex-col justify-between"
                      >
                        <div className="w-full min-w-0 mb-3">
                          <label className="text-xs font-semibold text-slate-200 block break-words mb-1">
                            {labelText}
                          </label>
                          {field.description && (
                            <p className="text-[11px] text-slate-400 leading-relaxed break-words">
                              {field.description}
                            </p>
                          )}
                        </div>

                        <div className="mt-auto w-full min-w-0">
                          {key === 'receipt_size' ? (
                            <select
                              value={value || '80mm'}
                              disabled={!canEditCurrentTab}
                              onChange={(e) => handleInputChange(key, e.target.value)}
                              className="w-full min-w-0 px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition box-border cursor-pointer"
                            >
                              <option value="58mm">58mm (Small Thermal)</option>
                              <option value="80mm">80mm (Standard POS)</option>
                              <option value="A4">A4 (Full Page)</option>
                            </select>
                          ) : key === 'valuation_method' ? (
                            <select
                              value={value || 'moving_average'}
                              disabled={!canEditCurrentTab}
                              onChange={(e) => handleInputChange(key, e.target.value)}
                              className="w-full min-w-0 px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition box-border cursor-pointer"
                            >
                              <option value="moving_average">Moving Average (WAC)</option>
                              <option value="fifo">FIFO (First In First Out)</option>
                            </select>
                          ) : key === 'tax_pricing_mode' ? (
                            <select
                              value={value || 'exclusive'}
                              disabled={!canEditCurrentTab}
                              onChange={(e) => handleInputChange(key, e.target.value)}
                              className="w-full min-w-0 px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition box-border cursor-pointer"
                            >
                              <option value="exclusive">Exclusive (Tax added on checkout)</option>
                              <option value="inclusive">Inclusive (Prices include VAT)</option>
                            </select>
                          ) : key === 'rounding_mode' ? (
                            <select
                              value={value || 'nearest'}
                              disabled={!canEditCurrentTab}
                              onChange={(e) => handleInputChange(key, e.target.value)}
                              className="w-full min-w-0 px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition box-border cursor-pointer"
                            >
                              <option value="nearest">Nearest Integer</option>
                              <option value="round_up">Round Up (Ceil)</option>
                              <option value="round_down">Round Down (Floor)</option>
                              <option value="none">No Rounding</option>
                            </select>
                          ) : key === 'default_language' || key === 'primary_language' ? (
                            <select
                              value={value || 'en'}
                              disabled={!canEditCurrentTab}
                              onChange={(e) => handleInputChange(key, e.target.value)}
                              className="w-full min-w-0 px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition box-border cursor-pointer"
                            >
                              <option value="en">English (English)</option>
                              <option value="bn">বাংলা (Bengali)</option>
                            </select>
                          ) : key === 'number_format_system' ? (
                            <select
                              value={value || 'lakh_crore'}
                              disabled={!canEditCurrentTab}
                              onChange={(e) => handleInputChange(key, e.target.value)}
                              className="w-full min-w-0 px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition box-border cursor-pointer"
                            >
                              <option value="lakh_crore">Lakh / Crore (1,00,000 / 1,00,00,000)</option>
                              <option value="international">International (100,000 / 1,000,000)</option>
                            </select>
                          ) : key === 'first_day_of_week' ? (
                            <select
                              value={value || 'saturday'}
                              disabled={!canEditCurrentTab}
                              onChange={(e) => handleInputChange(key, e.target.value)}
                              className="w-full min-w-0 px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition box-border cursor-pointer"
                            >
                              <option value="saturday">Saturday (শনিবার - Bangladesh Default)</option>
                              <option value="sunday">Sunday (রবিবার)</option>
                              <option value="monday">Monday (সোমবার)</option>
                            </select>
                          ) : key === 'payroll_frequency' ? (
                            <select
                              value={value || 'monthly'}
                              disabled={!canEditCurrentTab}
                              onChange={(e) => handleInputChange(key, e.target.value)}
                              className="w-full min-w-0 px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition box-border cursor-pointer"
                            >
                              <option value="monthly">Monthly</option>
                              <option value="bi-weekly">Bi-Weekly</option>
                              <option value="weekly">Weekly</option>
                            </select>
                          ) : key === 'tax_period_frequency' ? (
                            <select
                              value={value || 'monthly'}
                              disabled={!canEditCurrentTab}
                              onChange={(e) => handleInputChange(key, e.target.value)}
                              className="w-full min-w-0 px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition box-border cursor-pointer"
                            >
                              <option value="monthly">Monthly</option>
                              <option value="quarterly">Quarterly</option>
                              <option value="annual">Annual</option>
                            </select>
                          ) : isSensitive ? (
                            <div className="relative w-full min-w-0">
                              <input
                                type={showPasswordMap[key] ? 'text' : 'password'}
                                value={value !== null && value !== undefined ? value : ''}
                                disabled={!canEditCurrentTab}
                                onChange={(e) => handleInputChange(key, e.target.value)}
                                className="w-full min-w-0 pl-3.5 pr-10 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition box-border"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPasswordMap((prev) => ({ ...prev, [key]: !prev[key] }))}
                                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 focus:outline-none cursor-pointer"
                              >
                                {showPasswordMap[key] ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <input
                              type={isNumber ? 'number' : 'text'}
                              step={field.type === 'decimal' ? '0.01' : '1'}
                              value={value !== null && value !== undefined ? value : ''}
                              disabled={!canEditCurrentTab}
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (isNumber) {
                                  handleInputChange(key, raw === '' ? null : Number(raw));
                                } else {
                                  handleInputChange(key, raw);
                                }
                              }}
                              className="w-full min-w-0 px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition box-border"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Save Action Bar */}
                <div className="pt-5 mt-6 flex items-center justify-end gap-3 border-t border-slate-800 w-full min-w-0">
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={!isDirty || isSaving}
                    className="px-4 py-2.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700 rounded-xl hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer"
                  >
                    {t('settings.reset', 'Reset')}
                  </button>
                  <button
                    type="submit"
                    disabled={!isDirty || isSaving || !canEditCurrentTab}
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 disabled:opacity-40 transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
                  >
                    {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    {isSaving ? t('settings.saving', 'Saving...') : t('settings.saveChanges', 'Save Configuration')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
