import api from './axios';
import { 
  Company, 
  BusinessUnit, 
  Branch, 
  Warehouse, 
  StorageLocation,
  BusinessType, 
  CreateCompanyPayload, 
  TenantFeatures,
  OrganizationUser,
  Role
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

export function getActiveCompanyFromStorage(): Company | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_COMPANY_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return null;
}

// ======================= MULTI-TENANT COMPANIES API =======================

export async function getCompanies(): Promise<{ success: boolean; data: Company[] }> {
  try {
    const res = await api.get('/companies');
    if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    console.warn('Failed to load companies from backend:', err);
  }
  return { success: true, data: getLocalTenantCompanies() };
}

export async function getCompany(id?: number): Promise<{ success: boolean; data: Company }> {
  const targetId = id || getActiveTenantId();
  const headers: Record<string, string> = {};
  if (targetId) {
    headers['X-Company-ID'] = String(targetId);
  }

  try {
    const res = await api.get('/company', { headers });
    if (res.data?.success && res.data.data) {
      if (targetId === getActiveTenantId()) {
        try {
          localStorage.setItem(LOCAL_STORAGE_COMPANY_KEY, JSON.stringify(res.data.data));
        } catch {}
      }
      return res.data;
    }
  } catch (err: any) {
    console.warn('Backend company load error:', err.response?.data?.message || err.message);
  }

  // Graceful fallback hierarchy:
  // 1. Cached company if matches ID or if targetId not specified
  const cached = getActiveCompanyFromStorage();
  if (cached && (cached.id === targetId || !targetId)) {
    return { success: true, data: cached };
  }

  // 2. Local/default tenant companies matching ID
  const localTenants = getLocalTenantCompanies();
  const found = localTenants.find((c) => c.id === targetId) || cached || localTenants[0] || DEFAULT_TENANT_COMPANIES[0];
  if (found) {
    if (targetId === getActiveTenantId()) {
      setActiveTenantCompany(found);
    }
    return { success: true, data: found };
  }

  throw new Error('Failed to load company profile.');
}

