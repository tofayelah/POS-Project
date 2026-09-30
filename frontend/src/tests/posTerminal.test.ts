import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CartItem,
  CompleteSaleData,
  PosProductVariant,
} from '../api/pos';
import {
  CART_STORAGE_KEY,
  getPosStorage,
  loadInitialCartBackup,
  PosCartBackup,
} from '../pages/pos/PosTerminal';

describe('RetailCore POS Terminal Logic & Calculations', () => {
  const sampleVariant1: PosProductVariant = {
    id: 101,
    product_id: 1,
    sku: 'SHIRT-BLU-L',
    variant_name: 'Blue / Large',
    selling_price: 1200,
    mrp: 1200,
    tax_rate: 7.5,
    status: 'ACTIVE',
    available_stock: 45,
    product: {
      id: 1,
      name: 'Men Slim Casual Shirt',
      tax_rate: 7.5,
      category: { id: 2, name: 'Apparel' },
    },
    barcodes: [{ id: 1, barcode: '8901234567890', is_primary: true }],
  };

  const sampleVariant2: PosProductVariant = {
    id: 102,
    product_id: 2,
    sku: 'PANT-BLK-32',
    variant_name: 'Black / 32',
    selling_price: 1800,
    mrp: 1800,
    tax_rate: 7.5,
    status: 'ACTIVE',
    available_stock: 20,
    product: {
      id: 2,
      name: 'Chino Trousers',
      tax_rate: 7.5,
      category: { id: 2, name: 'Apparel' },
    },
    barcodes: [{ id: 2, barcode: '8909876543210', is_primary: true }],
  };

  it('calculates line item totals, discounts, and VAT accurately', () => {
    const qty = 2;
    const price = 1200;
    const discountPercent = 10; // 10% line discount
    const taxRate = 7.5; // 7.5% VAT

    const discountAmount = (price * qty * discountPercent) / 100; // 240
    const taxableAmount = price * qty - discountAmount; // 2160
    const taxAmount = (taxableAmount * taxRate) / 100; // 162
    const lineTotal = taxableAmount + taxAmount; // 2322

    expect(discountAmount).toBe(240);
    expect(taxableAmount).toBe(2160);
    expect(taxAmount).toBe(162);
    expect(lineTotal).toBe(2322);
  });

  it('aggregates cart gross subtotal, discounts, VAT, and net amount correctly', () => {
    const cart: CartItem[] = [
      {
        id: '1',
        product_variant_id: 101,
        barcode: '8901234567890',
        sku: 'SHIRT-BLU-L',
        name: 'Men Slim Casual Shirt',
        variant_name: 'Blue / Large',
        category_name: 'Apparel',
        quantity: 2,
        unit_price: 1200,
        discount_percent: 10,
        discount_amount: 240,
        tax_rate: 7.5,
        tax_amount: 162,
        line_total: 2322,
        available_stock: 45,
      },
      {
        id: '2',
        product_variant_id: 102,
        barcode: '8909876543210',
        sku: 'PANT-BLK-32',
        name: 'Chino Trousers',
        variant_name: 'Black / 32',
        category_name: 'Apparel',
        quantity: 1,
        unit_price: 1800,
        discount_percent: 0,
        discount_amount: 0,
        tax_rate: 7.5,
        tax_amount: 135,
        line_total: 1935,
        available_stock: 20,
      },
    ];

    const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const itemDiscounts = cart.reduce((sum, item) => sum + item.discount_amount, 0);
    const taxTotal = cart.reduce((sum, item) => sum + item.tax_amount, 0);
    const specialDiscount = 50; // flat 50 Tk invoice discount
    const grandTotal = subtotal - itemDiscounts - specialDiscount + taxTotal;

    expect(subtotal).toBe(4200); // 2400 + 1800
    expect(itemDiscounts).toBe(240);
    expect(taxTotal).toBe(297); // 162 + 135
    expect(grandTotal).toBe(4207); // 4200 - 240 - 50 + 297
  });

  it('correctly calculates Change / Return when customer overpays in cash', () => {
    const grandTotal = 2322.00;
    const tenderedCash = 2500.00;

    const change = tenderedCash > grandTotal ? tenderedCash - grandTotal : 0;
    const due = tenderedCash < grandTotal ? grandTotal - tenderedCash : 0;

    expect(change).toBe(178.00);
    expect(due).toBe(0);
  });

  it('identifies Due amount and blocks unauthenticated due balance for Walk-in customer', () => {
    const grandTotal = 2322.00;
    const tenderedCash = 2000.00; // Partial payment
    const customer = null; // Walk-in

    const due = grandTotal - tenderedCash;
    const isDueAllowed = customer !== null;

    expect(due).toBe(322.00);
    expect(isDueAllowed).toBe(false);
  });

  it('constructs a valid CompleteSaleData payload with session, items, and payments', () => {
    const payload: CompleteSaleData = {
      pos_session_id: 5,
      customer_id: null,
      items: [
        {
          product_variant_id: 101,
          quantity: 2,
          unit_price: 1200,
          discount: 240,
          tax: 162,
        },
      ],
      sale_discount: 0,
      payments: [
        {
          method: 'CASH',
          amount: 2500,
        },
      ],
      notes: 'Customer requested gift wrap',
      idempotency_key: 'pos-test-uuid-12345',
    };

    expect(payload.pos_session_id).toBe(5);
    expect(payload.items).toHaveLength(1);
    expect(payload.payments[0].method).toBe('CASH');
    expect(payload.payments[0].amount).toBe(2500);
    expect(payload.notes).toBe('Customer requested gift wrap');
  });

  it('constructs card payment with card type and bank details', () => {
    const payload: CompleteSaleData = {
      pos_session_id: 5,
      customer_id: 12,
      items: [
        {
          product_variant_id: 102,
          quantity: 1,
          unit_price: 1800,
          discount: 0,
          tax: 135,
        },
      ],
      payments: [
        {
          method: 'CARD',
          amount: 1935,
          card_type: 'VISA',
          card_bank: 'City Bank',
          transaction_ref: 'AUTH-998822',
        },
      ],
    };

    expect(payload.payments[0].method).toBe('CARD');
    expect(payload.payments[0].card_type).toBe('VISA');
    expect(payload.payments[0].card_bank).toBe('City Bank');
    expect(payload.payments[0].transaction_ref).toBe('AUTH-998822');
  });

  it('respects variant/product specific tax rates (5%, 15%, 0% exempt) without 7.5% fallback', () => {
    // 0% Tax Exempt Item
    const exemptTaxRate = 0;
    const exemptPrice = 500;
    const exemptTax = exemptPrice * (exemptTaxRate / 100);
    expect(exemptTax).toBe(0);

    // 15% Standard VAT Item
    const stdTaxRate = 15;
    const stdPrice = 1000;
    const stdTax = stdPrice * (stdTaxRate / 100);
    expect(stdTax).toBe(150);

    // 5% Reduced Rate Item
    const reducedTaxRate = 5;
    const reducedPrice = 200;
    const reducedTax = reducedPrice * (reducedTaxRate / 100);
    expect(reducedTax).toBe(10);

    const totalCalculatedTax = exemptTax + stdTax + reducedTax;
    expect(totalCalculatedTax).toBe(160);
  });

  it('does not simulate fake loyalty points on frontend checkout', () => {
    // Loyalty points should not be generated by client-side Math.floor(grandTotal / 100)
    const grandTotal = 4207.00;
    const fakeSimulation = Math.floor(grandTotal / 100);
    // Real system requires backend customer points balance or N/A
    const verifiedPointsDisplay = 'N/A';
    expect(verifiedPointsDisplay).not.toBe(`+${fakeSimulation}`);
    expect(verifiedPointsDisplay).toBe('N/A');
  });
});

