export type BudgetPeriodType = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
export type BudgetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'ACTIVE' | 'ARCHIVED' | 'REVISED';
export type BudgetControlLevel = 'ALLOW' | 'WARNING' | 'APPROVAL_REQUIRED' | 'BLOCK';
export type AccountingPeriodStatus = 'OPEN' | 'SOFT_LOCK' | 'CLOSED';
export type BankAccountType = 'CURRENT' | 'SAVINGS' | 'OVERDRAFT' | 'ESCROW' | 'MOBILE_BANKING';
export type ReconciliationStatus = 'DRAFT' | 'IN_PROGRESS' | 'RECONCILED';
export type MatchType = 'EXACT' | 'REFERENCE' | 'DATE_WINDOW' | 'MANUAL';
export type DepreciationMethod = 'STRAIGHT_LINE' | 'REDUCING_BALANCE' | 'NONE';
export type AssetStatus = 'ACTIVE' | 'UNDER_MAINTENANCE' | 'DISPOSED' | 'WRITTEN_OFF';

export interface CostCentre {
  id: number;
  company_id: number;
  code: string;
  name: string;
  parent_id?: number | null;
  manager_name?: string | null;
  budget_limit?: number | null;
  status: 'ACTIVE' | 'INACTIVE';
  parent?: CostCentre | null;
  children?: CostCentre[];
  created_at?: string;
  updated_at?: string;
}

export interface ProfitCentre {
  id: number;
  company_id: number;
  code: string;
  name: string;
  business_unit_id?: number | null;
  target_revenue?: number | null;
  target_margin_pct?: number | null;
  status: 'ACTIVE' | 'INACTIVE';
  business_unit?: any;
  created_at?: string;
  updated_at?: string;
}

export interface Budget {
  id: number;
  company_id: number;
  fiscal_year_id: number;
  cost_centre_id?: number | null;
  name: string;
  period_type: BudgetPeriodType;
  version: number;
  revision_of_id?: number | null;
  total_budgeted_amount: number;
  status: BudgetStatus;
  approved_by?: number | null;
  approved_at?: string | null;
  notes?: string | null;
  lines?: BudgetLine[];
  cost_centre?: CostCentre | null;
  fiscal_year?: any;
  created_at?: string;
  updated_at?: string;
}

export interface BudgetLine {
  id: number;
  budget_id: number;
  account_id: number;
  cost_centre_id?: number | null;
  month_number?: number | null;
  quarter_number?: number | null;
  allocated_amount: number;
  account?: any;
  cost_centre?: CostCentre | null;
  created_at?: string;
  updated_at?: string;
}

export interface BudgetControl {
  id: number;
  company_id: number;
  account_id?: number | null;
  cost_centre_id?: number | null;
  warning_threshold_pct: number;
  hard_stop_threshold_pct: number;
  control_level: BudgetControlLevel;
  is_active: boolean;
  account?: any;
  cost_centre?: CostCentre | null;
  created_at?: string;
  updated_at?: string;
}

export interface BudgetVarianceReport {
  budget_id: number;
  budget_name: string;
  version: number;
  fiscal_year: string;
  cost_centre?: string;
  total_budget: number;
  total_actual: number;
  net_variance: number;
  overall_status: 'UNDER_BUDGET' | 'OVER_BUDGET' | 'ON_TRACK';
  lines: Array<{
    account_code: string;
    account_name: string;
    allocated_amount: number;
    actual_amount: number;
    variance: number;
    variance_pct: number;
    status: 'UNDER_BUDGET' | 'OVER_BUDGET' | 'ON_TRACK';
  }>;
}

export interface BankAccount {
  id: number;
  company_id: number;
  gl_account_id: number;
  bank_name: string;
  branch_name?: string | null;
  account_name: string;
  account_number: string;
  routing_number?: string | null;
  swift_code?: string | null;
  currency: string;
  account_type: BankAccountType;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
  gl_account?: any;
  created_at?: string;
  updated_at?: string;
}

