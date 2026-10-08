export interface PrimaryKpis {
  revenue: number;
  gross_sales: number;
  net_sales: number;
  returns: number;
  discounts: number;
  cogs: number;
  gross_profit: number;
  gross_margin_pct: number;
  operating_expenses: number;
  operating_profit: number;
  net_profit: number;
  net_margin_pct: number;
  cash_balance: number;
  bank_balance: number;
  accounts_receivable: number;
  accounts_payable: number;
  inventory_value: number;
  working_capital: number;
  budget_utilization: number;
}

export interface SalesKpis {
  today_sales: number;
  yesterday_sales: number;
  mtd_sales: number;
  prev_mtd_sales: number;
  qtd_sales: number;
  prev_qtd_sales: number;
  ytd_sales: number;
  prev_ytd_sales: number;
  growth_today_pct: number;
  growth_mtd_pct: number;
  growth_ytd_pct: number;
  aov: number;
  average_basket_size: number;
  units_sold: number;
  transactions: number;
  return_rate_pct: number;
  discount_rate_pct: number;
}

export interface ExecutiveDashboardData {
  period: {
    start_date: string;
    end_date: string;
  };
  primary_kpis: PrimaryKpis;
  sales_kpis: SalesKpis;
  daily_trend: Array<{
    sale_date: string;
    transactions: number;
    revenue: number;
  }>;
  top_products: Array<{
    id: number;
    name: string;
    sku: string;
    total_quantity: number;
    total_revenue: number;
  }>;
  top_branches: Array<{
    id: number;
    name: string;
    transactions: number;
    total_revenue: number;
  }>;
  channel_breakdown: Array<{
    channel: string;
    orders_count: number;
    total_revenue: number;
  }>;
}

export interface SalesBiData {
  summary: {
    gross_sales: number;
    discounts: number;
    net_sales: number;
    orders_count: number;
    units_sold: number;
    aov: number;
  };
  by_date: Array<{
    sale_date: string;
    orders_count: number;
    net_sales: number;
    discounts: number;
    taxes: number;
  }>;
  by_month: Array<{
    month: string;
    orders_count: number;
    net_sales: number;
  }>;
  by_branch: Array<{
    id: number;
    name: string;
    orders_count: number;
    net_sales: number;
  }>;
  by_channel: Array<{
    channel: string;
    orders_count: number;
    net_sales: number;
  }>;
  by_category: Array<{
    category_name: string;
    units_sold: number;
    net_sales: number;
  }>;
  by_payment_method: Array<{
    payment_method: string;
    transaction_count: number;
    total_amount: number;
  }>;
  funnel: {
    total_created: number;
    completed: number;
    paid: number;
    fulfilled: number;
    cancelled: number;
    returned: number;
    completion_rate_pct: number;
    fulfillment_rate_pct: number;
  };
}

export interface ProfitabilityBiData {
  summary: {
    revenue: number;
    cogs: number;
    gross_profit: number;
    gross_margin_pct: number;
    operating_expenses: number;
    net_profit: number;
    net_margin_pct: number;
    cost_to_revenue_ratio: number;
  };
  top_profitable_products: Array<{
    id: number;
    name: string;
    sku: string;
    units_sold: number;
    revenue: number;
    cogs: number;
    gross_profit: number;
    gross_margin_pct: number;
  }>;
  low_margin_products: Array<{
    id: number;
    name: string;
    sku: string;
    units_sold: number;
    revenue: number;
    cogs: number;
    gross_profit: number;
    gross_margin_pct: number;
  }>;
  by_category: Array<{
    category_name: string;
    revenue: number;
    cogs: number;
    gross_profit: number;
    gross_margin_pct: number;
  }>;
  expense_breakdown: Array<{
    category_name: string;
    total_expense: number;
  }>;
}