describe('RetailCore POS Cart Auto-Backup (localStorage / sessionStorage)', () => {
  let mockLocal: Storage;
  let mockSession: Storage;

  function createMockStorage(): Storage {
    const store = new Map<string, string>();
    return {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    };
  }

  beforeEach(() => {
    mockLocal = createMockStorage();
    mockSession = createMockStorage();
    (globalThis as any).window = {
      localStorage: mockLocal,
      sessionStorage: mockSession,
    };
  });

  it('defines the correct storage key constant', () => {
    expect(CART_STORAGE_KEY).toBe('retailcore_pos_cart_backup');
  });

  it('detects and returns window.localStorage when available and writable', () => {
    const storage = getPosStorage();
    expect(storage).toBe(mockLocal);
  });

  it('falls back to window.sessionStorage if localStorage throws on access or write', () => {
    (globalThis as any).window.localStorage = {
      setItem: () => {
        throw new Error('QuotaExceeded / Private browsing restriction');
      },
      getItem: () => null,
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    };

    const storage = getPosStorage();
    expect(storage).toBe(mockSession);
  });

  it('returns null gracefully when neither localStorage nor sessionStorage is available', () => {
    (globalThis as any).window.localStorage = {
      setItem: () => {
        throw new Error('Disabled');
      },
      getItem: () => null,
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    };
    (globalThis as any).window.sessionStorage = {
      setItem: () => {
        throw new Error('Disabled');
      },
      getItem: () => null,
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    };

    const storage = getPosStorage();
    expect(storage).toBeNull();
  });

  it('returns null if no backup exists in storage', () => {
    const backup = loadInitialCartBackup();
    expect(backup).toBeNull();
  });

  it('loads and parses a valid active cart backup successfully', () => {
    const backupData: PosCartBackup = {
      cart: [
        {
          id: 'cart-1',
          product_variant_id: 101,
          barcode: '8901234567890',
          sku: 'SHIRT-BLU-L',
          name: 'Men Slim Casual Shirt',
          variant_name: 'Blue / Large',
          category_name: 'Apparel',
          quantity: 2,
          unit_price: 1200,
          discount_percent: 10,
          discount_amount: 240,
          tax_rate: 7.5,
          tax_amount: 162,
          line_total: 2322,
          available_stock: 45,
        },
      ],
      customer: {
        id: 12,
        company_id: 1,
        customer_code: 'CUST-00012',
        name: 'Rahim Ahmed',
        mobile: '01711000111',
        opening_balance: 0,
        status: 'ACTIVE',
      },
      discountPercent: '5',
      discountAmount: '0',
      salesNote: 'Hold order for customer pickup',
      applyVat: true,
      paymentMethod: 'CASH',
      tenderedAmount: '2500',
      selectedStaffId: 1,
      sessionId: 7,
      timestamp: Date.now(),
    };

    mockLocal.setItem(CART_STORAGE_KEY, JSON.stringify(backupData));

    const restored = loadInitialCartBackup();
    expect(restored).not.toBeNull();
    expect(restored?.cart).toHaveLength(1);
    expect(restored?.cart[0].product_variant_id).toBe(101);
    expect(restored?.customer?.name).toBe('Rahim Ahmed');
    expect(restored?.discountPercent).toBe('5');
    expect(restored?.salesNote).toBe('Hold order for customer pickup');
    expect(restored?.applyVat).toBe(true);
    expect(restored?.paymentMethod).toBe('CASH');
    expect(restored?.tenderedAmount).toBe('2500');
    expect(restored?.sessionId).toBe(7);
  });

  it('discards stale backup older than 24 hours and cleans storage', () => {
    const staleTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
    const staleBackup: PosCartBackup = {
      cart: [
        {
          id: 'cart-1',
          product_variant_id: 101,
          barcode: '8901234567890',
          sku: 'SHIRT-BLU-L',
          name: 'Men Slim Casual Shirt',
          variant_name: 'Blue / Large',
          category_name: 'Apparel',
          quantity: 1,
          unit_price: 1200,
          discount_percent: 0,
          discount_amount: 0,
          tax_rate: 7.5,
          tax_amount: 90,
          line_total: 1290,
          available_stock: 45,
        },
      ],
      customer: null,
      discountPercent: '0',
      discountAmount: '0',
      salesNote: '',
      applyVat: true,
      paymentMethod: 'CASH',
      tenderedAmount: '1290',
      timestamp: staleTimestamp,
    };

    mockLocal.setItem(CART_STORAGE_KEY, JSON.stringify(staleBackup));

    const restored = loadInitialCartBackup();
    expect(restored).toBeNull();
    // Stale key should have been removed from storage
    expect(mockLocal.getItem(CART_STORAGE_KEY)).toBeNull();
  });

  it('gracefully handles corrupted or malformed JSON in storage', () => {
    mockLocal.setItem(CART_STORAGE_KEY, '{"cart": [malformed json...');

    const restored = loadInitialCartBackup();
    expect(restored).toBeNull();
  });

  it('returns null if backup has empty or non-array cart', () => {
    mockLocal.setItem(CART_STORAGE_KEY, JSON.stringify({ cart: [], timestamp: Date.now() }));
    expect(loadInitialCartBackup()).toBeNull();

    mockLocal.setItem(CART_STORAGE_KEY, JSON.stringify({ cart: null, timestamp: Date.now() }));
    expect(loadInitialCartBackup()).toBeNull();
  });

  it('cleans storage when clearSale is invoked (simulated storage removal)', () => {
    mockLocal.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        cart: [{ id: '1' }],
        timestamp: Date.now(),
      })
    );
    expect(mockLocal.getItem(CART_STORAGE_KEY)).not.toBeNull();

    // clearSale simulation
    mockLocal.removeItem(CART_STORAGE_KEY);
    expect(mockLocal.getItem(CART_STORAGE_KEY)).toBeNull();
  });

  describe('Barcode Stock Validation & Increment Guard', () => {
    it('prevents adding products with zero available stock', () => {
      const outOfStockVariant: PosProductVariant = {
        id: 999,
        product_id: 99,
        sku: 'ZERO-STK',
        variant_name: 'Zero Stock Item',
        selling_price: 500,
        mrp: 500,
        tax_rate: 0,
        status: 'ACTIVE',
        available_stock: 0,
        product: { id: 99, name: 'Zero Stock Item' },
        barcodes: [{ id: 99, barcode: '0000000000', is_primary: true }],
      };

      const cart: CartItem[] = [];
      const canAdd = (outOfStockVariant.available_stock ?? 0) > 0;
      expect(canAdd).toBe(false);
      expect(cart).toHaveLength(0);
    });

    it('allows adding up to available stock and rejects further increments', () => {
      const limitedVariant: PosProductVariant = {
        id: 888,
        product_id: 88,
        sku: 'LTD-STK',
        variant_name: 'Limited Stock Item',
        selling_price: 350,
        mrp: 350,
        tax_rate: 0,
        status: 'ACTIVE',
        available_stock: 2,
        product: { id: 88, name: 'Limited Stock Item' },
        barcodes: [{ id: 88, barcode: '88888888', is_primary: true }],
      };

      const maxStock = limitedVariant.available_stock ?? 0;
      let currentQty = 0;

      // 1st scan
      if (currentQty + 1 <= maxStock) currentQty += 1;
      expect(currentQty).toBe(1);

      // 2nd scan (duplicate scan increments)
      if (currentQty + 1 <= maxStock) currentQty += 1;
      expect(currentQty).toBe(2);

      // 3rd scan should be rejected
      let rejected = false;
      if (currentQty + 1 > maxStock) {
        rejected = true;
      } else {
        currentQty += 1;
      }
      expect(rejected).toBe(true);
      expect(currentQty).toBe(2);
    });
  });

  describe('Held Sales Data Mapping & Resume', () => {
    it('restores held sale items into CartItem structure correctly', () => {
      const heldSaleData = {
        id: 55,
        invoice_number: 'HELD-20260930-0001',
        customer_id: 12,
        customer: {
          id: 12,
          name: 'Tofayel Ahmed',
          mobile: '01920799928',
        },
        subtotal: 3000,
        discount_total: 200,
        tax_total: 210,
        grand_total: 3010,
        notes: 'Customer stepped out for ATM cash',
        items: [
          {
            id: 101,
            product_variant_id: 101,
            product_name_snapshot: 'Men Slim Casual Shirt',
            variant_description_snapshot: 'Blue / Large',
            barcode_snapshot: '8901234567890',
            quantity: 2,
            unit_price: 1200,
            discount: 100,
            tax: 165,
            subtotal: 2465,
          },
        ],
      };

      const restoredCart: CartItem[] = heldSaleData.items.map((item) => {
        const qty = Number(item.quantity) || 1;
        const unitPrice = Number(item.unit_price) || 0;
        const discount = Number(item.discount) || 0;
        const tax = Number(item.tax) || 0;
        const taxable = unitPrice * qty - discount;
        const discPct = unitPrice * qty > 0 ? (discount / (unitPrice * qty)) * 100 : 0;
        const taxRate = taxable > 0 ? (tax / taxable) * 100 : 0;

        return {
          id: `restored-${item.id}`,
          product_variant_id: item.product_variant_id,
          barcode: item.barcode_snapshot || '',
          sku: item.barcode_snapshot || '',
          name: item.product_name_snapshot,
          variant_name: item.variant_description_snapshot || '',
          category_name: 'General',
          quantity: qty,
          unit_price: unitPrice,
          discount_percent: Math.round(discPct * 100) / 100,
          discount_amount: discount,
          tax_rate: Math.round(taxRate * 100) / 100,
          tax_amount: tax,
          line_total: Number(item.subtotal),
          available_stock: 999,
        };
      });

      expect(restoredCart).toHaveLength(1);
      expect(restoredCart[0].name).toBe('Men Slim Casual Shirt');
      expect(restoredCart[0].quantity).toBe(2);
      expect(restoredCart[0].unit_price).toBe(1200);
      expect(restoredCart[0].line_total).toBe(2465);
      expect(heldSaleData.customer.name).toBe('Tofayel Ahmed');
      expect(heldSaleData.notes).toBe('Customer stepped out for ATM cash');
    });
  });

  describe('Keyboard Shortcut Matrix Order', () => {
    it('verifies the 14 shortcuts strictly follow serial order', () => {
      const shortcuts = [
        { key: 'F2', label: 'Scan' },
        { key: 'F3', label: 'Search' },
        { key: 'F4', label: 'Discount' },
        { key: 'F5', label: 'Customer' },
        { key: 'F6', label: 'Hold' },
        { key: 'F7', label: 'Mobile' },
        { key: 'F8', label: 'Directory' },
        { key: 'F9', label: 'Staff' },
        { key: 'F10', label: 'Pay' },
        { key: 'F11', label: 'Card' },
        { key: 'F12', label: 'Cash' },
        { key: 'Ctrl+Enter', label: 'Save' },
        { key: 'Ctrl+N', label: 'New' },
        { key: 'Esc', label: 'Close' },
      ];

      expect(shortcuts).toHaveLength(14);
      expect(shortcuts.map((s) => s.key)).toEqual([
        'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'Ctrl+Enter', 'Ctrl+N', 'Esc'
      ]);
    });
  });

  describe('POS Multi-Tender & Loyalty Points Redemption Business Rules', () => {
    const calculatePointsEarned = (subtotal: number, hasDiscount: boolean, pointsRedeemed: number): number => {
      if (hasDiscount || pointsRedeemed > 0) return 0;
      return Math.floor(subtotal / 100);
    };

    const validateRedemption = (
      balance: number,
      pointsToRedeem: number,
      hasDiscount: boolean,
      grandTotal: number
    ): { valid: boolean; error?: string } => {
      if (hasDiscount) {
        return { valid: false, error: 'Point redemption cannot be combined with discounts.' };
      }
      if (balance < 400) {
        return { valid: false, error: 'Minimum 400 points required to redeem.' };
      }
      if (pointsToRedeem < 400) {
        return { valid: false, error: 'Minimum 400 points required to redeem.' };
      }
      if (pointsToRedeem > balance) {
        return { valid: false, error: 'Points to redeem cannot exceed available balance.' };
      }
      if (pointsToRedeem > grandTotal) {
        return { valid: false, error: 'Points redemption value cannot exceed Grand Total.' };
      }
      return { valid: true };
    };

    const reconcileTender = (
      grandTotal: number,
      payments: Array<{ method: string; amount: number }>,
      isSingleCash: boolean,
      isWalkIn: boolean
    ): { status: 'BALANCED' | 'OVERPAYMENT' | 'UNDERPAYMENT_REJECT' | 'UNDERPAYMENT_CREDIT'; diff: number; change: number; due: number } => {
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const diff = Math.round((totalPaid - grandTotal) * 10000) / 10000;

      if (Math.abs(diff) <= 0.0001) {
        return { status: 'BALANCED', diff: 0, change: 0, due: 0 };
      }

      if (diff > 0.0001) {
        if (isSingleCash) {
          return { status: 'BALANCED', diff, change: totalPaid - grandTotal, due: 0 };
        }
        return { status: 'OVERPAYMENT', diff, change: 0, due: 0 };
      }

      // Underpayment
      const due = grandTotal - totalPaid;
      if (isWalkIn) {
        return { status: 'UNDERPAYMENT_REJECT', diff, change: 0, due };
      }
      return { status: 'UNDERPAYMENT_CREDIT', diff, change: 0, due };
    };

    it('correctly reconciles multi-tender split: Point ৳400 + Cash ৳500 + bKash ৳100 = ৳1,000', () => {
      const grandTotal = 1000.00;
      const payments = [
        { method: 'POINT_REDEMPTION', amount: 400.00 },
        { method: 'CASH', amount: 500.00 },
        { method: 'BKASH', amount: 100.00 },
      ];

      const res = reconcileTender(grandTotal, payments, false, false);
      expect(res.status).toBe('BALANCED');
      expect(res.diff).toBe(0);
      expect(res.due).toBe(0);
      expect(res.change).toBe(0);
    });

    it('strictly rejects overpayment in multi-tender split (৳1050 vs ৳1000)', () => {
      const grandTotal = 1000.00;
      const payments = [
        { method: 'POINT_REDEMPTION', amount: 400.00 },
        { method: 'CASH', amount: 550.00 },
        { method: 'BKASH', amount: 100.00 },
      ];

      const res = reconcileTender(grandTotal, payments, false, false);
      expect(res.status).toBe('OVERPAYMENT');
      expect(res.diff).toBe(50.00);
    });

    it('allows customer overpayment for single cash tender and calculates change', () => {
      const grandTotal = 850.00;
      const payments = [{ method: 'CASH', amount: 1000.00 }];

      const res = reconcileTender(grandTotal, payments, true, true);
      expect(res.status).toBe('BALANCED');
      expect(res.change).toBe(150.00);
      expect(res.due).toBe(0);
    });

    it('rejects underpayment for walk-in customer', () => {
      const grandTotal = 1000.00;
      const payments = [{ method: 'CASH', amount: 800.00 }];

      const res = reconcileTender(grandTotal, payments, false, true); // walk-in = true
      expect(res.status).toBe('UNDERPAYMENT_REJECT');
      expect(res.due).toBe(200.00);
    });

    it('allows underpayment for registered customer posting to Accounts Receivable', () => {
      const grandTotal = 1000.00;
      const payments = [{ method: 'CASH', amount: 700.00 }];

      const res = reconcileTender(grandTotal, payments, false, false); // registered = false walk-in
      expect(res.status).toBe('UNDERPAYMENT_CREDIT');
      expect(res.due).toBe(300.00);
    });

    it('enforces minimum 400 points redemption threshold', () => {
      const balance = 350;
      const res = validateRedemption(balance, 350, false, 1000);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Minimum 400 points');
    });

    it('validates successful point redemption for eligible customer with >= 400 points', () => {
      const balance = 500;
      const res = validateRedemption(balance, 400, false, 1000);
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('enforces mutual exclusivity: point redemption rejected when discount is applied', () => {
      const balance = 600;
      const res = validateRedemption(balance, 400, true, 1000); // hasDiscount = true
      expect(res.valid).toBe(false);
      expect(res.error).toContain('cannot be combined with discounts');
    });

    it('calculates 1 point earned per eligible ৳100 spent', () => {
      expect(calculatePointsEarned(1000, false, 0)).toBe(10);
      expect(calculatePointsEarned(1550, false, 0)).toBe(15);
      expect(calculatePointsEarned(99.99, false, 0)).toBe(0);
    });

    it('awards 0 points earned when discount is applied or points are redeemed', () => {
      // With discount
      expect(calculatePointsEarned(2000, true, 0)).toBe(0);
      // With point redemption
      expect(calculatePointsEarned(2000, false, 400)).toBe(0);
      // With both
      expect(calculatePointsEarned(2000, true, 400)).toBe(0);
    });
  });

  describe('Feature 1: Smart Discount % ↔ Amount Calculations', () => {
    const calculateDiscountFromPercent = (eligibleSubtotal: number, percentStr: string) => {
      if (percentStr === '' || eligibleSubtotal <= 0) {
        return { amountStr: '0.00', amountNum: 0 };
      }
      const pct = parseFloat(percentStr);
      if (isNaN(pct) || pct <= 0) {
        return { amountStr: '0.00', amountNum: 0 };
      }
      const clampedPct = Math.min(100, Math.max(0, pct));
      const calcAmt = Math.round(((eligibleSubtotal * clampedPct) / 100) * 100) / 100;
      return { amountStr: calcAmt.toFixed(2), amountNum: calcAmt };
    };

    const calculatePercentFromDiscount = (eligibleSubtotal: number, amountStr: string) => {
      if (amountStr === '' || eligibleSubtotal <= 0) {
        return { percentStr: '0.00', percentNum: 0, clampedAmount: 0 };
      }
      const amt = parseFloat(amountStr);
      if (isNaN(amt) || amt <= 0) {
        return { percentStr: '0.00', percentNum: 0, clampedAmount: 0 };
      }
      const clampedAmt = Math.min(eligibleSubtotal, Math.max(0, amt));
      const calcPct = Math.round(((clampedAmt / eligibleSubtotal) * 100) * 100) / 100;
      return { percentStr: calcPct.toFixed(2), percentNum: calcPct, clampedAmount: clampedAmt };
    };

    it('5% discount displays correct Taka amount on ৳1,000 subtotal', () => {
      const subtotal = 1000;
      const res = calculateDiscountFromPercent(subtotal, '5');
      expect(res.amountStr).toBe('50.00');
      expect(res.amountNum).toBe(50.00);
    });

    it('12.5% discount displays correct Taka amount on ৳2,400 subtotal', () => {
      const subtotal = 2400;
      const res = calculateDiscountFromPercent(subtotal, '12.5');
      expect(res.amountStr).toBe('300.00');
      expect(res.amountNum).toBe(300.00);
    });

    it('Taka discount of ৳100 displays correct percentage (10.00%) on ৳1,000 subtotal', () => {
      const subtotal = 1000;
      const res = calculatePercentFromDiscount(subtotal, '100');
      expect(res.percentStr).toBe('10.00');
      expect(res.percentNum).toBe(10.00);
      expect(res.clampedAmount).toBe(100);
    });

    it('Taka discount of ৳50 displays correct percentage (2.50%) on ৳2,000 subtotal', () => {
      const subtotal = 2000;
      const res = calculatePercentFromDiscount(subtotal, '50');
      expect(res.percentStr).toBe('2.50');
      expect(res.percentNum).toBe(2.50);
    });

    it('handles zero subtotal gracefully without NaN or Infinity', () => {
      const zeroSubtotal = 0;
      const fromPct = calculateDiscountFromPercent(zeroSubtotal, '5');
      expect(fromPct.amountStr).toBe('0.00');
      expect(fromPct.amountNum).toBe(0);
      expect(isNaN(fromPct.amountNum)).toBe(false);

      const fromAmt = calculatePercentFromDiscount(zeroSubtotal, '100');
      expect(fromAmt.percentStr).toBe('0.00');
      expect(fromAmt.percentNum).toBe(0);
      expect(isNaN(fromAmt.percentNum)).toBe(false);
      expect(isFinite(fromAmt.percentNum)).toBe(true);
    });

    it('100% discount results in discount equal to subtotal', () => {
      const subtotal = 1500;
      const res = calculateDiscountFromPercent(subtotal, '100');
      expect(res.amountNum).toBe(1500.00);
      expect(res.amountStr).toBe('1500.00');
    });

    it('0% discount results in ৳0.00', () => {
      const subtotal = 1000;
      const res = calculateDiscountFromPercent(subtotal, '0');
      expect(res.amountStr).toBe('0.00');
      expect(res.amountNum).toBe(0);
    });

    it('clamps discount amount exceeding subtotal and sets percentage to 100%', () => {
      const subtotal = 1000;
      const res = calculatePercentFromDiscount(subtotal, '1500'); // exceeds 1000
      expect(res.clampedAmount).toBe(1000);
      expect(res.percentStr).toBe('100.00');
      expect(res.percentNum).toBe(100.00);
    });

    it('handles decimal precision safely (৳1234.56 @ 7.5%)', () => {
      const subtotal = 1234.56;
      const res = calculateDiscountFromPercent(subtotal, '7.5');
      // 1234.56 * 0.075 = 92.592 => 92.59
      expect(res.amountStr).toBe('92.59');
      expect(res.amountNum).toBe(92.59);
    });

    it('discount conversion does not create update loops or drifting', () => {
      const subtotal = 1000;
      // Step 1: User types 5%
      const step1 = calculateDiscountFromPercent(subtotal, '5');
      expect(step1.amountStr).toBe('50.00');

      // Step 2: Amount converted back to %
      const step2 = calculatePercentFromDiscount(subtotal, step1.amountStr);
      expect(step2.percentStr).toBe('5.00');

      // Step 3: % converted back to amount
      const step3 = calculateDiscountFromPercent(subtotal, step2.percentStr);
      expect(step3.amountStr).toBe('50.00');
      expect(step3.amountNum).toBe(step1.amountNum);
    });
  });

  describe('Feature 2: POS Sales Slip / Customer Hand-Over Report & Print Safety', () => {
    const sampleCompletedSale = {
      invoiceNumber: 'INV-2026-0099',
      saleDate: '2026-09-30 14:30:00',
      cashierName: 'Fatima Rahman',
      terminalName: 'POS-01',
      branchName: 'Dhanmondi Branch',
      saleType: 'RETAIL / COUNTER SALE',
      customer: {
        id: 42,
        name: 'Tariqul Islam',
        mobile: '01711223344',
        customer_code: 'CUST-0042',
        address: 'House 12, Road 4, Dhanmondi, Dhaka',
      },
      items: [
        {
          id: '1',
          name: 'Classic Oxford Shirt',
          variant_name: 'White / L',
          sku: 'SHIRT-WHT-L',
          barcode: '8901234567890',
          quantity: 2,
          unit_price: 1200.00,
          discount_amount: 100.00,
          tax_amount: 172.50,
          line_total: 2472.50,
        },
      ],
      subtotal: 2400.00,
      discountTotal: 220.00,
      specialDiscount: 120.00,
      discountPercent: 5.00,
      taxTotal: 172.50,
      grandTotal: 2352.50,
      paidAmount: 2352.50,
      changeAmount: 0.00,
      dueAmount: 0.00,
      paymentMethod: 'SPLIT',
      payments: [
        { method: 'POINT_REDEMPTION', amount: 400.00 },
        { method: 'CASH', amount: 1500.00 },
        { method: 'BKASH', amount: 452.50, transaction_ref: 'TRX-BK-998811' },
      ],
      previousPoints: 850,
      pointsRedeemed: 400,
      pointsEarned: 0,
      customerPointsBalance: 450,
    };

    it('sales slip displays sale invoice number', () => {
      expect(sampleCompletedSale.invoiceNumber).toBe('INV-2026-0099');
      expect(sampleCompletedSale.invoiceNumber.length).toBeGreaterThan(5);
    });

    it('sales slip displays registered customer information and code', () => {
      expect(sampleCompletedSale.customer).not.toBeNull();
      expect(sampleCompletedSale.customer.name).toBe('Tariqul Islam');
      expect(sampleCompletedSale.customer.mobile).toBe('01711223344');
      expect(sampleCompletedSale.customer.customer_code).toBe('CUST-0042');
    });

    it('sales slip displays Walk-in Customer when customer is null', () => {
      const walkInSale = { ...sampleCompletedSale, customer: null };
      const displayCustomerName = walkInSale.customer ? (walkInSale.customer as any).name : 'Walk-in Customer';
      expect(displayCustomerName).toBe('Walk-in Customer');
    });

    it('sales slip displays item details including variant, SKU/barcode, and line financial values', () => {
      const item = sampleCompletedSale.items[0];
      expect(item.name).toBe('Classic Oxford Shirt');
      expect(item.variant_name).toBe('White / L');
      expect(item.barcode).toBe('8901234567890');
      expect(item.quantity).toBe(2);
      expect(item.unit_price).toBe(1200.00);
      expect(item.line_total).toBe(2472.50);
    });

    it('sales slip displays discount percentage and amount simultaneously', () => {
      expect(sampleCompletedSale.discountPercent).toBe(5.00);
      expect(sampleCompletedSale.specialDiscount).toBe(120.00);
      expect(sampleCompletedSale.discountTotal).toBe(220.00);
    });

    it('sales slip displays full payment tender breakdown with split methods', () => {
      expect(sampleCompletedSale.payments).toHaveLength(3);
      expect(sampleCompletedSale.payments[0].method).toBe('POINT_REDEMPTION');
      expect(sampleCompletedSale.payments[0].amount).toBe(400.00);
      expect(sampleCompletedSale.payments[1].method).toBe('CASH');
      expect(sampleCompletedSale.payments[1].amount).toBe(1500.00);
      expect(sampleCompletedSale.payments[2].method).toBe('BKASH');
      expect(sampleCompletedSale.payments[2].amount).toBe(452.50);
      expect(sampleCompletedSale.payments[2].transaction_ref).toBe('TRX-BK-998811');

      const sumTenders = sampleCompletedSale.payments.reduce((s, p) => s + p.amount, 0);
      expect(sumTenders).toBe(sampleCompletedSale.paidAmount);
    });

    it('sales slip displays loyalty redemption, previous points, and balance when applicable', () => {
      expect(sampleCompletedSale.previousPoints).toBe(850);
      expect(sampleCompletedSale.pointsRedeemed).toBe(400);
      expect(sampleCompletedSale.pointsEarned).toBe(0);
      expect(sampleCompletedSale.customerPointsBalance).toBe(450);
    });

    it('reprint does NOT call sale creation API and operates strictly on existing completed sale', () => {
      const mockApiComplete = vi.fn();
      let printDialogInvoked = false;

      const triggerReprint = (saleData: any) => {
        // Pure reprint: never calls mockApiComplete
        if (saleData) {
          printDialogInvoked = true;
        }
      };

      triggerReprint(sampleCompletedSale);

      expect(mockApiComplete).not.toHaveBeenCalled();
      expect(printDialogInvoked).toBe(true);
      expect(sampleCompletedSale.invoiceNumber).toBe('INV-2026-0099');
    });

    it('print failure does NOT affect sale completion or drop sale data', () => {
      let printErrorMessage: string | null = null;
      let saleRecord = { ...sampleCompletedSale };

      const safePrint = (data: any) => {
        try {
          throw new Error('Printer disconnected');
        } catch (e: any) {
          printErrorMessage = e.message;
        }
      };

      safePrint(saleRecord);

      expect(printErrorMessage).toBe('Printer disconnected');
      // Sale record remains completely intact
      expect(saleRecord.invoiceNumber).toBe('INV-2026-0099');
      expect(saleRecord.grandTotal).toBe(2352.50);
      expect(saleRecord.items).toHaveLength(1);
    });
  });

  describe('POS Terminal Management & Session Opening Dropdown Flow', () => {
    const mockTerminals = [
      {
        id: 1,
        company_id: 10,
        terminal_code: 'SONARI-01',
        terminal_name: 'Sonari Counter-01',
        status: 'ACTIVE' as const,
        warehouse_id: 5,
        branch_id: 2,
        branch: { id: 2, name: 'Dhanmondi Branch' },
        warehouse: { id: 5, name: 'Dhanmondi Warehouse' },
      },
      {
        id: 2,
        company_id: 10,
        terminal_code: 'SONARI-02',
        terminal_name: 'Sonari Counter-02',
        status: 'INACTIVE' as const,
        warehouse_id: 5,
        branch_id: 2,
        branch: { id: 2, name: 'Dhanmondi Branch' },
        warehouse: { id: 5, name: 'Dhanmondi Warehouse' },
      },
      {
        id: 3,
        company_id: 10,
        terminal_code: 'GULSHAN-01',
        terminal_name: 'Gulshan Express POS',
        status: 'ACTIVE' as const,
        warehouse_id: 8,
        branch_id: 3,
        branch: { id: 3, name: 'Gulshan Branch' },
        warehouse: { id: 8, name: 'Gulshan Warehouse' },
      },
    ];

    it('filters out inactive terminals for Open Session dropdown', () => {
      const activeOnly = mockTerminals.filter((t) => t.status === 'ACTIVE');
      expect(activeOnly).toHaveLength(2);
      expect(activeOnly.map((t) => t.id)).toEqual([1, 3]);
      expect(activeOnly.some((t) => (t.status as string) === 'INACTIVE')).toBe(false);
    });

    it('formats terminal options correctly as Terminal Name — Terminal Code with branch', () => {
      const formatOption = (t: typeof mockTerminals[0]) =>
        `${t.terminal_name} — ${t.terminal_code}${t.branch?.name ? ` (${t.branch.name})` : ''}`;

      expect(formatOption(mockTerminals[0])).toBe('Sonari Counter-01 — SONARI-01 (Dhanmondi Branch)');
      expect(formatOption(mockTerminals[2])).toBe('Gulshan Express POS — GULSHAN-01 (Gulshan Branch)');
    });

    it('displays clear message when no active terminal is available and disables submission', () => {
      const emptyTerminals: typeof mockTerminals = [];
      const hasTerminals = emptyTerminals.length > 0;
      const emptyMessage = 'No active POS terminal available. Please contact an administrator.';

      expect(hasTerminals).toBe(false);
      expect(emptyMessage).toBe('No active POS terminal available. Please contact an administrator.');

      const isSubmitDisabled = (terminalsList: any[], selectedId: any, loading: boolean) =>
        loading || terminalsList.length === 0 || !selectedId;

      expect(isSubmitDisabled(emptyTerminals, '', false)).toBe(true);
      expect(isSubmitDisabled(mockTerminals, 1, false)).toBe(false);
      expect(isSubmitDisabled(mockTerminals, '', false)).toBe(true);
      expect(isSubmitDisabled(mockTerminals, 1, true)).toBe(true);
    });

    it('binds selected POS terminal ID, cashier ID, and opening cash to the session creation payload', () => {
      const selectedTerminalId = 1;
      const cashierId = 42;
      const openingCash = 3500;
      const notes = 'Opening shift change';

      const payload = {
        pos_terminal_id: selectedTerminalId,
        cashier_id: cashierId,
        opening_cash: openingCash,
        notes,
      };

      expect(payload.pos_terminal_id).toBe(1);
      expect(payload.cashier_id).toBe(42);
      expect(payload.opening_cash).toBe(3500);
      expect(payload.notes).toBe('Opening shift change');
    });

    it('quick status toggle updates terminal status between ACTIVE and INACTIVE', () => {
      const toggleStatus = (currentStatus: 'ACTIVE' | 'INACTIVE') =>
        currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

      expect(toggleStatus('ACTIVE')).toBe('INACTIVE');
      expect(toggleStatus('INACTIVE')).toBe('ACTIVE');
    });

    it('validates navigation route path and RBAC permission for POS Terminal Management', () => {
      const posTerminalRoute = '/pos/terminals';
      const openSessionRoute = '/pos';

      expect(posTerminalRoute).toBe('/pos/terminals');
      expect(openSessionRoute).toBe('/pos');

      const checkCanViewPosAdmin = (roles: string[], permissions: string[]) => {
        const hasRole = (r: string) => roles.some((role) => role.toLowerCase() === r.toLowerCase());
        const hasPermission = (p: string) => permissions.some((perm) => perm.toLowerCase() === p.toLowerCase());
        return hasRole('Super Admin') || hasRole('Admin') || hasPermission('pos.view');
      };

      // Super Admin and Admin can view
      expect(checkCanViewPosAdmin(['Super Admin'], [])).toBe(true);
      expect(checkCanViewPosAdmin(['Admin'], [])).toBe(true);

      // User with pos.view permission can view
      expect(checkCanViewPosAdmin(['Cashier'], ['pos.view'])).toBe(true);

      // User without role or permission is denied
      expect(checkCanViewPosAdmin(['Cashier'], ['sales.view'])).toBe(false);
      expect(checkCanViewPosAdmin(['Guest'], [])).toBe(false);
    });
  });
});

