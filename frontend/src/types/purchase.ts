export interface CreatePurchaseOrderPayload {
  supplier_id: number | string;
  order_date?: string;
  expected_delivery_date?: string;
  items: Array<{
    product_variant_id: number | string;
    quantity: number;
    unit_price: number;
  }>;
}

export interface PurchaseOrderFilterParams {
  supplier_id?: number | string;
  status?: string;
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
  status: string;
  invoice_date?: string;
  due_date?: string;
}

export interface PurchaseInvoiceFilterParams {
  supplier_id?: number | string;
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
  total_amount: number;
  status: string;
  order_date?: string;
  expected_delivery_date?: string;
  items?: any[];
}
