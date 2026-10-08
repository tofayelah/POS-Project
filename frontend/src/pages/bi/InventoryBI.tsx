import React, { useEffect, useState } from 'react';
import {
  Package,
  Layers,
  Clock,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  TrendingDown,
  Warehouse,
  BarChart2,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import { biApi } from '../../api/bi';
import { InventoryBiData } from '../../types/bi';
import { formatCurrency, formatNumber } from '../../utils/format';

export const InventoryBI: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<InventoryBiData | null>(null);
  const [activeAbcTab, setActiveAbcTab] = useState<'A' | 'B' | 'C'>('A');

  useEffect(() => {
    loadInventoryBi();
  }, []);

  const loadInventoryBi = async () => {
    setLoading(true);
    try {
      const resp = await biApi.getInventoryBi();
      setData(resp.data.data);
    } catch (err) {
      console.error('Failed to load Inventory BI', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const resp = await biApi.exportReport({
        dataset: 'inventory',
        dimensions: ['warehouse', 'product'],
        metrics: ['quantity', 'total_value'],
        format: 'csv',
      });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inventory_bi_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export CSV', err);
    }
  };

  const summary = data?.summary;
  const abc = data?.abc_analysis;
  const aging = data?.aging_buckets;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('bi.inventoryBi')}
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('bi.subtitle')}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={loadInventoryBi}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            {t('bi.exportCsv')}
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-600" />
        </div>
      ) : (
        <>
          {/* Executive Inventory KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('bi.inventoryValue')}
              </span>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {formatCurrency(summary?.total_valuation || 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {formatNumber(summary?.total_units || 0)} {t('common.units')} ({summary?.total_skus || 0} SKUs)
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('bi.stockTurnover')}
              </span>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {summary?.turnover_ratio || 0}x
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {t('bi.doh')}: <span className="font-semibold text-gray-900 dark:text-white">{summary?.doh || 0} days</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('bi.lowStock')}
              </span>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                {formatNumber(summary?.low_stock_items || 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {summary?.out_of_stock_items || 0} completely out of stock
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('bi.deadStock')}
              </span>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {formatCurrency(summary?.dead_stock_value || 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {summary?.dead_stock_count || 0} items inactive &gt; 365d
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('bi.abcAnalysis')}
              </span>
              <div className="text-sm font-semibold text-gray-900 dark:text-white mt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-emerald-600">Class A (Top 80%):</span>
                  <span>{abc?.summary?.class_a?.count || 0} items</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-600">Class B (Next 15%):</span>
                  <span>{abc?.summary?.class_b?.count || 0} items</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Class C (Tail 5%):</span>
                  <span>{abc?.summary?.class_c?.count || 0} items</span>
                </div>
              </div>
            </div>
          </div>

          {/* Aging Buckets Grid */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              {t('bi.inventoryAging')}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {aging &&
                Object.entries(aging).map(([k, bucket]: [string, any]) => (
                  <div
                    key={k}
                    className={`p-4 rounded-lg border ${
                      k === '365_plus'
                        ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                        : k === '181_365'
                        ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                        : 'bg-gray-50 dark:bg-gray-750 border-gray-100 dark:border-gray-700'
                    }`}
                  >
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {bucket.label}
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                      {formatCurrency(bucket.value)}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {bucket.count} items
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* ABC Analysis Section */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-emerald-500" />
                  {t('bi.abcAnalysis')} ({t('bi.paretoPrinciple')})
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Pareto classification: Class A items represent 80% of total stock valuation.
                </p>
              </div>

              {/* Tabs for A, B, C */}
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                <button
                  onClick={() => setActiveAbcTab('A')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
                    activeAbcTab === 'A'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                  }`}
                >
                  Class A ({abc?.summary?.class_a?.count || 0})
                </button>
                <button
                  onClick={() => setActiveAbcTab('B')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
                    activeAbcTab === 'B'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                  }`}
                >
                  Class B ({abc?.summary?.class_b?.count || 0})
                </button>
                <button
                  onClick={() => setActiveAbcTab('C')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
                    activeAbcTab === 'C'
                      ? 'bg-gray-600 text-white shadow'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                  }`}
                >
                  Class C ({abc?.summary?.class_c?.count || 0})
                </button>
              </div>
            </div>

            {/* ABC Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">{t('bi.product')}</th>
                    <th className="py-2.5 px-3 font-semibold">{t('bi.category')}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{t('common.quantity')}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{t('bi.inventoryValue')}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{t('bi.cumulativePct')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {(() => {
                    const items =
                      activeAbcTab === 'A'
                        ? abc?.class_a
                        : activeAbcTab === 'B'
                        ? abc?.class_b
                        : abc?.class_c;

                    if (!items || items.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-gray-500">
                            {t('common.noData')}
                          </td>
                        </tr>
                      );
                    }

                    return items.slice(0, 15).map((item) => (
                      <tr key={item.inventory_id}>
                        <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">
                          <div>{item.product_name}</div>
                          {item.sku && <div className="text-xs text-gray-400 font-mono">{item.sku}</div>}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300">{item.category}</td>
                        <td className="py-2.5 px-3 text-right">{formatNumber(item.quantity)}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-amber-600">
                          {formatCurrency(item.total_value)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-gray-700 dark:text-gray-300">
                          {item.cumulative_pct}%
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reorder Alerts & Stockout Risks */}
          {data?.reorder_alerts && data.reorder_alerts.length > 0 && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                {t('bi.reorderAlerts')}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">{t('bi.product')}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{t('common.quantity')}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{t('bi.reorderPoint')}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{t('bi.reorderQuantity')}</th>
                      <th className="py-2.5 px-3 font-semibold text-center">{t('bi.status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data.reorder_alerts.map((alert) => (
                      <tr key={alert.inventory_id}>
                        <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">
                          <div>{alert.product_name}</div>
                          {alert.sku && <div className="text-xs text-gray-400 font-mono">{alert.sku}</div>}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                          {formatNumber(alert.quantity)}
                        </td>
                        <td className="py-2.5 px-3 text-right">{formatNumber(alert.reorder_point)}</td>
                        <td className="py-2.5 px-3 text-right">{formatNumber(alert.reorder_quantity)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 text-xs font-semibold rounded ${
                              alert.stockout_risk === 'OUT_OF_STOCK'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                            }`}
                          >
                            {alert.stockout_risk}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
