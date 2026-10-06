import api from './axios';
import {
  InventoryItem,
  InventoryFilterParams,
  StockMovement,
  StockMovementFilterParams,
  OpeningStockPayload,
  StockAdjustmentPayload,
  AdjustmentInPayload,
  AdjustmentOutPayload,
  DamageLossPayload,
  DirectTransferPayload,
  StockTransfer,
  StockTransferFilterParams,
  CreateTransferPayload,
  ReceiveTransferPayload,
  Warehouse,
  StorageLocation,
  StorageLocationFilterParams,
  CreateStorageLocationPayload,
  UpdateStorageLocationPayload,
  StockBatch,
  StockBatchFilterParams,
  CreateStockBatchPayload,
} from '../types/inventory';

export * from '../types/inventory';

// ============================================================================
// 1. INVENTORY LEVELS & LOOKUP
// ============================================================================

/**
 * Fetch paginated inventory list scoped to the user's authorized company.
 * Supports filtering by warehouse_id, product_id, product_variant_id, and search.
 */
export async function getInventory(params?: InventoryFilterParams) {
  const response = await api.get('/inventory', { params });
  return response.data;
}

/**
 * Fetch products with available quantity at or below their reorder level.
 */
export async function getLowStock() {
  const response = await api.get('/inventory/low-stock');
  return response.data;
}

// ============================================================================
// 2. STOCK MOVEMENTS & ADJUSTMENTS
// ============================================================================

/**
 * Fetch paginated stock movements audit log.
 * Supports filtering by warehouse_id, product_variant_id, and movement_type.
 */
export async function getStockMovements(params?: StockMovementFilterParams) {
  const response = await api.get('/inventory/movements', { params });
  return response.data;
}

/**
 * Record initial opening stock for a product variant in a warehouse.
 * Throws 409 Conflict if opening stock has already been recorded.
 */
export async function recordOpeningStock(payload: OpeningStockPayload) {
  const response = await api.post('/inventory/opening-stock', payload);
  return response.data;
}

/**
 * Perform general stock adjustment (add or subtract).
 */
export async function adjustStock(payload: StockAdjustmentPayload) {
  const response = await api.post('/inventory/adjustments', payload);
  return response.data;
}

/**
 * Perform explicit Adjustment In (reconciliation, found stock, etc.).
 */
export async function adjustmentIn(payload: AdjustmentInPayload) {
  const response = await api.post('/inventory/adjustments/in', payload);
  return response.data;
}

/**
 * Perform explicit Adjustment Out (inventory shrinkage, reconciliation, etc.).
 */
export async function adjustmentOut(payload: AdjustmentOutPayload) {
  const response = await api.post('/inventory/adjustments/out', payload);
  return response.data;
}

/**
 * Record damage or loss stock deduction.
 */
export async function recordDamageLoss(payload: DamageLossPayload) {
  const response = await api.post('/inventory/damage-loss', payload);
  return response.data;
}

/**
 * Execute immediate direct stock transfer between two warehouses.
 */
export async function directTransfer(payload: DirectTransferPayload) {
  const response = await api.post('/inventory/transfers/direct', payload);
  return response.data;
}

// ============================================================================
// 3. MULTI-STEP STOCK TRANSFERS
// ============================================================================

/**
 * Fetch paginated stock transfer requests.
 * Supports filtering by status, source_warehouse_id, and destination_warehouse_id.
 */
export async function getTransfers(params?: StockTransferFilterParams) {
  const response = await api.get('/inventory/transfers', { params });
  return response.data;
}

/**
 * Fetch single stock transfer with items and details.
 */
export async function getTransfer(id: number | string) {
  const response = await api.get(`/inventory/transfers/${id}`);
  return response.data;
}

/**
 * Create a new stock transfer draft.
 */
export async function createTransfer(payload: CreateTransferPayload) {
  const response = await api.post('/inventory/transfers', payload);
  return response.data;
}

/**
 * Submit a stock transfer draft for approval.
 */
