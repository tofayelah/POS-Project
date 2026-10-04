import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import {
  Send,
  Plus,
  ArrowRight,
  Warehouse as WarehouseIcon,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  History,
  X,
  Package,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  Check,
  Truck,
  Inbox,
  Ban,
  Filter,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { TableContainer } from '../../components/common/TableContainer';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import {
  getTransfers,
  getTransfer,
  createTransfer,
  submitTransfer,
  approveTransfer,
  shipTransfer,
  receiveTransfer,
  cancelTransfer,
  getWarehouses,
  getInventory,
} from '../../api/inventory';
import { getProducts } from '../../api/products';
import type {
  StockTransfer,
  StockTransferStatus,
  Warehouse,
  InventoryItem,
  CreateTransferItemPayload,
} from '../../types/inventory';
import type { Product, ProductVariant } from '../../types/product';
import { getActiveTenantId } from '../../api/organization';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { useLanguage } from '../../i18n';

interface TransferItemDraft {
  product_variant_id: number;
  productName: string;
  sku: string;
  variantName?: string;
  unitSymbol: string;
  quantity: string;
  availableStock: number;
  notes?: string;
}

export function StockTransfers() {
  const { t } = useLanguage();

  // State: List
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedSourceWh, setSelectedSourceWh] = useState<string>('');
  const [selectedDestWh, setSelectedDestWh] = useState<string>('');
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 15,
    from: 0,
    to: 0,
  });
  const [isLoadingList, setIsLoadingList] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [listError, setListError] = useState<string | null>(null);

  // State: Modal Views
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [detailTransfer, setDetailTransfer] = useState<StockTransfer | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);

  // State: Create Form
  const [createSourceWh, setCreateSourceWh] = useState<string>('');
  const [createDestWh, setCreateDestWh] = useState<string>('');
  const [createNotes, setCreateNotes] = useState<string>('');
  const [transferItems, setTransferItems] = useState<TransferItemDraft[]>([]);

  // Item selector in create form
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProdId, setSelectedProdId] = useState<string>('');
  const [selectedVarId, setSelectedVarId] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState<string>('');
  const [itemSourceStock, setItemSourceStock] = useState<number | null>(null);
  const [isLoadingItemStock, setIsLoadingItemStock] = useState<boolean>(false);
  const [createFormError, setCreateFormError] = useState<string | null>(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);

  // State: Workflow Actions & Confirmations
  const [actionConfirm, setActionConfirm] = useState<{
    transfer: StockTransfer;
    action: 'submit' | 'approve' | 'ship' | 'receive' | 'cancel';
    receiveQuantities?: Record<number, string>;
  } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

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

  // 1. Fetch Warehouses and Products for form usage
  useEffect(() => {
    let isMounted = true;
    async function loadCommonRefs() {
      try {
        const [whRes, prodRes] = await Promise.all([
          getWarehouses(),
          getProducts({ per_page: 100 }),
        ]);
        if (isMounted) {
          setWarehouses(whRes?.data || (Array.isArray(whRes) ? whRes : []));
          setProducts(prodRes?.data?.data || prodRes?.data || (Array.isArray(prodRes) ? prodRes : []));
        }
      } catch (err) {
        console.error('Failed to load transfer reference data:', err);
      }
    }
    loadCommonRefs();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch Paginated Transfers
  const fetchTransfersList = useCallback(
    async (page = 1, status = selectedStatus, srcWh = selectedSourceWh, dstWh = selectedDestWh) => {
      setIsLoadingList(true);
      setListError(null);
      try {
        const params: {
          page: number;
          per_page: number;
          status?: StockTransferStatus;
          source_warehouse_id?: number | string;
          destination_warehouse_id?: number | string;
        } = {
          page,
          per_page: 15,
        };

        if (status) params.status = status as StockTransferStatus;
        if (srcWh) params.source_warehouse_id = srcWh;
        if (dstWh) params.destination_warehouse_id = dstWh;

        const response = await getTransfers(params);
        const paginatedData = response?.data;

        if (paginatedData && Array.isArray(paginatedData.data)) {
          setTransfers(paginatedData.data);
          setPagination({
            current_page: paginatedData.current_page || 1,
            last_page: paginatedData.last_page || 1,
            total: paginatedData.total || 0,
            per_page: paginatedData.per_page || 15,
            from: paginatedData.from || 0,
            to: paginatedData.to || 0,
          });
        } else if (Array.isArray(paginatedData)) {
          setTransfers(paginatedData);
          setPagination({
            current_page: 1,
            last_page: 1,
            total: paginatedData.length,
            per_page: paginatedData.length || 15,
            from: paginatedData.length ? 1 : 0,
            to: paginatedData.length,
          });
        } else if (Array.isArray(response)) {
          setTransfers(response);
          setPagination({
            current_page: 1,
            last_page: 1,
            total: response.length,
            per_page: response.length || 15,
            from: response.length ? 1 : 0,
            to: response.length,
          });
        } else {
          setTransfers([]);
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
        console.error('Failed to load transfers list:', err);
        const msg = (err as { message?: string })?.message || 'Failed to retrieve stock transfers';
        setListError(msg);
        setTransfers([]);
      } finally {
        setIsLoadingList(false);
      }
    },
    [selectedStatus, selectedSourceWh, selectedDestWh]
  );

  useEffect(() => {
    fetchTransfersList(1, selectedStatus, selectedSourceWh, selectedDestWh);
  }, [fetchTransfersList, selectedStatus, selectedSourceWh, selectedDestWh]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTransfersList(pagination.current_page, selectedStatus, selectedSourceWh, selectedDestWh);
    setIsRefreshing(false);
  };

  // 3. Load Transfer Details
  const handleOpenDetail = async (transferId: number) => {
    setIsDetailLoading(true);
    setDetailTransfer(null);
    try {
      const response = await getTransfer(transferId);
      const data = response?.data || response;
      setDetailTransfer(data);
    } catch (err) {
      console.error('Failed to load transfer detail:', err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // 4. Source Stock Lookup for Item Selection in Create Form
  useEffect(() => {
    let isMounted = true;
    async function checkSourceStock() {
      if (!createSourceWh || !selectedVarId) {
        setItemSourceStock(null);
        return;
      }
      setIsLoadingItemStock(true);
      try {
        const response = await getInventory({
          warehouse_id: createSourceWh,
          product_variant_id: selectedVarId,
        });
        const items: InventoryItem[] = response?.data?.data || response?.data || (Array.isArray(response) ? response : []);
        if (isMounted) {
          if (items.length > 0) {
            const avail = Number(items[0].available_quantity ?? items[0].quantity ?? 0);
            setItemSourceStock(avail);
          } else {
            setItemSourceStock(0);
          }
        }
      } catch (err) {
        console.error('Failed to check source stock:', err);
        if (isMounted) setItemSourceStock(null);
      } finally {
        if (isMounted) setIsLoadingItemStock(false);
      }
    }

    checkSourceStock();
    return () => {
      isMounted = false;
    };
  }, [createSourceWh, selectedVarId]);

  // Handle Product & Variant Selection in Create Form
  const handleProductSelect = (pId: string) => {
    setSelectedProdId(pId);
    const prod = products.find((p) => String(p.id) === String(pId));
    if (prod && prod.variants && prod.variants.length > 0) {
      setSelectedVarId(String(prod.variants[0].id));
    } else {
      setSelectedVarId('');
    }
    setItemQuantity('');
  };

  // Add Item to Transfer Items List
  const handleAddItemToTransfer = () => {
    setCreateFormError(null);
    if (!createSourceWh) {
      setCreateFormError(t('inventory.warehouseRequired', 'Please select a source warehouse.'));
      return;
    }
    if (!selectedVarId) {
      setCreateFormError(t('inventory.productRequired', 'Please select a product variant.'));
      return;
    }

    const qty = parseFloat(itemQuantity);
    if (isNaN(qty) || qty <= 0) {
      setCreateFormError(t('inventory.qtyPositive', 'Quantity must be greater than 0.'));
      return;
    }

    // Check if available stock exceeded
    if (itemSourceStock !== null && qty > itemSourceStock) {
      setCreateFormError(
        t('inventory.insufficientStock', 'Transfer quantity cannot exceed source stock ({avail}).', {
          avail: formatDecimalQty(itemSourceStock),
        })
      );
      return;
    }

    // Check duplicate
    const varNum = parseInt(selectedVarId, 10);
    if (transferItems.some((item) => item.product_variant_id === varNum)) {
      setCreateFormError('This variant is already added to the transfer item list.');
      return;
    }

    const prod = products.find((p) => String(p.id) === String(selectedProdId));
    const variant = prod?.variants?.find((v) => String(v.id) === String(selectedVarId));

    const newItem: TransferItemDraft = {
      product_variant_id: varNum,
      productName: prod?.name || `Product #${prod?.id}`,
      sku: variant?.sku || '-',
      variantName: variant?.variant_name,
      unitSymbol: prod?.unit?.short_code || prod?.unit?.name || 'pcs',
      quantity: itemQuantity,
      availableStock: itemSourceStock || 0,
    };

    setTransferItems((prev) => [...prev, newItem]);
    setItemQuantity('');
    setSelectedVarId('');
    setSelectedProdId('');
    setItemSourceStock(null);
  };

  // Remove Item from draft
  const handleRemoveDraftItem = (variantId: number) => {
    setTransferItems((prev) => prev.filter((i) => i.product_variant_id !== variantId));
  };

  // Create Transfer Submission
  const handleCreateTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateFormError(null);

    if (!createSourceWh) {
      setCreateFormError(t('inventory.warehouseRequired', 'Please select a source warehouse.'));
      return;
    }
    if (!createDestWh) {
      setCreateFormError('Please select a destination warehouse.');
      return;
    }
    if (createSourceWh === createDestWh) {
      setCreateFormError(t('inventory.sameWarehouseError', 'Source and destination warehouses must be different.'));
      return;
    }
    if (transferItems.length === 0) {
      setCreateFormError(t('inventory.noItemsAdded', 'Please add at least one item to transfer.'));
      return;
    }

    setIsSubmittingCreate(true);
    const companyId = getActiveTenantId();

    try {
      const itemsPayload: CreateTransferItemPayload[] = transferItems.map((item) => ({
        product_variant_id: item.product_variant_id,
        quantity: parseFloat(item.quantity),
      }));

      const res = await createTransfer({
        company_id: companyId,
        source_warehouse_id: parseInt(createSourceWh, 10),
        destination_warehouse_id: parseInt(createDestWh, 10),
        notes: createNotes.trim() || undefined,
        items: itemsPayload,
      });

      setSuccessToast(t('inventory.transferSuccess', 'Transfer created successfully.'));
      setIsCreateModalOpen(false);

      // Reset form
      setCreateSourceWh('');
      setCreateDestWh('');
      setCreateNotes('');
      setTransferItems([]);

      // Refresh list
      fetchTransfersList(1);
    } catch (err: unknown) {
      console.error('Failed to create transfer:', err);
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setCreateFormError(apiErr.response?.data?.message || apiErr.message || 'Failed to create transfer.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // 5. Workflow Action Execution
  const handleExecuteWorkflowAction = async () => {
    if (!actionConfirm) return;
    const { transfer, action, receiveQuantities } = actionConfirm;

    setIsProcessingAction(true);
    setActionError(null);

    try {
      if (action === 'submit') {
        await submitTransfer(transfer.id);
        setSuccessToast('Transfer submitted for manager approval.');
      } else if (action === 'approve') {
        await approveTransfer(transfer.id);
        setSuccessToast('Transfer approved. Ready for dispatch.');
      } else if (action === 'ship') {
        await shipTransfer(transfer.id);
        setSuccessToast('Transfer dispatched and shipped.');
      } else if (action === 'receive') {
        const items = (transfer.items || []).map((it) => {
          const customQty = receiveQuantities?.[it.id];
          const recQty = customQty !== undefined ? parseFloat(customQty) : Number(it.quantity);
          return {
            item_id: it.id,
            received_quantity: isNaN(recQty) ? 0 : recQty,
          };
        });

        await receiveTransfer(transfer.id, { items });
        setSuccessToast('Transfer items received successfully into destination warehouse.');
      } else if (action === 'cancel') {
        await cancelTransfer(transfer.id);
        setSuccessToast('Transfer cancelled.');
      }

      setActionConfirm(null);
      // Refresh detail and list
      handleOpenDetail(transfer.id);
      fetchTransfersList(pagination.current_page);
    } catch (err: unknown) {
      console.error('Workflow action failed:', err);
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setActionError(apiErr.response?.data?.message || apiErr.message || 'Action execution failed.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Helper for Status Badge styling
  const getTransferStatusBadgeProps = (status: StockTransferStatus) => {
    switch (status) {
      case 'draft':
        return { badgeStatus: 'DRAFT', label: t('inventory.status.draft', 'Draft') };
      case 'submitted':
        return { badgeStatus: 'PENDING', label: t('inventory.status.submitted', 'Submitted') };
      case 'approved':
        return { badgeStatus: 'ACTIVE', label: t('inventory.status.approved', 'Approved') };
      case 'shipped':
        return { badgeStatus: 'PARTIAL', label: t('inventory.status.shipped', 'Shipped') };
      case 'received':
        return { badgeStatus: 'COMPLETED', label: t('inventory.status.received', 'Received') };
      case 'cancelled':
        return { badgeStatus: 'CANCELLED', label: t('inventory.status.cancelled', 'Cancelled') };
      default:
        return { badgeStatus: 'DRAFT', label: String(status) };
    }
  };

  return (
    <div className="space-y-6" data-testid="stock-transfers-page">
      {/* 1. Page Header */}
      <PageHeader
        title={t('inventory.transfersTitle', 'Inter-Warehouse Transfers')}
        subtitle={t(
          'inventory.transfersSubtitle',
          'Track, dispatch, and receive stock transfers across warehouses'
        )}
        breadcrumbs={[
          { label: t('nav.dashboard', 'Dashboard'), to: '/dashboard' },
          { label: t('inventory.title', 'Inventory'), to: '/inventory' },
          { label: t('inventory.transfers', 'Stock Transfers') },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/inventory/adjustments"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition-colors"
            >
              <span>{t('inventory.adjustments', 'Stock Adjustments')}</span>
            </Link>

            <Link
              to="/inventory/movements"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition-colors"
            >
              <History className="w-4 h-4 text-slate-500" />
              <span>{t('inventory.viewMovements', 'View Movements')}</span>
            </Link>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoadingList}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
              title={t('inventory.refresh', 'Refresh')}
              data-testid="btn-refresh-transfers"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t('inventory.refresh', 'Refresh')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(true);
                setCreateFormError(null);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              data-testid="btn-open-create-transfer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('inventory.newTransfer', 'New Transfer')}</span>
            </button>
          </div>
        }
      />

      {/* Notifications */}
      {successToast && (
        <div
          className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between shadow-xs animate-in fade-in"
          data-testid="transfer-success-toast"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 flex-wrap">
          {/* Status Filter */}
          <div className="min-w-[150px]">
            <select
              aria-label={t('inventory.filterByStatus', 'Filter by Status')}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
              data-testid="select-transfer-status-filter"
            >
              <option value="">{t('inventory.allStatuses', 'All Statuses')}</option>
              <option value="draft">{t('inventory.status.draft', 'Draft')}</option>
              <option value="submitted">{t('inventory.status.submitted', 'Submitted')}</option>
              <option value="approved">{t('inventory.status.approved', 'Approved')}</option>
              <option value="shipped">{t('inventory.status.shipped', 'Shipped')}</option>
              <option value="received">{t('inventory.status.received', 'Received')}</option>
              <option value="cancelled">{t('inventory.status.cancelled', 'Cancelled')}</option>
            </select>
          </div>

          {/* Source Warehouse Filter */}
          <div className="min-w-[180px]">
            <select
              aria-label={t('inventory.sourceWarehouse', 'Source Warehouse')}
              value={selectedSourceWh}
              onChange={(e) => setSelectedSourceWh(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
              data-testid="select-source-warehouse-filter"
            >
              <option value="">{t('inventory.allWarehouses', 'All Source Warehouses')}</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Destination Warehouse Filter */}
          <div className="min-w-[180px]">
            <select
              aria-label={t('inventory.destinationWarehouse', 'Destination Warehouse')}
              value={selectedDestWh}
              onChange={(e) => setSelectedDestWh(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
              data-testid="select-dest-warehouse-filter"
            >
              <option value="">{t('inventory.allWarehouses', 'All Destination Warehouses')}</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
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

      {/* 3. Transfers Table */}
      <TableContainer
        id="transfers-table-container"
        headerContent={
          <div className="flex items-center justify-between w-full">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              {t('inventory.transfersTitle', 'Inter-Warehouse Transfers')}
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {pagination.total} {t('inventory.totalItems', 'Total Transfers')}
            </span>
          </div>
        }
        footerContent={
          pagination.last_page > 1 ? (
            <div className="flex items-center justify-between w-full" data-testid="transfers-pagination">
              <div className="text-xs text-slate-500 font-medium">
                {t('inventory.page', 'Page')} {pagination.current_page} {t('inventory.of', 'of')} {pagination.last_page}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fetchTransfersList(pagination.current_page - 1)}
                  disabled={pagination.current_page <= 1 || isLoadingList}
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                  data-testid="pagination-prev"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('inventory.prev', 'Previous')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => fetchTransfersList(pagination.current_page + 1)}
                  disabled={pagination.current_page >= pagination.last_page || isLoadingList}
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
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
        {listError ? (
          <div className="p-8 text-center" data-testid="transfers-error-state">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">{listError}</h3>
            <button
              type="button"
              onClick={() => fetchTransfersList(pagination.current_page)}
              className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
            >
              {t('inventory.refresh', 'Try Again')}
            </button>
          </div>
        ) : isLoadingList ? (
          <div className="p-8">
            <LoadingState type="skeleton" rows={5} />
          </div>
        ) : transfers.length === 0 ? (
          <EmptyState
            icon={Send}
            title={t('inventory.noTransfers', 'No stock transfers found.')}
            description={t(
              'inventory.noTransfersDesc',
              'Create a new transfer request to move inventory between authorized warehouses.'
            )}
            action={
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
              >
                + {t('inventory.newTransfer', 'Create Transfer')}
              </button>
            }
          />
        ) : (
          <table className="w-full text-left text-xs sm:text-sm border-collapse" data-testid="transfers-table">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">{t('inventory.transferNumber', 'Transfer No.')}</th>
                <th className="py-3 px-4">{t('inventory.date', 'Date & Time')}</th>
                <th className="py-3 px-4">{t('inventory.sourceWarehouse', 'Source Warehouse')}</th>
                <th className="py-3 px-4">{t('inventory.destinationWarehouse', 'Destination Warehouse')}</th>
                <th className="py-3 px-4 text-center">{t('inventory.status', 'Status')}</th>
                <th className="py-3 px-4 text-right">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfers.map((tr) => {
                const statusProps = getTransferStatusBadgeProps(tr.status);
                return (
                  <tr key={tr.id} className="hover:bg-slate-50/80 transition-colors" data-testid={`transfer-row-${tr.id}`}>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      {tr.transfer_number}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                      {formatDateTime(tr.created_at)}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {tr.source_warehouse?.name || `Warehouse #${tr.source_warehouse_id}`}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {tr.destination_warehouse?.name || `Warehouse #${tr.destination_warehouse_id}`}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={statusProps.badgeStatus} customLabel={statusProps.label} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(tr.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                        data-testid={`btn-view-transfer-${tr.id}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{t('inventory.viewDetails', 'View Details')}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </TableContainer>

      {/* 4. Create Transfer Modal */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in"
          data-testid="create-transfer-modal"
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-600" />
                {t('inventory.createTransfer', 'Create Inter-Warehouse Transfer')}
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransferSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
              {createFormError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createFormError}</span>
                </div>
              )}

              {/* Warehouses Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    {t('inventory.sourceWarehouse', 'Source Warehouse')} *
                  </label>
                  <select
                    value={createSourceWh}
                    onChange={(e) => {
                      setCreateSourceWh(e.target.value);
                      setTransferItems([]); // Reset items if source changes
                    }}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    data-testid="select-create-source-wh"
                  >
                    <option value="">-- {t('inventory.selectWarehouse', 'Select Source Warehouse')} --</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    {t('inventory.destinationWarehouse', 'Destination Warehouse')} *
                  </label>
                  <select
                    value={createDestWh}
                    onChange={(e) => setCreateDestWh(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    data-testid="select-create-dest-wh"
                  >
                    <option value="">-- {t('inventory.selectWarehouse', 'Select Destination Warehouse')} --</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Item Add Row */}
              <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {t('inventory.addItem', 'Add Transfer Item')}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Product */}
                  <div>
                    <select
                      value={selectedProdId}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      data-testid="select-item-product"
                    >
                      <option value="">-- {t('products.product', 'Product')} --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Variant */}
                  <div>
                    <select
                      value={selectedVarId}
                      onChange={(e) => setSelectedVarId(e.target.value)}
                      disabled={!selectedProdId}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg disabled:opacity-50"
                      data-testid="select-item-variant"
                    >
                      <option value="">-- {t('products.variants', 'Variant / SKU')} --</option>
                      {products
                        .find((p) => String(p.id) === String(selectedProdId))
                        ?.variants?.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.sku} {v.variant_name ? `(${v.variant_name})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Quantity & Add */}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      min="0.0001"
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(e.target.value)}
                      placeholder="Qty"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono font-bold"
                      data-testid="input-item-qty"
                    />
                    <button
                      type="button"
                      onClick={handleAddItemToTransfer}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shrink-0 cursor-pointer"
                      data-testid="btn-add-item-to-list"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* Source Stock Display */}
                {selectedVarId && (
                  <div className="text-[11px] text-slate-600 font-medium">
                    {t('inventory.sourceStock', 'Source Available Stock')}:{' '}
                    <span className="font-mono font-bold text-slate-900" data-testid="source-stock-display">
                      {isLoadingItemStock ? '...' : itemSourceStock !== null ? formatDecimalQty(itemSourceStock) : '-'}
                    </span>
                  </div>
                )}
              </div>

              {/* Items List Table */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  {t('inventory.items', 'Transfer Items')} ({transferItems.length})
                </div>

                {transferItems.length === 0 ? (
                  <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                    {t('inventory.noItemsAdded', 'No items added to transfer request yet.')}
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">{t('products.product', 'Product')}</th>
                          <th className="py-2 px-3">SKU</th>
                          <th className="py-2 px-3 text-right">{t('inventory.quantity', 'Transfer Qty')}</th>
                          <th className="py-2 px-3 text-center">{t('common.actions', 'Action')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {transferItems.map((item) => (
                          <tr key={item.product_variant_id}>
                            <td className="py-2 px-3 font-semibold text-slate-800">{item.productName}</td>
                            <td className="py-2 px-3 font-mono text-slate-600">{item.sku}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-indigo-700">
                              {formatDecimalQty(item.quantity)} {item.unitSymbol}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveDraftItem(item.product_variant_id)}
                                className="text-rose-600 hover:text-rose-800 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {t('inventory.notes', 'Notes / Remarks')}
                </label>
                <textarea
                  rows={2}
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  placeholder="Transfer requisition notes..."
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl"
                  data-testid="textarea-transfer-notes"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate || transferItems.length === 0}
                  className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  data-testid="btn-create-transfer-submit"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmittingCreate ? t('inventory.submitting', 'Creating...') : t('inventory.createTransfer', 'Create Transfer')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Transfer Detail Modal */}
      {detailTransfer && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in"
          data-testid="transfer-detail-modal"
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <Send className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {detailTransfer.transfer_number}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {formatDateTime(detailTransfer.created_at)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const s = getTransferStatusBadgeProps(detailTransfer.status);
                  return <StatusBadge status={s.badgeStatus} customLabel={s.label} />;
                })()}
                <button
                  type="button"
                  onClick={() => setDetailTransfer(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
              {actionError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Warehouse Route Card */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs font-medium">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    {t('inventory.sourceWarehouse', 'Source')}
                  </span>
                  <span className="font-semibold text-slate-800 text-sm">
                    {detailTransfer.source_warehouse?.name || `WH #${detailTransfer.source_warehouse_id}`}
                  </span>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400" />
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    {t('inventory.destinationWarehouse', 'Destination')}
                  </span>
                  <span className="font-semibold text-slate-800 text-sm">
                    {detailTransfer.destination_warehouse?.name || `WH #${detailTransfer.destination_warehouse_id}`}
                  </span>
                </div>
              </div>

              {detailTransfer.notes && (
                <div className="text-xs text-slate-600 italic bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                  {detailTransfer.notes}
                </div>
              )}

              {/* Items Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  {t('inventory.items', 'Transfer Items')} ({detailTransfer.items?.length || 0})
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">{t('products.product', 'Product')}</th>
                        <th className="py-2.5 px-3">SKU</th>
                        <th className="py-2.5 px-3 text-right">{t('inventory.transferQty', 'Qty Sent')}</th>
                        <th className="py-2.5 px-3 text-right">{t('inventory.receivedQty', 'Qty Received')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailTransfer.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {item.product?.name || `Product #${item.product_id}`}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">
                            {item.product_variant?.sku || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatDecimalQty(item.quantity)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {formatDecimalQty(item.received_quantity || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Workflow Action Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDetailTransfer(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100"
              >
                {t('common.close', 'Close')}
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                {/* DRAFT: Submit or Cancel */}
                {detailTransfer.status === 'draft' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActionConfirm({ transfer: detailTransfer, action: 'cancel' })}
                      className="px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                      data-testid="btn-action-cancel"
                    >
                      {t('inventory.cancelAction', 'Cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionConfirm({ transfer: detailTransfer, action: 'submit' })}
                      className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                      data-testid="btn-action-submit"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{t('inventory.submitAction', 'Submit for Approval')}</span>
                    </button>
                  </>
                )}

                {/* SUBMITTED: Approve or Cancel */}
                {detailTransfer.status === 'submitted' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActionConfirm({ transfer: detailTransfer, action: 'cancel' })}
                      className="px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                      data-testid="btn-action-cancel"
                    >
                      {t('inventory.cancelAction', 'Cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionConfirm({ transfer: detailTransfer, action: 'approve' })}
                      className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                      data-testid="btn-action-approve"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{t('inventory.approveAction', 'Approve Transfer')}</span>
                    </button>
                  </>
                )}

                {/* APPROVED: Ship */}
                {detailTransfer.status === 'approved' && (
                  <button
                    type="button"
                    onClick={() => setActionConfirm({ transfer: detailTransfer, action: 'ship' })}
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    data-testid="btn-action-ship"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>{t('inventory.shipAction', 'Dispatch / Ship')}</span>
                  </button>
                )}

                {/* SHIPPED: Receive */}
                {detailTransfer.status === 'shipped' && (
                  <button
                    type="button"
                    onClick={() => setActionConfirm({ transfer: detailTransfer, action: 'receive' })}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    data-testid="btn-action-receive"
                  >
                    <Inbox className="w-3.5 h-3.5" />
                    <span>{t('inventory.receiveAction', 'Receive Goods')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Workflow Action Confirmation Modal */}
      {actionConfirm && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in"
          data-testid="action-confirm-dialog"
        >
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">
                {actionConfirm.action === 'submit'
                  ? t('inventory.confirmSubmitTransfer', 'Submit Transfer')
                  : actionConfirm.action === 'approve'
                  ? t('inventory.confirmApproveTransfer', 'Approve Transfer')
                  : actionConfirm.action === 'ship'
                  ? t('inventory.confirmShipTransfer', 'Ship Transfer')
                  : actionConfirm.action === 'receive'
                  ? t('inventory.confirmReceiveTransfer', 'Receive Transfer')
                  : t('inventory.confirmCancelTransfer', 'Cancel Transfer')}
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-600">
              {actionConfirm.action === 'submit'
                ? t('inventory.confirmSubmitTransferDesc', 'Submit this transfer draft for manager approval?')
                : actionConfirm.action === 'approve'
                ? t('inventory.confirmApproveTransferDesc', 'Approve this transfer for shipment?')
                : actionConfirm.action === 'ship'
                ? t('inventory.confirmShipTransferDesc', 'Ship items and deduct stock from source warehouse?')
                : actionConfirm.action === 'receive'
                ? t('inventory.confirmReceiveTransferDesc', 'Receive items into the destination warehouse?')
                : t('inventory.confirmCancelTransferDesc', 'Cancel this transfer? This action may not be reversible.')}
            </p>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Transfer No:</span>
                <span className="font-mono font-bold text-slate-900">{actionConfirm.transfer.transfer_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Source:</span>
                <span className="font-semibold text-slate-800">{actionConfirm.transfer.source_warehouse?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Destination:</span>
                <span className="font-semibold text-slate-800">{actionConfirm.transfer.destination_warehouse?.name}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setActionConfirm(null)}
                disabled={isProcessingAction}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleExecuteWorkflowAction}
                disabled={isProcessingAction}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer ${
                  actionConfirm.action === 'cancel'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
                data-testid="btn-confirm-action-execute"
              >
                {isProcessingAction ? t('inventory.submitting', 'Processing...') : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default StockTransfers;
