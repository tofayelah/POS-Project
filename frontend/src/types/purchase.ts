import { Supplier } from './supplier';
import { Warehouse, StorageLocation } from './organization';
import { Product, ProductVariant } from './product';

export type PurchaseOrderStatus = 
  | 'DRAFT' 
  | 'PENDING_APPROVAL' 
  | 'APPROVED' 
  | 'PARTIALLY_RECEIVED' 
  | 'FULLY_RECEIVED' 
  | 'CANCELLED';

export interface PurchaseOrderItem {
  id?: number;
  purchase_order_id?: number;
  product_id: number;
  product_variant_id: number;
  quantity: number;
  unit_cost: number;
  discount?: number;
  tax?: number;
  line_total: number;
  received_quantity?: number;
  pending_quantity?: number;
  product?: Product;
  variant?: ProductVariant;
}

export interface PurchaseOrder {
  id: number;
  uuid?: string;
  company_id: number;
  business_unit_id?: number | null;
  branch_id?: number | null;
  warehouse_id: number;
  supplier_id: number;
  po_number: string;
  order_date: string;
  expected_date?: string | null;
  status: PurchaseOrderStatus;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  shipping_cost: number;
  other_cost: number;
  grand_total: number;
  notes?: string | null;
  created_by?: number | null;
  approved_by?: number | null;
  approved_at?: string | null;
  created_at?: string;
  updated_at?: string;
  supplier?: Supplier;
  warehouse?: Warehouse;
  items?: PurchaseOrderItem[];
}

export interface CreatePurchaseOrderPayload {
  supplier_id: number;
  warehouse_id: number;
  business_unit_id?: number | null;
  branch_id?: number | null;
  po_number: string;
  order_date: string;
  expected_date?: string | null;
  shipping_cost?: number;
  other_cost?: number;
  discount_total?: number;
  tax_total?: number;
  notes?: string | null;
  status?: PurchaseOrderStatus;
  items: Array<{
    product_id: number;
    product_variant_id: number;
    quantity: number;
    unit_cost: number;
    discount?: number;
    tax?: number;
  }>;
}

export interface PurchaseOrderFilterParams {
  search?: string;
  status?: string;
  supplier_id?: number;
  warehouse_id?: number;
  from_date?: string;
  to_date?: string;
  page?: number;
  per_page?: number;
}

// ======================= GATE 1.5 GOODS RECEIPTS =======================

export type GoodsReceiptStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export interface GoodsReceiptItem {
  id?: number;
  goods_receipt_id?: number;
  purchase_order_item_id: number;
  product_id: number;
  product_variant_id: number;
  received_quantity: number;
  unit_cost: number;
  total_cost: number;
  storage_location_id?: number | null;
  stock_batch_id?: number | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  product?: Product;
  product_variant?: ProductVariant;
  storage_location?: StorageLocation;
  stock_batch?: any;
}

export interface GoodsReceipt {
  id: number;
  uuid?: string;
  company_id: number;
  supplier_id: number;
  warehouse_id: number;
  purchase_order_id: number;
  receipt_number: string;
  receipt_date: string;
  status: GoodsReceiptStatus;
  created_by?: number | null;
  posted_by?: number | null;
  posted_at?: string | null;
  created_at?: string;
  updated_at?: string;
  supplier?: Supplier;
  warehouse?: Warehouse;
  purchase_order?: PurchaseOrder;
  purchaseOrder?: PurchaseOrder;
  items?: GoodsReceiptItem[];
}

export interface CreateGoodsReceiptPayload {
  purchase_order_id: number;
  receipt_number: string;
  receipt_date: string;
  items: Array<{
    purchase_order_item_id: number;
    received_quantity: number;
    storage_location_id?: number | null;
    stock_batch_id?: number | null;
    batch_number?: string | null;
    expiry_date?: string | null;
  }>;
}

export interface GoodsReceiptFilterParams {
  search?: string;
  status?: string;
  purchase_order_id?: number;
  supplier_id?: number;
  warehouse_id?: number;
  from_date?: string;
  to_date?: string;
  page?: number;
  per_page?: number;
}

// ======================= GATE 1.5 PURCHASE INVOICES =======================

export type PurchaseInvoiceStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';
export type PurchasePaymentStatus = 'DUE' | 'PARTIAL' | 'PAID';

export interface PurchaseInvoiceItem {
  id?: number;
  purchase_id?: number;
  product_id: number;
  product_variant_id: number;
  quantity: number;
  unit_cost: number;
  line_total: number;
  product?: Product;
  variant?: ProductVariant;
}

export interface PurchaseInvoice {
  id: number;
  uuid?: string;
  company_id: number;
  supplier_id: number;
  warehouse_id?: number | null;
  purchase_order_id?: number | null;
  goods_receipt_id?: number | null;
  supplier_invoice_number: string;
  invoice_date: string;
  due_date?: string | null;
  status: PurchaseInvoiceStatus;
  grand_total: number;
  subtotal?: number;
  tax_total?: number;
  discount_total?: number;
  shipping_cost?: number;
  paid_amount?: number;
  due_amount?: number;
  payment_status?: PurchasePaymentStatus;
  created_by?: number | null;
  posted_by?: number | null;
  posted_at?: string | null;
  created_at?: string;
  updated_at?: string;
  supplier?: Supplier;
  warehouse?: Warehouse;
  purchase_order?: PurchaseOrder;
  purchaseOrder?: PurchaseOrder;
  items?: PurchaseInvoiceItem[];
  payment_allocations?: any[];
}

export interface PurchaseInvoiceFilterParams {
  search?: string;
  status?: string;
  payment_status?: string;
  supplier_id?: number;
  warehouse_id?: number;
  from_date?: string;
  to_date?: string;
  page?: number;
  per_page?: number;
}

// ======================= GATE 1.5 SUPPLIER PAYABLES & LEDGER =======================

export interface SupplierPayableItem {
  id: number;
  supplier_code: string;
  name: string;
  mobile?: string | null;
  email?: string | null;
  total_purchases: number;
  total_paid: number;
  balance: number;
  status: string;
}

export interface SupplierLedgerRecord {
  id: number;
  supplier_id: number;
  company_id: number;
  transaction_type: 'BILL' | 'PAYMENT' | 'OPENING_BALANCE' | 'ADJUSTMENT' | string;
  reference_type?: string | null;
  reference_id?: number | null;
  transaction_date: string;
  debit: number;
  credit: number;
  balance_before: number;
  balance_after: number;
  notes?: string | null;
}

