export interface PurchaseRequisition {
  id: number | string;
  requisition_number?: string;
  title?: string;
  status?: string;
  requested_by?: string;
  created_at?: string;
}

export interface Rfq {
  id: number | string;
  rfq_number?: string;
  title?: string;
  status?: string;
  created_at?: string;
}

export interface SupplierContract {
  id: number | string;
  contract_number?: string;
  supplier_id?: number | string;
  supplier_name?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
}

export interface SupplierPerformanceScore {
  id: number | string;
  supplier_id: number | string;
  supplier_name?: string;
  quality_score?: number;
  delivery_score?: number;
  overall_score?: number;
}

export interface ProcurementRecommendation {
  id: number | string;
  product_name?: string;
  suggested_qty?: number;
  reason?: string;
}
