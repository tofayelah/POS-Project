export type BarcodeType = 'CODE128' | 'EAN13' | 'UPCA' | 'QR' | string;

export interface Barcode {
  id?: number | string;
  product_variant_id?: number | string;
  barcode: string;
  barcode_type?: BarcodeType;
  type?: BarcodeType;
  is_primary?: boolean;
}

export interface AttributeValue {
  id: number | string;
  attribute_id?: number | string;
  value: string;
  code?: string;
}

export interface Attribute {
  id: number | string;
  name: string;
  code?: string;
  values?: AttributeValue[];
}

export interface ProductVariant {
  id: number | string;
  product_id?: number | string;
  product_name?: string;
  variant_name?: string;
  sku: string;
  name?: string;
  price?: number;
  selling_price?: number;
  wholesale_price?: number;
  cost_price?: number;
  mrp?: number;
  status?: string;
  attribute_values?: AttributeValue[] | any[];
  barcodes?: Barcode[] | any[];
}

export interface Unit {
  id?: number | string;
  name?: string;
  short_code?: string;
  symbol?: string;
  decimal_allowed?: boolean;
}

export interface Category {
  id: number | string;
  name: string;
  code?: string;
  parent_id?: number | string;
}

export interface Brand {
  id: number | string;
  name: string;
  code?: string;
}

export interface Product {
  id: number | string;
  name: string;
  sku?: string;
  product_code?: string;
  unit?: Unit | any;
  category_id?: number | string;
  category?: Category | any;
  brand_id?: number | string;
  brand?: Brand | any;
  price?: number;
  status?: string;
  product_type?: string;
  reorder_level?: number;
  tax_rate?: number;
  tax_type?: string;
  created_at?: string;
  updated_at?: string;
  description?: string;
  variants?: ProductVariant[];
}

export interface ProductPayload extends Partial<Product> {}

export interface ProductFilterParams {
  search?: string;
  category_id?: number | string;
  brand_id?: number | string;
  status?: string;
  page?: number;
  per_page?: number;
  all?: boolean;
}
