import React, { useState, useEffect } from 'react';
import { 
  Calendar, Search, RotateCcw, Printer, FileSpreadsheet, Filter, 
  ChevronDown, Building2, Store, Warehouse as WarehouseIcon, UserCheck, CheckSquare, Square
} from 'lucide-react';
import { getStoredSuppliers } from '../../../api/suppliers';
import { DEFAULT_BRANCHES, DEFAULT_WAREHOUSES } from '../../../api/organization';
import { PurchaseReportFilters } from '../../../api/purchaseReports';

interface PurchaseReportFilterBarProps {
  filters: PurchaseReportFilters;
  onChange?: (updated: PurchaseReportFilters) => void;
  onFilterChange?: any;
  onSearch: () => void;
  onReset: () => void;
  onPrintPreview?: () => void;
  onExportExcel: () => void;
  isLoading?: boolean;
  showSupplierFilter?: boolean;
  showBranchFilter?: boolean;
  showWarehouseFilter?: boolean;
  showStatusFilter?: boolean;
  showVoucherSearch?: boolean;
  showProductSearch?: boolean;
  statusOptions?: { value: string; label: string }[];
  reportTitle?: string;
}

export const PurchaseReportFilterBar: React.FC<PurchaseReportFilterBarProps> = ({
  filters,
  onChange,
  onFilterChange,
  onSearch,
  onReset,
  onPrintPreview,
  onExportExcel,
  isLoading = false,
  showSupplierFilter = true,
  showBranchFilter = true,
  showWarehouseFilter = true,
  showStatusFilter = true,
  showVoucherSearch = true,
  statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'POSTED', label: 'Posted' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ],
  reportTitle,
}) => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>(DEFAULT_BRANCHES);
  const [warehouses, setWarehouses] = useState<any[]>(DEFAULT_WAREHOUSES);
  const [dateError, setDateError] = useState<string | null>(null);
  const [exportExcelChecked, setExportExcelChecked] = useState(false);

  useEffect(() => {
    try {
      const sups = getStoredSuppliers();
      setSuppliers(sups);
    } catch {}
  }, []);

  const applyFilters = (updated: PurchaseReportFilters) => {
    if (onChange) onChange(updated);
    if (typeof onFilterChange === 'function') {
      try {
        onFilterChange(updated);
      } catch {
        onFilterChange(() => updated);
      }
    }
  };

  const handleDateChange = (field: 'start_date' | 'end_date', value: string) => {
    const updated = { ...filters, [field]: value };
    if (updated.start_date && updated.end_date && updated.start_date > updated.end_date) {
      setDateError('Start Date cannot be later than End Date.');
    } else {
      setDateError(null);
    }
    applyFilters(updated);
  };

  const setDatePreset = (preset: 'today' | 'yesterday' | '7days' | 'month' | 'all') => {
    const now = new Date();
    const toDateStr = (d: Date) => d.toISOString().split('T')[0];
    let start = '';
    let end = toDateStr(now);

    if (preset === 'today') {
      start = end;
    } else if (preset === 'yesterday') {
      const y = new Date(Date.now() - 86400000);
      start = toDateStr(y);
      end = start;
    } else if (preset === '7days') {
      const d7 = new Date(Date.now() - 7 * 86400000);
      start = toDateStr(d7);
    } else if (preset === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      start = toDateStr(first);
    } else if (preset === 'all') {
      start = '';
      end = '';
    }

    setDateError(null);
    applyFilters({ ...filters, start_date: start, end_date: end });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (filters.start_date && filters.end_date && filters.start_date > filters.end_date) {
      setDateError('Start Date cannot be later than End Date.');
      return;
    }
    onSearch();
    if (exportExcelChecked) {
      onExportExcel();
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4.5 space-y-4">
      {/* Date Range Error Alert */}
      {dateError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between">
          <span>⚠️ {dateError}</span>
          <button 
            type="button" 
            onClick={() => setDateError(null)} 
            className="text-rose-500 hover:text-rose-700 underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Filter Form */}
      <form onSubmit={handleSearchSubmit} className="space-y-4">
        {/* Top Filter Bar: Date Range + Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Start Date */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap">From:</label>
              <div className="relative">
                <input
                  type="date"
                  value={filters.start_date || ''}
                  onChange={(e) => handleDateChange('start_date', e.target.value)}
                  className="pl-2.5 pr-2 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                  title="Start Date"
                />
              </div>
            </div>

            {/* End Date */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap">To:</label>
              <div className="relative">
                <input
                  type="date"
                  value={filters.end_date || ''}
                  onChange={(e) => handleDateChange('end_date', e.target.value)}
                  className="pl-2.5 pr-2 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                  title="End Date"
                />
              </div>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
              <button
                type="button"
                onClick={() => setDatePreset('today')}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDatePreset('yesterday')}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => setDatePreset('7days')}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => setDatePreset('month')}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => setDatePreset('all')}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
              >
                All
              </button>
            </div>
          </div>

          {/* Export to Excel Checkbox as seen in legacy purchase report */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={exportExcelChecked}
                onChange={(e) => setExportExcelChecked(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <span>Export to Excel on Search</span>
            </label>
          </div>
        </div>

        {/* Middle Row: Operational Filters (Supplier, Booth / Branch, Warehouse, Status, Search) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
          {/* Supplier Filter */}
          {showSupplierFilter && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Supplier
              </label>
              <select
                value={filters.supplier_id || ''}
                onChange={(e) => applyFilters({ ...filters, supplier_id: e.target.value || undefined })}
                className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
              >
                <option value="">All Suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.supplier_code || `SUP-000${s.id}`})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Branch / Booth Filter */}
          {showBranchFilter && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Branch / Booth
              </label>
              <select
                value={filters.branch_id || ''}
                onChange={(e) => applyFilters({ ...filters, branch_id: e.target.value || undefined })}
                className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
              >
                <option value="">All Branches / Booths</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Warehouse Filter */}
          {showWarehouseFilter && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Warehouse / Depot
              </label>
              <select
                value={filters.warehouse_id || ''}
                onChange={(e) => applyFilters({ ...filters, warehouse_id: e.target.value || undefined })}
                className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
              >
                <option value="">All Warehouses</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          {showStatusFilter && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Voucher Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => applyFilters({ ...filters, status: e.target.value || undefined })}
                className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search by Voucher / PO No */}
          {showVoucherSearch && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Voucher / PO Number
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="PINV-9012, PO-..."
                  value={filters.voucher_no || filters.po_no || ''}
                  onChange={(e) => applyFilters({ ...filters, voucher_no: e.target.value, po_no: e.target.value })}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions Row: Search, Reset, Excel, Print / Preview */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-xs font-extrabold shadow-sm transition-all cursor-pointer"
            >
              <Search className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Generating...' : 'Search / Generate Report'}
            </button>

            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              Reset Filters
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-emerald-300 hover:bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Export report to CSV / Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Export to Excel
            </button>

            <button
              type="button"
              onClick={onPrintPreview}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-indigo-300 hover:bg-indigo-50 text-indigo-900 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Print formal report preview"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-700" />
              Preview / Print
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
