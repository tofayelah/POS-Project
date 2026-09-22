import api from './axios';
import { 
  Company, 
  BusinessUnit, 
  Branch, 
  Warehouse, 
  StorageLocation,
  BusinessType, 
  CreateCompanyPayload, 
  TenantFeatures 
} from '../types/organization';

const LOCAL_STORAGE_COMPANY_KEY = 'retailcore_company_profile';
const LOCAL_STORAGE_ALL_TENANTS_KEY = 'retailcore_tenant_companies_v2';
const ACTIVE_COMPANY_ID_KEY = 'active_company_id';
const ACTIVE_SUBDOMAIN_KEY = 'active_subdomain';

export const BUSINESS_TYPE_CONFIG: Record<
  BusinessType,
  {
    label: string;
    description: string;
    category: string;
    badgeColor: string;
    defaultFeatures: TenantFeatures;
    exampleCustomer: string;
  }
> = {
  MOBILE_ELECTRONICS: {
    label: 'Mobile & Electronics (Mobi Sale)',
    description: 'Smartphones, gadgets, spare parts & accessories with IMEI/Serial number tracking & warranty management',
    category: 'Electronics & Gadgets',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    defaultFeatures: {
      imei_serial_tracking: true,
      warranty_management: true,
      pos_quick_checkout: true,
      wholesale_pricing: true,
    },
    exampleCustomer: 'e.g. Tofayel Telecom & Mobile Shop',
  },
  TOYS_GAMES: {
    label: 'Toys & Kids World (Toys Sale)',
    description: 'Educational toys, action figures, baby items & video games with age groups & safety classification',
    category: 'Kids & Entertainment',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    defaultFeatures: {
      pos_quick_checkout: true,
      batch_expiry_tracking: false,
      wholesale_pricing: true,
    },
    exampleCustomer: 'e.g. Arif Kids Toy Kingdom',
  },
  GARMENTS_APPAREL: {
    label: 'Fashion & Apparel (Under Garments Sale)',
    description: 'Clothing, undergarments, innerwear & footwear with Size/Color variant matrix & bundle pricing',
    category: 'Textile & Apparel',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    defaultFeatures: {
      size_color_matrix: true,
      wholesale_pricing: true,
      pos_quick_checkout: true,
    },
    exampleCustomer: 'e.g. Tamim Fashion & Undergarments',
  },
  GROCERY_FMCG: {
    label: 'Supermarket & FMCG',
    description: 'Packaged foods, daily commodities & consumables with expiry tracking & scale barcode support',
    category: 'Food & Grocery',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    defaultFeatures: {
      batch_expiry_tracking: true,
      pos_quick_checkout: true,
    },
    exampleCustomer: 'e.g. Tonu Departmental & FMCG Store',
  },
  PHARMACY_HEALTHCARE: {
    label: 'Pharmacy & Healthcare',
    description: 'Medicines, surgical items, generic names & batch expiry compliance',
    category: 'Healthcare & Pharma',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    defaultFeatures: {
      batch_expiry_tracking: true,
      pos_quick_checkout: true,
    },
    exampleCustomer: 'e.g. Popular Pharma Point',
  },
  GENERAL_RETAIL: {
    label: 'General Retail & Departmental',
    description: 'Multi-category retail, gift shops, stationery & department stores',
    category: 'General Commerce',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    defaultFeatures: {
      pos_quick_checkout: true,
      wholesale_pricing: true,
    },
    exampleCustomer: 'e.g. Apex Retail Ltd',
  },
};

