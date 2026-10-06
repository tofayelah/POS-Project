import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Warehouse as WarehouseIcon,
  Play,
  Clock,
  Layers,
  Package,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { TableContainer } from '../../components/common/TableContainer';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { KpiCard } from '../../components/dashboard/KpiCard';
import {
  getInventoryReconciliation,
  runInventoryReconciliation,
  getWarehouses,
} from '../../api/inventory';
import type {
  InventoryReconciliationResponse,
  Warehouse,
} from '../../types/inventory';
import { formatNumber } from '../../utils/format';
import { useLanguage } from '../../i18n';

export function InventoryReconciliation() {
  const { t } = useLanguage();

  // State
  const [data, setData] = useState<InventoryReconciliationResponse | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load warehouses
  useEffect(() => {
    async function loadWarehouses() {
      try {
        const res = await getWarehouses();
        const list = res?.data || (Array.isArray(res) ? res : []);
        setWarehouses(list);
      } catch (err) {
        console.error('Failed to load warehouses', err);
      }
    }
    loadWarehouses();
  }, []);

  // Fetch reconciliation status
  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getInventoryReconciliation({
        warehouse_id: selectedWarehouseId || undefined,
      });
      setData(res?.data || res);
    } catch (err: any) {
      console.error('Failed to load reconciliation report', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load reconciliation report');
    } finally {
      setIsLoading(false);
    }
  }, [selectedWarehouseId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Run active reconciliation audit
  const handleRunReconciliation = async () => {
    setIsRunning(true);
    try {
      const res = await runInventoryReconciliation(selectedWarehouseId || undefined);
      setData(res?.data || res);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to run reconciliation audit');
    } finally {
      setIsRunning(false);
    }
  };

  const isHealthy = data?.status === 'HEALTHY';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t('inventory.reconciliationTitle', 'Inventory Reconciliation Audit')}
        subtitle={t('inventory.reconciliationSubtitle', 'Reconcile physical on-hand records against the immutable stock movement transaction ledger')}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRunReconciliation}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 shadow-sm"
            >
              <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              {isRunning ? t('common.loading', 'Auditing...') : t('inventory.runAudit', 'Run Reconciliation Audit')}
            </button>
            <button
              type="button"
              onClick={fetchReport}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {t('common.refresh', 'Refresh')}
            </button>
          </div>
        }
      />

      {/* Warehouse Selector */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
        <WarehouseIcon className="w-4 h-4 text-slate-400" />
        <select
          value={selectedWarehouseId}
          onChange={(e) => setSelectedWarehouseId(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100 min-w-[240px]"
        >
          <option value="">{t('inventory.allWarehouses', 'All Warehouses (Global Audit)')}</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} ({w.code})
            </option>
          ))}
        </select>
        {data?.checked_at && (
          <span className="text-xs text-slate-400 ml-auto flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Last Audited: {new Date(data.checked_at).toLocaleString()}
          </span>
        )}
      </div>

      {isLoading ? (
        <LoadingState message={t('common.loading', 'Auditing inventory ledger...')} />
      ) : data ? (
        <>
          {/* Health Status Banner */}
          <div
            className={`p-5 rounded-2xl border flex items-start gap-4 ${
              isHealthy
                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-100'
                : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-100'
            }`}
          >
            {isHealthy ? (
              <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <h3 className="font-bold text-base">
                {isHealthy
                  ? t('inventory.reconciliationHealthy', 'Inventory Ledger Fully In Sync')
                  : t('inventory.reconciliationDiscrepant', 'Discrepancies Detected')}
              </h3>
              <p className="text-xs mt-1 opacity-90">
                {isHealthy
                  ? t(
                      'inventory.reconciliationHealthyDesc',
                      'All current physical inventory balances match the cumulative stock movement audit log perfectly. No orphan batches or negative stock detected.'
                    )
                  : t(
                      'inventory.reconciliationDiscrepantDesc',
                      'One or more inventory balances do not match the sum of recorded stock movements. Review the discrepancies below.'
                    )}
              </p>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title={t('inventory.auditedInventories', 'Inventories Audited')}
              value={formatNumber(data.total_inventories_checked)}
              icon={Package}
              color="indigo"
            />
            <KpiCard
              title={t('inventory.discrepanciesCount', 'Discrepancies')}
              value={formatNumber(data.discrepancies_count)}
              icon={AlertTriangle}
              color={data.discrepancies_count > 0 ? 'rose' : 'emerald'}
            />
            <KpiCard
              title={t('inventory.negativeStockCount', 'Negative Stock Items')}
              value={formatNumber(data.negative_stock_count)}
              icon={XCircle}
              color={data.negative_stock_count > 0 ? 'rose' : 'emerald'}
            />
            <KpiCard
              title={t('inventory.orphanBatchesCount', 'Orphan Batches')}
              value={formatNumber(data.orphan_batches_count)}
              icon={Layers}
              color={data.orphan_batches_count > 0 ? 'amber' : 'emerald'}
            />
          </div>

          {/* Discrepancies Table */}
          {data.discrepancies && data.discrepancies.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {t('inventory.discrepancies', 'Ledger vs On-Hand Discrepancies')} ({data.discrepancies.length})
              </h4>
              <TableContainer>
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-4 py-3">{t('inventory.product', 'Product')}</th>
                      <th className="px-4 py-3">{t('inventory.sku', 'SKU')}</th>
                      <th className="px-4 py-3">{t('inventory.warehouse', 'Warehouse')}</th>
                      <th className="px-4 py-3 text-right">{t('inventory.currentQty', 'Current Stock')}</th>
                      <th className="px-4 py-3 text-right">{t('inventory.ledgerBalance', 'Ledger Balance')}</th>
                      <th className="px-4 py-3 text-right">{t('inventory.variance', 'Variance')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {data.discrepancies.map((d) => (
                      <tr key={d.inventory_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{d.product_name}</td>
                        <td className="px-4 py-3 text-xs font-mono">{d.sku}</td>
                        <td className="px-4 py-3 text-xs">{d.warehouse}</td>
                        <td className="px-4 py-3 text-right font-mono font-medium">
                          {formatNumber(d.current_inventory_quantity)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium">
                          {formatNumber(d.calculated_ledger_balance)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                          {d.variance > 0 ? `+${formatNumber(d.variance)}` : formatNumber(d.variance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableContainer>
            </div>
          )}

          {/* Negative Stock Table */}
          {data.negative_inventories && data.negative_inventories.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                {t('inventory.negativeStock', 'Negative Stock Records')} ({data.negative_inventories.length})
              </h4>
              <TableContainer>
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-4 py-3">{t('inventory.product', 'Product')}</th>
                      <th className="px-4 py-3">{t('inventory.sku', 'SKU')}</th>
                      <th className="px-4 py-3">{t('inventory.warehouse', 'Warehouse')}</th>
                      <th className="px-4 py-3 text-right">{t('inventory.quantity', 'Quantity')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {data.negative_inventories.map((n) => (
                      <tr key={n.inventory_id}>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{n.product_name}</td>
                        <td className="px-4 py-3 text-xs font-mono">{n.sku}</td>
                        <td className="px-4 py-3 text-xs">{n.warehouse}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-rose-600">
                          {formatNumber(n.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableContainer>
            </div>
          )}

          {/* Orphan Batches Table */}
          {data.orphan_batches && data.orphan_batches.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                {t('inventory.orphanBatches', 'Orphan Batches')} ({data.orphan_batches.length})
              </h4>
              <TableContainer>
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-4 py-3">{t('inventory.batchNo', 'Batch No')}</th>
                      <th className="px-4 py-3">{t('inventory.warehouse', 'Warehouse')}</th>
                      <th className="px-4 py-3 text-right">{t('inventory.quantity', 'Quantity')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {data.orphan_batches.map((o) => (
                      <tr key={o.batch_id}>
                        <td className="px-4 py-3 font-mono font-medium">{o.batch_no}</td>
                        <td className="px-4 py-3 text-xs">{o.warehouse}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-amber-600">
                          {formatNumber(o.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableContainer>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
