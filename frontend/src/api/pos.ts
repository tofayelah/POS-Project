import api from './axios';
import { Customer } from './customers';

export interface PaymentMethod {
  id: number;
  company_id: number;
  name: string;
  code: string; // CASH, CARD, BKASH, NAGAD, BANK, POINT_REDEMPTION
  type: 'CASH' | 'CARD' | 'MFS' | 'BANK' | 'POINT';
  is_active: boolean;
  sort_order: number;
  account_id?: number | null;
  account?: {
    id: number;
    account_code: string;
    account_name: string;
  } | null;
  pivot?: {
    is_enabled: boolean;
  };
}

export interface PosTerminal {
  id: number;
  company_id: number;
  terminal_code: string;
  terminal_name: string;
  status: 'ACTIVE' | 'INACTIVE';
  warehouse_id?: number;
  branch_id?: number | null;
  branch?: { id: number; name: string } | null;
  warehouse?: { id: number; name: string } | null;
  default_cash_account_id?: number | null;
  default_card_account_id?: number | null;
  default_bkash_account_id?: number | null;
  default_nagad_account_id?: number | null;
  default_bank_account_id?: number | null;
  receipt_header?: string | null;
  receipt_footer?: string | null;
  payment_methods?: PaymentMethod[];
  default_cash_account?: { id: number; account_code: string; account_name: string } | null;
  default_card_account?: { id: number; account_code: string; account_name: string } | null;
  default_bkash_account?: { id: number; account_code: string; account_name: string } | null;
  default_nagad_account?: { id: number; account_code: string; account_name: string } | null;
  default_bank_account?: { id: number; account_code: string; account_name: string } | null;
}

export interface PosSession {
  id: number;
  company_id: number;
  pos_terminal_id: number;
  cashier_id: number;
  session_number: string;
  opening_cash: number;
  closing_cash?: number;
  expected_cash?: number;
  cash_difference?: number;
  status: 'OPEN' | 'CLOSED';
}

export interface LoyaltySettings {
  id?: number;
  company_id?: number;
  earning_spend_per_point: number;
  earning_points_awarded: number;
  redemption_point_value: number;
  min_redemption_points: number;
  is_active: boolean;
  disallow_earn_on_discount: boolean;
  disallow_earn_on_redemption: boolean;
  disallow_discount_with_redemption: boolean;
}

export interface CustomerPoints {
  customer_id: number;
  customer_name: string;
  points_balance: number;
  redemption_value: number;
  min_redemption_points: number;
  can_redeem: boolean;
  recent_ledger: any[];
}

export interface CustomerPointLedgerItem {
  id: number;
  customer_id: number;
  sale_id?: number | null;
  transaction_type: 'EARN' | 'REDEEM' | 'ADJUSTMENT' | 'REVERSAL';
  points: number;
  balance_before: number;
  balance_after: number;
  reference_number?: string | null;
  description?: string | null;
  created_at: string;
  creator?: { id: number; name: string } | null;
  sale?: { id: number; invoice_number: string } | null;
}

export interface SaleItemData {
  product_variant_id: number;
  quantity: number;
  unit_price: number;
  discount?: number;
  tax?: number;
}

export interface PosProductVariant {
  id: number;
  product_id: number;
  sku: string;
  variant_name: string;
  cost_price?: number | string;
  selling_price: number | string;
  wholesale_price?: number | string;
  mrp: number | string;
  tax_rate?: number | string | null;
  status: string;
  available_stock?: number;
  product: {
    id: number;
    name: string;
    tax_rate?: number | string | null;
    category?: {
      id: number;
      name: string;
    };
  };
  barcodes?: Array<{
    id: number;
    barcode: string;
    barcode_type?: string;
    is_primary: boolean;
  }>;
}

export interface CartItem {
  id: string; // unique row key
  product_variant_id: number;
  barcode: string;
  sku: string;
  name: string;
  variant_name: string;
  category_name: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
  available_stock: number;
}

export interface SalePaymentData {
  method: string; // 'CASH' | 'CARD' | 'BKASH' | 'NAGAD' | 'BANK' | 'POINT_REDEMPTION'
  amount: number;
  card_type?: string;
  card_bank?: string;
  transaction_ref?: string;
}

export interface CompleteSaleData {
  pos_session_id: number;
  customer_id?: number | null;
  items: SaleItemData[];
  sale_discount?: number;
  payments: SalePaymentData[];
  points_redeemed?: number;
  notes?: string;
  invoice_number?: string;
  idempotency_key?: string;
}

export interface PosStaffUser {
  id: number;
  name: string;
  email: string;
  role?: string;
}

export interface PosHeldSaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  product_variant_id: number;
  sku_snapshot: string;
  barcode_snapshot?: string;
  product_name_snapshot: string;
  variant_description_snapshot?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax: number;
  line_total: number;
  variant?: PosProductVariant;
}

export interface PosHeldSale {
  id: number;
  company_id: number;
  pos_session_id?: number;
  customer_id?: number | null;
  invoice_number: string;
  sale_date: string;
  status: 'HELD';
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  notes?: string;
  created_at: string;
  customer?: Customer | null;
  items: PosHeldSaleItem[];
}

