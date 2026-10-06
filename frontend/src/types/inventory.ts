import { Product, ProductVariant } from './product';
import { Warehouse, StorageLocation } from './organization';

export type { Warehouse, StorageLocation, Product, ProductVariant };

export interface InventoryItem {
  id: number;
  uuid?: string;
  company_id: number;
  warehouse_id: number;
  product_id: number;
  product_variant_id: number;
  quantity: string | number;
  reserved_quantity: string | number;
  available_quantity: string | number;
  average_cost: string | number;
  total_value: string | number;
  warehouse?: Warehouse;
  product?: Product;
  product_variant?: ProductVariant;
  created_at?: string;
  updated_at?: string;
}

export interface InventorySummary {
  total_items: number;
  total_quantity: number;
  total_value: number;
  low_stock_count: number;
}

export interface InventoryFilterParams {
  warehouse_id?: number | string;
  product_id?: number | string;
  product_variant_id?: number | string;
  search?: string;
  per_page?: number;
  page?: number;
}

export type StockMovementType =
  | 'OPENING_STOCK'
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'DAMAGE'
  | 'LOSS'
  | string;

export interface StockMovement {
  id: number;
  uuid?: string;
  company_id: number;
  business_unit_id?: number | null;
  branch_id?: number | null;
  warehouse_id: number;
  product_id: number;
  product_variant_id: number;
  movement_type: StockMovementType;
  quantity: string | number;
  unit_cost: string | number;
  total_cost: string | number;
  quantity_before: string | number;
  quantity_after: string | number;
  reference_type?: string | null;
  reference_id?: number | null;
  reference_number?: string | null;
  reason?: string | null;
  notes?: string | null;
  created_by?: number | null;
  stock_batch_id?: number | null;
  storage_location_id?: number | null;
  warehouse?: Warehouse;
  product?: Product;
  product_variant?: ProductVariant;
  creator?: {
    id: number;
    name: string;
    email?: string;
  };
  storage_location?: StorageLocation;
  stock_batch?: StockBatch;
  created_at?: string;
  updated_at?: string;
}

export interface StockMovementFilterParams {
  warehouse_id?: number | string;
  product_variant_id?: number | string;
  movement_type?: string;
  per_page?: number;
  page?: number;
}

export interface OpeningStockPayload {
  company_id: number;
  warehouse_id: number;
  product_variant_id: number;
  quantity: number;
  unit_cost?: number;
  notes?: string;
  storage_location_id?: number | null;
  stock_batch_id?: number | null;
}

export interface StockAdjustmentPayload {
  company_id: number;
  warehouse_id: number;
  product_variant_id: number;
  type: 'add' | 'subtract';
  quantity: number;
  reason: string;
  notes?: string;
  storage_location_id?: number | null;
  stock_batch_id?: number | null;
}

export interface AdjustmentInPayload {
  company_id: number;
  warehouse_id: number;
  product_variant_id: number;
  quantity: number;
  unit_cost: number;
  reference_type: string;
  reference_id: number;
  reference_number: string;
  reason: string;
  notes?: string;
  storage_location_id?: number | null;
  stock_batch_id?: number | null;
  batch_number?: string | null;
}

export interface AdjustmentOutPayload {
  company_id: number;
  warehouse_id: number;
  product_variant_id: number;
  quantity: number;
  reference_type: string;
  reference_id: number;
  reference_number: string;
  reason: string;
  notes?: string;
  storage_location_id?: number | null;
  stock_batch_id?: number | null;
}

export interface DamageLossPayload {
  company_id: number;
  warehouse_id: number;
  product_variant_id: number;
  type: 'damage' | 'loss';
  quantity: number;
  reason: string;
  notes?: string;
  storage_location_id?: number | null;
  stock_batch_id?: number | null;
}

export interface DirectTransferPayload {
  company_id: number;
  source_warehouse_id: number;
  destination_warehouse_id: number;
  product_variant_id: number;
  quantity: number;
  reference_type: string;
  reference_id: number;
  reference_number: string;
  source_storage_location_id?: number | null;
  destination_storage_location_id?: number | null;
  stock_batch_id?: number | null;
  reason?: string | null;
  notes?: string | null;
}

export type StockTransferStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'shipped'
  | 'received'
  | 'cancelled';

