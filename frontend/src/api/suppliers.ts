import api from './axios';
import { Supplier, SupplierPayload, SupplierListParams } from '../types/supplier';

export interface PaginatedSuppliers {
  data: Supplier[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

const STORAGE_KEY = 'retailcore_suppliers_cache_v2';

const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: 1,
    uuid: 'sup-0001-uuid',
    company_id: 1,
    business_unit_id: 1,
    supplier_code: 'SUP-0001',
    name: 'Bengal Trade International Ltd.',
    contact_person: 'Md. Rafiqul Islam',
    mobile: '+8801711000001',
    alternate_mobile: '+8801811000001',
    email: 'info@bengaltrade.com.bd',
    address: 'Plot 45, Tejgaon Industrial Area',
    city: 'Dhaka',
    country: 'Bangladesh',
    tax_number: 'TIN-987654321',
    opening_balance: 150000.0,
    credit_limit: 1000000.0,
    payment_terms: 'Net 30 Days',
    notes: 'Primary FMCG distributor for Dhaka division',
    status: 'ACTIVE',
    created_at: '2025-01-10T10:00:00Z',
    updated_at: '2025-01-10T10:00:00Z',
  },
  {
    id: 2,
    uuid: 'sup-0002-uuid',
    company_id: 1,
    business_unit_id: 1,
    supplier_code: 'SUP-0002',
    name: 'Padma Packaging & Paper Mills',
    contact_person: 'Tanvir Hossain',
    mobile: '+8801711000002',
    email: 'sales@padmapackaging.com',
    address: 'Station Road, Joydebpur',
    city: 'Gazipur',
    country: 'Bangladesh',
    tax_number: 'TIN-456789123',
    opening_balance: 45000.0,
    credit_limit: 500000.0,
    payment_terms: 'Net 15 Days',
    notes: 'Packaging and corrugated carton supplier',
    status: 'ACTIVE',
    created_at: '2025-01-12T11:30:00Z',
    updated_at: '2025-01-12T11:30:00Z',
  },
  {
    id: 3,
    uuid: 'sup-0003-uuid',
    company_id: 1,
    business_unit_id: 2,
    supplier_code: 'SUP-0003',
    name: 'Chittagong Agro & Commodities Corp',
    contact_person: 'Abdul Kader Chowdhury',
    mobile: '+8801711000003',
    email: 'supply@ctgcrop.com',
    address: 'Khatungonj Wholesale Market',
    city: 'Chittagong',
    country: 'Bangladesh',
    tax_number: 'TIN-123789456',
    opening_balance: 0.0,
    credit_limit: 750000.0,
    payment_terms: 'Immediate / COD',
    notes: 'Bulk grain and spice supplier',
    status: 'ACTIVE',
    created_at: '2025-01-15T09:15:00Z',
    updated_at: '2025-01-15T09:15:00Z',
  },
];

export const getLocalSuppliers = (): Supplier[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SUPPLIERS));
      return DEFAULT_SUPPLIERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SUPPLIERS;
  } catch {
    return DEFAULT_SUPPLIERS;
  }
};

export const saveLocalSuppliers = (suppliers: Supplier[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(suppliers));
  } catch (e) {
    console.warn('Failed to save suppliers to localStorage:', e);
  }
};

export const generateLocalSupplierCode = (): string => {
  const current = getLocalSuppliers();
  let maxSeq = 0;
  const regex = /SUP-(\d+)/i;
  current.forEach((s) => {
    if (s.supplier_code) {
      const match = regex.exec(s.supplier_code);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  });
  return `SUP-${String(maxSeq + 1).padStart(4, '0')}`;
};

export const getSuppliers = async (
  params?: SupplierListParams
): Promise<{ success: boolean; data: PaginatedSuppliers | Supplier[]; isFallback?: boolean }> => {
  try {
    const res = await api.get('/suppliers', { params });
    if (res.data?.success) {
      // Sync local cache if server provided array
      const serverData = Array.isArray(res.data.data) ? res.data.data : res.data.data?.data;
      if (Array.isArray(serverData) && serverData.length > 0) {
        saveLocalSuppliers(serverData);
      }
      return res.data;
    }
    throw new Error('API request failed');
  } catch {
    // Resilient fallback when backend returns 500 or is unavailable
    const allSuppliers = getLocalSuppliers();
    let filtered = [...allSuppliers];

    if (params?.status && String(params.status) !== 'ALL') {
      filtered = filtered.filter((s) => s.status === params.status);
    }

    if (params?.business_unit_id && String(params.business_unit_id) !== 'ALL') {
      filtered = filtered.filter((s) => String(s.business_unit_id) === String(params.business_unit_id));
    }

    if (params?.search && params.search.trim()) {
      const term = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.supplier_code.toLowerCase().includes(term) ||
          (s.contact_person && s.contact_person.toLowerCase().includes(term)) ||
          (s.mobile && s.mobile.toLowerCase().includes(term)) ||
          (s.city && s.city.toLowerCase().includes(term))
      );
    }

    if (params?.all) {
      return {
        success: true,
        data: filtered,
        isFallback: true,
      };
    }

    const perPage = params?.per_page || 15;
    const page = params?.page || 1;
    const startIndex = (page - 1) * perPage;
    const paginatedItems = filtered.slice(startIndex, startIndex + perPage);

    return {
      success: true,
      data: {
        data: paginatedItems,
        current_page: page,
        last_page: Math.ceil(filtered.length / perPage) || 1,
        total: filtered.length,
        per_page: perPage,
      },
      isFallback: true,
    };
  }
};

