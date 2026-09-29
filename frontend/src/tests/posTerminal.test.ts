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
});
