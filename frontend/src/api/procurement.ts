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
export const DEFAULT_REQUISITIONS: PurchaseRequisition[] = [
  {
    id: 1,
    requisition_number: 'PR-2026-0001',
    warehouse_id: 1,
    warehouse: { id: 1, name: 'Central Main Depot', code: 'WH-MAIN-01' },
    title: 'Q4 Stock Replenishment - Smart Gadgets & Mobile Accessories',
    priority: 'HIGH',
    status: 'APPROVED',
    required_date: '2026-10-25',
    requested_by: 1,
    requester: { id: 1, name: 'Tofayel Ahmed' },
    notes: 'Urgent stock replenishment before festive seasonal promotion.',
    estimated_total_cost: 125000,
    created_at: '2026-10-05T09:00:00Z',
    updated_at: '2026-10-05T09:00:00Z',
    items: [
      {
        id: 101,
        purchase_requisition_id: 1,
        product_id: 1,
        product: { id: 1, name: 'Samsung Galaxy A54 5G 128GB', sku: 'SAM-A54-128', code: 'PRD-0001' },
        requested_quantity: 15,
        estimated_unit_cost: 32000,
        estimated_total_cost: 480000,
        preferred_supplier_id: 1,
        preferred_supplier: { id: 1, name: 'TM International' },
      },
      {
        id: 102,
        purchase_requisition_id: 1,
        product_id: 2,
        product: { id: 2, name: 'Apple iPhone 15 128GB Blue', sku: 'APL-IP15-128', code: 'PRD-0002' },
        requested_quantity: 5,
        estimated_unit_cost: 110000,
        estimated_total_cost: 550000,
        preferred_supplier_id: 2,
        preferred_supplier: { id: 2, name: 'Square Pharmaceuticals Ltd' },
      },
    ],
  },
  {
    id: 2,
    requisition_number: 'PR-2026-0002',
    warehouse_id: 2,
    warehouse: { id: 2, name: 'Uttara Retail Outlet Store', code: 'WH-UTT-02' },
    title: 'Footwear & Leather Goods Inventory Purchase',
    priority: 'MEDIUM',
    status: 'PENDING_APPROVAL',
    required_date: '2026-10-30',
    requested_by: 1,
    requester: { id: 1, name: 'Tofayel Ahmed' },
    notes: 'Standard monthly retail restocking requisition.',
    estimated_total_cost: 45000,
    created_at: '2026-10-08T11:20:00Z',
    updated_at: '2026-10-08T11:20:00Z',
    items: [
      {
        id: 103,
        purchase_requisition_id: 2,
        product_id: 3,
        product: { id: 3, name: 'Apex Leather Formal Shoes - Brown', sku: 'APX-SHOE-BRN', code: 'PRD-0003' },
        requested_quantity: 20,
        estimated_unit_cost: 3500,
        estimated_total_cost: 70000,
        preferred_supplier_id: 3,
        preferred_supplier: { id: 3, name: 'Apex Footwear & Leather' },
      },
    ],
  },
];

import { isDemoOrPreviewMode, extractApiError } from '../utils/env';

export const getRequisitions = async (params?: {
  status?: string;
  priority?: string;
  warehouse_id?: number | string;
  search?: string;
  page?: number;
  per_page?: number;
}) => {
  try {
    const response = await axios.get('/purchase-requisitions', { params });
    if (response.data?.success || Array.isArray(response.data) || response.data?.data) {
      return response.data;
    }
  } catch (err) {
    if (!isDemoOrPreviewMode()) {
      const errInfo = extractApiError(err);
      return { success: false, error: errInfo.message, data: { data: [], total: 0 } };
    }
  }

  let filtered = [...DEFAULT_REQUISITIONS];
  if (params?.status && params.status !== 'ALL') {
    filtered = filtered.filter((r) => r.status === params.status);
  }
  if (params?.priority && params.priority !== 'ALL') {
    filtered = filtered.filter((r) => r.priority === params.priority);
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter((r) =>
      r.title.toLowerCase().includes(q) ||
      r.requisition_number.toLowerCase().includes(q)
    );
  }

  return { success: true, is_demo_fallback: true, data: { data: filtered, total: filtered.length } };
};

export const getRequisitionNextNumber = async () => {
  try {
    const response = await axios.get('/purchase-requisitions/next-number');
    return response.data?.data || 'PR-2026-0003';
  } catch {
    return `PR-2026-${String(DEFAULT_REQUISITIONS.length + 1).padStart(4, '0')}`;
  }
};

