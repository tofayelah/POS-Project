import { useState, useMemo } from 'react';
import {
  Search,
  Bell,
  Activity,
  Building2,
  Store,
  MapPin,
  Globe,
  ShieldCheck,
  ChevronDown,
  Check,
  Menu,
  Languages,
  Plus,
  Sparkles,
  CheckCircle2,
  X,
  Package,
  Boxes,
  Users,
  ShoppingCart,
  FileSpreadsheet,
  Layers
} from 'lucide-react';
import { Link } from 'react-router';
import { Company, Branch } from '../../types/organization';
import { useCompany } from '../../contexts/CompanyContext';
import { useLanguage } from '../../i18n';
import { useV2System } from '../../context/V2SystemContext';
import { uploadFullOperationalDemoData } from '../../api/demoData';

interface HeaderProps {
  onToggleMobileSidebar?: () => void;
}

export function Header({ onToggleMobileSidebar }: HeaderProps) {
  const { 
    company: activeCompany, 
    companies, 
    switchCompany,
    branches,
    activeBranch,
    activeBranchId,
    switchBranch,
    isAllBranches
  } = useCompany();
  const { language, setLanguage, t } = useLanguage();
  const { health, connectionState, error: v2Error } = useV2System();
  
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [branchSearch, setBranchSearch] = useState('');

  const filteredBranches = useMemo(() => {
    if (!branchSearch.trim()) return branches;
    const q = branchSearch.toLowerCase();
    return branches.filter((b) => 
      b.name.toLowerCase().includes(q) || 
      (b.code && b.code.toLowerCase().includes(q)) ||
      (b.address && b.address.toLowerCase().includes(q))
    );
  }, [branches, branchSearch]);

  const handleSwitchTenant = async (comp: Company) => {
    await switchCompany(comp);
    setIsCompanyDropdownOpen(false);
  };

  const [isUploadingDemo, setIsUploadingDemo] = useState(false);
  const [demoUploadModalOpen, setDemoUploadModalOpen] = useState(false);
  const [demoUploadStats, setDemoUploadStats] = useState<any | null>(null);

  const handleUploadDemo = async () => {
    try {
      setIsUploadingDemo(true);
      const res = await uploadFullOperationalDemoData();
      setDemoUploadStats(res.stats);
      setDemoUploadModalOpen(true);
    } finally {
      setIsUploadingDemo(false);
    }
  };

  const handleSelectBranch = (bId: number | 'all') => {
    switchBranch(bId);
    setIsBranchDropdownOpen(false);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-6 lg:px-8 shrink-0 relative z-30">
      <div className="flex items-center gap-2 sm:gap-4 md:gap-5">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          type="button"
          id="header-mobile-hamburger"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar */}
        <div className="hidden xl:flex items-center gap-3 bg-slate-100 px-3.5 py-1.5 rounded-full w-48 md:w-56 border border-slate-200/60 focus-within:border-indigo-400 focus-within:bg-white transition-all">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder={t('header.searchPlaceholder', 'Search records, SKUs...')}
            className="bg-transparent border-none text-xs w-full outline-none text-slate-700 placeholder-slate-400"
          />
        </div>

        {/* 1. One Company Enterprise Headquarters Brand */}
        <div className="relative">
          <button
            type="button"
            id="header-tenant-switcher-btn"
            onClick={() => {
              setIsCompanyDropdownOpen(!isCompanyDropdownOpen);
              setIsBranchDropdownOpen(false);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-200/80 rounded-lg text-left transition-colors text-xs cursor-pointer shadow-2xs"
            title="Company Headquarters (One Company Multi-Branch Architecture)"
          >
            <div className="w-6 h-6 rounded bg-indigo-700 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs shrink-0">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 leading-tight">
                <span className="max-w-[110px] md:max-w-[140px] truncate">{activeCompany?.name || 'RetailCore ERP'}</span>
                <span className="text-[10px] font-semibold text-indigo-700 bg-white px-1.5 py-0.2 rounded border border-indigo-200 shrink-0">
                  Head Office
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium truncate max-w-[140px]">
                One Company System
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          </button>

          {/* Company Dropdown Menu */}
          {isCompanyDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsCompanyDropdownOpen(false)}
              />
              <div
                id="header-tenant-dropdown"
                className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>{t('header.saasTenants', 'Enterprise Company Profile')}</span>
                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    One Company Structure
                  </span>
                </div>

                <div className="p-3 bg-slate-50/90 border-b border-slate-100">
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>{activeCompany?.name || 'RetailCore ERP'}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1">
                    {activeCompany?.address || 'Motijheel Commercial Area, Dhaka-1000'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    Tax / BIN: {activeCompany?.tax_number || 'BIN-19283746501'}
                  </div>
                  <div className="text-[10px] text-indigo-600 font-mono mt-0.5">
                    {activeCompany?.email || 'admin@sonaribd.com'}
                  </div>
                </div>

                {companies.length > 1 && (
                  <div className="max-h-40 overflow-y-auto py-1">
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase">
                      Switch Legal Entity
                    </div>
                    {companies.map((c) => {
                      const isSelected = c.id === activeCompany?.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => handleSwitchTenant(c)}
                          className={`w-full px-3 py-1.5 text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                            isSelected ? 'bg-indigo-50 font-bold text-indigo-950' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span className="truncate">{c.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="p-2 border-t border-slate-100 bg-slate-50/60 mt-1 space-y-1.5">
                  <button
                    type="button"
                    id="header-btn-upload-demo-data"
                    onClick={async () => {
                      setIsCompanyDropdownOpen(false);
                      await uploadFullOperationalDemoData();
                      window.location.reload();
                    }}
                    className="w-full text-center text-xs font-bold text-emerald-800 hover:text-emerald-950 py-1.5 px-3 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Load complete Bangladesh retail demo records"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Upload Full Demo Data
                  </button>
                  <Link
                    to="/company"
                    onClick={() => setIsCompanyDropdownOpen(false)}
                    className="block text-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 py-1.5 rounded-lg bg-white border border-indigo-200/60 hover:border-indigo-300 transition-colors shadow-2xs"
                  >
                    Manage Company Profile & Tax Info
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 2. Prominent Multi-Branch Switcher */}
        <div className="relative">
          <button
            type="button"
            id="header-branch-switcher-btn"
            onClick={() => {
              setIsBranchDropdownOpen(!isBranchDropdownOpen);
              setIsCompanyDropdownOpen(false);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-50/90 hover:bg-emerald-100/80 border border-emerald-300/90 text-emerald-950 rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            title="Switch Active Operating Branch"
          >
            <div className="w-6 h-6 rounded bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              <Store className="w-3.5 h-3.5" />
            </div>
            <div className="text-left leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 max-w-[130px] sm:max-w-[180px] md:max-w-[210px] truncate">
                  {isAllBranches ? '🌐 All Branches (Consolidated)' : (activeBranch?.name || 'Dhaka Head Office Branch')}
                </span>
                {!isAllBranches && activeBranch?.code && (
                  <span className="hidden md:inline-block text-[10px] font-mono px-1.5 py-0.2 bg-white text-emerald-800 rounded border border-emerald-200 font-bold shrink-0">
                    {activeBranch.code}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{isAllBranches ? 'Enterprise View' : 'Active Branch'}</span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-emerald-700 ml-0.5 shrink-0" />
          </button>

          {/* Branch Dropdown Menu */}
          {isBranchDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsBranchDropdownOpen(false)}
              />
              <div
                id="header-branch-dropdown"
                className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800">
                      Multi-Branch Network
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Scoped to active branch for POS & vouchers
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {branches.length} Outlets
                  </span>
                </div>

                {/* Quick Search */}
                <div className="p-2 border-b border-slate-100">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={branchSearch}
                      onChange={(e) => setBranchSearch(e.target.value)}
                      placeholder="Search branches..."
                      className="w-full pl-8 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Option: All Branches (Consolidated) */}
                <div className="p-1 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleSelectBranch('all')}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between rounded-lg transition-colors cursor-pointer ${
                      isAllBranches ? 'bg-emerald-50 text-emerald-950 font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center text-xs shrink-0">
                        🌐
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">All Branches (Consolidated)</div>
                        <div className="text-[10px] text-slate-500">Company-wide view for central oversight</div>
                      </div>
                    </div>
                    {isAllBranches && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </button>
                </div>

                {/* Branch List */}
                <div className="max-h-60 overflow-y-auto p-1 divide-y divide-slate-50">
                  {filteredBranches.map((b) => {
                    const isSelected = !isAllBranches && Number(b.id) === Number(activeBranchId);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => handleSelectBranch(Number(b.id))}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between rounded-lg transition-colors cursor-pointer ${
                          isSelected ? 'bg-emerald-50/90 text-emerald-950 font-bold' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                            isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            <Store className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{b.name}</span>
                              {b.code && (
                                <span className="text-[10px] font-mono px-1 py-0.2 bg-slate-100 text-slate-600 rounded">
                                  {b.code}
                                </span>
                              )}
                            </div>
                            {b.address && (
                              <div className="text-[10px] text-slate-400 line-clamp-1 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-2.5 h-2.5 shrink-0" />
                                {b.address}
                              </div>
                            )}
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>

                {/* Footer Link */}
                <div className="p-2 border-t border-slate-100 bg-slate-50/70 mt-1 flex items-center justify-between text-xs">
                  <Link
                    to="/branches"
                    onClick={() => setIsBranchDropdownOpen(false)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Manage Branches & Outlets
                  </Link>
                  <span className="text-[10px] text-slate-400 font-medium">One Co. Multi-Branch</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
        {/* Prominent Quick Demo Data Upload Button */}
        <button
          type="button"
          id="header-quick-upload-demo-btn"
          onClick={handleUploadDemo}
          disabled={isUploadingDemo}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-60"
          title="Upload / Reset complete demo data for full software operations"
        >
          <Sparkles className={`w-3.5 h-3.5 text-amber-200 ${isUploadingDemo ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isUploadingDemo ? 'Uploading...' : 'Upload Demo Data'}</span>
          <span className="sm:hidden">Demo</span>
        </button>

        {/* Language Switcher (EN | বাংলা) */}
        <div
          id="header-language-switcher"
          className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold"
        >
          <div className="px-1.5 text-slate-400 hidden sm:flex items-center">
            <Languages className="w-3.5 h-3.5" />
          </div>
          <button
            type="button"
            id="header-lang-en"
            onClick={() => setLanguage('en')}
            className={`px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              language === 'en'
                ? 'bg-white text-indigo-700 shadow-xs font-bold border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="English"
          >
            EN
          </button>
          <button
            type="button"
            id="header-lang-bn"
            onClick={() => setLanguage('bn')}
            className={`px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              language === 'bn'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="বাংলা (Bengali)"
          >
            বাংলা
          </button>
        </div>

        {/* System Badges */}
        <div className="hidden md:flex items-center gap-2">
          {connectionState === 'loading' ? (
            <span
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200"
              title="Checking V2 API status..."
            >
              <Activity className="w-3 h-3 animate-pulse text-slate-400" /> API Checking...
            </span>
          ) : connectionState === 'online' ? (
            <span
              className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200/60"
              title={`API: ${health?.status || 'healthy'} (${health?.database || 'connected'})`}
            >
              <Activity className="w-3 h-3" /> API OK
            </span>
          ) : connectionState === 'degraded' ? (
            <span
              className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200"
              title={`API Degraded: ${v2Error || 'Database disconnected'}`}
            >
              <Activity className="w-3 h-3 text-amber-600" /> API Degraded
            </span>
          ) : (
            <span
              className="flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-200"
              title={`API Offline: ${v2Error || 'Backend unreachable'}`}
            >
              <Activity className="w-3 h-3 text-rose-600" /> API Offline
            </span>
          )}
          <span
            className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-200/60"
            title={`RetailCore ${health?.version || '2.0.0-step1'} - Foundation Active`}
          >
            v2.0 Step 1
          </span>
        </div>

        {/* Notifications */}
        <div
          className="w-8 h-8 flex items-center justify-center bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer rounded-full relative transition-colors"
          title={t('header.notifications', 'Notifications')}
        >
          <Bell className="w-4 h-4 text-slate-600" />
          <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-blue-500 border-2 border-white rounded-full"></div>
        </div>
      </div>

      {/* Demo Data Seeding Success Modal */}
      {demoUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative">
            <button
              type="button"
              onClick={() => {
                setDemoUploadModalOpen(false);
                window.location.reload();
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Full Operational Demo Data Loaded!
                </h3>
                <p className="text-xs text-slate-500">
                  All enterprise modules seeded with Bangladesh retail & wholesale datasets.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-4 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
              <div className="p-2 bg-white rounded-lg border border-slate-200/60">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Company</div>
                <div className="font-bold text-slate-900 truncate">{demoUploadStats?.company || 'Apex Retail Ltd'}</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200/60">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Branches</div>
                <div className="font-bold text-emerald-700">{demoUploadStats?.branches || 6} Outlets</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200/60">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Warehouses</div>
                <div className="font-bold text-slate-900">{demoUploadStats?.warehouses || 5} Depots</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200/60">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Products (EAN-13)</div>
                <div className="font-bold text-slate-900">{demoUploadStats?.products || 12} SKUs</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200/60">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Suppliers</div>
                <div className="font-bold text-slate-900">{demoUploadStats?.suppliers || 6} Vendors</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200/60">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Customers</div>
                <div className="font-bold text-slate-900">{demoUploadStats?.customers || 6} Profiles</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200/60">
                <div className="text-[10px] text-slate-400 uppercase font-bold">POS Terminals</div>
                <div className="font-bold text-slate-900">{demoUploadStats?.posTerminals || 4} Counters</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200/60">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Purchases & POs</div>
                <div className="font-bold text-slate-900">{(demoUploadStats?.purchases || 5) + (demoUploadStats?.purchaseOrders || 2)} Records</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200/60">
                <div className="text-[10px] text-slate-400 uppercase font-bold">POS Sales & Stock</div>
                <div className="font-bold text-indigo-700">{demoUploadStats?.sales || 4} Orders</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => {
                  setDemoUploadModalOpen(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setDemoUploadModalOpen(false);
                  window.location.reload();
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Refresh System View
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
