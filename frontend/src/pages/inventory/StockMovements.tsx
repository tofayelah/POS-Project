import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import {
  History,
  ArrowLeft,
  Warehouse as WarehouseIcon,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { TableContainer } from '../../components/common/TableContainer';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { getStockMovements, getWarehouses } from '../../api/inventory';
import type { StockMovement, Warehouse, StockMovementType } from '../../types/inventory';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { useLanguage } from '../../i18n';

const MOVEMENT_TYPES: { value: StockMovementType; isAddition: boolean }[] = [
  { value: 'OPENING_STOCK', isAddition: true },
  { value: 'STOCK_IN', isAddition: true },
  { value: 'STOCK_OUT', isAddition: false },
  { value: 'TRANSFER_IN', isAddition: true },
  { value: 'TRANSFER_OUT', isAddition: false },
  { value: 'ADJUSTMENT_IN', isAddition: true },
  { value: 'ADJUSTMENT_OUT', isAddition: false },
  { value: 'DAMAGE', isAddition: false },
  { value: 'LOSS', isAddition: false },
];

export function StockMovements() {
  const { t } = useLanguage();

  // State
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [selectedMovementType, setSelectedMovementType] = useState<string>('');
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 25,
    from: 0,
    to: 0,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Decimal formatting helper
  const formatDecimalQty = (val: string | number | undefined | null): string => {
    if (val === null || val === undefined || val === '') return '0.000';
    const num = Number(val);
    if (isNaN(num)) return String(val);
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  };

  // Load Warehouses
  useEffect(() => {
    let isMounted = true;
    async function fetchWarehouses() {
      try {
        const response = await getWarehouses();
        const data = response?.data || (Array.isArray(response) ? response : []);
        if (isMounted) {
          setWarehouses(data);
        }
      } catch (err) {
        console.error('Failed to load warehouses:', err);
      }
    }
    fetchWarehouses();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Stock Movements
  const fetchMovements = useCallback(
    async (page = 1, warehouseId = selectedWarehouseId, movementType = selectedMovementType) => {
      setIsLoading(true);
      setError(null);
      try {
        const params: {
          page: number;
          per_page: number;
          warehouse_id?: number | string;
          movement_type?: string;
        } = {
          page,
          per_page: 25,
        };

        if (warehouseId) {
          params.warehouse_id = warehouseId;
        }
        if (movementType) {
          params.movement_type = movementType;
        }

        const response = await getStockMovements(params);
        const paginatedData = response?.data;

        if (paginatedData && Array.isArray(paginatedData.data)) {
          setMovements(paginatedData.data);
          setPagination({
            current_page: paginatedData.current_page || 1,
            last_page: paginatedData.last_page || 1,
            total: paginatedData.total || 0,
            per_page: paginatedData.per_page || 25,
            from: paginatedData.from || 0,
            to: paginatedData.to || 0,
          });
        } else if (Array.isArray(paginatedData)) {
          setMovements(paginatedData);
          setPagination({
            current_page: 1,
            last_page: 1,
            total: paginatedData.length,
            per_page: paginatedData.length || 25,
            from: paginatedData.length ? 1 : 0,
            to: paginatedData.length,
          });
        } else if (Array.isArray(response)) {
          setMovements(response);
          setPagination({
            current_page: 1,
            last_page: 1,
            total: response.length,
            per_page: response.length || 25,
            from: response.length ? 1 : 0,
            to: response.length,
          });
        } else {
          setMovements([]);
          setPagination({
            current_page: 1,
            last_page: 1,
            total: 0,
            per_page: 25,
            from: 0,
            to: 0,
          });
        }
      } catch (err: unknown) {
        console.error('Failed to load stock movements:', err);
        const msg = (err as { message?: string })?.message || 'Failed to retrieve stock movement ledger';
        setError(msg);
        setMovements([]);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedWarehouseId, selectedMovementType]
  );

  useEffect(() => {
    fetchMovements(1, selectedWarehouseId, selectedMovementType);
  }, [fetchMovements, selectedWarehouseId, selectedMovementType]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchMovements(pagination.current_page, selectedWarehouseId, selectedMovementType);
    setIsRefreshing(false);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.last_page) {
      fetchMovements(newPage, selectedWarehouseId, selectedMovementType);
    }
  };

  // Helper to determine if movement is addition or reduction
  const isAdditionType = (type: string): boolean => {
    const matched = MOVEMENT_TYPES.find((m) => m.value === type);
    if (matched !== undefined) return matched.isAddition;
    return type.toUpperCase().includes('IN') || type.toUpperCase().includes('OPENING');
  };

  // Helper to render type badge
  const renderMovementTypeBadge = (type: string) => {
    const isAdd = isAdditionType(type);
    const localizedLabel = t(`inventory.type.${type}`, type);

    let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
    if (type === 'OPENING_STOCK') {
      badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
    } else if (type === 'STOCK_IN' || type === 'TRANSFER_IN' || type === 'ADJUSTMENT_IN') {
      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (type === 'DAMAGE' || type === 'LOSS') {
      badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
    } else if (type === 'STOCK_OUT' || type === 'TRANSFER_OUT' || type === 'ADJUSTMENT_OUT') {
      badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
    }

    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border tracking-wide uppercase font-mono ${badgeClass}`}
      >
        {isAdd ? (
          <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
        ) : (
          <ArrowUpRight className="w-3 h-3 text-rose-600" />
        )}
        <span>{localizedLabel}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6" data-testid="stock-movements-page">
      {/* 1. Page Header */}
      <PageHeader
        title={t('inventory.stockMovementsTitle', 'Stock Movement Ledger')}
        subtitle={t(
          'inventory.stockMovementsSubtitle',
          'Complete audit trail of all warehouse stock ins, outs, and adjustments'
        )}
        breadcrumbs={[
          { label: t('nav.dashboard', 'Dashboard'), to: '/dashboard' },
          { label: t('inventory.title', 'Inventory'), to: '/inventory' },
          { label: t('inventory.movements', 'Stock Movements') },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/inventory"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-colors"
              data-testid="link-back-inventory"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>{t('inventory.backToInventory', 'Back to Inventory')}</span>
            </Link>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
              title={t('inventory.refresh', 'Refresh')}
              data-testid="btn-refresh-movements"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t('inventory.refresh', 'Refresh')}</span>
            </button>
          </div>
        }
      />

      {/* 2. Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Warehouse Filter */}
          <div className="relative min-w-[200px] sm:max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <WarehouseIcon className="w-4 h-4" />
            </div>
            <select
              aria-label={t('inventory.filterByWarehouse', 'Filter by Warehouse')}
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700"
              data-testid="select-movement-warehouse"
            >
              <option value="">{t('inventory.allWarehouses', 'All Warehouses')}</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} {w.code ? `(${w.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Movement Type Filter */}
          <div className="relative min-w-[200px] sm:max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Filter className="w-4 h-4" />
            </div>
            <select
              aria-label={t('inventory.movementType', 'Movement Type')}
              value={selectedMovementType}
              onChange={(e) => setSelectedMovementType(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700"
              data-testid="select-movement-type"
            >
              <option value="">{t('inventory.allMovementTypes', 'All Movement Types')}</option>
              {MOVEMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {t(`inventory.type.${type.value}`, type.value)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium self-end md:self-center">
          {t('inventory.showingRecords', 'Showing {from} to {to} of {total} records', {
            from: pagination.from,
            to: pagination.to,
            total: pagination.total,
          })}
        </div>
      </div>

      {/* 3. Movements Ledger Table */}
      <TableContainer
        id="movements-table-container"
        headerContent={
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <History className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                {t('inventory.stockMovementsTitle', 'Stock Movement Ledger')}
              </h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {pagination.total} {t('inventory.totalItems', 'Total Entries')}
            </span>
          </div>
        }
        footerContent={
          pagination.last_page > 1 ? (
            <div className="flex items-center justify-between w-full" data-testid="movements-pagination">
              <div className="text-xs text-slate-500 font-medium">
                {t('inventory.page', 'Page')} {pagination.current_page} {t('inventory.of', 'of')} {pagination.last_page}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.current_page - 1)}
                  disabled={pagination.current_page <= 1 || isLoading}
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs"
                  data-testid="pagination-prev"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('inventory.prev', 'Previous')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.current_page + 1)}
                  disabled={pagination.current_page >= pagination.last_page || isLoading}
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs"
                  data-testid="pagination-next"
                >
                  <span className="hidden sm:inline">{t('inventory.next', 'Next')}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : undefined
        }
      >
        {error ? (
          <div className="p-8 text-center" data-testid="movements-error-state">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">{error}</h3>
            <button
              type="button"
              onClick={() => fetchMovements(pagination.current_page, selectedWarehouseId, selectedMovementType)}
              className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
            >
              {t('inventory.refresh', 'Try Again')}
            </button>
          </div>
        ) : isLoading ? (
          <div className="p-8">
            <LoadingState type="skeleton" rows={6} />
          </div>
        ) : movements.length === 0 ? (
          <EmptyState
            icon={History}
            title={t('inventory.noMovements', 'No stock movements recorded yet.')}
            description={t(
              'inventory.noMovementsDesc',
              'When stock is received, transferred, or adjusted, ledger entries will appear here.'
            )}
          />
        ) : (
          <table className="w-full text-left text-xs sm:text-sm border-collapse" data-testid="movements-table">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">{t('inventory.date', 'Date & Time')}</th>
                <th className="py-3 px-4">{t('inventory.productSku', 'Product & SKU')}</th>
                <th className="py-3 px-4">{t('inventory.warehouse', 'Warehouse')}</th>
                <th className="py-3 px-4">{t('inventory.movementType', 'Movement Type')}</th>
                <th className="py-3 px-4 text-right">{t('inventory.quantity', 'Quantity')}</th>
                <th className="py-3 px-4 text-right">{t('inventory.beforeAfter', 'Before / After')}</th>
                <th className="py-3 px-4 text-right">{t('inventory.unitCost', 'Unit Cost')}</th>
                <th className="py-3 px-4 text-right">{t('inventory.totalStockValue', 'Total Cost')}</th>
                <th className="py-3 px-4">{t('inventory.reference', 'Reference / Reason')}</th>
                <th className="py-3 px-4">{t('inventory.createdBy', 'Created By')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.map((m) => {
                const isAdd = isAdditionType(m.movement_type);
                const unitSymbol = m.product?.unit?.symbol || m.product?.unit?.name || '';
                const unitCost = Number(m.unit_cost || 0);
                const totalCost = Number(m.total_cost || 0);

                return (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors" data-testid={`movement-row-${m.id}`}>
                    {/* Timestamp */}
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                      {formatDateTime(m.created_at)}
                    </td>

                    {/* Product & Variant */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">
                        {m.product?.name || `Product #${m.product_id}`}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {m.product_variant?.sku || m.product?.sku || '-'}
                        {m.product_variant?.variant_name ? ` · ${m.product_variant.variant_name}` : ''}
                      </div>
                    </td>

                    {/* Warehouse */}
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      <div className="flex items-center gap-1.5">
                        <WarehouseIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>{m.warehouse?.name || `Warehouse #${m.warehouse_id}`}</span>
                      </div>
                    </td>

                    {/* Movement Type */}
                    <td className="py-3 px-4">{renderMovementTypeBadge(m.movement_type)}</td>

                    {/* Quantity */}
                    <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                      <span className={isAdd ? 'text-emerald-700' : 'text-rose-700'}>
                        {isAdd ? '+' : '-'}
                        {formatDecimalQty(m.quantity)}{' '}
                        <span className="text-[10px] text-slate-400 font-normal font-sans">
                          {unitSymbol}
                        </span>
                      </span>
                    </td>

                    {/* Before -> After */}
                    <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      <span>{formatDecimalQty(m.quantity_before)}</span>
                      <span className="text-slate-300 mx-1">→</span>
                      <span className="font-semibold text-slate-800">
                        {formatDecimalQty(m.quantity_after)}
                      </span>
                    </td>

                    {/* Unit Cost */}
                    <td className="py-3 px-4 text-right font-mono text-slate-600 whitespace-nowrap">
                      {formatCurrency(unitCost)}
                    </td>

                    {/* Total Cost */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(totalCost)}
                    </td>

                    {/* Reference / Reason / Notes */}
                    <td className="py-3 px-4 text-slate-600 text-xs">
                      {m.reference_number ? (
                        <div className="font-mono text-[11px] font-semibold text-indigo-700">
                          {m.reference_number}
                        </div>
                      ) : null}
                      {m.reason ? (
                        <div className="text-slate-700">{m.reason}</div>
                      ) : m.notes ? (
                        <div className="text-slate-500 italic">{m.notes}</div>
                      ) : !m.reference_number ? (
                        <span className="text-slate-400">-</span>
                      ) : null}
                    </td>

                    {/* Created By */}
                    <td className="py-3 px-4 text-slate-600 text-xs whitespace-nowrap">
                      {m.creator?.name || (m.created_by ? `User #${m.created_by}` : '-')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </TableContainer>
    </div>
  );
}
export default StockMovements;
