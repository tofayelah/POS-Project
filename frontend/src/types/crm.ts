export type CreditRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ActivityType = 'CALL' | 'MEETING' | 'EMAIL' | 'VISIT' | 'NOTE' | 'TASK' | 'WHATSAPP';
export type ActivityStatus = 'OPEN' | 'COMPLETED' | 'CANCELLED';
export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type OpportunityStage = 'PROSPECT' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';

export interface CustomerCreditSummary {
  customer_id: number;
  credit_limit: number;
  credit_days: number;
  current_balance: number;
  available_credit: number;
  credit_hold: boolean;
  credit_utilization_pct: number;
  overdue_amount: number;
  overdue_days: number;
  status: 'SAFE' | 'WARNING' | 'EXCEEDED' | 'HOLD';
}

export interface CustomerCreditRequest {
  id: number;
  company_id: number;
  customer_id: number;
  requested_by: number;
  approved_by?: number;
  current_credit_limit: number;
  requested_credit_limit: number;
  current_credit_days: number;
  requested_credit_days: number;
  reason: string;
  rejection_reason?: string;
  status: CreditRequestStatus;
  requested_at: string;
  actioned_at?: string;
  created_at: string;
  customer?: {
    id: number;
    customer_code: string;
    name: string;
    mobile?: string;
  };
  requester?: {
    id: number;
    name: string;
  };
  approver?: {
    id: number;
    name: string;
  };
}

export interface AgingBucket {
  bucket: 'CURRENT' | '1-30' | '31-60' | '61-90' | '90+';
  amount: number;
  invoice_count: number;
}

export interface CustomerAgingSummary {
  customer_id: number;
  customer_name?: string;
  customer_code?: string;
  total_outstanding: number;
  credit_limit: number;
  available_credit: number;
  credit_hold: boolean;
  buckets: {
    current: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    days_90_plus: number;
  };
  oldest_invoice_date?: string;
  oldest_due_days: number;
}

export interface CompanyAgingSummary {
  total_receivable: number;
  customer_count: number;
  buckets: {
    current: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    days_90_plus: number;
  };
  bucket_percentages: {
    current: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    days_90_plus: number;
  };
}

export interface CollectionPriorityItem {
  customer_id: number;
  customer_code: string;
  name: string;
  mobile?: string;
  total_due: number;
  overdue_amount: number;
  days_overdue: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  oldest_invoice_number?: string;
}

export interface CustomerStatementTransaction {
  date: string;
  type: string;
  reference_type?: string;
  reference_number?: string;
  notes?: string;
  debit: number;
  credit: number;
  running_balance: number;
}

export interface CustomerStatement {
  customer: {
    id: number;
    customer_code: string;
    name: string;
    mobile?: string;
    email?: string;
    address?: string;
    bin_number?: string;
    tin_number?: string;
  };
  period: {
    from: string;
    to: string;
  };
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
  aging_breakdown: {
    current: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    days_90_plus: number;
  };
  transactions: CustomerStatementTransaction[];
}

export interface CustomerActivity {
  id: number;
  company_id: number;
  customer_id: number;
  assigned_to?: number;
  created_by: number;
  activity_type: ActivityType;
  subject: string;
  description?: string;
  status: ActivityStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  activity_at: string;
  follow_up_date?: string;
  completed_at?: string;
  completion_notes?: string;
  created_at: string;
  customer?: {
    id: number;
    customer_code: string;
    name: string;
  };
  assigned_user?: {
    id: number;
    name: string;
  };
  creator?: {
    id: number;
    name: string;
  };
}

export interface CustomerComplaint {
  id: number;
  company_id: number;
  customer_id: number;
  ticket_number: string;
  subject: string;
  category: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  description: string;
  resolution?: string;
  assigned_to?: number;
  created_by: number;
  resolved_by?: number;
  resolved_at?: string;
  created_at: string;
  customer?: {
    id: number;
    customer_code: string;
    name: string;
  };
  assigned_user?: {
    id: number;
    name: string;
  };
}

export interface CustomerOpportunity {
  id: number;
  company_id: number;
  customer_id: number;
  assigned_to?: number;
  created_by: number;
  title: string;
  stage: OpportunityStage;
  estimated_value: number;
  probability: number;
  expected_value?: number;
  probability_pct?: number;
  expected_close_date?: string;
  notes?: string;
  lost_reason?: string;
  won_at?: string;
  lost_at?: string;
  created_at: string;
  customer?: {
    id: number;
    customer_code: string;
    name: string;
  };
  assigned_user?: {
    id: number;
    name: string;
  };
}

export interface CustomerTimelineItem {
  id: string | number;
  type: 'ACTIVITY' | 'COMPLAINT' | 'OPPORTUNITY' | 'SALE' | 'CREDIT_REQUEST' | 'CREDIT_OVERRIDE';
  title: string;
  description?: string;
  status?: string;
  user_name?: string;
  amount?: number;
  timestamp: string;
}

