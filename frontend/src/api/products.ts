import api from './axios';
import {
  Category,
  Brand,
  Unit,
  Attribute,
  Product,
  ProductVariant,
  Barcode,
  ProductPayload,
  ProductFilterParams,
} from '../types/product';

// --- Categories ---
export async function getCategories(params?: { search?: string; status?: string; parent_id?: string | number; all?: boolean }) {
  const response = await api.get('/categories', { params });
  return response.data;
}

export async function getCategory(id: number) {
  const response = await api.get(`/categories/${id}`);
  return response.data;
}

export async function createCategory(data: Partial<Category>) {
  const response = await api.post('/categories', data);
  return response.data;
}

export async function updateCategory(id: number, data: Partial<Category>) {
  const response = await api.put(`/categories/${id}`, data);
  return response.data;
}

export async function deleteCategory(id: number) {
  const response = await api.delete(`/categories/${id}`);
  return response.data;
}

// --- Brands ---
export async function getBrands(params?: { search?: string; status?: string; all?: boolean }) {
  const response = await api.get('/brands', { params });
  return response.data;
}

export async function createBrand(data: Partial<Brand>) {
  const response = await api.post('/brands', data);
  return response.data;
}

export async function updateBrand(id: number, data: Partial<Brand>) {
  const response = await api.put(`/brands/${id}`, data);
  return response.data;
}

export async function deleteBrand(id: number) {
  const response = await api.delete(`/brands/${id}`);
  return response.data;
}

// --- Units ---
export async function getUnits(params?: { search?: string; status?: string; all?: boolean }) {
  const response = await api.get('/units', { params });
  return response.data;
}

export async function createUnit(data: Partial<Unit>) {
  const response = await api.post('/units', data);
  return response.data;
}

export async function updateUnit(id: number, data: Partial<Unit>) {
  const response = await api.put(`/units/${id}`, data);
  return response.data;
}

export async function deleteUnit(id: number) {
  const response = await api.delete(`/units/${id}`);
  return response.data;
}

// --- Attributes & Values ---
export async function getAttributes(params?: { search?: string; status?: string }) {
  const response = await api.get('/attributes', { params });
  return response.data;
}

export async function createAttribute(data: Partial<Attribute>) {
  const response = await api.post('/attributes', data);
  return response.data;
}

export async function updateAttribute(id: number, data: Partial<Attribute>) {
  const response = await api.put(`/attributes/${id}`, data);
  return response.data;
}

export async function deleteAttribute(id: number) {
  const response = await api.delete(`/attributes/${id}`);
  return response.data;
}

// --- Products Master ---
export async function getProducts(params?: ProductFilterParams) {
  const response = await api.get('/products', { params });
  return response.data;
}

export async function getProduct(id: number) {
  const response = await api.get(`/products/${id}`);
  return response.data;
}

export async function createProduct(payload: ProductPayload) {
  const response = await api.post('/products', payload);
  return response.data;
}

export async function updateProduct(id: number, payload: Partial<ProductPayload>) {
  const response = await api.put(`/products/${id}`, payload);
  return response.data;
}

export async function activateProduct(id: number) {
  const response = await api.post(`/products/${id}/activate`);
  return response.data;
}

export async function deactivateProduct(id: number) {
  const response = await api.post(`/products/${id}/deactivate`);
  return response.data;
}

export async function deleteProduct(id: number) {
  const response = await api.delete(`/products/${id}`);
  return response.data;
}

// --- Variants ---
export async function getVariants(params?: { product_id?: number; search?: string; status?: string }) {
  const response = await api.get('/product-variants', { params });
  return response.data;
}

export async function updateVariant(id: number, data: Partial<ProductVariant>) {
  const response = await api.put(`/product-variants/${id}`, data);
  return response.data;
}

// --- Barcodes ---
export async function getBarcodes(params?: { product_variant_id?: number; barcode?: string; status?: string }) {
  const response = await api.get('/barcodes', { params });
  return response.data;
}

export async function lookupBarcode(code: string) {
  const response = await api.get(`/barcodes/lookup/${encodeURIComponent(code)}`);
  return response.data;
}

export async function createBarcode(data: Partial<Barcode>) {
  const response = await api.post('/barcodes', data);
  return response.data;
}

export async function setPrimaryBarcode(id: number) {
  const response = await api.post(`/barcodes/${id}/set-primary`);
  return response.data;
}

export async function deleteBarcode(id: number) {
  const response = await api.delete(`/barcodes/${id}`);
  return response.data;
}