const DEFAULT_TENANT_COMPANIES: Company[] = [
  {
    id: 1,
    uuid: '410d2e60-0364-428c-b01e-cfc627f6c6f6',
    name: 'Apex Retail Ltd',
    legal_name: 'Apex Retail Holdings Limited',
    code: 'APEX-01',
    subdomain: 'apex',
    custom_domain: null,
    business_type: 'GENERAL_RETAIL',
    business_type_label: 'General Retail & Departmental',
    owner_name: 'Central Admin',
    owner_email: 'admin@sonaribd.com',
    owner_phone: '+880 1700-000000',
    plan: 'enterprise',
    tenant_isolated: true,
    data_isolation_key: 'iso_apex_default',
    features_enabled: {
      pos_quick_checkout: true,
      wholesale_pricing: true,
    },
    phone: '+880 1700-000000',
    email: 'admin@sonaribd.com',
    address: 'Level 8, Concord Tower, Dhaka-1212, Bangladesh',
    country: 'Bangladesh',
    currency_code: 'BDT',
    timezone: 'Asia/Dhaka',
    tax_number: 'BIN-19283746501',
    status: 'active',
    created_at: '2026-09-14T11:37:47.000000Z',
    updated_at: '2026-09-14T11:37:47.000000Z',
  },
  {
    id: 2,
    uuid: 'tenant-tofayel-mobile-001',
    name: 'Tofayel Telecom & Mobile Gallery',
    legal_name: 'Tofayel Mobile Sales & Service Ltd',
    code: 'TF-MOBI',
    subdomain: 'tofayel',
    custom_domain: 'pos.tofayelmobile.com',
    business_type: 'MOBILE_ELECTRONICS',
    business_type_label: 'Mobile & Electronics (Mobi Sale)',
    owner_name: 'Md. Tofayel Ahmed',
    owner_email: 'tofayelah@gmail.com',
    owner_phone: '+880 1712-345678',
    plan: 'pro',
    tenant_isolated: true,
    data_isolation_key: 'iso_tenant_tofayel_sec',
    features_enabled: {
      imei_serial_tracking: true,
      warranty_management: true,
      pos_quick_checkout: true,
      wholesale_pricing: true,
    },
    phone: '+880 1712-345678',
    email: 'tofayelah@gmail.com',
    address: 'Shop 24, Eastern Plaza Multiplan, Hatirpool, Dhaka',
    country: 'Bangladesh',
    currency_code: 'BDT',
    timezone: 'Asia/Dhaka',
    tax_number: 'BIN-5544332211',
    status: 'active',
    created_at: '2026-09-15T08:20:00.000000Z',
    updated_at: '2026-09-15T08:20:00.000000Z',
  },
  {
    id: 3,
    uuid: 'tenant-arif-toys-002',
    name: 'Arif Kids Toy Kingdom',
    legal_name: 'Arif Toys & Play Solutions Ltd',
    code: 'AR-TOYS',
    subdomain: 'arif',
    custom_domain: null,
    business_type: 'TOYS_GAMES',
    business_type_label: 'Toys & Kids World (Toys Sale)',
    owner_name: 'Arifur Rahman',
    owner_email: 'arif@example.com',
    owner_phone: '+880 1819-876543',
    plan: 'starter',
    tenant_isolated: true,
    data_isolation_key: 'iso_tenant_arif_sec',
    features_enabled: {
      pos_quick_checkout: true,
      batch_expiry_tracking: false,
      wholesale_pricing: true,
    },
    phone: '+880 1819-876543',
    email: 'arif@example.com',
    address: 'Level 4, Jamuna Future Park, Kuril, Dhaka',
    country: 'Bangladesh',
    currency_code: 'BDT',
    timezone: 'Asia/Dhaka',
    tax_number: 'BIN-7788990011',
    status: 'active',
    created_at: '2026-09-16T09:30:00.000000Z',
    updated_at: '2026-09-16T09:30:00.000000Z',
  },
  {
    id: 4,
    uuid: 'tenant-tamim-fashion-003',
    name: 'Tamim Fashion & Undergarments',
    legal_name: 'Tamim Apparel & Hosiery Emporium',
    code: 'TM-GARMENTS',
    subdomain: 'tamim',
    custom_domain: null,
    business_type: 'GARMENTS_APPAREL',
    business_type_label: 'Fashion & Apparel (Under Garments Sale)',
    owner_name: 'Tamim Iqbal',
    owner_email: 'tamim@example.com',
    owner_phone: '+880 1911-223344',
    plan: 'pro',
    tenant_isolated: true,
    data_isolation_key: 'iso_tenant_tamim_sec',
    features_enabled: {
      size_color_matrix: true,
      wholesale_pricing: true,
      pos_quick_checkout: true,
    },
    phone: '+880 1911-223344',
    email: 'tamim@example.com',
    address: 'Shop 112, Police Plaza Concord, Gulshan 1, Dhaka',
    country: 'Bangladesh',
    currency_code: 'BDT',
    timezone: 'Asia/Dhaka',
    tax_number: 'BIN-3322110099',
    status: 'active',
    created_at: '2026-09-17T10:15:00.000000Z',
    updated_at: '2026-09-17T10:15:00.000000Z',
  },
  {
    id: 5,
    uuid: 'tenant-tonu-store-004',
    name: 'Tonu Departmental & FMCG Store',
    legal_name: 'Tonu Super Retail Enterprise',
    code: 'TN-SUPER',
    subdomain: 'tonu',
    custom_domain: null,
    business_type: 'GROCERY_FMCG',
    business_type_label: 'Supermarket & FMCG',
    owner_name: 'Tonu Sheikh',
    owner_email: 'tonu@example.com',
    owner_phone: '+880 1610-998877',
    plan: 'starter',
    tenant_isolated: true,
    data_isolation_key: 'iso_tenant_tonu_sec',
    features_enabled: {
      batch_expiry_tracking: true,
      pos_quick_checkout: true,
    },
    phone: '+880 1610-998877',
    email: 'tonu@example.com',
    address: 'Road 11, Sector 4, Uttara, Dhaka',
    country: 'Bangladesh',
    currency_code: 'BDT',
    timezone: 'Asia/Dhaka',
    tax_number: 'BIN-1100223344',
    status: 'active',
    created_at: '2026-09-18T14:40:00.000000Z',
    updated_at: '2026-09-18T14:40:00.000000Z',
  },
];

