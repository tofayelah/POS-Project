export interface CompanyAgingSummary {
  current?: number;
  days_1_30?: number;
  days_31_60?: number;
  days_61_90?: number;
  days_90_plus?: number;
  total_receivable?: number;
  customer_count?: number;
  bucket_percentages?: any;
  buckets?: any;
}

export interface CollectionPriorityItem {
  id: number | string;
  customer_id?: number | string;
  customer_name?: string;
  name?: string;
  customer_code?: string;
  mobile?: string;
  amount_due?: number;
  total_due?: number;
  overdue_amount?: number;
  overdue_days?: number;
  days_overdue?: number;
  risk_level?: string;
}

export interface CustomerStatement {
  id: number | string;
  statement_date: string;
  balance_forward: number;
  opening_balance?: number;
  total_invoiced: number;
  total_paid: number;
  total_debit?: number;
  total_credit?: number;
  closing_balance: number;
  transactions?: any[];
}

export interface CustomerActivity {
  id?: number | string;
  activity_type?: string;
  customer_id?: number | string;
  customer?: any;
  subject?: string;
  type?: string;
  title?: string;
  description?: string;
  follow_up_date?: string;
  created_at?: string;
  priority?: string;
  status?: string;
}

export interface CustomerComplaint {
  id?: number | string;
  ticket_number?: string;
  customer_id?: number | string;
  customer?: any;
  category?: string;
  subject?: string;
  description?: string;
  status?: string;
  priority?: string;
}

export interface CustomerOpportunity {
  id?: number | string;
  customer_id?: number | string;
  customer?: any;
  title: string;
  value?: number;
  estimated_value?: number;
  probability_pct?: number;
  probability?: number;
  expected_value?: number;
  expected_close_date?: string;
  notes?: string;
  stage?: string;
}

export interface CrmDashboardMetrics {
  total_contacts?: number;
  open_leads?: number;
  won_deals?: number;
  avg_deal_size?: number;
  counts?: any;
  pipeline_value?: number;
}

export interface Customer360Profile {
  id?: number | string;
  name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  customer?: any;
  credit?: any;
  ar_aging?: any;
  rfm?: any;
  clv?: any;
  balances?: any;
  top_products?: any[];
  preferred_branch?: any;
  counts?: any;
  timeline?: any[];
  credit_limit?: number;
  credit_balance?: number;
  loyalty_points?: number;
}

export interface CustomerCreditRequest {
  id: number | string;
  customer_id: number | string;
  customer?: { name?: string; code?: string; mobile?: string } | any;
  requester?: { name?: string } | any;
  approver?: { name?: string } | any;
  current_credit_limit?: number;
  requested_credit_limit?: number;
  requested_limit?: number;
  current_credit_days?: number;
  requested_credit_days?: number;
  status: string;
  reason?: string;
}

export interface CompanyRfmDistribution {
  champions?: number;
  loyal?: number;
  at_risk?: number;
  lost?: number;
  segments?: any[];
  total_scored_customers?: number;
}

export interface AtRiskCustomerRow {
  id: number | string;
  name?: string;
  customer_name?: string;
  customer_code?: string;
  mobile?: string;
  rfm_segment?: string;
  days_inactive?: number;
  churn_probability?: number;
  total_spent?: number;
  credit_hold?: boolean;
  last_purchase_date?: string;
}

export interface SalesIntelligenceDashboardMetrics {
  projected_revenue?: number;
  win_rate_pct?: number;
  pipeline_health_score?: number;
  branch_breakdown?: any[];
  top_customers?: any[];
  top_products?: any[];
  salesperson_leaderboard?: any[];
  return_metrics?: any;
}

export interface DemandForecastRow {
  id: number | string;
  product_name?: string;
  name?: string;
  sku?: string;
  units_sold_30d?: number;
  units_sold_60d?: number;
  units_sold_90d?: number;
  avg_daily_sales?: number;
  projected_demand?: number;
  forecasted_units?: number;
  trend?: string;
}

export interface DemandRiskRow {
  id: number | string;
  product_name?: string;
  sku?: string;
  avg_daily_sales?: number;
  current_stock?: number;
  incoming_po_stock?: number;
  effective_stock?: number;
  days_remaining?: number;
  stockout_risk_score?: number;
  demand_risk?: string;
  recommended_reorder_qty?: number;
}

export interface CustomerCreditSummary {
  credit_limit?: number;
  credit_balance?: number;
  available_credit?: number;
}

export interface CustomerAgingSummary {
  current?: number;
  days_1_30?: number;
  days_31_60?: number;
  days_61_90?: number;
  days_90_plus?: number;
  total_due?: number;
}

export interface CustomerTimelineItem {
  id: number | string;
  type: string;
  title: string;
  date: string;
}

export interface CustomerLifetimeValue {
  customer_id: number | string;
  predicted_ltv: number;
}

export interface SalesByCustomerRow {
  customer_id: number | string;
  customer_name: string;
  total_sales: number;
}

export interface SalesByBranchRow {
  branch_id: number | string;
  branch_name: string;
  total_sales: number;
}

export interface SalesByProductRow {
  product_id: number | string;
  product_name: string;
  total_sales: number;
}

export interface SalespersonPerformanceRow {
  salesperson_id: number | string;
  name: string;
  total_sales: number;
}

export interface SalesReturnMetrics {
  total_returns: number;
  return_rate_pct: number;
}
