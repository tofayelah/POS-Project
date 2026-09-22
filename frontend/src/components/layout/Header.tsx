import { useState, useEffect } from 'react';
import { Search, Bell, Activity, Building2, Globe, ShieldCheck, ChevronDown, Check } from 'lucide-react';
import { Link } from 'react-router';
import { Company } from '../../types/organization';
import { getCompanies, getCompany, setActiveTenantCompany } from '../../api/organization';

export function Header() {
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    loadTenantData();

    const handleTenantChange = (e: any) => {
      if (e.detail) {
        setActiveCompany(e.detail);
      } else {
        loadTenantData();
      }
    };

    window.addEventListener('retailcore_tenant_changed', handleTenantChange);
    return () => window.removeEventListener('retailcore_tenant_changed', handleTenantChange);
  }, []);

  const loadTenantData = async () => {
    try {
      const [currRes, allRes] = await Promise.all([
        getCompany(),
        getCompanies(),
      ]);
      setActiveCompany(currRes.data);
      setCompanies(allRes.data || []);
    } catch {
      // fallback
    }
  };

  const handleSwitchTenant = (comp: Company) => {
    setActiveTenantCompany(comp);
    setActiveCompany(comp);
    setIsDropdownOpen(false);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 relative z-30">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 bg-slate-100 px-4 py-2 rounded-full w-80">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input 
            type="text" 
            placeholder="Search modules, records, or settings..." 
            className="bg-transparent border-none text-sm w-full outline-none text-slate-600"
          />
        </div>

        {/* Tenant Subdomain & Company Switcher */}
        {activeCompany && (
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              id="header-tenant-switcher-btn"
              className="flex items-center gap-2.5 px-3 py-1.5 bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200/80 rounded-lg text-left transition-colors text-xs"
            >
              <div className="w-6 h-6 rounded bg-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                {activeCompany.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <span className="max-w-[140px] truncate">{activeCompany.name}</span>
                  <span className="flex items-center text-[10px] font-mono text-indigo-700 bg-white px-1.5 py-0.2 rounded border border-indigo-200">
                    <Globe className="w-2.5 h-2.5 mr-0.5 text-indigo-500" />
                    {activeCompany.subdomain || 'apex'}.sonaribd.com
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                  <span>Tenant Data Isolated</span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
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
                    <span>SaaS Tenant Companies</span>
                    <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">
                      {companies.length} Tenants
                    </span>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto py-1">
                    {companies.map((c) => {
                      const isSelected = c.id === activeCompany.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => handleSwitchTenant(c)}
                          className={`w-full px-3 py-2 text-left flex items-start justify-between transition-colors ${
                            isSelected ? 'bg-indigo-50/80 text-indigo-950' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs uppercase shrink-0 mt-0.5 ${
                              isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {c.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-xs font-semibold leading-tight line-clamp-1">
                                {c.name}
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
                      + Manage & Add New Tenant
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
            <Activity className="w-3 h-3" /> API OK
          </span>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">v2.0 Multi-Tenant</span>
        </div>
        <div className="w-8 h-8 flex items-center justify-center bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer rounded-full relative transition-colors">
          <Bell className="w-4 h-4 text-slate-600" />
          <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-blue-500 border-2 border-white rounded-full"></div>
        </div>
      </div>
    </header>
  );
}
