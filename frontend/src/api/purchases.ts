import api from './axios';
import { 
  PurchaseInvoice, 
  PurchaseInvoiceFilterParams,
  SupplierPayableItem,
  SupplierLedgerRecord
} from '../types/purchase';

export interface CreatePurchasePayload {
  supplier_id: number;
  supplier_invoice_number: string;
  invoice_date: string;
  due_date?: string | null;
  warehouse_id?: number | null;
  purchase_order_id?: number | null;
  goods_receipt_id?: number | null;
  shipping_cost?: number;
  other_cost?: number;
  notes?: string | null;
  post_immediately?: boolean;
  items: Array<{
    product_id: number;
    product_variant_id: number;
    quantity: number;
    unit_cost: number;
    discount?: number;
    tax?: number;
  }>;
}

// ======================= PURCHASE INVOICES =======================

export async function getPurchases(
  params?: PurchaseInvoiceFilterParams
): Promise<{ data: PurchaseInvoice[]; total: number }> {
  const response = await api.get('/purchases', { params });
  if (response.data && response.data.success) {
    const rawData = response.data.data;
    if (Array.isArray(rawData)) {
      return { data: rawData, total: response.data.total ?? rawData.length };
    }
    if (rawData && Array.isArray(rawData.data)) {
      return { data: rawData.data, total: rawData.total ?? rawData.data.length };
    }
    return { data: [], total: 0 };
  }
  return { data: [], total: 0 };
}

export async function getPurchase(id: number): Promise<{ data: PurchaseInvoice }> {
  const response = await api.get(`/purchases/${id}`);
  if (response.data && response.data.success && response.data.data) {
    return { data: response.data.data };
  }
  throw new Error(`Purchase Invoice #${id} not found.`);
}

export async function createPurchase(
  payload: CreatePurchasePayload
): Promise<{ success: boolean; data: PurchaseInvoice; message?: string }> {
  const response = await api.post('/purchases', payload);
  if (response.data && response.data.success) {
    return response.data;
  }
  throw new Error(response.data?.message || 'Failed to create Purchase Invoice.');
}

export async function postPurchaseInvoice(
  id: number
): Promise<{ success: boolean; data: PurchaseInvoice; message?: string }> {
  const response = await api.post(`/purchases/${id}/post`);
  if (response.data && response.data.success) {
    return response.data;
  }
  throw new Error(response.data?.message || 'Failed to post Purchase Invoice.');
}

export async function cancelPurchaseInvoice(
  id: number
): Promise<{ success: boolean; data: PurchaseInvoice; message?: string }> {
  const response = await api.post(`/purchases/${id}/cancel`);
  if (response.data && response.data.success) {
    return response.data;
  }
  throw new Error(response.data?.message || 'Failed to cancel Purchase Invoice.');
}

// ======================= SUPPLIER PAYABLES & LEDGER =======================

export async function getSupplierPayables(params?: {
  search?: string;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_direction?: string;
}): Promise<{ data: SupplierPayableItem[]; summary: { total_payables: number }; meta: any }> {
  const response = await api.get('/reports/supplier-payables', { params });
  if (response.data && response.data.success) {
    return {
      data: response.data.data || [],
      summary: response.data.summary || { total_payables: 0 },
      meta: response.data.meta || { total: 0 }
    };
  }
  return {
    data: [],
    summary: { total_payables: 0 },
    meta: { total: 0 }
  };
}

export async function getSupplierLedger(
  supplierId: number,
  params?: { date_from?: string; date_to?: string; per_page?: number }
): Promise<{ data: SupplierLedgerRecord[]; summary: { supplier: any }; meta: any }> {
  const response = await api.get(`/reports/suppliers/${supplierId}/ledger`, { params });
  if (response.data && response.data.success) {
    return {
      data: response.data.data || [],
      summary: response.data.summary || { supplier: null },
      meta: response.data.meta || { total: 0 }
    };
  }
  return {
    data: [],
    summary: { supplier: null },
    meta: { total: 0 }
  };
}
