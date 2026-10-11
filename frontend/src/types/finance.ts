export interface BankAccount {
  id: number | string;
  account_name: string;
  account_number: string;
  bank_name: string;
  branch_name?: string;
  account_type?: string;
  routing_number?: string;
  balance: number;
  current_balance?: number;
  currency?: string;
  is_active: boolean;
}

export interface BankStatementLine {
  id: number | string;
  bank_statement_id?: number | string;
  transaction_date: string;
  description?: string;
  amount: number;
  type?: string;
}

export interface BankStatement {
  id: number | string;
  bank_account_id: number | string;
  bank_account?: any;
  statement_date: string;
  opening_balance?: number;
  closing_balance: number;
  status: string;
  created_at?: string;
  transactions?: BankStatementLine[] | any[];
}

export interface BankReconciliationMatch {
  id: number | string;
  bank_transaction_id?: number | string;
  journal_line_id?: number | string;
  match_type?: string;
  amount?: number;
  status?: string;
}

export interface BankReconciliation {
  id: number | string;
  bank_account_id: number | string;
  statement_date: string;
  statement_balance: number;
  statement_closing_balance?: number;
  gl_closing_balance?: number;
  book_balance: number;
  difference: number;
  status: 'reconciled' | 'pending' | string;
  matches?: BankReconciliationMatch[] | any[];
}

export interface Budget {
  id: number | string;
  name?: string;
  version?: string;
  period: string;
  period_type?: string;
  category: string;
  cost_centre?: any;
  budget_amount: number;
  total_budgeted_amount?: number;
  actual_amount?: number;
  variance?: number;
  status?: string;
}

export interface BudgetControl extends Budget {
  control_level?: string;
  action_on_exceed?: string;
  is_active?: boolean;
  warning_threshold_pct?: number;
  hard_stop_threshold_pct?: number;
}

export interface BudgetVarianceReport {
  budget_id?: number | string;
  budget_name?: string;
  version?: number | string;
  fiscal_year?: string;
  period?: string;
  total_budget?: number;
  total_actual?: number;
  net_variance?: number;
  lines?: any[];
  items?: Array<{
    category?: string;
    budgeted?: number;
    actual?: number;
    variance?: number;
    variance_pct?: number;
  }>;
}

export interface ApAgingSummary {
  summary?: any;
  current?: number;
  days_1_30?: number;
  days_31_60?: number;
  days_61_90?: number;
  days_90_plus?: number;
  total_payable?: number;
  suppliers?: any[];
  vendors?: any[];
}

export interface ArAgingSummary {
  summary?: any;
  current?: number;
  days_1_30?: number;
  days_31_60?: number;
  days_61_90?: number;
  days_90_plus?: number;
  total_receivable?: number;
  customers?: any[];
}

export interface FinancialReport {
  id: number | string;
  title: string;
  type: string;
  generated_at?: string;
}

export interface FixedAssetCategory {
  id: number | string;
  name: string;
  code?: string;
  depreciation_method?: string;
  useful_life_years?: number;
  default_rate_pct?: number;
}

export interface FixedAsset {
  id: number | string;
  name?: string;
  asset_name: string;
  asset_code?: string;
  category?: FixedAssetCategory;
  purchase_date?: string;
  purchase_cost?: number;
  cost: number;
  accumulated_depreciation?: number;
  net_book_value?: number;
  current_book_value?: number;
  status?: string;
}

export interface FinancialPeriod {
  id: number | string;
  name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  fiscal_year_id?: number;
  fiscal_year?: any;
}

export interface FinancialPeriodExtended extends FinancialPeriod {
  status?: string;
  closing_checks?: PeriodClosingCheck[];
}

export interface PeriodClosingCheck {
  id: number | string;
  check_name: string;
  status: 'passed' | 'failed' | 'warning' | string;
  message?: string;
  unposted_journals_count?: number;
  unreconciled_bank_statements_count?: number;
  warnings?: string[];
  can_close?: boolean;
}

export interface YearEndClosing {
  id?: number | string;
  year: number;
  status: string;
  retained_earnings_amount?: number;
  closing_date?: string;
  total_revenue?: number;
  total_expense?: number;
  net_profit_loss?: number;
  is_rolled_back?: boolean;
}

export interface CostCentre {
  id: number | string;
  code: string;
  name: string;
  description?: string;
  manager_name?: string;
  parent?: any;
  budget_limit?: number;
  budget?: number;
  status?: string;
}

export interface ProfitCentre {
  id: number | string;
  code: string;
  name: string;
  description?: string;
  manager_name?: string;
  revenue_target?: number;
  target_revenue?: number;
  target_margin_pct?: number;
  status?: string;
}

export interface CashFlowForecast {
  period: string;
  inflow: number;
  outflow: number;
  net_cash_flow: number;
  forecast_breakdown?: any;
  opening_liquid_cash?: number;
  daily_schedule?: any[];
}

export interface ExecutiveTelemetry {
  revenue?: number;
  net_profit?: number;
  gross_margin_percent?: number;
  current_ratio?: number;
  liquid_cash?: number;
  cash_runway_days?: number;
  burn_rate?: number;
  net_working_capital?: number;
  total_receivables?: number;
  total_payables?: number;
  quick_ratio?: number;
  net_margin_pct?: number;
}

export interface TreasuryPosition {
  total_cash_and_bank?: number;
  total_liquid_cash?: number;
  short_term_investments?: number;
  working_capital?: number;
  key_metrics?: any;
  breakdown?: any;
}

export interface FinancialRatios {
  current_ratio?: number;
  quick_ratio?: number;
  debt_to_equity?: number;
  gross_margin_percent?: number;
  net_margin_percent?: number;
  return_on_equity?: number;
  dupont_analysis?: {
    roe_pct?: number;
    net_profit_margin_pct?: number;
    asset_turnover?: number;
    equity_multiplier?: number;
  };
  profitability?: {
    gross_profit_margin_pct?: number;
    operating_profit_margin_pct?: number;
    net_profit_margin_pct?: number;
    return_on_assets_pct?: number;
  };
  liquidity?: {
    current_ratio?: number;
    quick_ratio?: number;
    cash_ratio?: number;
  };
  leverage?: {
    debt_to_equity?: number;
    debt_to_assets?: number;
  };
  efficiency?: {
    receivables_turnover?: number;
    days_sales_outstanding?: number;
  };
}
