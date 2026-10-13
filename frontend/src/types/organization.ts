import { Warehouse as InventoryWarehouse, StorageLocation as InventoryStorageLocation } from './inventory';

export type Warehouse = InventoryWarehouse;
export type StorageLocation = InventoryStorageLocation;

export type WarehouseType = 'retail' | 'distribution' | 'fulfillment' | 'transit' | 'returns' | string;

export type BusinessType = 'RETAIL' | 'WHOLESALE' | 'ELECTRONICS' | 'FASHION' | 'SUPERMARKET' | 'PHARMACY' | 'GENERAL' | string;

export interface TenantFeatures {
  imei_serial_tracking?: boolean;
  warranty_management?: boolean;
  size_color_matrix?: boolean;
  batch_expiry_tracking?: boolean;
  wholesale_pricing?: boolean;
  [key: string]: boolean | undefined;
}

export interface Company {
  id: number | string;
  uuid?: string;
  plan?: string;
  tenant_isolated?: boolean;
  data_isolation_key?: string;
  created_at?: string;
  updated_at?: string;
  name: string;
  legal_name?: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  currency?: string;
  currency_code?: string;
  country?: string;
  timezone?: string;
  vat_registration?: string;
  tax_number?: string;
  website?: string;
  subdomain?: string;
  custom_domain?: string;
  business_type?: BusinessType;
  business_type_label?: string;
  logo_path?: string;
  logo_url?: string;
  logo?: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  features_enabled?: TenantFeatures & Record<string, any>;
  status?: 'active' | 'inactive' | string;
  is_active?: boolean;
}

export interface CreateCompanyPayload {
  name: string;
  legal_name?: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  currency?: string;
  currency_code?: string;
  country?: string;
  timezone?: string;
  subdomain?: string;
  custom_domain?: string;
  business_type?: BusinessType;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  plan?: string;
  tax_number?: string;
  address_line_1?: string;
  logo_path?: string;
  logo_url?: string;
  logo?: string;
  status?: 'active' | 'inactive' | string;
  features_enabled?: TenantFeatures & Record<string, any>;
}

export interface BusinessUnit {
  id: number | string;
  company_id: number | string;
  name: string;
  code?: string;
  description?: string;
  status?: 'active' | 'inactive' | string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Branch {
  id: number | string;
  company_id?: number | string;
  business_unit_id?: number | string;
  business_unit?: { id?: number | string; name?: string };
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: 'active' | 'inactive' | string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Role {
  id: number | string;
  name: string;
  label?: string;
  description?: string;
  permissions?: string[];
}

export interface User {
  id: number | string;
  name: string;
  email: string;
  role?: string;
  roles?: Array<{ id: number | string; name: string; label?: string }>;
  is_active?: boolean;
}

export interface OrganizationUser extends User {
  company_id?: number | string;
  branch_id?: number | string;
  department?: string;
  phone_number?: string;
  status?: string;
  created_at?: string;
}
