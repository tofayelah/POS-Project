import { Supplier } from './supplier';
import { Warehouse } from './organization';
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
