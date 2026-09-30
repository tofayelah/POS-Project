import api from './axios';
import { Customer } from './customers';

export interface PosTerminal {
  id: number;
  company_id: number;
  terminal_code: string;
  terminal_name: string;
  status: 'ACTIVE' | 'INACTIVE';
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
  method: string; // 'CASH' | 'CARD' | 'BKASH' | 'NAGAD' | 'ROCKET' | 'BANK'
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
  getTerminals: () => 
    api.get<{success: boolean, data: PosTerminal[]}>('/pos/terminals').then(res => res.data),
  
  createTerminal: (data: Partial<PosTerminal>) => 
    api.post<{success: boolean, data: PosTerminal}>('/pos/terminals', data).then(res => res.data),
  
  getCurrentSession: () => 
    api.get<{success: boolean, data: PosSession}>('/pos/sessions/current').then(res => res.data),
    
  openSession: (terminalId: number, openingCash: number, notes?: string) => 
    api.post<{success: boolean, data: PosSession}>('/pos/sessions/open', { pos_terminal_id: terminalId, opening_cash: openingCash, notes }).then(res => res.data),
    
  closeSession: (id: number, closingCash: number, notes?: string) => 
    api.post<{success: boolean, data: PosSession}>(`/pos/sessions/${id}/close`, { closing_cash: closingCash, notes }).then(res => res.data),

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
