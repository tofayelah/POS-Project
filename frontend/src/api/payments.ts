import api from './axios';

export interface CreatePaymentPayload {
  amount: number;
  payment_type: 'CUSTOMER' | 'SUPPLIER';
  payment_method: 'CASH' | 'BANK' | 'CHEQUE' | 'MFS' | string;
  payment_number?: string;
  payment_date?: string;
  reference_number?: string;
  branch_id?: number | null;
  idempotency_key?: string;
}

export interface PaymentAllocationPayload {
  allocations: Array<{
    allocatable_type: 'Purchase' | 'Sale' | string;
    allocatable_id: number;
    amount: number;
  }>;
}

export const generateIdempotencyKey = (prefix = 'PAY'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
};

export async function getPayments(params?: {
  payment_type?: string;
  payment_method?: string;
  status?: string;
  per_page?: number;
}): Promise<any> {
  const response = await api.get('/payments', { params });
  return response.data;
}

export async function createPayment(payload: CreatePaymentPayload): Promise<any> {
  const idempotencyKey = payload.idempotency_key || generateIdempotencyKey('PAY-SUPP');
  const response = await api.post('/payments', payload, {
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
  });
  return response.data;
}

export async function allocatePayment(
  paymentId: number,
  payload: PaymentAllocationPayload
): Promise<any> {
  const response = await api.post(`/payments/${paymentId}/allocate`, payload);
  return response.data;
}
