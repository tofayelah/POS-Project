export interface Warehouse {
  id: number | string;
  code?: string;
  name: string;
  business_unit_id?: number | string;
  branch_id?: number | string;
  business_unit?: { id?: number | string; name?: string };
  branch?: { id?: number | string; name?: string };
  warehouse_type?: string;
  location?: string;
  address?: string;
  status?: 'active' | 'inactive' | string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StorageLocation {
  id: number | string;
  warehouse_id: number | string;
  warehouse?: { id?: number | string; name?: string; code?: string };
  code: string;
  name: string;
  description?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryItem {
  id: number | string;
  product_id?: number | string;
  product_name?: string;
  product?: { id?: number | string; name?: string; sku?: string; unit?: any; reorder_level?: number; average_cost?: number };
  product_variant_id?: number | string;
  product_variant?: { id?: number | string; name?: string; variant_name?: string; sku?: string };
  sku?: string;
  warehouse_id?: number | string;
  warehouse?: { id?: number | string; name?: string; code?: string };
  warehouse_name?: string;
  quantity: number;
  reserved_quantity?: number;
  available_quantity?: number;
  reorder_level?: number;
  unit_cost?: number;
  average_cost?: number;
  total_value?: number;
}

export interface InventoryFilterParams {
  warehouse_id?: string | number;
  product_variant_id?: string | number;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface StockMovement {
  id: number | string;
  product_id?: number | string;
  product_name?: string;
  product?: { id?: number | string; name?: string; sku?: string; unit?: any };
  product_variant?: { id?: number | string; name?: string; variant_name?: string; sku?: string };
  sku?: string;
  type?: string;
  movement_type?: string;
  quantity: number;
  quantity_before?: number;
  quantity_after?: number;
  unit_cost?: number;
  total_cost?: number;
  warehouse_id?: number | string;
  warehouse?: { id?: number | string; name?: string };
  reference?: string;
  reference_number?: string;
  reason?: string;
  notes?: string;
  created_at?: string;
  created_by?: string;
  creator?: { id?: number | string; name?: string };
}

export interface StockMovementFilterParams {
  warehouse_id?: string | number;
  type?: string;
  movement_type?: string;
  page?: number;
  per_page?: number;
}

export interface OpeningStockPayload {
  warehouse_id: string;
  items: Array<{ product_variant_id: string; quantity: number; unit_cost?: number }>;
}

export interface StockAdjustmentPayload {
  company_id?: number | string;
  warehouse_id: string | number;
  product_variant_id?: string | number;
  type?: string;
  quantity?: number;
  reason?: string;
  notes?: string;
  storage_location_id?: string | number | null;
  items?: Array<{ product_variant_id: string | number; quantity: number }>;
}

export interface AdjustmentInPayload {
  company_id?: number | string;
  warehouse_id: string | number;
  product_variant_id?: string | number;
  type?: string;
  quantity?: number;
  reason?: string;
  notes?: string;
  storage_location_id?: string | number | null;
  items?: Array<{ product_variant_id: string | number; quantity: number }>;
}

export interface AdjustmentOutPayload {
  company_id?: number | string;
  warehouse_id: string | number;
  product_variant_id?: string | number;
  type?: string;
  quantity?: number;
  reason?: string;
  notes?: string;
  storage_location_id?: string | number | null;
  items?: Array<{ product_variant_id: string | number; quantity: number }>;
}

export interface DamageLossPayload {
  company_id?: number | string;
  warehouse_id: string | number;
  product_variant_id?: string | number;
  type?: string;
  quantity?: number;
  reason?: string;
  notes?: string;
  storage_location_id?: string | number | null;
  items?: Array<{ product_variant_id: string | number; quantity: number }>;
}

export interface DirectTransferPayload {
  from_warehouse_id: string;
  to_warehouse_id: string;
  items: Array<{ product_variant_id: string; quantity: number }>;
}

export interface StockTransferItem {
  id?: number | string;
  product_id?: number | string;
  product_variant_id: number | string;
  product_name?: string;
  variant_name?: string;
  product?: { id?: number | string; name?: string };
  product_variant?: { id?: number | string; name?: string; variant_name?: string; sku?: string };
  sku?: string;
  quantity: number;
  received_quantity?: number;
}

export interface StockTransfer {
  id: number | string;
  transfer_number?: string;
  source_warehouse_id?: number | string;
  source_warehouse?: { id?: number | string; name?: string };
  from_warehouse_name?: string;
  destination_warehouse_id?: number | string;
  destination_warehouse?: { id?: number | string; name?: string };
  to_warehouse_name?: string;
  status?: string;
  notes?: string;
  items?: StockTransferItem[];
  created_at?: string;
}

export interface StockTransferFilterParams {
  status?: string;
  page?: number;
  per_page?: number;
}

export interface CreateTransferPayload {
  company_id?: number | string;
  from_warehouse_id?: string | number;
  to_warehouse_id?: string | number;
  source_warehouse_id?: string | number;
  destination_warehouse_id?: string | number;
  notes?: string;
  items: Array<{ product_variant_id: string | number; quantity: number }>;
}

export interface ReceiveTransferPayload {
  transfer_id?: string | number;
  items?: Array<{ item_id?: string | number; product_variant_id?: string | number; quantity_received?: number; received_quantity?: number }>;
  received_items?: Array<{ product_variant_id?: string | number; quantity_received?: number }>;
}

export interface StorageLocationFilterParams {
  warehouse_id?: string;
}

export interface CreateStorageLocationPayload {
  warehouse_id: string;
  code: string;
  name: string;
  description?: string;
}

export interface UpdateStorageLocationPayload {
  code?: string;
  name?: string;
  description?: string;
}

export interface StockBatch {
  id: number | string;
  batch_number: string;
  batch_no?: string;
  product_variant_id?: string;
  product?: { id?: number | string; name?: string };
  variant?: { id?: number | string; name?: string; variant_name?: string; sku?: string };
  manufactured_date?: string;
  mfg_date?: string;
  expiry_date?: string;
  exp_date?: string;
  quantity: number;
  unit_cost?: number;
  status?: string;
}

export interface StockBatchFilterParams {
  product_variant_id?: string;
  search?: string;
}

export interface CreateStockBatchPayload {
  batch_number: string;
  product_variant_id: string;
  quantity: number;
  manufactured_date?: string;
  expiry_date?: string;
}

export type StockCountStatus = 'draft' | 'in_progress' | 'completed' | 'approved' | 'rejected' | string;
export type StockCountType = 'full' | 'cycle' | 'spot' | string;

export interface StockCountItem {
  id?: number | string;
  product_variant_id: number | string;
  product_name?: string;
  variant_name?: string;
  system_quantity: number;
  counted_quantity: number;
  variance_quantity?: number;
  variance_reason?: string;
  notes?: string;
  product?: { id?: number | string; name?: string; unit?: string };
  product_variant?: { id?: number | string; name?: string; variant_name?: string; sku?: string };
  storage_location?: { id?: number | string; name?: string; code?: string };
  stock_batch?: { id?: number | string; batch_number?: string; batch_no?: string };
}

export interface StockCount {
  id: number | string;
  count_number?: string;
  warehouse_id: number | string;
  warehouse?: { id?: number | string; name?: string; code?: string };
  warehouse_name?: string;
  status: StockCountStatus;
  type: StockCountType;
  count_type?: StockCountType;
  count_date?: string;
  description?: string;
  posted_at?: string;
  items?: StockCountItem[];
  notes?: string;
  created_at?: string;
}

export interface StockCountFilterParams {
  warehouse_id?: string | number;
  status?: string;
  type?: string;
  page?: number;
  per_page?: number;
}

export interface UpdateCountItemsPayload {
  items: Array<{
    id?: number | string;
    product_variant_id?: number | string;
    counted_quantity: number;
    variance_reason?: string;
    notes?: string;
  }>;
}

export interface CreateStockCountPayload {
  warehouse_id: string | number;
  storage_location_id?: string | number;
  type?: StockCountType;
  count_type?: StockCountType;
  count_date?: string;
  description?: string;
  auto_populate?: boolean;
  notes?: string;
  items?: Array<{ product_variant_id: string | number; counted_quantity: number }>;
}

export interface InventoryReconciliationResponse {
  success?: boolean;
  status?: string;
  checked_at?: string;
  total_inventories_checked?: number;
  discrepancies_count?: number;
  negative_stock_count?: number;
  orphan_batches_count?: number;
  discrepancies?: any[];
  negative_inventories?: any[];
  orphan_batches?: any[];
  data?: {
    status?: string;
    checked_at?: string;
    total_inventories_checked?: number;
    discrepancies_count?: number;
    negative_stock_count?: number;
    orphan_batches_count?: number;
    discrepancies?: any[];
    negative_inventories?: any[];
    orphan_batches?: any[];
  };
}

export interface InventoryValuationItem {
  id: number | string;
  inventory_id?: number | string;
  product_name?: string;
  variant_name?: string;
  warehouse_name?: string;
  sku?: string;
  quantity: number;
  unit_cost: number;
  cost_valuation?: number;
  selling_price?: number;
  retail_valuation?: number;
  potential_profit?: number;
  margin_percentage?: number;
  total_value: number;
}

export interface InventoryValuationSummary {
  total_products?: number;
  total_items?: number;
  total_units?: number;
  total_cost_valuation?: number;
  total_retail_valuation?: number;
  total_quantity?: number;
  total_value?: number;
  potential_profit?: number;
  margin_percentage?: number;
}

export type StockMovementType = 'in' | 'out' | 'transfer' | 'adjustment' | 'sale' | 'purchase' | string;

export type StockTransferStatus = 'pending' | 'approved' | 'shipped' | 'received' | 'cancelled' | string;

export interface CreateTransferItemPayload {
  product_variant_id: number | string;
  quantity: number;
}
