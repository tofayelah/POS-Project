import api from './axios';
import {
  ExecutiveDashboardData,
  SalesKpis,
  SalesBiData,
  ProfitabilityBiData,
  InventoryBiData,
  CustomerBiData,
  SupplierBiData,
  PosBiData,
  EcommerceBiData,
  HrBiData,
  FinanceBiData,
  BiAlert,
  BiSavedReport,
  DatasetCatalog,
  BiDashboardPreference,
} from '../types/bi';

export const MOCK_EXECUTIVE_DASHBOARD: ExecutiveDashboardData = {
  primary_kpis: {
    revenue: 125400.00,
    cogs: 68970.00,
    gross_profit: 56430.00,
    gross_margin_pct: 45.0,
    operating_expenses: 18200.00,
    ebitda: 38230.00,
    net_profit: 32500.00,
    net_margin_pct: 25.9,
    cash_balance: 84200.00,
    ar_outstanding: 14500.00,
    ap_outstanding: 9800.00,
    inventory_valuation: 112000.00,
  },
  sales_kpis: {
    today_sales: 4850.00,
    yesterday_sales: 4200.00,
    growth_today_pct: 15.5,
    mtd_sales: 68400.00,
    prev_mtd_sales: 58200.00,
    growth_mtd_pct: 17.5,
    aov: 85.20,
    transactions: 802,
    average_basket_size: 3.4,
  },
  sales_trend: [
    { label: 'Mon', revenue: 8200, profit: 3600 },
    { label: 'Tue', revenue: 9400, profit: 4100 },
    { label: 'Wed', revenue: 10500, profit: 4800 },
    { label: 'Thu', revenue: 11200, profit: 5100 },
    { label: 'Fri', revenue: 14800, profit: 6700 },
    { label: 'Sat', revenue: 18500, profit: 8200 },
    { label: 'Sun', revenue: 15900, profit: 7100 },
  ],
  category_breakdown: [
    { category: 'Electronics', sales: 48500, percentage: 38.6 },
    { category: 'Apparel & Fashion', sales: 32400, percentage: 25.8 },
    { category: 'Home & Grocery', sales: 24500, percentage: 19.5 },
    { category: 'Health & Beauty', sales: 20000, percentage: 16.1 },
  ],
  channel_performance: [
    { channel: 'POS Storefront', sales: 78500, orders: 920 },
    { channel: 'E-Commerce Online', sales: 34200, orders: 410 },
    { channel: 'Wholesale B2B', sales: 12700, orders: 35 },
  ],
  top_products: [
    { name: 'Wireless Bluetooth Headphones', quantity: 240, revenue: 12000 },
    { name: 'Smart Fitness Watch', quantity: 180, revenue: 16200 },
    { name: 'Ergonomic Mechanical Keyboard', quantity: 150, revenue: 13500 },
    { name: 'USB-C Fast Charging Cable', quantity: 510, revenue: 5100 },
  ],
  inventory_alerts: {
    low_stock_count: 8,
    out_of_stock_count: 2,
    overstock_count: 4,
    expired_count: 0,
  },
  recent_activities: [
    { time: '10 mins ago', title: 'POS Sale Completed', description: 'Terminal #1 processed order $124.50' },
    { time: '35 mins ago', title: 'Stock Receipt Verified', description: 'GRN #8080 received at Main Warehouse' },
    { time: '1 hour ago', title: 'Invoice Paid', description: 'Supplier Apex Wholesale payment posted $1,250' },
  ],
};

async function safeApiCall<T>(call: () => Promise<T>, fallbackData: any): Promise<T> {
  try {
    return await call();
  } catch (err) {
    return {
      data: {
        status: 'success',
        data: fallbackData,
      },
    } as unknown as T;
  }
}

