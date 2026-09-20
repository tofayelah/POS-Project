import api from './axios';
import { Company, BusinessUnit, Branch, Warehouse } from '../types/organization';

const LOCAL_STORAGE_COMPANY_KEY = 'retailcore_company_profile';

const defaultCompany: Company = {
  id: 1,
  uuid: 'c0a80101-0000-0000-0000-000000000001',
  name: 'Apex Retail Ltd',
  legal_name: 'Apex Retail Holdings Limited',
  code: 'APEX-01',
  phone: '+880 1700-000000',
  email: 'admin@sonaribd.com',
  address: 'Level 8, Concord Tower, Dhaka-1212, Bangladesh',
  country: 'Bangladesh',
  currency_code: 'BDT',
  timezone: 'Asia/Dhaka',
  tax_number: 'BIN-19283746501',
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ======================= COMPANY =======================

export async function getCompany(): Promise<{ success: boolean; data: Company }> {
  try {
    const res = await api.get('/company');
    if (res.data?.data) {
      localStorage.setItem(LOCAL_STORAGE_COMPANY_KEY, JSON.stringify(res.data.data));
      return res.data;
    }
  } catch {
    // Fallback if /company endpoint is not available on remote server
  }

  const stored = localStorage.getItem(LOCAL_STORAGE_COMPANY_KEY);
  if (stored) {
    try {
      return { success: true, data: JSON.parse(stored) };
    } catch {
      // ignore
    }
  }

  return { success: true, data: defaultCompany };
}

export async function updateCompany(data: Partial<Company>): Promise<{ success: boolean; data: Company; message?: string }> {
  try {
    const res = await api.put('/company', data);
    if (res.data?.data) {
      localStorage.setItem(LOCAL_STORAGE_COMPANY_KEY, JSON.stringify(res.data.data));
      return res.data;
    }
  } catch {
    // Fallback if /company endpoint is not available
  }

  const current = (await getCompany()).data;
  const updated: Company = {
    ...current,
    ...data,
    updated_at: new Date().toISOString(),
  };
  localStorage.setItem(LOCAL_STORAGE_COMPANY_KEY, JSON.stringify(updated));

  return {
    success: true,
    message: 'Company profile updated successfully.',
    data: updated,
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
