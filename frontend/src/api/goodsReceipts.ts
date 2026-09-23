import api from './axios';
import { 
  GoodsReceipt, 
  CreateGoodsReceiptPayload, 
  GoodsReceiptFilterParams 
} from '../types/purchase';
import { getActiveTenantId } from './organization';

const STORAGE_KEY = 'retailcore_goods_receipts_cache_v1';

export const getLocalGoodsReceipts = (): GoodsReceipt[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveLocalGoodsReceipts = (receipts: GoodsReceipt[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
  } catch (e) {
    console.warn('Failed to save goods receipts to localStorage:', e);
  }
};

export const generateNextGrNumber = (): string => {
  const current = getLocalGoodsReceipts();
  const currentYear = new Date().getFullYear();
  let maxSeq = 0;
  const regex = new RegExp(`GR-${currentYear}-(\\d+)`, 'i');

  current.forEach((gr) => {
    if (gr.receipt_number) {
      const match = regex.exec(gr.receipt_number);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  });

  const nextSeq = maxSeq + 1;
  return `GR-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
};

// ======================= API FUNCTIONS =======================

export async function getGoodsReceipts(
  params?: GoodsReceiptFilterParams
): Promise<{ data: GoodsReceipt[]; total: number }> {
  try {
    const response = await api.get('/goods-receipts', { params });
    if (response.data && response.data.success && response.data.data) {
      const paginated = response.data.data;
      const apiList: GoodsReceipt[] = Array.isArray(paginated) ? paginated : (paginated.data || []);
      
      // Merge with locally stored receipts for full details
      const local = getLocalGoodsReceipts();
      const merged = apiList.map((item) => {
        const cached = local.find((l) => l.id === item.id || l.receipt_number === item.receipt_number);
        return cached ? { ...cached, ...item, items: cached.items || item.items } : item;
      });

      // Include local ones not yet in paginated response
      local.forEach((loc) => {
        if (!merged.some((m) => m.id === loc.id || m.receipt_number === loc.receipt_number)) {
          merged.push(loc);
        }
      });

      saveLocalGoodsReceipts(merged);
      return { data: merged, total: merged.length };
    }
  } catch (err) {
    console.warn('Backend API /goods-receipts unreachable, loading from resilient local tenant store:', err);
  }

  // Fallback to local store
  const tenantId = getActiveTenantId();
  let list = getLocalGoodsReceipts();
  
  if (tenantId) {
    list = list.filter((gr) => gr.company_id === tenantId || gr.company_id === 1);
  }

  if (params?.search) {
    const q = params.search.toLowerCase();
    list = list.filter((gr) => 
      gr.receipt_number.toLowerCase().includes(q) ||
      gr.purchase_order?.po_number?.toLowerCase().includes(q) ||
      gr.purchaseOrder?.po_number?.toLowerCase().includes(q) ||
      gr.supplier?.name.toLowerCase().includes(q) ||
      gr.warehouse?.name.toLowerCase().includes(q)
    );
  }

  if (params?.status && params.status !== 'ALL') {
    list = list.filter((gr) => gr.status === params.status);
  }

  return { data: list, total: list.length };
}

export async function getGoodsReceipt(id: number): Promise<{ data: GoodsReceipt }> {
  try {
    const response = await api.get(`/goods-receipts/${id}`);
    if (response.data && response.data.success && response.data.data) {
      return { data: response.data.data };
    }
  } catch (err) {
    console.warn(`Backend API /goods-receipts/${id} unreachable, checking local store:`, err);
  }

  const list = getLocalGoodsReceipts();
  const found = list.find((gr) => gr.id === Number(id));
  if (!found) {
    throw new Error(`Goods Receipt #${id} not found.`);
  }
  return { data: found };
}

export async function createGoodsReceipt(
  payload: CreateGoodsReceiptPayload
): Promise<{ success: boolean; data: GoodsReceipt; message?: string }> {
  try {
    const response = await api.post('/goods-receipts', payload);
    if (response.data && response.data.success) {
      const created: GoodsReceipt = response.data.data;
      const list = getLocalGoodsReceipts();
      saveLocalGoodsReceipts([created, ...list.filter((r) => r.id !== created.id)]);
      return { success: true, data: created, message: 'Goods receipt created successfully as draft.' };
    }
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || err.message || 'Failed to create Goods Receipt';
    throw new Error(errorMsg);
  }

  throw new Error('Failed to create Goods Receipt');
}

export async function postGoodsReceipt(
  id: number
): Promise<{ success: boolean; data: GoodsReceipt; message?: string }> {
  try {
    const response = await api.post(`/goods-receipts/${id}/post`);
    if (response.data && response.data.success) {
      const posted: GoodsReceipt = response.data.data;
      const list = getLocalGoodsReceipts();
      const updated = list.map((r) => (r.id === Number(id) ? { ...r, ...posted, status: 'POSTED' as const } : r));
      saveLocalGoodsReceipts(updated);
      return { success: true, data: posted, message: 'Goods receipt posted successfully to inventory and accounts.' };
    }
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || err.message || 'Failed to post Goods Receipt';
    throw new Error(errorMsg);
  }

  throw new Error('Failed to post Goods Receipt');
}
