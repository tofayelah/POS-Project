import api from './axios';

export interface CustomerGroup {
  id: number;
  name: string;
  code?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
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
}

export const customersApi = {
  getGroups: (params?: { search?: string; status?: string }) => 
    api.get<{success: boolean, data: CustomerGroup[]}>('/customer-groups', { params }).then(res => res.data),
  createGroup: (data: Partial<CustomerGroup>) => 
    api.post<{success: boolean, data: CustomerGroup}>('/customer-groups', data).then(res => res.data),
  updateGroup: (id: number, data: Partial<CustomerGroup>) => 
    api.put<{success: boolean, data: CustomerGroup}>(`/customer-groups/${id}`, data).then(res => res.data),
  deleteGroup: (id: number) => 
    api.delete<{success: boolean}>(`/customer-groups/${id}`).then(res => res.data),

  getCustomers: (params?: { search?: string; status?: string; customer_group_id?: number; page?: number }) => 
    api.get<{success: boolean, data: { data: Customer[], current_page: number, last_page: number }}>('/customers', { params }).then(res => res.data),
  searchCustomers: (query: string) => 
    api.get<{success: boolean, data: Customer[]}>('/customers/search', { params: { q: query } }).then(res => res.data),
  getCustomer: (id: number) => 
    api.get<{success: boolean, data: Customer}>(`/customers/${id}`).then(res => res.data),
  createCustomer: (data: Partial<Customer> & { opening_balance_amount?: number, opening_balance_direction?: 'DEBIT' | 'CREDIT', opening_balance_date?: string }) => 
    api.post<{success: boolean, data: Customer}>('/customers', data).then(res => res.data),
  updateCustomer: (id: number, data: Partial<Customer>) => 
    api.put<{success: boolean, data: Customer}>(`/customers/${id}`, data).then(res => res.data),
  deleteCustomer: (id: number) => 
    api.delete<{success: boolean}>(`/customers/${id}`).then(res => res.data),

  getLedger: (id: number, params?: { start_date?: string; end_date?: string; transaction_type?: string; page?: number }) =>
    api.get<{success: boolean, data: { data: CustomerLedger[], current_page: number, last_page: number }}>(`/customers/${id}/ledger`, { params }).then(res => res.data),
  addOpeningBalance: (id: number, data: { amount: number; direction: 'DEBIT' | 'CREDIT'; date: string; notes?: string }) =>
    api.post<{success: boolean, data: CustomerLedger}>(`/customers/${id}/opening-balance`, data).then(res => res.data),
  addAdjustment: (id: number, data: { amount: number; direction: 'DEBIT' | 'CREDIT'; date: string; notes: string; reference_number?: string }) =>
    api.post<{success: boolean, data: CustomerLedger}>(`/customers/${id}/ledger/adjustment`, data).then(res => res.data),
};
