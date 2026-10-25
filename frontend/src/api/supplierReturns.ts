import api from './axios';
import { SupplierReturn, CreateSupplierReturnPayload } from '../types/purchase';
import { isDemoOrPreviewMode, extractApiError } from '../utils/env';
import { deductSupplierBalance } from './suppliers';

export const SUPPLIER_RETURNS_STORAGE_KEY = 'retailcore_supplier_returns_v2';

export const DEFAULT_SUPPLIER_RETURNS: SupplierReturn[] = [
  {
    id: 1,
    return_number: 'PRET-2026-0001',
    return_date: '2026-10-12',
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
    purchase_invoice_id: 2,
    purchase_invoice_number: 'PINV-9013',
    supplier_invoice_number: 'SQU-1092',
    warehouse_id: 1,
    warehouse_name: 'Central Warehouse (WH-01)',
    status: 'POSTED',
    settlement_type: 'PAYABLE_ADJUSTMENT',
    return_reason_general: 'DAMAGED',
    subtotal: 450.0,
    tax_amount: 0.0,
    discount_deducted: 0.0,
    grand_total: 450.0,
    amount_settled: 450.0,
    notes: 'Damaged bottles detected upon quality check. Supplier approved immediate debit note credit.',
    created_at: '2026-10-12T11:20:00Z',
    items: [
      {
        id: 'ret-item-1',
        product_id: 1,
        product_variant_id: 1,
        product_name: 'Napa Extra 500mg/65mg Paracetamol + Caffeine Tablet',
        sku: 'MED-NAP-EXT-01',
        barcode: '890123456001',
        unit_name: 'Box (100 Tabs)',
        original_quantity: 20,
        original_unit_cost: 225.0,
        return_rate: 225.0,
        return_qty: 2,
        reason: 'DAMAGED',
        reason_detail: 'Blister packs crushed during container handling',
        line_total: 450.0,
      },
    ],
  },
];

export function getStoredSupplierReturns(): SupplierReturn[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(SUPPLIER_RETURNS_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to parse cached supplier returns', err);
  }
  return DEFAULT_SUPPLIER_RETURNS;
}

export function saveStoredSupplierReturns(list: SupplierReturn[]) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SUPPLIER_RETURNS_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.warn('Failed to save supplier returns to local cache', err);
  }
}

export function generateNextSupplierReturnNumber(): string {
  const returns = getStoredSupplierReturns();
  let maxNum = 1;
  for (const r of returns) {
    const m = String(r.return_number || '').match(/PRET-(\d{4})-(\d+)/i);
    if (m) {
      const num = parseInt(m[2], 10);
      if (num >= maxNum) maxNum = num + 1;
    }
  }
  const year = new Date().getFullYear();
  return `PRET-${year}-${String(maxNum).padStart(4, '0')}`;
}

export async function getSupplierReturns(params?: {
  search?: string;
  supplier_id?: number | string;
  status?: string;
}): Promise<{ data: SupplierReturn[]; total: number }> {
  try {
    const response = await api.get('/supplier-returns', { params });
    if (response.data && response.data.success) {
      const rawData = response.data.data;
      const list = Array.isArray(rawData) ? rawData : rawData?.data || [];
      if (list.length > 0) {
        saveStoredSupplierReturns(list);
        return { data: list, total: response.data.total ?? list.length };
      }
    }
  } catch (err) {
    console.warn('Supplier returns API fetch fallback to local store', err);
  }

  let list = getStoredSupplierReturns();
  if (params?.search) {
    const s = params.search.toLowerCase();
    list = list.filter(
      (r) =>
        r.return_number.toLowerCase().includes(s) ||
        r.supplier_name.toLowerCase().includes(s) ||
        (r.purchase_invoice_number && r.purchase_invoice_number.toLowerCase().includes(s)) ||
        (r.supplier_invoice_number && r.supplier_invoice_number.toLowerCase().includes(s))
    );
  }
  if (params?.supplier_id) {
    list = list.filter((r) => String(r.supplier_id) === String(params.supplier_id));
  }
  if (params?.status && params.status !== 'ALL') {
    list = list.filter((r) => r.status.toUpperCase() === params.status?.toUpperCase());
  }

  return { data: list, total: list.length };
}

export async function getSupplierReturn(id: number | string): Promise<{ data: SupplierReturn }> {
  try {
    const response = await api.get(`/supplier-returns/${id}`);
    if (response.data && response.data.success && response.data.data) {
      return { data: response.data.data };
    }
  } catch (err) {
    console.warn(`Supplier returns API get #${id} failed, checking local store`, err);
  }

  const list = getStoredSupplierReturns();
  const match = list.find((r) => String(r.id) === String(id));
  if (match) {
    return { data: match };
  }
  throw new Error(`Supplier Return #${id} not found.`);
}

