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
