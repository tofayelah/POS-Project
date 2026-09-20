import { 
  LayoutDashboard, 
  Building2, 
  Network, 
  MapPin, 
  Package, 
  Users, 
  ShieldCheck, 
  Settings,
  History,
  LogOut,
  Shirt,
  FolderTree,
  Tag,
  Scale,
  Layers,
  Barcode,
  FileText,
  ShoppingCart
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth';

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasRole, hasPermission } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'SA';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const primaryRole = user?.roles?.[0]?.name || 'Admin';

  // RBAC checks for UI navigation visibility (safe default-deny)
  const canViewAdmin = hasRole('Super Admin') || hasRole('Admin') || hasPermission('view-users') || hasPermission('manage-users');
  const canViewSettings = hasRole('Super Admin') || hasRole('Admin') || hasPermission('manage-settings');

  return (
    <aside id="app-sidebar" className="w-64 bg-slate-900 flex flex-col shrink-0 h-full">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-xl">
          R
        </div>
        <span className="text-white font-semibold tracking-tight text-lg">RetailCore ERP</span>
      </div>

      <nav className="mt-6 px-4 space-y-1 flex-1 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-4">Overview</div>
        <Link 
          to="/dashboard" 
          id="nav-link-dashboard"
          className="flex items-center gap-3 px-4 py-3 bg-slate-800 rounded-lg text-white transition-colors"
        >
          <LayoutDashboard className="w-4 h-4 text-slate-400" />
          <span>Dashboard</span>
        </Link>

        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-6">Product Master</div>
        <Link to="/products" id="nav-link-products" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer">
          <Shirt className="w-4 h-4 text-blue-400" />
          <span className="font-medium">Products & SKUs</span>
        </Link>
        <Link to="/categories" id="nav-link-categories" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800/40 rounded-lg transition-colors cursor-pointer text-xs">
          <FolderTree className="w-4 h-4 text-slate-400" />
          <span>Categories</span>
        </Link>
        <Link to="/brands" id="nav-link-brands" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800/40 rounded-lg transition-colors cursor-pointer text-xs">
          <Tag className="w-4 h-4 text-slate-400" />
          <span>Brands</span>
        </Link>
        <Link to="/units" id="nav-link-units" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800/40 rounded-lg transition-colors cursor-pointer text-xs">
          <Scale className="w-4 h-4 text-slate-400" />
          <span>Units of Measure</span>
        </Link>
        <Link to="/attributes" id="nav-link-attributes" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800/40 rounded-lg transition-colors cursor-pointer text-xs">
          <Layers className="w-4 h-4 text-slate-400" />
          <span>Attributes & Values</span>
        </Link>
        
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-6">CRM & Sales</div>
        <Link to="/pos" id="nav-link-pos" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer">
          <ShoppingCart className="w-4 h-4 text-emerald-400" />
          <span className="font-medium">POS Terminal</span>
        </Link>
        <Link to="/customers" id="nav-link-customers" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer">
          <Users className="w-4 h-4 text-rose-400" />
          <span className="font-medium">Customers</span>
        </Link>
        <Link to="/customers/groups" id="nav-link-customer-groups" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800/40 rounded-lg transition-colors cursor-pointer text-xs">
          <Layers className="w-4 h-4 text-slate-400" />
          <span>Customer Groups</span>
        </Link>
        
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-6">Procurement</div>
        <Link 
          to="/purchases/suppliers" 
          id="nav-link-suppliers" 
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
            location.pathname.startsWith('/purchases/suppliers') 
              ? 'bg-slate-800 text-white font-medium' 
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Users className={`w-4 h-4 ${location.pathname.startsWith('/purchases/suppliers') ? 'text-purple-400' : 'text-slate-400'}`} />
          <span className="font-medium">Suppliers</span>
        </Link>
        <Link to="/purchases/orders" id="nav-link-purchase-orders" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800/40 rounded-lg transition-colors cursor-pointer text-xs">
          <FileText className="w-4 h-4 text-slate-400" />
          <span>Purchase Orders</span>
        </Link>
        <Link to="/purchases" id="nav-link-purchases" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800/40 rounded-lg transition-colors cursor-pointer text-xs">
          <ShoppingCart className="w-4 h-4 text-slate-400" />
          <span>Purchase Invoices</span>
        </Link>
        
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-6">Inventory Management</div>
        <Link to="/inventory" id="nav-link-inventory" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer">
          <Package className="w-4 h-4 text-emerald-400" />
          <span className="font-medium">Stock Levels</span>
        </Link>
        <Link to="/inventory/movements" id="nav-link-movements" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800/40 rounded-lg transition-colors cursor-pointer text-xs">
          <History className="w-4 h-4 text-slate-400" />
          <span>Stock Movements</span>
        </Link>
        <Link to="/inventory/transfers" id="nav-link-transfers" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800/40 rounded-lg transition-colors cursor-pointer text-xs">
          <MapPin className="w-4 h-4 text-slate-400" />
          <span>Transfers</span>
        </Link>

        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-6">Finance</div>
        <Link to="/accounting" id="nav-link-accounting" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer">
          <FileText className="w-4 h-4 text-blue-400" />
          <span className="font-medium">Accounting</span>
        </Link>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-6">Organization</div>
        <Link 
          to="/company" 
          id="nav-link-company" 
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
            location.pathname.startsWith('/company') 
              ? 'bg-slate-800 text-white font-medium' 
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Building2 className={`w-4 h-4 ${location.pathname.startsWith('/company') ? 'text-amber-400' : 'text-slate-400'}`} />
          <span>Company</span>
        </Link>
        <Link 
          to="/business-units" 
          id="nav-link-business-units" 
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
            location.pathname.startsWith('/business-units') 
              ? 'bg-slate-800 text-white font-medium' 
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Network className={`w-4 h-4 ${location.pathname.startsWith('/business-units') ? 'text-sky-400' : 'text-slate-400'}`} />
          <span>Business Units</span>
        </Link>
        <Link 
          to="/branches" 
          id="nav-link-branches" 
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
            location.pathname.startsWith('/branches') 
              ? 'bg-slate-800 text-white font-medium' 
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <MapPin className={`w-4 h-4 ${location.pathname.startsWith('/branches') ? 'text-emerald-400' : 'text-slate-400'}`} />
          <span>Branches</span>
        </Link>
        <Link 
          to="/warehouses" 
          id="nav-link-warehouses" 
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
            location.pathname.startsWith('/warehouses') 
              ? 'bg-slate-800 text-white font-medium' 
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Package className={`w-4 h-4 ${location.pathname.startsWith('/warehouses') ? 'text-indigo-400' : 'text-slate-400'}`} />
          <span>Warehouses</span>
        </Link>

        {canViewAdmin && (
          <>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-6">Administration</div>
            <Link to="/dashboard" id="nav-link-users" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors cursor-pointer">
              <Users className="w-4 h-4" />
              <span>Users</span>
            </Link>
            <Link to="/dashboard" id="nav-link-roles" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors cursor-pointer">
              <ShieldCheck className="w-4 h-4" />
              <span>Roles & Permissions</span>
            </Link>
            <Link to="/dashboard" id="nav-link-audit-logs" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors cursor-pointer">
              <History className="w-4 h-4" />
              <span>Audit Logs</span>
            </Link>
          </>
        )}

        {canViewSettings && (
          <>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-6">System</div>
            <Link to="/dashboard" id="nav-link-settings" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors cursor-pointer mb-4">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Link>
          </>
        )}
      </nav>

      <div className="p-6 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center shrink-0">
            <span className="text-xs font-medium text-white">{getInitials(user?.name)}</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-white font-medium truncate">{user?.name || 'Super Admin'}</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">{primaryRole}</span>
          </div>
        </div>
        <button
          id="sidebar-logout-btn"
          onClick={handleLogout}
          title="Sign Out"
          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}

