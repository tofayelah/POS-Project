export type ProductType = 'simple' | 'variable';
export type TaxType = 'inclusive' | 'exclusive' | 'exempt';
export type BarcodeType = 'EAN' | 'UPC' | 'Internal' | 'Supplier' | 'Other';
export type EntityStatus = 'active' | 'inactive';

export interface Category {
  id: number;
  uuid: string;
  company_id: number;
  parent_id: number | null;
  parent?: { id: number; name: string; slug: string } | null;
  children?: Category[];
  name: string;
  slug: string;
  description?: string | null;
  status: EntityStatus;
  sort_order: number;
  products_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Brand {
  id: number;
  uuid: string;
  company_id: number;
  name: string;
  slug: string;
  description?: string | null;
  status: EntityStatus;
  products_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Unit {
  id: number;
  uuid: string;
  company_id: number;
  name: string;
  short_code: string;
  decimal_allowed: boolean;
  status: EntityStatus;
  products_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AttributeValue {
  id: number;
  uuid: string;
  attribute_id: number;
  attribute_name?: string;
  value: string;
  code?: string | null;
  sort_order: number;
  status: EntityStatus;
}

export interface Attribute {
  id: number;
  uuid: string;
  company_id: number;
  name: string;
  code?: string | null;
  status: EntityStatus;
  sort_order: number;
  values?: AttributeValue[];
  created_at?: string;
  updated_at?: string;
}

export interface Barcode {
  id: number;
  uuid: string;
  product_variant_id: number;
  barcode: string;
  barcode_type: BarcodeType;
  is_primary: boolean;
  status: EntityStatus;
  variant?: {
    id: number;
    sku: string;
    variant_name: string;
    product_name?: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface ProductVariant {
  id?: number;
  uuid?: string;
  product_id?: number;
  sku: string;
  variant_name: string;
  cost_price: number;
  selling_price: number;
  wholesale_price?: number;
  mrp?: number;
  tax_rate?: number | null;
  status: EntityStatus;
  product?: {
    id: number;
    name: string;
    product_type: ProductType;
  };
  attribute_values?: Array<{
    id: number;
    attribute_id: number;
    attribute_name?: string;
    value: string;
    code?: string | null;
  }>;
  attribute_value_ids?: number[];
  barcodes?: Barcode[];
  primary_barcode?: {
    id: number;
    barcode: string;
    barcode_type: BarcodeType;
  } | null;
}

export interface Product {
  id: number;
  uuid: string;
  company_id: number;
  business_unit_id?: number | null;
  category_id: number;
  category?: {
    id: number;
    name: string;
    slug: string;
  };
  brand_id?: number | null;
  brand?: {
    id: number;
    name: string;
  } | null;
  unit_id: number;
  unit?: {
    id: number;
    name: string;
    short_code: string;
  };
  name: string;
  slug: string;
  product_code?: string | null;
  description?: string | null;
  product_type: ProductType;
  has_variants: boolean;
  tax_rate: number;
  tax_type: TaxType;
  reorder_level: number;
  status: EntityStatus;
  variants_count?: number;
  variants?: ProductVariant[];
  created_at?: string;
  updated_at?: string;
}

export interface ProductPayload {
  company_id: number;
  business_unit_id?: number | null;
  category_id: number;
  brand_id?: number | null;
  unit_id: number;
  name: string;
  product_code?: string | null;
  description?: string | null;
  product_type: ProductType;
  has_variants: boolean;
  tax_rate: number;
  tax_type: TaxType;
  reorder_level: number;
  status: EntityStatus;
  variants: Array<{
    id?: number;
    sku: string;
    variant_name: string;
    cost_price: number;
    selling_price: number;
    wholesale_price?: number;
    mrp?: number;
    status: EntityStatus;
    attribute_value_ids?: number[];
    barcodes?: Array<{
      id?: number;
      barcode: string;
      barcode_type: BarcodeType;
      is_primary: boolean;
    }>;
  }>;
}

export interface ProductFilterParams {
  search?: string;
  category_id?: number;
  brand_id?: number;
  product_type?: ProductType;
  status?: EntityStatus;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}
