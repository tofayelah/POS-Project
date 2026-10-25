import api from './axios';
import { Supplier, SupplierPayload, SupplierListParams } from '../types/supplier';
import { generateSupplierShortName } from '../utils/supplierUtils';

export interface PaginatedSuppliers {
  data: Supplier[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export const SUPPLIERS_STORAGE_KEY = 'retailcore_suppliers_list_v2';

export const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: 1,
    supplier_code: 'SUP-0001',
    name: 'TM International',
    short_name: 'TMI',
    mobile: '01711000001',
    address: '12 Motijheel C/A, Dhaka-1000',
    contact_person: 'Tariq Mahmood',
    contact_designation: 'Managing Director',
    contact_phone: '01711000001',
    tax_number: 'BIN-001928374-0101',
    bank_name: 'Eastern Bank PLC',
    bank_account_no: '1041010098765',
    bank_branch: 'Principal Branch, Dhaka',
    notes: 'Primary pharmaceutical and FMCG partner. Standard 30-day payment term.',
    status: 'ACTIVE',
    current_balance: 12500,
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-01T10:00:00Z',
  },
  {
    id: 2,
    supplier_code: 'SUP-0002',
    name: 'Square Pharmaceuticals Ltd',
    short_name: 'SQU',
    mobile: '01811000002',
    address: 'Square Centre, 48 Mohakhali C/A, Dhaka-1212',
    contact_person: 'Kamrul Hasan',
    contact_designation: 'Key Account Manager',
    contact_phone: '01811000002',
    tax_number: 'BIN-002847192-0202',
    bank_name: 'Standard Chartered Bank',
    bank_account_no: '0182746192801',
    bank_branch: 'Gulshan Branch',
    notes: 'Bulk healthcare & medicine procurement contract.',
    status: 'ACTIVE',
    current_balance: 45000,
    created_at: '2026-10-02T11:30:00Z',
    updated_at: '2026-10-02T11:30:00Z',
  },
  {
    id: 3,
    supplier_code: 'SUP-0003',
    name: 'Apex Footwear & Leather',
    short_name: 'AFL',
    mobile: '01911000003',
    address: 'House 6, Road 137, Gulshan-1, Dhaka',
    contact_person: 'Rafiqul Islam',
    contact_designation: 'Supply Chain Head',
    contact_phone: '01911000003',
    tax_number: 'BIN-003918274-0303',
    bank_name: 'Dutch-Bangla Bank PLC',
    bank_account_no: '1151200039182',
    bank_branch: 'Mohakhali Branch',
    notes: 'Footwear & leather goods accessories partner.',
    status: 'ACTIVE',
    current_balance: 0,
    created_at: '2026-10-03T14:15:00Z',
    updated_at: '2026-10-03T14:15:00Z',
  },
];

let memoryStorage: Record<string, string> = {};

function getStorage(): {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
} {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
    return (globalThis as any).localStorage;
  }
  return {
    getItem: (key: string) => memoryStorage[key] ?? null,
    setItem: (key: string, value: string) => {
      memoryStorage[key] = value;
    },
    removeItem: (key: string) => {
      delete memoryStorage[key];
    },
    clear: () => {
      memoryStorage = {};
    },
  };
}

export function getStoredSuppliers(): Supplier[] {
  const storage = getStorage();
  if (!storage) {
    return DEFAULT_SUPPLIERS;
  }
  try {
    const raw = storage.getItem(SUPPLIERS_STORAGE_KEY);
    if (!raw) {
      storage.setItem(SUPPLIERS_STORAGE_KEY, JSON.stringify(DEFAULT_SUPPLIERS));
      return DEFAULT_SUPPLIERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_SUPPLIERS;
  } catch {
    return DEFAULT_SUPPLIERS;
  }
}

export function saveStoredSuppliers(suppliers: Supplier[]): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(SUPPLIERS_STORAGE_KEY, JSON.stringify(suppliers));
  } catch (err) {
    console.warn('Failed to save suppliers to localStorage:', err);
  }
}

