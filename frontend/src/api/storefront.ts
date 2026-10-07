import api from './axios';
import {
  EcommerceStore,
  CatalogProduct,
  EcommerceCategory,
  ShippingMethod,
  CartSummary,
  EcommerceOrder,
  CustomerProfile,
  CustomerAddress,
  ProductReview,
} from '../types/ecommerce';

export const storefrontApi = {
  // Store info & catalog
  getStoreInfo: (storeCode: string | number = 'MAIN') =>
    api.get<EcommerceStore>(`/store/${storeCode}/info`),
  getProducts: (
    storeCode: string | number = 'MAIN',
    params?: {
      category_id?: number;
      search?: string;
      featured?: boolean;
      new_arrival?: boolean;
      best_seller?: boolean;
      sort_by?: string;
      direction?: string;
      per_page?: number;
      page?: number;
    }
  ) => api.get<{ data: CatalogProduct[]; total: number; current_page: number; last_page: number }>(`/store/${storeCode}/products`, { params }),
  getProductDetail: (slug: string, storeCode: string | number = 'MAIN') =>
    api.get<CatalogProduct>(`/store/${storeCode}/products/${slug}`),
  getCategories: (storeCode: string | number = 'MAIN') =>
    api.get<EcommerceCategory[]>(`/store/${storeCode}/categories`),
  getShippingMethods: (storeCode: string | number = 'MAIN') =>
    api.get<ShippingMethod[]>(`/store/${storeCode}/shipping-methods`),

  // Cart operations
  getCart: (storeCode: string | number = 'MAIN', district?: string, guestToken?: string) =>
    api.get<CartSummary>(`/store/${storeCode}/cart`, {
      params: { district, guest_token: guestToken },
      headers: guestToken ? { 'X-Guest-Token': guestToken } : undefined,
    }),
  addToCart: (
    storeCode: string | number = 'MAIN',
    item: { product_variant_id: number; quantity: number },
    guestToken?: string
  ) =>
    api.post<CartSummary>(`/store/${storeCode}/cart/items`, item, {
      headers: guestToken ? { 'X-Guest-Token': guestToken } : undefined,
    }),
  updateCartItem: (
    itemId: number,
    quantity: number,
    storeCode: string | number = 'MAIN',
    guestToken?: string
  ) =>
    api.put<CartSummary>(`/store/${storeCode}/cart/items/${itemId}`, { quantity }, {
      headers: guestToken ? { 'X-Guest-Token': guestToken } : undefined,
    }),
  removeCartItem: (
    itemId: number,
    storeCode: string | number = 'MAIN',
    guestToken?: string
  ) =>
    api.delete<CartSummary>(`/store/${storeCode}/cart/items/${itemId}`, {
      headers: guestToken ? { 'X-Guest-Token': guestToken } : undefined,
    }),
  clearCart: (storeCode: string | number = 'MAIN', guestToken?: string) =>
    api.delete<{ success: boolean; message: string }>(`/store/${storeCode}/cart`, {
      headers: guestToken ? { 'X-Guest-Token': guestToken } : undefined,
    }),
  applyCoupon: (code: string, storeCode: string | number = 'MAIN', guestToken?: string) =>
    api.post<CartSummary>(`/store/${storeCode}/cart/coupon`, { code }, {
      headers: guestToken ? { 'X-Guest-Token': guestToken } : undefined,
    }),
  removeCoupon: (storeCode: string | number = 'MAIN', guestToken?: string) =>
    api.delete<CartSummary>(`/store/${storeCode}/cart/coupon`, {
      headers: guestToken ? { 'X-Guest-Token': guestToken } : undefined,
    }),

  // Checkout
  checkout: (
    storeCode: string | number = 'MAIN',
    data: {
      payment_method: string;
      shipping_method_id?: number;
      shipping_address: Partial<CustomerAddress>;
      billing_address?: Partial<CustomerAddress>;
      delivery_notes?: string;
      customer_id?: number;
      items?: { product_variant_id: number; quantity: number }[];
      coupon_code?: string;
    },
    guestToken?: string
  ) =>
    api.post<EcommerceOrder>(`/store/${storeCode}/checkout`, data, {
      headers: guestToken ? { 'X-Guest-Token': guestToken } : undefined,
    }),
  trackOrder: (orderNumber: string, storeCode: string | number = 'MAIN') =>
    api.get<EcommerceOrder>(`/store/${storeCode}/orders/${orderNumber}/track`),

  // Customer Authentication & Portal
  registerCustomer: (data: { name: string; email?: string; mobile?: string; password: string }) =>
    api.post<{ token: string; customer: CustomerProfile; user: { id: number; name: string; email: string } }>('/customer/register', data),
  loginCustomer: (data: { identifier: string; password: string }) =>
    api.post<{ token: string; customer: CustomerProfile; user: { id: number; name: string; email: string } }>('/customer/login', data),
  getProfile: () => api.get<CustomerProfile>('/customer/profile'),
  getAddresses: () => api.get<CustomerAddress[]>('/customer/addresses'),
  saveAddress: (data: Partial<CustomerAddress>) => api.post<CustomerAddress>('/customer/addresses', data),
  deleteAddress: (id: number) => api.delete<{ message: string }>(`/customer/addresses/${id}`),
  getCustomerOrders: () => api.get<{ data: EcommerceOrder[]; total: number; current_page: number }>('/customer/orders'),
  getCustomerOrderDetail: (id: number) => api.get<EcommerceOrder>(`/customer/orders/${id}`),
  toggleWishlist: (productId: number, productVariantId?: number) =>
    api.post<{ action: 'added' | 'removed'; message: string }>('/customer/wishlist/toggle', { product_id: productId, product_variant_id: productVariantId }),
  submitReview: (data: { product_id: number; rating: number; title?: string; comment?: string }) =>
    api.post<ProductReview>('/customer/reviews', data),
  submitReturnRequest: (data: {
    sale_id: number;
    items: { sale_item_id: number; quantity: number; condition?: string; reason?: string }[];
    return_type?: string;
    reason?: string;
  }) => api.post<any>('/customer/returns', data),
};
