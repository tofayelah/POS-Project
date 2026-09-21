export type BusinessType =
  | 'MOBILE_ELECTRONICS'
  | 'TOYS_GAMES'
  | 'GARMENTS_APPAREL'
  | 'GROCERY_FMCG'
  | 'PHARMACY_HEALTHCARE'
  | 'GENERAL_RETAIL';

export interface TenantFeatures {
  imei_serial_tracking?: boolean;
  warranty_management?: boolean;
  size_color_matrix?: boolean;
  batch_expiry_tracking?: boolean;
  wholesale_pricing?: boolean;
  pos_quick_checkout?: boolean;
}

export interface Company {
  id: number;
  uuid?: string;
  name: string;
  legal_name?: string | null;
  code: string;
  subdomain?: string;
  custom_domain?: string | null;
  business_type?: BusinessType;
  business_type_label?: string;
  owner_name?: string | null;
  owner_email?: string | null;
  owner_phone?: string | null;
  plan?: 'trial' | 'starter' | 'pro' | 'enterprise';
  tenant_isolated?: boolean;
  data_isolation_key?: string;
  features_enabled?: TenantFeatures;
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

export interface CreateCompanyPayload {
  name: string;
  legal_name?: string | null;
  code?: string;
  subdomain: string;
  custom_domain?: string | null;
  business_type: BusinessType;
  owner_name: string;
  owner_email: string;
  owner_phone?: string | null;
  plan?: 'trial' | 'starter' | 'pro' | 'enterprise';
  country?: string;
  currency_code?: string;
  timezone?: string;
  tax_number?: string | null;
  address?: string | null;
  status?: 'active' | 'inactive';
  features_enabled?: TenantFeatures;
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

export interface StorageLocation {
  id: number;
  uuid?: string;
  company_id: number;
  warehouse_id: number;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  warehouse?: {
    id: number;
    name: string;
    code: string;
  };
  created_at?: string;
  updated_at?: string;
}
