import { useState, useEffect, Fragment } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Monitor,
  Clock,
  CreditCard,
  Award,
  Package,
  Barcode,
  Shirt,
  FolderTree,
  Tag,
  Scale,
  Layers,
  Truck,
  TrendingUp,
  FileText,
  Users,
  ShieldCheck,
  Boxes,
  History,
  SlidersHorizontal,
  MapPin,
  ClipboardCheck,
  DollarSign,
  RotateCcw,
  UserCheck,
  Activity,
  Store,
  Globe,
  ShoppingBag,
  Building2,
  CalendarCheck,
  Landmark,
  Wallet,
  Receipt,
  FileCheck2,
  Sparkles,
  Network,
  X,
  LogOut,
  ChevronDown,
  ChevronRight,
  Settings,
  Percent,
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { useCompany } from '../../contexts/CompanyContext';
import { useLanguage } from '../../i18n';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export interface SubMenuItem {
  id: string;
  label: string;
  path: string;
  permission?: string;
  exact?: boolean;
  children?: SubMenuItem[];
}

export interface NavModule {
  id: string;
  section?: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  standalonePath?: string;
  items?: SubMenuItem[];
}

export function Sidebar({ isMobileOpen = false, onCloseMobile }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasRole, hasPermission } = useAuth();
  const { company: activeCompany } = useCompany();
  const { t } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);

  // State to track open/collapsed state of each Main Head
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  // State to track open/collapsed state of nested submenus (e.g. Purchase Reports)
  const [openSubSections, setOpenSubSections] = useState<Record<string, boolean>>({
    purchase_reports: true,
  });

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

  const isActive = (path: string, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || (path !== '/' && path !== '/dashboard' && location.pathname.startsWith(path));
  };

  // Complete required menu hierarchy
  const modules: NavModule[] = [
    // Standalone Overview
    {
      id: 'overview',
      section: 'Overview',
      title: 'Overview',
      icon: LayoutDashboard,
      standalonePath: '/dashboard',
    },
    // A. POS
    {
      id: 'pos',
      section: 'Operations & Workflow',
      title: 'POS',
      icon: ShoppingCart,
      items: [
        { id: 'open_pos', label: 'Open POS Counter Session', path: '/pos', exact: true },
        { id: 'pos_terminals', label: 'POS Terminal Management', path: '/pos/terminals' },
        { id: 'pos_shifts', label: 'Shift History', path: '/pos/shifts' },
        { id: 'payment_methods', label: 'Payment Methods', path: '/pos/payment-methods' },
        { id: 'loyalty_settings', label: 'Loyalty Settings', path: '/pos/loyalty-settings' },
      ],
    },
    // B. Product Master
    {
      id: 'product_master',
      title: 'Product Master',
      icon: Package,
      items: [
        { id: 'item_information', label: 'Item Information', path: '/products/item-information' },
        { id: 'products_skus', label: 'Products & SKUS Entry', path: '/products', exact: true },
        { id: 'categories', label: 'Categories', path: '/categories' },
        { id: 'brands', label: 'Brands', path: '/brands' },
        { id: 'units', label: 'Units of Measure', path: '/units' },
        { id: 'attributes', label: 'Attributes & Values', path: '/attributes' },
      ],
    },
    // C. Purchase (formerly Procurement)
    {
      id: 'procurement',
      title: 'Purchase',
      icon: Truck,
      items: [
        { id: 'procurement_intel', label: 'Purchase Intelligence', path: '/procurement/dashboard' },
        { id: 'procurement_suppliers', label: 'Suppliers', path: '/purchases/suppliers' },
        { id: 'purchase_orders', label: 'Purchase Orders', path: '/purchases/orders' },
        { id: 'purchase_invoices', label: 'Purchase Invoices', path: '/purchases', exact: true },
        { id: 'supplier_returns', label: 'Supplier Returns', path: '/purchases/returns' },
        { id: 'supplier_payables', label: 'Supplier Payables', path: '/purchases/payables' },
        {
          id: 'purchase_reports',
          label: 'Purchase Reports',
          path: '/purchases/reports',
          children: [
            { id: 'report_date_wise', label: 'Date Wise Purchase', path: '/purchases/reports/date-wise' },
            { id: 'report_date_wise_2', label: 'Date Wise Purchase-2', path: '/purchases/reports/date-wise-summary' },
            { id: 'report_received_vouchers', label: 'Detail Voucher (Received)', path: '/purchases/reports/received-vouchers' },
            { id: 'report_ordered_vouchers', label: 'Detail Buy Voucher (Ordered)', path: '/purchases/reports/ordered-vouchers' },
            { id: 'report_booth_wise', label: 'Booth Wise Purchase', path: '/purchases/reports/booth-wise' },
            { id: 'report_item_wise', label: 'Item Wise Purchase', path: '/purchases/reports/item-wise' },
            { id: 'report_item_history', label: 'Item Wise Purchase History', path: '/purchases/reports/item-history' },
            { id: 'report_supplier_wise', label: 'Supplier Wise Purchase', path: '/purchases/reports/supplier-wise' },
            { id: 'report_cancelled_vouchers', label: 'Vouchers Cancelled', path: '/purchases/reports/cancelled-vouchers' },
            { id: 'report_pending_approval', label: 'Vouchers Waiting for Approval', path: '/purchases/reports/pending-approval' },
          ],
        },
      ],
    },
    // D. Inventory Management
    {
      id: 'inventory',
      title: 'Inventory Management',
      icon: Boxes,
      items: [
        { id: 'stock_levels', label: 'Stock Levels', path: '/inventory', exact: true },
        { id: 'stock_movements', label: 'Stock Movements', path: '/inventory/movements' },
        { id: 'stock_adjustments', label: 'Stock Adjustments', path: '/inventory/adjustments' },
        { id: 'transfers', label: 'Transfers', path: '/inventory/transfers' },
        { id: 'stock_counts', label: 'Stock Counts', path: '/inventory/stock-counts' },
        { id: 'batches_expiry', label: 'Batches & Expiry', path: '/inventory/batches' },
        { id: 'valuation_report', label: 'Valuation Report', path: '/inventory/valuation' },
        { id: 'reconciliation', label: 'Reconciliation', path: '/inventory/reconciliation' },
      ],
    },
    // E. CRM & Sales
    {
      id: 'crm_sales',
      title: 'CRM & Sales',
      icon: Users,
      items: [
        { id: 'sales_returns', label: 'Sales Returns & Exchanges', path: '/sales-returns' },
        { id: 'customers', label: 'Customers', path: '/customers', exact: true },
        { id: 'customer_groups', label: 'Customer Groups', path: '/customers/groups' },
        { id: 'customer_360', label: 'Customer 360', path: '/crm/customer-360' },
        { id: 'credit_limits', label: 'Credit & Limits', path: '/crm/credit' },
        { id: 'ar_aging', label: 'AR Aging & Collections', path: '/crm/ar-aging' },
        { id: 'crm_activities', label: 'CRM & Activities', path: '/crm/activities' },
        { id: 'customer_intelligence', label: 'Customer Intelligence', path: '/crm/intelligence' },
        { id: 'sales_intelligence', label: 'Sales & Demand Intelligence', path: '/crm/sales-intelligence' },
      ],
    },
    // F. E-Commerce
    {
      id: 'ecommerce',
      title: 'E-Commerce',
      icon: Store,
      items: [
        { id: 'ecom_dashboard', label: 'E-Commerce Dashboard', path: '/ecommerce/dashboard' },
        { id: 'online_orders', label: 'Online Orders', path: '/ecommerce/orders' },
        { id: 'fulfillment_dispatch', label: 'Fulfillment & Dispatch', path: '/ecommerce/fulfillment' },
        { id: 'online_catalog', label: 'Online Catalog', path: '/ecommerce/catalog' },
        { id: 'ecom_categories', label: 'E-Com Categories', path: '/ecommerce/categories' },
        { id: 'coupons_promos', label: 'Coupons & Promos', path: '/ecommerce/coupons' },
        { id: 'shipping_delivery', label: 'Shipping & Delivery', path: '/ecommerce/shipping' },
        { id: 'review_moderation', label: 'Review Moderation', path: '/ecommerce/reviews' },
        { id: 'online_returns', label: 'Online Returns', path: '/ecommerce/returns' },
        { id: 'ecom_reports', label: 'E-Commerce Reports', path: '/ecommerce/reports' },
        { id: 'store_settings', label: 'Store Settings', path: '/ecommerce/settings' },
        { id: 'customer_storefront', label: 'Customer Storefront', path: '/store' },
      ],
    },
    // G. HRM & Workforce
    {
      id: 'hrm',
      section: 'Enterprise & Finance',
      title: 'HRM & Workforce',
      icon: Building2,
      items: [
        { id: 'hr_command_center', label: 'HR Command Center', path: '/hr/dashboard' },
        { id: 'workforce_directory', label: 'Workforce Directory', path: '/hr/employees' },
        { id: 'departments_roles', label: 'Departments & Roles', path: '/hr/departments' },
        { id: 'attendance_shifts', label: 'Attendance & Shifts', path: '/hr/attendance' },
        { id: 'leave_management', label: 'Leave Management', path: '/hr/leaves' },
        { id: 'payroll_engine', label: 'Payroll Engine', path: '/hr/payroll' },
        { id: 'advances_loans', label: 'Advances & Loans', path: '/hr/advances-loans' },
      ],
    },
    // H. Finance Accounting
    {
      id: 'finance',
      title: 'Finance Accounting',
      icon: Landmark,
      items: [
        { id: 'finance_dashboard', label: 'Dashboard', path: '/finance/dashboard' },
        { id: 'expenses', label: 'Expenses', path: '/expenses' },
        { id: 'refunds', label: 'Refunds', path: '/finance/refunds' },
        { id: 'transactions', label: 'Transactions', path: '/finance/treasury' },
        { id: 'finance_suppliers', label: 'Suppliers', path: '/finance/suppliers' },
        { id: 'supplier_payments', label: 'Supplier Payments', path: '/finance/supplier-payments' },
        { id: 'profit_loss', label: 'Profit & Loss Report', path: '/finance/profit-loss' },
        { id: 'financial_analytics', label: 'Financial Analytics', path: '/finance/analytics' },
      ],
    },
    // I. Tax & VAT Compliance
    {
      id: 'tax',
      section: 'Compliance & Intelligence',
      title: 'Tax & VAT Compliance',
      icon: Receipt,
      items: [
        { id: 'tax_dashboard', label: 'Tax Dashboard', path: '/tax/dashboard' },
        { id: 'tax_profiles', label: 'Tax Profiles & Registrations', path: '/tax/profiles' },
        { id: 'tax_rates_rules', label: 'Tax Rates & Rules', path: '/tax/rules' },
        { id: 'tax_filing_periods', label: 'Tax Filing Periods', path: '/tax/periods' },
        { id: 'tax_subledger', label: 'Tax Subledger Register', path: '/tax/transactions' },
        { id: 'subledger_gl_audit', label: 'Subledger vs GL Audit', path: '/tax/reconciliation' },
        { id: 'tax_adjustments', label: 'Tax Adjustments & Notes', path: '/tax/adjustments' },
        { id: 'vat_reports', label: 'Mushak 9.1 & VAT Reports', path: '/tax/reports' },
      ],
    },
    // J. Executive BI & Management Intelligence
    {
      id: 'bi',
      title: 'Executive BI & Management Intelligence',
      icon: Sparkles,
      items: [
        { id: 'executive_dashboard', label: 'Executive Dashboard', path: '/bi/executive' },
        { id: 'sales_intel', label: 'Sales Intelligence', path: '/bi/sales' },
        { id: 'profitability_margins', label: 'Profitability & Margins', path: '/bi/profitability' },
        { id: 'inventory_aging_analytics', label: 'Inventory & Aging Analytics', path: '/bi/inventory' },
        { id: 'customer_rfm_portfolio', label: 'Customer & RFM Portfolio', path: '/bi/customer' },
        { id: 'supplier_scorecard_ap', label: 'Supplier Scorecard & AP', path: '/bi/supplier' },
        { id: 'financial_ratios_dupont', label: 'Financial Ratios & DuPont', path: '/bi/finance' },
        { id: 'management_alerts', label: 'Management Alerts', path: '/bi/alerts' },
        { id: 'custom_report_builder', label: 'Custom Report Builder', path: '/bi/report-builder' },
        { id: 'saved_reports_schedules', label: 'Saved Reports & Schedules', path: '/bi/saved-reports' },
      ],
    },
    // K. Organization Company
    {
      id: 'organization',
      section: 'Administration & System',
      title: 'Organization Company',
      icon: Network,
      items: [
        { id: 'company_profile', label: 'Company Profile', path: '/company' },
        { id: 'business_units', label: 'Business Units', path: '/business-units' },
        { id: 'branches', label: 'Branches', path: '/branches' },
        { id: 'warehouses', label: 'Warehouses', path: '/warehouses' },
        { id: 'storage_locations', label: 'Storage Locations', path: '/storage-locations' },
      ],
    },
    // L. Administration
    {
      id: 'administration',
      title: 'Administration',
      icon: ShieldCheck,
      items: [
        { id: 'users', label: 'Users', path: '/users' },
        { id: 'roles_permissions', label: 'Roles & Permissions', path: '/roles' },
      ],
    },
    // M. Audit Logs
    {
      id: 'audit_logs',
      title: 'Audit Logs',
      icon: History,
      standalonePath: '/audit-logs',
    },
    // N. System
    {
      id: 'system',
      title: 'System',
      icon: Settings,
      items: [
        { id: 'settings', label: 'Settings', path: '/settings' },
      ],
    },
  ];

  // Auto-expand section containing active route on load and route change
  useEffect(() => {
    modules.forEach((mod) => {
      const hasActiveChild = mod.items && mod.items.some((item) => 
        isActive(item.path, item.exact) || item.children?.some((child) => isActive(child.path, child.exact))
      );
      if (hasActiveChild) {
        setOpenSections((prev) => ({ ...prev, [mod.id]: true }));
      }
    });
  }, [location.pathname]);

  const toggleSection = (modId: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [modId]: !prev[modId],
    }));
  };

  const toggleSubSection = (subId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOpenSubSections((prev) => ({
      ...prev,
      [subId]: !prev[subId],
    }));
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
          isMobileOpen
            ? 'fixed inset-y-0 left-0 z-50 w-72 shadow-2xl translate-x-0 flex'
            : 'hidden lg:flex'
        } ${
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
        <nav className="mt-2 px-3 space-y-1.5 flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300 py-2">
          {modules.map((mod, idx) => {
            const ModIcon = mod.icon;
            const isOpen = Boolean(openSections[mod.id]);
            const hasChildren = Boolean(mod.items && mod.items.length > 0);
            const isChildActive = mod.items?.some((item) => isActive(item.path, item.exact));
            const showSection = isExpanded && Boolean(mod.section) && (idx === 0 || modules[idx - 1]?.section !== mod.section);
            const sectionHeading = showSection ? (
              <div key={`section-${mod.section}`} className="px-3 py-1.5 rounded-lg bg-[#EEF2FF] text-[11px] font-extrabold text-[#475569] uppercase tracking-[0.05em] mt-3 mb-1">
                {mod.section}
              </div>
            ) : null;

            // Standalone Link Entry
            if (!hasChildren && mod.standalonePath) {
              const active = isActive(mod.standalonePath, true);
              return (
                <Fragment key={mod.id}>
                  {sectionHeading}
                  <div className="py-0.5">
                    <Link
                      to={mod.standalonePath}
                      id={`nav-link-${mod.id}`}
                      onClick={handleLinkClick}
                      title={mod.title}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-[13px] ${
                        active
                          ? 'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                      }`}
                    >
                      <ModIcon className="w-5 h-5 shrink-0 text-slate-500" />
                      <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                        {mod.title}
                      </span>
                    </Link>
                  </div>
                </Fragment>
              );
            }

            // Collapsible Navigation Group
            return (
              <Fragment key={mod.id}>
                {sectionHeading}
                <div className="space-y-1 py-0.5">
                {/* Main Head Button */}
                <button
                  type="button"
                  onClick={() => toggleSection(mod.id)}
                  id={`nav-group-${mod.id}`}
                  title={mod.title}
                  aria-expanded={isOpen}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors text-left cursor-pointer text-[13px] ${
                    isChildActive
                      ? 'bg-indigo-50/80 text-indigo-900 font-extrabold border border-indigo-100/80'
                      : 'text-slate-800 hover:text-indigo-900 hover:bg-slate-100/80 font-extrabold'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ModIcon className={`w-5 h-5 shrink-0 ${isChildActive ? 'text-indigo-600' : 'text-slate-600'}`} />
                    <span className={`truncate whitespace-nowrap ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                      {mod.title}
                    </span>
                  </div>
                  {hasChildren && (
                    <span className={`shrink-0 text-slate-400 ${isExpanded ? 'inline' : 'lg:hidden'}`}>
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-indigo-600 font-bold" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </span>
                  )}
                </button>

                {/* Sub Heads (Children) */}
                {hasChildren && isOpen && (
                  <div className={`ml-4 pl-3.5 border-l-2 border-indigo-200/80 space-y-1 py-1 transition-all duration-200 ${
                    isExpanded ? 'block' : 'lg:hidden'
                  }`}>
                    {mod.items?.map((sub) => {
                      const hasSubChildren = Boolean(sub.children && sub.children.length > 0);
                      const isSubChildActive = sub.children?.some((child) => isActive(child.path, child.exact));
                      const isSubOpen = Boolean(openSubSections[sub.id]) || isSubChildActive;
                      const active = isActive(sub.path, sub.exact);

                      if (hasSubChildren) {
                        return (
                          <div key={sub.id} className="space-y-0.5 pt-0.5">
                            <div className="flex items-center justify-between rounded-lg">
                              <Link
                                to={sub.path}
                                id={`nav-sublink-${sub.id}`}
                                onClick={handleLinkClick}
                                title={sub.label}
                                className={`flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer truncate ${
                                  active || isSubChildActive
                                    ? 'bg-indigo-50 text-indigo-900 font-extrabold'
                                    : 'text-slate-700 hover:text-indigo-900 hover:bg-slate-200/60 font-bold'
                                }`}
                              >
                                <span className="truncate">{sub.label}</span>
                              </Link>
                              <button
                                type="button"
                                onClick={(e) => toggleSubSection(sub.id, e)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md transition-colors cursor-pointer"
                                aria-label={`Toggle ${sub.label} submenu`}
                              >
                                {isSubOpen ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                )}
                              </button>
                            </div>

                            {/* Submenu Children */}
                            {isSubOpen && (
                              <div className="ml-2 pl-2 border-l border-indigo-200/80 space-y-0.5 py-0.5">
                                {sub.children?.map((child) => {
                                  const childActive = isActive(child.path, child.exact);
                                  return (
                                    <Link
                                      key={child.id}
                                      to={child.path}
                                      id={`nav-sublink-${child.id}`}
                                      onClick={handleLinkClick}
                                      title={child.label}
                                      className={`flex items-center justify-between px-2 py-1 rounded-md text-[11px] transition-colors cursor-pointer block truncate ${
                                        childActive
                                          ? 'bg-indigo-600 text-white font-extrabold shadow-2xs'
                                          : 'text-slate-600 hover:text-indigo-900 hover:bg-slate-200/50 font-bold'
                                      }`}
                                    >
                                      <span className="truncate">{child.label}</span>
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={sub.id}
                          to={sub.path}
                          id={`nav-sublink-${sub.id}`}
                          onClick={handleLinkClick}
                          title={sub.label}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer block truncate ${
                            active
                              ? 'bg-indigo-600 text-white font-extrabold shadow-2xs'
                              : 'text-slate-700 hover:text-indigo-900 hover:bg-slate-200/60 font-bold'
                          }`}
                        >
                          <span className="truncate">{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </Fragment>
          );
        })}
        </nav>

        {/* Footer Profile & Logout */}
        <div className="p-3 border-t border-[#E2E8F0] bg-white/50 backdrop-blur-xs shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0 border border-indigo-200">
                {getInitials(user?.name)}
              </div>
              <div className={`min-w-0 transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'lg:opacity-0'}`}>
                <div className="text-[13px] font-extrabold text-slate-900 truncate" id="sidebar-user-name">
                  {user?.name || 'Super Admin'}
                </div>
                <div className="text-[11px] text-[#475569] font-bold uppercase tracking-wider truncate">
                  {primaryRole}
                </div>
              </div>
            </div>
            <button
              type="button"
              id="sidebar-logout-btn"
              onClick={handleLogout}
              title="Log Out"
              className={`p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0 ${
                isExpanded ? 'block' : 'lg:hidden'
              }`}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
