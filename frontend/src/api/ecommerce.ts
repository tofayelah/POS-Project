import api from './axios';
import {
  EcommerceStore,
  EcommerceOrder,
  CatalogProduct,
  EcommerceCategory,
  Coupon,
  ShippingMethod,
  ProductReview,
  EcommerceAnalytics,
  Shipment,
} from '../types/ecommerce';

export const ecommerceApi = {
  // Store Settings
  getStore: () => api.get<EcommerceStore>('/ecommerce/store'),
  updateStore: (id: number, data: Partial<EcommerceStore>) => api.put<EcommerceStore>(`/ecommerce/store/${id}`, data),

  // Orders
  getOrders: (params?: {
    search?: string;
    channel?: string;
    fulfillment_status?: string;
    payment_status?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    per_page?: number;
  }) => api.get<{ data: EcommerceOrder[]; current_page: number; last_page: number; total: number }>('/ecommerce/orders', { params }),
  getOrderDetail: (id: number) => api.get<EcommerceOrder>(`/ecommerce/orders/${id}`),
  cancelOrder: (id: number, reason: string) => api.post<EcommerceOrder>(`/ecommerce/orders/${id}/cancel`, { reason }),

  // Fulfillment & Shipments
  createShipment: (orderId: number, data: { carrier_name?: string; tracking_number?: string; notes?: string }) =>
    api.post<Shipment>(`/ecommerce/orders/${orderId}/shipments`, data),
  markShipped: (shipmentId: number, trackingNumber?: string) =>
    api.post<Shipment>(`/ecommerce/shipments/${shipmentId}/ship`, { tracking_number: trackingNumber }),
  markDelivered: (shipmentId: number) =>
    api.post<Shipment>(`/ecommerce/shipments/${shipmentId}/deliver`),

  // Catalog Publishing
  getCatalog: (params?: { search?: string; category_id?: number; is_published?: boolean; page?: number }) =>
    api.get<{ data: CatalogProduct[]; current_page: number; last_page: number; total: number }>('/ecommerce/catalog', { params }),
  updateCatalogPublishing: (
    productId: number,
    data: {
      is_published: boolean;
      visibility?: 'POS_ONLY' | 'ECOMMERCE_ONLY' | 'BOTH';
      featured?: boolean;
      new_arrival?: boolean;
      best_seller?: boolean;
      badge?: string | null;
      sort_order?: number;
      short_description?: string;
      images?: string[];
    }
  ) => api.put<CatalogProduct>(`/ecommerce/catalog/${productId}/publish`, data),

  // Categories
  getCategories: () => api.get<EcommerceCategory[]>('/ecommerce/categories'),
  createCategory: (data: Partial<EcommerceCategory>) => api.post<EcommerceCategory>('/ecommerce/categories', data),

  // Coupons
  getCoupons: () => api.get<Coupon[]>('/ecommerce/coupons'),
  createCoupon: (data: Partial<Coupon>) => api.post<Coupon>('/ecommerce/coupons', data),

  // Shipping
  getShippingMethods: () => api.get<ShippingMethod[]>('/ecommerce/shipping/methods'),
  createShippingMethod: (data: Partial<ShippingMethod>) => api.post<ShippingMethod>('/ecommerce/shipping/methods', data),

  // Reviews Moderation
  getReviews: (params?: { status?: string; product_id?: number }) =>
    api.get<{ data: ProductReview[]; current_page: number; last_page: number; total: number }>('/ecommerce/reviews', { params }),
  updateReviewStatus: (reviewId: number, status: 'APPROVED' | 'REJECTED') =>
    api.put<ProductReview>(`/ecommerce/reviews/${reviewId}/status`, { status }),

  // Reports
  getReportsOverview: (params?: { date_from?: string; date_to?: string }) =>
    api.get<EcommerceAnalytics>('/ecommerce/reports/overview', { params }),
};
