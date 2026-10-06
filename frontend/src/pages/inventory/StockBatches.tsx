import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layers,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Calendar,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Package,
  Warehouse as WarehouseIcon,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { TableContainer } from '../../components/common/TableContainer';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { KpiCard } from '../../components/dashboard/KpiCard';
import {
  getStockBatches,
  getStockBatch,
  toggleStockBatchStatus,
  getStockBatchExpiryReport,
  getWarehouses,
} from '../../api/inventory';
import type { StockBatch, Warehouse } from '../../types/inventory';
import { formatCurrency, formatNumber } from '../../utils/format';
import { useLanguage } from '../../i18n';

export function StockBatches() {
  const { t } = useLanguage();

  // State
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [expiryThreshold, setExpiryThreshold] = useState<number>(30);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Expiry Report Summary State
  const [expiryReport, setExpiryReport] = useState<{
    expired: StockBatch[];
    near_expiry: StockBatch[];
    summary: { expired_count: number; near_expiry_count: number; threshold_days: number };
  } | null>(null);

  // Active Batch Detail Modal
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Toggle status state
  const [toggleBatchTarget, setToggleBatchTarget] = useState<StockBatch | null>(null);
  const [toggleReason, setToggleReason] = useState<string>('');
  const [isToggling, setIsToggling] = useState<boolean>(false);

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

  // Fetch batches and expiry report
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [batchesRes, reportRes] = await Promise.all([
        getStockBatches(),
        getStockBatchExpiryReport({ days: expiryThreshold }),
      ]);

      const batchList = batchesRes?.data || (Array.isArray(batchesRes) ? batchesRes : []);
      setBatches(batchList);

      if (reportRes?.data) {
        setExpiryReport(reportRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load batches or expiry report', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load stock batches');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [expiryThreshold]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered batches
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      // Status filter
      if (statusFilter && b.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const batchNo = b.batch_no?.toLowerCase() || '';
        const prodName = b.product?.name?.toLowerCase() || '';
        const sku = b.variant?.sku?.toLowerCase() || '';
        if (!batchNo.includes(q) && !prodName.includes(q) && !sku.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [batches, statusFilter, searchQuery]);

  // Handle open batch detail
  const handleOpenDetail = async (id: number) => {
    try {
      const res = await getStockBatch(id);
      setSelectedBatch(res?.data || res);
      setIsDetailModalOpen(true);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to load batch details');
    }
  };

  // Handle status toggle confirm
  const handleConfirmToggle = async () => {
    if (!toggleBatchTarget) return;
    setIsToggling(true);
    try {
      const newStatus = toggleBatchTarget.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
      await toggleStockBatchStatus(toggleBatchTarget.id, newStatus, toggleReason || undefined);
      setToggleBatchTarget(null);
      setToggleReason('');
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to change batch status');
    } finally {
      setIsToggling(false);
    }
  };

  // Helper for expiry status calculation
  const getBatchExpiryInfo = (b: StockBatch) => {
    if (!b.exp_date) return { label: 'No Expiry', color: 'slate' };
    const exp = new Date(b.exp_date);
    const now = new Date();
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: `Expired (${Math.abs(diffDays)}d ago)`, color: 'rose' };
    }
    if (diffDays <= 7) {
      return { label: `Expires in ${diffDays}d`, color: 'rose' };
    }
    if (diffDays <= 30) {
      return { label: `Expires in ${diffDays}d`, color: 'amber' };
    }
    return { label: `Valid (${diffDays}d)`, color: 'emerald' };
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t('inventory.stockBatches', 'Batch & Expiry Management')}
        subtitle={t('inventory.stockBatchesSubtitle', 'Track product lots, expiration dates, quarantine status, and operational FEFO priority')}
        actions={
          <button
            type="button"
            onClick={() => {
              setIsRefreshing(true);
              fetchData();
            }}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('common.refresh', 'Refresh')}
          </button>
        }
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title={t('inventory.totalBatches', 'Total Batches')}
          value={formatNumber(batches.length)}
          icon={Layers}
          color="indigo"
        />
        <KpiCard
          title={t('inventory.activeBatches', 'Active Batches')}
          value={formatNumber(batches.filter((b) => b.status === 'ACTIVE').length)}
          icon={ShieldCheck}
          color="emerald"
        />
        <KpiCard
          title={t('inventory.nearExpiryBatches', `Expiring in ≤${expiryThreshold} Days`)}
          value={formatNumber(expiryReport?.summary?.near_expiry_count || 0)}
          icon={Clock}
          color="amber"
        />
        <KpiCard
          title={t('inventory.expiredBatches', 'Expired Batches')}
          value={formatNumber(expiryReport?.summary?.expired_count || 0)}
          icon={AlertTriangle}
          color="rose"
        />
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('inventory.searchBatches', 'Search by batch no, product name, or SKU...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2 min-w-[160px]">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
          >
            <option value="">{t('common.all', 'All Statuses')}</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="BLOCKED">BLOCKED (Quarantine)</option>
          </select>
        </div>

        <div className="flex items-center gap-2 min-w-[180px]">
          <Clock className="w-4 h-4 text-slate-400" />
          <select
            value={expiryThreshold}
            onChange={(e) => setExpiryThreshold(Number(e.target.value))}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
          >
            <option value={7}>Alert ≤ 7 Days</option>
            <option value={15}>Alert ≤ 15 Days</option>
            <option value={30}>Alert ≤ 30 Days</option>
            <option value={60}>Alert ≤ 60 Days</option>
            <option value={90}>Alert ≤ 90 Days</option>
          </select>
        </div>
      </div>

      {/* Batches Table */}
      {isLoading ? (
        <LoadingState message={t('common.loading', 'Loading stock batches...')} />
      ) : filteredBatches.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={t('inventory.noBatches', 'No Stock Batches Found')}
          description={t('inventory.noBatchesDesc', 'No product batches match your search or filter criteria.')}
        />
      ) : (
        <TableContainer>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-xs font-semibold">
              <tr>
                <th className="px-4 py-3">{t('inventory.batchNo', 'Batch No')}</th>
                <th className="px-4 py-3">{t('inventory.product', 'Product & SKU')}</th>
                <th className="px-4 py-3">{t('inventory.mfgDate', 'Mfg Date')}</th>
                <th className="px-4 py-3">{t('inventory.expDate', 'Expiry Date')}</th>
                <th className="px-4 py-3">{t('inventory.expiryStatus', 'Expiry Status')}</th>
                <th className="px-4 py-3 text-right">{t('inventory.unitCost', 'Unit Cost')}</th>
                <th className="px-4 py-3">{t('common.status', 'Status')}</th>
                <th className="px-4 py-3 text-right">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredBatches.map((b) => {
                const expInfo = getBatchExpiryInfo(b);
                const isBlocked = b.status === 'BLOCKED';

                return (
                  <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3.5 font-mono font-semibold text-slate-900 dark:text-white">
                      {b.batch_no}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        {b.product?.name || '—'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {b.variant?.sku} {b.variant?.variant_name ? `(${b.variant?.variant_name})` : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">{b.mfg_date || '—'}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">{b.exp_date || '—'}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          expInfo.color === 'rose'
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                            : expInfo.color === 'amber'
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            : expInfo.color === 'emerald'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {expInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-medium">
                      {formatCurrency(Number(b.unit_cost))}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge
                        status={b.status}
                      />
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(b.id)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg cursor-pointer"
                        title={t('common.view', 'View Details')}
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setToggleBatchTarget(b);
                          setToggleReason('');
                        }}
                        className={`p-1.5 rounded-lg cursor-pointer ${
                          isBlocked
                            ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                        }`}
                        title={isBlocked ? 'Unblock Batch' : 'Block Batch (Quarantine)'}
                      >
                        {isBlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableContainer>
      )}

      {/* Batch Detail Modal */}
      {isDetailModalOpen && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Batch: {selectedBatch.batch_no}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedBatch.product?.name} ({selectedBatch.variant?.sku})
                </p>
              </div>
              <StatusBadge
                status={selectedBatch.status}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                <span className="text-slate-400 block">{t('inventory.mfgDate', 'Mfg Date')}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedBatch.mfg_date || '—'}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                <span className="text-slate-400 block">{t('inventory.expDate', 'Exp Date')}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedBatch.exp_date || '—'}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                <span className="text-slate-400 block">{t('inventory.unitCost', 'Unit Cost')}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatCurrency(Number(selectedBatch.unit_cost))}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                <span className="text-slate-400 block">{t('inventory.supplier', 'Supplier')}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedBatch.supplier?.name || '—'}
                </span>
              </div>
            </div>

            {/* Warehouse Stock for this Batch */}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                {t('inventory.warehouseStock', 'Warehouse Stock Holdings')}
              </h4>
              {(!selectedBatch.inventory_batches || selectedBatch.inventory_batches.length === 0) ? (
                <p className="text-xs text-slate-400 italic">No current warehouse stock held in this batch.</p>
              ) : (
                <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Warehouse</th>
                        <th className="px-3 py-2">Location</th>
                        <th className="px-3 py-2 text-right">Quantity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedBatch.inventory_batches.map((ib: any) => (
                        <tr key={ib.id}>
                          <td className="px-3 py-2 font-medium">{ib.warehouse?.name}</td>
                          <td className="px-3 py-2 text-slate-400">{ib.storage_location?.name || '—'}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatNumber(Number(ib.quantity))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Status Confirmation Modal */}
      {toggleBatchTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  toggleBatchTarget.status === 'ACTIVE'
                    ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600'
                    : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600'
                }`}
              >
                {toggleBatchTarget.status === 'ACTIVE' ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {toggleBatchTarget.status === 'ACTIVE' ? 'Block Batch (Quarantine)' : 'Unblock Batch'}
                </h3>
                <p className="text-xs text-slate-400">Batch: {toggleBatchTarget.batch_no}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              {toggleBatchTarget.status === 'ACTIVE'
                ? 'Blocking this batch will prevent it from being sold, dispatched, or moved in POS and stock-out operations.'
                : 'Unblocking this batch will make its inventory available again for operational consumption.'}
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('inventory.reason', 'Audit Reason')} *
              </label>
              <input
                type="text"
                placeholder="e.g. Quality inspection quarantine"
                value={toggleReason}
                onChange={(e) => setToggleReason(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setToggleBatchTarget(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                disabled={isToggling}
                className={`px-4 py-2 text-white rounded-xl text-xs font-semibold disabled:opacity-50 ${
                  toggleBatchTarget.status === 'ACTIVE'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isToggling ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
