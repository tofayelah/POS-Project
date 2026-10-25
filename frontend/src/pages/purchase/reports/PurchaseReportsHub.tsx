import React, { useState } from 'react';
import { 
  FileText, Calendar, BarChart3, PackageCheck, ShoppingBag, Store, 
  Package, History, Users, XCircle, Clock, Search, ArrowRight, Printer, 
  FileSpreadsheet, RotateCcw, ShieldCheck, ChevronRight, Warehouse, 
  Layers, Building2, Percent, FileCheck2, Scale, TrendingUp, Filter
} from 'lucide-react';
import { useNavigate, Link } from 'react-router';
import { PurchaseReportFilters } from '../../../api/purchaseReports';

export const PurchaseReportsHub: React.FC = () => {
  const navigate = useNavigate();

  const [selectedReport, setSelectedReport] = useState<string>('dashboard');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [exportExcel, setExportExcel] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [dateError, setDateError] = useState<string | null>(null);

  const reportOptions = [
    {
      id: 'dashboard',
      title: 'Purchase Analytics Dashboard',
      path: '/purchases/reports/dashboard',
      icon: BarChart3,
      description: 'Executive procurement KPIs, spend trends, category allocation, and delivery velocity.',
      badge: 'Executive BI',
      category: 'analytics',
    },
    {
      id: 'date-wise',
      title: '1. Date Wise Purchase',
      path: '/purchases/reports/date-wise',
      icon: FileText,
      description: 'Summarize posted financial purchase invoices and supplier receipts chronologically.',
      badge: 'Core Financial',
      category: 'financial',
    },
    {
      id: 'date-wise-summary',
      title: '2. Date Wise Purchase-2',
      path: '/purchases/reports/date-wise-summary',
      icon: BarChart3,
      description: 'Management daily grouped summary with vendor counts, discounts, and VAT reconciliation.',
      badge: 'Executive',
      category: 'financial',
    },
    {
      id: 'received-vouchers',
      title: '3. Detail Voucher (Received)',
      path: '/purchases/reports/received-vouchers',
      icon: PackageCheck,
      description: 'Physical goods receipts (GRN) tracking ordered vs actual received and remaining quantities.',
      badge: 'Warehouse GRN',
      category: 'operations',
    },
    {
      id: 'ordered-vouchers',
      title: '4. Detail Buy Voucher (Ordered)',
      path: '/purchases/reports/ordered-vouchers',
      icon: ShoppingBag,
      description: 'Authoritative PO register showing ordered, delivered, and outstanding balances.',
      badge: 'Commitments',
      category: 'orders',
    },
    {
      id: 'order-outstanding',
      title: '5. Purchase Order Outstanding',
      path: '/purchases/reports/order-outstanding',
      icon: Clock,
      description: 'Granular tracking of unfulfilled PO lines, delivery delays, and open commitments.',
      badge: 'Fulfillment',
      category: 'orders',
    },
    {
      id: 'invoices',
      title: '6. Purchase Invoice Register',
      path: '/purchases/reports/invoices',
      icon: FileText,
      description: 'Comprehensive register of posted, draft, and unsettled supplier purchase invoices.',
      badge: 'Invoices',
      category: 'financial',
    },
    {
      id: 'booth-wise',
      title: '7. Booth Wise Purchase',
      path: '/purchases/reports/booth-wise',
      icon: Store,
      description: 'Comparative procurement spend and vendor diversification aggregated by Branch / Booth.',
      badge: 'Branch Outlets',
      category: 'organization',
    },
    {
      id: 'warehouse-wise',
      title: '8. Warehouse Wise Purchase',
      path: '/purchases/reports/warehouse-wise',
      icon: Warehouse,
      description: 'Procurement distribution, inward intake volume, and storage allocation by warehouse.',
      badge: 'Storage Depots',
      category: 'organization',
    },
    {
      id: 'category-wise',
      title: '9. Category Wise Purchase',
      path: '/purchases/reports/category-wise',
      icon: Layers,
      description: 'Product classification spend breakdown, inventory diversification, and category cost allocation.',
      badge: 'Categories',
      category: 'products',
    },
    {
      id: 'brand-wise',
      title: '10. Brand Wise Purchase',
      path: '/purchases/reports/brand-wise',
      icon: Building2,
      description: 'Supplier brand performance, manufacturer procurement volume, and brand spend share.',
      badge: 'Brands',
      category: 'products',
    },
    {
      id: 'item-wise',
      title: '11. Item Wise Purchase',
      path: '/purchases/reports/item-wise',
      icon: Package,
      description: 'Aggregated product spend, purchase volumes, and weighted average unit costing by SKU.',
      badge: 'SKU Intelligence',
      category: 'products',
    },
    {
      id: 'item-history',
      title: '12. Item Wise Purchase History',
      path: '/purchases/reports/item-history',
      icon: History,
      description: 'Comprehensive line-item transaction ledger showing price changes and delivery history.',
      badge: 'Audit Ledger',
      category: 'products',
    },
    {
      id: 'supplier-wise',
      title: '13. Supplier Wise Purchase',
      path: '/purchases/reports/supplier-wise',
      icon: Users,
      description: 'Consolidated vendor volume, purchase spend, settlements, and due payable balances.',
      badge: 'AP & Vendor',
      category: 'vendors',
    },
    {
      id: 'discount-analysis',
      title: '14. Purchase Discount Analysis',
      path: '/purchases/reports/discount-analysis',
      icon: Percent,
      description: 'Auditing negotiated supplier trade discounts, promotional rebates, and cost saving percentages.',
      badge: 'Cost Savings',
      category: 'financial',
    },
    {
      id: 'tax-vat',
      title: '15. Purchase Tax & VAT Summary',
      path: '/purchases/reports/tax-vat',
      icon: FileCheck2,
      description: 'Authoritative input tax register, taxable supply calculations, and VAT rebate ledger (Mushak 9.1).',
      badge: 'VAT Mushak 9.1',
      category: 'compliance',
    },
    {
      id: 'cancelled-vouchers',
      title: '16. Vouchers Cancelled',
      path: '/purchases/reports/cancelled-vouchers',
      icon: XCircle,
      description: 'Audit register of voided invoices and revoked purchase orders with cancellation reasons.',
      badge: 'Compliance & Audit',
      category: 'compliance',
    },
    {
      id: 'pending-approval',
      title: '17. Vouchers Waiting for Approval',
      path: '/purchases/reports/pending-approval',
      icon: Clock,
      description: 'Operational review queue of pending purchase orders and unposted draft bills with aging.',
      badge: 'Action Required',
      category: 'compliance',
    },
    {
      id: 'returns',
      title: '18. Purchase Returns & Debit Notes',
      path: '/purchases/reports/returns',
      icon: RotateCcw,
      description: 'Returned supplier merchandise, damaged batch adjustments, and issued debit notes reducing AP.',
      badge: 'Debit Notes',
      category: 'operations',
    },
    {
      id: 'reconciliation',
      title: '19. 3-Way Purchase Reconciliation',
      path: '/purchases/reports/reconciliation',
      icon: Scale,
      description: 'End-to-end 3-way reconciliation connecting Purchase Orders ➔ GRNs ➔ Invoices ➔ AP Ledger.',
      badge: 'Audit Complete',
      category: 'compliance',
    },
  ];

  const handleDateChange = (type: 'start' | 'end', val: string) => {
    if (type === 'start') {
      setStartDate(val);
      if (endDate && val > endDate) {
        setDateError('Start Date cannot be later than End Date.');
      } else {
        setDateError(null);
      }
    } else {
      setEndDate(val);
      if (startDate && startDate > val) {
        setDateError('Start Date cannot be later than End Date.');
      } else {
        setDateError(null);
      }
    }
  };

  const handleLaunchReport = (path: string) => {
    if (startDate && endDate && startDate > endDate) {
      setDateError('Start Date cannot be later than End Date.');
      return;
    }
    const query = new URLSearchParams();
    if (startDate) query.set('start_date', startDate);
    if (endDate) query.set('end_date', endDate);
    if (exportExcel) query.set('export', '1');
    navigate(`${path}?${query.toString()}`);
  };

  const filteredReports = reportOptions.filter((r) => {
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.badge.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || r.category === activeTab;
    return matchesSearch && matchesTab;
  });

  const currentOption = reportOptions.find((r) => r.id === selectedReport) || reportOptions[0];

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
            <span>Procurement & Purchasing</span>
            <span>/</span>
            <span>Reports Center</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-indigo-600 shrink-0" />
            Modern Purchase Reporting Center
          </h1>
          <p className="text-xs font-medium text-slate-600 mt-1">
            Comprehensive suite of 22 authoritative procurement, inventory intake, VAT, and vendor reconciliation reports (BDT / ৳)
          </p>
        </div>

        <Link
          to="/purchases/reports/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm transition"
        >
          <BarChart3 className="w-4 h-4" />
          Open Analytics Dashboard
        </Link>
      </div>

      {/* Interactive Selection Console Card */}
      <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-md p-6 max-w-4xl mx-auto space-y-6">
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-indigo-600"></span>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
              PURCHASE REPORT SELECTION CONSOLE
            </h2>
          </div>
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            RetailCore V2 Engine
          </span>
        </div>

        {/* Date Filters + Export Checkbox */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-black text-slate-800">Start Date:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleDateChange('start', e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-900 shadow-2xs outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-black text-slate-800">End Date:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleDateChange('end', e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-900 shadow-2xs outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-black text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={exportExcel}
                onChange={(e) => setExportExcel(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="flex items-center gap-1 text-emerald-800">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Export to Excel
              </span>
            </label>
          </div>

          {dateError && (
            <div className="text-xs font-bold text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
              ⚠️ {dateError}
            </div>
          )}
        </div>

        {/* Report Radio Options */}
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3">
            Quick Launch Report Selection:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto p-1">
            {reportOptions.slice(0, 10).map((opt) => {
              const isSelected = selectedReport === opt.id;
              const Icon = opt.icon;
              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedReport(opt.id)}
                  className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/60 shadow-xs ring-1 ring-indigo-500/30'
                      : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50/60 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="radio"
                      name="purchase_report_option"
                      checked={isSelected}
                      onChange={() => setSelectedReport(opt.id)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 truncate flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>{opt.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {opt.badge}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLaunchReport(opt.path);
                    }}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Open Report Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Controls */}
        <div className="border-t border-slate-200 pt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600 font-medium">
            Active Selection: <span className="font-black text-indigo-950">{currentOption.title}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setStartDate(today);
                setEndDate(today);
                setDateError(null);
              }}
              className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Reset Dates
            </button>

            <button
              type="button"
              onClick={() => handleLaunchReport(currentOption.path)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black shadow-sm transition-all cursor-pointer"
            >
              <Search className="w-4 h-4" />
              Generate / Show Report
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Catalog Filtering & Search */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
            Complete Purchase Reports Catalog (22 Modules)
          </h3>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search reports by keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs font-bold">
          {[
            { id: 'all', label: 'All Reports' },
            { id: 'analytics', label: 'Executive Analytics' },
            { id: 'financial', label: 'Financial & Invoices' },
            { id: 'orders', label: 'Purchase Orders' },
            { id: 'operations', label: 'GRN & Returns' },
            { id: 'products', label: 'Products & SKUs' },
            { id: 'organization', label: 'Branches & Warehouses' },
            { id: 'compliance', label: 'VAT & Audit' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 22 Direct Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((opt) => {
            const Icon = opt.icon;
            return (
              <div
                key={opt.id}
                onClick={() => handleLaunchReport(opt.path)}
                className="p-5 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                      {opt.badge}
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {opt.title}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                    {opt.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-700">
                  <span>Open Full Report</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
