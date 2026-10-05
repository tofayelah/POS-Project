import api from './axios';

export interface StoreCreditAccount {
  customer_id: number;
  customer_name: string;
  account_status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  current_balance: number;
  can_redeem: boolean;
}

export interface StoreCreditTransaction {
  id: number;
  company_id: number;
  customer_id: number;
  store_credit_account_id: number;
  type: 'ISSUE' | 'REDEEM' | 'REFUND' | 'ADJUSTMENT' | 'REVERSAL' | 'EXPIRY';
  amount: number;
  balance_before: number;
  balance_after: number;
  reference_type?: string | null;
  reference_id?: number | null;
  reference_number?: string | null;
  description?: string | null;
  expires_at?: string | null;
  created_at: string;
  creator?: {
    id: number;
    name: string;
  } | null;
}

export interface StoreCreditTransactionResponse {
  data: StoreCreditTransaction[];
  current_page: number;
  last_page: number;
  total: number;
}

export const storeCreditApi = {
  getCustomerCredit: (customerId: number) =>
    api.get<{ success: boolean; data: StoreCreditAccount }>(`/customers/${customerId}/store-credit`).then(res => res.data),

  getTransactions: (customerId: number, params?: { type?: string; date_from?: string; date_to?: string; per_page?: number; page?: number }) =>
    api.get<{ success: boolean; data: StoreCreditTransactionResponse }>(`/customers/${customerId}/store-credit/transactions`, { params }).then(res => res.data),

  issueCredit: (customerId: number, data: { amount: number; description?: string; reference_number?: string; expires_at?: string }) =>
    api.post<{ success: boolean; message: string; data: { customer_id: number; current_balance: number; transaction: StoreCreditTransaction } }>(`/customers/${customerId}/store-credit/issue`, data).then(res => res.data),

  redeemCredit: (customerId: number, data: { amount: number; description?: string; reference_number?: string }) =>
    api.post<{ success: boolean; message: string; data: { customer_id: number; current_balance: number; transaction: StoreCreditTransaction } }>(`/customers/${customerId}/store-credit/redeem`, data).then(res => res.data),

  adjustCredit: (customerId: number, data: { amount: number; reason: string }) =>
    api.post<{ success: boolean; message: string; data: { customer_id: number; current_balance: number; transaction: StoreCreditTransaction } }>(`/customers/${customerId}/store-credit/adjust`, data).then(res => res.data),
};