export async function createSupplierReturn(
  payload: CreateSupplierReturnPayload
): Promise<{ success: boolean; data: SupplierReturn; message?: string }> {
  const newReturnNumber = generateNextSupplierReturnNumber();
  const newRecord: SupplierReturn = {
    id: Date.now(),
    return_number: newReturnNumber,
    return_date: payload.return_date,
    supplier_id: payload.supplier_id,
    supplier_name: String(payload.supplier_id),
    purchase_invoice_id: payload.purchase_invoice_id,
    purchase_invoice_number: payload.purchase_invoice_number,
    supplier_invoice_number: payload.supplier_invoice_number,
    warehouse_id: payload.warehouse_id || 1,
    warehouse_name: 'Central Warehouse (WH-01)',
    status: payload.status,
    settlement_type: payload.settlement_type,
    return_reason_general: payload.return_reason_general || 'DEFECTIVE',
    subtotal: payload.subtotal,
    tax_amount: payload.tax_amount || 0,
    discount_deducted: payload.discount_deducted || 0,
    grand_total: payload.grand_total,
    amount_settled: payload.status === 'POSTED' ? payload.grand_total : 0,
    notes: payload.notes,
    created_at: new Date().toISOString(),
    items: payload.items,
  };

  try {
    const response = await api.post('/supplier-returns', payload);
    if (response.data && response.data.success && response.data.data) {
      const serverRecord = response.data.data;
      const list = getStoredSupplierReturns();
      saveStoredSupplierReturns([serverRecord, ...list.filter((r) => r.id !== serverRecord.id)]);
      return {
        success: true,
        data: serverRecord,
        message: 'Supplier return recorded successfully.',
      };
    }
  } catch (err: any) {
    if (!isDemoOrPreviewMode() && err.response) {
      const errInfo = extractApiError(err);
      throw new Error(errInfo.message);
    }
  }

  // Preview or local fallback
  const list = getStoredSupplierReturns();
  saveStoredSupplierReturns([newRecord, ...list]);

  // If settlement type is PAYABLE_ADJUSTMENT and status is POSTED:
  // Deduct the return amount from the supplier's accounts payable ledger
  if (payload.status === 'POSTED' && payload.settlement_type === 'PAYABLE_ADJUSTMENT' && payload.supplier_id) {
    deductSupplierBalance(Number(payload.supplier_id), Number(payload.grand_total || 0));
  }

  return {
    success: true,
    data: newRecord,
    message: payload.status === 'POSTED' 
      ? 'Supplier return posted successfully. Debit note created and deducted from Supplier Ledger.' 
      : 'Supplier return draft saved successfully.',
  };
}

export async function updateSupplierReturn(
  id: number | string,
  payload: Partial<CreateSupplierReturnPayload>
): Promise<{ success: boolean; data: SupplierReturn; message?: string }> {
  try {
    const response = await api.put(`/supplier-returns/${id}`, payload);
    if (response.data && response.data.success && response.data.data) {
      const updated = response.data.data;
      const list = getStoredSupplierReturns();
      saveStoredSupplierReturns(list.map((r) => (String(r.id) === String(id) ? updated : r)));
      return { success: true, data: updated, message: 'Supplier return updated.' };
    }
  } catch (err: any) {
    if (!isDemoOrPreviewMode() && err.response) {
      const errInfo = extractApiError(err);
      throw new Error(errInfo.message);
    }
  }

  const list = getStoredSupplierReturns();
  const existing = list.find((r) => String(r.id) === String(id));
  if (!existing) {
    throw new Error(`Supplier Return #${id} not found.`);
  }

  const updated: SupplierReturn = {
    ...existing,
    ...payload,
    grand_total: payload.grand_total ?? existing.grand_total,
    subtotal: payload.subtotal ?? existing.subtotal,
    items: payload.items ?? existing.items,
  };

  const willPostNow = payload.status === 'POSTED' && existing.status !== 'POSTED';
  const effectiveSettlement = payload.settlement_type || existing.settlement_type;
  if (willPostNow && effectiveSettlement === 'PAYABLE_ADJUSTMENT') {
    const amount = Number(payload.grand_total ?? existing.grand_total ?? 0);
    const supId = Number(payload.supplier_id ?? existing.supplier_id);
    if (supId && amount > 0) {
      deductSupplierBalance(supId, amount);
    }
  }

  saveStoredSupplierReturns(list.map((r) => (String(r.id) === String(id) ? updated : r)));
  return { success: true, data: updated, message: 'Supplier return updated successfully.' };
}

export async function deleteSupplierReturn(id: number | string): Promise<{ success: boolean }> {
  try {
    await api.delete(`/supplier-returns/${id}`);
  } catch (err) {
    console.warn(`Failed to delete return #${id} on server, removing locally`, err);
  }

  const list = getStoredSupplierReturns();
  saveStoredSupplierReturns(list.filter((r) => String(r.id) !== String(id)));
  return { success: true };
}
