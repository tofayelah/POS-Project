import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  Send,
  Eye,
  Check,
  FileCheck,
  X,
  Warehouse as WarehouseIcon,
  Layers,
  Calendar,
  Save,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { TableContainer } from '../../components/common/TableContainer';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import {
  getStockCounts,
  getStockCount,
  createStockCount,
  startStockCount,
  updateStockCountItems,
  submitStockCount,
  reviewStockCount,
  approveStockCount,
  postStockCount,
  cancelStockCount,
  getWarehouses,
  getStorageLocations,
} from '../../api/inventory';
import type {
  StockCount,
  StockCountItem,
  StockCountStatus,
  StockCountType,
  CreateStockCountPayload,
  Warehouse,
  StorageLocation,
} from '../../types/inventory';
import { formatCurrency, formatNumber } from '../../utils/format';
import { useLanguage } from '../../i18n';

export function StockCounts() {
  const { t } = useLanguage();

  // State
  const [counts, setCounts] = useState<StockCount[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 15,
  });

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [activeCount, setActiveCount] = useState<StockCount | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Counting form state
  const [itemCounts, setItemCounts] = useState<{ [id: number]: { counted_quantity: number | ''; variance_reason: string; notes: string } }>({});

  // New count form state
  const [createForm, setCreateForm] = useState<CreateStockCountPayload>({
    warehouse_id: 0,
    storage_location_id: null,
    count_type: 'FULL',
    description: '',
    count_date: new Date().toISOString().split('T')[0],
    notes: '',
    auto_populate: true,
  });

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

  // Fetch stock counts
  const fetchCounts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getStockCounts({
        warehouse_id: selectedWarehouseId || undefined,
        status: (selectedStatus as StockCountStatus) || undefined,
        page: pagination.current_page,
        per_page: pagination.per_page,
      });

      const paginated = res?.data;
      if (paginated?.data) {
        setCounts(paginated.data);
        setPagination({
          current_page: paginated.current_page || 1,
          last_page: paginated.last_page || 1,
          total: paginated.total || 0,
          per_page: paginated.per_page || 15,
        });
      } else {
        setCounts(Array.isArray(paginated) ? paginated : []);
      }
    } catch (err: any) {
      console.error('Failed to fetch stock counts', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load stock counts');
    } finally {
      setIsLoading(false);
    }
  }, [selectedWarehouseId, selectedStatus, pagination.current_page, pagination.per_page]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Open detail modal and load complete count data
  const handleOpenDetail = async (countId: number) => {
    try {
      const res = await getStockCount(countId);
      const countData: StockCount = res?.data || res;
      setActiveCount(countData);

      // Initialize counting inputs
      const initial: { [id: number]: { counted_quantity: number | ''; variance_reason: string; notes: string } } = {};
      if (countData.items) {
        countData.items.forEach((item) => {
          initial[item.id] = {
            counted_quantity: item.counted_quantity !== null && item.counted_quantity !== undefined ? Number(item.counted_quantity) : '',
            variance_reason: item.variance_reason || '',
            notes: item.notes || '',
          };
        });
      }
      setItemCounts(initial);
      setIsDetailModalOpen(true);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to load stock count details');
    }
  };

  // Actions on active count
  const handleStartCount = async () => {
    if (!activeCount) return;
    setIsSubmitting(true);
    try {
      await startStockCount(activeCount.id);
      await handleOpenDetail(activeCount.id);
      fetchCounts();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to start count');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveItems = async () => {
    if (!activeCount || !activeCount.items) return;
    setIsSubmitting(true);
    try {
      const payloadItems = activeCount.items.map((item) => {
        const row = itemCounts[item.id];
        return {
          id: item.id,
          counted_quantity: row?.counted_quantity === '' ? 0 : Number(row?.counted_quantity ?? 0),
          variance_reason: row?.variance_reason || undefined,
          notes: row?.notes || undefined,
        };
      });

      await updateStockCountItems(activeCount.id, { items: payloadItems });
      await handleOpenDetail(activeCount.id);
      fetchCounts();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save counted quantities');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitCount = async () => {
    if (!activeCount) return;
    if (!window.confirm(t('inventory.confirmSubmitCount', 'Submit counted inventory for supervisor review?'))) return;
    setIsSubmitting(true);
    try {
      await submitStockCount(activeCount.id);
      await handleOpenDetail(activeCount.id);
      fetchCounts();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to submit count');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewCount = async () => {
    if (!activeCount) return;
    setIsSubmitting(true);
    try {
      await reviewStockCount(activeCount.id);
      await handleOpenDetail(activeCount.id);
      fetchCounts();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to mark as reviewed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveCount = async () => {
    if (!activeCount) return;
    if (!window.confirm(t('inventory.confirmApproveCount', 'Approve inventory count variances?'))) return;
    setIsSubmitting(true);
    try {
      await approveStockCount(activeCount.id);
      await handleOpenDetail(activeCount.id);
      fetchCounts();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to approve count');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostCount = async () => {
    if (!activeCount) return;
    if (!window.confirm(t('inventory.confirmPostCount', 'Post variances to stock movements and update ledger? This action cannot be undone.'))) return;
    setIsSubmitting(true);
    try {
      await postStockCount(activeCount.id);
      await handleOpenDetail(activeCount.id);
      fetchCounts();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to post count');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelCount = async () => {
    if (!activeCount) return;
    if (!window.confirm(t('inventory.confirmCancelCount', 'Are you sure you want to cancel this count session?'))) return;
    setIsSubmitting(true);
    try {
      await cancelStockCount(activeCount.id);
      await handleOpenDetail(activeCount.id);
      fetchCounts();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to cancel count');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.warehouse_id) {
      alert(t('inventory.warehouseRequired', 'Please select a warehouse'));
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await createStockCount(createForm);
      setIsCreateModalOpen(false);
      fetchCounts();
      if (res?.data?.id) {
        handleOpenDetail(res.data.id);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create stock count');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t('inventory.stockCounts', 'Physical Stock Counts')}
        subtitle={t('inventory.stockCountsSubtitle', 'Schedule, count, reconcile, and post physical inventory counts')}
        actions={
          <button
            type="button"
            onClick={() => {
              setCreateForm({
                warehouse_id: warehouses[0]?.id || 0,
                storage_location_id: null,
                count_type: 'FULL',
                description: '',
                count_date: new Date().toISOString().split('T')[0],
                notes: '',
                auto_populate: true,
              });
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t('inventory.newStockCount', 'New Stock Count')}
          </button>
        }
      />

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <WarehouseIcon className="w-4 h-4 text-slate-400" />
          <select
            value={selectedWarehouseId}
            onChange={(e) => {
              setSelectedWarehouseId(e.target.value);
              setPagination((p) => ({ ...p, current_page: 1 }));
            }}
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

        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPagination((p) => ({ ...p, current_page: 1 }));
            }}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
          >
            <option value="">{t('inventory.allStatuses', 'All Statuses')}</option>
            <option value="DRAFT">Draft</option>
            <option value="COUNTING">Counting</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="APPROVED">Approved</option>
            <option value="POSTED">Posted</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Counts Table */}
      {isLoading ? (
        <LoadingState message={t('common.loading', 'Loading stock counts...')} />
      ) : counts.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={t('inventory.noStockCounts', 'No Stock Counts Found')}
          description={t('inventory.noStockCountsDesc', 'Create a new stock count session to start physical inventory reconciliation.')}
        />
      ) : (
        <TableContainer>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-xs font-semibold">
              <tr>
                <th className="px-4 py-3">{t('inventory.countNumber', 'Count No')}</th>
                <th className="px-4 py-3">{t('inventory.warehouse', 'Warehouse')}</th>
                <th className="px-4 py-3">{t('inventory.countType', 'Type')}</th>
                <th className="px-4 py-3">{t('inventory.date', 'Date')}</th>
                <th className="px-4 py-3">{t('common.status', 'Status')}</th>
                <th className="px-4 py-3 text-right">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {counts.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-white">
                    {c.count_number}
                    {c.description && <span className="block text-xs text-slate-400 font-normal">{c.description}</span>}
                  </td>
                  <td className="px-4 py-3.5">{c.warehouse?.name || '—'}</td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md font-mono">
                      {c.count_type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">{c.count_date || '—'}</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(c.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {t('common.view', 'View / Count')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableContainer>
      )}

      {/* Detail / Counting Modal */}
      {isDetailModalOpen && activeCount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {activeCount.count_number}
                  </h3>
                  <StatusBadge status={activeCount.status} />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {t('inventory.warehouse', 'Warehouse')}: {activeCount.warehouse?.name} | {t('inventory.countType', 'Type')}: {activeCount.count_type} | {t('inventory.date', 'Date')}: {activeCount.count_date || '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Items table */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t('inventory.countItems', 'Count Items')} ({activeCount.items?.length || 0})
                </h4>
                {activeCount.status === 'COUNTING' && (
                  <button
                    type="button"
                    onClick={handleSaveItems}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {t('common.save', 'Save Counts')}
                  </button>
                )}
              </div>

              {(!activeCount.items || activeCount.items.length === 0) ? (
                <EmptyState
                  icon={ClipboardCheck}
                  title={t('inventory.noItemsInCount', 'No Items In This Count')}
                  description={t('inventory.noItemsInCountDesc', 'Items can be added or auto-populated when creating the count.')}
                />
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold">
                      <tr>
                        <th className="px-3 py-2.5">{t('inventory.product', 'Product')}</th>
                        <th className="px-3 py-2.5">{t('inventory.location', 'Location')}</th>
                        <th className="px-3 py-2.5">{t('inventory.batch', 'Batch')}</th>
                        <th className="px-3 py-2.5 text-right">{t('inventory.systemQty', 'System Qty')}</th>
                        <th className="px-3 py-2.5 text-right w-32">{t('inventory.countedQty', 'Counted Qty')}</th>
                        <th className="px-3 py-2.5 text-right">{t('inventory.varianceQty', 'Variance')}</th>
                        <th className="px-3 py-2.5">{t('inventory.reason', 'Variance Reason')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {activeCount.items.map((item) => {
                        const row = itemCounts[item.id] || { counted_quantity: '', variance_reason: '', notes: '' };
                        const sysQty = Number(item.system_quantity);
                        const countedVal = row.counted_quantity === '' ? null : Number(row.counted_quantity);
                        const liveVariance = countedVal !== null ? countedVal - sysQty : Number(item.variance_quantity || 0);

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="px-3 py-2.5">
                              <span className="font-semibold text-slate-900 dark:text-white block">
                                {item.product?.name || item.product_variant?.variant_name}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                SKU: {item.product_variant?.sku}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">{item.storage_location?.name || '—'}</td>
                            <td className="px-3 py-2.5">{item.stock_batch?.batch_no || '—'}</td>
                            <td className="px-3 py-2.5 text-right font-mono font-medium">{formatNumber(sysQty)}</td>
                            <td className="px-3 py-2.5 text-right">
                              {activeCount.status === 'COUNTING' ? (
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={row.counted_quantity}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? '' : Number(e.target.value);
                                    setItemCounts((prev) => ({
                                      ...prev,
                                      [item.id]: { ...prev[item.id], counted_quantity: val },
                                    }));
                                  }}
                                  className="w-24 px-2 py-1 text-right bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-mono text-xs focus:ring-1 focus:ring-indigo-500"
                                />
                              ) : (
                                <span className="font-mono font-medium">
                                  {item.counted_quantity !== null ? formatNumber(Number(item.counted_quantity)) : '—'}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold">
                              {liveVariance === 0 ? (
                                <span className="text-slate-400">0</span>
                              ) : liveVariance > 0 ? (
                                <span className="text-emerald-600 dark:text-emerald-400">+{formatNumber(liveVariance)}</span>
                              ) : (
                                <span className="text-rose-600 dark:text-rose-400">{formatNumber(liveVariance)}</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              {activeCount.status === 'COUNTING' ? (
                                <input
                                  type="text"
                                  placeholder="Reason (if variance)..."
                                  value={row.variance_reason}
                                  onChange={(e) => {
                                    setItemCounts((prev) => ({
                                      ...prev,
                                      [item.id]: { ...prev[item.id], variance_reason: e.target.value },
                                    }));
                                  }}
                                  className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs"
                                />
                              ) : (
                                <span className="text-xs text-slate-500">{item.variance_reason || '—'}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer Lifecycle Actions */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="text-xs text-slate-500">
                {activeCount.posted_at && <span>Posted at: {activeCount.posted_at}</span>}
              </div>

              <div className="flex items-center gap-2">
                {/* DRAFT -> Start Count */}
                {activeCount.status === 'DRAFT' && (
                  <button
                    type="button"
                    onClick={handleStartCount}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {t('inventory.startCounting', 'Start Counting')}
                  </button>
                )}

                {/* COUNTING -> Submit */}
                {activeCount.status === 'COUNTING' && (
                  <button
                    type="button"
                    onClick={handleSubmitCount}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {t('inventory.submitForReview', 'Submit for Review')}
                  </button>
                )}

                {/* SUBMITTED -> Review */}
                {activeCount.status === 'SUBMITTED' && (
                  <button
                    type="button"
                    onClick={handleReviewCount}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {t('inventory.markReviewed', 'Mark as Reviewed')}
                  </button>
                )}

                {/* REVIEWED -> Approve */}
                {activeCount.status === 'REVIEWED' && (
                  <button
                    type="button"
                    onClick={handleApproveCount}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t('inventory.approveCount', 'Approve Variances')}
                  </button>
                )}

                {/* APPROVED -> Post */}
                {activeCount.status === 'APPROVED' && (
                  <button
                    type="button"
                    onClick={handlePostCount}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    {t('inventory.postToLedger', 'Post to Ledger')}
                  </button>
                )}

                {/* Cancel allowed on non-posted/cancelled */}
                {activeCount.status !== 'POSTED' && activeCount.status !== 'CANCELLED' && (
                  <button
                    type="button"
                    onClick={handleCancelCount}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    {t('common.cancel', 'Cancel Session')}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  {t('common.close', 'Close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Stock Count Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('inventory.newStockCount', 'New Physical Stock Count')}
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('inventory.warehouse', 'Warehouse')} *
                </label>
                <select
                  value={createForm.warehouse_id}
                  onChange={(e) => setCreateForm({ ...createForm, warehouse_id: Number(e.target.value) })}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm"
                >
                  <option value={0} disabled>Select Warehouse</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('inventory.countType', 'Count Type')} *
                </label>
                <select
                  value={createForm.count_type}
                  onChange={(e) => setCreateForm({ ...createForm, count_type: e.target.value as StockCountType })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="FULL">Full Warehouse Count</option>
                  <option value="PARTIAL">Partial Count</option>
                  <option value="CYCLE_COUNT">Cycle Count</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('inventory.countDate', 'Scheduled Date')}
                </label>
                <input
                  type="date"
                  value={createForm.count_date}
                  onChange={(e) => setCreateForm({ ...createForm, count_date: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('inventory.description', 'Description')}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q4 End Inventory Count"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto_populate"
                  checked={createForm.auto_populate}
                  onChange={(e) => setCreateForm({ ...createForm, auto_populate: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <label htmlFor="auto_populate" className="text-xs text-slate-600 dark:text-slate-400">
                  {t('inventory.autoPopulateDesc', 'Auto-populate all currently stocked products into this count session')}
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  {t('common.create', 'Create Session')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
