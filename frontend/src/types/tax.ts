export interface TaxProfile {
  id: number;
  company_id: number;
  business_unit_id?: number | null;
  branch_id?: number | null;
  legal_name: string;
  trade_name: string;
  bin: string;
  tin: string;
  vat_registration_number?: string | null;
  turnover_tax_enrollment_number?: string | null;
  taxpayer_type: 'VAT_REGISTERED' | 'TURNOVER_TAX' | 'EXEMPT' | 'NON_REGISTERED' | 'OTHER';
  tax_jurisdiction: string;
  tax_circle?: string | null;
  tax_zone?: string | null;
  commissionerate?: string | null;
  effective_from: string;
  effective_to?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  address?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  notes?: string | null;
  registrations?: TaxRegistration[];
  created_at?: string;
  updated_at?: string;
}

export interface TaxRegistration {
  id: number;
  company_id: number;
  tax_profile_id?: number | null;
  registration_type: 'VAT' | 'TURNOVER_TAX' | 'INCOME_TAX' | 'CUSTOMS_BIN' | 'OTHER';
  registration_number: string;
  issuing_authority: string;
  source_reference?: string | null;
  issue_date: string;
  effective_date: string;
  expiry_date?: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'CANCELLED';
  notes?: string | null;
}

export interface TaxCategory {
  id: number;
  company_id?: number | null;
  name: string;
  code?: string | null;
  description?: string | null;
  is_active: boolean;
}

export interface TaxComponent {
  id?: number;
  company_id?: number | null;
  tax_rule_id?: number;
  code: string;
  name: string;
  type: 'OUTPUT_VAT' | 'INPUT_VAT' | 'SUPPLEMENTARY_DUTY' | 'WITHHOLDING_TAX' | 'ADVANCE_TAX' | 'OTHER';
  rate: number;
  sequence: number;
  account_id?: number | null;
  legal_reference?: string | null;
}

export interface TaxRule {
  id: number;
  company_id?: number | null;
  tax_category_id: number;
  code: string;
  name: string;
  description?: string | null;
  rate: number;
  calculation_method: 'PERCENTAGE' | 'FIXED' | 'COMPOUND_PERCENTAGE' | 'CONFIGURED';
  base_method: 'NET_AMOUNT' | 'GROSS_AMOUNT' | 'ASSESSMENT_VALUE' | 'PREVIOUS_COMPONENTS';
  inclusive_allowed: boolean;
  exclusive_allowed: boolean;
  priority: number;
  effective_from: string;
  effective_to?: string | null;
  legal_reference?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUPERSEDED';
  category?: TaxCategory;
  components?: TaxComponent[];
}

export interface TaxPeriod {
  id: number;
  company_id: number;
  period_name: string;
  period_start: string;
  period_end: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'ADJUSTMENT' | 'FINALIZED' | 'FILED' | 'CLOSED';
  locked_at?: string | null;
  locked_by?: number | null;
  filed_at?: string | null;
  filed_by?: number | null;
  filing_reference?: string | null;
  notes?: string | null;
}

export interface TaxTransactionComponent {
  id: number;
  tax_transaction_id: number;
  component_code: string;
  component_name: string;
  tax_type: string;
  rate: number;
  taxable_base: number;
  tax_amount: number;
  legal_reference?: string | null;
}

export interface TaxTransaction {
  id: number;
  company_id: number;
  branch_id?: number | null;
  tax_period_id?: number | null;
  transaction_type:
    | 'SALE_OUTPUT'
    | 'PURCHASE_INPUT'
    | 'SALE_RETURN_REVERSAL'
    | 'PURCHASE_RETURN_REVERSAL'
    | 'EXPENSE_INPUT'
    | 'PAYROLL_WITHHOLDING'
    | 'TAX_ADJUSTMENT'
    | 'TAX_SETTLEMENT'
    | 'IMPORT_TAX';
  source_type: string;
  source_id: number;
  tax_rule_id?: number | null;
  tax_category_id?: number | null;
  document_number: string;
  document_date: string;
  taxable_amount: number;
  tax_amount: number;
  sd_amount: number;
  at_amount: number;
  withholding_amount: number;
  total_tax_amount: number;
  is_inclusive: boolean;
  journal_entry_id?: number | null;
  status: 'POSTED' | 'ADJUSTED' | 'REVERSED' | 'VOID';
  legal_reference?: string | null;
  metadata?: any;
  posted_at: string;
  components?: TaxTransactionComponent[];
  period?: TaxPeriod;
  rule?: TaxRule;
}

export interface TaxAdjustment {
  id: number;
  company_id: number;
  branch_id?: number | null;
  tax_period_id: number;
  adjustment_number: string;
  adjustment_type:
    | 'OUTPUT_VAT_INCREASE'
    | 'OUTPUT_VAT_DECREASE'
    | 'INPUT_VAT_INCREASE'
    | 'INPUT_VAT_DECREASE'
    | 'ROUNDING'
    | 'CREDIT_NOTE'
    | 'DEBIT_NOTE'
    | 'OTHER';
  reason: string;
  amount: number;
  tax_amount: number;
  legal_reference?: string | null;
  source_tax_transaction_id?: number | null;
  journal_entry_id?: number | null;
  status: 'DRAFT' | 'APPROVED' | 'POSTED' | 'REJECTED';
  approved_by?: number | null;
  approved_at?: string | null;
  posted_by?: number | null;
  posted_at?: string | null;
  created_by: number;
  period?: TaxPeriod;
  source_transaction?: TaxTransaction;
}

export interface TaxReconciliation {
  id: number;
  company_id: number;
  tax_period_id: number;
  reconciliation_number: string;
  reconciled_date: string;
  output_vat_subledger: number;
  output_vat_gl: number;
  output_vat_difference: number;
  input_vat_subledger: number;
  input_vat_gl: number;
  input_vat_difference: number;
  adjustments_total: number;
  net_tax_payable: number;
  status: 'RECONCILED' | 'EXCEPTION' | 'PENDING_REVIEW';
  exceptions?: Array<{
    type: string;
    description: string;
    difference: number;
  }> | null;
  notes?: string | null;
}

export interface VatSummaryReport {
  total_sales_taxable: number;
  total_output_vat: number;
  total_output_sd: number;
  total_return_reversals: number;
  net_output_vat: number;
  total_purchase_taxable: number;
  total_input_vat: number;
  total_input_sd: number;
  total_adjustments: number;
  net_vat_payable: number;
  total_settlements: number;
  closing_vat_liability: number;
  closing_vat_refundable: number;
  transaction_count: number;
}

export interface MushakReportFoundation {
  taxpayer: {
    legal_name: string;
    trade_name: string;
    bin: string;
    tin: string;
    tax_circle: string;
    tax_zone: string;
    commissionerate: string;
    address: string;
  };
  period: {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    status: string;
    filing_reference?: string | null;
  };
  mushak_9_1_parts: {
    part_3_goods_services_supply: {
      standard_rated_supplies: number;
      output_vat: number;
      supplementary_duty: number;
    };
    part_4_purchases_inputs: {
      standard_rated_inputs: number;
      input_vat: number;
      input_sd: number;
    };
    part_5_adjustments: {
      increasing_adjustments: number;
      decreasing_adjustments: number;
      net_adjustment: number;
    };
    part_6_net_tax_calculation: {
      net_payable_amount: number;
      treasury_payments: number;
      closing_payable: number;
      closing_refundable: number;
    };
  };
  legal_disclaimer: string;
}