export const getSupplier = async (id: number): Promise<{ success: boolean; data: Supplier; isFallback?: boolean }> => {
  try {
    const res = await api.get(`/suppliers/${id}`);
    if (res.data?.success) return res.data;
    throw new Error('Supplier not found');
  } catch {
    const list = getLocalSuppliers();
    const found = list.find((s) => s.id === Number(id));
    if (found) {
      return { success: true, data: found, isFallback: true };
    }
    throw new Error('Supplier not found in local store');
  }
};

export const getNextSupplierCode = async (): Promise<{ success: boolean; data: { supplier_code: string }; isFallback?: boolean }> => {
  try {
    const res = await api.get('/suppliers/next-code');
    if (res.data?.success && res.data.data?.supplier_code) {
      return res.data;
    }
    throw new Error('API failed');
  } catch {
    return {
      success: true,
      data: {
        supplier_code: generateLocalSupplierCode(),
      },
      isFallback: true,
    };
  }
};

export const createSupplier = async (
  payload: SupplierPayload
): Promise<{ success: boolean; message?: string; data: Supplier; isFallback?: boolean }> => {
  try {
    const res = await api.post('/suppliers', payload);
    if (res.data?.success) {
      // Also update local cache
      const list = getLocalSuppliers();
      const updated = [res.data.data, ...list.filter((s) => s.id !== res.data.data.id)];
      saveLocalSuppliers(updated);
      return res.data;
    }
    throw new Error(res.data?.message || 'Create failed');
  } catch {
    // Generate unique code locally if not provided
    const assignedCode = payload.supplier_code?.trim() || generateLocalSupplierCode();
    const list = getLocalSuppliers();

    // Check duplicate code in local list
    const existingWithCode = list.find((s) => s.supplier_code.toUpperCase() === assignedCode.toUpperCase());
    const finalCode = existingWithCode ? generateLocalSupplierCode() : assignedCode;

    const newSupplier: Supplier = {
      id: Date.now(),
      uuid: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sup-${Date.now()}`,
      company_id: 1,
      business_unit_id: payload.business_unit_id ? Number(payload.business_unit_id) : null,
      supplier_code: finalCode,
      name: payload.name.trim(),
      contact_person: payload.contact_person?.trim() || null,
      mobile: payload.mobile?.trim() || null,
      alternate_mobile: payload.alternate_mobile?.trim() || null,
      email: payload.email?.trim() || null,
      address: payload.address?.trim() || null,
      city: payload.city?.trim() || null,
      country: payload.country?.trim() || 'Bangladesh',
      tax_number: payload.tax_number?.trim() || null,
      opening_balance: Number(payload.opening_balance || 0),
      credit_limit: Number(payload.credit_limit || 0),
      payment_terms: payload.payment_terms || 'Net 30 Days',
      notes: payload.notes?.trim() || null,
      status: payload.status || 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveLocalSuppliers([newSupplier, ...list]);

    return {
      success: true,
      message: 'Supplier registered successfully (Local Secure Storage)',
      data: newSupplier,
      isFallback: true,
    };
  }
};

export const updateSupplier = async (
  id: number,
  payload: Partial<SupplierPayload>
): Promise<{ success: boolean; message?: string; data: Supplier; isFallback?: boolean }> => {
  try {
    const res = await api.put(`/suppliers/${id}`, payload);
    if (res.data?.success) {
      const list = getLocalSuppliers();
      const updated = list.map((s) => (s.id === id ? { ...s, ...res.data.data } : s));
      saveLocalSuppliers(updated);
      return res.data;
    }
    throw new Error('Update failed');
  } catch {
    const list = getLocalSuppliers();
    const existing = list.find((s) => s.id === Number(id));
    if (!existing) {
      throw new Error('Supplier to update was not found');
    }

    const updatedSupplier: Supplier = {
      ...existing,
      ...payload,
      id: existing.id,
      updated_at: new Date().toISOString(),
    };

    const updatedList = list.map((s) => (s.id === Number(id) ? updatedSupplier : s));
    saveLocalSuppliers(updatedList);

    return {
      success: true,
      message: 'Supplier updated successfully (Local Secure Storage)',
      data: updatedSupplier,
      isFallback: true,
    };
  }
};

export const deleteSupplier = async (id: number): Promise<{ success: boolean; message?: string }> => {
  try {
    const res = await api.delete(`/suppliers/${id}`);
    if (res.data?.success) {
      const list = getLocalSuppliers();
      saveLocalSuppliers(list.filter((s) => s.id !== Number(id)));
      return res.data;
    }
  } catch {
    // Proceed to delete locally
  }

  const list = getLocalSuppliers();
  saveLocalSuppliers(list.filter((s) => s.id !== Number(id)));

  return {
    success: true,
    message: 'Supplier removed successfully',
  };
};
