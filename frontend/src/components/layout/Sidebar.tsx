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
  TrendingUp,
  UserCheck,
  Activity,
  Globe,
  Truck,
  Percent,
  Star,
  Store,
  ShoppingBag,
  ExternalLink,
  Landmark,
  Wallet,
  CalendarCheck,
  FileCheck2
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
  const canViewSettings = hasRole('Super Admin') || hasRole('Admin') || hasPermission('manage-settings') || hasPermission('settings.view');
  const canViewEcommerce = hasRole('Super Admin') || hasRole('Admin') || hasPermission('ecommerce.orders.view') || hasPermission('ecommerce.catalog.view') || hasPermission('ecommerce.settings.view') || canViewPos;
  const canViewFinance = hasRole('Super Admin') || hasRole('Admin') || hasPermission('finance.dashboard.view') || hasPermission('finance.budget.view') || hasPermission('finance.treasury.view') || canViewPos;
  const canViewBi = hasRole('Super Admin') || hasRole('Admin') || hasPermission('bi.view') || hasPermission('bi.dashboard') || canViewPos;

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
        className={`bg-[#F8FAFC] flex flex-col shrink-0 h-full border-r border-[#E2E8F0] shadow-[1px_0_4px_rgba(0,0,0,0.02)] transition-all duration-300 ease-in-out ${
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
        <div className="p-4 border-b border-[#E2E8F0] bg-white/75 backdrop-blur-xs flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center text-white font-extrabold text-base shadow-sm ring-1 ring-indigo-500/20 shrink-0">
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
          </div>

          {/* Close button for mobile */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <nav className="mt-3 px-3 space-y-1 flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
          {/* Dashboard */}
          <div className={`text-[11px] font-extrabold text-[#475569] uppercase tracking-[0.05em] mb-1.5 px-2.5 py-1.5 mt-2 rounded-lg bg-[#EEF2FF] ${
            isExpanded ? 'block' : 'lg:hidden'
          }`}>
            {t('nav.overview', 'Overview')}
          </div>
          <Link
            to="/dashboard"
            id="nav-link-dashboard"
            onClick={handleLinkClick}
            title={t('nav.dashboard', 'Dashboard')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-[13px] cursor-pointer ${
              isActive('/dashboard', true)
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 shrink-0 text-slate-500" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.dashboard', 'Dashboard')}
            </span>
          </Link>

          {/* POS Management */}
          {canViewPos && (
            <>
              <div className={`text-[11px] font-extrabold text-[#475569] uppercase tracking-[0.05em] mb-1.5 px-2.5 py-1.5 mt-4 rounded-lg bg-[#EEF2FF] ${
                isExpanded ? 'block' : 'lg:hidden'
              }`}>
                {t('nav.pos', 'POS')}
              </div>
              <Link
                to="/pos"
                id="nav-link-open-pos-session"
                onClick={handleLinkClick}
                title={t('nav.openPosSession', 'Open POS Counter Session')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  location.pathname === '/pos'
                    ? 'bg-emerald-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/pos/terminals')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/pos/shifts')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/pos/payment-methods')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/pos/loyalty-settings')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
          <div className={`text-[11px] font-extrabold text-[#475569] uppercase tracking-[0.05em] mb-1.5 px-2.5 py-1.5 mt-4 rounded-lg bg-[#EEF2FF] ${
            isExpanded ? 'block' : 'lg:hidden'
          }`}>
            {t('nav.productMaster', 'Product Master')}
          </div>
          <Link
            to="/products/item-information"
            id="nav-link-item-information"
            onClick={handleLinkClick}
            title={t('nav.itemInformation', 'Item Information')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/products/item-information')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/products', true)
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/categories')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/brands')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/units')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/attributes')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0 text-violet-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.attributes', 'Attributes & Values')}
            </span>
          </Link>

          {/* Inventory Management */}
          <div className={`text-[11px] font-extrabold text-[#475569] uppercase tracking-[0.05em] mb-1.5 px-2.5 py-1.5 mt-4 rounded-lg bg-[#EEF2FF] ${
            isExpanded ? 'block' : 'lg:hidden'
          }`}>
            {t('nav.inventory', 'Inventory')}
          </div>
          <Link
            to="/inventory"
            id="nav-link-inventory"
            onClick={handleLinkClick}
            title={t('nav.stockLevels', 'Stock Levels')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/inventory', true)
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/inventory/movements')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/inventory/adjustments')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/inventory/transfers')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/inventory/stock-counts')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/inventory/batches')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/inventory/valuation')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/inventory/reconciliation')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0 text-slate-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.reconciliation', 'Reconciliation')}
            </span>
          </Link>

          {/* Procurement / Purchases */}
          <div className={`text-[11px] font-extrabold text-[#475569] uppercase tracking-[0.05em] mb-1.5 px-2.5 py-1.5 mt-4 rounded-lg bg-[#EEF2FF] ${
            isExpanded ? 'block' : 'lg:hidden'
          }`}>
            {t('nav.procurement', 'Procurement')}
          </div>
          <Link
            to="/procurement/dashboard"
            id="nav-link-procurement-dashboard"
            onClick={handleLinkClick}
            title={t('nav.procurementDashboard', 'Procurement Intelligence')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/procurement/dashboard')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/procurement/requisitions')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/procurement/rfqs')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/purchases/suppliers')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/procurement/supplier-performance')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/procurement/contracts')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/purchases/orders')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/purchases/goods-receipts')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/purchases', true)
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/procurement/matching')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/procurement/planning')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/purchases/payables')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <CreditCard className="w-4 h-4 shrink-0 text-rose-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.supplierPayables', 'Supplier Payables')}
            </span>
          </Link>

          {/* CRM & Sales */}
          <div className={`text-[11px] font-extrabold text-[#475569] uppercase tracking-[0.05em] mb-1.5 px-2.5 py-1.5 mt-4 rounded-lg bg-[#EEF2FF] ${
            isExpanded ? 'block' : 'lg:hidden'
          }`}>
            {t('nav.crmSales', 'Sales & Customers')}
          </div>
          <Link
            to="/sales-returns"
            id="nav-link-sales-returns"
            onClick={handleLinkClick}
            title={t('nav.salesReturns', 'Sales Returns & Exchanges')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/sales-returns')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/customers', true)
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/customers/groups')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0 text-slate-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.customerGroups', 'Customer Groups')}
            </span>
          </Link>
          <Link
            to="/crm/customer-360"
            id="nav-link-customer-360"
            onClick={handleLinkClick}
            title={t('nav.customer360', 'Customer 360')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/crm/customer-360')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <UserCheck className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.customer360', 'Customer 360')}
            </span>
          </Link>
          <Link
            to="/crm/credit"
            id="nav-link-customer-credit"
            onClick={handleLinkClick}
            title={t('nav.customerCredit', 'Credit & Limits')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/crm/credit')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <CreditCard className="w-4 h-4 shrink-0 text-indigo-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.customerCredit', 'Credit & Limits')}
            </span>
          </Link>
          <Link
            to="/crm/ar-aging"
            id="nav-link-ar-aging"
            onClick={handleLinkClick}
            title={t('nav.arAging', 'AR Aging & Collections')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/crm/ar-aging')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0 text-amber-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.arAging', 'AR Aging & Collections')}
            </span>
          </Link>
          <Link
            to="/crm/activities"
            id="nav-link-crm-activities"
            onClick={handleLinkClick}
            title={t('nav.crmActivityCenter', 'CRM & Activities')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/crm/activities')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <Activity className="w-4 h-4 shrink-0 text-indigo-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.crmActivityCenter', 'CRM & Activities')}
            </span>
          </Link>
          <Link
            to="/crm/intelligence"
            id="nav-link-customer-intelligence"
            onClick={handleLinkClick}
            title={t('nav.customerIntelligence', 'Customer Intelligence')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/crm/intelligence')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <Award className="w-4 h-4 shrink-0 text-purple-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.customerIntelligence', 'Customer Intelligence')}
            </span>
          </Link>
          <Link
            to="/crm/sales-intelligence"
            id="nav-link-sales-intelligence"
            onClick={handleLinkClick}
            title={t('nav.salesIntelligence', 'Sales & Demand Intelligence')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/crm/sales-intelligence')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <TrendingUp className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.salesIntelligence', 'Sales & Demand Intelligence')}
            </span>
          </Link>

          {/* E-Commerce & Omnichannel */}
          {canViewEcommerce && (
            <>
              <div className={`text-[11px] font-extrabold text-[#475569] uppercase tracking-[0.05em] mb-1.5 px-2.5 py-1.5 mt-4 rounded-lg bg-[#EEF2FF] ${
                isExpanded ? 'block' : 'lg:hidden'
              }`}>
                {t('nav.ecommerce', 'E-Commerce')}
              </div>
              <Link
                to="/ecommerce/dashboard"
                id="nav-link-ecommerce-dashboard"
                onClick={handleLinkClick}
                title={t('nav.ecomDashboard', 'E-Commerce Dashboard')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/ecommerce/dashboard')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <Globe className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.ecomDashboard', 'E-Com Dashboard')}
                </span>
              </Link>
              <Link
                to="/ecommerce/orders"
                id="nav-link-ecommerce-orders"
                onClick={handleLinkClick}
                title={t('nav.ecomOrders', 'Online Orders')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/ecommerce/orders')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <ShoppingBag className="w-4 h-4 shrink-0 text-indigo-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.ecomOrders', 'Online Orders')}
                </span>
              </Link>
              <Link
                to="/ecommerce/fulfillment"
                id="nav-link-ecommerce-fulfillment"
                onClick={handleLinkClick}
                title={t('nav.ecomFulfillment', 'Fulfillment & Dispatch')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/ecommerce/fulfillment')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <Truck className="w-4 h-4 shrink-0 text-sky-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.ecomFulfillment', 'Fulfillment & Dispatch')}
                </span>
              </Link>
              <Link
                to="/ecommerce/catalog"
                id="nav-link-ecommerce-catalog"
                onClick={handleLinkClick}
                title={t('nav.ecomCatalog', 'Online Catalog')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/ecommerce/catalog')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <Package className="w-4 h-4 shrink-0 text-cyan-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.ecomCatalog', 'Online Catalog')}
                </span>
              </Link>
              <Link
                to="/ecommerce/categories"
                id="nav-link-ecommerce-categories"
                onClick={handleLinkClick}
                title={t('nav.ecomCategories', 'E-Com Categories')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/ecommerce/categories')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <FolderTree className="w-4 h-4 shrink-0 text-violet-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.ecomCategories', 'E-Com Categories')}
                </span>
              </Link>
              <Link
                to="/ecommerce/coupons"
                id="nav-link-ecommerce-coupons"
                onClick={handleLinkClick}
                title={t('nav.ecomCoupons', 'Coupons & Promos')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/ecommerce/coupons')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <Percent className="w-4 h-4 shrink-0 text-amber-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.ecomCoupons', 'Coupons & Promos')}
                </span>
              </Link>
              <Link
                to="/ecommerce/shipping"
                id="nav-link-ecommerce-shipping"
                onClick={handleLinkClick}
                title={t('nav.ecomShipping', 'Shipping & Delivery')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/ecommerce/shipping')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <MapPin className="w-4 h-4 shrink-0 text-rose-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.ecomShipping', 'Shipping & Rates')}
                </span>
              </Link>
              <Link
                to="/ecommerce/reviews"
                id="nav-link-ecommerce-reviews"
                onClick={handleLinkClick}
                title={t('nav.ecomReviews', 'Review Moderation')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/ecommerce/reviews')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <Star className="w-4 h-4 shrink-0 text-amber-300" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.ecomReviews', 'Review Moderation')}
                </span>
              </Link>
              <Link
                to="/ecommerce/returns"
                id="nav-link-ecommerce-returns"
                onClick={handleLinkClick}
                title={t('nav.ecomReturns', 'Online Returns')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/ecommerce/returns')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <RotateCcw className="w-4 h-4 shrink-0 text-orange-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.ecomReturns', 'Online Returns')}
                </span>
              </Link>
              <Link
                to="/ecommerce/reports"
                id="nav-link-ecommerce-reports"
                onClick={handleLinkClick}
                title={t('nav.ecomReports', 'E-Commerce Reports')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/ecommerce/reports')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0 text-blue-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.ecomReports', 'E-Com Reports')}
                </span>
              </Link>
              <Link
                to="/ecommerce/settings"
                id="nav-link-ecommerce-settings"
                onClick={handleLinkClick}
                title={t('nav.ecomSettings', 'Store Settings')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/ecommerce/settings')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <Settings className="w-4 h-4 shrink-0 text-slate-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.ecomSettings', 'Store Settings')}
                </span>
              </Link>
              <Link
                to="/store"
                target="_blank"
                id="nav-link-live-storefront"
                onClick={handleLinkClick}
                title={t('nav.storefront', 'Customer Storefront')}
                className="flex items-center justify-between px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 border border-emerald-800/40 my-1"
              >
                <div className="flex items-center gap-3">
                  <Store className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span className={`truncate whitespace-nowrap font-medium ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                    {t('nav.storefront', 'Live Storefront')}
                  </span>
                </div>
                <ExternalLink className={`w-3.5 h-3.5 shrink-0 ${isExpanded ? 'inline' : 'lg:hidden'}`} />
              </Link>
            </>
          )}

          {/* HRM & Workforce */}
          <div className={`text-[11px] font-extrabold text-[#475569] uppercase tracking-[0.05em] mb-1.5 px-2.5 py-1.5 mt-4 rounded-lg bg-[#EEF2FF] ${
            isExpanded ? 'block' : 'lg:hidden'
          }`}>
            {t('nav.hrm', 'HRM & Workforce')}
          </div>
          <Link
            to="/hr/dashboard"
            id="nav-link-hr-dashboard"
            onClick={handleLinkClick}
            title={t('nav.hrDashboard', 'HR Command Center')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/hr/dashboard')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <UserCheck className="w-4 h-4 shrink-0 text-indigo-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.hrDashboard', 'HR Command Center')}
            </span>
          </Link>
          <Link
            to="/hr/employees"
            id="nav-link-hr-employees"
            onClick={handleLinkClick}
            title={t('nav.employees', 'Workforce Directory')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/hr/employees')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <Users className="w-4 h-4 shrink-0 text-sky-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.employees', 'Workforce Directory')}
            </span>
          </Link>
          <Link
            to="/hr/departments"
            id="nav-link-hr-departments"
            onClick={handleLinkClick}
            title={t('nav.departments', 'Departments & Roles')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/hr/departments')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0 text-cyan-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.departments', 'Departments & Roles')}
            </span>
          </Link>
          <Link
            to="/hr/attendance"
            id="nav-link-hr-attendance"
            onClick={handleLinkClick}
            title={t('nav.attendance', 'Attendance & Shifts')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/hr/attendance')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.attendance', 'Attendance & Shifts')}
            </span>
          </Link>
          <Link
            to="/hr/leaves"
            id="nav-link-hr-leaves"
            onClick={handleLinkClick}
            title={t('nav.leaves', 'Leave Management')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/hr/leaves')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <ClipboardCheck className="w-4 h-4 shrink-0 text-amber-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.leaves', 'Leave Management')}
            </span>
          </Link>
          <Link
            to="/hr/payroll"
            id="nav-link-hr-payroll"
            onClick={handleLinkClick}
            title={t('nav.payroll', 'Payroll Engine')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/hr/payroll')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <DollarSign className="w-4 h-4 shrink-0 text-purple-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.payroll', 'Payroll Engine')}
            </span>
          </Link>
          <Link
            to="/hr/advances-loans"
            id="nav-link-hr-advances-loans"
            onClick={handleLinkClick}
            title={t('nav.advancesLoans', 'Advances & Loans')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/hr/advances-loans')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <CreditCard className="w-4 h-4 shrink-0 text-rose-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.advancesLoans', 'Advances & Loans')}
            </span>
          </Link>

          {/* Finance & Expenses */}
          <div className={`text-[11px] font-extrabold text-[#475569] uppercase tracking-[0.05em] mb-1.5 px-2.5 py-1.5 mt-4 rounded-lg bg-[#EEF2FF] ${
            isExpanded ? 'block' : 'lg:hidden'
          }`}>
            {t('nav.finance', 'Finance')}
          </div>
          <Link
            to="/accounting"
            id="nav-link-accounting"
            onClick={handleLinkClick}
            title={t('nav.accounting', 'Accounting')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/accounting')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/expenses')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <Receipt className="w-4 h-4 shrink-0 text-rose-400" />
            <span className={`font-medium truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.expenses', 'Expenses')}
            </span>
          </Link>

          {/* Advanced Financial Management */}
          {canViewFinance && (
            <>
              <Link
                to="/finance/dashboard"
                id="nav-link-finance-dashboard"
                onClick={handleLinkClick}
                title={t('nav.financeDashboard', 'Financial Dashboard')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/finance/dashboard')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <TrendingUp className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.financeDashboard', 'Financial Dashboard')}
                </span>
              </Link>
              <Link
                to="/finance/budgets"
                id="nav-link-finance-budgets"
                onClick={handleLinkClick}
                title={t('nav.budgets', 'Budgets & Controls')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/finance/budgets')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <Percent className="w-4 h-4 shrink-0 text-indigo-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.budgets', 'Budgets & Controls')}
                </span>
              </Link>
              <Link
                to="/finance/treasury"
                id="nav-link-finance-treasury"
                onClick={handleLinkClick}
                title={t('nav.treasury', 'Cash & Treasury')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/finance/treasury')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <Wallet className="w-4 h-4 shrink-0 text-teal-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.treasury', 'Cash & Treasury')}
                </span>
              </Link>
              <Link
                to="/finance/banks"
                id="nav-link-finance-banks"
                onClick={handleLinkClick}
                title={t('nav.bankAccounts', 'Bank Accounts')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/finance/banks')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <Landmark className="w-4 h-4 shrink-0 text-blue-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.bankAccounts', 'Bank Accounts')}
                </span>
              </Link>
              <Link
                to="/finance/bank-reconciliation"
                id="nav-link-finance-bank-recon"
                onClick={handleLinkClick}
                title={t('nav.bankReconciliation', 'Bank Reconciliation')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/finance/bank-reconciliation')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <FileCheck2 className="w-4 h-4 shrink-0 text-cyan-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.bankReconciliation', 'Bank Reconciliation')}
                </span>
              </Link>
              <Link
                to="/finance/periods"
                id="nav-link-finance-periods"
                onClick={handleLinkClick}
                title={t('nav.periodClosing', 'Period & Year-End Close')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/finance/periods')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <CalendarCheck className="w-4 h-4 shrink-0 text-amber-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.periodClosing', 'Period & Year-End Close')}
                </span>
              </Link>
              <Link
                to="/finance/centres"
                id="nav-link-finance-centres"
                onClick={handleLinkClick}
                title={t('nav.costProfitCentres', 'Cost & Profit Centres')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/finance/centres')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <Building2 className="w-4 h-4 shrink-0 text-purple-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.costProfitCentres', 'Cost & Profit Centres')}
                </span>
              </Link>
              <Link
                to="/finance/ar"
                id="nav-link-finance-ar"
                onClick={handleLinkClick}
                title={t('nav.financeArAging', 'AR Aging & Priorities')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/finance/ar')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <DollarSign className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.financeArAging', 'AR Aging & Priorities')}
                </span>
              </Link>
              <Link
                to="/finance/ap"
                id="nav-link-finance-ap"
                onClick={handleLinkClick}
                title={t('nav.apAging', 'AP Aging & Scheduling')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/finance/ap')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <Receipt className="w-4 h-4 shrink-0 text-rose-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.apAging', 'AP Aging & Scheduling')}
                </span>
              </Link>
              <Link
                to="/finance/fixed-assets"
                id="nav-link-finance-fixed-assets"
                onClick={handleLinkClick}
                title={t('nav.fixedAssets', 'Fixed Assets')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/finance/fixed-assets')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0 text-orange-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.fixedAssets', 'Fixed Assets')}
                </span>
              </Link>
              <Link
                to="/finance/analytics"
                id="nav-link-finance-analytics"
                onClick={handleLinkClick}
                title={t('nav.financialAnalytics', 'Financial Analytics & Ratios')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/finance/analytics')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <Scale className="w-4 h-4 shrink-0 text-pink-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.financialAnalytics', 'Financial Analytics')}
                </span>
              </Link>
            </>
          )}

          {/* Tax & VAT Compliance */}
          <div className={`text-[11px] font-extrabold text-[#475569] uppercase tracking-[0.05em] mb-1.5 px-2.5 py-1.5 mt-4 rounded-lg bg-[#EEF2FF] ${
            isExpanded ? 'block' : 'lg:hidden'
          }`}>
            {t('nav.taxCompliance', 'Tax & VAT Compliance')}
          </div>
          <Link
            to="/tax/dashboard"
            id="nav-link-tax-dashboard"
            onClick={handleLinkClick}
            title={t('nav.taxDashboard', 'Tax Dashboard')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/tax/dashboard')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <Scale className="w-4 h-4 shrink-0 text-amber-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.taxDashboard', 'Tax Dashboard')}
            </span>
          </Link>
          <Link
            to="/tax/profiles"
            id="nav-link-tax-profiles"
            onClick={handleLinkClick}
            title={t('nav.taxProfiles', 'Tax Profiles & Registrations')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/tax/profiles')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0 text-indigo-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.taxProfiles', 'BIN & Registrations')}
            </span>
          </Link>
          <Link
            to="/tax/rules"
            id="nav-link-tax-rules"
            onClick={handleLinkClick}
            title={t('nav.taxRules', 'Tax Rates & Rules')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/tax/rules')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <Tag className="w-4 h-4 shrink-0 text-sky-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.taxRules', 'Rates & SD Rules')}
            </span>
          </Link>
          <Link
            to="/tax/periods"
            id="nav-link-tax-periods"
            onClick={handleLinkClick}
            title={t('nav.taxPeriods', 'Tax Filing Periods')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/tax/periods')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.taxPeriods', 'Filing Periods')}
            </span>
          </Link>
          <Link
            to="/tax/transactions"
            id="nav-link-tax-transactions"
            onClick={handleLinkClick}
            title={t('nav.taxTransactions', 'Tax Subledger Register')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/tax/transactions')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0 text-cyan-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.taxTransactions', 'Tax Subledger')}
            </span>
          </Link>
          <Link
            to="/tax/reconciliation"
            id="nav-link-tax-reconciliation"
            onClick={handleLinkClick}
            title={t('nav.taxReconciliation', 'Subledger vs GL Audit')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/tax/reconciliation')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0 text-purple-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.taxReconciliation', 'GL Reconciliation')}
            </span>
          </Link>
          <Link
            to="/tax/adjustments"
            id="nav-link-tax-adjustments"
            onClick={handleLinkClick}
            title={t('nav.taxAdjustments', 'Tax Adjustments & Notes')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/tax/adjustments')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0 text-rose-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.taxAdjustments', 'Adjustments')}
            </span>
          </Link>
          <Link
            to="/tax/reports"
            id="nav-link-tax-reports"
            onClick={handleLinkClick}
            title={t('nav.taxReports', 'Mushak 9.1 & VAT Reports')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/tax/reports')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0 text-blue-400" />
            <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
              {t('nav.taxReports', 'Mushak & VAT Reports')}
            </span>
          </Link>

          {/* Advanced BI & Management Reporting */}
          {canViewBi && (
            <>
              <div className={`text-[11px] font-extrabold text-[#475569] uppercase tracking-[0.05em] mb-1.5 px-2.5 py-1.5 mt-4 rounded-lg bg-[#EEF2FF] ${
                isExpanded ? 'block' : 'lg:hidden'
              }`}>
                {t('bi.title', 'Management BI & Intelligence')}
              </div>
              <Link
                to="/bi/executive"
                id="nav-link-bi-executive"
                onClick={handleLinkClick}
                title={t('bi.executiveDashboard', 'Executive Dashboard')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/bi/executive')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <TrendingUp className="w-4 h-4 shrink-0 text-indigo-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('bi.executiveDashboard', 'Executive Dashboard')}
                </span>
              </Link>
              <Link
                to="/bi/sales"
                id="nav-link-bi-sales"
                onClick={handleLinkClick}
                title={t('bi.salesBi', 'Sales Intelligence')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/bi/sales')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <ShoppingCart className="w-4 h-4 shrink-0 text-blue-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('bi.salesBi', 'Sales Intelligence')}
                </span>
              </Link>
              <Link
                to="/bi/profitability"
                id="nav-link-bi-profitability"
                onClick={handleLinkClick}
                title={t('bi.profitabilityBi', 'Profitability & Margins')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/bi/profitability')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <DollarSign className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('bi.profitabilityBi', 'Profitability & Margins')}
                </span>
              </Link>
              <Link
                to="/bi/inventory"
                id="nav-link-bi-inventory"
                onClick={handleLinkClick}
                title={t('bi.inventoryBi', 'Inventory & Aging Analytics')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/bi/inventory')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <Package className="w-4 h-4 shrink-0 text-amber-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('bi.inventoryBi', 'Inventory & Aging')}
                </span>
              </Link>
              <Link
                to="/bi/customer"
                id="nav-link-bi-customer"
                onClick={handleLinkClick}
                title={t('bi.customerBi', 'Customer Portfolio & RFM')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/bi/customer')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <Users className="w-4 h-4 shrink-0 text-indigo-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('bi.customerBi', 'Customer & RFM')}
                </span>
              </Link>
              <Link
                to="/bi/supplier"
                id="nav-link-bi-supplier"
                onClick={handleLinkClick}
                title={t('bi.supplierBi', 'Supplier Scorecard & AP')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/bi/supplier')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <Truck className="w-4 h-4 shrink-0 text-teal-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('bi.supplierBi', 'Supplier Scorecard')}
                </span>
              </Link>
              <Link
                to="/bi/finance"
                id="nav-link-bi-finance"
                onClick={handleLinkClick}
                title={t('bi.financeBi', 'Financial Ratios & DuPont')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/bi/finance')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <Scale className="w-4 h-4 shrink-0 text-purple-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('bi.financeBi', 'Finance Ratios & DuPont')}
                </span>
              </Link>
              <Link
                to="/bi/alerts"
                id="nav-link-bi-alerts"
                onClick={handleLinkClick}
                title={t('bi.alerts', 'Management Alerts')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/bi/alerts')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0 text-rose-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('bi.alerts', 'Management Alerts')}
                </span>
              </Link>
              <Link
                to="/bi/report-builder"
                id="nav-link-bi-builder"
                onClick={handleLinkClick}
                title={t('bi.reportBuilder', 'Custom Report Builder')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/bi/report-builder')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0 text-cyan-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('bi.reportBuilder', 'Report Builder')}
                </span>
              </Link>
              <Link
                to="/bi/saved-reports"
                id="nav-link-bi-saved"
                onClick={handleLinkClick}
                title={t('bi.savedReports', 'Saved Reports')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/bi/saved-reports')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <Layers className="w-4 h-4 shrink-0 text-sky-400" />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('bi.savedReports', 'Saved Reports')}
                </span>
              </Link>
            </>
          )}

          {/* Organization */}
          <div className={`text-[11px] font-extrabold text-[#475569] uppercase tracking-[0.05em] mb-1.5 px-2.5 py-1.5 mt-4 rounded-lg bg-[#EEF2FF] ${
            isExpanded ? 'block' : 'lg:hidden'
          }`}>
            {t('nav.organization', 'Organization')}
          </div>
          <Link
            to="/company"
            id="nav-link-company"
            onClick={handleLinkClick}
            title={t('nav.company', 'Company')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/company')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/business-units')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/branches')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/warehouses')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-[13px] ${
              isActive('/storage-locations')
                ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
              <div className={`text-[11px] font-extrabold text-[#475569] uppercase tracking-[0.05em] mb-1.5 px-2.5 py-1.5 mt-4 rounded-lg bg-[#EEF2FF] ${
                isExpanded ? 'block' : 'lg:hidden'
              }`}>
                {t('nav.administration', 'Administration')}
              </div>
              <Link
                to="/users"
                id="nav-link-users"
                onClick={handleLinkClick}
                title={t('nav.users', 'Users')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/users')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/roles') || isActive('/permissions')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-[13px] ${
                  isActive('/audit-logs')
                    ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
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
              <div className={`text-[11px] font-extrabold text-[#475569] uppercase tracking-[0.05em] mb-1.5 px-2.5 py-1.5 mt-4 rounded-lg bg-[#EEF2FF] ${
                isExpanded ? 'block' : 'lg:hidden'
              }`}>
                {t('nav.system', 'System')}
              </div>
              <Link
                to="/settings"
                id="nav-link-settings"
                onClick={handleLinkClick}
                title={t('nav.settings', 'Settings')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-[13px] mb-3 ${
                  isActive('/settings')
                    ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/20'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                }`}
              >
                <Settings className={`w-4 h-4 shrink-0 ${isActive('/settings') ? 'text-white' : 'text-slate-400'}`} />
                <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                  {t('nav.settings', 'Settings')}
                </span>
              </Link>
            </>
          )}
        </nav>

        {/* User Profile / Logout Footer */}
        <div className="p-3.5 border-t border-[#E2E8F0] bg-white/80 backdrop-blur-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 border border-indigo-300 flex items-center justify-center shrink-0 text-indigo-700 font-extrabold text-xs shadow-xs">
              <span>{getInitials(user?.name)}</span>
            </div>
            <div className={`flex flex-col min-w-0 transition-opacity duration-200 ${
              isExpanded ? 'flex' : 'lg:hidden'
            }`}>
              <span className="text-[13px] font-extrabold text-slate-900 truncate">{user?.name || 'Super Admin'}</span>
              <span className="text-[11px] text-[#475569] font-bold uppercase tracking-wider truncate">{primaryRole}</span>
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
        </div>
      </aside>
    </>
  );
}
