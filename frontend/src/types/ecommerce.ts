export type FulfillmentStatus = 
  | 'UNFULFILLED'
  | 'ALLOCATED'
  | 'PICKED'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'RETURNED'
  | 'PARTIALLY_RETURNED'
  | 'CANCELLED';

export type PaymentChannel = 'POS' | 'ECOMMERCE' | 'WHOLESALE' | 'B2B';
export type PaymentStatus = 'PAID' | 'PARTIAL' | 'DUE';
export type OnlinePaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export interface StoreSettings {
  theme?: string;
  contact_email?: string;
  support_phone?: string;
  free_shipping_min?: number;
  delivery_notes_placeholder?: string;
  hero_title?: string;
  hero_subtitle?: string;
}

export interface EcommerceStore {
  id: number;
  company_id: number;
  code: string;
  name: string;
  domain?: string | null;
  currency: string;
  default_branch_id?: number | null;
  default_warehouse_id?: number | null;
  is_active: boolean;
  guest_checkout_enabled: boolean;
  cod_enabled: boolean;
  online_payment_enabled: boolean;
  order_prefix: string;
  settings?: StoreSettings | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProductVariantBrief {
  id: number;
  product_id: number;
  sku: string;
  variant_name?: string | null;
  selling_price: number;
  cost_price?: number;
  available_quantity?: number;
}

export interface CatalogProduct {
  id: number;
  name: string;
  slug: string;
  category_id?: number;
  category_name?: string;
  short_description?: string | null;
  description?: string | null;
  selling_price: number;
  is_published: boolean;
  visibility: 'POS_ONLY' | 'ECOMMERCE_ONLY' | 'BOTH';
  featured: boolean;
  new_arrival: boolean;
  best_seller: boolean;
  badge?: string | null;
  sort_order: number;
  images?: string[] | null;
  variants_count?: number;
  variants?: ProductVariantBrief[];
  rating_avg?: number;
  reviews_count?: number;
}

export interface EcommerceCategory {
  id: number;
  company_id: number;
  name: string;
  slug: string;
  parent_id?: number | null;
  icon?: string | null;
  image_url?: string | null;
  sort_order: number;
  is_active: boolean;
  children?: EcommerceCategory[];
  products_count?: number;
}

export interface CartItem {
  id: number;
  cart_id: number;
  product_id: number;
  product_variant_id: number;
  product_name: string;
  variant_name?: string;
  sku: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  image?: string;
}

export interface CartSummary {
  cart_id: number;
  items: CartItem[];
  items_count: number;
  subtotal: number;
  discount_amount: number;
  coupon_code?: string | null;
  shipping_amount: number;
  tax_amount: number;
  grand_total: number;
  free_shipping_eligible?: boolean;
}

export interface CustomerAddress {
  id: number;
  customer_id: number;
  recipient_name: string;
  mobile: string;
  address_line_1: string;
  address_line_2?: string | null;
  city: string;
  district?: string | null;
  postal_code?: string | null;
  is_default_shipping: boolean;
  is_default_billing: boolean;
}

export interface CustomerProfile {
  id: number;
  customer_code: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  store_credit_balance: number;
  points_balance: number;
  addresses?: CustomerAddress[];
}

export interface ShippingMethod {
  id: number;
  company_id: number;
  name: string;
  code: string;
  carrier_name: string;
  estimated_days?: string | null;
  base_rate?: number;
  is_active: boolean;
}

export interface ShippingZone {
  id: number;
  company_id: number;
  name: string;
  districts: string[];
  is_active: boolean;
}

export interface ShippingRate {
  id: number;
  shipping_method_id: number;
  shipping_zone_id: number;
  min_weight: number;
  max_weight: number;
  rate: number;
}

export interface ShipmentItem {
  id: number;
  shipment_id: number;
  sale_item_id: number;
  sku_snapshot: string;
  product_name_snapshot: string;
  quantity: number;
}

export interface Shipment {
  id: number;
  company_id: number;
  sale_id: number;
  shipment_number: string;
  carrier_name: string;
  tracking_number?: string | null;
  status: 'PENDING' | 'PICKED' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'FAILED' | 'CANCELLED';
  shipped_at?: string | null;
  delivered_at?: string | null;
  notes?: string | null;
  items?: ShipmentItem[];
}

export interface OnlinePaymentTransaction {
  id: number;
  company_id: number;
  store_id?: number | null;
  sale_id: number;
  gateway: string;
  transaction_reference: string;
  gateway_trx_id?: string | null;
  amount: number;
  currency: string;
  status: OnlinePaymentStatus;
  created_at?: string;
}

export interface SaleItemDetail {
  id: number;
  sale_id: number;
  product_variant_id: number;
  sku_snapshot: string;
  product_name_snapshot: string;
  variant_description_snapshot?: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  tax: number;
  subtotal: number;
}

export interface EcommerceOrder {
  id: number;
  company_id: number;
  order_number: string;
  invoice_number: string;
  channel: PaymentChannel;
  status: 'DRAFT' | 'HELD' | 'COMPLETED' | 'VOIDED';
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  shipping_amount: number;
  grand_total: number;
  paid_amount: number;
  due_amount: number;
  sale_date: string;
  shipping_method_id?: number | null;
  shipping_method?: ShippingMethod | null;
  shipping_address_snapshot?: Partial<CustomerAddress> | null;
  billing_address_snapshot?: Partial<CustomerAddress> | null;
  tracking_number?: string | null;
  delivery_notes?: string | null;
  customer?: {
    id: number;
    name: string;
    email?: string | null;
    mobile?: string | null;
    customer_code?: string;
  } | null;
  items?: SaleItemDetail[];
  shipments?: Shipment[];
  online_payment_transactions?: OnlinePaymentTransaction[];
  created_at: string;
}

export interface Coupon {
  id: number;
  company_id: number;
  code: string;
  name: string;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount?: number | null;
  starts_at?: string | null;
  expires_at?: string | null;
  usage_limit?: number | null;
  usage_count: number;
  is_active: boolean;
}

export interface ProductReview {
  id: number;
  company_id: number;
  product_id: number;
  product_name?: string;
  customer_id: number;
  customer_name?: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  is_verified_buyer: boolean;
  created_at: string;
}

export interface EcommerceAnalytics {
  kpis: {
    total_ecommerce_sales: number;
    total_orders_count: number;
    delivered_orders_count: number;
    pending_fulfillment_count: number;
    average_order_value: number;
    cod_revenue: number;
    online_payment_revenue: number;
    returns_count: number;
    return_rate_percentage: number;
  };
  channel_breakdown: {
    channel: string;
    order_count: number;
    revenue: number;
  }[];
  top_products: {
    sku: string;
    product_name: string;
    units_sold: number;
    revenue: number;
  }[];
  recent_orders: EcommerceOrder[];
}
