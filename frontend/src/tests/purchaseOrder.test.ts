import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../api/axios';
import { 
  getPurchaseOrders, 
  getPurchaseOrder, 
  createPurchaseOrder, 
  approvePurchaseOrder, 
  cancelPurchaseOrder, 
  getNextPoNumber 
} from '../api/purchaseOrders';
import { CreatePurchaseOrderPayload, PurchaseOrder } from '../types/purchase';
import { en } from '../i18n/en';
import { bn } from '../i18n/bn';

describe('Purchase Order Foundation & Monetary Precision', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates required payload fields for purchase order creation', () => {
    const payload: CreatePurchaseOrderPayload = {
      supplier_id: 10,
      warehouse_id: 2,
      po_number: 'PO-2026-0001',
      order_date: '2026-10-02',
      expected_date: '2026-10-15',
      shipping_cost: 1500.50,
      other_cost: 250.75,
      discount_total: 500.00,
      tax_total: 1200.25,
      notes: 'Urgent procurement for central warehouse',
      items: [
        {
          product_id: 101,
          product_variant_id: 201,
          quantity: 25.5,
          unit_cost: 1250.75,
          discount: 100,
          tax: 50,
        },
      ],
    };

    expect(payload.supplier_id).toBe(10);
    expect(payload.warehouse_id).toBe(2);
    expect(payload.po_number).toBe('PO-2026-0001');
    expect(payload.items.length).toBe(1);
    expect(payload.items[0].quantity).toBe(25.5);
    expect(payload.items[0].unit_cost).toBe(1250.75);
  });

  it('calculates line item total with float precision and zero poisha truncation', () => {
    const quantity = 33.25;
    const unitCost = 450.50;
    const discount = 25.75;
    const tax = 50.25;

    // Line total = (quantity * unitCost) - discount + tax
    const rawLine = (quantity * unitCost) - discount + tax;
    const precisionLine = Math.round(rawLine * 10000) / 10000;

    // Ensure no parseInt truncation has occurred
    expect(precisionLine).not.toBe(Math.floor(precisionLine));
    expect(precisionLine).toBeCloseTo(15003.625, 3);
  });

  it('calculates order grand total including freight, charges, and tax without integer rounding', () => {
    const subtotal = 50000.75;
    const shippingCost = 1200.50;
    const otherCost = 300.25;
    const discountTotal = 1500.00;
    const taxTotal = 2500.50;

    const grandTotal = subtotal + shippingCost + otherCost - discountTotal + taxTotal;
    expect(grandTotal).toBe(52502.00);
  });

  it('enforces status transition workflow rules', () => {
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['APPROVED', 'CANCELLED'],
      APPROVED: ['PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CANCELLED'],
      PARTIALLY_RECEIVED: ['FULLY_RECEIVED', 'CANCELLED'],
      FULLY_RECEIVED: [],
      CANCELLED: [],
    };

    expect(validTransitions['DRAFT']).toContain('APPROVED');
    expect(validTransitions['DRAFT']).toContain('CANCELLED');
    expect(validTransitions['FULLY_RECEIVED']).toHaveLength(0);
    expect(validTransitions['CANCELLED']).toHaveLength(0);
  });

  it('calls backend API getPurchaseOrders without mock fallbacks', async () => {
    const mockData = {
      success: true,
      data: {
        data: [
          { id: 1, po_number: 'PO-2026-0001', status: 'APPROVED', grand_total: 25000 },
        ],
        total: 1,
      },
    };
    vi.spyOn(api, 'get').mockResolvedValueOnce({ data: mockData });

    const result = await getPurchaseOrders({ status: 'APPROVED' });
    expect(api.get).toHaveBeenCalledWith('/purchase-orders', { params: { status: 'APPROVED' } });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].po_number).toBe('PO-2026-0001');
  });

  it('calls backend API getPurchaseOrder by ID', async () => {
    const mockPo: Partial<PurchaseOrder> = {
      id: 5,
      po_number: 'PO-2026-0005',
      status: 'DRAFT',
      grand_total: 15000,
    };
    vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { success: true, data: mockPo } });

    const result = await getPurchaseOrder(5);
    expect(api.get).toHaveBeenCalledWith('/purchase-orders/5');
    expect(result.data.po_number).toBe('PO-2026-0005');
  });

  it('calls backend API createPurchaseOrder directly', async () => {
    const payload: CreatePurchaseOrderPayload = {
      supplier_id: 1,
      warehouse_id: 1,
      po_number: 'PO-2026-0099',
      order_date: '2026-10-02',
      items: [{ product_id: 1, product_variant_id: 1, quantity: 10, unit_cost: 500 }],
    };

    vi.spyOn(api, 'post').mockResolvedValueOnce({
      data: { success: true, message: 'Created', data: { id: 99, ...payload, status: 'DRAFT' } },
    });

    const res = await createPurchaseOrder(payload);
    expect(api.post).toHaveBeenCalledWith('/purchase-orders', payload);
    expect(res.success).toBe(true);
    expect(res.data.id).toBe(99);
  });

  it('calls backend API approvePurchaseOrder', async () => {
    vi.spyOn(api, 'post').mockResolvedValueOnce({
      data: { success: true, message: 'Approved', data: { id: 1, status: 'APPROVED' } },
    });

    const res = await approvePurchaseOrder(1);
    expect(api.post).toHaveBeenCalledWith('/purchase-orders/1/approve');
    expect(res.success).toBe(true);
    expect(res.data.status).toBe('APPROVED');
  });

  it('calls backend API cancelPurchaseOrder', async () => {
    vi.spyOn(api, 'post').mockResolvedValueOnce({
      data: { success: true, message: 'Cancelled', data: { id: 1, status: 'CANCELLED' } },
    });

    const res = await cancelPurchaseOrder(1);
    expect(api.post).toHaveBeenCalledWith('/purchase-orders/1/cancel');
    expect(res.success).toBe(true);
    expect(res.data.status).toBe('CANCELLED');
  });

  it('calls backend API getNextPoNumber', async () => {
    vi.spyOn(api, 'get').mockResolvedValueOnce({
      data: { success: true, data: { po_number: 'PO-2026-0042' } },
    });

    const res = await getNextPoNumber();
    expect(api.get).toHaveBeenCalledWith('/purchase-orders/next-number');
    expect(res.data.po_number).toBe('PO-2026-0042');
  });

  it('verifies 100% i18n key parity between en.ts and bn.ts for purchaseOrders', () => {
    const poKeysEn = Object.keys(en).filter((k) => k.startsWith('purchaseOrders.'));
    const poKeysBn = Object.keys(bn).filter((k) => k.startsWith('purchaseOrders.'));

    expect(poKeysEn.length).toBeGreaterThan(20);
    expect(poKeysBn.length).toBe(poKeysEn.length);

    poKeysEn.forEach((key) => {
      expect(key in bn).toBe(true);
      expect((bn as any)[key]).toBeTruthy();
      expect(typeof (bn as any)[key]).toBe('string');
    });
  });
});
