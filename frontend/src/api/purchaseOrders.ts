import api from './axios';
import { 
  PurchaseOrder, 
  CreatePurchaseOrderPayload, 
  PurchaseOrderFilterParams 
} from '../types/purchase';
import { isDemoOrPreviewMode, extractApiError } from '../utils/env';

export async function getPurchaseOrders(
  params?: PurchaseOrderFilterParams
): Promise<{ data: PurchaseOrder[]; total: number; is_demo_fallback?: boolean; error?: string }> {
  try {
    const response = await api.get('/purchase-orders', { params });
    const resData = response.data?.data;
    if (Array.isArray(resData)) {
      return { data: resData, total: resData.length };
    }
    if (resData && Array.isArray(resData.data)) {
      return { data: resData.data, total: resData.total ?? resData.data.length };
    }
  } catch (err) {
    if (!isDemoOrPreviewMode()) {
      const errInfo = extractApiError(err);
      return { data: [], total: 0, error: errInfo.message };
    }
  }
  return { data: [], total: 0, is_demo_fallback: true };
}

export async function getPurchaseOrder(id: number): Promise<{ data: PurchaseOrder; is_demo_fallback?: boolean; error?: string }> {
  try {
    const response = await api.get(`/purchase-orders/${id}`);
    if (response.data?.data) {
      return { data: response.data.data };
    }
  } catch (err) {
    if (isDemoOrPreviewMode()) {
      return {
        is_demo_fallback: true,
        data: {
          id,
          po_number: `PO-2026-${String(id).padStart(4, '0')}`,
          supplier_id: 1,
          order_date: new Date().toISOString().split('T')[0],
          total_amount: 0,
          status: 'DRAFT',
          items: [],
        } as any,
      };
    }
    const errInfo = extractApiError(err);
    return { data: {} as any, error: errInfo.message };
  }
  return {
    is_demo_fallback: true,
    data: {
      id,
      po_number: `PO-2026-${String(id).padStart(4, '0')}`,
      supplier_id: 1,
      order_date: new Date().toISOString().split('T')[0],
      total_amount: 0,
      status: 'DRAFT',
      items: [],
    } as any,
  };
}

export async function createPurchaseOrder(
  payload: CreatePurchaseOrderPayload
): Promise<{ success: boolean; data?: PurchaseOrder; message?: string; error?: string }> {
  try {
    const response = await api.post('/purchase-orders', payload);
    return response.data;
  } catch (err) {
    const errInfo = extractApiError(err);
    return {
      success: false,
      message: errInfo.message,
      error: errInfo.message,
    };
  }
}

export async function updatePurchaseOrder(
  id: number | string,
  payload: CreatePurchaseOrderPayload
): Promise<{ success: boolean; data?: PurchaseOrder; message?: string; error?: string }> {
  try {
    const response = await api.put(`/purchase-orders/${id}`, payload);
    return response.data;
  } catch (err) {
    const errInfo = extractApiError(err);
    return {
      success: false,
      message: errInfo.message,
      error: errInfo.message,
    };
  }
}

export async function approvePurchaseOrder(
  id: number
): Promise<{ success: boolean; data?: PurchaseOrder; message?: string; error?: string }> {
  try {
    const response = await api.post(`/purchase-orders/${id}/approve`);
    return response.data;
  } catch (err) {
    const errInfo = extractApiError(err);
    return {
      success: false,
      message: errInfo.message,
      error: errInfo.message,
    };
  }
}

export async function cancelPurchaseOrder(
  id: number
): Promise<{ success: boolean; data?: PurchaseOrder; message?: string; error?: string }> {
  try {
    const response = await api.post(`/purchase-orders/${id}/cancel`);
    return response.data;
  } catch (err) {
    const errInfo = extractApiError(err);
    return {
      success: false,
      message: errInfo.message,
      error: errInfo.message,
    };
  }
}

export async function getNextPoNumber(): Promise<{ success: boolean; data: { po_number: string }; is_demo_fallback?: boolean; error?: string }> {
  try {
    const response = await api.get('/purchase-orders/next-number');
    if (response.data?.data?.po_number) return response.data;
    if (response.data?.po_number) return { success: true, data: { po_number: response.data.po_number } };
  } catch (err) {
    // Return fallback number formatted according to standard PO numbering convention
  }
  return {
    success: true,
    is_demo_fallback: true,
    data: { po_number: `PO-${new Date().getFullYear()}-${Math.floor(Math.random() * 8999 + 1000)}` },
  };
}
