export type SupplierStatus = 'ACTIVE' | 'INACTIVE';

export interface Supplier {
  id: number;
  uuid?: string;
  company_id?: number;
  supplier_code: string;
  name: string;
  short_name?: string;
  mobile?: string;
  alternate_mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  contact_person?: string;
  contact_designation?: string;
  contact_phone?: string;
  tax_number?: string;
  opening_balance?: number;
  credit_limit?: number;
  payment_terms?: string;
  bank_name?: string;
  bank_account_no?: string;
  bank_branch?: string;
  notes?: string;
  status: SupplierStatus;
  current_balance?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SupplierFormData {
  supplier_code?: string;
  name: string;
  short_name: string;
  mobile: string;
  address: string;
  contact_person: string;
  contact_designation: string;
  contact_phone: string;
  status: SupplierStatus;
}

export interface SupplierPayload {
  name: string;
  short_name?: string;
  mobile?: string;
  address?: string;
  contact_person?: string;
  contact_designation?: string;
  contact_phone?: string;
  status?: SupplierStatus;
  email?: string;
  notes?: string;
}

export interface SupplierBalanceData {
  supplier_id: number;
  supplier_code: string;
  name: string;
  opening_balance: number;
  total_purchases: number;
  total_paid: number;
  balance: number;
}

export interface SupplierListParams {
  search?: string;
  status?: string;
  page?: number;
  per_page?: number;
  all?: boolean;
}
