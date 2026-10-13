import api from './axios';
import { 
  PurchaseInvoice, 
  PurchaseInvoiceFilterParams,
  SupplierPayableItem,
  SupplierLedgerRecord
} from '../types/purchase';
import { isDemoOrPreviewMode, extractApiError } from '../utils/env';

export interface CreatePurchasePayload {
  supplier_id: number;
  supplier_invoice_number: string;
  invoice_date: string;
  due_date?: string | null;
  warehouse_id?: number | null;
  business_unit_id?: number | null;
  branch_id?: number | null;
  purchase_order_id?: number | null;
  goods_receipt_id?: number | null;
  shipping_cost?: number;
  other_cost?: number;
  notes?: string | null;
  post_immediately?: boolean;
  amount_paid?: number;
  payment_method?: string;
  items: Array<{
    product_id: number;
    product_variant_id: number;
    quantity: number;
    unit_cost: number;
    discount?: number;
    tax?: number;
    selling_price?: number;
    line_total?: number;
  }>;
}

export const PURCHASES_STORAGE_KEY = 'retailcore_purchases_list_v2';

export const DEFAULT_PURCHASES: PurchaseInvoice[] = [
  {
    id: 1,
    invoice_number: 'PINV-9012',
    supplier_invoice_number: 'SINV-8821',
    supplier_id: 1,
    supplier_name: 'TM International',
    supplier: {
      id: 1,
      supplier_code: 'SUP-0001',
      name: 'TM International',
      short_name: 'TMI',
      mobile: '01711000001',
      current_balance: 12500,
    },
    invoice_date: '2026-10-10',
    due_date: '2026-11-10',
    total_amount: 1250.0,
    grand_total: 1250.0,
    paid_amount: 0.0,
    due_amount: 1250.0,
    payment_status: 'unpaid',
    status: 'POSTED',
    created_at: '2026-10-10T08:00:00Z',
  },
  {
    id: 2,
    invoice_number: 'PINV-9013',
    supplier_invoice_number: 'SQU-1092',
    supplier_id: 2,
    supplier_name: 'Square Pharmaceuticals Ltd',
    supplier: {
      id: 2,
      supplier_code: 'SUP-0002',
      name: 'Square Pharmaceuticals Ltd',
      short_name: 'SQU',
      mobile: '01811000002',
      current_balance: 45000,
    },
    invoice_date: '2026-10-11',
    due_date: '2026-11-11',
    total_amount: 3450.0,
    grand_total: 3450.0,
    paid_amount: 3450.0,
    due_amount: 0.0,
    payment_status: 'paid',
    status: 'POSTED',
    created_at: '2026-10-11T09:30:00Z',
  },
];

export function getStoredPurchases(): PurchaseInvoice[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(PURCHASES_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to parse cached purchases', err);
  }
  return DEFAULT_PURCHASES;
}

export function saveStoredPurchases(list: PurchaseInvoice[]) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.warn('Failed to save purchases to local cache', err);
  }
}