export const getRequisition = async (id: number | string): Promise<{ success: boolean; data?: PurchaseRequisition; is_demo_fallback?: boolean; error?: string }> => {
  try {
    const response = await axios.get(`/purchase-requisitions/${id}`);
    return response.data;
  } catch (err) {
    if (isDemoOrPreviewMode()) {
      const found = DEFAULT_REQUISITIONS.find((r) => String(r.id) === String(id)) || DEFAULT_REQUISITIONS[0];
      return { success: true, is_demo_fallback: true, data: found };
    }
    const errInfo = extractApiError(err);
    return { success: false, error: errInfo.message };
  }
};

export const createRequisition = async (payload: any) => {
  try {
    const response = await axios.post('/purchase-requisitions', payload);
    return response.data;
  } catch (err) {
    const errInfo = extractApiError(err);
    return { success: false, message: errInfo.message, error: errInfo.message };
  }
};

export const submitRequisition = async (id: number | string) => {
  try {
    const response = await axios.post(`/purchase-requisitions/${id}/submit`);
    return response.data;
  } catch (err) {
    const errInfo = extractApiError(err);
    return { success: false, message: errInfo.message, error: errInfo.message };
  }
};

export const reviewRequisition = async (id: number | string, notes?: string) => {
  try {
    const response = await axios.post(`/purchase-requisitions/${id}/review`, { notes });
    return response.data;
  } catch (err) {
    const errInfo = extractApiError(err);
    return { success: false, message: errInfo.message, error: errInfo.message };
  }
};

export const approveRequisition = async (id: number | string, enforceSegregation = false) => {
  try {
    const response = await axios.post(`/purchase-requisitions/${id}/approve`, {
      enforce_segregation: enforceSegregation,
    });
    return response.data;
  } catch (err) {
    const errInfo = extractApiError(err);
    return { success: false, message: errInfo.message, error: errInfo.message };
  }
};

export const rejectRequisition = async (id: number | string, reason: string) => {
  try {
    const response = await axios.post(`/purchase-requisitions/${id}/reject`, { reason });
    return response.data;
  } catch (err) {
    const errInfo = extractApiError(err);
    return { success: false, message: errInfo.message, error: errInfo.message };
  }
};

export const cancelRequisition = async (id: number | string, reason?: string) => {
  try {
    const response = await axios.post(`/purchase-requisitions/${id}/cancel`, { reason });
    return response.data;
  } catch (err) {
    const errInfo = extractApiError(err);
    return { success: false, message: errInfo.message, error: errInfo.message };
  }
};

export const convertRequisitionToPo = async (id: number | string, supplierId: number, warehouseId?: number) => {
  try {
    const response = await axios.post(`/purchase-requisitions/${id}/convert-po`, {
      supplier_id: supplierId,
      warehouse_id: warehouseId,
    });
    return response.data;
  } catch (err) {
    const errInfo = extractApiError(err);
    return { success: false, message: errInfo.message, error: errInfo.message };
  }
};

export const convertRequisitionToRfq = async (id: number | string, payload?: { title?: string; deadline_date?: string; notes?: string }) => {
  try {
    const response = await axios.post(`/purchase-requisitions/${id}/convert-rfq`, payload);
    return response.data;
  } catch (err) {
    const errInfo = extractApiError(err);
    return { success: false, message: errInfo.message, error: errInfo.message };
  }
};

// Requests for Quotation (RFQs)
export const DEFAULT_RFQS: Rfq[] = [
  {
    id: 1,
    rfq_number: 'RFQ-2026-0001',
    title: 'Bulk Supplier Bidding for Q4 Mobile & Electronics Procurement',
    status: 'OPEN',
    issue_date: '2026-10-01',
    deadline_date: '2026-10-20',
    created_by: 1,
    creator: { id: 1, name: 'Tofayel Ahmed' },
    notes: 'Competitive quotation request sent to primary tier 1 distributors.',
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-10-01T08:00:00Z',
    items: [
      {
        id: 201,
        rfq_id: 1,
        product_id: 1,
        product: { id: 1, name: 'Samsung Galaxy A54 5G 128GB', sku: 'SAM-A54-128' },
        requested_quantity: 30,
        target_unit_price: 31500,
      },
    ],
    invited_suppliers: [
      { id: 1, rfq_id: 1, supplier_id: 1, status: 'QUOTED', supplier: { id: 1, name: 'TM International' } },
      { id: 2, rfq_id: 1, supplier_id: 2, status: 'INVITED', supplier: { id: 2, name: 'Square Pharmaceuticals Ltd' } },
    ],
    quotations: [
      {
        id: 301,
        rfq_id: 1,
        supplier_id: 1,
        supplier: { id: 1, name: 'TM International' },
        quotation_number: 'QUO-TMI-881',
        total_amount: 930000,
        status: 'SUBMITTED',
        submission_date: '2026-10-05T14:00:00Z',
        lead_time_days: 5,
        payment_terms: 'Net 30 Days',
        items: [
          {
            id: 401,
            rfq_quotation_id: 301,
            rfq_item_id: 201,
            quoted_unit_price: 31000,
            quoted_quantity: 30,
            line_total: 930000,
          },
        ],
      },
    ],
  },
];

