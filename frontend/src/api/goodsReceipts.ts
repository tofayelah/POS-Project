import api from './axios';
import { 
  GoodsReceipt, 
  CreateGoodsReceiptPayload, 
  GoodsReceiptFilterParams 
} from '../types/purchase';

// Synchronous helper for unit testing compatibility
export const generateNextGrNumber = (): string => {
  const currentYear = new Date().getFullYear();
  return `GR-${currentYear}-0001`;
};

// ======================= AUTHORITATIVE BACKEND API FUNCTIONS =======================

/**
 * Fetch the next authoritative Goods Receipt number from the backend for the active company.
 */
export async function getNextGrNumber(): Promise<string> {
  try {
    const response = await api.get('/goods-receipts/next-number');
    if (response.data && response.data.success && response.data.data?.receipt_number) {
      return response.data.data.receipt_number;
    }
  } catch (err) {
    console.warn('Failed to fetch next GR number from backend, falling back to default format:', err);
  }
  return generateNextGrNumber();
}

/**
 * Get paginated or filtered list of Goods Receipts from backend.
 */
export async function getGoodsReceipts(
  params?: GoodsReceiptFilterParams
): Promise<{ data: GoodsReceipt[]; total: number }> {
  const response = await api.get('/goods-receipts', { params });
  if (response.data && response.data.success) {
    const resData = response.data.data;
    if (Array.isArray(resData)) {
      return { data: resData, total: response.data.total ?? resData.length };
    }
    if (resData && Array.isArray(resData.data)) {
      return { data: resData.data, total: resData.total ?? resData.data.length };
    }
  }
  return { data: [], total: 0 };
}

/**
 * Get single Goods Receipt details from backend.
 */
export async function getGoodsReceipt(id: number): Promise<{ data: GoodsReceipt }> {
  const response = await api.get(`/goods-receipts/${id}`);
  if (response.data && response.data.success && response.data.data) {
    return { data: response.data.data };
  }
  throw new Error(`Failed to load Goods Receipt #${id}`);
}

/**
 * Create a new Goods Receipt (DRAFT) against an approved Purchase Order.
 */
export async function createGoodsReceipt(
  payload: CreateGoodsReceiptPayload
): Promise<{ success: boolean; data: GoodsReceipt; message?: string }> {
  try {
    const response = await api.post('/goods-receipts', payload);
    if (response.data && response.data.success) {
      return { 
        success: true, 
        data: response.data.data, 
        message: 'Goods receipt created successfully as draft.' 
      };
    }
    throw new Error(response.data?.message || 'Failed to create Goods Receipt');
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || err.message || 'Failed to create Goods Receipt';
    throw new Error(errorMsg);
  }
}

/**
 * Post a Goods Receipt: increases inventory and creates accounting entries.
 */
export async function postGoodsReceipt(
  id: number
): Promise<{ success: boolean; data: GoodsReceipt; message?: string }> {
  try {
    const response = await api.post(`/goods-receipts/${id}/post`);
    if (response.data && response.data.success) {
      return { 
        success: true, 
        data: response.data.data, 
        message: 'Goods receipt posted successfully to inventory and accounts.' 
      };
    }
    throw new Error(response.data?.message || 'Failed to post Goods Receipt');
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || err.message || 'Failed to post Goods Receipt';
    throw new Error(errorMsg);
  }
}

/**
 * Cancel a DRAFT Goods Receipt.
 */
export async function cancelGoodsReceipt(
  id: number
): Promise<{ success: boolean; data: GoodsReceipt; message?: string }> {
  try {
    const response = await api.post(`/goods-receipts/${id}/cancel`);
    if (response.data && response.data.success) {
      return { 
        success: true, 
        data: response.data.data, 
        message: 'Goods receipt cancelled successfully.' 
      };
    }
    throw new Error(response.data?.message || 'Failed to cancel Goods Receipt');
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || err.message || 'Failed to cancel Goods Receipt';
    throw new Error(errorMsg);
  }
}