export const posApi = {
  getTerminals: (params?: { status?: string; branch_id?: number }) => 
    api.get<{success: boolean, data: PosTerminal[]}>('/pos/terminals', { params }).then(res => res.data),
  
  createTerminal: (data: Partial<PosTerminal>) => 
    api.post<{success: boolean, data: PosTerminal}>('/pos/terminals', data).then(res => res.data),

  getTerminal: (id: number) =>
    api.get<{success: boolean, data: PosTerminal}>(`/pos/terminals/${id}`).then(res => res.data),

  updateTerminal: (id: number, data: Partial<PosTerminal>) =>
    api.put<{success: boolean, data: PosTerminal}>(`/pos/terminals/${id}`, data).then(res => res.data),

  syncTerminalPaymentMethods: (id: number, methods: Array<{ payment_method_id: number; is_enabled: boolean }>) =>
    api.put<{success: boolean, data: PosTerminal}>(`/pos/terminals/${id}/payment-methods`, { methods }).then(res => res.data),
  
  getPaymentMethods: (params?: { is_active?: boolean }) =>
    api.get<{success: boolean, data: PaymentMethod[]}>('/pos/payment-methods', { params }).then(res => res.data),

  createPaymentMethod: (data: Partial<PaymentMethod>) =>
    api.post<{success: boolean, data: PaymentMethod}>('/pos/payment-methods', data).then(res => res.data),

  updatePaymentMethod: (id: number, data: Partial<PaymentMethod>) =>
    api.put<{success: boolean, data: PaymentMethod}>(`/pos/payment-methods/${id}`, data).then(res => res.data),

  togglePaymentMethod: (id: number) =>
    api.post<{success: boolean, data: PaymentMethod}>(`/pos/payment-methods/${id}/toggle`).then(res => res.data),

  getLoyaltySettings: () =>
    api.get<{success: boolean, data: LoyaltySettings}>('/pos/loyalty/settings').then(res => res.data),

  updateLoyaltySettings: (data: Partial<LoyaltySettings>) =>
    api.put<{success: boolean, data: LoyaltySettings}>('/pos/loyalty/settings', data).then(res => res.data),

  getCustomerPoints: (customerId: number) =>
    api.get<{success: boolean, data: CustomerPoints}>(`/customers/${customerId}/points`).then(res => res.data),

  getCustomerPointLedger: (customerId: number, page: number = 1) =>
    api.get<{success: boolean, data: { data: CustomerPointLedgerItem[], current_page: number, last_page: number, total: number }}>(`/customers/${customerId}/points/ledger`, { params: { page } }).then(res => res.data),

  adjustCustomerPoints: (customerId: number, points: number, reason: string) =>
    api.post<{success: boolean, data: any}>(`/customers/${customerId}/points/adjust`, { points, reason }).then(res => res.data),

  getCurrentSession: () => 
    api.get<{success: boolean, data: PosSession}>('/pos/sessions/current').then(res => res.data),
    
  openSession: (terminalId: number, openingCash: number, notes?: string) => 
    api.post<{success: boolean, data: PosSession}>('/pos/sessions/open', { pos_terminal_id: terminalId, opening_cash: openingCash, notes }).then(res => res.data),
    
  closeSession: (id: number, closingCash: number, notes?: string) => 
    api.post<{success: boolean, data: PosSession}>(`/pos/sessions/${id}/close`, { closing_cash: closingCash, notes }).then(res => res.data),

  getSessionReconciliation: (sessionId: number) =>
    api.get<{success: boolean, data: any}>(`/pos/sessions/${sessionId}/reconciliation`).then(res => res.data),

  searchProducts: (query: string) => 
    api.get<{success: boolean, data: PosProductVariant[]}>('/pos/products/search', { params: { q: query } }).then(res => res.data),
    
  getBarcode: (barcode: string) =>
    api.get<{success: boolean, data: PosProductVariant}>(`/pos/barcode/${barcode}`).then(res => res.data),

  completeSale: (data: CompleteSaleData) =>
    api.post<{success: boolean, data: any}>('/sales/complete', data).then(res => res.data),

  holdSale: (data: Partial<CompleteSaleData> & { notes?: string; discount_total?: number; tax_total?: number; grand_total?: number }) =>
    api.post<{success: boolean, data: any}>('/sales/hold', data).then(res => res.data),

  getHeldSales: (sessionId?: number) =>
    api.get<{success: boolean, data: PosHeldSale[]}>('/sales/held', { params: sessionId ? { pos_session_id: sessionId } : {} }).then(res => res.data),

  deleteHeldSale: (id: number) =>
    api.delete<{success: boolean, message?: string}>(`/sales/held/${id}`).then(res => res.data),

  getUsers: () =>
    api.get<{success: boolean, data: any}>('/users').then(res => {
      const d = res.data;
      if (Array.isArray(d)) return d;
      if (Array.isArray(d?.data)) return d.data;
      return [];
    }),
};
