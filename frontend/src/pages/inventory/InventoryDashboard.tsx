import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router';
import {
  Boxes,
  Layers,
  AlertTriangle,
  XCircle,
  Search,
  RefreshCw,
  ArrowLeftRight,
  Send,
  Eye,
  Warehouse as WarehouseIcon,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  SlidersHorizontal,
  ClipboardCheck,
  ShieldCheck,
  DollarSign,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { TableContainer } from '../../components/common/TableContainer';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { getInventory, getLowStock, getWarehouses } from '../../api/inventory';
import type { InventoryItem, Warehouse } from '../../types/inventory';
import { formatCurrency, formatNumber } from '../../utils/format';
import { useLanguage } from '../../i18n';

export function InventoryDashboard() {
  const { t } = useLanguage();

  // State
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 15,
    from: 0,
    to: 0,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingLowStock, setIsLoadingLowStock] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Decimal-safe formatting helper (prevents truncating fractional quantities)
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

  // Fetch Low Stock Alerts
  const fetchLowStockData = useCallback(async () => {
    setIsLoadingLowStock(true);
    try {
      const response = await getLowStock();
      const items = response?.data || (Array.isArray(response) ? response : []);
      setLowStockItems(items);
    } catch (err) {
      console.error('Failed to load low stock items:', err);
      setLowStockItems([]);
    } finally {
      setIsLoadingLowStock(false);
    }
  }, []);

  // Fetch Inventory List
  const fetchInventoryData = useCallback(
    async (page = 1, warehouseId = selectedWarehouseId, search = searchQuery) => {
      setIsLoading(true);
      setError(null);
      try {
        const params: {
          page: number;
          per_page: number;
          warehouse_id?: number | string;
          search?: string;
        } = {
          page,
          per_page: 15,
        };

        if (warehouseId) {
          params.warehouse_id = warehouseId;
        }
        if (search && search.trim()) {
          params.search = search.trim();
        }

        const response = await getInventory(params);
        const paginatedData = response?.data;

        if (paginatedData && Array.isArray(paginatedData.data)) {
          setInventoryItems(paginatedData.data);
          setPagination({
            current_page: paginatedData.current_page || 1,
            last_page: paginatedData.last_page || 1,
            total: paginatedData.total || 0,
            per_page: paginatedData.per_page || 15,
            from: paginatedData.from || 0,
            to: paginatedData.to || 0,
          });
        } else if (Array.isArray(paginatedData)) {
          setInventoryItems(paginatedData);
          setPagination({
            current_page: 1,
            last_page: 1,
            total: paginatedData.length,
            per_page: paginatedData.length || 15,
            from: paginatedData.length ? 1 : 0,
            to: paginatedData.length,
          });
        } else if (Array.isArray(response)) {
          setInventoryItems(response);
          setPagination({
            current_page: 1,
            last_page: 1,
            total: response.length,
            per_page: response.length || 15,
            from: response.length ? 1 : 0,
            to: response.length,
          });
        } else {
          setInventoryItems([]);
          setPagination({
            current_page: 1,
            last_page: 1,
            total: 0,
            per_page: 15,
            from: 0,
            to: 0,
          });
        }
      } catch (err: unknown) {
        console.error('Failed to load inventory data:', err);
        const msg = (err as { message?: string })?.message || 'Failed to retrieve inventory records';
        setError(msg);
        setInventoryItems([]);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedWarehouseId, searchQuery]
  );

  // Initial and reactive fetch
  useEffect(() => {
    fetchInventoryData(1, selectedWarehouseId, searchQuery);
  }, [fetchInventoryData, selectedWarehouseId]);

  useEffect(() => {
    fetchLowStockData();
  }, [fetchLowStockData]);

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchInventoryData(pagination.current_page, selectedWarehouseId, searchQuery),
      fetchLowStockData(),
    ]);
    setIsRefreshing(false);
  };

  // Search submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInventoryData(1, selectedWarehouseId, searchQuery);
  };

  // Page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.last_page) {
      fetchInventoryData(newPage, selectedWarehouseId, searchQuery);
    }
  };

  // Derived KPI Metrics (Real calculation from API data, zero fake mock values)
  const kpis = useMemo(() => {
    let totalVal = 0;
    let outOfStockCount = 0;

    inventoryItems.forEach((item) => {
      const itemVal = item.total_value !== undefined && item.total_value !== null
        ? Number(item.total_value)
        : Number(item.quantity || 0) * Number(item.average_cost || 0);
      if (!isNaN(itemVal)) {
        totalVal += itemVal;
      }

      const avail = Number(item.available_quantity ?? item.quantity ?? 0);
      if (avail <= 0) {
        outOfStockCount++;
      }
    });

    return {
      totalValue: totalVal,
      totalItems: pagination.total,
      lowStockCount: lowStockItems.length,
      outOfStockCount,
    };
  }, [inventoryItems, lowStockItems.length, pagination.total]);

  // Determine stock item status
  const getItemStatus = (item: InventoryItem) => {
    const avail = Number(item.available_quantity ?? item.quantity ?? 0);
    const reorder = Number(item.product?.reorder_level ?? 0);
    if (avail <= 0) {
      return { status: 'OUT_OF_STOCK', label: t('inventory.outOfStockBadge', 'Out of Stock') };
    }
    if (reorder > 0 && avail <= reorder) {
      return { status: 'LOW_STOCK', label: t('inventory.lowStock', 'Low Stock') };
    }
    return { status: 'IN_STOCK', label: t('inventory.inStock', 'In Stock') };
  };

  return (
    <div className="space-y-6" data-testid="inventory-dashboard">
      {/* 1. Page Header */}
      <PageHeader
        title={t('inventory.title', 'Inventory Management')}
        subtitle={t('inventory.subtitle', 'Real-time stock levels, warehouse visibility, and reorder alerts')}
        breadcrumbs={[
          { label: t('nav.dashboard', 'Dashboard'), to: '/dashboard' },
          { label: t('inventory.title', 'Inventory') },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/inventory/movements"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-colors"
              data-testid="link-stock-movements"
            >
              <ArrowLeftRight className="w-4 h-4 text-slate-500" />
              <span>{t('inventory.movements', 'Stock Movements')}</span>
            </Link>

            <Link
              to="/inventory/adjustments"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-colors"
              data-testid="link-stock-adjustments"
            >
              <SlidersHorizontal className="w-4 h-4 text-slate-500" />
              <span>{t('inventory.adjustments', 'Stock Adjustments')}</span>
            </Link>

            <Link
              to="/inventory/transfers"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-colors"
              data-testid="link-stock-transfers"
            >
              <Send className="w-4 h-4 text-slate-500" />
              <span>{t('inventory.transfers', 'Stock Transfers')}</span>
            </Link>

            <Link
              to="/inventory/stock-counts"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-colors"
              data-testid="link-stock-counts"
            >
              <ClipboardCheck className="w-4 h-4 text-indigo-500" />
              <span>{t('nav.stockCounts', 'Stock Counts')}</span>
            </Link>

            <Link
              to="/inventory/batches"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-colors"
              data-testid="link-stock-batches"
            >
              <Layers className="w-4 h-4 text-amber-500" />
              <span>{t('nav.batches', 'Batches & Expiry')}</span>
            </Link>

            <Link
              to="/inventory/valuation"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-colors"
              data-testid="link-stock-valuation"
            >
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span>{t('nav.valuation', 'Valuation')}</span>
            </Link>

            <Link
              to="/inventory/reconciliation"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-colors"
              data-testid="link-stock-reconciliation"
            >
              <ShieldCheck className="w-4 h-4 text-sky-500" />
              <span>{t('nav.reconciliation', 'Reconciliation')}</span>
            </Link>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
              title={t('inventory.refresh', 'Refresh')}
              data-testid="btn-refresh-inventory"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t('inventory.refresh', 'Refresh')}</span>
            </button>
          </div>
        }
      />

      {/* 2. KPI Cards Grid (Real API values, zero hardcoded numbers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="kpi-grid">
        <KpiCard
          id="kpi-inventory-value"
          title={t('inventory.totalValue', 'Total Inventory Value')}
          value={formatCurrency(kpis.totalValue)}
          icon={Boxes}
          color="emerald"
          subtitle={
            selectedWarehouseId
              ? warehouses.find((w) => String(w.id) === String(selectedWarehouseId))?.name
              : t('inventory.allWarehouses', 'All Warehouses')
          }
        />
        <KpiCard
          id="kpi-total-items"
          title={t('inventory.totalItems', 'Total Items')}
          value={formatNumber(kpis.totalItems)}
          icon={Layers}
          color="blue"
          subtitle={t('inventory.stockLevels', 'Tracked SKUs')}
        />
        <KpiCard
          id="kpi-low-stock"
          title={t('inventory.lowStockAlerts', 'Low Stock Items')}
          value={formatNumber(kpis.lowStockCount)}
          icon={AlertTriangle}
          color="amber"
          subtitle={t('inventory.reorderPoint', 'At or below reorder level')}
        />
        <KpiCard
          id="kpi-out-of-stock"
          title={t('inventory.outOfStock', 'Out of Stock Items')}
          value={formatNumber(kpis.outOfStockCount)}
          icon={XCircle}
          color="rose"
          subtitle={t('inventory.status', 'Zero or negative available')}
        />
      </div>

      {/* 3. Low Stock Alerts Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden" data-testid="low-stock-section">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-amber-50/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                {t('inventory.lowStockSectionTitle', 'Low Stock & Reorder Warnings')}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {t('inventory.lowStockSectionSubtitle', 'Items that have reached or dropped below reorder threshold')}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 self-start sm:self-auto">
            {lowStockItems.length} {t('inventory.lowStockAlerts', 'Items')}
          </span>
        </div>

        {isLoadingLowStock ? (
          <div className="p-6">
            <LoadingState type="skeleton" rows={3} />
          </div>
        ) : lowStockItems.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs sm:text-sm font-medium flex items-center justify-center gap-2">
            <span className="text-emerald-500 font-bold">✓</span>
            {t('inventory.noLowStock', 'All inventory levels healthy. No low stock alerts.')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-4">{t('inventory.productSku', 'Product & SKU')}</th>
                  <th className="py-2.5 px-4">{t('inventory.warehouse', 'Warehouse')}</th>
                  <th className="py-2.5 px-4 text-right">{t('inventory.availableQty', 'Available Qty')}</th>
                  <th className="py-2.5 px-4 text-right">{t('inventory.reorderLevel', 'Reorder Level')}</th>
                  <th className="py-2.5 px-4 text-center">{t('inventory.status', 'Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStockItems.map((item) => {
                  const avail = Number(item.available_quantity ?? item.quantity ?? 0);
                  const isOutOfStock = avail <= 0;
                  return (
                    <tr key={item.id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {item.product?.name || `Product #${item.product_id}`}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {item.product_variant?.sku || item.product?.sku || '-'}
                          {item.product_variant?.variant_name ? ` · ${item.product_variant.variant_name}` : ''}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 font-medium">
                        {item.warehouse?.name || `Warehouse #${item.warehouse_id}`}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-700">
                        {formatDecimalQty(item.available_quantity ?? item.quantity)}{' '}
                        <span className="text-[10px] text-slate-500 font-normal">
                          {item.product?.unit?.symbol || item.product?.unit?.name || ''}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-500">
                        {formatDecimalQty(item.product?.reorder_level ?? 0)}{' '}
                        <span className="text-[10px] text-slate-400">
                          {item.product?.unit?.symbol || item.product?.unit?.name || ''}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <StatusBadge
                          status={isOutOfStock ? 'CANCELLED' : 'PENDING'}
                          customLabel={isOutOfStock ? t('inventory.outOfStockBadge', 'Out of Stock') : t('inventory.lowStock', 'Low Stock')}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Filter Bar & Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Warehouse Dropdown Filter */}
          <div className="relative min-w-[200px] sm:max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <WarehouseIcon className="w-4 h-4" />
            </div>
            <select
              aria-label={t('inventory.filterByWarehouse', 'Filter by Warehouse')}
              value={selectedWarehouseId}
              onChange={(e) => {
                setSelectedWarehouseId(e.target.value);
              }}
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700"
              data-testid="select-warehouse-filter"
            >
              <option value="">{t('inventory.allWarehouses', 'All Warehouses')}</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} {w.code ? `(${w.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input Form */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('inventory.searchPlaceholder', 'Search product, SKU, or variant...')}
              className="w-full pl-9 pr-16 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
              data-testid="input-inventory-search"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  fetchInventoryData(1, selectedWarehouseId, '');
                }}
                className="absolute inset-y-0 right-2 px-1.5 flex items-center text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </form>
        </div>

        <div className="text-xs text-slate-500 font-medium self-end md:self-center">
          {t('inventory.showingRecords', 'Showing {from} to {to} of {total} records', {
            from: pagination.from,
            to: pagination.to,
            total: pagination.total,
          })}
        </div>
      </div>

      {/* 5. Main Stock Levels Table */}
      <TableContainer
        id="inventory-table-container"
        headerContent={
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                {t('inventory.stockLevelsTitle', 'Warehouse Stock Levels')}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {t('inventory.stockLevelsSubtitle', 'Live item quantities and valuation across locations')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {pagination.total} {t('inventory.totalItems', 'Total Records')}
              </span>
            </div>
          </div>
        }
        footerContent={
          pagination.last_page > 1 ? (
            <div className="flex items-center justify-between w-full" data-testid="inventory-pagination">
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
          <div className="p-8 text-center" data-testid="inventory-error-state">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">{error}</h3>
            <button
              type="button"
              onClick={() => fetchInventoryData(pagination.current_page, selectedWarehouseId, searchQuery)}
              className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
            >
              {t('inventory.refresh', 'Try Again')}
            </button>
          </div>
        ) : isLoading ? (
          <div className="p-8">
            <LoadingState type="skeleton" rows={5} />
          </div>
        ) : inventoryItems.length === 0 ? (
          <EmptyState
            title={t('inventory.noInventoryFound', 'No inventory records found')}
            description={t('inventory.noInventoryFoundDesc', 'No stock items match your search or filter criteria.')}
          />
        ) : (
          <table className="w-full text-left text-xs sm:text-sm border-collapse" data-testid="inventory-table">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">{t('inventory.productSku', 'Product & SKU')}</th>
                <th className="py-3 px-4">{t('inventory.warehouse', 'Warehouse')}</th>
                <th className="py-3 px-4 text-right">{t('inventory.availableQty', 'Available Qty')}</th>
                <th className="py-3 px-4 text-right">{t('inventory.reservedQty', 'Reserved Qty')}</th>
                <th className="py-3 px-4 text-right">{t('inventory.unitCost', 'Unit Cost')}</th>
                <th className="py-3 px-4 text-right">{t('inventory.totalStockValue', 'Total Value')}</th>
                <th className="py-3 px-4 text-center">{t('inventory.status', 'Status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventoryItems.map((item) => {
                const statusInfo = getItemStatus(item);
                const badgeStatus =
                  statusInfo.status === 'OUT_OF_STOCK'
                    ? 'CANCELLED'
                    : statusInfo.status === 'LOW_STOCK'
                    ? 'PENDING'
                    : 'ACTIVE';

                const unitSymbol = item.product?.unit?.symbol || item.product?.unit?.name || '';
                const unitCost = Number(item.average_cost || 0);
                const totalVal =
                  item.total_value !== undefined && item.total_value !== null
                    ? Number(item.total_value)
                    : Number(item.quantity || 0) * unitCost;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors" data-testid={`inventory-row-${item.id}`}>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">
                        {item.product?.name || `Product #${item.product_id}`}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {item.product_variant?.sku || item.product?.sku || '-'}
                        {item.product_variant?.variant_name ? (
                          <span className="text-slate-600 font-sans ml-1">
                            ({item.product_variant.variant_name})
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-700 font-medium">
                      <div className="flex items-center gap-1.5">
                        <WarehouseIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.warehouse?.name || `Warehouse #${item.warehouse_id}`}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatDecimalQty(item.available_quantity ?? item.quantity)}{' '}
                      <span className="text-[10px] text-slate-400 font-normal font-sans">
                        {unitSymbol}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-500">
                      {formatDecimalQty(item.reserved_quantity ?? 0)}{' '}
                      <span className="text-[10px] text-slate-400 font-normal font-sans">
                        {unitSymbol}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {formatCurrency(unitCost)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(totalVal)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={badgeStatus} customLabel={statusInfo.label} />
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
export default InventoryDashboard;
