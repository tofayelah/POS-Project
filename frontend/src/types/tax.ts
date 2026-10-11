export interface TaxRate {
  id: number | string;
  name: string;
  code?: string;
  rate_percent: number;
  rate?: number;
  is_active?: boolean;
}

export interface TaxGroup {
  id: number | string;
  name: string;
  rates?: TaxRate[];
}

export interface TaxProfile {
  id: number | string;
  name: string;
  bin_number?: string;
  vat_registration_no?: string;
}

export interface TaxRegistration {
  id: number | string;
  registration_number: string;
  tax_type: string;
}

export interface TaxCategory {
  id: number | string;
  name: string;
  code?: string;
}

export interface TaxRule {
  id: number | string;
  name: string;
  tax_rate_id: number | string;
}

export interface TaxPeriod {
  id: number | string;
  period_name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
}

export interface TaxTransaction {
  id: number | string;
  transaction_date: string;
  amount: number;
  tax_amount: number;
}

export interface TaxAdjustment {
  id: number | string;
  adjustment_date: string;
  amount: number;
  reason?: string;
}

export interface TaxReconciliation {
  id: number | string;
  period_id: number | string;
  calculated_tax: number;
  declared_tax: number;
  difference: number;
}

export interface VatSummaryReport {
  period_name?: string;
  total_sales_vat?: number;
  total_purchase_vat?: number;
  net_vat_payable?: number;
}

export interface MushakReportFoundation {
  mushak_type: string;
  period_name?: string;
  data?: any;
}