export function generateNextPurchaseVoucher(): string {
  const purchases = getStoredPurchases();
  let maxNum = 9013;
  for (const p of purchases) {
    const m = String(p.invoice_number || '').match(/PINV-(\d+)/i);
    if (m) {
      const num = parseInt(m[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return `PINV-${maxNum + 1}`;
}

// ======================= PURCHASE INVOICES =======================

export async function getPurchases(
  params?: PurchaseInvoiceFilterParams
): Promise<{ data: PurchaseInvoice[]; total: number }> {
  try {
    const response = await api.get('/purchases', { params });
    if (response.data && response.data.success) {
      const rawData = response.data.data;
      let fetchedList: PurchaseInvoice[] = [];
      if (Array.isArray(rawData)) {
        fetchedList = rawData;
      } else if (rawData && Array.isArray(rawData.data)) {
        fetchedList = rawData.data;
      }

      if (fetchedList.length > 0) {
        saveStoredPurchases(fetchedList);
        return { data: fetchedList, total: response.data.total ?? fetchedList.length };
      }
    }
  } catch (err) {
    console.warn('Purchases API fetch failed, falling back to local persistent store', err);
  }

  let list = getStoredPurchases();
  if (params?.search) {
    const s = params.search.toLowerCase();
    list = list.filter(
      (p) =>
        p.invoice_number.toLowerCase().includes(s) ||
        (p.supplier_invoice_number && p.supplier_invoice_number.toLowerCase().includes(s)) ||
        (p.supplier_name && p.supplier_name.toLowerCase().includes(s)) ||
        (p.supplier?.name && p.supplier.name.toLowerCase().includes(s))
    );
  }
  if (params?.supplier_id) {
    list = list.filter((p) => Number(p.supplier_id) === Number(params.supplier_id));
  }
  if (params?.status) {
    list = list.filter((p) => p.status.toUpperCase() === params.status?.toUpperCase());
  }

  return { data: list, total: list.length };
}

export async function getPurchase(id: number | string): Promise<{ data: PurchaseInvoice }> {
  try {
    const response = await api.get(`/purchases/${id}`);
    if (response.data && response.data.success && response.data.data) {
      return { data: response.data.data };
    }
  } catch (err) {
    console.warn(`Purchases API get #${id} failed, checking local persistent store`, err);
  }

  const list = getStoredPurchases();
  const match = list.find((p) => String(p.id) === String(id));
  if (match) {
    return { data: match };
  }
  throw new Error(`Purchase Invoice #${id} not found.`);
}

export async function reconcilePurchaseByChallan(
  supplierId: number,
  challanNumber: string
): Promise<PurchaseInvoice | null> {
  try {
    const res = await api.get('/purchases', {
      params: { supplier_id: supplierId, search: challanNumber },
    });
    const list = Array.isArray(res.data?.data) ? res.data.data : res.data?.data?.data || [];
    const match = list.find(
      (p: PurchaseInvoice) =>
        Number(p.supplier_id) === Number(supplierId) &&
        p.supplier_invoice_number?.trim().toLowerCase() === challanNumber.trim().toLowerCase()
    );
    return match || null;
  } catch (err) {
    return null;
  }
}

export async function createPurchase(
  payload: CreatePurchasePayload
): Promise<{ success: boolean; data: PurchaseInvoice; message?: string }> {
  try {
    const response = await api.post('/purchases', payload);
    if (response.data && response.data.success && response.data.data && !Array.isArray(response.data.data)) {
      const createdRecord = response.data.data;
      const list = getStoredPurchases();
      saveStoredPurchases([createdRecord, ...list.filter((p) => p.id !== createdRecord.id)]);
      return {
        success: true,
        data: createdRecord,
        message: 'Purchase invoice recorded successfully.',
      };
    }
    if (response.data && response.data.success === false) {
      throw new Error(response.data.message || 'Failed to create purchase invoice');
    }
  } catch (err: any) {
    const errInfo = extractApiError(err);
    if (!isDemoOrPreviewMode() || err.response) {
      if (errInfo.isNetworkError && payload.supplier_id && payload.supplier_invoice_number) {
        const existing = await reconcilePurchaseByChallan(payload.supplier_id, payload.supplier_invoice_number);
        if (existing) {
          return {
            success: true,
            data: existing,
            message: 'Purchase invoice reconciled from backend after network timeout.',
          };
        }
      }
      throw new Error(errInfo.message);
    }
  }

  if (!isDemoOrPreviewMode()) {
    throw new Error('Failed to create purchase invoice. Backend request did not succeed.');
  }

  const list = getStoredPurchases();
  const nextId = list.length > 0 ? Math.max(...list.map((p) => Number(p.id) || 0)) + 1 : 1;
  const voucher = generateNextPurchaseVoucher();

  const subtotal = payload.items.reduce(
    (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unit_cost) || 0),
    0
  );
  const shipping = Number(payload.shipping_cost) || 0;
  const other = Number(payload.other_cost) || 0;
  const grandTotal = subtotal + shipping + other;
  const paid = Number(payload.amount_paid) || 0;
  const due = Math.max(0, grandTotal - paid);
  const paymentStatus = paid >= grandTotal ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
  const status = payload.post_immediately ? 'POSTED' : 'DRAFT';

  const createdRecord: PurchaseInvoice = {
    id: nextId,
    invoice_number: voucher,
    supplier_invoice_number: payload.supplier_invoice_number,
    supplier_id: payload.supplier_id,
    supplier_name: 'Supplier #' + payload.supplier_id,
    total_amount: grandTotal,
    grand_total: grandTotal,
    paid_amount: paid,
    due_amount: due,
    payment_status: paymentStatus,
    status,
    invoice_date: payload.invoice_date,
    due_date: payload.due_date || undefined,
    created_at: new Date().toISOString(),
  };

  saveStoredPurchases([createdRecord, ...list]);
  return {
    success: true,
    data: createdRecord,
    message: 'Purchase invoice recorded successfully.',
  };
}

export async function postPurchaseInvoice(
  id: number | string
): Promise<{ success: boolean; data: PurchaseInvoice; message?: string }> {
  try {
    const response = await api.post(`/purchases/${id}/post`);
    if (response.data && response.data.success) {
      return response.data;
    }
  } catch (err: any) {
    const errInfo = extractApiError(err);
    if (!isDemoOrPreviewMode() || err.response) {
      throw new Error(errInfo.message);
    }
  }

  if (!isDemoOrPreviewMode()) {
    throw new Error(`Failed to post Purchase Invoice #${id}. Backend request did not succeed.`);
  }

  const list = getStoredPurchases();
  const idx = list.findIndex((p) => String(p.id) === String(id));
  if (idx !== -1) {
    list[idx] = { ...list[idx], status: 'POSTED' };
    saveStoredPurchases(list);
    return { success: true, data: list[idx], message: 'Purchase invoice posted successfully.' };
  }
  throw new Error(`Failed to post Purchase Invoice #${id}.`);
}

export async function cancelPurchaseInvoice(
  id: number | string
): Promise<{ success: boolean; data: PurchaseInvoice; message?: string }> {
  try {
    const response = await api.post(`/purchases/${id}/cancel`);
    if (response.data && response.data.success) {
      return response.data;
    }
  } catch (err: any) {
    const errInfo = extractApiError(err);
    if (!isDemoOrPreviewMode() || err.response) {
      throw new Error(errInfo.message);
    }
  }

  if (!isDemoOrPreviewMode()) {
    throw new Error(`Failed to cancel Purchase Invoice #${id}. Backend request did not succeed.`);
  }

  const list = getStoredPurchases();
  const idx = list.findIndex((p) => String(p.id) === String(id));
  if (idx !== -1) {
    list[idx] = { ...list[idx], status: 'CANCELLED' };
    saveStoredPurchases(list);
    return { success: true, data: list[idx], message: 'Purchase invoice cancelled.' };
  }
  throw new Error(`Failed to cancel Purchase Invoice #${id}.`);
}

// ======================= SUPPLIER PAYABLES & LEDGER =======================

export async function getSupplierPayables(params?: {
  search?: string;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_direction?: string;
}): Promise<{ data: SupplierPayableItem[]; summary: { total_payables: number }; meta: any }> {
  try {
    const response = await api.get('/reports/supplier-payables', { params });
    if (response.data && response.data.success) {
      return {
        data: response.data.data || [],
        summary: response.data.summary || { total_payables: 0 },
        meta: response.data.meta || { total: 0 }
      };
    }
  } catch (err) {
    console.warn('Supplier payables API fallback', err);
  }
  return {
    data: [],
    summary: { total_payables: 0 },
    meta: { total: 0 }
  };
}

export async function getSupplierLedger(
  supplierId: number | string,
  params?: { date_from?: string; date_to?: string; per_page?: number }
): Promise<{ data: SupplierLedgerRecord[]; summary: { supplier: any }; meta: any }> {
  try {
    const response = await api.get(`/reports/suppliers/${supplierId}/ledger`, { params });
    if (response.data && response.data.success) {
      return {
        data: response.data.data || [],
        summary: response.data.summary || { supplier: null },
        meta: response.data.meta || { total: 0 }
      };
    }
  } catch (err) {
    console.warn(`Supplier ledger API fallback for #${supplierId}`, err);
  }
  return {
    data: [],
    summary: { supplier: null },
    meta: { total: 0 }
  };
}