export interface CrmDashboardMetrics {
  counts: {
    open_activities: number;
    today_activities: number;
    pending_follow_ups: number;
    open_complaints: number;
    critical_complaints: number;
    active_opportunities: number;
  };
  pipeline_value: number;
  expected_pipeline_value: number;
  recent_activities: CustomerActivity[];
  urgent_complaints: CustomerComplaint[];
  active_opportunities: CustomerOpportunity[];
}

export interface CustomerRfmMetrics {
  customer_id: number;
  recency_days: number;
  frequency_orders: number;
  monetary_amount: number;
  recency_score: number;
  frequency_score: number;
  monetary_score: number;
  composite_score: string;
  segment: string;
  calculated_at?: string;
}

export interface CompanyRfmDistribution {
  total_scored_customers: number;
  segments: Record<string, number>;
  score_distribution: {
    r: Record<number, number>;
    f: Record<number, number>;
    m: Record<number, number>;
  };
}

export interface AtRiskCustomerRow {
  id: number;
  customer_code: string;
  name: string;
  mobile?: string;
  rfm_segment?: string;
  last_purchase_date?: string;
  days_inactive: number;
  total_spent: number;
  total_orders: number;
  credit_hold: boolean;
}

export interface CustomerLifetimeValue {
  customer_id: number;
  total_orders: number;
  total_spent: number;
  gross_sales: number;
  discount_total: number;
  returns_total: number;
  net_sales: number;
  total_cogs: number;
  gross_profit: number;
  gross_margin_pct: number;
  average_order_value: number;
  first_purchase_date?: string;
  last_purchase_date?: string;
  lifetime_days: number;
}

export interface Customer360Profile {
  customer: {
    id: number;
    customer_code: string;
    name: string;
    company_name?: string;
    contact_person?: string;
    customer_type: string;
    group?: { id: number; name: string };
    mobile?: string;
    alternate_mobile?: string;
    email?: string;
    address?: string;
    billing_address?: string;
    shipping_address?: string;
    city?: string;
    country?: string;
    bin_number?: string;
    tin_number?: string;
    status: string;
    notes?: string;
    created_at?: string;
  };
  credit: CustomerCreditSummary;
  ar_aging: CustomerAgingSummary;
  clv: CustomerLifetimeValue;
  sales_summary: CustomerLifetimeValue;
  rfm: CustomerRfmMetrics;
  balances: {
    points: number;
    store_credit: number;
  };
  preferred_branch?: {
    id: number;
    name: string;
    order_count: number;
  };
  top_products: Array<{
    product_id: number;
    product_name_snapshot: string;
    sku_snapshot: string;
    total_qty: number;
    total_spend: number;
  }>;
  counts: {
    open_complaints: number;
    open_activities: number;
  };
  timeline: CustomerTimelineItem[];
}

export interface SalesIntelligenceDashboardMetrics {
  period: {
    start_date: string;
    end_date: string;
  };
  top_customers: SalesByCustomerRow[];
  branch_breakdown: SalesByBranchRow[];
  top_products: SalesByProductRow[];
  salesperson_leaderboard: SalespersonPerformanceRow[];
  return_metrics: SalesReturnMetrics;
}

export interface SalesByCustomerRow {
  customer_id?: number;
  customer_code: string;
  customer_name: string;
  orders: number;
  gross_sales: number;
  discount: number;
  returns: number;
  net_sales: number;
  cogs: number;
  gross_profit: number;
  margin_pct: number;
}

export interface SalesByBranchRow {
  branch_id?: number;
  branch_name: string;
  orders: number;
  customers: number;
  gross_sales: number;
  returns: number;
  net_sales: number;
  cogs: number;
  gross_profit: number;
  margin_pct: number;
  average_order_value: number;
}

export interface SalesByProductRow {
  product_id: number;
  variant_id?: number;
  name: string;
  sku: string;
  units_sold: number;
  revenue: number;
  discount: number;
  cogs: number;
  gross_profit: number;
  margin_pct: number;
}

export interface SalespersonPerformanceRow {
  salesperson_id?: number;
  salesperson_name: string;
  orders: number;
  gross_sales: number;
  net_sales: number;
  cogs: number;
  gross_profit: number;
  margin_pct: number;
  average_order_value: number;
}

export interface SalesReturnMetrics {
  gross_sales: number;
  return_count: number;
  return_value: number;
  return_rate_pct: number;
  by_reason: Array<{
    reason_name: string;
    count: number;
    value: number;
  }>;
}

export interface DemandForecastRow {
  product_id: number;
  product_variant_id?: number;
  name: string;
  sku: string;
  units_sold_30d: number;
  units_sold_60d: number;
  units_sold_90d: number;
  avg_daily_sales: number;
  average_daily_sales: number;
  forecast_days: number;
  projected_demand: number;
  trend: 'GROWING' | 'STABLE' | 'DECLINING';
}

export interface DemandRiskRow {
  product_id: number;
  product_name: string;
  sku: string;
  avg_daily_sales: number;
  current_stock: number;
  incoming_po_stock: number;
  effective_stock: number;
  days_remaining: number;
  demand_risk: 'LOW' | 'MEDIUM' | 'HIGH';
  potential_stockout_date?: string;
  recommended_reorder_qty: number;
}
