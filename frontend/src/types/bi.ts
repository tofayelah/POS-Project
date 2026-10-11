export interface SalesKpis {
  total_sales?: number;
  sales_growth_pct?: number;
  order_count?: number;
}

export interface ExecutiveDashboardData {
  kpis?: {
    total_sales?: number;
    gross_margin_pct?: number;
    net_profit?: number;
    inventory_value?: number;
    operating_cash?: number;
    customer_count?: number;
    active_stores_count?: number;
  };
  primary_kpis?: any;
  sales_kpis?: any;
  channel_breakdown?: any;
  channel_performance?: any;
  category_breakdown?: any;
  sales_trend?: any[];
  top_products?: any[];
  top_branches?: any[];
  profitability_summary?: any;
  cash_flow_summary?: any;
  inventory_alerts?: any;
  recent_activities?: any[];
}

export interface BIAlert {
  id: number | string;
  title: string;
  code?: string;
  type?: string;
  metric?: string;
  current_value?: number;
  threshold_type?: string;
  threshold_value?: number;
  severity?: 'low' | 'medium' | 'high' | 'critical' | string;
  message: string;
  status?: string;
  created_at?: string;
  is_read?: boolean;
}
export type BiAlert = BIAlert;

export interface DatasetCatalog {
  id: number | string;
  name: string;
  description?: string;
  fields?: any[];
}

export interface BiDashboardPreference {
  user_id?: number | string;
  layout?: any;
  widgets?: any[];
}

export interface CustomerBIData {
  total_customers?: number;
  retention_rate?: number;
  clv_average?: number;
  segments?: any[];
  summary?: any;
  ar_aging?: any;
  top_customers?: any[];
}
export type CustomerBiData = CustomerBIData;

export interface EcommerceBIData {
  conversion_rate?: number;
  cart_abandonment_rate?: number;
  total_online_revenue?: number;
  top_channels?: any[];
  summary?: any;
  pipeline?: any;
  channels?: any[];
}
export type EcommerceBiData = EcommerceBIData;

export interface FinanceBIData {
  revenue?: number;
  expenses?: number;
  net_profit?: number;
  ebitda?: number;
  telemetry?: any;
  dupont_analysis?: any;
  cash_flow_summary?: any;
  budget_vs_actual?: any;
  forecast?: any;
}
export type FinanceBiData = FinanceBIData;

export interface HRBIData {
  headcount?: number;
  turnover_rate?: number;
  payroll_cost?: number;
  summary?: any;
  by_department?: any[];
}
export type HrBiData = HRBIData;

export interface InventoryBIData {
  turnover_ratio?: number;
  stockout_rate?: number;
  aging_breakdown?: any;
  summary?: any;
  abc_analysis?: any;
  aging_buckets?: any;
  reorder_alerts?: any[];
}
export type InventoryBiData = InventoryBIData;

export interface POSBIData {
  pos_sales?: number;
  basket_size?: number;
  terminal_performance?: any[];
  summary?: any;
  hourly_heatmap?: any;
  cashiers?: any[];
  shifts?: any[];
}
export type PosBiData = POSBIData;

export interface ProfitabilityBIData {
  gross_profit_margin?: number;
  net_profit_margin?: number;
  operating_margin?: number;
  summary?: any;
  top_profitable_products?: any[];
  low_margin_products?: any[];
  by_category?: any[];
  by_branch?: any[];
}
export type ProfitabilityBiData = ProfitabilityBIData;

export interface SalesBIData {
  total_sales?: number;
  growth_rate?: number;
  target_achievement?: number;
  summary?: any;
  funnel?: any;
  by_branch?: any[];
  by_channel?: any[];
  by_category?: any[];
  by_payment_method?: any[];
}
export type SalesBiData = SalesBIData;

export interface SavedReport {
  id: number | string;
  title: string;
  name?: string;
  dataset?: string;
  description?: string;
  config?: any;
  query_params?: any;
  created_at?: string;
}
export type BiSavedReport = SavedReport;

export interface SupplierBIData {
  fill_rate?: number;
  on_time_delivery_rate?: number;
  quality_score?: number;
  summary?: any;
  ap_aging?: any;
  rankings?: any[];
}
export type SupplierBiData = SupplierBIData;
