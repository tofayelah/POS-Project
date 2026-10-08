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

export const biApi = {
  // 1. Executive Dashboard
  getExecutiveDashboard: (params?: any) =>
    api.get<{ status: string; data: ExecutiveDashboardData }>('/bi/dashboard/executive', { params }),

  getExecutiveSalesKpis: (params?: any) =>
    api.get<{ status: string; data: SalesKpis }>('/bi/dashboard/sales', { params }),

  getDashboardPreferences: (key: string = 'executive') =>
    api.get<{ status: string; data: BiDashboardPreference | null }>(`/bi/dashboard/preferences/${key}`),

  saveDashboardPreferences: (key: string, data: any) =>
    api.post<{ status: string; data: BiDashboardPreference; message: string }>(
      `/bi/dashboard/preferences/${key}`,
      data
    ),

  // 2. Specialized Domain BI
  getSalesBi: (params?: any) =>
    api.get<{ status: string; data: SalesBiData }>('/bi/sales', { params }),

  getProfitabilityBi: (params?: any) =>
    api.get<{ status: string; data: ProfitabilityBiData }>('/bi/profitability', { params }),

  getInventoryBi: (params?: any) =>
    api.get<{ status: string; data: InventoryBiData }>('/bi/inventory', { params }),

  getProcurementBi: (params?: any) =>
    api.get<{ status: string; data: any }>('/bi/procurement', { params }),

  getCustomerBi: (params?: any) =>
    api.get<{ status: string; data: CustomerBiData }>('/bi/customer', { params }),

  getSupplierBi: (params?: any) =>
    api.get<{ status: string; data: SupplierBiData }>('/bi/supplier', { params }),

  getPosBi: (params?: any) =>
    api.get<{ status: string; data: PosBiData }>('/bi/pos', { params }),

  getEcommerceBi: (params?: any) =>
    api.get<{ status: string; data: EcommerceBiData }>('/bi/ecommerce', { params }),

  getHrBi: (params?: any) =>
    api.get<{ status: string; data: HrBiData }>('/bi/hr', { params }),

  getFinanceBi: (params?: any) =>
    api.get<{ status: string; data: FinanceBiData }>('/bi/finance', { params }),

  getVatBi: (params?: any) =>
    api.get<{ status: string; data: any }>('/bi/vat', { params }),

  getBranchBi: (params?: any) =>
    api.get<{ status: string; data: any }>('/bi/branch', { params }),

  getProductBi: (params?: any) =>
    api.get<{ status: string; data: any }>('/bi/product', { params }),

  getChannelBi: (params?: any) =>
    api.get<{ status: string; data: any }>('/bi/channel', { params }),

  getSalespersonBi: (params?: any) =>
    api.get<{ status: string; data: any }>('/bi/salesperson', { params }),

  // 3. Management Alerts
  getAlerts: (params?: any) =>
    api.get<{ status: string; data: BiAlert[] }>('/bi/alerts', { params }),

  evaluateAlerts: () =>
    api.post<{ status: string; data: BiAlert[]; message: string }>('/bi/alerts/evaluate'),

  acknowledgeAlert: (id: number, notes?: string) =>
    api.post<{ status: string; data: BiAlert; message: string }>(`/bi/alerts/${id}/acknowledge`, { notes }),

  resolveAlert: (id: number, notes?: string) =>
    api.post<{ status: string; data: BiAlert; message: string }>(`/bi/alerts/${id}/resolve`, { notes }),

  // 4. Report Builder & Saved Reports
  getReportCatalog: () =>
    api.get<{ status: string; data: DatasetCatalog }>('/bi/reports/catalog'),
  getDatasets: () =>
    api.get<{ status: string; data: DatasetCatalog }>('/bi/reports/catalog'),

  executeReport: (config: any) =>
    api.post<{ status: string; data: any }>('/bi/reports/execute', config),
  runReport: (config: any) =>
    api.post<{ status: string; data: any }>('/bi/reports/execute', config),

  exportReport: (config: any) =>
    api.post('/bi/reports/export', config, { responseType: 'blob' }),

  getSavedReports: () =>
    api.get<{ status: string; data: BiSavedReport[] }>('/bi/reports/saved'),

  createSavedReport: (data: any) =>
    api.post<{ status: string; data: BiSavedReport; message: string }>('/bi/reports/saved', data),
  saveReport: (data: any) =>
    api.post<{ status: string; data: BiSavedReport; message: string }>('/bi/reports/saved', data),

  runSavedReport: (id: number) =>
    api.get<{ status: string; report: BiSavedReport; data: any }>(`/bi/reports/saved/${id}/run`),

  updateSavedReport: (id: number, data: any) =>
    api.put<{ status: string; data: BiSavedReport; message: string }>(`/bi/reports/saved/${id}`, data),

  deleteSavedReport: (id: number) =>
    api.delete<{ status: string; message: string }>(`/bi/reports/saved/${id}`),
};