export interface BankStatement {
  id: number;
  bank_account_id: number;
  statement_date: string;
  opening_balance: number;
  closing_balance: number;
  reference?: string | null;
  file_path?: string | null;
  imported_by: number;
  lines?: BankStatementLine[];
  bank_account?: BankAccount;
  created_at?: string;
  updated_at?: string;
}

export interface BankStatementLine {
  id: number;
  bank_statement_id: number;
  transaction_date: string;
  value_date?: string | null;
  description: string;
  reference_number?: string | null;
  cheque_number?: string | null;
  withdrawal_amount: number;
  deposit_amount: number;
  balance_after?: number | null;
  is_reconciled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BankReconciliation {
  id: number;
  bank_account_id: number;
  statement_date: string;
  statement_closing_balance: number;
  gl_closing_balance: number;
  difference: number;
  status: ReconciliationStatus;
  reconciled_by?: number | null;
  reconciled_at?: string | null;
  notes?: string | null;
  bank_account?: BankAccount;
  matches?: BankReconciliationMatch[];
  created_at?: string;
  updated_at?: string;
}

export interface BankReconciliationMatch {
  id: number;
  bank_reconciliation_id: number;
  bank_statement_line_id: number;
  journal_entry_line_id: number;
  match_type: MatchType;
  matched_amount: number;
  bank_statement_line?: BankStatementLine;
  journal_entry_line?: any;
  created_at?: string;
  updated_at?: string;
}

export interface FinancialPeriodExtended {
  id: number;
  fiscal_year_id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: AccountingPeriodStatus;
  is_closed: boolean;
  closed_at?: string | null;
  closed_by?: number | null;
  soft_locked_at?: string | null;
  soft_locked_by?: number | null;
  reopened_at?: string | null;
  reopened_by?: number | null;
  reopened_reason?: string | null;
  fiscal_year?: any;
  closer?: any;
  soft_locker?: any;
  reopener?: any;
  created_at?: string;
  updated_at?: string;
}

export interface PeriodClosingCheck {
  can_close: boolean;
  can_soft_lock: boolean;
  unposted_journals_count: number;
  unposted_journals: any[];
  unreconciled_bank_statements_count: number;
  warnings: string[];
}

export interface YearEndClosing {
  id: number;
  company_id: number;
  fiscal_year_id: number;
  closing_date: string;
  closing_journal_entry_id?: number | null;
  total_revenue: number;
  total_expense: number;
  net_profit_loss: number;
  retained_earnings_account_id: number;
  closed_by: number;
  is_rolled_back: boolean;
  rolled_back_at?: string | null;
  rolled_back_by?: number | null;
  fiscal_year?: any;
  closing_journal_entry?: any;
  retained_earnings_account?: any;
  created_at?: string;
  updated_at?: string;
}

export interface FixedAssetCategory {
  id: number;
  company_id: number;
  code: string;
  name: string;
  depreciation_method: DepreciationMethod;
  useful_life_years: number;
  default_rate_pct: number;
  asset_gl_account_id: number;
  accum_deprec_gl_account_id: number;
  deprec_expense_gl_account_id: number;
  is_active: boolean;
  asset_gl_account?: any;
  accum_deprec_gl_account?: any;
  deprec_expense_gl_account?: any;
  created_at?: string;
  updated_at?: string;
}

export interface FixedAsset {
  id: number;
  company_id: number;
  category_id: number;
  cost_centre_id?: number | null;
  profit_centre_id?: number | null;
  asset_code: string;
  name: string;
  purchase_date: string;
  purchase_cost: number;
  salvage_value: number;
  depreciable_amount: number;
  accumulated_depreciation: number;
  current_book_value: number;
  useful_life_months: number;
  remaining_life_months: number;
  depreciation_method: DepreciationMethod;
  status: AssetStatus;
  location?: string | null;
  serial_number?: string | null;
  category?: FixedAssetCategory;
  cost_centre?: CostCentre | null;
  profit_centre?: ProfitCentre | null;
  depreciation_entries?: AssetDepreciationEntry[];
  disposal?: AssetDisposal | null;
  created_at?: string;
  updated_at?: string;
}

export interface AssetDepreciationEntry {
  id: number;
  fixed_asset_id: number;
  accounting_period_id: number;
  journal_entry_id: number;
  depreciation_date: string;
  depreciation_amount: number;
  book_value_before: number;
  book_value_after: number;
  created_at?: string;
}

export interface AssetDisposal {
  id: number;
  fixed_asset_id: number;
  journal_entry_id: number;
  disposal_date: string;
  disposal_type: 'SALE' | 'SCRAP' | 'WRITE_OFF';
  proceeds_amount: number;
  book_value_at_disposal: number;
  gain_loss_amount: number;
  gain_or_loss: 'GAIN' | 'LOSS' | 'BREAKEVEN';
  notes?: string | null;
  created_at?: string;
}

export interface ArAgingCustomer {
  customer_id: number;
  customer_name: string;
  customer_code: string;
  mobile?: string;
  current: number;
  bucket_1_30: number;
  bucket_31_60: number;
  bucket_61_90: number;
  bucket_91_120: number;
  bucket_over_120: number;
  total_due: number;
  max_overdue_days: number;
  priority_score: number;
  priority_level: 'CRITICAL' | 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ArAgingSummary {
  as_of_date: string;
  summary: {
    total_current: number;
    total_1_30: number;
    total_31_60: number;
    total_61_90: number;
    total_91_120: number;
    total_over_120: number;
    grand_total_subledger: number;
    gl_receivables_balance: number;
    reconciliation_variance: number;
  };
  customers: ArAgingCustomer[];
}

export interface ApAgingSupplier {
  supplier_id: number;
  supplier_name: string;
  supplier_code: string;
  mobile?: string;
  current: number;
  bucket_1_30: number;
  bucket_31_60: number;
  bucket_61_90: number;
  bucket_91_120: number;
  bucket_over_120: number;
  total_due: number;
  max_overdue_days: number;
}

export interface ApAgingSummary {
  as_of_date: string;
  summary: {
    total_current: number;
    total_1_30: number;
    total_31_60: number;
    total_61_90: number;
    total_91_120: number;
    total_over_120: number;
    grand_total_subledger: number;
    gl_payables_balance: number;
    reconciliation_variance: number;
  };
  suppliers: ApAgingSupplier[];
}

export interface TreasuryPosition {
  as_of_date: string;
  total_liquid_cash: number;
  breakdown: {
    cash_accounts: Array<{ id: number; code: string; name: string; balance: number }>;
    bank_accounts: Array<{ id: number; bank_name: string; account_name: string; account_number: string; balance: number }>;
  };
  key_metrics: {
    monthly_burn_rate: number;
    cash_runway_days: number;
  };
}

export interface CashFlowForecast {
  as_of_date: string;
  horizon_days: number;
  opening_liquid_cash: number;
  forecast_breakdown: {
    projected_inflows: number;
    projected_outflows: number;
    net_cash_flow: number;
    projected_closing_balance: number;
  };
  daily_schedule: Array<{
    date: string;
    inflow: number;
    outflow: number;
    net: number;
    cumulative_balance: number;
  }>;
}

export interface FinancialRatios {
  as_of_date: string;
  profitability: {
    gross_profit_margin_pct: number;
    operating_profit_margin_pct: number;
    net_profit_margin_pct: number;
    return_on_assets_pct: number;
    return_on_equity_pct: number;
  };
  liquidity: {
    current_ratio: number;
    quick_ratio: number;
    cash_ratio: number;
  };
  leverage: {
    debt_to_equity: number;
    debt_to_assets: number;
  };
  efficiency: {
    receivables_turnover: number;
    days_sales_outstanding: number;
  };
  dupont_analysis: {
    net_profit_margin_pct: number;
    asset_turnover: number;
    equity_multiplier: number;
    roe_pct: number;
  };
}

export interface ExecutiveTelemetry {
  liquid_cash: number;
  burn_rate: number;
  cash_runway_days: number;
  total_receivables: number;
  total_payables: number;
  net_working_capital: number;
  current_ratio: number;
  quick_ratio: number;
  operating_margin_pct: number;
  net_margin_pct: number;
}
