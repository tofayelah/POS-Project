export interface Company {
  id: number | string;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  currency?: string;
  is_active?: boolean;
}

export interface BusinessUnit {
  id: number | string;
  company_id: number | string;
  name: string;
  code?: string;
  description?: string;
  is_active?: boolean;
}

export interface Branch {
  id: number | string;
  company_id: number | string;
  business_unit_id?: number | string;
  name: string;
  code?: string;
  phone?: string;
  address?: string;
  is_active?: boolean;
}

export interface User {
  id: number | string;
  name: string;
  email: string;
  role?: string;
  roles?: Array<{ id: number | string; name: string }>;
  is_active?: boolean;
}
