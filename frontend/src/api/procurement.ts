import axios from './axios';
import {
  PurchaseRequisition,
  Rfq,
  RfqComparisonMatrix,
  SupplierPerformanceScorecard,
  SupplierContract,
  SupplierPriceAgreement,
  ThreeWayMatchAudit,
  ReplenishmentRecommendation,
  ProcurementDashboardData,
  QualificationStatus,
} from '../types/procurement';

// Purchase Requisitions
export const getRequisitions = async (params?: {
  status?: string;
  priority?: string;
  warehouse_id?: number | string;
  search?: string;
  page?: number;
  per_page?: number;
}) => {
  const response = await axios.get('/purchase-requisitions', { params });
  return response.data;
};

export const getRequisitionNextNumber = async () => {
  const response = await axios.get('/purchase-requisitions/next-number');
  return response.data.data;
};

export const getRequisition = async (id: number | string): Promise<{ success: boolean; data: PurchaseRequisition }> => {
  const response = await axios.get(`/purchase-requisitions/${id}`);
  return response.data;
};

export const createRequisition = async (payload: any) => {
  const response = await axios.post('/purchase-requisitions', payload);
  return response.data;
};

export const submitRequisition = async (id: number | string) => {
  const response = await axios.post(`/purchase-requisitions/${id}/submit`);
  return response.data;
};

export const reviewRequisition = async (id: number | string, notes?: string) => {
  const response = await axios.post(`/purchase-requisitions/${id}/review`, { notes });
  return response.data;
};

export const approveRequisition = async (id: number | string, enforceSegregation = false) => {
  const response = await axios.post(`/purchase-requisitions/${id}/approve`, {
    enforce_segregation: enforceSegregation,
  });
  return response.data;
};

export const rejectRequisition = async (id: number | string, reason: string) => {
  const response = await axios.post(`/purchase-requisitions/${id}/reject`, { reason });
  return response.data;
};

export const cancelRequisition = async (id: number | string, reason?: string) => {
  const response = await axios.post(`/purchase-requisitions/${id}/cancel`, { reason });
  return response.data;
};

export const convertRequisitionToPo = async (id: number | string, supplierId: number, warehouseId?: number) => {
  const response = await axios.post(`/purchase-requisitions/${id}/convert-po`, {
    supplier_id: supplierId,
    warehouse_id: warehouseId,
  });
  return response.data;
};

export const convertRequisitionToRfq = async (id: number | string, payload?: { title?: string; deadline_date?: string; notes?: string }) => {
  const response = await axios.post(`/purchase-requisitions/${id}/convert-rfq`, payload);
  return response.data;
};

// Requests for Quotation (RFQs)
export const getRfqs = async (params?: { status?: string; search?: string; page?: number; per_page?: number }) => {
  const response = await axios.get('/rfqs', { params });
  return response.data;
};

export const getRfqNextNumber = async () => {
  const response = await axios.get('/rfqs/next-number');
  return response.data.data;
};

export const getRfq = async (id: number | string): Promise<{ success: boolean; data: Rfq }> => {
  const response = await axios.get(`/rfqs/${id}`);
  return response.data;
};

export const createRfq = async (payload: any) => {
  const response = await axios.post('/rfqs', payload);
  return response.data;
};

export const inviteRfqSuppliers = async (id: number | string, supplierIds: number[]) => {
  const response = await axios.post(`/rfqs/${id}/invite`, { supplier_ids: supplierIds });
  return response.data;
};

export const recordRfqQuotation = async (id: number | string, payload: any) => {
  const response = await axios.post(`/rfqs/${id}/quotations`, payload);
  return response.data;
};

export const compareRfqQuotations = async (id: number | string): Promise<{ success: boolean; data: RfqComparisonMatrix }> => {
  const response = await axios.get(`/rfqs/${id}/compare`);
  return response.data;
};

export const awardRfqQuotation = async (
  id: number | string,
  quotationId: number,
  notes?: string,
  createPo = true,
  warehouseId?: number
) => {
  const response = await axios.post(`/rfqs/${id}/award`, {
    quotation_id: quotationId,
    notes,
    create_po: createPo,
    warehouse_id: warehouseId,
  });
  return response.data;
};

