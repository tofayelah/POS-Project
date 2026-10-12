import re

with open("frontend/src/components/layout/Sidebar.tsx", "r") as f:
    content = f.read()

# Replace aside element
old_aside = """      <aside
        id="app-sidebar"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`bg-white flex flex-col shrink-0 h-full border-r border-slate-200 transition-all duration-300 ease-in-out ${
          // Mobile state
          isMobileOpen
            ? 'fixed inset-y-0 left-0 z-50 w-72 shadow-2xl translate-x-0 flex'
            : 'hidden lg:flex'
        } ${
          // Desktop state: collapsed (w-20) by default, expanded (w-64) on mouse enter
          isHovered ? 'lg:w-64' : 'lg:w-20'
        }`}
      >"""

new_aside = """      <aside
        id="app-sidebar"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`bg-[#F8FAFC] flex flex-col shrink-0 h-full border-r border-[#E2E8F0] shadow-[1px_0_4px_rgba(0,0,0,0.02)] transition-all duration-300 ease-in-out ${
          // Mobile state
          isMobileOpen
            ? 'fixed inset-y-0 left-0 z-50 w-72 shadow-2xl translate-x-0 flex'
            : 'hidden lg:flex'
        } ${
          // Desktop state: collapsed (w-20) by default, expanded (w-64) on mouse enter
          isHovered ? 'lg:w-64' : 'lg:w-20'
        }`}
      >"""

# Replace header brand
old_brand = """        {/* Header / Brand */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-xs shrink-0">
              {activeCompany?.name?.charAt(0) || 'R'}
            </div>
            <div className={`min-w-0 transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'lg:opacity-0'}`}>
              <span className="text-slate-900 font-bold tracking-tight text-sm block truncate" id="sidebar-company-name">
                {activeCompany?.name || 'RetailCore ERP'}
              </span>
              <span className="text-[10px] text-indigo-600 font-mono block truncate">
                {activeCompany?.subdomain || 'tenant'}.sonaribd.com
              </span>
            </div>
          </div>"""

new_brand = """        {/* Header / Brand */}
        <div className="p-4 border-b border-[#E2E8F0] bg-white/75 backdrop-blur-xs flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-sm ring-1 ring-indigo-500/20 shrink-0">
              {activeCompany?.name?.charAt(0) || 'R'}
            </div>
            <div className={`min-w-0 transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'lg:opacity-0'}`}>
              <span className="text-slate-900 font-extrabold tracking-tight text-sm block truncate" id="sidebar-company-name">
                {activeCompany?.name || 'RetailCore ERP'}
              </span>
              <span className="text-xs text-indigo-600 font-medium block truncate">
                {activeCompany?.subdomain || 'tenant'}.sonaribd.com
              </span>
            </div>
          </div>"""

# Replace user profile footer
old_footer = """        {/* User Profile / Logout Footer */}
        <div className="p-3 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center shrink-0 text-indigo-700 font-bold text-xs">
              <span>{getInitials(user?.name)}</span>
            </div>
            <div className={`flex flex-col min-w-0 transition-opacity duration-200 ${
              isExpanded ? 'flex' : 'lg:hidden'
            }`}>
              <span className="text-xs text-slate-900 font-bold truncate">{user?.name || 'Super Admin'}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono font-medium">{primaryRole}</span>
            </div>
          </div>
          <button
            type="button"
            id="sidebar-logout-btn"
            onClick={handleLogout}
            title={t('common.logout', 'Sign Out')}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>"""

new_footer = """        {/* User Profile / Logout Footer */}
        <div className="p-3.5 border-t border-[#E2E8F0] bg-white/80 backdrop-blur-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 border border-indigo-300 flex items-center justify-center shrink-0 text-indigo-700 font-bold text-xs shadow-xs">
              <span>{getInitials(user?.name)}</span>
            </div>
            <div className={`flex flex-col min-w-0 transition-opacity duration-200 ${
              isExpanded ? 'flex' : 'lg:hidden'
            }`}>
              <span className="text-xs font-bold text-slate-900 truncate">{user?.name || 'Super Admin'}</span>
              <span className="text-xs text-slate-500 font-medium truncate">{primaryRole}</span>
            </div>
          </div>
          <button
            type="button"
            id="sidebar-logout-btn"
            onClick={handleLogout}
            title={t('common.logout', 'Sign Out')}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>"""

if old_aside not in content:
    print("WARNING: old_aside not found")
else:
    content = content.replace(old_aside, new_aside)

if old_brand not in content:
    print("WARNING: old_brand not found")
else:
    content = content.replace(old_brand, new_brand)

if old_footer not in content:
    print("WARNING: old_footer not found")
else:
    content = content.replace(old_footer, new_footer)

# Replace section headers
content = re.sub(
    r'text-\[10px\] font-bold text-slate-400 uppercase tracking-wider mb-1 px-3 mt-(\d)',
    r'text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5 px-3 py-1.5 mt-\1 rounded-md bg-[#EEF2FF]',
    content
)

# Replace remaining bg-slate-800 links:
content = content.replace(
    "? 'bg-slate-800 text-cyan-300 font-semibold'",
    "? 'bg-indigo-600 text-white font-semibold shadow-xs'"
)
content = content.replace(
    "? 'bg-slate-800 text-indigo-400 font-medium'",
    "? 'bg-indigo-600 text-white font-semibold shadow-xs'"
)

# Improve nav container scrollbar styling
content = content.replace(
    'scrollbar-thin scrollbar-thumb-slate-300',
    'scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300'
)

with open("frontend/src/components/layout/Sidebar.tsx", "w") as f:
    f.write(content)

print("SUCCESS: Sidebar updated cleanly!")
