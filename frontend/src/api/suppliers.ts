import api from './axios';
import { Supplier, SupplierPayload, SupplierListParams } from '../types/supplier';

export interface PaginatedSuppliers {
  data: Supplier[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export const getSuppliers = async (params?: SupplierListParams): Promise<{ success: boolean; data: PaginatedSuppliers | Supplier[] }> => {
  const res = await api.get('/suppliers', { params });
  return res.data;
};

export const getSupplier = async (id: number): Promise<{ success: boolean; data: Supplier }> => {
  const res = await api.get(`/suppliers/${id}`);
  return res.data;
};

export const createSupplier = async (payload: SupplierPayload): Promise<{ success: boolean; message?: string; data: Supplier }> => {
  const res = await api.post('/suppliers', payload);
  return res.data;
};

export const updateSupplier = async (id: number, payload: Partial<SupplierPayload>): Promise<{ success: boolean; message?: string; data: Supplier }> => {
  const res = await api.put(`/suppliers/${id}`, payload);
  return res.data;
};

export const deleteSupplier = async (id: number): Promise<{ success: boolean; message?: string }> => {
  const res = await api.delete(`/suppliers/${id}`);
  return res.data;
};