export async function createCompany(
  payload: CreateCompanyPayload
): Promise<{ success: boolean; message: string; data: Company }> {
  // Format & clean subdomain
  const cleanSubdomain = payload.subdomain?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') || '';

  // Auto-generate code if empty
  let code = payload.code?.trim().toUpperCase();
  if (!code && cleanSubdomain) {
    const prefix = cleanSubdomain.slice(0, 3).toUpperCase();
    code = `${prefix}-01`;
  }

  const logoPath = payload.logo_path || payload.logo_url || payload.logo || undefined;

  const backendPayload = {
    name: payload.name.trim(),
    legal_name: payload.legal_name?.trim() || `${payload.name.trim()} Ltd.`,
    code: code || undefined,
    phone: payload.owner_phone?.trim() || null,
    email: payload.owner_email?.trim() || null,
    address: payload.address?.trim() || null,
    country: payload.country?.trim() || 'Bangladesh',
    currency_code: payload.currency_code?.trim() || 'BDT',
    timezone: payload.timezone?.trim() || 'Asia/Dhaka',
    tax_number: payload.tax_number?.trim() || null,
    logo_path: logoPath,
    status: payload.status || 'active',
  };

  const localTenants = getLocalTenantCompanies();
  const nextId = Math.max(...localTenants.map((t) => Number(t.id) || 0), 0) + 1;

  const createdCompany: Company = {
    id: nextId,
    uuid: `tenant-${cleanSubdomain || 'new'}-${Date.now()}`,
    name: payload.name.trim(),
    legal_name: payload.legal_name?.trim() || `${payload.name.trim()} Ltd.`,
    code: code || `COMP-${nextId}`,
    subdomain: cleanSubdomain,
    custom_domain: payload.custom_domain?.trim() || undefined,
    business_type: payload.business_type || 'GENERAL_RETAIL',
    business_type_label: BUSINESS_TYPE_CONFIG[payload.business_type || 'GENERAL_RETAIL']?.label || 'General Retail',
    owner_name: payload.owner_name?.trim() || undefined,
    owner_email: payload.owner_email?.trim() || undefined,
    owner_phone: payload.owner_phone?.trim() || undefined,
    phone: payload.owner_phone?.trim() || undefined,
    email: payload.owner_email?.trim() || undefined,
    address: payload.address?.trim() || undefined,
    country: payload.country?.trim() || 'Bangladesh',
    currency_code: payload.currency_code?.trim() || 'BDT',
    timezone: payload.timezone?.trim() || 'Asia/Dhaka',
    tax_number: payload.tax_number?.trim() || undefined,
    vat_registration: payload.tax_number?.trim() || undefined,
    logo_path: logoPath,
    logo_url: logoPath,
    plan: payload.plan || 'pro',
    status: payload.status || 'active',
    tenant_isolated: true,
    data_isolation_key: `iso_tenant_${cleanSubdomain}_sec`,
    features_enabled: {
      ...(BUSINESS_TYPE_CONFIG[payload.business_type || 'GENERAL_RETAIL']?.defaultFeatures || {}),
      ...(payload.features_enabled || {}),
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const res = await api.post('/companies', backendPayload);
    if (res.data?.success && res.data.data) {
      const serverCompany: Company = {
        ...createdCompany,
        ...res.data.data,
        logo_path: res.data.data.logo_path || logoPath || createdCompany.logo_path,
        logo_url: res.data.data.logo_path || logoPath || createdCompany.logo_url,
      };
      saveLocalTenantCompanies([serverCompany, ...localTenants]);
      return {
        success: true,
        message: res.data.message || `Tenant Company "${serverCompany.name}" onboarded successfully.`,
        data: serverCompany,
      };
    }
  } catch (err: any) {
    console.warn('Backend tenant creation failed or offline, saving locally:', err.message);
  }

  saveLocalTenantCompanies([createdCompany, ...localTenants]);
  return {
    success: true,
    message: `Tenant Company "${createdCompany.name}" onboarded successfully.`,
    data: createdCompany,
  };
}

export async function updateCompany(
  data: Partial<Company> & { id?: number | string }
): Promise<{ success: boolean; data: Company; message?: string }> {
  const targetId = data.id || getActiveTenantId();
  const headers: Record<string, string> = {
    'X-Company-ID': String(targetId),
  };

  // Update local tenant storage
  const tenants = getLocalTenantCompanies();
  const index = tenants.findIndex((t) => String(t.id) === String(targetId));
  let updatedLocal: Company | null = null;
  if (index !== -1) {
    tenants[index] = {
      ...tenants[index],
      ...data,
      logo_path: data.logo_path !== undefined ? data.logo_path : tenants[index].logo_path,
      logo_url: data.logo_path !== undefined ? data.logo_path : tenants[index].logo_url,
      updated_at: new Date().toISOString(),
    };
    updatedLocal = tenants[index];
    saveLocalTenantCompanies(tenants);
    if (String(targetId) === String(getActiveTenantId())) {
      setActiveTenantCompany(updatedLocal);
    }
  }

  try {
    const res = await api.put('/company', data, { headers });
    if (res.data?.success && res.data.data) {
      const updated: Company = {
        ...(updatedLocal || {}),
        ...res.data.data,
      };
      if (String(targetId) === String(getActiveTenantId())) {
        setActiveTenantCompany(updated);
      }
      return { success: true, data: updated, message: res.data.message };
    }
  } catch (err: any) {
    console.warn('Backend company update failed or offline, using local updated company profile:', err.message);
  }

  if (updatedLocal) {
    return { success: true, data: updatedLocal, message: 'Company profile updated successfully.' };
  }

  throw new Error('Failed to update company profile.');
}

export async function uploadCompanyLogo(
  file: File,
  companyId?: number | string
): Promise<{ success: boolean; message: string; data: Company }> {
  const targetId = companyId || getActiveTenantId();
  const formData = new FormData();
  formData.append('logo', file);

  const endpoint = companyId ? `/companies/${companyId}/logo` : '/company/logo';
  const headers = {
    'Content-Type': 'multipart/form-data',
    'X-Company-ID': String(targetId),
  };

  const res = await api.post(endpoint, formData, { headers });
  if (res.data?.success && res.data.data) {
    const updated = res.data.data;
    const tenants = getLocalTenantCompanies();
    const index = tenants.findIndex((t) => String(t.id) === String(targetId));
    if (index !== -1) {
      tenants[index] = {
        ...tenants[index],
        logo_path: updated.logo_path,
        logo_url: updated.logo_url || updated.logo_path,
      };
      saveLocalTenantCompanies(tenants);
      if (String(targetId) === String(getActiveTenantId())) {
        setActiveTenantCompany(tenants[index]);
      }
    }
    return res.data;
  }
  throw new Error(res.data?.message || 'Failed to upload company logo.');
}

export async function deleteCompanyLogo(
  companyId?: number | string
): Promise<{ success: boolean; message: string; data: Company }> {
  const targetId = companyId || getActiveTenantId();
  const endpoint = companyId ? `/companies/${companyId}/logo` : '/company/logo';
  const headers = {
    'X-Company-ID': String(targetId),
  };

  const res = await api.delete(endpoint, { headers });
  if (res.data?.success && res.data.data) {
    const updated = res.data.data;
    const tenants = getLocalTenantCompanies();
    const index = tenants.findIndex((t) => String(t.id) === String(targetId));
    if (index !== -1) {
      tenants[index] = {
        ...tenants[index],
        logo_path: undefined,
        logo_url: undefined,
      };
      saveLocalTenantCompanies(tenants);
      if (String(targetId) === String(getActiveTenantId())) {
        setActiveTenantCompany(tenants[index]);
      }
    }
    return res.data;
  }
  throw new Error(res.data?.message || 'Failed to remove company logo.');
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

import { isDemoOrPreviewMode, extractApiError } from '../utils/env';

// ======================= BUSINESS UNITS =======================

export async function getBusinessUnits(): Promise<{ success: boolean; data: BusinessUnit[]; is_demo_fallback?: boolean; error?: string }> {
  try {
    const res = await api.get('/business-units');
    return res.data;
  } catch (err) {
    if (isDemoOrPreviewMode()) {
      return {
        success: true,
        is_demo_fallback: true,
        data: [
          { id: 1, company_id: 1, name: 'Retail Commerce Unit', code: 'BU-RETAIL', status: 'active', created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z' },
          { id: 2, company_id: 1, name: 'Wholesale & B2B Distribution', code: 'BU-WHOLESALE', status: 'active', created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z' },
        ],
      };
    }
    const errorInfo = extractApiError(err);
    return { success: false, error: errorInfo.message, data: [] };
  }
}

export async function getBusinessUnit(id: number): Promise<{ success: boolean; data?: BusinessUnit; is_demo_fallback?: boolean; error?: string }> {
  try {
    const res = await api.get(`/business-units/${id}`);
    return res.data;
  } catch (err) {
    if (isDemoOrPreviewMode()) {
      return {
        success: true,
        is_demo_fallback: true,
        data: { id, company_id: 1, name: 'Retail Commerce Unit', code: 'BU-RETAIL', status: 'active', created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z' },
      };
    }
    const errorInfo = extractApiError(err);
    return { success: false, error: errorInfo.message };
  }
}

export async function createBusinessUnit(data: {
  name: string;
  code: string;
  description?: string | null;
  status?: 'active' | 'inactive';
}): Promise<{ success: boolean; message: string; data?: BusinessUnit; error?: string }> {
  try {
    const res = await api.post('/business-units', data);
    return res.data;
  } catch (err) {
    const errorInfo = extractApiError(err);
    return { success: false, message: errorInfo.message, error: errorInfo.message };
  }
}

export async function updateBusinessUnit(
  id: number,
  data: {
    name?: string;
    code?: string;
    description?: string | null;
    status?: 'active' | 'inactive';
  }
): Promise<{ success: boolean; message: string; data?: BusinessUnit; error?: string }> {
  try {
    const res = await api.put(`/business-units/${id}`, data);
    return res.data;
  } catch (err) {
    const errorInfo = extractApiError(err);
    return { success: false, message: errorInfo.message, error: errorInfo.message };
  }
}

export async function deleteBusinessUnit(id: number): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await api.delete(`/business-units/${id}`);
    return res.data;
  } catch (err) {
    const errorInfo = extractApiError(err);
    return { success: false, message: errorInfo.message, error: errorInfo.message };
  }
}

// ======================= BRANCHES =======================

export async function getBranches(): Promise<{ success: boolean; data: Branch[]; is_demo_fallback?: boolean; error?: string }> {
  try {
    const res = await api.get('/branches');
    return res.data;
  } catch (err) {
    if (isDemoOrPreviewMode()) {
      return {
        success: true,
        is_demo_fallback: true,
        data: [
          { id: 1, business_unit_id: 1, name: 'Dhaka Head Office Branch', code: 'BR-DHK', phone: '01711000000', status: 'active', created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z' },
          { id: 2, business_unit_id: 1, name: 'Uttara Model Town Branch', code: 'BR-UTT', phone: '01811000000', status: 'active', created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z' },
        ],
      };
    }
    const errorInfo = extractApiError(err);
    return { success: false, error: errorInfo.message, data: [] };
  }
}

export async function getBranch(id: number): Promise<{ success: boolean; data?: Branch; is_demo_fallback?: boolean; error?: string }> {
  try {
    const res = await api.get(`/branches/${id}`);
    return res.data;
  } catch (err) {
    if (isDemoOrPreviewMode()) {
      return {
        success: true,
        is_demo_fallback: true,
        data: { id, business_unit_id: 1, name: 'Dhaka Head Office Branch', code: 'BR-DHK', phone: '01711000000', status: 'active', created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z' },
      };
    }
    const errorInfo = extractApiError(err);
    return { success: false, error: errorInfo.message };
  }
}

export async function createBranch(data: {
  business_unit_id: number;
  name: string;
  code: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  status?: 'active' | 'inactive';
}): Promise<{ success: boolean; message: string; data?: Branch; error?: string }> {
  try {
    const res = await api.post('/branches', data);
    return res.data;
  } catch (err) {
    const errorInfo = extractApiError(err);
    return { success: false, message: errorInfo.message, error: errorInfo.message };
  }
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
): Promise<{ success: boolean; message: string; data?: Branch; error?: string }> {
  try {
    const res = await api.put(`/branches/${id}`, data);
    return res.data;
  } catch (err) {
    const errorInfo = extractApiError(err);
    return { success: false, message: errorInfo.message, error: errorInfo.message };
  }
}

export async function deleteBranch(id: number): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await api.delete(`/branches/${id}`);
    return res.data;
  } catch (err) {
    const errorInfo = extractApiError(err);
    return { success: false, message: errorInfo.message, error: errorInfo.message };
  }
}

// ======================= WAREHOUSES =======================

export const DEFAULT_WAREHOUSES: Warehouse[] = [
  {
    id: 1,
    business_unit_id: 1,
    branch_id: 1,
    name: 'Central Main Depot',
    code: 'WH-MAIN-01',
    address: 'Plot 12, Tejgaon I/A, Dhaka-1208',
    warehouse_type: 'Central Distribution',
    status: 'active',
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-01T10:00:00Z',
  },
  {
    id: 2,
    business_unit_id: 1,
    branch_id: 2,
    name: 'Uttara Retail Outlet Store',
    code: 'WH-UTT-02',
    address: 'House 4, Road 7, Sector 3, Uttara, Dhaka',
    warehouse_type: 'Retail Outlet Store',
    status: 'active',
    created_at: '2026-10-02T11:00:00Z',
    updated_at: '2026-10-02T11:00:00Z',
  },
  {
    id: 3,
    business_unit_id: 1,
    branch_id: 3,
    name: 'Chittagong Port Hub',
    code: 'WH-CTG-03',
    address: 'Agrabad C/A, Chittagong',
    warehouse_type: 'Regional Warehouse',
    status: 'active',
    created_at: '2026-10-03T12:00:00Z',
    updated_at: '2026-10-03T12:00:00Z',
  },
];

export async function getWarehouses(): Promise<{ success: boolean; data: Warehouse[]; is_demo_fallback?: boolean; error?: string }> {
  try {
    const res = await api.get('/warehouses');
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data;
    }
    if (Array.isArray(res.data)) {
      return { success: true, data: res.data };
    }
  } catch (err) {
    if (isDemoOrPreviewMode()) {
      return { success: true, is_demo_fallback: true, data: DEFAULT_WAREHOUSES };
    }
    const errorInfo = extractApiError(err);
    return { success: false, error: errorInfo.message, data: [] };
  }
  return { success: true, data: DEFAULT_WAREHOUSES, is_demo_fallback: true };
}

export async function getWarehouse(id: number): Promise<{ success: boolean; data?: Warehouse; is_demo_fallback?: boolean; error?: string }> {
  try {
    const res = await api.get(`/warehouses/${id}`);
    return res.data;
  } catch (err) {
    if (isDemoOrPreviewMode()) {
      const found = DEFAULT_WAREHOUSES.find((w) => w.id === Number(id)) || DEFAULT_WAREHOUSES[0];
      return { success: true, is_demo_fallback: true, data: found };
    }
    const errorInfo = extractApiError(err);
    return { success: false, error: errorInfo.message };
  }
}

export async function createWarehouse(data: {
  business_unit_id: number;
  branch_id?: number | null;
  name: string;
  code: string;
  address?: string | null;
  warehouse_type?: string;
  status?: 'active' | 'inactive';
}): Promise<{ success: boolean; message: string; data?: Warehouse; error?: string }> {
  try {
    const res = await api.post('/warehouses', data);
    return res.data;
  } catch (err) {
    const errorInfo = extractApiError(err);
    return { success: false, message: errorInfo.message, error: errorInfo.message };
  }
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
): Promise<{ success: boolean; message: string; data?: Warehouse; error?: string }> {
  try {
    const res = await api.put(`/warehouses/${id}`, data);
    return res.data;
  } catch (err) {
    const errorInfo = extractApiError(err);
    return { success: false, message: errorInfo.message, error: errorInfo.message };
  }
}

export async function deleteWarehouse(id: number): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await api.delete(`/warehouses/${id}`);
    return res.data;
  } catch (err) {
    const errorInfo = extractApiError(err);
    return { success: false, message: errorInfo.message, error: errorInfo.message };
  }
}

// ======================= STORAGE LOCATIONS =======================

export async function getStorageLocations(params?: {
  warehouse_id?: number;
  is_active?: boolean;
}): Promise<{ success: boolean; data: StorageLocation[]; is_demo_fallback?: boolean; error?: string }> {
  try {
    const res = await api.get('/storage-locations', { params });
    return res.data;
  } catch (err) {
    if (isDemoOrPreviewMode()) {
      return {
        success: true,
        is_demo_fallback: true,
        data: [
          { id: 1, warehouse_id: 1, code: 'LOC-A1-01', name: 'Rack A1 - Section 01', is_active: true },
          { id: 2, warehouse_id: 1, code: 'LOC-B2-04', name: 'Rack B2 - Section 04', is_active: true },
        ],
      };
    }
    const errorInfo = extractApiError(err);
    return { success: false, error: errorInfo.message, data: [] };
  }
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

// ======================= USERS & TENANT ASSIGNMENTS =======================

export async function getCompanyUsers(companyId?: number): Promise<{ success: boolean; data: OrganizationUser[] }> {
  const targetId = companyId || getActiveTenantId();
  const res = await api.get(`/companies/${targetId}/users`);
  return res.data;
}

export async function getAllUsers(params?: {
  company_id?: number;
  search?: string;
  status?: string;
}): Promise<{ success: boolean; data: OrganizationUser[] }> {
  const res = await api.get('/users', { params });
  return res.data;
}

export async function getUser(id: number): Promise<{ success: boolean; data: OrganizationUser }> {
  const res = await api.get(`/users/${id}`);
  return res.data;
}

export async function createUser(data: {
  name: string;
  email: string;
  password?: string;
  role?: string;
  role_id?: number;
  company_id?: number;
  status?: 'active' | 'inactive';
}): Promise<{ success: boolean; message: string; data: OrganizationUser }> {
  const res = await api.post('/users', data);
  return res.data;
}

export async function updateUser(
  id: number,
  data: {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    role_id?: number;
    status?: 'active' | 'inactive';
  }
): Promise<{ success: boolean; message: string; data: OrganizationUser }> {
  const res = await api.put(`/users/${id}`, data);
  return res.data;
}

export async function deleteUser(id: number): Promise<{ success: boolean; message?: string }> {
  const res = await api.delete(`/users/${id}`);
  return res.data;
}

export async function assignUserToCompany(
  companyId: number,
  data: { user_id: number; role?: string; role_id?: number }
): Promise<{ success: boolean; message: string; data: OrganizationUser }> {
  const res = await api.post(`/companies/${companyId}/users`, data);
  return res.data;
}

export async function removeUserFromCompany(
  companyId: number,
  userId: number
): Promise<{ success: boolean; message: string; data?: OrganizationUser }> {
  const res = await api.delete(`/companies/${companyId}/users/${userId}`);
  return res.data;
}

export async function getRoles(): Promise<{ success: boolean; data: Role[] }> {
  const res = await api.get('/roles');
  return res.data;
}