export const getRfqs = async (params?: { status?: string; search?: string; page?: number; per_page?: number }) => {
  try {
    const response = await axios.get('/rfqs', { params });
    if (response.data?.success || Array.isArray(response.data) || response.data?.data) {
      return response.data;
    }
  } catch (err) {
    if (!isDemoOrPreviewMode()) {
      const errInfo = extractApiError(err);
      return { success: false, error: errInfo.message, data: { data: [], total: 0 } };
    }
  }

  let filtered = [...DEFAULT_RFQS];
  if (params?.status && params.status !== 'ALL') {
    filtered = filtered.filter((r) => r.status === params.status);
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter((r) =>
      r.title.toLowerCase().includes(q) ||
      r.rfq_number.toLowerCase().includes(q)
    );
  }

  return { success: true, is_demo_fallback: true, data: { data: filtered, total: filtered.length } };
};

export const getRfqNextNumber = async () => {
  try {
    const response = await axios.get('/rfqs/next-number');
    return response.data?.data || 'RFQ-2026-0002';
  } catch {
    return `RFQ-2026-${String(DEFAULT_RFQS.length + 1).padStart(4, '0')}`;
  }
};

export const getRfq = async (id: number | string): Promise<{ success: boolean; data?: Rfq; is_demo_fallback?: boolean; error?: string }> => {
  try {
    const response = await axios.get(`/rfqs/${id}`);
    return response.data;
  } catch (err) {
    if (isDemoOrPreviewMode()) {
      const found = DEFAULT_RFQS.find((r) => String(r.id) === String(id)) || DEFAULT_RFQS[0];
      return { success: true, is_demo_fallback: true, data: found };
    }
    const errInfo = extractApiError(err);
    return { success: false, error: errInfo.message };
  }
};

export const createRfq = async (payload: any) => {
  try {
    const response = await axios.post('/rfqs', payload);
    return response.data;
  } catch (err) {
    const errInfo = extractApiError(err);
    return { success: false, message: errInfo.message, error: errInfo.message };
  }
};

export const inviteRfqSuppliers = async (id: number | string, supplierIds: number[]) => {
  try {
    const response = await axios.post(`/rfqs/${id}/invite`, { supplier_ids: supplierIds });
    return response.data;
  } catch (err) {
    const errInfo = extractApiError(err);
    return { success: false, message: errInfo.message, error: errInfo.message };
  }
};

export const recordRfqQuotation = async (id: number | string, payload: any) => {
  try {
    const response = await axios.post(`/rfqs/${id}/quotations`, payload);
    return response.data;
  } catch (err) {
    const errInfo = extractApiError(err);
    return { success: false, message: errInfo.message, error: errInfo.message };
  }
};

export const compareRfqQuotations = async (id: number | string): Promise<{ success: boolean; data?: RfqComparisonMatrix; is_demo_fallback?: boolean; error?: string }> => {
  try {
    const response = await axios.get(`/rfqs/${id}/compare`);
    return response.data;
  } catch (err) {
    if (isDemoOrPreviewMode()) {
      return {
        success: true,
        is_demo_fallback: true,
        data: {
          rfq: DEFAULT_RFQS[0],
          suppliers: DEFAULT_RFQS[0].invited_suppliers.map((s) => s.supplier),
          items: DEFAULT_RFQS[0].items,
          quotations: DEFAULT_RFQS[0].quotations,
        } as any,
      };
    }
    const errInfo = extractApiError(err);
    return { success: false, error: errInfo.message };
  }
};

export const awardRfqQuotation = async (
  id: number | string,
  quotationId: number,
  notes?: string,
  createPo = true,
  warehouseId?: number
) => {
  try {
    const response = await axios.post(`/rfqs/${id}/award`, {
      quotation_id: quotationId,
      notes,
      create_po: createPo,
      warehouse_id: warehouseId,
    });
    return response.data;
  } catch (err) {
    const errInfo = extractApiError(err);
    return { success: false, message: errInfo.message, error: errInfo.message };
  }
};