// Supplier Qualification & Performance
export const updateSupplierQualification = async (
  supplierId: number | string,
  status: QualificationStatus,
  reason?: string,
  notes?: string
) => {
  const response = await axios.post(`/suppliers/${supplierId}/qualification`, {
    qualification_status: status,
    reason,
    notes,
  });
  return response.data;
};

export const getSupplierPerformance = async (
  supplierId: number | string,
  periodDays?: number
): Promise<{ success: boolean; data: SupplierPerformanceScorecard }> => {
  const response = await axios.get(`/suppliers/${supplierId}/performance`, {
    params: { period_days: periodDays },
  });
  return response.data;
};

export const recalculateSupplierScore = async (supplierId: number | string) => {
  const response = await axios.post(`/suppliers/${supplierId}/recalculate-score`);
  return response.data;
};

export const getSupplierRankings = async () => {
  const response = await axios.get('/procurement/supplier-rankings');
  return response.data.data;
};

// Supplier Contracts & Price Agreements
export const getSupplierContracts = async (params?: { supplier_id?: number | string; status?: string; search?: string }) => {
  const response = await axios.get('/supplier-contracts', { params });
  return response.data;
};

export const getSupplierContract = async (id: number | string): Promise<{ success: boolean; data: SupplierContract }> => {
  const response = await axios.get(`/supplier-contracts/${id}`);
  return response.data;
};

export const createSupplierContract = async (payload: any) => {
  const response = await axios.post('/supplier-contracts', payload);
  return response.data;
};

export const updateSupplierContract = async (id: number | string, payload: any) => {
  const response = await axios.put(`/supplier-contracts/${id}`, payload);
  return response.data;
};

export const deleteSupplierContract = async (id: number | string) => {
  const response = await axios.delete(`/supplier-contracts/${id}`);
  return response.data;
};

export const getSupplierPriceAgreements = async (params?: { supplier_id?: number | string; contract_id?: number; status?: string }) => {
  const response = await axios.get('/supplier-price-agreements', { params });
  return response.data;
};

export const createSupplierPriceAgreement = async (payload: any) => {
  const response = await axios.post('/supplier-price-agreements', payload);
  return response.data;
};

export const resolveProcurementPrice = async (supplierId: number, variantId: number, quantity = 1) => {
  const response = await axios.get('/procurement/resolve-price', {
    params: { supplier_id: supplierId, product_variant_id: variantId, quantity },
  });
  return response.data.data;
};

// Procurement Analytics, 3-Way Match & Replenishment
export const getProcurementDashboard = async (): Promise<{ success: boolean; data: ProcurementDashboardData }> => {
  const response = await axios.get('/procurement/dashboard');
  return response.data;
};

export const getThreeWayMatch = async (purchaseId: number | string, tolerance = 0): Promise<{ success: boolean; data: ThreeWayMatchAudit }> => {
  const response = await axios.get(`/procurement/three-way-match/${purchaseId}`, {
    params: { tolerance },
  });
  return response.data;
};

export const getMatchExceptions = async (limit = 50) => {
  const response = await axios.get('/procurement/match-exceptions', { params: { limit } });
  return response.data.data;
};

export const getPpvSummary = async (periodDays = 90) => {
  const response = await axios.get('/procurement/ppv-summary', { params: { period_days: periodDays } });
  return response.data.data;
};

export const getReplenishmentRecommendations = async (params?: {
  warehouse_id?: number;
  lookback_days?: number;
  coverage_days?: number;
}): Promise<{
  success: boolean;
  data: {
    warehouse: any;
    summary: { total_items_analyzed: number; items_needing_reorder: number; total_estimated_spend: number; lookback_days: number; target_coverage_days: number };
    recommendations: ReplenishmentRecommendation[];
  };
}> => {
  const response = await axios.get('/procurement/recommendations', { params });
  return response.data;
};

export const createRequisitionFromRecommendations = async (payload: {
  warehouse_id: number;
  title?: string;
  items: Array<{
    product_id: number;
    product_variant_id: number;
    recommended_quantity: number;
    unit_cost?: number;
    preferred_supplier_id?: number | null;
    reason?: string;
  }>;
}) => {
  const response = await axios.post('/procurement/recommendations/create-requisition', payload);
  return response.data;
};
