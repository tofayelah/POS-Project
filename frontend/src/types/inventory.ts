export interface Warehouse {
  id: number | string;
  code?: string;
  name: string;
  location?: string;
  address?: string;
  is_active?: boolean;
}

export interface StorageLocation {
  id: number | string;
  warehouse_id: number | string;
  code: string;
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface InventoryItem {
  id: number | string;
  product_id?: number | string;
  product_name?: string;
  product_variant_id?: number | string;
  sku?: string;
  warehouse_id?: number | string;
  warehouse_name?: string;
  quantity: number;
  reserved_quantity?: number;
  available_quantity?: number;
  reorder_level?: number;
  unit_cost?: number;
  total_value?: number;
}

export interface InventoryFilterParams {
  warehouse_id?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface StockMovement {
  id: number | string;
  product_name?: string;
  sku?: string;
  type?: string;
  quantity: number;
  reference?: string;
  created_at?: string;
}

export interface StockMovementFilterParams {
  warehouse_id?: string;
  type?: string;
  page?: number;
  per_page?: number;
}

export interface OpeningStockPayload {
  warehouse_id: string;
  items: Array<{ product_variant_id: string; quantity: number; unit_cost?: number }>;
}

export interface StockAdjustmentPayload {
  warehouse_id: string;
  reason?: string;
  items: Array<{ product_variant_id: string; quantity: number }>;
}

export interface AdjustmentInPayload {
  warehouse_id: string;
  reason?: string;
  items: Array<{ product_variant_id: string; quantity: number }>;
}

export interface AdjustmentOutPayload {
  warehouse_id: string;
  reason?: string;
  items: Array<{ product_variant_id: string; quantity: number }>;
}

export interface DamageLossPayload {
  warehouse_id: string;
  reason?: string;
  items: Array<{ product_variant_id: string; quantity: number }>;
}

export interface DirectTransferPayload {
  from_warehouse_id: string;
  to_warehouse_id: string;
  items: Array<{ product_variant_id: string; quantity: number }>;
}

export interface StockTransfer {
  id: number | string;
  transfer_number?: string;
  from_warehouse_name?: string;
  to_warehouse_name?: string;
  status?: string;
  created_at?: string;
}

export interface StockTransferFilterParams {
  status?: string;
  page?: number;
  per_page?: number;
}

export interface CreateTransferPayload {
  from_warehouse_id: string;
  to_warehouse_id: string;
  items: Array<{ product_variant_id: string; quantity: number }>;
}

export interface ReceiveTransferPayload {
  transfer_id: string;
  received_items: Array<{ product_variant_id: string; quantity_received: number }>;
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
  product_variant_id?: string;
  manufactured_date?: string;
  expiry_date?: string;
  quantity: number;
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

export type StockMovementType = 'in' | 'out' | 'transfer' | 'adjustment' | 'sale' | 'purchase' | string;

export type StockTransferStatus = 'pending' | 'approved' | 'shipped' | 'received' | 'cancelled' | string;

export interface CreateTransferItemPayload {
  product_variant_id: number | string;
  quantity: number;
}
