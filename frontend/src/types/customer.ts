export interface CustomerGroup {
  id: number;
  name: string;
  code?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
}

export interface Customer {
  id: number;
  company_id: number;
  business_unit_id?: number;
  customer_group_id?: number;
  customer_code: string;
  name: string;
  mobile?: string;
  alternate_mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  credit_limit?: number;
  payment_terms?: string;
  opening_balance: number;
  current_balance?: number;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
  group?: CustomerGroup;
}

export interface CustomerLedger {
  id: number;
  customer_id: number;
  transaction_type: string;
  reference_type?: string;
  reference_id?: number;
  reference_number?: string;
  debit: number;
  credit: number;
  balance_before: number;
  balance_after: number;
  transaction_date: string;
  notes?: string;
  created_at: string;
}
