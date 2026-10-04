import api from './axios';
import { 
  PurchaseOrder, 
  CreatePurchaseOrderPayload, 
  PurchaseOrderFilterParams 
} from '../types/purchase';

export async function getPurchaseOrders(
  params?: PurchaseOrderFilterParams
): Promise<{ data: PurchaseOrder[]; total: number }> {
  const response = await api.get('/purchase-orders', { params });
  const resData = response.data?.data;
  if (Array.isArray(resData)) {
    return { data: resData, total: resData.length };
  }
  if (resData && Array.isArray(resData.data)) {
    return { data: resData.data, total: resData.total ?? resData.data.length };
  }
  return { data: [], total: 0 };
}

export async function getPurchaseOrder(id: number): Promise<{ data: PurchaseOrder }> {
  const response = await api.get(`/purchase-orders/${id}`);
  return { data: response.data?.data };
}

export async function createPurchaseOrder(
  payload: CreatePurchaseOrderPayload
): Promise<{ success: boolean; data: PurchaseOrder; message?: string }> {
  const response = await api.post('/purchase-orders', payload);
  return response.data;
}

export async function approvePurchaseOrder(
  id: number
): Promise<{ success: boolean; data: PurchaseOrder; message?: string }> {
  const response = await api.post(`/purchase-orders/${id}/approve`);
  return response.data;
}

export async function cancelPurchaseOrder(
  id: number
): Promise<{ success: boolean; data: PurchaseOrder; message?: string }> {
  const response = await api.post(`/purchase-orders/${id}/cancel`);
  return response.data;
}

export async function getNextPoNumber(): Promise<{ success: boolean; data: { po_number: string } }> {
  const response = await api.get('/purchase-orders/next-number');
  return response.data;
}
