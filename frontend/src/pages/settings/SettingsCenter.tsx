import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Database, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Store, 
  Warehouse as WarehouseIcon, 
  Package, 
  Truck, 
  Users, 
  Receipt, 
  RefreshCw, 
  RotateCcw,
  Check,
  Shield,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router';
import { 
  uploadFullOperationalDemoData, 
  DEMO_COMPANY, 
  DEMO_BRANCHES, 
  DEMO_WAREHOUSES, 
  DEMO_PRODUCTS, 
  DEMO_SUPPLIERS, 
  DEMO_CUSTOMERS, 
  DEMO_POS_TERMINALS, 
  DEMO_PURCHASES,
  STORAGE_KEYS
} from '../../api/demoData';
import { useCompany } from '../../contexts/CompanyContext';

export const SettingsCenter: React.FC = () => {
  const { company, branches, refreshCompany, refreshBranches } = useCompany();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [currentStats, setCurrentStats] = useState({
    products: 0,
    suppliers: 0,
    purchases: 0,
    branches: 0,
    warehouses: 0,
  });

  const checkCurrentStats = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const p = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
        const s = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUPPLIERS) || '[]');
        const b = JSON.parse(localStorage.getItem(STORAGE_KEYS.BRANCHES) || '[]');
        const w = JSON.parse(localStorage.getItem(STORAGE_KEYS.WAREHOUSES) || '[]');
        const pu = JSON.parse(localStorage.getItem(STORAGE_KEYS.PURCHASES) || '[]');
        setCurrentStats({
          products: Array.isArray(p) ? p.length : 0,
          suppliers: Array.isArray(s) ? s.length : 0,
          purchases: Array.isArray(pu) ? pu.length : 0,
          branches: Array.isArray(b) ? b.length : DEMO_BRANCHES.length,
          warehouses: Array.isArray(w) ? w.length : DEMO_WAREHOUSES.length,
        });
      } catch {}
    }
  };

  useEffect(() => {
    checkCurrentStats();
  }, []);

  const handleUploadDemoData = async () => {
    setIsUploading(true);
    setUploadResult(null);

    try {
      const res = await uploadFullOperationalDemoData();
      setUploadResult(res);
      checkCurrentStats();
      await refreshCompany();
      await refreshBranches();
    } catch (err: any) {
      setUploadResult({
        success: false,
        message: err?.message || 'Failed to seed demo data',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetDemoData = () => {
    if (window.confirm('Are you sure you want to re-initialize demo data to clean factory defaults?')) {
      handleUploadDemoData();
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                System Settings & Demo Data Center
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                One Company Multi-Branch Architecture • Operational Data Seeding • NBR Mushak 9.1 Rules
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-load-demo-data"
            type="button"
            onClick={handleUploadDemoData}
            disabled={isUploading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Uploading Demo Data...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Upload Full Operational Demo Data</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Upload Feedback Banner */}
      {uploadResult && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 animate-in fade-in duration-200 ${
          uploadResult.success 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          {uploadResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <h4 className="font-extrabold text-sm">
              {uploadResult.success ? 'Full Demo Dataset Successfully Loaded!' : 'Upload Error'}
            </h4>
            <p className="text-xs mt-0.5 text-slate-700">
              {uploadResult.message}
            </p>
            {uploadResult.stats && (
              <div className="mt-2.5 pt-2 border-t border-emerald-200/60 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-[11px] font-mono">
                <div>🏢 Company: <span className="font-bold">{uploadResult.stats.company}</span></div>
                <div>🏪 Branches: <span className="font-bold">{uploadResult.stats.branches}</span></div>
                <div>🏭 Depots: <span className="font-bold">{uploadResult.stats.warehouses}</span></div>
                <div>📦 Products: <span className="font-bold">{uploadResult.stats.products}</span></div>
                <div>🚚 Suppliers: <span className="font-bold">{uploadResult.stats.suppliers}</span></div>
                <div>🧾 Vouchers: <span className="font-bold">{uploadResult.stats.purchases}</span></div>
              </div>
            )}
          </div>
          <button 
            type="button" 
            onClick={() => setUploadResult(null)}
            className="text-slate-400 hover:text-slate-700 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Full Operational Demo Dataset Overview Card */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-2xl p-6 sm:p-7 shadow-md border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" /> Full Software Operation Ready
                </span>
                <span className="text-xs text-indigo-200 font-mono">
                  BDT Currency • NBR Mushak 9.1
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                Ready-to-Use Bangladesh Retail & Wholesale Dataset
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                One-click seeding sets up realistic operational data across POS counters, barcodes (EAN-13), multi-branch inventory, supplier purchase invoices, and customer credit ledgers.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleUploadDemoData}
                disabled={isUploading}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Upload Demo Data Now</span>
              </button>
              <button
                type="button"
                onClick={handleResetDemoData}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/20 transition-all cursor-pointer"
                title="Reset to clean defaults"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-3 border-t border-white/10">
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold">
                <Building2 className="w-3.5 h-3.5" /> Enterprise
              </div>
              <div className="text-base font-black text-white mt-1">1 Company</div>
              <div className="text-[10px] text-slate-400">Head Office Dhaka</div>
            </div>

            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold">
                <Store className="w-3.5 h-3.5" /> Branches
              </div>
              <div className="text-base font-black text-white mt-1">{DEMO_BRANCHES.length} Outlets</div>
              <div className="text-[10px] text-slate-400">Dhaka, CTG, Sylhet</div>
            </div>

            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
                <WarehouseIcon className="w-3.5 h-3.5" /> Depots
              </div>
              <div className="text-base font-black text-white mt-1">{DEMO_WAREHOUSES.length} Depots</div>
              <div className="text-[10px] text-slate-400">Central & Branch</div>
            </div>

            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 text-purple-300 text-xs font-semibold">
                <Package className="w-3.5 h-3.5" /> SKUs & Barcodes
              </div>
              <div className="text-base font-black text-white mt-1">{DEMO_PRODUCTS.length} Products</div>
              <div className="text-[10px] text-slate-400">EAN-13 GS1 Ready</div>
            </div>

            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 text-blue-300 text-xs font-semibold">
                <Truck className="w-3.5 h-3.5" /> Suppliers
              </div>
              <div className="text-base font-black text-white mt-1">{DEMO_SUPPLIERS.length} Vendors</div>
              <div className="text-[10px] text-slate-400">With Opening Balance</div>
            </div>

            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 text-rose-300 text-xs font-semibold">
                <Receipt className="w-3.5 h-3.5" /> Vouchers
              </div>
              <div className="text-base font-black text-white mt-1">{DEMO_PURCHASES.length} Invoices</div>
              <div className="text-[10px] text-slate-400">10 Reports Verified</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Operational Dataset Components Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">Loaded Operational Modules</h3>
            <p className="text-xs text-slate-500 font-medium">Verify entities ready for real POS checkout and procurement</p>
          </div>
          <button 
            type="button" 
            onClick={checkCurrentStats} 
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Status
          </button>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {/* Module: Products */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>Product Master & EAN-13 Barcodes</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">Active</span>
                </div>
                <div className="text-slate-500 mt-0.5">
                  Samsung Galaxy A54, iPhone 15 Pro, Apex Oxford Shoes, Bata Loafers, Nestlé Nido, Radhuni Mustard Oil, Sony Headphones.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-right">
              <div>
                <div className="font-mono font-bold text-slate-900 text-sm">{currentStats.products} Loaded</div>
                <div className="text-[10px] text-slate-400">Cost & MRP configured</div>
              </div>
              <Link to="/products" className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg">
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Module: Multi-Branch Structure */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>One Company Multi-Branch Network</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">Connected</span>
                </div>
                <div className="text-slate-500 mt-0.5">
                  Dhaka Head Office (BR-DHK-01), Uttara (BR-UTT-02), Dhanmondi (BR-DHM-03), Gulshan (BR-GUL-04), Chittagong (BR-CTG-05), Sylhet (BR-SYL-06).
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-right">
              <div>
                <div className="font-mono font-bold text-slate-900 text-sm">{DEMO_BRANCHES.length} Outlets</div>
                <div className="text-[10px] text-slate-400">Header Switcher Enabled</div>
              </div>
              <Link to="/branches" className="p-2 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg">
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Module: Suppliers & Ledgers */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>Authorized Suppliers & Creditors</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold">6 Vendors</span>
                </div>
                <div className="text-slate-500 mt-0.5">
                  Apex Wholesale, Samsung BD Official, Square Consumer, Unilever BD, Apple BD Distributor, Meghna Group.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-right">
              <div>
                <div className="font-mono font-bold text-slate-900 text-sm">{currentStats.suppliers} Suppliers</div>
                <div className="text-[10px] text-slate-400">Payables & AP Ledger</div>
              </div>
              <Link to="/purchases/suppliers" className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg">
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Module: POS Terminals */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>POS Counter Terminals & Sessions</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">Ready</span>
                </div>
                <div className="text-slate-500 mt-0.5">
                  POS-01 (Dhaka Cash Counter), POS-02 (Express), POS-03 (Uttara Counter), POS-04 (Gulshan Boutique).
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-right">
              <div>
                <div className="font-mono font-bold text-slate-900 text-sm">{DEMO_POS_TERMINALS.length} Terminals</div>
                <div className="text-[10px] text-slate-400">Quick Barcode Scanning</div>
              </div>
              <Link to="/pos/terminals" className="p-2 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg">
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Module: Purchase Reporting Invoices */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>Procurement Vouchers & 10 Purchase Reports</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold">Reconciled</span>
                </div>
                <div className="text-slate-500 mt-0.5">
                  Date Wise, Booth Wise, Item Wise, Detail Received (GRN), Detail Ordered (PO), Cancelled Vouchers, and Pending Approval.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-right">
              <div>
                <div className="font-mono font-bold text-slate-900 text-sm">{currentStats.purchases} Vouchers</div>
                <div className="text-[10px] text-slate-400">Total spend ৳183,150</div>
              </div>
              <Link to="/purchases/reports" className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg">
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 3. System Preferences & Localization */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-3 text-indigo-700 font-bold text-sm">
            <Building2 className="w-5 h-5 text-indigo-600" /> Enterprise Localization & Currency
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 font-bold mb-1">Company Base Currency</label>
              <input 
                type="text" 
                disabled 
                value="BDT (৳) — Bangladesh Taka" 
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-800" 
              />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">Standard Timezone</label>
              <input 
                type="text" 
                disabled 
                value="Asia/Dhaka (GMT+6)" 
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-800" 
              />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">Tax & VAT Registration (Mushak 9.1)</label>
              <input 
                type="text" 
                disabled 
                value={DEMO_COMPANY.tax_number || 'BIN-19283746501'} 
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-slate-800" 
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-3 text-emerald-700 font-bold text-sm">
            <Shield className="w-5 h-5 text-emerald-600" /> Multi-Branch Isolation & Security
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            All user operations and cash counter shifts are strictly linked to the active branch. Multi-branch access permissions ensure staff at Uttara or Chittagong cannot tamper with unauthorized central warehouse stock.
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Active Branch</span>
            <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {branches[0]?.name || 'Dhaka Head Office Branch'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
