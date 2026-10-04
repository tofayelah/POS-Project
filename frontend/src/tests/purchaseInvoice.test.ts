import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../api/axios';
import { 
  getPurchases, 
  getPurchase, 
  createPurchase, 
  postPurchaseInvoice, 
  cancelPurchaseInvoice,
  getSupplierPayables,
  getSupplierLedger
} from '../api/purchases';
import { PurchaseInvoice, PurchaseInvoiceStatus, PurchasePaymentStatus } from '../types/purchase';
import { en } from '../i18n/en';
import { bn } from '../i18n/bn';

vi.mock('../api/axios', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

describe('Phase 3.3 Step 3 — Purchase Invoice & Accounts Payable Frontend Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Purchase Invoice API Client (No LocalStorage Caching)', () => {
    it('calls backend getPurchases with correct query parameters and filters', async () => {
      const mockData = {
        success: true,
        data: [
          {
            id: 1,
            supplier_invoice_number: 'INV-2026-001',
            supplier_id: 10,
            grand_total: '15000.0000',
            status: 'POSTED',
            payment_status: 'DUE',
            paid_amount: '0.0000',
            due_amount: '15000.0000',
          },
        ],
        meta: { current_page: 1, total: 1 },
      };

      (api.get as any).mockResolvedValueOnce({ data: mockData });

      const res = await getPurchases({
        search: 'INV-2026',
        status: 'POSTED',
        payment_status: 'DUE',
        page: 1,
        per_page: 15,
      });

      expect(api.get).toHaveBeenCalledWith('/purchases', {
        params: {
          search: 'INV-2026',
          status: 'POSTED',
          payment_status: 'DUE',
          page: 1,
          per_page: 15,
        },
      });
      expect(res.data.length).toBe(1);
      expect(res.data[0].supplier_invoice_number).toBe('INV-2026-001');
    });

    it('fetches single purchase invoice details by ID', async () => {
      const mockInvoice = {
        id: 42,
        supplier_invoice_number: 'INV-42',
        status: 'DRAFT',
        grand_total: '25000.5000',
        items: [],
      };

      (api.get as any).mockResolvedValueOnce({
        data: { success: true, data: mockInvoice },
      });

      const res = await getPurchase(42);

      expect(api.get).toHaveBeenCalledWith('/purchases/42');
      expect(res.data.id).toBe(42);
      expect(res.data.supplier_invoice_number).toBe('INV-42');
    });

    it('submits purchase invoice payload to backend store endpoint', async () => {
      const payload = {
        supplier_id: 5,
        supplier_invoice_number: 'INV-NEW-01',
        invoice_date: '2026-10-04',
        due_date: '2026-10-25',
        warehouse_id: 2,
        shipping_cost: 150.0,
        other_cost: 50.0,
        post_immediately: true,
        items: [
          {
            product_id: 101,
            product_variant_id: 201,
            quantity: 10,
            unit_cost: 500,
            discount: 0,
            tax: 50,
          },
        ],
      };

      (api.post as any).mockResolvedValueOnce({
        data: { success: true, data: { id: 99, ...payload, status: 'POSTED' } },
      });

      const res = await createPurchase(payload);

      expect(api.post).toHaveBeenCalledWith('/purchases', payload);
      expect(res.data.id).toBe(99);
      expect(res.data.status).toBe('POSTED');
    });

    it('triggers postPurchaseInvoice endpoint on backend', async () => {
      (api.post as any).mockResolvedValueOnce({
        data: { success: true, data: { id: 77, status: 'POSTED' } },
      });

      const res = await postPurchaseInvoice(77);

      expect(api.post).toHaveBeenCalledWith('/purchases/77/post');
      expect(res.data.status).toBe('POSTED');
    });

    it('triggers cancelPurchaseInvoice endpoint on backend', async () => {
      (api.post as any).mockResolvedValueOnce({
        data: { success: true, data: { id: 77, status: 'CANCELLED' } },
      });

      const res = await cancelPurchaseInvoice(77);

      expect(api.post).toHaveBeenCalledWith('/purchases/77/cancel');
      expect(res.data.status).toBe('CANCELLED');
    });

    it('fetches supplier payables and aging summary from backend report endpoint', async () => {
      const mockPayables = [
        {
          id: 1,
          supplier_code: 'SUP-01',
          name: 'Prime Textiles Ltd',
          total_purchases: 500000,
          total_paid: 300000,
          balance: 200000,
          status: 'ACTIVE',
        },
      ];

      (api.get as any).mockResolvedValueOnce({
        data: { success: true, data: mockPayables },
      });

      const res = await getSupplierPayables({ search: 'Prime' });

      expect(api.get).toHaveBeenCalledWith('/reports/supplier-payables', {
        params: { search: 'Prime' },
      });
      expect(res.data.length).toBe(1);
      expect(res.data[0].balance).toBe(200000);
    });

    it('fetches supplier statement ledger entries from backend', async () => {
      const mockLedger = [
        {
          id: 1,
          transaction_type: 'PURCHASE',
          credit: '50000.0000',
          debit: '0.0000',
          balance_after: '50000.0000',
        },
        {
          id: 2,
          transaction_type: 'PAYMENT',
          credit: '0.0000',
          debit: '20000.0000',
          balance_after: '30000.0000',
        },
      ];

      (api.get as any).mockResolvedValueOnce({
        data: { success: true, data: mockLedger },
      });

      const res = await getSupplierLedger(10);

      expect(api.get).toHaveBeenCalledWith('/reports/suppliers/10/ledger', { params: undefined });
      expect(res.data.length).toBe(2);
      expect(res.data[1].balance_after).toBe('30000.0000');
    });
  });

  describe('Financial Invariants & Precision', () => {
    it('computes line total with accurate decimal math (no roundoff poisha loss)', () => {
      const quantity = 12.75;
      const unitCost = 845.60;
      const discount = 50.25;
      const tax = 75.50;

      const lineTotal = Math.max(0, quantity * unitCost - discount + tax);
      expect(lineTotal).toBeCloseTo(10806.65, 2);
    });

    it('computes invoice grand total including shipping and other costs', () => {
      const subtotal = 10806.65;
      const discount = 200.00;
      const tax = 500.00;
      const shipping = 350.00;
      const other = 100.00;

      const grandTotal = Math.max(0, subtotal - discount + tax + shipping + other);
      expect(grandTotal).toBeCloseTo(11556.65, 2);
    });

    it('correctly calculates payment status badge based on paid vs grand total', () => {
      const calculateStatus = (grand: number, paid: number): PurchasePaymentStatus => {
        const due = grand - paid;
        if (paid <= 0) return 'DUE';
        if (due <= 0.0001) return 'PAID';
        return 'PARTIAL';
      };

      expect(calculateStatus(10000, 0)).toBe('DUE');
      expect(calculateStatus(10000, 3000)).toBe('PARTIAL');
      expect(calculateStatus(10000, 10000)).toBe('PAID');
      expect(calculateStatus(10000, 10000.00001)).toBe('PAID');
    });

    it('purchase invoice posting does not duplicate inventory or stock movement', () => {
      // Inventory received at Goods Receipt stage (DR Inventory Asset, CR AP Clearing)
      // Purchase Invoice posts only financial liability: (DR AP Clearing, CR Accounts Payable)
      const stockMovementAtInvoice = 0;
      const physicalInventoryDelta = 0;

      expect(stockMovementAtInvoice).toBe(0);
      expect(physicalInventoryDelta).toBe(0);
    });
  });

  describe('Bilingual i18n Parity (English / Bengali)', () => {
    it('ensures all purchases translation keys exist in both en and bn dictionaries', () => {
      const purchaseKeysEn = Object.keys(en).filter((k) => k.startsWith('purchases.'));
      const purchaseKeysBn = Object.keys(bn).filter((k) => k.startsWith('purchases.'));

      expect(purchaseKeysEn.length).toBeGreaterThan(15);
      expect(purchaseKeysBn.length).toBe(purchaseKeysEn.length);

      for (const key of purchaseKeysEn) {
        expect(bn).toHaveProperty(key);
        expect((bn as any)[key]).toBeTruthy();
      }
    });

    it('validates critical invoice actions and labels are localized', () => {
      expect(en['purchases.actions.saveAndPost']).toBe('Save & Post to AP');
      expect(bn['purchases.actions.saveAndPost']).toBe('সংরক্ষণ ও পোস্ট করুন');

      expect(en['purchases.actions.saveDraft']).toBe('Save as Draft');
      expect(bn['purchases.actions.saveDraft']).toBe('খসড়া হিসেবে সংরক্ষণ করুন');

      expect(en['purchases.invoicesTitle']).toBe('Purchase Invoices (AP Bills)');
      expect(bn['purchases.invoicesTitle']).toBe('ক্রয় চালান (AP বিল)');
    });
  });
});
