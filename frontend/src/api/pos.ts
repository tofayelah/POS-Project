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

export interface SalePaymentData {
  method: string;
  amount: number;
}

export interface CompleteSaleData {
  pos_session_id: number;
  customer_id?: number;
  items: SaleItemData[];
  sale_discount?: number;
  payments: SalePaymentData[];
  notes?: string;
  invoice_number?: string;
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
    api.get<{success: boolean, data: any[]}>('/pos/products/search', { params: { q: query } }).then(res => res.data),
    
  getBarcode: (barcode: string) => 
    api.get<{success: boolean, data: any}>(`/pos/barcode/${barcode}`).then(res => res.data),
    
  completeSale: (data: CompleteSaleData) => 
    api.post<{success: boolean, data: any}>('/sales/complete', data).then(res => res.data),
    
  holdSale: (data: Partial<CompleteSaleData>) => 
    api.post<{success: boolean, data: any}>('/sales/hold', data).then(res => res.data),
};