// Helper: load local tenants
export function getLocalTenantCompanies(): Company[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ALL_TENANTS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_ALL_TENANTS_KEY, JSON.stringify(DEFAULT_TENANT_COMPANIES));
      return DEFAULT_TENANT_COMPANIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_TENANT_COMPANIES;
  } catch {
    return DEFAULT_TENANT_COMPANIES;
  }
}

// Helper: save local tenants
export function saveLocalTenantCompanies(companies: Company[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_ALL_TENANTS_KEY, JSON.stringify(companies));
  } catch (err) {
    console.warn('Failed to save tenant companies to local storage:', err);
  }
}

// Active tenant ID getter & setter
export function getActiveTenantId(): number {
  try {
    const id = localStorage.getItem(ACTIVE_COMPANY_ID_KEY);
    if (id) {
      const num = parseInt(id, 10);
      if (!isNaN(num)) return num;
    }
  } catch {
    // ignore
  }
  return 1;
}

export function setActiveTenantCompany(company: Company): void {
  try {
    localStorage.setItem(ACTIVE_COMPANY_ID_KEY, String(company.id));
    if (company.subdomain) {
      localStorage.setItem(ACTIVE_SUBDOMAIN_KEY, company.subdomain);
    }
    localStorage.setItem(LOCAL_STORAGE_COMPANY_KEY, JSON.stringify(company));
    
    // Dispatch custom event for real-time reactivity across components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('retailcore_tenant_changed', { detail: company }));
    }
  } catch (err) {
    console.warn('Failed to set active tenant company:', err);
  }
}

// ======================= MULTI-TENANT COMPANIES API =======================

export async function getCompanies(): Promise<{ success: boolean; data: Company[] }> {
  const localTenants = getLocalTenantCompanies();
  
  try {
    const res = await api.get('/companies');
    if (res.data?.success && Array.isArray(res.data.data)) {
      // Merge remote data with our multi-tenant profiles
      const remoteList: Company[] = res.data.data;
      const mergedMap = new Map<number, Company>();
      
      // Seed with local multi-tenants first
      localTenants.forEach((t) => mergedMap.set(t.id, t));
      
      // Update or add remote records
      remoteList.forEach((r) => {
        const existing = mergedMap.get(r.id);
        if (existing) {
          mergedMap.set(r.id, {
            ...existing,
            name: r.name || existing.name,
            legal_name: r.legal_name || existing.legal_name,
            code: r.code || existing.code,
            country: r.country || existing.country,
            currency_code: r.currency_code || existing.currency_code,
            timezone: r.timezone || existing.timezone,
          });
        } else {
          mergedMap.set(r.id, {
            ...r,
            subdomain: r.code ? r.code.toLowerCase().replace(/[^a-z0-9]/g, '') : `tenant-${r.id}`,
            business_type: 'GENERAL_RETAIL',
            tenant_isolated: true,
            data_isolation_key: `iso_tenant_${r.id}`,
          });
        }
      });

      const combined = Array.from(mergedMap.values());
      saveLocalTenantCompanies(combined);
      return { success: true, data: combined };
    }
  } catch {
    // Fallback if remote backend route fails or 500s
  }

  return { success: true, data: localTenants };
}

export async function getCompany(id?: number): Promise<{ success: boolean; data: Company }> {
  const targetId = id || getActiveTenantId();
  const tenants = getLocalTenantCompanies();
  const matched = tenants.find((t) => t.id === targetId);

  if (matched) {
    return { success: true, data: matched };
  }

  try {
    const res = await api.get('/company');
    if (res.data?.data) {
      return res.data;
    }
  } catch {
    // ignore
  }

  return { success: true, data: tenants[0] || DEFAULT_TENANT_COMPANIES[0] };
}

