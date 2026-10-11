import { useState } from 'react';
import {
  Search,
  Bell,
  Activity,
  Building2,
  Globe,
  ShieldCheck,
  ChevronDown,
  Check,
  Menu,
  Languages
} from 'lucide-react';
import { Link } from 'react-router';
import { Company } from '../../types/organization';
import { useCompany } from '../../contexts/CompanyContext';
import { useLanguage } from '../../i18n';

interface HeaderProps {
  onToggleMobileSidebar?: () => void;
}

export function Header({ onToggleMobileSidebar }: HeaderProps) {
  const { company: activeCompany, companies, switchCompany } = useCompany();
  const { language, setLanguage, t } = useLanguage();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSwitchTenant = async (comp: Company) => {
    await switchCompany(comp);
    setIsDropdownOpen(false);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 relative z-30">
      <div className="flex items-center gap-3 sm:gap-6">
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
        <div className="hidden sm:flex items-center gap-3 bg-slate-100 px-3.5 py-1.5 rounded-full w-48 md:w-64 lg:w-72 border border-slate-200/60 focus-within:border-indigo-400 focus-within:bg-white transition-all">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder={t('header.searchPlaceholder', 'Search modules, records, or settings...')}
            className="bg-transparent border-none text-xs md:text-sm w-full outline-none text-slate-700 placeholder-slate-400"
          />
        </div>

        {/* Global Dynamic Company Identity / Welcome Banner */}
        <div
          id="header-welcome-company"
          className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
        >
          <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="text-slate-600 font-medium">
            {t('header.welcomeTo', 'Welcome to')}{' '}
            <span className="font-bold text-slate-900">{activeCompany?.name || 'RetailCore'}</span>
          </span>
        </div>

        {/* Tenant Subdomain & Company Switcher */}
        {activeCompany && (
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              id="header-tenant-switcher-btn"
              className="flex items-center gap-2 px-2.5 py-1.5 bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200/80 rounded-lg text-left transition-colors text-xs cursor-pointer"
            >
              <div className="w-6 h-6 rounded bg-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs shrink-0">
                {(activeCompany.name || 'R').charAt(0)}
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <span className="max-w-[120px] md:max-w-[150px] truncate">{activeCompany.name || 'RetailCore'}</span>
                  <span className="hidden md:flex items-center text-[10px] font-mono text-indigo-700 bg-white px-1.5 py-0.2 rounded border border-indigo-200">
                    <Globe className="w-2.5 h-2.5 mr-0.5 text-indigo-500" />
                    {activeCompany.subdomain || 'apex'}.sonaribd.com
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                  <span>{t('header.tenantIsolated', 'Tenant Data Isolated')}</span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5 sm:ml-1" />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div
                  id="header-tenant-dropdown"
                  className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>{t('header.saasTenants', 'SaaS Tenant Companies')}</span>
                    <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">
                      {companies.length} {t('header.tenantsCount', 'Tenants')}
                    </span>
                  </div>

                  <div className="max-h-64 overflow-y-auto py-1">
                    {companies.map((c, idx) => {
                      const isSelected = c.id === activeCompany.id;
                      const companyName = c.name || 'Company';
                      return (
                        <button
                          key={c.id || idx}
                          onClick={() => handleSwitchTenant(c)}
                          className={`w-full px-3 py-2 text-left flex items-start justify-between transition-colors cursor-pointer ${
                            isSelected ? 'bg-indigo-50/80 text-indigo-950' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs uppercase shrink-0 mt-0.5 ${
                              isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {companyName.charAt(0)}
                            </div>
                            <div>
                              <div className="text-xs font-semibold leading-tight line-clamp-1">
                                {companyName}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                <Globe className="w-2.5 h-2.5 text-slate-400" />
                                {c.subdomain || 'apex'}.sonaribd.com
                              </div>
                              <div className="text-[10px] text-indigo-600 font-medium mt-0.5">
                                {c.business_type_label || 'General Retail'}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-2 border-t border-slate-100 bg-slate-50/60 mt-1">
                    <Link
                      to="/company"
                      onClick={() => setIsDropdownOpen(false)}
                      className="block text-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 py-1.5 rounded-lg bg-white border border-indigo-200/60 hover:border-indigo-300 transition-colors shadow-2xs"
                    >
                      + {t('header.manageTenants', 'Manage & Add New Tenant')}
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
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
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
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
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
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
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200/60">
            <Activity className="w-3 h-3" /> API OK
          </span>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200/60">
            v2.0 Multi-Tenant
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
    </header>
  );
}
