export interface Company {
  id: number;
  uuid?: string;
  name: string;
  legal_name?: string | null;
  code: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  country?: string;
  currency_code?: string;
  timezone?: string;
  logo_path?: string | null;
  tax_number?: string | null;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface BusinessUnit {
  id: number;
  uuid?: string;
  company_id: number;
  name: string;
  code: string;
  description?: string | null;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
  branches_count?: number;
  warehouses_count?: number;
}

export interface Branch {
  id: number;
  uuid?: string;
  company_id: number;
  business_unit_id: number;
  name: string;
  code: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  status: 'active' | 'inactive';
  business_unit?: {
    id: number;
    name: string;
    code: string;
  };
  created_at?: string;
  updated_at?: string;
}

export type WarehouseType = 'MAIN' | 'BRANCH' | 'CENTRAL';

export interface Warehouse {
  id: number;
  uuid?: string;
  company_id: number;
  business_unit_id: number;
  branch_id?: number | null;
  name: string;
  code: string;
  address?: string | null;
  warehouse_type: WarehouseType;
  status: 'active' | 'inactive';
  business_unit?: {
    id: number;
    name: string;
    code: string;
  };
  branch?: {
    id: number;
    name: string;
    code: string;
  } | null;
  created_at?: string;
  updated_at?: string;
}
