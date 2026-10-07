import api from './axios';
import {
  TaxProfile,
  TaxRegistration,
  TaxCategory,
  TaxRule,
  TaxPeriod,
  TaxTransaction,
  TaxAdjustment,
  TaxReconciliation,
  VatSummaryReport,
  MushakReportFoundation,
} from '../types/tax';

export const taxApi = {
  // Profile & Registrations
  getProfile: () => api.get<{ success: boolean; data: TaxProfile | null }>('/tax/profile'),
  updateProfile: (data: Partial<TaxProfile>) => api.put<{ success: boolean; message: string; data: TaxProfile }>('/tax/profile', data),
  getRegistrations: () => api.get<{ success: boolean; data: TaxRegistration[] }>('/tax/registrations'),
  createRegistration: (data: Partial<TaxRegistration>) => api.post<{ success: boolean; message: string; data: TaxRegistration }>('/tax/registrations', data),
  deleteRegistration: (id: number) => api.delete<{ success: boolean; message: string }>(`/tax/registrations/${id}`),

  // Categories & Rules
  getCategories: () => api.get<{ success: boolean; data: TaxCategory[] }>('/tax/categories'),
  createCategory: (data: Partial<TaxCategory>) => api.post<{ success: boolean; message: string; data: TaxCategory }>('/tax/categories', data),
  getRules: (params?: any) => api.get<{ success: boolean; data: TaxRule[] }>('/tax/rules', { params }),
  createRule: (data: Partial<TaxRule>) => api.post<{ success: boolean; message: string; data: TaxRule }>('/tax/rules', data),
  updateRule: (id: number, data: Partial<TaxRule>) => api.put<{ success: boolean; message: string; data: TaxRule }>(`/tax/rules/${id}`, data),
  toggleRuleStatus: (id: number, status: 'ACTIVE' | 'INACTIVE') => api.patch<{ success: boolean; message: string; data: TaxRule }>(`/tax/rules/${id}/status`, { status }),

  // Tax Periods
  getPeriods: (params?: any) => api.get<{ success: boolean; data: TaxPeriod[] }>('/tax/periods', { params }),
  getCurrentPeriod: (date?: string) => api.get<{ success: boolean; data: TaxPeriod | null }>('/tax/periods/current', { params: { date } }),
  createPeriod: (data: Partial<TaxPeriod>) => api.post<{ success: boolean; message: string; data: TaxPeriod }>('/tax/periods', data),
  lockPeriod: (id: number) => api.post<{ success: boolean; message: string; data: TaxPeriod }>(`/tax/periods/${id}/lock`),
  filePeriod: (id: number, filing_reference: string) => api.post<{ success: boolean; message: string; data: TaxPeriod }>(`/tax/periods/${id}/file`, { filing_reference }),
  closePeriod: (id: number) => api.post<{ success: boolean; message: string; data: TaxPeriod }>(`/tax/periods/${id}/close`),

  // Subledger Transactions & Settlement
  getTransactions: (params?: any) => api.get<{ success: boolean; data: { data: TaxTransaction[]; total: number; current_page: number; last_page: number } }>('/tax/transactions', { params }),
  getTransaction: (id: number) => api.get<{ success: boolean; data: TaxTransaction }>(`/tax/transactions/${id}`),
  settleTax: (data: { tax_period_id: number; amount: number; payment_method_id: number; reference_number: string }) =>
    api.post<{ success: boolean; message: string; data: TaxTransaction }>('/tax/transactions/settle', data),

  // Reconciliation
  getReconciliation: (periodId: number) => api.get<{ success: boolean; data: TaxReconciliation | null }>(`/tax/periods/${periodId}/reconciliation`),
  reconcilePeriod: (periodId: number) => api.post<{ success: boolean; message: string; data: TaxReconciliation }>(`/tax/periods/${periodId}/reconcile`),

  // Adjustments
  getAdjustments: (params?: any) => api.get<{ success: boolean; data: TaxAdjustment[] }>('/tax/adjustments', { params }),
  createAdjustment: (data: Partial<TaxAdjustment>) => api.post<{ success: boolean; message: string; data: TaxAdjustment }>('/tax/adjustments', data),
  approveAdjustment: (id: number) => api.post<{ success: boolean; message: string; data: TaxAdjustment }>(`/tax/adjustments/${id}/approve`),
  postAdjustment: (id: number) => api.post<{ success: boolean; message: string; data: TaxAdjustment }>(`/tax/adjustments/${id}/post`),

  // Calculations
  calculateItemTax: (data: { amount: number; tax_category_id?: number; tax_rule_code?: string; is_inclusive?: boolean; date?: string; customer_tax_status?: string; transaction_type?: string }) =>
    api.post<{ success: boolean; data: any }>('/tax/calculate', data),
  calculateInvoiceTax: (data: { items: any[]; is_inclusive?: boolean; date?: string; tax_status?: string; transaction_type?: string }) =>
    api.post<{ success: boolean; data: any }>('/tax/calculate-invoice', data),
  calculateWithholding: (data: { supplier_id?: number; amount: number; rule_code?: string; date?: string }) =>
    api.post<{ success: boolean; data: any }>('/tax/calculate-withholding', data),

  // Reports
  getVatSummary: (params?: { tax_period_id?: number; start_date?: string; end_date?: string }) =>
    api.get<{ success: boolean; data: VatSummaryReport }>('/reports/tax/vat-summary', { params }),
  getOutputVatReport: (params?: any) => api.get<{ success: boolean; data: any }>('/reports/tax/output-vat', { params }),
  getInputVatReport: (params?: any) => api.get<{ success: boolean; data: any }>('/reports/tax/input-vat', { params }),
  getMushakFoundation: (periodId: number) => api.get<{ success: boolean; data: MushakReportFoundation }>(`/reports/tax/mushak-foundation/${periodId}`),
};