// Supplier Qualification & Performance
export const updateSupplierQualification = async (
  supplierId: number | string,
  status: QualificationStatus,
  reason?: string,
  notes?: string
) => {
  try {
    const response = await axios.post(`/suppliers/${supplierId}/qualification`, {
      qualification_status: status,
      reason,
      notes,
    });
    return response.data;
  } catch (err) {
    const errInfo = extractApiError(err);
    return { success: false, message: errInfo.message, error: errInfo.message };
  }
};

export const getSupplierPerformance = async (
  supplierId: number | string,
  periodDays?: number
): Promise<{ success: boolean; data?: SupplierPerformanceScorecard; is_demo_fallback?: boolean; error?: string }> => {
  try {
    const response = await axios.get(`/suppliers/${supplierId}/performance`, {
      params: { period_days: periodDays },
    });
    return response.data;
  } catch (err) {
    if (isDemoOrPreviewMode()) {
      return {
        success: true,
        is_demo_fallback: true,
        data: {
          supplier_id: Number(supplierId),
          period_days: periodDays || 90,
          quality_score: 95.5,
          delivery_score: 98.0,
          pricing_score: 92.0,
          overall_score: 95.2,
          grade: 'A',
        } as any,
      };
    }
    const errInfo = extractApiError(err);
    return { success: false, error: errInfo.message };
  }
};

export const recalculateSupplierScore = async (supplierId: number | string) => {
  try {
    const response = await axios.post(`/suppliers/${supplierId}/recalculate-score`);
    return response.data;
  } catch (err) {
    const errInfo = extractApiError(err);
    return { success: false, message: errInfo.message, error: errInfo.message };
  }
};

export const getSupplierRankings = async () => {
  try {
    const response = await axios.get('/procurement/supplier-rankings');
    return response.data.data;
  } catch (err) {
    if (isDemoOrPreviewMode()) {
      return [
        { id: 1, name: 'TM International', score: 96.5, grade: 'A+' },
        { id: 2, name: 'Square Pharmaceuticals Ltd', score: 94.0, grade: 'A' },
        { id: 3, name: 'Apex Footwear & Leather', score: 91.5, grade: 'A' },
      ];
    }
    throw err;
  }
};

// Supplier Contracts & Price Agreements
export const getSupplierContracts = async (params?: { supplier_id?: number | string; status?: string; search?: string }) => {
  try {
    const response = await axios.get('/supplier-contracts', { params });
    return response.data;
  } catch (err) {
    if (isDemoOrPreviewMode()) {
      return { success: true, is_demo_fallback: true, data: [] };
    }
    const errInfo = extractApiError(err);
    return { success: false, error: errInfo.message, data: [] };
  }
};

export const getSupplierContract = async (id: number | string): Promise<{ success: boolean; data?: SupplierContract; is_demo_fallback?: boolean; error?: string }> => {
  try {
    const response = await axios.get(`/supplier-contracts/${id}`);
    return response.data;
  } catch (err) {
    if (isDemoOrPreviewMode()) {
      return { success: true, is_demo_fallback: true, data: {} as any };
    }
    const errInfo = extractApiError(err);
    return { success: false, error: errInfo.message };
  }
};

export const createSupplierContract = async (payload: any) => {
  try {
    const response = await axios.post('/supplier-contracts', payload);
    return response.data;
  } catch (err) {
    const errInfo = extractApiError(err);
    return { success: false, message: errInfo.message, error: errInfo.message };
  }
};

export const updateSupplierContract = async (id: number | string, payload: any) => {
  try {
    const response = await axios.put(`/supplier-contracts/${id}`, payload);
    return response.data;
  } catch (err) {
    const errInfo = extractApiError(err);
    return { success: false, message: errInfo.message, error: errInfo.message };
  }
};

export const deleteSupplierContract = async (id: number | string) => {
  try {
    const response = await axios.delete(`/supplier-contracts/${id}`);
    return response.data;
  } catch (err) {
    const errInfo = extractApiError(err);
    return { success: false, message: errInfo.message, error: errInfo.message };
  }
};

