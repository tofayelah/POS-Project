export type QualificationStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'QUALIFIED'
  | 'CONDITIONAL'
  | 'SUSPENDED'
  | 'REJECTED'
  | 'BLOCKED';

export type RequisitionStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONVERTED'
  | 'CANCELLED';

export type RequisitionPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type RfqStatus = 'DRAFT' | 'SENT' | 'UNDER_EVALUATION' | 'AWARDED' | 'CANCELLED' | 'CLOSED';

export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';

export interface PurchaseRequisitionItem {
  id: number;
  purchase_requisition_id: number;
  product_id: number;
  product_variant_id: number;
  preferred_supplier_id?: number | null;
  requested_quantity: number;
  estimated_unit_cost: number;
  estimated_total_cost: number;
  converted_quantity: number;
  notes?: string | null;
  product?: {
    id: number;
    name: string;
    product_code?: string;
  };
  variant?: {
    id: number;
    name: string;
    sku: string;
  };
  preferred_supplier?: {
    id: number;
    name: string;
    supplier_code: string;
  };
}

export interface PurchaseRequisition {
  id: number;
  uuid: string;
  company_id: number;
  warehouse_id: number;
  requisition_no: string;
  title?: string | null;
  status: RequisitionStatus;
  priority: RequisitionPriority;
  required_date?: string | null;
  estimated_total_cost: number;
  notes?: string | null;
  rejection_reason?: string | null;
  requested_by?: number | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  approved_by?: number | null;
  approved_at?: string | null;
  converted_to_type?: 'PO' | 'RFQ' | null;
  converted_to_id?: number | null;
  converted_at?: string | null;
  created_at: string;
  updated_at: string;
  warehouse?: {
    id: number;
    name: string;
    code?: string;
  };
  requester?: {
    id: number;
    name: string;
    email: string;
  };
  reviewer?: {
    id: number;
    name: string;
  };
  approver?: {
    id: number;
    name: string;
  };
  items?: PurchaseRequisitionItem[];
  rfq?: {
    id: number;
    rfq_number: string;
  };
  purchase_order?: {
    id: number;
    po_number: string;
  };
}

export interface RfqItem {
  id: number;
  rfq_id: number;
  product_id: number;
  product_variant_id: number;
  requested_quantity: number;
  target_unit_price?: number | null;
  notes?: string | null;
  product?: {
    id: number;
    name: string;
  };
  variant?: {
    id: number;
    name: string;
    sku: string;
  };
}

export interface SupplierQuotationItem {
  id: number;
  supplier_quotation_id: number;
  rfq_item_id?: number | null;
  product_id: number;
  product_variant_id: number;
  quantity: number;
  unit_price: number;
  discount: number;
  tax: number;
  line_total: number;
  lead_time_days?: number | null;
  notes?: string | null;
  product?: {
    id: number;
    name: string;
  };
  variant?: {
    id: number;
    name: string;
    sku: string;
  };
}

export interface SupplierQuotation {
  id: number;
  uuid: string;
  company_id: number;
  rfq_id: number;
  supplier_id: number;
  quotation_number: string;
  quotation_date: string;
  validity_date?: string | null;
  lead_time_days: number;
  payment_terms?: string | null;
  currency: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  is_awarded: boolean;
  evaluation_notes?: string | null;
  supplier?: {
    id: number;
    name: string;
    supplier_code: string;
    score_cached?: number | null;
  };
  items?: SupplierQuotationItem[];
}

export interface Rfq {
  id: number;
  uuid: string;
  company_id: number;
  purchase_requisition_id?: number | null;
  rfq_number: string;
  title: string;
  status: RfqStatus;
  issue_date: string;
  deadline_date?: string | null;
  target_delivery_date?: string | null;
  notes?: string | null;
  awarded_supplier_id?: number | null;
  awarded_quotation_id?: number | null;
  awarded_at?: string | null;
  created_at: string;
  items?: RfqItem[];
  invited_suppliers?: Array<{
    id: number;
    supplier_id: number;
    status: 'INVITED' | 'RESPONDED' | 'DECLINED';
    supplier: {
      id: number;
      name: string;
      supplier_code: string;
    };
  }>;
  quotations?: SupplierQuotation[];
  awarded_supplier?: {
    id: number;
    name: string;
  };
}

