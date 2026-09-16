export interface DashboardSummary {
  gross_sales: number;
  sales_returns: number;
  net_sales: number;
  purchases: number;
  expenses: number;
  gross_profit: number;
  gross_margin: number;
  cash_sales: number;
  credit_sales: number;
  receivables: number;
  payables: number;
  inventory_value: number;
  sales_trend: Array<{ sale_date: string; total: string }>;
  top_products: Array<{ name: string; sku: string; qty: string; total: string }>;
  top_customers: Array<{ name: string; total: string }>;
  total_products: number;
  low_stock: number;
  low_stock_details: Array<{ product: string; sku: string; warehouse: string; available_quantity: number; reorder_level: number }>;
  accounting_health: { posted_journals: number; unbalanced_journals: number; status: string };
  net_profit: number;
  cash_balance: number;
  bank_balance: number;
  payment_methods: Array<{ payment_method: string; total: string }>;
  recent_sales: Array<{ invoice: string; date: string; customer: string; branch: string; amount: string; paid: string; status: string }>;
  recent_purchases: Array<{ invoice: string; date: string; supplier: string; amount: string; paid: string; due: string; status: string }>;
}
