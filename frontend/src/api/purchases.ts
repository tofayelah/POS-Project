import api from './axios';
import { 
  PurchaseInvoice, 
  PurchaseInvoiceFilterParams,
  SupplierPayableItem,
  SupplierLedgerRecord
} from '../types/purchase';
import { getActiveTenantId } from './organization';

const STORAGE_KEY = 'retailcore_purchase_invoices_cache_v1';

export const getLocalPurchases = (): PurchaseInvoice[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveLocalPurchases = (invoices: PurchaseInvoice[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
  } catch (e) {
    console.warn('Failed to save purchase invoices to localStorage:', e);
  }
};

// ======================= PURCHASE INVOICES =======================

export async function getPurchases(
  params?: PurchaseInvoiceFilterParams
): Promise<{ data: PurchaseInvoice[]; total: number }> {
  try {
    const response = await api.get('/purchases', { params });
    if (response.data && response.data.success && response.data.data) {
      const paginated = response.data.data;
      const apiList: PurchaseInvoice[] = Array.isArray(paginated) ? paginated : (paginated.data || []);
      
      const local = getLocalPurchases();
      const merged = apiList.map((item) => {
        const cached = local.find((l) => l.id === item.id || l.supplier_invoice_number === item.supplier_invoice_number);
        return cached ? { ...cached, ...item } : item;
      });

      local.forEach((loc) => {
        if (!merged.some((m) => m.id === loc.id || m.supplier_invoice_number === loc.supplier_invoice_number)) {
          merged.push(loc);
        }
      });

      saveLocalPurchases(merged);
      return { data: merged, total: merged.length };
    }
  } catch (err) {
    console.warn('Backend API /purchases unreachable, loading from resilient local tenant store:', err);
  }

  // Fallback to local store
  const tenantId = getActiveTenantId();
  let list = getLocalPurchases();

  if (tenantId) {
    list = list.filter((p) => p.company_id === tenantId || p.company_id === 1);
  }

  if (params?.search) {
    const q = params.search.toLowerCase();
    list = list.filter((p) => 
      p.supplier_invoice_number.toLowerCase().includes(q) ||
      p.supplier?.name.toLowerCase().includes(q) ||
      p.purchase_order?.po_number?.toLowerCase().includes(q)
    );
  }

  if (params?.status && params.status !== 'ALL') {
    list = list.filter((p) => p.status === params.status);
  }

  if (params?.payment_status && params.payment_status !== 'ALL') {
    list = list.filter((p) => (p.payment_status || 'DUE') === params.payment_status);
  }

  return { data: list, total: list.length };
}

export async function getPurchase(id: number): Promise<{ data: PurchaseInvoice }> {
  try {
    const response = await api.get(`/purchases/${id}`);
    if (response.data && response.data.success && response.data.data) {
      return { data: response.data.data };
    }
  } catch (err) {
    console.warn(`Backend API /purchases/${id} unreachable, checking local store:`, err);
  }

  const list = getLocalPurchases();
  const found = list.find((p) => p.id === Number(id));
  if (!found) {
    throw new Error(`Purchase Invoice #${id} not found.`);
  }
  return { data: found };
}

export async function postPurchaseInvoice(
  id: number
): Promise<{ success: boolean; data: PurchaseInvoice; message?: string }> {
  try {
    const response = await api.post(`/purchases/${id}/post`);
    if (response.data && response.data.success) {
      const posted: PurchaseInvoice = response.data.data;
      const list = getLocalPurchases();
      const updated = list.map((p) => (p.id === Number(id) ? { ...p, ...posted, status: 'POSTED' as const } : p));
      saveLocalPurchases(updated);
      return { success: true, data: posted, message: 'Purchase invoice posted successfully to accounts payable.' };
    }
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || err.message || 'Failed to post Purchase Invoice';
    throw new Error(errorMsg);
  }

  throw new Error('Failed to post Purchase Invoice');
}

// ======================= SUPPLIER PAYABLES & LEDGER =======================

export async function getSupplierPayables(params?: {
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
    console.warn('Backend API /reports/supplier-payables failed:', err);
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
    console.warn(`Backend API /reports/suppliers/${supplierId}/ledger failed:`, err);
  }

  return {
    data: [],
    summary: { supplier: null },
    meta: { total: 0 }
  };
}