export interface InventoryBiData {
  summary: {
    total_valuation: number;
    total_units: number;
    total_skus: number;
    low_stock_items: number;
    out_of_stock_items: number;
    turnover_ratio: number;
    days_of_inventory_on_hand: number;
    dead_stock_value: number;
    dead_stock_count: number;
  };
  abc_analysis: {
    class_a: {
      count: number;
      total_value: number;
      pct_of_total: number;
      items: any[];
    };
    class_b: {
      count: number;
      total_value: number;
      pct_of_total: number;
      items: any[];
    };
    class_c: {
      count: number;
      total_value: number;
      pct_of_total: number;
      items: any[];
    };
  };
  aging_buckets: Record<
    string,
    {
      count: number;
      value: number;
      label: string;
    }
  >;
  reorder_alerts: Array<{
    product_id: number;
    name: string;
    sku: string;
    current_stock: number;
    reorder_point: number;
    unit_cost: number;
    warehouse: string;
  }>;
}

export interface CustomerBiData {
  summary: {
    total_customers: number;
    active_customers: number;
    inactive_customers: number;
    repeat_customer_rate_pct: number;
    churn_rate_pct: number;
  };
  rfm_distribution: any;
  top_customers: Array<{
    id: number;
    name: string;
    phone: string;
    rfm_segment: string;
    current_balance: number;
    orders_count: number;
    total_spent: number;
  }>;
  ar_aging: {
    '0_30': number;
    '31_60': number;
    '61_90': number;
    '91_plus': number;
    total_ar: number;
  };
}

export interface SupplierBiData {
  summary: {
    total_suppliers: number;
    total_ap: number;
  };
  supplier_rankings: any[];
  ap_aging: {
    '0_30': number;
    '31_60': number;
    '61_90': number;
    '91_plus': number;
    total_ap: number;
  };
}

export interface PosBiData {
  summary: {
    total_revenue: number;
    transactions: number;
    aov: number;
    sessions_count: number;
    cash_discrepancy_total: number;
  };
  hourly_distribution: Array<{
    hour_of_day: number;
    orders_count: number;
    total_amount: number;
  }>;
  cashier_performance: Array<{
    cashier_name: string;
    transactions: number;
    total_sales: number;
  }>;
}

export interface HrBiData {
  summary: {
    total_employees: number;
    active_employees: number;
    total_payroll_spend: number;
    average_salary: number;
  };
  by_department: Array<{
    department_id: number;
    department_name: string;
    employee_count: number;
    total_salary: number;
  }>;
}

export interface EcommerceBiData {
  summary: {
    gmv: number;
    orders_count: number;
    total_orders_created: number;
    aov: number;
    shipping_revenue: number;
    conversion_rate_pct: number;
  };
  status_pipeline: Array<{
    status: string;
    fulfillment_status: string;
    count: number;
    total: number;
  }>;
}

export interface FinanceBiData {
  ratios: any;
  telemetry: any;
  forecast_6_months: any;
  budget_variance: Array<{
    account_name: string;
    budgeted: number;
    actual: number;
    variance: number;
    utilization_pct: number;
  }>;
}

export interface BiAlert {
  id: number;
  company_id: number;
  code: string;
  title: string;
  metric: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  threshold_type: string;
  threshold_value: number;
  current_value: number;
  message: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  acknowledged_at?: string;
  acknowledged_by?: number;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BiSavedReport {
  id: number;
  company_id: number;
  user_id: number;
  name: string;
  description?: string;
  dataset: string;
  dimensions: string[];
  metrics: string[];
  filters?: Record<string, any>;
  group_by?: string[];
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  chart_type?: 'table' | 'bar' | 'line' | 'pie' | 'area';
  is_public: boolean;
  schedule_frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  schedule_recipients?: string[];
  last_run_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DatasetCatalogItem {
  name: string;
  description: string;
  dimensions: Record<string, { label: string }>;
  metrics: Record<string, { label: string }>;
}

export type DatasetCatalog = Record<string, DatasetCatalogItem>;

export interface BiDashboardPreference {
  id?: number;
  dashboard_key: string;
  widget_order?: string[];
  hidden_widgets?: string[];
  custom_filters?: Record<string, any>;
}
