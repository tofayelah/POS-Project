export interface CustomerGroup {
  id: number | string;
  name: string;
  code?: string;
  description?: string;
  status?: string;
}

export interface Customer {
  id: number | string;
  company_id?: number | string;
  business_unit_id?: number | string;
  customer_group_id?: number | string;
  name: string;
  code?: string;
  customer_code?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  credit_limit?: number;
  credit_balance?: number;
  points_balance?: number;
  status?: string;
  is_active?: boolean;
}
