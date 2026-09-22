export interface Supplier {
  id: number;
  uuid?: string;
  company_id: number;
  business_unit_id?: number | null;
  supplier_code: string;
  name: string;
  contact_person?: string | null;
  mobile?: string | null;
  alternate_mobile?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  tax_number?: string | null;
  opening_balance: number;
  credit_limit: number;
  payment_terms?: string | null;
  notes?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
  updated_at?: string;
  business_unit?: {
    id: number;
    name: string;
    code: string;
  };
  ledgers?: Array<{
    id: number;
    transaction_type: string;
    debit: number;
    credit: number;
    balance_before: number;
    balance_after: number;
    transaction_date: string;
    notes?: string;
  }>;
}

export interface SupplierPayload {
  supplier_code?: string;
  name: string;
  business_unit_id?: number | null;
  contact_person?: string | null;
  mobile?: string | null;
  alternate_mobile?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  tax_number?: string | null;
  opening_balance?: number;
  credit_limit?: number;
  payment_terms?: string | null;
  notes?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface SupplierListParams {
  search?: string;
  status?: string;
  business_unit_id?: number;
  page?: number;
  per_page?: number;
  all?: boolean;
}
