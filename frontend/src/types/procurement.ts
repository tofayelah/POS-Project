export type RequisitionStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'fulfilled' | string;
export type RequisitionPriority = 'low' | 'medium' | 'high' | 'urgent' | string;
export type QualificationStatus = 'qualified' | 'conditional' | 'disqualified' | 'under_review' | string;

export interface RequisitionItem {
  id?: number | string;
  purchase_requisition_id?: number | string;
  product_id?: number | string;
  product_name?: string;
  product?: { id?: number | string; name?: string; sku?: string; code?: string };
  variant?: { id?: number | string; name?: string; sku?: string };
  quantity?: number;
  requested_quantity?: number;
  unit_price?: number;
  estimated_cost?: number;
  estimated_unit_cost?: number;
  estimated_total_cost?: number;
  preferred_supplier_id?: number | string;
  preferred_supplier?: { id?: number | string; name?: string };
}

export interface PurchaseRequisition {
  id: number | string;
  requisition_number?: string;
  requisition_no?: string;
  title?: string;
  status?: RequisitionStatus;
  priority?: RequisitionPriority;
  required_date?: string;
  requested_by?: number | string;
  requester?: { id?: number | string; name?: string };
  created_at?: string;
  updated_at?: string;
  items?: RequisitionItem[];
  warehouse?: { id?: number | string; name?: string; code?: string };
  warehouse_id?: number | string;
  estimated_total_cost?: number;
  notes?: string;
  rejection_reason?: string;
}

export interface RfqItem {
  id?: number | string;
  rfq_id?: number | string;
  product_id?: number | string;
  product_variant_id?: number | string;
  product_name?: string;
  product?: { id?: number | string; name?: string; sku?: string; code?: string };
  quantity?: number;
  requested_quantity?: number;
  target_unit_price?: number;
}

export interface RfqQuotation {
  id: number | string;
  rfq_id?: number | string;
  supplier_id?: number | string;
  supplier_name?: string;
  supplier?: { id?: number | string; name?: string };
  quotation_number?: string;
  total_price?: number;
  total_amount?: number;
  status?: string;
  submission_date?: string;
  submitted_at?: string;
  lead_time_days?: number;
  payment_terms?: string;
  items?: any[];
}

export interface Rfq {
  id: number | string;
  rfq_number?: string;
  title?: string;
  status?: string;
  issue_date?: string;
  deadline_date?: string;
  created_by?: number | string;
  creator?: { id?: number | string; name?: string };
  notes?: string;
  created_at?: string;
  updated_at?: string;
  items?: RfqItem[];
  invited_suppliers?: any[];
  quotations?: RfqQuotation[];
}

export interface RfqComparisonMatrix {
  rfq_id: number | string;
  rfq_number?: string;
  quotations_count?: number;
  advisory_notes?: string;
  comparison?: any[];
  recommended_quotation_id?: number | string;
  quotations: RfqQuotation[];
}

export interface SupplierContract {
  id: number | string;
  contract_number?: string;
  title?: string;
  supplier_id?: number | string;
  supplier_name?: string;
  supplier?: { id?: number | string; name?: string };
  start_date?: string;
  end_date?: string;
  contract_value?: number;
  status?: string;
}

export interface SupplierPriceAgreement {
  id: number | string;
  supplier_id: number | string;
  product_id: number | string;
  agreed_price: number;
  agreed_unit_price?: number;
  min_order_quantity?: number;
  lead_time_days?: number;
  status?: string;
  start_date: string;
  end_date: string;
  product?: { id?: number | string; name?: string };
  variant?: { id?: number | string; name?: string; sku?: string };
  supplier?: { id?: number | string; name?: string };
}

export interface SupplierPerformanceMetrics {
  composite_score?: number;
  on_time_delivery_rate?: number;
  quality_defect_rate?: number;
  fill_rate?: number;
  invoice_accuracy_rate?: number;
  avg_lead_time_days?: number;
  average_actual_lead_time_days?: number;
  lead_time_variance_days?: number;
  price_competitiveness_score?: number;
  contract_compliance_rate?: number;
  total_orders_count?: number;
  total_spend?: number;
  outstanding_balance?: number;
}

export interface SupplierPerformanceScore {
  id: number | string;
  supplier_id: number | string;
  supplier_code?: string;
  supplier_name?: string;
  quality_score?: number;
  delivery_score?: number;
  overall_score?: number;
  qualification_status?: QualificationStatus;
  metrics?: SupplierPerformanceMetrics;
}

export type SupplierPerformanceScorecard = SupplierPerformanceScore;

export interface ReplenishmentRecommendation {
  id: number | string;
  product_id: number;
  product_variant_id: number;
  recommended_quantity: number;
  product_name?: string;
  variant_sku?: string;
  suggested_qty?: number;
  reason?: string;
  urgency?: string;
  stock_on_hand?: number;
  incoming_po_quantity?: number;
  daily_sales_velocity?: number;
  reorder_point?: number;
  unit_cost?: number;
  estimated_line_cost?: number;
  preferred_supplier_id?: number;
  preferred_supplier_name?: string;
}

export interface ProcurementDashboardData {
  total_requisitions?: number;
  pending_rfqs?: number;
  active_contracts?: number;
  expiring_contracts?: any;
  spend_ytd?: number;
  kpis?: {
    open_requisitions?: number;
    pending_approval_requisitions?: number;
    pending_rfqs?: number;
    open_rfqs?: number;
    active_contracts?: number;
    expiring_contracts?: number;
    items_needing_reorder?: number;
    total_spend_month?: number;
    total_spend_ytd?: number;
  };
  ppv_summary?: {
    status?: string;
    net_ppv?: number;
    total_favorable?: number;
    total_unfavorable?: number;
    net_variance?: number;
  };
  top_suppliers?: Array<{
    id?: number | string;
    supplier_id: number | string;
    name?: string;
    supplier_name?: string;
    code?: string;
    score?: number;
    otd_rate?: number;
    fill_rate?: number;
    total_spend: number;
  }>;
}

export interface ThreeWayMatchAudit {
  id: number | string;
  po_id?: number | string;
  grn_id?: number | string;
  invoice_id?: number | string;
  status: 'MATCHED' | 'DISCREPANCY' | string;
  price_variance?: number;
  qty_variance?: number;
  details?: string;
}
