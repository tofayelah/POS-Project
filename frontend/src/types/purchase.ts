export interface CreatePurchaseOrderPayload {
  supplier_id: number | string;
  warehouse_id?: number | string;
  business_unit_id?: number | string;
  branch_id?: number | string;
  po_number?: string;
  order_date?: string;
  expected_date?: string;
  expected_delivery_date?: string;
  shipping_cost?: number;
  other_cost?: number;
  discount_total?: number;
  tax_total?: number;
  notes?: string;
  payment_terms?: string;
  items: Array<{
    product_id: number | string;
    product_variant_id: number | string;
    product_name?: string;
    variant_name?: string;
    sku?: string;
    barcode?: string;
    category_name?: string;
    brand_name?: string;
    quantity: number;
    unit_cost: number;
    unit_price?: number;
    discount?: number;
    tax?: number;
    tax_percent?: number;
    unit_selling_price?: number;
    gp_percent?: number;
    purchase_unit?: string;
    line_total?: number;
    item_note?: string;
  }>;
  supplier_name?: string;
  warehouse_name?: string;
}

export interface PurchaseOrderFilterParams {
  supplier_id?: number | string;
  warehouse_id?: number | string;
  status?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface PurchaseInvoice {
  id: number | string;
  invoice_number: string;
  supplier_invoice_number?: string;
  supplier_id: number | string;
  supplier_name?: string;
  supplier?: any;
  total_amount: number;
  grand_total?: number;
  paid_amount?: number;
  due_amount?: number;
  payment_status?: string;
  status: string;
  invoice_date?: string;
  due_date?: string;
  created_at?: string;
}

export interface PurchaseInvoiceFilterParams {
  supplier_id?: number | string;
  search?: string;
  status?: string;
  page?: number;
  per_page?: number;
}

export interface GoodsReceipt {
  id: number | string;
  grn_number: string;
  purchase_order_id?: number | string;
  warehouse_id?: number | string;
  received_date?: string;
  status: string;
  items?: any[];
}

export interface CreateGoodsReceiptPayload {
  purchase_order_id: number | string;
  warehouse_id: number | string;
  received_date?: string;
  items: Array<{
    product_variant_id: number | string;
    received_quantity: number;
  }>;
}

export interface GoodsReceiptFilterParams {
  purchase_order_id?: number | string;
  warehouse_id?: number | string;
  status?: string;
  page?: number;
  per_page?: number;
}

export interface SupplierPayableItem {
  supplier_id: number | string;
  supplier_name: string;
  total_due: number;
  overdue_amount: number;
}

export interface SupplierLedgerRecord {
  id: number | string;
  supplier_id: number | string;
  date: string;
  reference_type: string;
  reference_number: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface SupplierPayment {
  id: number | string;
  purchase_order_id?: number | string;
  supplier_id?: number | string;
  payment_number?: string;
  amount: number;
  payment_method?: string;
  payment_date?: string;
  status?: string;
  notes?: string;
}

export interface PurchaseOrder {
  id: number | string;
  po_number: string;
  supplier_id: number | string;
  warehouse_id?: number | string;
  business_unit_id?: number | string;
  branch_id?: number | string;
  total_amount?: number;
  subtotal?: number;
  grand_total?: number;
  shipping_cost?: number;
  other_cost?: number;
  discount_total?: number;
  tax_total?: number;
  status: string;
  order_date?: string;
  expected_date?: string;
  expected_delivery_date?: string;
  notes?: string;
  payment_terms?: string;
  supplier?: any;
  warehouse?: any;
  branch?: any;
  created_by_user?: any;
  items?: Array<{
    id?: number | string;
    product_id: number | string;
    product_variant_id: number | string;
    product_name?: string;
    variant_name?: string;
    sku?: string;
    barcode?: string;
    category_name?: string;
    brand_name?: string;
    quantity: number;
    unit_cost: number;
    discount?: number;
    tax?: number;
    tax_percent?: number;
    unit_selling_price?: number;
    gp_percent?: number;
    inclusive_selling_price?: number;
    line_total: number;
    product?: any;
    variant?: any;
    purchase_unit?: string;
    item_note?: string;
  }>;
}