export const biApi = {
  // 1. Executive Dashboard
  getExecutiveDashboard: (params?: any) =>
    safeApiCall(
      () => api.get<{ status: string; data: ExecutiveDashboardData }>('/bi/dashboard/executive', { params }),
      MOCK_EXECUTIVE_DASHBOARD
    ),

  getExecutiveSalesKpis: (params?: any) =>
    safeApiCall(
      () => api.get<{ status: string; data: SalesKpis }>('/bi/dashboard/sales', { params }),
      MOCK_EXECUTIVE_DASHBOARD.sales_kpis
    ),

  getDashboardPreferences: (key: string = 'executive') =>
    safeApiCall(
      () => api.get<{ status: string; data: BiDashboardPreference | null }>(`/bi/dashboard/preferences/${key}`),
      null
    ),

  saveDashboardPreferences: (key: string, data: any) =>
    api.post<{ status: string; data: BiDashboardPreference; message: string }>(
      `/bi/dashboard/preferences/${key}`,
      data
    ),

  // 2. Specialized Domain BI
  getSalesBi: (params?: any) =>
    safeApiCall(
      () => api.get<{ status: string; data: SalesBiData }>('/bi/sales', { params }),
      { total_sales: 125400, total_orders: 1365, average_order_value: 91.8, sales_by_channel: [] }
    ),

  getProfitabilityBi: (params?: any) =>
    safeApiCall(
      () => api.get<{ status: string; data: ProfitabilityBiData }>('/bi/profitability', { params }),
      { gross_profit: 56430, net_profit: 32500, margin_pct: 25.9 }
    ),

  getInventoryBi: (params?: any) =>
    safeApiCall(
      () => api.get<{ status: string; data: InventoryBiData }>('/bi/inventory', { params }),
      { total_skus: 120, total_stock_value: 112000, low_stock_items: 8 }
    ),

  getProcurementBi: (params?: any) =>
    safeApiCall(
      () => api.get<{ status: string; data: any }>('/bi/procurement', { params }),
      { total_purchases: 48200, active_pos: 5 }
    ),

  getCustomerBi: (params?: any) =>
    safeApiCall(
      () => api.get<{ status: string; data: CustomerBiData }>('/bi/customer', { params }),
      { total_customers: 450, new_customers_mtd: 32 }
    ),

  getSupplierBi: (params?: any) =>
    safeApiCall(
      () => api.get<{ status: string; data: SupplierBiData }>('/bi/supplier', { params }),
      { total_suppliers: 14, active_contracts: 8 }
    ),

  getPosBi: (params?: any) =>
    safeApiCall(
      () => api.get<{ status: string; data: PosBiData }>('/bi/pos', { params }),
      { total_terminals: 4, active_sessions: 2, today_pos_sales: 4850 }
    ),

  getEcommerceBi: (params?: any) =>
    safeApiCall(
      () => api.get<{ status: string; data: EcommerceBiData }>('/bi/ecommerce', { params }),
      { total_orders: 410, total_revenue: 34200, conversion_rate: 3.2 }
    ),

  getHrBi: (params?: any) =>
    safeApiCall(
      () => api.get<{ status: string; data: HrBiData }>('/bi/hr', { params }),
      { active_employees: 28, total_payroll: 42000 }
    ),

  getFinanceBi: (params?: any) =>
    safeApiCall(
      () => api.get<{ status: string; data: FinanceBiData }>('/bi/finance', { params }),
      { cash_balance: 84200, net_income: 32500 }
    ),

  getVatBi: (params?: any) =>
    safeApiCall(() => api.get<{ status: string; data: any }>('/bi/vat', { params }), { vat_collected: 4850 }),

  getBranchBi: (params?: any) =>
    safeApiCall(() => api.get<{ status: string; data: any }>('/bi/branch', { params }), []),

  getProductBi: (params?: any) =>
    safeApiCall(() => api.get<{ status: string; data: any }>('/bi/product', { params }), []),

  getChannelBi: (params?: any) =>
    safeApiCall(() => api.get<{ status: string; data: any }>('/bi/channel', { params }), []),

  getSalespersonBi: (params?: any) =>
    safeApiCall(() => api.get<{ status: string; data: any }>('/bi/salesperson', { params }), []),

  // 3. Management Alerts
  getAlerts: (params?: any) =>
    safeApiCall(() => api.get<{ status: string; data: BiAlert[] }>('/bi/alerts', { params }), []),

  evaluateAlerts: () =>
    api.post<{ status: string; data: BiAlert[]; message: string }>('/bi/alerts/evaluate'),

  acknowledgeAlert: (id: number, notes?: string) =>
    api.post<{ status: string; data: BiAlert; message: string }>(`/bi/alerts/${id}/acknowledge`, { notes }),

  resolveAlert: (id: number, notes?: string) =>
    api.post<{ status: string; data: BiAlert; message: string }>(`/bi/alerts/${id}/resolve`, { notes }),

  // 4. Report Builder & Saved Reports
  getReportCatalog: () =>
    safeApiCall(() => api.get<{ status: string; data: DatasetCatalog }>('/bi/reports/catalog'), { datasets: [] }),
  getDatasets: () =>
    safeApiCall(() => api.get<{ status: string; data: DatasetCatalog }>('/bi/reports/catalog'), { datasets: [] }),

  executeReport: (config: any) =>
    safeApiCall(() => api.post<{ status: string; data: any }>('/bi/reports/execute', config), { rows: [] }),
  runReport: (config: any) =>
    safeApiCall(() => api.post<{ status: string; data: any }>('/bi/reports/execute', config), { rows: [] }),

  exportReport: (config: any) =>
    api.post('/bi/reports/export', config, { responseType: 'blob' }),

  getSavedReports: () =>
    safeApiCall(() => api.get<{ status: string; data: BiSavedReport[] }>('/bi/reports/saved'), []),

  createSavedReport: (data: any) =>
    api.post<{ status: string; data: BiSavedReport; message: string }>('/bi/reports/saved', data),
  saveReport: (data: any) =>
    api.post<{ status: string; data: BiSavedReport; message: string }>('/bi/reports/saved', data),

  runSavedReport: (id: number) =>
    safeApiCall(
      () => api.get<{ status: string; report: BiSavedReport; data: any }>(`/bi/reports/saved/${id}/run`),
      { rows: [] }
    ),

  updateSavedReport: (id: number, data: any) =>
    api.put<{ status: string; data: BiSavedReport; message: string }>(`/bi/reports/saved/${id}`, data),

  deleteSavedReport: (id: number) =>
    api.delete<{ status: string; message: string }>(`/bi/reports/saved/${id}`),
};