export const getSupplierPriceAgreements = async (params?: { supplier_id?: number | string; contract_id?: number; status?: string }) => {
  try {
    const response = await axios.get('/supplier-price-agreements', { params });
    return response.data;
  } catch (err) {
    if (isDemoOrPreviewMode()) {
      return { success: true, is_demo_fallback: true, data: [] };
    }
    const errInfo = extractApiError(err);
    return { success: false, error: errInfo.message, data: [] };
  }
};

export const createSupplierPriceAgreement = async (payload: any) => {
  try {
    const response = await axios.post('/supplier-price-agreements', payload);
    return response.data;
  } catch (err) {
    const errInfo = extractApiError(err);
    return { success: false, message: errInfo.message, error: errInfo.message };
  }
};

export const resolveProcurementPrice = async (supplierId: number, variantId: number, quantity = 1) => {
  try {
    const response = await axios.get('/procurement/resolve-price', {
      params: { supplier_id: supplierId, product_variant_id: variantId, quantity },
    });
    return response.data.data;
  } catch (err) {
    if (isDemoOrPreviewMode()) {
      return { unit_price: 32000, source: 'Agreed Price' };
    }
    throw err;
  }
};

// Procurement Analytics, 3-Way Match & Replenishment
export const getProcurementDashboard = async (): Promise<{ success: boolean; data?: ProcurementDashboardData; is_demo_fallback?: boolean; error?: string }> => {
  try {
    const response = await axios.get('/procurement/dashboard');
    return response.data;
  } catch (err) {
    if (isDemoOrPreviewMode()) {
      return {
        success: true,
        is_demo_fallback: true,
        data: {
          total_requisitions: DEFAULT_REQUISITIONS.length,
          open_rfqs: DEFAULT_RFQS.length,
          active_contracts: 3,
          total_procurement_spend: 1850000,
        } as any,
      };
    }
    const errInfo = extractApiError(err);
    return { success: false, error: errInfo.message };
  }
};

export const getThreeWayMatch = async (purchaseId: number | string, tolerance = 0): Promise<{ success: boolean; data?: ThreeWayMatchAudit; is_demo_fallback?: boolean; error?: string }> => {
  try {
    const response = await axios.get(`/procurement/three-way-match/${purchaseId}`, {
      params: { tolerance },
    });
    return response.data;
  } catch (err) {
    if (isDemoOrPreviewMode()) {
      return { success: true, is_demo_fallback: true, data: { status: 'MATCHED', discrepancy: 0 } as any };
    }
    const errInfo = extractApiError(err);
    return { success: false, error: errInfo.message };
  }
};

export const getMatchExceptions = async (limit = 50) => {
  try {
    const response = await axios.get('/procurement/match-exceptions', { params: { limit } });
    return response.data.data;
  } catch (err) {
    if (isDemoOrPreviewMode()) {
      return [];
    }
    const errInfo = extractApiError(err);
    throw new Error(errInfo.message);
  }
};

export const getPpvSummary = async (periodDays = 90) => {
  try {
    const response = await axios.get('/procurement/ppv-summary', { params: { period_days: periodDays } });
    return response.data.data;
  } catch (err) {
    if (isDemoOrPreviewMode()) {
      return { favorable_variance: 15000, unfavorable_variance: 2000 };
    }
    const errInfo = extractApiError(err);
    throw new Error(errInfo.message);
  }
};

export const getReplenishmentRecommendations = async (params?: {
  warehouse_id?: number;
  lookback_days?: number;
  coverage_days?: number;
}): Promise<{
  success: boolean;
  is_demo_fallback?: boolean;
  error?: string;
  data?: {
    warehouse: any;
    summary: { total_items_analyzed: number; items_needing_reorder: number; total_estimated_spend: number; lookback_days: number; target_coverage_days: number };
    recommendations: ReplenishmentRecommendation[];
  };
}> => {
  try {
    const response = await axios.get('/procurement/recommendations', { params });
    return response.data;
  } catch (err) {
    if (isDemoOrPreviewMode()) {
      return {
        success: true,
        is_demo_fallback: true,
        data: {
          warehouse: { id: 1, name: 'Central Main Depot' },
          summary: { total_items_analyzed: 45, items_needing_reorder: 3, total_estimated_spend: 125000, lookback_days: 30, target_coverage_days: 30 },
          recommendations: [],
        },
      };
    }
    const errInfo = extractApiError(err);
    return { success: false, error: errInfo.message };
  }
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
  try {
    const response = await axios.post('/procurement/recommendations/create-requisition', payload);
    return response.data;
  } catch (err) {
    const errInfo = extractApiError(err);
    return { success: false, message: errInfo.message, error: errInfo.message };
  }
};
