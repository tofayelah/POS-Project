export interface ProductVariant {
  id: number | string;
  product_id?: number | string;
  product_name?: string;
  sku: string;
  name?: string;
  price?: number;
  cost_price?: number;
}

export interface Product {
  id: number | string;
  name: string;
  sku?: string;
  category_id?: number | string;
  brand_id?: number | string;
  price?: number;
  variants?: ProductVariant[];
}