export interface StockTransferItem {
  id: number;
  stock_transfer_id: number;
  product_id: number;
  product_variant_id: number;
  quantity: string | number;
  received_quantity: string | number;
  unit_cost: string | number;
  notes?: string | null;
  product?: Product;
  product_variant?: ProductVariant;
  created_at?: string;
  updated_at?: string;
}

export interface StockTransfer {
  id: number;
  uuid?: string;
  transfer_number: string;
  company_id: number;
  source_warehouse_id: number;
  destination_warehouse_id: number;
  status: StockTransferStatus;
  notes?: string | null;
  source_warehouse?: Warehouse;
  destination_warehouse?: Warehouse;
  items?: StockTransferItem[];
  approved_at?: string | null;
  shipped_at?: string | null;
  received_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateTransferItemPayload {
  product_variant_id: number;
  quantity: number;
  notes?: string;
}

export interface CreateTransferPayload {
  company_id: number;
  source_warehouse_id: number;
  destination_warehouse_id: number;
  notes?: string;
  items: CreateTransferItemPayload[];
}

export interface ReceiveTransferItemPayload {
  item_id: number;
  received_quantity: number;
}

export interface ReceiveTransferPayload {
  items: ReceiveTransferItemPayload[];
}

export interface StockTransferFilterParams {
  status?: StockTransferStatus;
  source_warehouse_id?: number | string;
  destination_warehouse_id?: number | string;
  per_page?: number;
  page?: number;
}

export interface StockBatch {
  id: number;
  company_id: number;
  product_id: number;
  variant_id: number;
  supplier_id?: number | null;
  batch_no: string;
  mfg_date?: string | null;
  exp_date?: string | null;
  unit_cost: string | number;
  status: string;
  product?: Product;
  variant?: ProductVariant;
  supplier?: {
    id: number;
    name: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface StockBatchFilterParams {
  product_id?: number | string;
  variant_id?: number | string;
  status?: string;
}

export interface CreateStockBatchPayload {
  product_id: number;
  variant_id: number;
  supplier_id?: number;
  batch_no: string;
  mfg_date?: string;
  exp_date?: string;
  unit_cost?: number;
  status?: string;
}

export interface StorageLocationFilterParams {
  warehouse_id?: number | string;
  is_active?: boolean;
}

export interface CreateStorageLocationPayload {
  warehouse_id: number;
  code: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
}

export interface UpdateStorageLocationPayload {
  warehouse_id?: number;
  code?: string;
  name?: string;
  description?: string | null;
  is_active?: boolean;
}

// ============================================================================
// 7. STOCK COUNTS / PHYSICAL INVENTORY (PHASE 6)
// ============================================================================

export type StockCountStatus =
  | 'DRAFT'
  | 'COUNTING'
  | 'SUBMITTED'
  | 'REVIEWED'
  | 'APPROVED'
  | 'POSTED'
  | 'CANCELLED';

export type StockCountType = 'FULL' | 'PARTIAL' | 'CYCLE_COUNT';

export interface StockCountItem {
  id: number;
  stock_count_id: number;
  product_id: number;
  product_variant_id: number;
  storage_location_id?: number | null;
  stock_batch_id?: number | null;
  system_quantity: string | number;
  counted_quantity: string | number | null;
  variance_quantity: string | number;
  unit_cost: string | number;
  total_variance_cost: string | number;
  variance_reason?: string | null;
  notes?: string | null;
  counted_at?: string | null;
  product?: Product;
  product_variant?: ProductVariant;
  storage_location?: StorageLocation;
  stock_batch?: StockBatch;
  created_at?: string;
  updated_at?: string;
}

export interface StockCount {
  id: number;
  uuid?: string;
  company_id: number;
  warehouse_id: number;
  storage_location_id?: number | null;
  count_number: string;
  count_type: StockCountType;
  status: StockCountStatus;
  description?: string | null;
  count_date?: string | null;
  notes?: string | null;
  counted_by?: number | null;
  submitted_by?: number | null;
  reviewed_by?: number | null;
  approved_by?: number | null;
  posted_by?: number | null;
  counted_at?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  approved_at?: string | null;
  posted_at?: string | null;
  warehouse?: Warehouse;
  storage_location?: StorageLocation;
  counted_by_user?: { id: number; name: string };
  submitted_by_user?: { id: number; name: string };
  reviewed_by_user?: { id: number; name: string };
  approved_by_user?: { id: number; name: string };
  posted_by_user?: { id: number; name: string };
  items?: StockCountItem[];
  items_count?: number;
  total_variance_cost?: string | number;
  created_at?: string;
  updated_at?: string;
}

export interface StockCountFilterParams {
  warehouse_id?: number | string;
  status?: StockCountStatus;
  count_type?: StockCountType;
  date_from?: string;
  date_to?: string;
  per_page?: number;
  page?: number;
}

export interface CreateStockCountPayload {
  warehouse_id: number;
  storage_location_id?: number | null;
  count_type?: StockCountType;
  description?: string;
  count_date?: string;
  notes?: string;
  auto_populate?: boolean;
  items?: Array<{
    product_variant_id: number;
    storage_location_id?: number | null;
    stock_batch_id?: number | null;
    counted_quantity?: number;
    variance_reason?: string;
    notes?: string;
  }>;
}

export interface UpdateCountItemsPayload {
  items: Array<{
    id: number;
    counted_quantity: number;
    variance_reason?: string;
    notes?: string;
  }>;
}

// ============================================================================
// 8. BATCH EXPIRY & INVENTORY VALUATION / RECONCILIATION
// ============================================================================

export interface StockBatchExpiryReportResponse {
  expired: StockBatch[];
  near_expiry: StockBatch[];
  summary: {
    expired_count: number;
    near_expiry_count: number;
    threshold_days: number;
  };
}

export interface InventoryValuationItem {
  inventory_id: number;
  product_id: number;
  product_name: string;
  variant_id: number;
  sku: string;
  variant_name: string;
  warehouse_id: number;
  warehouse_name: string;
  category_name: string | null;
  quantity: number;
  available_quantity: number;
  unit_cost: number;
  cost_valuation: number;
  selling_price: number;
  retail_valuation: number;
  potential_profit: number;
  margin_percentage: number;
}

export interface InventoryValuationSummary {
  total_products: number;
  total_units: number;
  total_cost_valuation: number;
  total_retail_valuation: number;
  potential_profit: number;
  margin_percentage: number;
}

export interface InventoryValuationResponse {
  items: InventoryValuationItem[];
  summary: InventoryValuationSummary;
}

export interface InventoryReconciliationDiscrepancy {
  inventory_id: number;
  product_name: string;
  sku: string;
  warehouse: string;
  current_inventory_quantity: number;
  calculated_ledger_balance: number;
  variance: number;
}

export interface InventoryReconciliationResponse {
  status: 'HEALTHY' | 'DISCREPANCY_DETECTED';
  checked_at: string;
  total_inventories_checked: number;
  discrepancies_count: number;
  negative_stock_count: number;
  orphan_batches_count: number;
  discrepancies: InventoryReconciliationDiscrepancy[];
  negative_inventories: Array<{
    inventory_id: number;
    product_name: string;
    sku: string;
    warehouse: string;
    quantity: number;
  }>;
  orphan_batches: Array<{
    batch_id: number;
    batch_no: string;
    warehouse: string;
    quantity: number;
  }>;
}

export interface ReorderAlertItem {
  inventory_id: number;
  warehouse_id: number;
  warehouse_name: string;
  product_id: number;
  product_name: string;
  product_code: string;
  category_name: string | null;
  variant_id: number;
  sku: string;
  variant_name: string;
  current_quantity: number;
  reorder_level: number;
  reorder_quantity: number;
  shortage: number;
  unit_cost: number;
  estimated_reorder_cost: number;
}

export interface BarcodeLookupResult {
  product: {
    id: number;
    name: string;
    category: string | null;
    brand: string | null;
    unit: string | null;
  };
  variant: {
    id: number;
    sku: string;
    name: string;
    barcode: string;
    cost_price: number;
    selling_price: number;
    mrp: number;
  };
  warehouses_stock: Array<{
    warehouse_id: number;
    warehouse_name: string;
    quantity: number;
    available_quantity: number;
    reserved_quantity: number;
    average_cost: number;
  }>;
  total_on_hand: number;
  total_available: number;
  batches: Array<{
    batch_id: number;
    batch_no: string;
    warehouse_id: number;
    warehouse_name: string;
    storage_location: string | null;
    quantity: number;
    exp_date: string | null;
    expiry_status: string;
  }>;
}

