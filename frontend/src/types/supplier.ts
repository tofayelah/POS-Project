export interface Supplier {
  id: number | string;
  name: string;
  code?: string;
  supplier_code?: string;
  email?: string;
  phone?: string;
  address?: string;
  contact_person?: string;
  is_active?: boolean;
  status?: string;
}

export interface SupplierPayload extends Partial<Supplier> {}

export interface SupplierListParams {
  search?: string;
  status?: string;
  page?: number;
  per_page?: number;
  all?: boolean;
}
