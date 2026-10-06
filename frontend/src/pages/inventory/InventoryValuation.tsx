import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  Boxes,
  Package,
  Search,
  Filter,
  RefreshCw,
  Printer,
  Warehouse as WarehouseIcon,
  Percent,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { TableContainer } from '../../components/common/TableContainer';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { getInventoryValuation, getWarehouses } from '../../api/inventory';
import type {
  InventoryValuationItem,
  InventoryValuationSummary,
  Warehouse,
} from '../../types/inventory';
import { formatCurrency, formatNumber } from '../../utils/format';
import { useLanguage } from '../../i18n';

export function InventoryValuation() {
  const { t } = useLanguage();

  // State
  const [items, setItems] = useState<InventoryValuationItem[]>([]);
  const [summary, setSummary] = useState<InventoryValuationSummary>({
    total_products: 0,
    total_units: 0,
    total_cost_valuation: 0,
    total_retail_valuation: 0,
    potential_profit: 0,
    margin_percentage: 0,
  });
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load warehouses
  useEffect(() => {
    async function loadWarehouses() {
      try {
        const res = await getWarehouses();
        const data = res?.data || (Array.isArray(res) ? res : []);
        setWarehouses(data);
      } catch (err) {
        console.error('Failed to load warehouses', err);
      }
    }
    loadWarehouses();
  }, []);

  // Fetch valuation
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getInventoryValuation({
        warehouse_id: selectedWarehouseId || undefined,
        search: searchQuery.trim() || undefined,
      });

      if (res?.data) {
        setItems(res.data);
      } else if (Array.isArray(res)) {
        setItems(res);
      }

      if (res?.summary) {
        setSummary(res.summary);
      }
    } catch (err: any) {
      console.error('Failed to load valuation', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load inventory valuation');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedWarehouseId, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t('inventory.valuationTitle', 'Inventory Valuation Report')}
        subtitle={t('inventory.valuationSubtitle', 'Asset book value, retail replacement value, and potential gross profit margin')}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              {t('common.print', 'Print Report')}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRefreshing(true);
                fetchData();
              }}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {t('common.refresh', 'Refresh')}
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          title={t('inventory.totalProducts', 'Total Products')}
          value={formatNumber(summary.total_products)}
          icon={Package}
          color="indigo"
        />
        <KpiCard
          title={t('inventory.totalUnits', 'Total Units')}
          value={formatNumber(summary.total_units)}
          icon={Boxes}
          color="blue"
        />
        <KpiCard
          title={t('inventory.costValuation', 'Cost Valuation')}
          value={formatCurrency(summary.total_cost_valuation)}
          icon={DollarSign}
          color="emerald"
        />
        <KpiCard
          title={t('inventory.retailValuation', 'Retail Valuation')}
          value={formatCurrency(summary.total_retail_valuation)}
          icon={TrendingUp}
          color="purple"
        />
        <KpiCard
          title={t('inventory.potentialProfit', 'Potential Profit')}
          value={formatCurrency(summary.potential_profit)}
          icon={DollarSign}
          color="emerald"
        />
        <KpiCard
          title={t('inventory.marginPercent', 'Average Margin')}
          value={`${summary.margin_percentage.toFixed(1)}%`}
          icon={Percent}
          color="amber"
        />
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('inventory.searchProducts', 'Search product name or SKU...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2 min-w-[200px]">
          <WarehouseIcon className="w-4 h-4 text-slate-400" />
          <select
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
          >
            <option value="">{t('inventory.allWarehouses', 'All Warehouses')}</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Valuation Table */}
      {isLoading ? (
        <LoadingState message={t('common.loading', 'Calculating inventory valuation...')} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title={t('inventory.noValuationData', 'No Inventory Items Found')}
          description={t('inventory.noValuationDataDesc', 'No items match your selected filters.')}
        />
      ) : (
        <TableContainer>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-xs font-semibold">
              <tr>
                <th className="px-4 py-3">{t('inventory.product', 'Product & SKU')}</th>
                <th className="px-4 py-3">{t('inventory.warehouse', 'Warehouse')}</th>
                <th className="px-4 py-3 text-right">{t('inventory.quantity', 'On Hand')}</th>
                <th className="px-4 py-3 text-right">{t('inventory.unitCost', 'Avg Cost')}</th>
                <th className="px-4 py-3 text-right">{t('inventory.costValuation', 'Cost Valuation')}</th>
                <th className="px-4 py-3 text-right">{t('inventory.sellingPrice', 'Retail Price')}</th>
                <th className="px-4 py-3 text-right">{t('inventory.retailValuation', 'Retail Valuation')}</th>
                <th className="px-4 py-3 text-right">{t('inventory.profit', 'Potential Profit')}</th>
                <th className="px-4 py-3 text-right">{t('inventory.margin', 'Margin %')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {items.map((row) => (
                <tr key={row.inventory_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-900 dark:text-white block">
                      {row.product_name}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {row.sku} {row.variant_name ? `(${row.variant_name})` : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{row.warehouse_name}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {formatNumber(row.quantity)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {formatCurrency(row.unit_cost)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(row.cost_valuation)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {formatCurrency(row.selling_price)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(row.retail_valuation)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-slate-600 dark:text-slate-300">
                    {formatCurrency(row.potential_profit)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs font-semibold">
                    <span
                      className={
                        row.margin_percentage >= 20
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : row.margin_percentage > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }
                    >
                      {row.margin_percentage.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableContainer>
      )}
    </div>
  );
}