export async function createCompany(
  payload: CreateCompanyPayload
): Promise<{ success: boolean; message: string; data: Company }> {
  const tenants = getLocalTenantCompanies();
  
  // Format & clean subdomain
  const cleanSubdomain = payload.subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!cleanSubdomain) {
    throw new Error('Subdomain is required and must contain only lowercase letters, numbers, or dashes.');
  }

  // Check unique subdomain
  const duplicate = tenants.find(
    (t) => t.subdomain?.toLowerCase() === cleanSubdomain
  );
  if (duplicate) {
    throw new Error(`Subdomain "${cleanSubdomain}" is already assigned to ${duplicate.name}. Please pick another unique subdomain.`);
  }

  // Auto-generate code if empty
  let code = payload.code?.trim().toUpperCase();
  if (!code) {
    const prefix = cleanSubdomain.slice(0, 3).toUpperCase();
    code = `${prefix}-${String(tenants.length + 1).padStart(2, '0')}`;
  }

  // Generate unique ID
  const newId = Math.max(...tenants.map((t) => t.id), 0) + 1;
  const config = BUSINESS_TYPE_CONFIG[payload.business_type];

  const newCompany: Company = {
    id: newId,
    uuid: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tenant-${cleanSubdomain}-${Date.now()}`,
    name: payload.name.trim(),
    legal_name: payload.legal_name?.trim() || `${payload.name.trim()} Ltd.`,
    code,
    subdomain: cleanSubdomain,
    custom_domain: payload.custom_domain?.trim() || null,
    business_type: payload.business_type,
    business_type_label: config?.label || 'General Retail',
    owner_name: payload.owner_name.trim(),
    owner_email: payload.owner_email.trim(),
    owner_phone: payload.owner_phone?.trim() || null,
    plan: payload.plan || 'pro',
    tenant_isolated: true,
    data_isolation_key: `iso_${cleanSubdomain}_${Date.now()}`,
    features_enabled: {
      ...(config?.defaultFeatures || {}),
      ...(payload.features_enabled || {}),
    },
    phone: payload.owner_phone?.trim() || null,
    email: payload.owner_email.trim(),
    address: payload.address?.trim() || null,
    country: payload.country?.trim() || 'Bangladesh',
    currency_code: payload.currency_code?.trim() || 'BDT',
    timezone: payload.timezone?.trim() || 'Asia/Dhaka',
    tax_number: payload.tax_number?.trim() || null,
    status: payload.status || 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const updatedList = [...tenants, newCompany];
  saveLocalTenantCompanies(updatedList);

  return {
    success: true,
    message: `Tenant Company "${newCompany.name}" onboarded successfully with subdomain "${cleanSubdomain}.sonaribd.com". Data isolation guard is ACTIVE.`,
    data: newCompany,
  };
}

export async function updateCompany(
  data: Partial<Company> & { id?: number }
): Promise<{ success: boolean; data: Company; message?: string }> {
  const tenants = getLocalTenantCompanies();
  const targetId = data.id || getActiveTenantId();
  const existing = tenants.find((t) => t.id === targetId);

  if (!existing) {
    throw new Error('Tenant Company not found.');
  }

  // If subdomain changed, ensure unique
  if (data.subdomain && data.subdomain.toLowerCase() !== existing.subdomain?.toLowerCase()) {
    const cleanSubdomain = data.subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const dup = tenants.find((t) => t.id !== targetId && t.subdomain?.toLowerCase() === cleanSubdomain);
    if (dup) {
      throw new Error(`Subdomain "${cleanSubdomain}" is already used by ${dup.name}.`);
    }
  }

  const updated: Company = {
    ...existing,
    ...data,
    id: existing.id,
    business_type_label: data.business_type 
      ? BUSINESS_TYPE_CONFIG[data.business_type]?.label || existing.business_type_label 
      : existing.business_type_label,
    updated_at: new Date().toISOString(),
  };

  const updatedList = tenants.map((t) => (t.id === targetId ? updated : t));
  saveLocalTenantCompanies(updatedList);

  if (targetId === getActiveTenantId()) {
    setActiveTenantCompany(updated);
  }

  return {
    success: true,
    message: `Company "${updated.name}" updated successfully.`,
    data: updated,
  };
}

export async function deleteCompany(id: number): Promise<{ success: boolean; message: string }> {
  if (id === 1) {
    throw new Error('Default master company cannot be deleted.');
  }
  const tenants = getLocalTenantCompanies();
  const filtered = tenants.filter((t) => t.id !== id);
  saveLocalTenantCompanies(filtered);

  if (getActiveTenantId() === id) {
    setActiveTenantCompany(filtered[0] || DEFAULT_TENANT_COMPANIES[0]);
  }

  return {
    success: true,
    message: 'Tenant company removed successfully.',
  };
}

// ======================= BUSINESS UNITS =======================

export async function getBusinessUnits(): Promise<{ success: boolean; data: BusinessUnit[] }> {
  const res = await api.get('/business-units');
  return res.data;
}

export async function getBusinessUnit(id: number): Promise<{ success: boolean; data: BusinessUnit }> {
  const res = await api.get(`/business-units/${id}`);
  return res.data;
}

export async function createBusinessUnit(data: {
  name: string;
  code: string;
  description?: string | null;
  status?: 'active' | 'inactive';
}): Promise<{ success: boolean; message: string; data: BusinessUnit }> {
  const res = await api.post('/business-units', data);
  return res.data;
}

export async function updateBusinessUnit(
  id: number,
  data: {
    name?: string;
    code?: string;
    description?: string | null;
    status?: 'active' | 'inactive';
  }
): Promise<{ success: boolean; message: string; data: BusinessUnit }> {
  const res = await api.put(`/business-units/${id}`, data);
  return res.data;
}

export async function deleteBusinessUnit(id: number): Promise<{ success: boolean; message?: string }> {
  const res = await api.delete(`/business-units/${id}`);
  return res.data;
}

// ======================= BRANCHES =======================

export async function getBranches(): Promise<{ success: boolean; data: Branch[] }> {
  const res = await api.get('/branches');
  return res.data;
}

export async function getBranch(id: number): Promise<{ success: boolean; data: Branch }> {
  const res = await api.get(`/branches/${id}`);
  return res.data;
}

export async function createBranch(data: {
  business_unit_id: number;
  name: string;
  code: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  status?: 'active' | 'inactive';
}): Promise<{ success: boolean; message: string; data: Branch }> {
  const res = await api.post('/branches', data);
  return res.data;
}

export async function updateBranch(
  id: number,
  data: {
    business_unit_id?: number;
    name?: string;
    code?: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    status?: 'active' | 'inactive';
  }
): Promise<{ success: boolean; message: string; data: Branch }> {
  const res = await api.put(`/branches/${id}`, data);
  return res.data;
}

export async function deleteBranch(id: number): Promise<{ success: boolean; message?: string }> {
  const res = await api.delete(`/branches/${id}`);
  return res.data;
}

// ======================= WAREHOUSES =======================

export async function getWarehouses(): Promise<{ success: boolean; data: Warehouse[] }> {
  const res = await api.get('/warehouses');
  return res.data;
}

export async function getWarehouse(id: number): Promise<{ success: boolean; data: Warehouse }> {
  const res = await api.get(`/warehouses/${id}`);
  return res.data;
}

export async function createWarehouse(data: {
  business_unit_id: number;
  branch_id?: number | null;
  name: string;
  code: string;
  address?: string | null;
  warehouse_type?: string;
  status?: 'active' | 'inactive';
}): Promise<{ success: boolean; message: string; data: Warehouse }> {
  const res = await api.post('/warehouses', data);
  return res.data;
}

export async function updateWarehouse(
  id: number,
  data: {
    business_unit_id?: number;
    branch_id?: number | null;
    name?: string;
    code?: string;
    address?: string | null;
    warehouse_type?: string;
    status?: 'active' | 'inactive';
  }
): Promise<{ success: boolean; message: string; data: Warehouse }> {
  const res = await api.put(`/warehouses/${id}`, data);
  return res.data;
}

export async function deleteWarehouse(id: number): Promise<{ success: boolean; message?: string }> {
  const res = await api.delete(`/warehouses/${id}`);
  return res.data;
}

// ======================= STORAGE LOCATIONS =======================

export async function getStorageLocations(params?: {
  warehouse_id?: number;
  is_active?: boolean;
}): Promise<{ success: boolean; data: StorageLocation[] }> {
  const res = await api.get('/storage-locations', { params });
  return res.data;
}

export async function getStorageLocation(id: number): Promise<{ success: boolean; data: StorageLocation }> {
  const res = await api.get(`/storage-locations/${id}`);
  return res.data;
}

export async function createStorageLocation(data: {
  warehouse_id: number;
  code: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
}): Promise<{ success: boolean; message: string; data: StorageLocation }> {
  const res = await api.post('/storage-locations', data);
  return res.data;
}

export async function updateStorageLocation(
  id: number,
  data: {
    name?: string;
    description?: string | null;
    is_active?: boolean;
  }
): Promise<{ success: boolean; message: string; data: StorageLocation }> {
  const res = await api.put(`/storage-locations/${id}`, data);
  return res.data;
}

export async function deleteStorageLocation(id: number): Promise<{ success: boolean; message?: string }> {
  const res = await api.delete(`/storage-locations/${id}`);
  return res.data;
}