export async function submitTransfer(id: number | string) {
  const response = await api.post(`/inventory/transfers/${id}/submit`);
  return response.data;
}

/**
 * Approve a submitted stock transfer.
 */
export async function approveTransfer(id: number | string) {
  const response = await api.post(`/inventory/transfers/${id}/approve`);
  return response.data;
}

/**
 * Ship an approved stock transfer (deducts stock from source warehouse).
 */
export async function shipTransfer(id: number | string) {
  const response = await api.post(`/inventory/transfers/${id}/ship`);
  return response.data;
}

/**
 * Receive a shipped stock transfer (adds stock to destination warehouse).
 */
export async function receiveTransfer(id: number | string, payload: ReceiveTransferPayload) {
  const response = await api.post(`/inventory/transfers/${id}/receive`, payload);
  return response.data;
}

/**
 * Cancel a stock transfer.
 */
export async function cancelTransfer(id: number | string) {
  const response = await api.post(`/inventory/transfers/${id}/cancel`);
  return response.data;
}

// ============================================================================
// 4. WAREHOUSES
// ============================================================================

/**
 * Fetch all warehouses for the authorized company.
 */
export async function getWarehouses() {
  const response = await api.get('/warehouses');
  return response.data;
}

/**
 * Fetch details of a single warehouse.
 */
export async function getWarehouse(id: number | string) {
  const response = await api.get(`/warehouses/${id}`);
  return response.data;
}

// ============================================================================
// 5. STORAGE LOCATIONS (BINS / AISLES)
// ============================================================================

/**
 * Fetch storage locations for the authorized company.
 * Supports filtering by warehouse_id and is_active status.
 */
export async function getStorageLocations(params?: StorageLocationFilterParams) {
  const response = await api.get('/storage-locations', { params });
  return response.data;
}

/**
 * Fetch details of a single storage location.
 */
export async function getStorageLocation(id: number | string) {
  const response = await api.get(`/storage-locations/${id}`);
  return response.data;
}

/**
 * Create a new storage location within a warehouse.
 */
export async function createStorageLocation(payload: CreateStorageLocationPayload) {
  const response = await api.post('/storage-locations', payload);
  return response.data;
}

/**
 * Update an existing storage location.
 */
export async function updateStorageLocation(id: number | string, payload: UpdateStorageLocationPayload) {
  const response = await api.put(`/storage-locations/${id}`, payload);
  return response.data;
}

/**
 * Delete a storage location.
 */
export async function deleteStorageLocation(id: number | string) {
  const response = await api.delete(`/storage-locations/${id}`);
  return response.data;
}

// ============================================================================
// 6. STOCK BATCHES
// ============================================================================

/**
 * Fetch stock batches for the authorized company.
 * Supports filtering by product_id, variant_id, and status.
 */
export async function getStockBatches(params?: StockBatchFilterParams) {
  const response = await api.get('/stock-batches', { params });
  return response.data;
}

/**
 * Create a new stock batch.
 */
export async function createStockBatch(payload: CreateStockBatchPayload) {
  const response = await api.post('/stock-batches', payload);
  return response.data;
}

/**
 * Fetch a single stock batch with inventory batches and warehouse stocks.
 */
export async function getStockBatch(id: number | string) {
  const response = await api.get(`/stock-batches/${id}`);
  return response.data;
}

/**
 * Update stock batch details.
 */
export async function updateStockBatch(id: number | string, payload: Partial<CreateStockBatchPayload> & { reason?: string }) {
  const response = await api.put(`/stock-batches/${id}`, payload);
  return response.data;
}

/**
 * Toggle stock batch active/blocked status with audit log.
 */
export async function toggleStockBatchStatus(id: number | string, status?: 'ACTIVE' | 'BLOCKED', reason?: string) {
  const response = await api.post(`/stock-batches/${id}/toggle-status`, { status, reason });
  return response.data;
}

/**
 * Get batch expiry report with threshold days.
 */
