import React, { useState, useEffect } from 'react';
import { 
  Package, Calendar, Download, Printer, Search, Tag, Layers, CheckCircle2 
} from 'lucide-react';
import { 
  getItemWisePurchaseReport, 
  ItemWisePurchaseRecord, 
  PurchaseReportFilters,
  exportReportToCsv
} from '../../../api/purchaseReports';
import { PurchaseReportFilterBar } from '../../../components/purchase/reports/PurchaseReportFilterBar';
import { PurchaseReportPrintModal } from '../../../components/purchase/reports/PurchaseReportPrintModal';

export const ItemWisePurchaseReport: React.FC = () => {
  const [filters, setFilters] = useState<PurchaseReportFilters>({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });
  const [data, setData] = useState<ItemWisePurchaseRecord[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getItemWisePurchaseReport(filters);
      setData(res.data);
      setSummary(res.summary);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate Item Wise Purchase report.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleReset = () => {
    const today = new Date().toISOString().split('T')[0];
    const initial = { start_date: today, end_date: today };
    setFilters(initial);
    getItemWisePurchaseReport(initial).then((res) => {
      setData(res.data);
      setSummary(res.summary);
    });
  };

  const handleExportExcel = () => {
    const headers = [
      'SKU',
      'Barcode',
      'Product Name',
      'Category',
      'Brand',
      'Unit',
      'Total Quantity Purchased',
      'Average Unit Cost (BDT)',
      'Total Discount (BDT)',
      'Total Tax/VAT (BDT)',
      'Net Purchase Spend (BDT)',
      'Primary Supplier',
    ];
    const rows = data.map((r) => [
      r.sku,
      r.barcode,
      r.product_name,
      r.category_name,
      r.brand_name,
      r.unit,
      r.total_quantity,
      r.avg_unit_cost,
      r.discount_amount,
      r.tax_amount,
      r.net_amount,
      r.primary_supplier,
    ]);
    exportReportToCsv(`Item_Wise_Purchase_${filters.start_date || 'all'}_to_${filters.end_date || 'all'}`, headers, rows);
  };

  const printColumns = [
    { key: 'sku', label: 'SKU' },
    { key: 'product_name', label: 'Product Name' },
    { key: 'category_name', label: 'Category' },
    { key: 'unit', label: 'Unit' },
    { key: 'total_quantity', label: 'Total Qty', align: 'right' as const },
    { key: 'avg_unit_cost', label: 'Avg Cost (৳)', align: 'right' as const },
    { key: 'discount_amount', label: 'Discount (৳)', align: 'right' as const },
    { key: 'tax_amount', label: 'VAT (৳)', align: 'right' as const },
    { key: 'net_amount', label: 'Net Spend (৳)', align: 'right' as const },
    { key: 'primary_supplier', label: 'Primary Supplier' },
  ];

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
            <span>Purchase & Procurement Reports</span>
            <span>/</span>
            <span>Report #6</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Package className="w-7 h-7 text-indigo-600 shrink-0" />
            Item Wise Purchase
          </h1>
          <p className="text-xs font-medium text-slate-600 mt-1">
            Aggregated item spend, purchasing volume, and weighted average procurement costs by SKU
          </p>
        </div>
      </div>

      {/* Filter Component */}
      <PurchaseReportFilterBar
        filters={filters}
        onChange={setFilters}
        onSearch={loadReport}
        onReset={handleReset}
        onPrintPreview={() => setIsPrintOpen(true)}
        onExportExcel={handleExportExcel}
        isLoading={isLoading}
        showVoucherSearch={false}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3.5">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">SKUs Purchased</span>
          <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
            {summary.total_distinct_items || data.length}
          </span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Units Purchased</span>
          <span className="text-xl font-black text-indigo-950 font-mono mt-1 block">
            {(summary.total_units_purchased ?? 0).toLocaleString()}
          </span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total Discount</span>
          <span className="text-xl font-black text-amber-700 font-mono mt-1 block">
            ৳{(summary.total_discount ?? 0).toLocaleString('en-BD')}
          </span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total VAT / Tax</span>
          <span className="text-xl font-black text-indigo-700 font-mono mt-1 block">
            ৳{(summary.total_tax ?? 0).toLocaleString('en-BD')}
          </span>
        </div>
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-900 block">Total Spend</span>
          <span className="text-xl font-black text-indigo-950 font-mono mt-1 block">
            ৳{(summary.total_net_spend ?? 0).toLocaleString('en-BD')}
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            Product & SKU Purchase Volumes
          </h3>
          <div className="text-xs text-slate-500 font-medium">Weighted Average Unit Costing</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/75">
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">SKU / Barcode</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Product Description</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Category & Brand</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Unit</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Total Qty</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Avg Unit Cost</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Discount</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Tax/VAT</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-right">Net Spend</th>
                <th className="py-3 px-3.5 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Primary Vendor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Search className="w-8 h-8 text-slate-400 stroke-1" />
                      <p className="text-sm font-bold text-slate-700">No product purchases found</p>
                      <p className="text-xs text-slate-500">No items were purchased within the selected filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.product_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3.5 font-mono">
                      <div className="font-bold text-indigo-700">{row.sku}</div>
                      <div className="text-[10px] text-slate-500">{row.barcode}</div>
                    </td>
                    <td className="py-2.5 px-3.5 font-bold text-slate-900">{row.product_name}</td>
                    <td className="py-2.5 px-3.5 text-slate-600">
                      <div>{row.category_name}</div>
                      <div className="text-[10px] text-slate-500">{row.brand_name}</div>
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-700">{row.unit}</td>
                    <td className="py-2.5 px-3.5 font-mono text-right font-black text-slate-950">{row.total_quantity.toLocaleString()}</td>
                    <td className="py-2.5 px-3.5 font-mono text-right font-semibold text-slate-800">৳{row.avg_unit_cost.toLocaleString('en-BD')}</td>
                    <td className="py-2.5 px-3.5 font-mono text-right text-amber-700">৳{row.discount_amount.toLocaleString('en-BD')}</td>
                    <td className="py-2.5 px-3.5 font-mono text-right text-indigo-700">৳{row.tax_amount.toLocaleString('en-BD')}</td>
                    <td className="py-2.5 px-3.5 font-mono text-right font-black text-indigo-950">৳{row.net_amount.toLocaleString('en-BD')}</td>
                    <td className="py-2.5 px-3.5 text-slate-700 font-medium">{row.primary_supplier}</td>
                  </tr>
                ))
              )}
            </tbody>
            {data.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                  <td colSpan={4} className="py-3 px-3.5 text-slate-900 uppercase font-black tracking-wider text-[11px]">
                    Total Summary ({data.length} Products)
                  </td>
                  <td className="py-3 px-3.5 font-mono text-right font-black text-slate-950">{summary.total_units_purchased}</td>
                  <td></td>
                  <td className="py-3 px-3.5 font-mono text-right font-bold text-amber-700">৳{(summary.total_discount ?? 0).toLocaleString('en-BD')}</td>
                  <td className="py-3 px-3.5 font-mono text-right font-bold text-indigo-700">৳{(summary.total_tax ?? 0).toLocaleString('en-BD')}</td>
                  <td className="py-3 px-3.5 font-mono text-right font-black text-indigo-950">৳{(summary.total_net_spend ?? 0).toLocaleString('en-BD')}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Print Modal */}
      <PurchaseReportPrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="Item Wise Purchase Report"
        subtitle="Aggregated item procurement volumes and weighted average cost audit"
        dateRangeStr={`${filters.start_date || 'Inception'} to ${filters.end_date || 'Current'}`}
        columns={printColumns}
        data={data}
        summaryFields={[
          { label: 'Products', value: data.length },
          { label: 'Units Purchased', value: summary.total_units_purchased ?? 0 },
          { label: 'Total Spend (৳)', value: summary.total_net_spend ?? 0 },
        ]}
      />
    </div>
  );
};
