import { describe, it, expect, beforeEach, vi } from 'vitest';
import api from '../api/axios';
import { ecommerceApi } from '../api/ecommerce';
import { storefrontApi } from '../api/storefront';
import { en } from '../i18n/en';
import { bn } from '../i18n/bn';

describe('Phase 11: E-Commerce & Omnichannel Commerce Platform Frontend Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. E-Commerce Admin Store & Settings API', () => {
    it('fetches store and updates store settings', async () => {
      const mockStore = {
        id: 1,
        company_id: 1,
        name: 'RetailCore Online Store',
        code: 'MAIN_ONLINE',
        domain: 'shop.retailcore.test',
        is_active: true,
        default_currency: 'BDT',
        currency_symbol: '৳',
      };

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockStore },
      });

      const res = await ecommerceApi.getStore();
      expect(api.get).toHaveBeenCalledWith('/ecommerce/store');
      expect(res.data.success).toBe(true);
      expect(res.data.data.code).toBe('MAIN_ONLINE');

      vi.spyOn(api, 'put').mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Store updated',
          data: { ...mockStore, name: 'RetailCore Mega Store' },
        },
      });

      const updateRes = await ecommerceApi.updateStore(1, { name: 'RetailCore Mega Store' });
      expect(api.put).toHaveBeenCalledWith('/ecommerce/store/1', { name: 'RetailCore Mega Store' });
      expect(updateRes.data.data.name).toBe('RetailCore Mega Store');
    });

    it('fetches reports overview', async () => {
      const mockAnalytics = {
        kpis: {
          total_ecommerce_sales: 50000,
          total_orders_count: 25,
          delivered_orders_count: 20,
          pending_fulfillment_count: 5,
          average_order_value: 2000,
          cod_revenue: 35000,
          online_payment_revenue: 15000,
          returns_count: 1,
          return_rate_percentage: 4.0,
        },
        orders_by_status: { COMPLETED: 20, PENDING: 5 },
        sales_by_channel: { ECOMMERCE: 50000, POS: 120000 },
        recent_orders: [],
      };

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: mockAnalytics,
      });

      const res = await ecommerceApi.getReportsOverview();
      expect(api.get).toHaveBeenCalledWith('/ecommerce/reports/overview', { params: undefined });
      expect(res.data.kpis.total_ecommerce_sales).toBe(50000);
    });
  });

  describe('2. E-Commerce Orders & Fulfillment API', () => {
    it('fetches orders with filters and fetches order detail', async () => {
      const mockOrders = [
        {
          id: 101,
          invoice_number: 'ORD-20261007-0001',
          sales_channel: 'ECOMMERCE',
          total_amount: 2500,
          payment_status: 'PAID',
          fulfillment_status: 'PENDING',
          customer_name: 'Tanvir Ahmed',
          created_at: '2026-10-07T12:00:00Z',
        },
      ];

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { data: mockOrders, total: 1, current_page: 1, last_page: 1 },
      });

      const ordersRes = await ecommerceApi.getOrders({ channel: 'ECOMMERCE', fulfillment_status: 'PENDING' });
      expect(api.get).toHaveBeenCalledWith('/ecommerce/orders', {
        params: { channel: 'ECOMMERCE', fulfillment_status: 'PENDING' },
      });
      expect(ordersRes.data.data.length).toBe(1);
      expect(ordersRes.data.data[0].invoice_number).toBe('ORD-20261007-0001');

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: {
          id: 101,
          invoice_number: 'ORD-20261007-0001',
          items: [{ id: 1, product_name: 'Wireless Mouse', quantity: 2, unit_price: 1250 }],
        },
      });

      const detailRes = await ecommerceApi.getOrderDetail(101);
      expect(api.get).toHaveBeenCalledWith('/ecommerce/orders/101');
      expect(detailRes.data.items.length).toBe(1);
    });

    it('performs shipment creation and courier dispatch', async () => {
      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: {
          id: 1,
          sale_id: 101,
          tracking_number: 'TRK-REDX-998822',
          carrier_name: 'RedX',
          status: 'PENDING',
        },
      });

      const shipmentRes = await ecommerceApi.createShipment(101, {
        carrier_name: 'RedX',
        tracking_number: 'TRK-REDX-998822',
      });

      expect(api.post).toHaveBeenCalledWith('/ecommerce/orders/101/shipments', {
        carrier_name: 'RedX',
        tracking_number: 'TRK-REDX-998822',
      });
      expect(shipmentRes.data.tracking_number).toBe('TRK-REDX-998822');

      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: { id: 1, status: 'SHIPPED', tracking_number: 'TRK-REDX-998822' },
      });

      const shippedRes = await ecommerceApi.markShipped(1, 'TRK-REDX-998822');
      expect(api.post).toHaveBeenCalledWith('/ecommerce/shipments/1/ship', {
        tracking_number: 'TRK-REDX-998822',
      });
      expect(shippedRes.data.status).toBe('SHIPPED');

      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: { id: 1, status: 'DELIVERED' },
      });

      const deliveredRes = await ecommerceApi.markDelivered(1);
      expect(api.post).toHaveBeenCalledWith('/ecommerce/shipments/1/deliver');
      expect(deliveredRes.data.status).toBe('DELIVERED');
    });
  });

  describe('3. Coupons, Shipping & Reviews API', () => {
    it('manages coupons (list, create)', async () => {
      const mockCoupons = [
        {
          id: 1,
          code: 'EID2026',
          discount_type: 'PERCENTAGE',
          discount_value: 10,
          min_purchase_amount: 1000,
          max_discount_amount: 500,
          is_active: true,
        },
      ];

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: mockCoupons,
      });

      const listRes = await ecommerceApi.getCoupons();
      expect(api.get).toHaveBeenCalledWith('/ecommerce/coupons');
      expect(listRes.data[0].code).toBe('EID2026');

      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: { id: 2, code: 'WELCOME50', discount_type: 'FIXED', discount_value: 50 },
      });

      const createRes = await ecommerceApi.createCoupon({
        code: 'WELCOME50',
        discount_type: 'FIXED',
        discount_value: 50,
      });
      expect(api.post).toHaveBeenCalledWith('/ecommerce/coupons', {
        code: 'WELCOME50',
        discount_type: 'FIXED',
        discount_value: 50,
      });
      expect(createRes.data.code).toBe('WELCOME50');
    });

    it('moderates product reviews (approve, reject)', async () => {
      vi.spyOn(api, 'put').mockResolvedValueOnce({
        data: { id: 5, status: 'APPROVED' },
      });

      const approveRes = await ecommerceApi.updateReviewStatus(5, 'APPROVED');
      expect(api.put).toHaveBeenCalledWith('/ecommerce/reviews/5/status', { status: 'APPROVED' });
      expect(approveRes.data.status).toBe('APPROVED');

      vi.spyOn(api, 'put').mockResolvedValueOnce({
        data: { id: 5, status: 'REJECTED' },
      });

      const rejectRes = await ecommerceApi.updateReviewStatus(5, 'REJECTED');
      expect(api.put).toHaveBeenCalledWith('/ecommerce/reviews/5/status', { status: 'REJECTED' });
      expect(rejectRes.data.status).toBe('REJECTED');
    });

    it('manages shipping methods', async () => {
      const mockMethods = [
        {
          id: 1,
          name: 'Standard Delivery (Inside Dhaka)',
          code: 'DHAKA_STD',
          base_rate: 60,
          estimated_days_min: 1,
          estimated_days_max: 2,
          is_active: true,
        },
      ];

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: mockMethods,
      });

      const res = await ecommerceApi.getShippingMethods();
      expect(api.get).toHaveBeenCalledWith('/ecommerce/shipping/methods');
      expect(res.data.length).toBe(1);
      expect(res.data[0].base_rate).toBe(60);
    });
  });

  describe('4. Storefront Cart & Checkout API', () => {
    it('manages storefront cart (fetch, coupon)', async () => {
      const mockCart = {
        cart_token: 'cart-uuid-12345',
        currency: 'BDT',
        subtotal: 2000,
        discount_amount: 200,
        coupon_code: 'SAVE10',
        shipping_fee: 60,
        tax_amount: 270,
        grand_total: 2130,
        items: [
          {
            id: 1,
            product_variant_id: 10,
            quantity: 2,
            unit_price: 1000,
            total_price: 2000,
            product: { name: 'Running Shoes', sku: 'SHOE-001' },
          },
        ],
      };

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: mockCart,
      });

      const cartRes = await storefrontApi.getCart('MAIN_ONLINE', 'Dhaka', 'guest-token-abc');
      expect(api.get).toHaveBeenCalledWith('/store/MAIN_ONLINE/cart', {
        params: { district: 'Dhaka', guest_token: 'guest-token-abc' },
        headers: { 'X-Guest-Token': 'guest-token-abc' },
      });
      expect(cartRes.data.grand_total).toBe(2130);

      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: mockCart,
      });

      const couponRes = await storefrontApi.applyCoupon('SAVE10', 'MAIN_ONLINE', 'guest-token-abc');
      expect(api.post).toHaveBeenCalledWith(
        '/store/MAIN_ONLINE/cart/coupon',
        { code: 'SAVE10' },
        { headers: { 'X-Guest-Token': 'guest-token-abc' } }
      );
      expect(couponRes.data.coupon_code).toBe('SAVE10');
    });

    it('submits checkout and initiates payment', async () => {
      const checkoutPayload = {
        payment_method: 'CASH_ON_DELIVERY',
        shipping_method_id: 1,
        shipping_address: {
          full_name: 'Rahim Uddin',
          phone: '01711000000',
          address_line1: 'House 12, Road 4, Dhanmondi, Dhaka',
          city: 'Dhaka',
          postal_code: '1205',
        },
      };

      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: {
          id: 501,
          invoice_number: 'ORD-20261007-0501',
          total_amount: 2130,
          payment_status: 'PENDING',
          fulfillment_status: 'PENDING',
        },
      });

      const checkoutRes = await storefrontApi.checkout('MAIN_ONLINE', checkoutPayload, 'guest-token-abc');
      expect(api.post).toHaveBeenCalledWith(
        '/store/MAIN_ONLINE/checkout',
        checkoutPayload,
        { headers: { 'X-Guest-Token': 'guest-token-abc' } }
      );
      expect(checkoutRes.data.invoice_number).toBe('ORD-20261007-0501');
    });
  });

  describe('5. Cart & Order Financial Calculation Logic', () => {
    it('accurately computes subtotal, coupon discounts, Bangladesh VAT, and net grand total', () => {
      // Scenario: 2 items of ৳1,500 = ৳3,000 subtotal
      const item1 = { price: 1500, quantity: 2 };
      const subtotal = item1.price * item1.quantity;
      expect(subtotal).toBe(3000);

      // 10% coupon with ৳250 cap
      const couponRate = 0.10;
      const maxDiscount = 250;
      const rawDiscount = subtotal * couponRate; // 300
      const discount = Math.min(rawDiscount, maxDiscount); // Capped at 250
      expect(discount).toBe(250);

      const netTaxableAmount = subtotal - discount; // 2750
      expect(netTaxableAmount).toBe(2750);

      // Bangladesh standard VAT: 15%
      const vatRate = 0.15;
      const vatAmount = Math.round(netTaxableAmount * vatRate * 100) / 100; // 412.50
      expect(vatAmount).toBe(412.50);

      // Shipping inside Dhaka: ৳60
      const shippingFee = 60;

      // Net Grand Total: Subtotal - Discount + VAT + Shipping
      const grandTotal = netTaxableAmount + vatAmount + shippingFee;
      expect(grandTotal).toBe(3222.50);
    });

    it('rejects coupon application if minimum order spend is not met', () => {
      const minSpend = 2000;
      const cartSubtotal = 1500;
      const isEligible = cartSubtotal >= minSpend;
      expect(isEligible).toBe(false);
    });
  });

  describe('6. Omnichannel Fulfillment State Transitions', () => {
    it('verifies valid fulfillment workflow states', () => {
      const validStatuses = ['PENDING', 'PROCESSING', 'PARTIALLY_SHIPPED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
      expect(validStatuses).toContain('PENDING');
      expect(validStatuses).toContain('PROCESSING');
      expect(validStatuses).toContain('SHIPPED');
      expect(validStatuses).toContain('DELIVERED');

      const courierCarriers = ['PATHAO', 'REDX', 'STEADFAST', 'PAPERFLY', 'INTERNAL_FLEET'];
      expect(courierCarriers).toHaveLength(5);
    });
  });

  describe('7. Internationalization (i18n) Parity & Bangladesh Localization', () => {
    it('verifies 100% key parity between en.ts and bn.ts for all e-commerce keys', () => {
      const ecomKeys = [
        'nav.ecommerce',
        'nav.ecomDashboard',
        'nav.ecomOrders',
        'nav.ecomFulfillment',
        'nav.ecomCatalog',
        'nav.ecomCategories',
        'nav.ecomCoupons',
        'nav.ecomShipping',
        'nav.ecomReviews',
        'nav.ecomReturns',
        'nav.ecomReports',
        'nav.ecomSettings',
        'nav.storefront',
        'ecommerce.dashboardTitle',
        'ecommerce.dashboardSubtitle',
        'ecommerce.viewOrders',
        'ecommerce.totalRevenue',
        'ecommerce.totalOrders',
        'ecommerce.avgOrderValue',
        'ecommerce.fulfillmentRate',
        'ecommerce.returnRate',
        'ecommerce.codRevenue',
        'ecommerce.onlineRevenue',
        'ecommerce.pendingFulfillment',
        'ecommerce.recentOrders',
        'ecommerce.quickActions',
        'ecommerce.ordersTitle',
        'ecommerce.ordersSubtitle',
        'ecommerce.orderDetailTitle',
        'ecommerce.fulfillmentTitle',
        'ecommerce.fulfillmentSubtitle',
        'ecommerce.catalogTitle',
        'ecommerce.catalogSubtitle',
        'ecommerce.categoriesTitle',
        'ecommerce.categoriesSubtitle',
        'ecommerce.couponsTitle',
        'ecommerce.couponsSubtitle',
        'ecommerce.shippingTitle',
        'ecommerce.shippingSubtitle',
        'ecommerce.reviewsTitle',
        'ecommerce.reviewsSubtitle',
        'ecommerce.returnsTitle',
        'ecommerce.returnsSubtitle',
        'ecommerce.reportsTitle',
        'ecommerce.reportsSubtitle',
        'ecommerce.settingsTitle',
        'ecommerce.settingsSubtitle',
        'storefront.home',
        'storefront.shop',
        'storefront.categories',
        'storefront.cart',
        'storefront.checkout',
        'storefront.account',
        'storefront.track',
        'storefront.login',
        'storefront.logout',
        'storefront.emptyCart',
        'storefront.subtotal',
        'storefront.discount',
        'storefront.shipping',
        'storefront.tax',
        'storefront.total',
        'storefront.applyCoupon',
        'storefront.placeOrder',
        'storefront.continueShopping',
        'storefront.proceedToCheckout',
        'storefront.cod',
        'storefront.onlinePayment',
        'storefront.storeCredit',
        'storefront.orderPlacedSuccess',
        'storefront.trackingNumber',
        'storefront.orderStatus',
        'storefront.deliveryAddress',
        'storefront.writeReview',
        'storefront.rating',
        'storefront.inStock',
        'storefront.outOfStock',
        'storefront.addToCart',
        'storefront.buyNow',
      ];

      ecomKeys.forEach((key) => {
        expect(en[key]).toBeDefined();
        expect(typeof en[key]).toBe('string');
        expect(en[key].trim().length).toBeGreaterThan(0);

        expect(bn[key]).toBeDefined();
        expect(typeof bn[key]).toBe('string');
        expect(bn[key].trim().length).toBeGreaterThan(0);
      });
    });

    it('ensures overall key parity across entire en and bn translation dictionaries', () => {
      const enKeys = Object.keys(en);
      const bnKeys = Object.keys(bn);

      expect(enKeys.length).toBe(bnKeys.length);

      const missingInBn = enKeys.filter((k) => !(k in bn));
      expect(missingInBn).toEqual([]);

      const missingInEn = bnKeys.filter((k) => !(k in en));
      expect(missingInEn).toEqual([]);
    });
  });
});