export async function getStockBatchExpiryReport(params?: { days?: number }) {
  const response = await api.get('/stock-batches/expiry-report', { params });
  return response.data;
}

// ============================================================================
// 7. STOCK COUNTS / PHYSICAL INVENTORY (PHASE 6)
// ============================================================================

/**
 * Fetch paginated stock count sessions.
 */
export async function getStockCounts(params?: import('../types/inventory').StockCountFilterParams) {
  const response = await api.get('/inventory/stock-counts', { params });
  return response.data;
}

/**
 * Fetch a single stock count with items, variances, and creator/approver info.
 */
export async function getStockCount(id: number | string) {
  const response = await api.get(`/inventory/stock-counts/${id}`);
  return response.data;
}

/**
 * Create a new physical stock count session (supports auto-population of full inventory).
 */
export async function createStockCount(payload: import('../types/inventory').CreateStockCountPayload) {
  const response = await api.post('/inventory/stock-counts', payload);
  return response.data;
}

/**
 * Start counting on a draft stock count (transitions status to COUNTING).
 */
export async function startStockCount(id: number | string) {
  const response = await api.post(`/inventory/stock-counts/${id}/start`);
  return response.data;
}

/**
 * Record or update counted quantities on count items.
 */
export async function updateStockCountItems(id: number | string, payload: import('../types/inventory').UpdateCountItemsPayload) {
  const response = await api.post(`/inventory/stock-counts/${id}/items`, payload);
  return response.data;
}

/**
 * Submit counted inventory for manager review.
 */
export async function submitStockCount(id: number | string) {
  const response = await api.post(`/inventory/stock-counts/${id}/submit`);
  return response.data;
}

/**
 * Mark stock count as reviewed.
 */
export async function reviewStockCount(id: number | string) {
  const response = await api.post(`/inventory/stock-counts/${id}/review`);
  return response.data;
}

/**
 * Authorize/approve variance adjustments.
 */
export async function approveStockCount(id: number | string) {
  const response = await api.post(`/inventory/stock-counts/${id}/approve`);
  return response.data;
}

/**
 * Atomically post approved variances to stock movements and update ledger.
 */
export async function postStockCount(id: number | string) {
  const response = await api.post(`/inventory/stock-counts/${id}/post`);
  return response.data;
}

/**
 * Cancel a stock count session.
 */
export async function cancelStockCount(id: number | string) {
  const response = await api.post(`/inventory/stock-counts/${id}/cancel`);
  return response.data;
}

// ============================================================================
// 8. REPORTS, ALERTS & BARCODE LOOKUP (PHASE 6)
// ============================================================================

/**
 * Fetch inventory valuation report with summary KPIs and item breakdowns.
 */
export async function getInventoryValuation(params?: {
  warehouse_id?: number | string;
  category_id?: number | string;
  brand_id?: number | string;
  search?: string;
}) {
  const response = await api.get('/reports/inventory/valuation', { params });
  return response.data;
}

/**
 * Fetch inventory ledger vs physical balance reconciliation report.
 */
export async function getInventoryReconciliation(params?: { warehouse_id?: number | string }) {
  const response = await api.get('/reports/inventory/reconciliation', { params });
  return response.data;
}

/**
 * Run active reconciliation audit check.
 */
export async function runInventoryReconciliation(warehouse_id?: number | string) {
  const response = await api.post('/reports/inventory/reconciliation', { warehouse_id });
  return response.data;
}

/**
 * Fetch products with low stock below reorder level.
 */
export async function getReorderAlerts(params?: { warehouse_id?: number | string }) {
  const response = await api.get('/inventory/reorder-alerts', { params });
  return response.data;
}

/**
 * Look up product details, multi-warehouse stock levels, and batches by barcode.
 */
export async function lookupBarcode(barcode: string) {
  const response = await api.get(`/inventory/barcode-lookup/${encodeURIComponent(barcode)}`);
  return response.data;
}

