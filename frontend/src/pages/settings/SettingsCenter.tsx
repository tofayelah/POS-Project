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
  Download,
  Trash2,
  HardDrive,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Check,
  X,
} from 'lucide-react';
import {
  settingsApi,
  SettingGroupMeta,
  SettingField,
  SystemInfoData,
  MaintenanceOverviewData,
  ResetPreviewData,
  ResetExecuteResult,
  DemoPreviewData,
} from '../../api/settings';
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

  // Maintenance Center states
  const [maintenanceOverview, setMaintenanceOverview] = useState<MaintenanceOverviewData | null>(null);
  const [backupNote, setBackupNote] = useState<string>('');
  const [isBackupLoading, setIsBackupLoading] = useState<boolean>(false);
  const [backupProgressText, setBackupProgressText] = useState<string>('');
  const [showMaintenanceConfig, setShowMaintenanceConfig] = useState<boolean>(false);

  // Reset states
  const [resetPreview, setResetPreview] = useState<ResetPreviewData | null>(null);
  const [isResetPreviewLoading, setIsResetPreviewLoading] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [resetConfirmText, setResetConfirmText] = useState<string>('');
  const [resetPassword, setResetPassword] = useState<string>('');
  const [resetStep, setResetStep] = useState<number>(1);
  const [isResetExecuting, setIsResetExecuting] = useState<boolean>(false);
  const [resetProgressText, setResetProgressText] = useState<string>('');
  const [resetResult, setResetResult] = useState<ResetExecuteResult | null>(null);

  // Demo states
  const [demoSize, setDemoSize] = useState<string>('small');
  const [demoPreview, setDemoPreview] = useState<DemoPreviewData | null>(null);
  const [isDemoPreviewLoading, setIsDemoPreviewLoading] = useState<boolean>(false);
  const [isDemoLoading, setIsDemoLoading] = useState<boolean>(false);
  const [showDemoModal, setShowDemoModal] = useState<boolean>(false);

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

        if (group === 'maintenance') {
          try {
            const overview = await settingsApi.maintenance.getOverview();
            setMaintenanceOverview(overview);
          } catch {
            // Gracefully handled if user lacks overview permission
          }
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

  const handleCreateBackup = async () => {
    setIsBackupLoading(true);
    setBackupProgressText(t('settings.maintenance.progressPrep', 'Preparing backup...'));
    setErrorMessage(null);
    setSuccessMessage(null);

    const timer1 = setTimeout(() => setBackupProgressText(t('settings.maintenance.progressDump', 'Creating database dump via pg_dump...')), 350);
    const timer2 = setTimeout(() => setBackupProgressText(t('settings.maintenance.progressSaving', 'Compressing & saving to secure storage...')), 850);
    const timer3 = setTimeout(() => setBackupProgressText(t('settings.maintenance.progressVerifying', 'Verifying checksum & metadata...')), 1350);

    try {
      const res = await settingsApi.maintenance.createBackup(backupNote || undefined);
      setBackupProgressText(t('settings.maintenance.progressDone', 'Completed.'));
      setSuccessMessage(res.message || t('settings.maintenance.backupSuccess', 'Database backup completed successfully.'));
      setBackupNote('');
      const updatedOverview = await settingsApi.maintenance.getOverview();
      setMaintenanceOverview(updatedOverview);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || t('settings.maintenance.backupError', 'Failed to create database backup.'));
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setIsBackupLoading(false);
      setBackupProgressText('');
    }
  };

  const handleDownloadBackup = async (id: number) => {
    try {
      await settingsApi.maintenance.downloadBackup(id);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || t('settings.maintenance.downloadError', 'Failed to download backup file.'));
    }
  };

  const handleFetchResetPreview = async () => {
    setIsResetPreviewLoading(true);
    setErrorMessage(null);
    try {
      const preview = await settingsApi.maintenance.previewReset();
      setResetPreview(preview);
      setShowResetModal(true);
      setResetStep(1);
      setResetConfirmText('');
      setResetPassword('');
      setResetResult(null);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || t('settings.maintenance.previewError', 'Failed to generate reset preview.'));
    } finally {
      setIsResetPreviewLoading(false);
    }
  };

  const handleExecuteReset = async () => {
    setIsResetExecuting(true);
    setResetProgressText(t('settings.maintenance.resetProgress1', 'Creating safety database backup...'));
    setErrorMessage(null);

    const t1 = setTimeout(() => setResetProgressText(t('settings.maintenance.resetProgress2', 'Verifying safety backup completion...')), 750);
    const t2 = setTimeout(() => setResetProgressText(t('settings.maintenance.resetProgress3', 'Removing transactional data in safe dependency order...')), 1500);
    const t3 = setTimeout(() => setResetProgressText(t('settings.maintenance.resetProgress4', 'Running post-reset system integrity checks...')), 2250);

    try {
      const result = await settingsApi.maintenance.executeReset({
        confirmation_text: resetConfirmText,
        password: resetPassword || undefined,
        mode: 'TRANSACTIONAL_DATA',
      });
      setResetResult(result);
      setResetStep(5); // Completion screen
      setSuccessMessage(t('settings.maintenance.resetSuccess', 'Transactional data reset completed successfully.'));
      const updatedOverview = await settingsApi.maintenance.getOverview();
      setMaintenanceOverview(updatedOverview);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || t('settings.maintenance.resetError', 'Data reset failed.'));
      setShowResetModal(false);
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setIsResetExecuting(false);
      setResetProgressText('');
    }
  };

  const handleFetchDemoPreview = async () => {
    setIsDemoPreviewLoading(true);
    setErrorMessage(null);
    try {
      const preview = await settingsApi.maintenance.previewDemo(demoSize);
      setDemoPreview(preview);
      setShowDemoModal(true);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || t('settings.maintenance.demoPreviewError', 'Failed to generate demo preview.'));
    } finally {
      setIsDemoPreviewLoading(false);
    }
  };

  const handleInsertDemo = async () => {
    setIsDemoLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await settingsApi.maintenance.insertDemo(demoSize);
      if (res.already_exists) {
        setErrorMessage(res.message);
      } else {
        setSuccessMessage(res.message || t('settings.maintenance.demoSuccess', 'Demo data inserted successfully.'));
        setShowDemoModal(false);
        const updatedOverview = await settingsApi.maintenance.getOverview();
        setMaintenanceOverview(updatedOverview);
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || t('settings.maintenance.demoError', 'Failed to insert demo data.'));
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleRemoveDemo = async () => {
    const confirmed = window.confirm(
      t('settings.maintenance.removeDemoConfirm', 'Are you sure you want to remove all demonstration records? Real production data will NOT be touched.')
    );
    if (!confirmed) return;

    setIsDemoLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await settingsApi.maintenance.removeDemo();
      setSuccessMessage(res.message || t('settings.maintenance.demoRemovedSuccess', 'Demo records removed successfully.'));
      const updatedOverview = await settingsApi.maintenance.getOverview();
      setMaintenanceOverview(updatedOverview);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || t('settings.maintenance.demoRemoveError', 'Failed to remove demo data.'));
    } finally {
      setIsDemoLoading(false);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 lg:p-6 pb-20">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                {t('settings.title', 'ERP Configuration Center')}
                {isDirty && (
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {t('settings.unsavedChanges', 'Unsaved Changes')}
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400">
                {t('settings.subtitle', 'Centralized enterprise settings, operational parameters, and business rules')}
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          {activeTab !== 'system' && (
            <>
              <button
                type="button"
                onClick={handleReset}
                disabled={!isDirty || isSaving}
                className="px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700/80 rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t('settings.reset', 'Reset Changes')}
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || isSaving || !canEditCurrentTab}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer"
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
        <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Grid: Left Tabs + Right Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Left Tabs Column */}
        <div className="lg:col-span-3">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 backdrop-blur-md sticky top-4">
            {/* Search Box */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder={t('header.searchPlaceholder', 'Filter settings...')}
                value={tabFilter}
                onChange={(e) => setTabFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Tabs List */}
            <nav className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
              {filteredTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => handleTabChange(tab.key)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition text-left cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">
                        {language === 'bn' ? tab.bnLabel : tab.label}
                      </span>
                    </div>
                    {tab.isDangerous && !isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Sensitive Module" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-9">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md min-h-[550px]">
            {/* Active Tab Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800 mb-6">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  {language === 'bn' ? currentTabItem.bnLabel : currentTabItem.label}
                  {activeTab !== 'system' && !canEditCurrentTab && (
                    <span className="text-[11px] font-normal text-rose-400 flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                      <Lock className="w-3 h-3" /> Read-Only
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
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
            ) : activeTab === 'maintenance' ? (
              /* MAINTENANCE CENTER TAB */
              <div className="space-y-6 w-full min-w-0">
                {/* Maintenance Engine Header Banner */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-wrap items-center justify-between gap-4 w-full min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        {t('settings.maintenance.hubTitle', 'System Maintenance & Resilience Center')}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          Production Ready
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Authoritative administrative controls: database snapshots, transactional resets, and demo datasets.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-300 font-mono">
                      Engine: <strong className="text-emerald-400">{maintenanceOverview?.database.driver.toUpperCase() || 'POSTGRESQL'}</strong>
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-300 font-mono">
                      DB: <strong className="text-indigo-400">{maintenanceOverview?.database.name || 'retailcore'}</strong>
                    </span>
                    <span className={`px-3 py-1 rounded-lg border font-mono ${
                      maintenanceOverview?.environment.is_production
                        ? 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                        : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                    }`}>
                      ENV: <strong>{maintenanceOverview?.environment.app_env.toUpperCase() || 'LOCAL'}</strong>
                    </span>
                  </div>
                </div>

                {/* 3 CORE MAINTENANCE CARDS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 w-full min-w-0">
                  {/* CARD 1: DATABASE BACKUP */}
                  <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between w-full min-w-0">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                            <HardDrive className="w-4 h-4" />
                          </div>
                          <h4 className="text-sm font-bold text-white">
                            {t('settings.maintenance.backupTitle', 'Manual Database Backup')}
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          pg_dump Native
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4">
                        {t(
                          'settings.maintenance.backupDesc',
                          'Create a complete database backup before performing maintenance or destructive operations.'
                        )}
                      </p>

                      <div className="space-y-2 mb-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs">
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-400">Total Backups:</span>
                          <span className="font-semibold text-white">{maintenanceOverview?.backups.total_count ?? 0}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-400">Last Backup:</span>
                          <span className="font-mono text-emerald-400 text-[11px] truncate max-w-[150px]">
                            {maintenanceOverview?.backups.last_backup ? maintenanceOverview.backups.last_backup.file_size_human : 'None yet'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-400">Storage Target:</span>
                          <span className="font-mono text-indigo-300 text-[11px]">storage/app/private</span>
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="text-[11px] font-medium text-slate-400 block mb-1">
                          Backup Description / Note (Optional)
                        </label>
                        <input
                          type="text"
                          value={backupNote}
                          onChange={(e) => setBackupNote(e.target.value)}
                          placeholder="e.g. Pre-maintenance manual snapshot"
                          disabled={isBackupLoading}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={handleCreateBackup}
                        disabled={isBackupLoading || !canEditCurrentTab}
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer"
                      >
                        {isBackupLoading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>{backupProgressText || 'Creating backup...'}</span>
                          </>
                        ) : (
                          <>
                            <HardDrive className="w-3.5 h-3.5" />
                            <span>{t('settings.maintenance.createBackupBtn', 'Create Database Backup')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* CARD 2: DATA RESET */}
                  <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-900/40 flex flex-col justify-between w-full min-w-0">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-rose-900/40 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                            <ShieldAlert className="w-4 h-4" />
                          </div>
                          <h4 className="text-sm font-bold text-white">
                            {t('settings.maintenance.resetTitle', 'Data Reset')}
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Super Admin Only
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-rose-900/30 border border-rose-500/30 text-[11px] text-rose-300 leading-relaxed mb-3 flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>WARNING:</strong> This operation permanently removes selected operational data. A safety backup is automatically created first.
                        </span>
                      </div>

                      <div className="space-y-1.5 mb-4 text-xs">
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-400">Target Scope:</span>
                          <span className="font-semibold text-rose-300">Transactional Operations</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-400">Environment Status:</span>
                          <span className={`text-[11px] font-mono font-bold ${
                            maintenanceOverview?.environment.is_production && !maintenanceOverview?.environment.allow_destructive_reset
                              ? 'text-rose-400'
                              : 'text-amber-400'
                          }`}>
                            {maintenanceOverview?.environment.is_production && !maintenanceOverview?.environment.allow_destructive_reset
                              ? 'BLOCKED IN PROD'
                              : 'GUARDED (ENABLED)'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 pt-1 leading-normal">
                          Preserves Users, Roles, Chart of Accounts, Product Master, Customer Master, Taxes, Settings, and Audit Logs.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleFetchResetPreview}
                        disabled={isResetPreviewLoading}
                        className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-700/80 hover:bg-slate-800 disabled:opacity-50 transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {isResetPreviewLoading ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Eye className="w-3 h-3 text-slate-400" />
                        )}
                        <span>{t('settings.maintenance.previewResetBtn', 'Preview Reset')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleFetchResetPreview}
                        disabled={
                          !hasRole('Super Admin') ||
                          (maintenanceOverview?.environment.is_production && !maintenanceOverview?.environment.allow_destructive_reset)
                        }
                        className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 disabled:opacity-40 transition flex items-center justify-center gap-1.5 shadow-md shadow-rose-900/30 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{t('settings.maintenance.resetDataBtn', 'Reset Data')}</span>
                      </button>
                    </div>
                  </div>

                  {/* CARD 3: DEMO DATA */}
                  <div className="p-5 rounded-2xl bg-purple-950/20 border border-purple-900/40 flex flex-col justify-between w-full min-w-0">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-purple-900/40 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <h4 className="text-sm font-bold text-white">
                            {t('settings.maintenance.demoTitle', 'Insert Demo Data')}
                          </h4>
                        </div>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          maintenanceOverview?.demo.has_demo
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {maintenanceOverview?.demo.has_demo ? 'Demo Active' : 'Clean State'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4">
                        {t(
                          'settings.maintenance.demoDesc',
                          'Insert realistic demonstration records for testing and training (Apex Retail Demo Ltd. - Bangladesh Profile).'
                        )}
                      </p>

                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 mb-4 text-xs space-y-1.5">
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-400">Status:</span>
                          <span className="font-semibold text-purple-300">
                            {maintenanceOverview?.demo.has_demo ? `${maintenanceOverview.demo.total_records} Records Tracked` : 'No Demo Data'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="text-slate-400">Dataset Volume:</span>
                          <select
                            value={demoSize}
                            onChange={(e) => setDemoSize(e.target.value)}
                            disabled={isDemoLoading || !!maintenanceOverview?.demo.has_demo}
                            className="px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
                          >
                            <option value="small">Small (~20 prod, ~50 sales)</option>
                            <option value="medium">Medium (~100 prod, ~200 sales)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleFetchDemoPreview}
                          disabled={isDemoPreviewLoading}
                          className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-700/80 hover:bg-slate-800 disabled:opacity-50 transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {isDemoPreviewLoading ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Eye className="w-3 h-3 text-slate-400" />
                          )}
                          <span>{t('settings.maintenance.previewDemoBtn', 'Preview Demo')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleInsertDemo}
                          disabled={isDemoLoading || !!maintenanceOverview?.demo.has_demo || !canEditCurrentTab}
                          className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-40 transition flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20 cursor-pointer"
                        >
                          {isDemoLoading ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          <span>{t('settings.maintenance.insertDemoBtn', 'Insert Demo')}</span>
                        </button>
                      </div>

                      {maintenanceOverview?.demo.has_demo && hasRole('Super Admin') && (
                        <button
                          type="button"
                          onClick={handleRemoveDemo}
                          disabled={isDemoLoading}
                          className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-rose-400 bg-rose-950/20 border border-rose-800/40 hover:bg-rose-900/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{t('settings.maintenance.removeDemoBtn', 'Remove Demo Data Only')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* RECENT BACKUPS AUDIT TABLE */}
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 w-full min-w-0">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-indigo-400" />
                      <span>{t('settings.maintenance.recentBackups', 'Recent Database Backups Archive')}</span>
                    </h4>
                    <span className="text-xs text-slate-400">
                      Showing latest {maintenanceOverview?.backups.recent?.length ?? 0} archives
                    </span>
                  </div>

                  {(!maintenanceOverview?.backups.recent || maintenanceOverview.backups.recent.length === 0) ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No database backups have been generated yet. Use the Create Backup action above.
                    </div>
                  ) : (
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400">
                            <th className="pb-2.5 font-medium">Filename</th>
                            <th className="pb-2.5 font-medium">Size</th>
                            <th className="pb-2.5 font-medium">Status</th>
                            <th className="pb-2.5 font-medium">Created By</th>
                            <th className="pb-2.5 font-medium">Created At</th>
                            <th className="pb-2.5 font-medium">SHA-256 Checksum</th>
                            <th className="pb-2.5 font-medium text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {maintenanceOverview.backups.recent.map((b) => (
                            <tr key={b.id} className="text-slate-300 hover:bg-slate-900/50 transition">
                              <td className="py-2.5 font-mono text-[11px] text-indigo-300 max-w-[220px] truncate" title={b.filename}>
                                {b.filename}
                              </td>
                              <td className="py-2.5 font-medium text-white">{b.file_size_human}</td>
                              <td className="py-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                                  b.status === 'COMPLETED'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : b.status === 'RUNNING'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                }`}>
                                  {b.status}
                                </span>
                              </td>
                              <td className="py-2.5 text-slate-400">{b.created_by}</td>
                              <td className="py-2.5 text-slate-400 whitespace-nowrap">
                                {new Date(b.created_at).toLocaleString()}
                              </td>
                              <td className="py-2.5 font-mono text-[10px] text-slate-500 max-w-[120px] truncate" title={b.checksum || 'N/A'}>
                                {b.checksum ? b.checksum.substring(0, 16) + '...' : 'N/A'}
                              </td>
                              <td className="py-2.5 text-right">
                                {b.status === 'COMPLETED' && (
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadBackup(b.id)}
                                    className="px-2.5 py-1 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600 hover:text-white transition text-[11px] inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>Download</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* COLLAPSIBLE MAINTENANCE CONFIGURATION PARAMETERS */}
                <div className="rounded-2xl bg-slate-950/40 border border-slate-800/80 overflow-hidden w-full min-w-0">
                  <button
                    type="button"
                    onClick={() => setShowMaintenanceConfig((prev) => !prev)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-900/40 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-bold text-slate-200">
                        {t('settings.maintenance.configToggle', 'Standard Maintenance Configuration Parameters (Schedules & Drivers)')}
                      </span>
                    </div>
                    {showMaintenanceConfig ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {showMaintenanceConfig && (
                    <div className="p-5 border-t border-slate-800 bg-slate-950/60">
                      <form onSubmit={handleSave} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {Object.entries(groupSettings).map(([key, field]: [string, SettingField]) => {
                            const value = formData[key] !== undefined ? formData[key] : field.value;
                            const isBool = field.type === 'boolean';
                            const labelText = formatFieldLabel(key);

                            if (isBool) {
                              return (
                                <div
                                  key={key}
                                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 transition"
                                >
                                  <div className="pr-3">
                                    <label
                                      onClick={() => canEditCurrentTab && handleInputChange(key, !value)}
                                      className="text-xs font-medium text-slate-200 block cursor-pointer"
                                    >
                                      {labelText}
                                    </label>
                                    <p className="text-[11px] text-slate-400 block mt-0.5">
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
                                className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 transition flex flex-col justify-between"
                              >
                                <div>
                                  <label className="text-xs font-medium text-slate-200 block">
                                    {labelText}
                                  </label>
                                  {field.description && (
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      {field.description}
                                    </p>
                                  )}
                                </div>

                                <div className="mt-2.5">
                                  <input
                                    type={field.type === 'integer' ? 'number' : 'text'}
                                    value={value ?? ''}
                                    disabled={!canEditCurrentTab}
                                    onChange={(e) => handleInputChange(key, e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={handleReset}
                            disabled={!isDirty || isSaving}
                            className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700 rounded-xl hover:bg-slate-800 transition cursor-pointer"
                          >
                            {t('settings.reset', 'Reset')}
                          </button>
                          <button
                            type="submit"
                            disabled={!isDirty || isSaving || !canEditCurrentTab}
                            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition flex items-center gap-1.5 cursor-pointer"
                          >
                            {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                            <span>{t('settings.saveChanges', 'Save Maintenance Parameters')}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
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

                {/* Form Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                          className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 transition"
                        >
                          <div className="pr-3">
                            <label
                              onClick={() => canEditCurrentTab && handleInputChange(key, !value)}
                              className="text-xs font-medium text-slate-200 block cursor-pointer"
                            >
                              {labelText}
                            </label>
                            <p className="text-[11px] text-slate-400 block mt-0.5">
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
                        className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 transition flex flex-col justify-between"
                      >
                        <div>
                          <label className="text-xs font-medium text-slate-200 block">
                            {labelText}
                          </label>
                          {field.description && (
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {field.description}
                            </p>
                          )}
                        </div>

                        <div className="mt-2.5">
                          {key === 'receipt_size' ? (
                            <select
                              value={value || '80mm'}
                              disabled={!canEditCurrentTab}
                              onChange={(e) => handleInputChange(key, e.target.value)}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
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
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                            >
                              <option value="moving_average">Moving Average (WAC)</option>
                              <option value="fifo">FIFO (First In First Out)</option>
                            </select>
                          ) : key === 'tax_pricing_mode' ? (
                            <select
                              value={value || 'exclusive'}
                              disabled={!canEditCurrentTab}
                              onChange={(e) => handleInputChange(key, e.target.value)}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                            >
                              <option value="exclusive">Exclusive (Tax added on checkout)</option>
                              <option value="inclusive">Inclusive (Prices include VAT)</option>
                            </select>
                          ) : key === 'rounding_mode' ? (
                            <select
                              value={value || 'nearest'}
                              disabled={!canEditCurrentTab}
                              onChange={(e) => handleInputChange(key, e.target.value)}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
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
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                            >
                              <option value="en">English (English)</option>
                              <option value="bn">বাংলা (Bengali)</option>
                            </select>
                          ) : key === 'number_format_system' ? (
                            <select
                              value={value || 'lakh_crore'}
                              disabled={!canEditCurrentTab}
                              onChange={(e) => handleInputChange(key, e.target.value)}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                            >
                              <option value="lakh_crore">Lakh / Crore (1,00,000 / 1,00,00,000)</option>
                              <option value="international">International (100,000 / 1,000,000)</option>
                            </select>
                          ) : key === 'first_day_of_week' ? (
                            <select
                              value={value || 'saturday'}
                              disabled={!canEditCurrentTab}
                              onChange={(e) => handleInputChange(key, e.target.value)}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
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
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
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
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                            >
                              <option value="monthly">Monthly</option>
                              <option value="quarterly">Quarterly</option>
                              <option value="annual">Annual</option>
                            </select>
                          ) : isSensitive ? (
                            <div className="relative">
                              <input
                                type={showPasswordMap[key] ? 'text' : 'password'}
                                value={value !== null && value !== undefined ? value : ''}
                                disabled={!canEditCurrentTab}
                                onChange={(e) => handleInputChange(key, e.target.value)}
                                className="w-full pl-3 pr-10 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPasswordMap((prev) => ({ ...prev, [key]: !prev[key] }))}
                                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                              >
                                {showPasswordMap[key] ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
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
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Save Action Bar */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={!isDirty || isSaving}
                    className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700 rounded-xl hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer"
                  >
                    {t('settings.reset', 'Reset')}
                  </button>
                  <button
                    type="submit"
                    disabled={!isDirty || isSaving || !canEditCurrentTab}
                    className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 disabled:opacity-40 transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
                  >
                    {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    {isSaving ? t('settings.saving', 'Saving...') : t('settings.saveChanges', 'Save Configuration')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
      {/* ========================================================
          MULTI-STEP DATA RESET MODAL
      ======================================================== */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative my-8">
            <button
              type="button"
              onClick={() => !isResetExecuting && setShowResetModal(false)}
              disabled={isResetExecuting}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Stepper Header */}
            <div className="mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  {resetStep === 5 ? 'COMPLETED' : `STEP ${resetStep} OF 4`}
                </span>
                <span className="text-xs text-slate-400">Production Guarded Reset</span>
              </div>
              <h3 className="text-base font-bold text-white">
                {resetStep === 1 && 'Step 1: Operational Deletion Scope Preview'}
                {resetStep === 2 && 'Step 2: Explicit Confirmation Verification'}
                {resetStep === 3 && 'Step 3: Administrative Password Verification'}
                {resetStep === 4 && 'Step 4: Safety Backup & Final Execution'}
                {resetStep === 5 && 'Data Reset Completed Successfully'}
              </h3>
            </div>

            {/* STEP 1: IMPACT PREVIEW */}
            {resetStep === 1 && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-900/40 text-xs text-rose-300 leading-relaxed">
                  <strong>Permanent Data Removal Warning:</strong> The following operational transactional records will be deleted. Master data and configuration will remain preserved.
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-2 max-h-48 overflow-y-auto">
                  <div className="font-semibold text-white mb-1">Total Operational Records to Delete: {resetPreview?.total_records_to_remove ?? 0}</div>
                  {resetPreview?.breakdown && Object.entries(resetPreview.breakdown).map(([tbl, cnt]) => {
                    const count = Number(cnt);
                    return count > 0 ? (
                      <div key={tbl} className="flex justify-between items-center text-slate-300 border-b border-slate-800/40 pb-1">
                        <span className="font-mono text-slate-400 text-[11px]">{tbl}</span>
                        <span className="font-semibold text-rose-400">{count} records</span>
                      </div>
                    ) : null;
                  })}
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-xs text-emerald-300">
                  <span className="font-semibold block mb-1">Preserved Master Entities:</span>
                  <p className="text-[11px] text-emerald-400/80 leading-relaxed">
                    Users, Roles, Permissions, Companies, Branches, Warehouses, Chart of Accounts, Products Master, Customers Master, Suppliers Master, Tax Profiles, System Settings, and Audit Logs are 100% preserved.
                  </p>
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 rounded-xl hover:bg-slate-700 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetStep(2)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition cursor-pointer"
                  >
                    Proceed to Step 2
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: CONFIRMATION STRING */}
            {resetStep === 2 && (
              <div className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  To prevent accidental execution, please type <strong className="text-rose-400 font-mono">RESET RETAILCORE</strong> exactly as shown into the input field below:
                </p>

                <div>
                  <input
                    type="text"
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                    placeholder="Type RESET RETAILCORE"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white tracking-wider focus:outline-none focus:border-rose-500"
                  />
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Required: RESET RETAILCORE</span>
                    {resetConfirmText === 'RESET RETAILCORE' ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Confirmation Matches
                      </span>
                    ) : (
                      <span className="text-slate-500">Awaiting exact match</span>
                    )}
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setResetStep(1)}
                    className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 rounded-xl hover:bg-slate-700 transition cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={resetConfirmText !== 'RESET RETAILCORE'}
                    onClick={() => setResetStep(3)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition rounded-xl cursor-pointer"
                  >
                    Proceed to Step 3
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: PASSWORD VERIFICATION */}
            {resetStep === 3 && (
              <div className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Please verify your Super Administrator account password before proceeding to the final authorization step:
                </p>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Current Password</label>
                  <input
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setResetStep(2)}
                    className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 rounded-xl hover:bg-slate-700 transition cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetStep(4)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition rounded-xl cursor-pointer"
                  >
                    Proceed to Final Authorization
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: FINAL AUTHORIZATION */}
            {resetStep === 4 && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 text-xs text-rose-300 leading-relaxed">
                  <div className="font-bold text-sm text-rose-200 mb-1 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    Final Destructive Confirmation
                  </div>
                  <p>
                    A safety database snapshot will automatically be generated via <code className="text-white font-mono">pg_dump</code> before any deletion starts. If the snapshot fails, the entire reset is immediately cancelled.
                  </p>
                </div>

                {isResetExecuting ? (
                  <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-8 h-8 animate-spin text-rose-500" />
                    <span className="text-xs text-white font-medium">{resetProgressText || 'Executing safety backup and reset...'}</span>
                    <span className="text-[11px] text-slate-500">Do not close or reload this window.</span>
                  </div>
                ) : (
                  <div className="pt-3 flex justify-end gap-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setResetStep(3)}
                      className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 rounded-xl hover:bg-slate-700 transition cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteReset}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 transition rounded-xl shadow-lg shadow-rose-900/40 flex items-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Confirm & Execute Data Reset</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 5: RESET RESULTS */}
            {resetStep === 5 && resetResult && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white block">Transactional Reset Succeeded</span>
                    <span>All operational records have been safely cleared. Pre-reset safety backup was recorded.</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Operation ID:</span>
                    <span className="text-slate-300 text-[11px] truncate max-w-[200px]">{resetResult.operation_id}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Safety Backup ID:</span>
                    <span className="text-indigo-400">{resetResult.backup_id}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Backup File:</span>
                    <span className="text-slate-300 text-[11px] truncate max-w-[200px]">{resetResult.backup_filename}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Records Removed:</span>
                    <span className="text-rose-400 font-bold">{resetResult.total_deleted}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Execution Time:</span>
                    <span className="text-emerald-400">{resetResult.duration_seconds}s</span>
                  </div>
                  <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                    <span className="text-slate-500">System Integrity:</span>
                    <span className="text-emerald-400 font-bold">{resetResult.integrity_check?.status}</span>
                  </div>
                </div>

                <div className="pt-3 flex justify-end border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition cursor-pointer"
                  >
                    Close & Finish
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          DEMO DATA PREVIEW MODAL
      ======================================================== */}
      {showDemoModal && demoPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowDemoModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5 pb-3 border-b border-slate-800 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Demonstration Dataset Preview</h3>
                <p className="text-xs text-slate-400">{demoPreview.business_profile}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 mb-4 text-xs space-y-2">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Dataset Scale:</span>
                <span className="font-semibold text-purple-300 uppercase">{demoPreview.size}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Branches & Warehouses:</span>
                <span className="font-semibold text-white">
                  {demoPreview.expected_counts.branches} Branches / {demoPreview.expected_counts.warehouses} Warehouses
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Retail Products Catalog:</span>
                <span className="font-semibold text-white">{demoPreview.expected_counts.products} Products</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Customers & Suppliers:</span>
                <span className="font-semibold text-white">
                  {demoPreview.expected_counts.customers} Customers / {demoPreview.expected_counts.suppliers} Suppliers
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Sales Invoices & Stock Receipts:</span>
                <span className="font-semibold text-white">
                  {demoPreview.expected_counts.sales} Sales / {demoPreview.expected_counts.purchases} Purchases
                </span>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDemoModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 rounded-xl hover:bg-slate-700 transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleInsertDemo}
                disabled={isDemoLoading || demoPreview.is_demo_present}
                className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-40 transition rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                {isDemoLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                <span>Insert Dataset Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