export interface RfqComparisonMatrix {
  rfq_id: number;
  rfq_number: string;
  quotations_count: number;
  recommended_quotation_id?: number | null;
  advisory_notes: string;
  comparison: Array<{
    quotation_id: number;
    quotation_number: string;
    supplier_id: number;
    supplier_name: string;
    supplier_code: string;
    supplier_score: number;
    qualification_status: QualificationStatus;
    grand_total: number;
    lead_time_days: number;
    payment_terms?: string;
    status: string;
    is_awarded: boolean;
    price_score: number;
    lead_time_score: number;
    advisory_rank_score: number;
    items: Array<{
      product_name: string;
      variant_name: string;
      quantity: number;
      unit_price: number;
      line_total: number;
    }>;
  }>;
}

export interface SupplierPerformanceScorecard {
  supplier_id: number;
  supplier_code: string;
  supplier_name: string;
  qualification_status: QualificationStatus;
  risk_rating: string;
  agreed_lead_time_days: number;
  metrics: {
    composite_score: number;
    on_time_delivery_rate: number;
    fill_rate: number;
    quality_acceptance_rate: number;
    price_stability_rate: number;
    average_actual_lead_time_days: number;
    total_orders_count: number;
    total_receipts_count: number;
    total_ordered_quantity: number;
    total_received_quantity: number;
    total_spend: number;
    outstanding_balance: number;
  };
  evaluated_at: string;
}

export interface SupplierContract {
  id: number;
  uuid: string;
  company_id: number;
  supplier_id: number;
  contract_number: string;
  title: string;
  status: ContractStatus;
  start_date: string;
  end_date: string;
  payment_terms?: string | null;
  min_spend_commitment: number;
  max_spend_limit: number;
  contract_value: number;
  notes?: string | null;
  created_at: string;
  supplier?: {
    id: number;
    name: string;
    supplier_code: string;
  };
  price_agreements?: SupplierPriceAgreement[];
}

export interface SupplierPriceAgreement {
  id: number;
  uuid: string;
  company_id: number;
  supplier_id: number;
  supplier_contract_id?: number | null;
  product_id: number;
  product_variant_id: number;
  agreed_unit_price: number;
  min_order_quantity: number;
  lead_time_days: number;
  effective_date: string;
  expiry_date?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string | null;
  supplier?: {
    id: number;
    name: string;
  };
  product?: {
    id: number;
    name: string;
  };
  variant?: {
    id: number;
    name: string;
    sku: string;
  };
}

export interface ThreeWayMatchAudit {
  purchase_id: number;
  supplier_invoice_number: string;
  invoice_date: string;
  po_id?: number | null;
  po_number?: string | null;
  goods_receipt_id?: number | null;
  receipt_number?: string | null;
  supplier_name?: string;
  match_status: 'MATCHED' | 'PARTIAL_MATCH' | 'EXCEPTION' | 'WARNING';
  has_exceptions: boolean;
  exceptions: Array<{
    type: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    variant_id?: number;
    message: string;
  }>;
  line_matches: Array<{
    product_id: number;
    product_variant_id: number;
    ordered_quantity: number;
    received_quantity: number;
    invoiced_quantity: number;
    po_unit_cost: number;
    invoiced_unit_cost: number;
    quantity_match: boolean;
    price_match: boolean;
    line_exceptions: string[];
  }>;
}

export interface ReplenishmentRecommendation {
  product_id: number;
  product_name: string;
  product_code: string;
  product_variant_id: number;
  variant_name: string;
  variant_sku: string;
  stock_on_hand: number;
  incoming_po_quantity: number;
  net_available: number;
  daily_sales_velocity: number;
  lead_time_days: number;
  safety_stock: number;
  reorder_point: number;
  moq: number;
  recommended_quantity: number;
  recommended_order_qty?: number;
  unit_cost: number;
  price_source: string;
  estimated_line_cost: number;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  preferred_supplier_id?: number | null;
  preferred_supplier_name: string;
  reason: string;
}

export interface ProcurementDashboardData {
  recommendations_count?: number;
  kpis: {
    open_requisitions: number;
    pending_approval_requisitions: number;
    open_rfqs: number;
    pending_goods_receipts: number;
    active_contracts: number;
    expiring_contracts_count: number;
    items_needing_reorder: number;
  };
  expiring_contracts: SupplierContract[];
  top_suppliers: Array<{
    id: number;
    name: string;
    code: string;
    score: number;
    otd_rate: number;
    fill_rate: number;
    total_spend: number;
    outstanding_balance: number;
  }>;
  ppv_summary: {
    total_unfavorable: number;
    total_favorable: number;
    net_ppv: number;
    status: 'FAVORABLE' | 'UNFAVORABLE' | 'NEUTRAL';
  };
}
