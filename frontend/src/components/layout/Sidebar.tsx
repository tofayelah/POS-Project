import { useState } from 'react';
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
  ShoppingCart,
  Boxes,
  CreditCard,
  Monitor,
  X,
  Award,
  RotateCcw,
  Receipt,
  SlidersHorizontal,
  Clock,
  ClipboardCheck,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { useCompany } from '../../contexts/CompanyContext';
import { useLanguage } from '../../i18n';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ isMobileOpen = false, onCloseMobile }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasRole, hasPermission } = useAuth();
  const { company: activeCompany } = useCompany();
  const { t } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleLinkClick = () => {
    if (onCloseMobile) {
      onCloseMobile();
    }
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
  const canViewPos = hasRole('Super Admin') || hasRole('Admin') || hasPermission('pos.view');
  const canViewAdmin = hasRole('Super Admin') || hasRole('Admin') || hasPermission('view-users') || hasPermission('manage-users') || hasPermission('users.view') || hasPermission('roles.view') || canViewPos;
  const canViewSettings = hasRole('Super Admin') || hasRole('Admin') || hasPermission('manage-settings');

  const isActive = (path: string, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || (path !== '/' && path !== '/dashboard' && location.pathname.startsWith(path));
  };

  const isExpanded = isHovered || isMobileOpen;

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-200"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar */}
      <aside
        id="app-sidebar"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`bg-slate-900 flex flex-col shrink-0 h-full border-r border-slate-800 transition-all duration-300 ease-in-out ${
          // Mobile state
          isMobileOpen
            ? 'fixed inset-y-0 left-0 z-50 w-72 shadow-2xl translate-x-0 flex'
            : 'hidden lg:flex'
        } ${
          // Desktop state: collapsed (w-20) by default, expanded (w-64) on mouse enter
          isHovered ? 'lg:w-64' : 'lg:w-20'
        }`}
      >
        {/* Header / Brand */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-xs shrink-0">
              {activeCompany?.name?.charAt(0) || 'R'}
            </div>
            <div className={`min-w-0 transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'lg:opacity-0'}`}>
              <span className="text-white font-semibold tracking-tight text-sm block truncate" id="sidebar-company-name">
                {activeCompany?.name || 'RetailCore ERP'}
              </span>
              <span className="text-[10px] text-indigo-400 font-mono block truncate">
                {activeCompany?.subdomain || 'tenant'}.sonaribd.com
              </span>
            </div>
          </div>

          {/* Close button for mobile */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <nav className="mt-3 px-3 space-y-1 flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700">
          {/* Dashboard */}
          <div className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-3 mt-2 ${
            isExpanded ? 'block' : 'lg:hidden'
          }`}>
            {t('nav.overview', 'Overview')}
          </div>
          <Link
            to="/dashboard"
            id="nav-link-dashboard"
            onClick={handleLinkClick}
            title={t('nav.dashboard', 'Dashboard')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-xs font-medium cursor-pointer ${
              isActive('/dashboard', true)
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 shrink-0 text-slate-400 group-hover:text-white" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.dashboard', 'Dashboard')}
            </span>
          </Link>

          {/* POS Management */}
          {canViewPos && (
            <>
              <div className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-3 mt-4 ${
                isExpanded ? 'block' : 'lg:hidden'
              }`}>
                {t('nav.pos', 'POS')}
              </div>
              <Link
                to="/pos"
                id="nav-link-open-pos-session"
                onClick={handleLinkClick}
                title={t('nav.openPosSession', 'Open POS Counter Session')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-xs ${
                  location.pathname === '/pos'
                    ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <ShoppingCart className="w-5 h-5 shrink-0 text-emerald-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.openPosSession', 'Open POS Counter Session')}
                </span>
              </Link>
              <Link
                to="/pos/terminals"
                id="nav-link-pos-terminals"
                onClick={handleLinkClick}
                title={t('nav.posTerminalManagement', 'POS Terminal Management')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
                  isActive('/pos/terminals')
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Monitor className="w-4 h-4 shrink-0 text-blue-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.posTerminalManagement', 'POS Terminal Management')}
                </span>
              </Link>
              <Link
                to="/pos/shifts"
                id="nav-link-pos-shifts"
                onClick={handleLinkClick}
                title={t('posShift.title', 'Shift & Drawer Management')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
                  isActive('/pos/shifts')
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Clock className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('posShift.shifts', 'Shift History')}
                </span>
              </Link>
              <Link
                to="/pos/payment-methods"
                id="nav-link-payment-methods"
                onClick={handleLinkClick}
                title={t('nav.paymentMethods', 'Payment Methods')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
                  isActive('/pos/payment-methods')
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <CreditCard className="w-4 h-4 shrink-0 text-teal-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.paymentMethods', 'Payment Methods')}
                </span>
              </Link>
              <Link
                to="/pos/loyalty-settings"
                id="nav-link-loyalty-settings"
                onClick={handleLinkClick}
                title={t('nav.loyaltySettings', 'Loyalty Settings')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
                  isActive('/pos/loyalty-settings')
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Award className="w-4 h-4 shrink-0 text-amber-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.loyaltySettings', 'Loyalty Settings')}
                </span>
              </Link>
            </>
          )}

          {/* Product Master */}
          <div className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-3 mt-4 ${
            isExpanded ? 'block' : 'lg:hidden'
          }`}>
            {t('nav.productMaster', 'Product Master')}
          </div>
          <Link
            to="/products/item-information"
            id="nav-link-item-information"
            onClick={handleLinkClick}
            title={t('nav.itemInformation', 'Item Information')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/products/item-information')
                ? 'bg-slate-800 text-cyan-300 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Barcode className="w-4 h-4 shrink-0 text-cyan-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.itemInformation', 'Item Information')}
            </span>
          </Link>
          <Link
            to="/products"
            id="nav-link-products"
            onClick={handleLinkClick}
            title={t('nav.products', 'Products & SKUs')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/products', true)
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Shirt className="w-4 h-4 shrink-0 text-blue-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.products', 'Products & SKUs')}
            </span>
          </Link>
          <Link
            to="/categories"
            id="nav-link-categories"
            onClick={handleLinkClick}
            title={t('nav.categories', 'Categories')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/categories')
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <FolderTree className="w-4 h-4 shrink-0 text-amber-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.categories', 'Categories')}
            </span>
          </Link>
          <Link
            to="/brands"
            id="nav-link-brands"
            onClick={handleLinkClick}
            title={t('nav.brands', 'Brands')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/brands')
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Tag className="w-4 h-4 shrink-0 text-rose-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.brands', 'Brands')}
            </span>
          </Link>
          <Link
            to="/units"
            id="nav-link-units"
            onClick={handleLinkClick}
            title={t('nav.units', 'Units of Measure')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/units')
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Scale className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.units', 'Units of Measure')}
            </span>
          </Link>
          <Link
            to="/attributes"
            id="nav-link-attributes"
            onClick={handleLinkClick}
            title={t('nav.attributes', 'Attributes & Values')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/attributes')
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0 text-violet-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.attributes', 'Attributes & Values')}
            </span>
          </Link>

          {/* Inventory Management */}
          <div className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-3 mt-4 ${
            isExpanded ? 'block' : 'lg:hidden'
          }`}>
            {t('nav.inventory', 'Inventory')}
          </div>
          <Link
            to="/inventory"
            id="nav-link-inventory"
            onClick={handleLinkClick}
            title={t('nav.stockLevels', 'Stock Levels')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/inventory', true)
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Package className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className={`font-medium truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.stockLevels', 'Stock Levels')}
            </span>
          </Link>
          <Link
            to="/inventory/movements"
            id="nav-link-movements"
            onClick={handleLinkClick}
            title={t('nav.stockMovements', 'Stock Movements')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/inventory/movements')
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <History className="w-4 h-4 shrink-0 text-slate-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.stockMovements', 'Stock Movements')}
            </span>
          </Link>
          <Link
            to="/inventory/adjustments"
            id="nav-link-adjustments"
            onClick={handleLinkClick}
            title={t('nav.stockAdjustments', 'Stock Adjustments')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/inventory/adjustments')
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0 text-slate-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.stockAdjustments', 'Stock Adjustments')}
            </span>
          </Link>
          <Link
            to="/inventory/transfers"
            id="nav-link-transfers"
            onClick={handleLinkClick}
            title={t('nav.transfers', 'Transfers')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/inventory/transfers')
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <MapPin className="w-4 h-4 shrink-0 text-slate-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.transfers', 'Transfers')}
            </span>
          </Link>
          <Link
            to="/inventory/stock-counts"
            id="nav-link-stock-counts"
            onClick={handleLinkClick}
            title={t('nav.stockCounts', 'Stock Counts')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/inventory/stock-counts')
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <ClipboardCheck className="w-4 h-4 shrink-0 text-slate-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.stockCounts', 'Stock Counts')}
            </span>
          </Link>
          <Link
            to="/inventory/batches"
            id="nav-link-batches"
            onClick={handleLinkClick}
            title={t('nav.batches', 'Batches & Expiry')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/inventory/batches')
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0 text-slate-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.batches', 'Batches & Expiry')}
            </span>
          </Link>
          <Link
            to="/inventory/valuation"
            id="nav-link-valuation"
            onClick={handleLinkClick}
            title={t('nav.valuation', 'Valuation Report')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/inventory/valuation')
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <DollarSign className="w-4 h-4 shrink-0 text-slate-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.valuation', 'Valuation Report')}
            </span>
          </Link>
          <Link
            to="/inventory/reconciliation"
            id="nav-link-reconciliation"
            onClick={handleLinkClick}
            title={t('nav.reconciliation', 'Reconciliation')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/inventory/reconciliation')
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0 text-slate-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.reconciliation', 'Reconciliation')}
            </span>
          </Link>

          {/* Procurement / Purchases */}
          <div className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-3 mt-4 ${
            isExpanded ? 'block' : 'lg:hidden'
          }`}>
            {t('nav.procurement', 'Procurement')}
          </div>
          <Link
            to="/procurement/dashboard"
            id="nav-link-procurement-dashboard"
            onClick={handleLinkClick}
            title={t('nav.procurementDashboard', 'Procurement Intelligence')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/procurement/dashboard')
                ? 'bg-slate-800 text-indigo-400 font-medium'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <TrendingUp className="w-4 h-4 shrink-0 text-indigo-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.procurementDashboard', 'Procurement Intelligence')}
            </span>
          </Link>
          <Link
            to="/procurement/requisitions"
            id="nav-link-procurement-requisitions"
            onClick={handleLinkClick}
            title={t('nav.purchaseRequisitions', 'Purchase Requisitions')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/procurement/requisitions')
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0 text-cyan-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.purchaseRequisitions', 'Requisitions')}
            </span>
          </Link>
          <Link
            to="/procurement/rfqs"
            id="nav-link-procurement-rfqs"
            onClick={handleLinkClick}
            title={t('nav.rfqManagement', 'RFQs & Tenders')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/procurement/rfqs')
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0 text-sky-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.rfqManagement', 'RFQs & Tenders')}
            </span>
          </Link>
          <Link
            to="/purchases/suppliers"
            id="nav-link-suppliers"
            onClick={handleLinkClick}
            title={t('nav.suppliers', 'Suppliers')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/purchases/suppliers')
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Users className="w-4 h-4 shrink-0 text-purple-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.suppliers', 'Suppliers')}
            </span>
          </Link>
          <Link
            to="/procurement/supplier-performance"
            id="nav-link-supplier-performance"
            onClick={handleLinkClick}
            title={t('nav.supplierPerformance', 'Supplier Performance')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/procurement/supplier-performance')
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Award className="w-4 h-4 shrink-0 text-amber-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.supplierPerformance', 'Supplier Ratings')}
            </span>
          </Link>
          <Link
            to="/procurement/contracts"
            id="nav-link-supplier-contracts"
            onClick={handleLinkClick}
            title={t('nav.supplierContracts', 'Contracts & Price Agreements')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/procurement/contracts')
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.supplierContracts', 'Contracts & Pricing')}
            </span>
          </Link>
          <Link
            to="/purchases/orders"
            id="nav-link-purchase-orders"
            onClick={handleLinkClick}
            title={t('nav.purchaseOrders', 'Purchase Orders')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/purchases/orders')
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0 text-indigo-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.purchaseOrders', 'Purchase Orders')}
            </span>
          </Link>
          <Link
            to="/purchases/goods-receipts"
            id="nav-link-goods-receipts"
            onClick={handleLinkClick}
            title={t('nav.goodsReceipts', 'Goods Receipts')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/purchases/goods-receipts')
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Package className="w-4 h-4 shrink-0 text-teal-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.goodsReceipts', 'Goods Receipts')}
            </span>
          </Link>
          <Link
            to="/purchases"
            id="nav-link-purchases"
            onClick={handleLinkClick}
            title={t('nav.purchaseInvoices', 'Purchase Invoices')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/purchases', true)
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <ShoppingCart className="w-4 h-4 shrink-0 text-blue-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.purchaseInvoices', 'Purchase Invoices')}
            </span>
          </Link>
          <Link
            to="/procurement/matching"
            id="nav-link-matching-exceptions"
            onClick={handleLinkClick}
            title={t('nav.matchingExceptions', '3-Way Match & PPV')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/procurement/matching')
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Scale className="w-4 h-4 shrink-0 text-amber-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.matchingExceptions', '3-Way Match & PPV')}
            </span>
          </Link>
          <Link
            to="/procurement/planning"
            id="nav-link-procurement-planning"
            onClick={handleLinkClick}
            title={t('nav.procurementPlanning', 'Replenishment Planning')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/procurement/planning')
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Boxes className="w-4 h-4 shrink-0 text-rose-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.procurementPlanning', 'Replenishment')}
            </span>
          </Link>
          <Link
            to="/purchases/payables"
            id="nav-link-payables"
            onClick={handleLinkClick}
            title={t('nav.supplierPayables', 'Supplier Payables')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/purchases/payables')
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <CreditCard className="w-4 h-4 shrink-0 text-rose-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.supplierPayables', 'Supplier Payables')}
            </span>
          </Link>

          {/* CRM & Sales */}
          <div className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-3 mt-4 ${
            isExpanded ? 'block' : 'lg:hidden'
          }`}>
            {t('nav.crmSales', 'Sales & Customers')}
          </div>
          <Link
            to="/sales-returns"
            id="nav-link-sales-returns"
            onClick={handleLinkClick}
            title={t('nav.salesReturns', 'Sales Returns & Exchanges')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/sales-returns')
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <RotateCcw className="w-4 h-4 shrink-0 text-amber-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.salesReturns', 'Sales Returns & Exchanges')}
            </span>
          </Link>
          <Link
            to="/customers"
            id="nav-link-customers"
            onClick={handleLinkClick}
            title={t('nav.customers', 'Customers')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/customers', true)
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4 shrink-0 text-rose-400" />
            <span className={`font-medium truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.customers', 'Customers')}
            </span>
          </Link>
          <Link
            to="/customers/groups"
            id="nav-link-customer-groups"
            onClick={handleLinkClick}
            title={t('nav.customerGroups', 'Customer Groups')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/customers/groups')
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0 text-slate-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.customerGroups', 'Customer Groups')}
            </span>
          </Link>

          {/* Finance & Expenses */}
          <div className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-3 mt-4 ${
            isExpanded ? 'block' : 'lg:hidden'
          }`}>
            {t('nav.finance', 'Finance')}
          </div>
          <Link
            to="/accounting"
            id="nav-link-accounting"
            onClick={handleLinkClick}
            title={t('nav.accounting', 'Accounting')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/accounting')
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0 text-blue-400" />
            <span className={`font-medium truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.accounting', 'Accounting')}
            </span>
          </Link>
          <Link
            to="/expenses"
            id="nav-link-expenses"
            onClick={handleLinkClick}
            title={t('nav.expenses', 'Expenses')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/expenses')
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Receipt className="w-4 h-4 shrink-0 text-rose-400" />
            <span className={`font-medium truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.expenses', 'Expenses')}
            </span>
          </Link>

          {/* Organization */}
          <div className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-3 mt-4 ${
            isExpanded ? 'block' : 'lg:hidden'
          }`}>
            {t('nav.organization', 'Organization')}
          </div>
          <Link
            to="/company"
            id="nav-link-company"
            onClick={handleLinkClick}
            title={t('nav.company', 'Company')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/company')
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0 text-amber-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.company', 'Company')}
            </span>
          </Link>
          <Link
            to="/business-units"
            id="nav-link-business-units"
            onClick={handleLinkClick}
            title={t('nav.businessUnits', 'Business Units')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/business-units')
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Network className="w-4 h-4 shrink-0 text-sky-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.businessUnits', 'Business Units')}
            </span>
          </Link>
          <Link
            to="/branches"
            id="nav-link-branches"
            onClick={handleLinkClick}
            title={t('nav.branches', 'Branches')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/branches')
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <MapPin className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.branches', 'Branches')}
            </span>
          </Link>
          <Link
            to="/warehouses"
            id="nav-link-warehouses"
            onClick={handleLinkClick}
            title={t('nav.warehouses', 'Warehouses')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/warehouses')
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Package className="w-4 h-4 shrink-0 text-indigo-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.warehouses', 'Warehouses')}
            </span>
          </Link>
          <Link
            to="/storage-locations"
            id="nav-link-storageLocations"
            onClick={handleLinkClick}
            title={t('nav.storageLocations', 'Storage Locations')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-xs ${
              isActive('/storage-locations')
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Boxes className="w-4 h-4 shrink-0 text-teal-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.storageLocations', 'Storage Locations')}
            </span>
          </Link>

          {/* Administration */}
          {canViewAdmin && (
            <>
              <div className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-3 mt-4 ${
                isExpanded ? 'block' : 'lg:hidden'
              }`}>
                {t('nav.administration', 'Administration')}
              </div>
              <Link
                to="/users"
                id="nav-link-users"
                onClick={handleLinkClick}
                title={t('nav.users', 'Users')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-xs ${
                  isActive('/users')
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-4 h-4 shrink-0 text-indigo-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.users', 'Users')}
                </span>
              </Link>
              <Link
                to="/roles"
                id="nav-link-roles"
                onClick={handleLinkClick}
                title={t('nav.roles', 'Roles & Permissions')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-xs ${
                  isActive('/roles') || isActive('/permissions')
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <ShieldCheck className={`w-4 h-4 shrink-0 ${isActive('/roles') || isActive('/permissions') ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.roles', 'Roles & Permissions')}
                </span>
              </Link>
              <Link
                to="/audit-logs"
                id="nav-link-audit-logs"
                onClick={handleLinkClick}
                title={t('nav.auditLogs', 'Audit Logs')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-xs ${
                  isActive('/audit-logs')
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <History className={`w-4 h-4 shrink-0 ${isActive('/audit-logs') ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.auditLogs', 'Audit Logs')}
                </span>
              </Link>
            </>
          )}

          {/* System Settings */}
          {canViewSettings && (
            <>
              <div className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-3 mt-4 ${
                isExpanded ? 'block' : 'lg:hidden'
              }`}>
                {t('nav.system', 'System')}
              </div>
              <Link
                to="/dashboard"
                id="nav-link-settings"
                onClick={handleLinkClick}
                title={t('nav.settings', 'Settings')}
                className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800/40 rounded-xl transition-colors cursor-pointer text-xs mb-3"
              >
                <Settings className="w-4 h-4 shrink-0 text-slate-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.settings', 'Settings')}
                </span>
              </Link>
            </>
          )}
        </nav>

        {/* User Profile / Logout Footer */}
        <div className="p-3 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-white">{getInitials(user?.name)}</span>
            </div>
            <div className={`flex flex-col min-w-0 transition-opacity duration-200 ${
              isExpanded ? 'flex' : 'lg:hidden'
            }`}>
              <span className="text-xs text-white font-medium truncate">{user?.name || 'Super Admin'}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">{primaryRole}</span>
            </div>
          </div>
          <button
            type="button"
            id="sidebar-logout-btn"
            onClick={handleLogout}
            title={t('common.logout', 'Sign Out')}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
}