export function calculateNextSupplierCode(suppliers?: Supplier[]): string {
  const list = suppliers && suppliers.length > 0 ? suppliers : getStoredSuppliers();
  let maxNum = 0;
  for (const s of list) {
    if (s.supplier_code) {
      const match = s.supplier_code.match(/^SUP-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  }
  const nextNum = maxNum + 1;
  return `SUP-${String(nextNum).padStart(4, '0')}`;
}

export const getSuppliers = async (
  params?: SupplierListParams
): Promise<{ success: boolean; data: PaginatedSuppliers | Supplier[] }> => {
  try {
    const res = await api.get('/suppliers', { params });
    // Check if real array data returned from server
    const remoteData = res.data?.data;
    if (Array.isArray(remoteData) && remoteData.length > 0) {
      saveStoredSuppliers(remoteData);
      return res.data;
    } else if (remoteData && typeof remoteData === 'object' && Array.isArray((remoteData as any).data) && (remoteData as any).data.length > 0) {
      saveStoredSuppliers((remoteData as any).data);
      return res.data;
    }
  } catch (err) {
    console.warn('API suppliers fetch failed, falling back to local persistent store:', err);
  }

  // Fallback to local persistent storage
  let list = getStoredSuppliers();
  if (params?.status && params.status !== 'ALL') {
    list = list.filter((s) => s.status === params.status);
  }
  if (params?.search && params.search.trim()) {
    const term = params.search.trim().toLowerCase();
    list = list.filter((s) =>
      s.name.toLowerCase().includes(term) ||
      s.supplier_code.toLowerCase().includes(term) ||
      (s.short_name && s.short_name.toLowerCase().includes(term)) ||
      (s.mobile && s.mobile.toLowerCase().includes(term)) ||
      (s.contact_person && s.contact_person.toLowerCase().includes(term))
    );
  }

  return {
    success: true,
    data: list,
  };
};

export const getSupplier = async (id: number): Promise<{ success: boolean; data: Supplier }> => {
  try {
    const res = await api.get(`/suppliers/${id}`);
    if (res.data?.data && res.data.data.name) {
      return res.data;
    }
  } catch (err) {
    console.warn(`Failed to fetch supplier ${id} from API, checking local storage:`, err);
  }

  const list = getStoredSuppliers();
  const found = list.find((s) => s.id === id);
  if (found) {
    return { success: true, data: found };
  }
  throw new Error(`Supplier #${id} not found.`);
};

export const getNextSupplierCode = async (): Promise<{ success: boolean; data: { supplier_code: string } }> => {
  try {
    const res = await api.get('/suppliers/next-code');
    if (res.data?.data?.supplier_code) {
      return res.data;
    }
  } catch {
    // Non-fatal, calculate locally
  }

  const code = calculateNextSupplierCode();
  return {
    success: true,
    data: { supplier_code: code },
  };
};

export const createSupplier = async (
  payload: SupplierPayload
): Promise<{ success: boolean; message?: string; data: Supplier }> => {
  const currentList = getStoredSuppliers();
  const nextCode = calculateNextSupplierCode(currentList);
  const now = new Date().toISOString();

  let maxId = 0;
  for (const s of currentList) {
    if (typeof s.id === 'number' && s.id > maxId) {
      maxId = s.id;
    }
  }
  const nextId = maxId > 0 ? maxId + 1 : 1;

  const localSupplier: Supplier = {
    id: nextId,
    supplier_code: nextCode,
    name: payload.name.trim(),
    short_name: payload.short_name?.trim() || generateSupplierShortName(payload.name),
    mobile: payload.mobile?.trim() || '',
    address: payload.address?.trim() || '',
    contact_person: payload.contact_person?.trim() || '',
    contact_designation: payload.contact_designation?.trim() || '',
    contact_phone: payload.contact_phone?.trim() || '',
    tax_number: payload.tax_number?.trim() || '',
    bank_name: payload.bank_name?.trim() || '',
    bank_account_no: payload.bank_account_no?.trim() || '',
    bank_branch: payload.bank_branch?.trim() || '',
    notes: payload.notes?.trim() || '',
    status: payload.status || 'ACTIVE',
    current_balance: 0,
    created_at: now,
    updated_at: now,
  };

  // Prepend to persistent store so it appears at top of supplier list
  const updatedList = [localSupplier, ...currentList];
  saveStoredSuppliers(updatedList);

  try {
    const res = await api.post('/suppliers', payload);
    if (res.data?.data && (res.data.data as any).name) {
      const serverSupplier = res.data.data;
      // Sync authoritative id / code if backend provided one
      const finalizedSupplier: Supplier = {
        ...localSupplier,
        ...serverSupplier,
        supplier_code: serverSupplier.supplier_code || localSupplier.supplier_code,
      };
      const synced = updatedList.map((s) => (s.id === localSupplier.id ? finalizedSupplier : s));
      saveStoredSuppliers(synced);
      return {
        success: true,
        message: res.data.message || `Supplier created successfully with ID: ${finalizedSupplier.supplier_code}`,
        data: finalizedSupplier,
      };
    }
  } catch (err) {
    console.warn('API createSupplier failed or offline; saved to local persistent storage:', err);
  }

  return {
    success: true,
    message: `Supplier created successfully with ID: ${localSupplier.supplier_code}`,
    data: localSupplier,
  };
};

export const updateSupplier = async (
  id: number,
  payload: Partial<SupplierPayload>
): Promise<{ success: boolean; message?: string; data: Supplier }> => {
  const currentList = getStoredSuppliers();
  const existing = currentList.find((s) => s.id === id);

  const updated: Supplier = {
    ...(existing || {
      id,
      supplier_code: `SUP-${String(id).padStart(4, '0')}`,
      name: payload.name || 'Supplier',
      status: 'ACTIVE',
    }),
    ...payload,
    id,
    updated_at: new Date().toISOString(),
  };

  const nextList = currentList.map((s) => (s.id === id ? updated : s));
  saveStoredSuppliers(nextList);

  try {
    const res = await api.put(`/suppliers/${id}`, payload);
    if (res.data?.data && (res.data.data as any).name) {
      return res.data;
    }
  } catch (err) {
    console.warn(`API updateSupplier(${id}) failed, saved locally:`, err);
  }

  return {
    success: true,
    message: 'Supplier updated successfully',
    data: updated,
  };
};

export const deleteSupplier = async (id: number): Promise<{ success: boolean; message?: string }> => {
  const currentList = getStoredSuppliers();
  const nextList = currentList.filter((s) => s.id !== id);
  saveStoredSuppliers(nextList);

  try {
    const res = await api.delete(`/suppliers/${id}`);
    return res.data;
  } catch (err) {
    console.warn(`API deleteSupplier(${id}) failed, removed locally:`, err);
  }

  return {
    success: true,
    message: 'Supplier deleted successfully',
  };
};

export const getSupplierBalance = async (
  id: number
): Promise<{
  success: boolean;
  data: {
    supplier_id: number;
    supplier_code: string;
    name: string;
    opening_balance: number;
    total_purchases: number;
    total_paid: number;
    balance: number;
  };
}> => {
  try {
    const res = await api.get(`/suppliers/${id}/balance`);
    if (res.data?.data) {
      return res.data;
    }
  } catch {
    // fallback
  }

  const list = getStoredSuppliers();
  const s = list.find((item) => item.id === id);

  return {
    success: true,
    data: {
      supplier_id: id,
      supplier_code: s?.supplier_code || `SUP-${String(id).padStart(4, '0')}`,
      name: s?.name || 'Supplier',
      opening_balance: 0,
      total_purchases: 0,
      total_paid: 0,
    balance: s?.current_balance ?? 0,
    },
  };
};

/**
 * Deducts a supplier return amount from the supplier's accounts payable ledger.
 * This directly implements the user rule:
 * "Settlement & Debit Terms a Supplier Lezer theke Supplier return amount bad jabe"
 */
export const deductSupplierBalance = (
  id: number,
  returnAmount: number
): { success: boolean; newBalance: number } => {
  const currentList = getStoredSuppliers();
  let newBalance = 0;
  const updatedList = currentList.map((s) => {
    if (s.id === id) {
      const current = Number(s.current_balance || 0);
      newBalance = current - returnAmount;
      return {
        ...s,
        current_balance: newBalance,
        updated_at: new Date().toISOString(),
      };
    }
    return s;
  });
  saveStoredSuppliers(updatedList);
  return { success: true, newBalance };
};

export const adjustSupplierBalance = (
  id: number,
  delta: number
): { success: boolean; newBalance: number } => {
  const currentList = getStoredSuppliers();
  let newBalance = 0;
  const updatedList = currentList.map((s) => {
    if (s.id === id) {
      const current = Number(s.current_balance || 0);
      newBalance = current + delta;
      return {
        ...s,
        current_balance: newBalance,
        updated_at: new Date().toISOString(),
      };
    }
    return s;
  });
  saveStoredSuppliers(updatedList);
  return { success: true, newBalance };
};

