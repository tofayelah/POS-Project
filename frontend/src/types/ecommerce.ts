export interface Shipment {
  id: number | string;
  order_id: number | string;
  tracking_number?: string;
  carrier_name?: string;
  status: string;
  shipped_at?: string;
}

export interface EcommerceOrder {
  id: number | string;
  order_number: string;
  invoice_number?: string;
  sale_date?: string;
  channel?: string;
  customer_name?: string;
  customer_email?: string;
  customer?: { name?: string; email?: string; phone?: string } | any;
  shipping_address_snapshot?: { name?: string; address?: string; city?: string } | any;
  total_amount: number;
  subtotal?: number;
  tax_total?: number;
  shipping_amount?: number;
  discount_total?: number;
  paid_amount?: number;
  due_amount?: number;
  grand_total?: number;
  payment_status?: string;
  fulfillment_status?: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | string;
  delivery_notes?: string;
  created_at?: string;
  items?: any[];
  shipments?: Shipment[] | any[];
}

export interface EcommerceReturn {
  id: number | string;
  return_number: string;
  order_number?: string;
  reason?: string;
  status: 'requested' | 'approved' | 'rejected' | 'processed' | string;
  created_at?: string;
}

export interface EcommerceFulfillment {
  id: number | string;
  order_id: number | string;
  tracking_number?: string;
  courier_name?: string;
  status: string;
}

export interface EcommerceReview {
  id: number | string;
  product_id?: number | string;
  product_name?: string;
  customer_name?: string;
  is_verified_buyer?: boolean;
  title?: string;
  rating: number;
  comment?: string;
  status: 'pending' | 'approved' | 'rejected' | string;
}

export type ProductReview = EcommerceReview;

export interface ShippingConfig {
  id: number | string;
  zone_name: string;
  name?: string;
  code?: string;
  carrier_name?: string;
  base_rate: number;
  estimated_days?: string | number;
  free_shipping_threshold?: number;
  is_active: boolean;
}

export type ShippingMethod = ShippingConfig;

export interface EcommerceStoreSettings {
  id?: number | string;
  store_name: string;
  name?: string;
  code?: string;
  domain?: string;
  support_email?: string;
  currency?: string;
  guest_checkout_enabled?: boolean;
  cod_enabled?: boolean;
  online_payment_enabled?: boolean;
  order_prefix?: string;
  settings?: any;
  is_active?: boolean;
}

export type EcommerceStore = EcommerceStoreSettings;

export interface CatalogProduct {
  id: number | string;
  name: string;
  sku?: string;
  slug?: string;
  category_name?: string;
  price?: number;
  selling_price?: number;
  visibility?: 'POS_ONLY' | 'ECOMMERCE_ONLY' | 'BOTH' | any;
  featured?: boolean;
  new_arrival?: boolean;
  is_published?: boolean;
}

export interface Coupon {
  id: number | string;
  name?: string;
  code: string;
  discount_type: 'percentage' | 'fixed_amount' | string;
  discount_value: number;
  min_order_amount?: number;
  usage_count?: number;
  is_active?: boolean;
}

export interface EcommerceCategory {
  id: number | string;
  name: string;
  slug?: string;
  is_active?: boolean;
}

export interface EcommerceAnalytics {
  total_sales?: number;
  total_orders?: number;
  conversion_rate?: number;
  average_order_value?: number;
  kpis?: any;
  top_products?: any[];
  channel_breakdown?: any[];
}

export interface CartSummary {
  items: any[];
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
}

export interface CustomerAddress {
  id?: number | string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  postal_code?: string;
  is_default?: boolean;
}

export interface CustomerProfile {
  id: number | string;
  name: string;
  email: string;
  phone?: string;
  addresses?: CustomerAddress[];
}
