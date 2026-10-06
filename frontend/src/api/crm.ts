import api from './axios';
import {
  CustomerCreditSummary,
  CustomerCreditRequest,
  CustomerAgingSummary,
  CompanyAgingSummary,
  CollectionPriorityItem,
  CustomerStatement,
  CustomerActivity,
  CustomerComplaint,
  CustomerOpportunity,
  CustomerTimelineItem,
  CrmDashboardMetrics,
  CompanyRfmDistribution,
  AtRiskCustomerRow,
  CustomerLifetimeValue,
  Customer360Profile,
  SalesIntelligenceDashboardMetrics,
  SalesByCustomerRow,
  SalesByBranchRow,
  SalesByProductRow,
  SalespersonPerformanceRow,
  SalesReturnMetrics,
  DemandForecastRow,
  DemandRiskRow,
} from '../types/crm';

export const crmApi = {
  // 1. Credit Management
  getCreditSummary: async (customerId: number): Promise<CustomerCreditSummary> => {
    const res = await api.get(`/customers/${customerId}/credit-summary`);
    return res.data.data;
  },

  requestCredit: async (customerId: number, data: { requested_credit_limit: number; requested_credit_days?: number; reason: string }): Promise<CustomerCreditRequest> => {
    const res = await api.post(`/customers/${customerId}/credit-request`, data);
    return res.data.data;
  },

  getCreditRequests: async (status?: string): Promise<CustomerCreditRequest[]> => {
    const res = await api.get('/credit-requests', { params: status ? { status } : {} });
    return res.data.data;
  },

  approveCreditRequest: async (requestId: number, notes?: string): Promise<CustomerCreditRequest> => {
    const res = await api.post(`/credit-requests/${requestId}/approve`, { notes });
    return res.data.data;
  },

  rejectCreditRequest: async (requestId: number, reason: string): Promise<CustomerCreditRequest> => {
    const res = await api.post(`/credit-requests/${requestId}/reject`, { reason });
    return res.data.data;
  },

  toggleCreditHold: async (customerId: number, hold: boolean, reason?: string): Promise<{ credit_hold: boolean }> => {
    const res = await api.post(`/customers/${customerId}/toggle-credit-hold`, { hold, reason });
    return res.data.data;
  },

  // 2. AR Aging & Statements
  getCustomerAging: async (customerId: number): Promise<CustomerAgingSummary> => {
    const res = await api.get(`/customers/${customerId}/aging`);
    return res.data.data;
  },

  getCompanyAging: async (): Promise<CompanyAgingSummary> => {
    const res = await api.get('/ar-aging');
    return res.data.data;
  },

  getCollectionPriorities: async (): Promise<CollectionPriorityItem[]> => {
    const res = await api.get('/ar-aging/collection-priorities');
    return res.data.data;
  },

  getCustomerStatement: async (customerId: number, fromDate: string, toDate: string): Promise<CustomerStatement> => {
    const res = await api.get(`/customers/${customerId}/statement`, {
      params: { from_date: fromDate, to_date: toDate },
    });
    return res.data.data;
  },

  // 3. CRM Core
  getCrmDashboard: async (): Promise<CrmDashboardMetrics> => {
    const res = await api.get('/crm/dashboard');
    return res.data.data;
  },

  getCustomerTimeline: async (customerId: number): Promise<CustomerTimelineItem[]> => {
    const res = await api.get(`/customers/${customerId}/timeline`);
    return res.data.data;
  },

  getActivities: async (params?: Record<string, any>): Promise<CustomerActivity[]> => {
    const res = await api.get('/crm/activities', { params });
    return res.data.data;
  },

  createActivity: async (data: Partial<CustomerActivity>): Promise<CustomerActivity> => {
    const res = await api.post('/crm/activities', data);
    return res.data.data;
  },

  completeActivity: async (id: number, notes?: string): Promise<CustomerActivity> => {
    const res = await api.post(`/crm/activities/${id}/complete`, { notes });
    return res.data.data;
  },

  getComplaints: async (params?: Record<string, any>): Promise<CustomerComplaint[]> => {
    const res = await api.get('/crm/complaints', { params });
    return res.data.data;
  },

  createComplaint: async (data: Partial<CustomerComplaint>): Promise<CustomerComplaint> => {
    const res = await api.post('/crm/complaints', data);
    return res.data.data;
  },

  resolveComplaint: async (id: number, resolution: string): Promise<CustomerComplaint> => {
    const res = await api.post(`/crm/complaints/${id}/resolve`, { resolution });
    return res.data.data;
  },

  getOpportunities: async (params?: Record<string, any>): Promise<CustomerOpportunity[]> => {
    const res = await api.get('/crm/opportunities', { params });
    return res.data.data;
  },

  createOpportunity: async (data: Partial<CustomerOpportunity>): Promise<CustomerOpportunity> => {
    const res = await api.post('/crm/opportunities', data);
    return res.data.data;
  },

  updateOpportunity: async (id: number, data: Partial<CustomerOpportunity>): Promise<CustomerOpportunity> => {
    const res = await api.put(`/crm/opportunities/${id}`, data);
    return res.data.data;
  },

  // 4. Customer Intelligence & RFM
  getCustomer360: async (customerId: number): Promise<Customer360Profile> => {
    const res = await api.get(`/customers/${customerId}/360`);
    return res.data.data;
  },

  getCustomerClv: async (customerId: number): Promise<CustomerLifetimeValue> => {
    const res = await api.get(`/customers/${customerId}/clv`);
    return res.data.data;
  },

  getRfmSummary: async (): Promise<CompanyRfmDistribution> => {
    const res = await api.get('/customer-intelligence/rfm-summary');
    return res.data.data;
  },

  recalculateRfm: async (): Promise<{ processed: number; segments: Record<string, number> }> => {
    const res = await api.post('/customer-intelligence/recalculate-rfm');
    return res.data.data;
  },

  getAtRiskCustomers: async (daysThreshold = 60): Promise<AtRiskCustomerRow[]> => {
    const res = await api.get('/customer-intelligence/at-risk', { params: { days_threshold: daysThreshold } });
    return res.data.data;
  },

  // 5. Sales Intelligence & Demand Forecasting
  getSalesDashboard: async (params?: { start_date?: string; end_date?: string }): Promise<SalesIntelligenceDashboardMetrics> => {
    const res = await api.get('/sales-intelligence/dashboard', { params });
    return res.data.data;
  },

  getSalesByCustomer: async (params?: { start_date?: string; end_date?: string; limit?: number }): Promise<SalesByCustomerRow[]> => {
    const res = await api.get('/sales-intelligence/by-customer', { params });
    return res.data.data;
  },

  getSalesByBranch: async (params?: { start_date?: string; end_date?: string }): Promise<SalesByBranchRow[]> => {
    const res = await api.get('/sales-intelligence/by-branch', { params });
    return res.data.data;
  },

  getSalesByProduct: async (params?: { start_date?: string; end_date?: string; limit?: number }): Promise<SalesByProductRow[]> => {
    const res = await api.get('/sales-intelligence/by-product', { params });
    return res.data.data;
  },

  getSalespersonPerformance: async (params?: { start_date?: string; end_date?: string }): Promise<SalespersonPerformanceRow[]> => {
    const res = await api.get('/sales-intelligence/salespersons', { params });
    return res.data.data;
  },

  getSalesReturnMetrics: async (params?: { start_date?: string; end_date?: string }): Promise<SalesReturnMetrics> => {
    const res = await api.get('/sales-intelligence/returns', { params });
    return res.data.data;
  },

  getDemandForecast: async (params?: { product_id?: number; forecast_days?: number }): Promise<DemandForecastRow[]> => {
    const res = await api.get('/sales-intelligence/demand-forecast', { params });
    return res.data.data;
  },

  getReorderRecommendations: async (params?: { lead_time_days?: number; buffer_days?: number }): Promise<DemandRiskRow[]> => {
    const res = await api.get('/sales-intelligence/reorder-recommendations', { params });
    return res.data.data;
  },
};

export default crmApi;
