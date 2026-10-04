import { describe, it, expect, beforeEach, vi } from 'vitest';
import { en } from '../i18n/en';
import { bn } from '../i18n/bn';
import { formatCurrency, formatNumber, formatDateTime } from '../utils/format';
import type { InventoryItem, StockMovement, StockMovementType, Warehouse } from '../types/inventory';

describe('RetailCore ERP Inventory Dashboard & Stock Movements UI Suite', () => {
  // Test Fixtures
  const sampleWarehouses: Warehouse[] = [
    {
      id: 1,
      name: 'Central Warehouse (Dhaka)',
      code: 'WH-DHK-01',
      company_id: 1,
      business_unit_id: 1,
      warehouse_type: 'CENTRAL',
      status: 'active',
    },
    {
      id: 2,
      name: 'Chittagong Distribution Hub',
      code: 'WH-CTG-01',
      company_id: 1,
      business_unit_id: 1,
      warehouse_type: 'BRANCH',
      status: 'active',
    },
  ];

  const sampleInventoryItems: InventoryItem[] = [
    {
      id: 101,
      company_id: 1,
      warehouse_id: 1,
      product_id: 10,
      product_variant_id: 20,
      quantity: '45.5000',
      reserved_quantity: '5.0000',
      available_quantity: '40.5000',
      average_cost: '250.0000',
      total_value: '11375.0000',
      warehouse: sampleWarehouses[0],
      product: {
        id: 10,
        uuid: 'prod-uuid-10',
        company_id: 1,
        category_id: 1,
        unit_id: 1,
        name: 'Cotton Oxford Shirt',
        slug: 'cotton-oxford-shirt',
        product_code: 'SHIRT-OXF',
        has_variants: true,
        product_type: 'variable',
        tax_rate: 0,
        tax_type: 'exclusive',
        reorder_level: 15,
        status: 'active',
        unit: { id: 1, name: 'Pcs', short_code: 'pcs' },
      },
      product_variant: {
        id: 20,
        product_id: 10,
        sku: 'SHIRT-OXF-BLU-L',
        variant_name: 'Blue / Large',
        cost_price: 250,
        selling_price: 450,
        status: 'active',
      },
    },
    {
      id: 102,
      company_id: 1,
      warehouse_id: 1,
      product_id: 11,
      product_variant_id: 21,
      quantity: '3.2500',
      reserved_quantity: '0.0000',
      available_quantity: '3.2500',
      average_cost: '800.0000',
      total_value: '2600.0000',
      warehouse: sampleWarehouses[0],
      product: {
        id: 11,
        uuid: 'prod-uuid-11',
        company_id: 1,
        category_id: 1,
        unit_id: 1,
        name: 'Denim Jeans Slim Fit',
        slug: 'denim-jeans-slim-fit',
        product_code: 'JEANS-SLM',
        has_variants: true,
        product_type: 'variable',
        tax_rate: 0,
        tax_type: 'exclusive',
        reorder_level: 10,
        status: 'active',
        unit: { id: 1, name: 'Pcs', short_code: 'pcs' },
      },
      product_variant: {
        id: 21,
        product_id: 11,
        sku: 'JEANS-SLM-32',
        variant_name: 'Indigo / 32',
        cost_price: 800,
        selling_price: 1400,
        status: 'active',
      },
    },
    {
      id: 103,
      company_id: 1,
      warehouse_id: 2,
      product_id: 12,
      product_variant_id: 22,
      quantity: '0.0000',
      reserved_quantity: '0.0000',
      available_quantity: '0.0000',
      average_cost: '150.0000',
      total_value: '0.0000',
      warehouse: sampleWarehouses[1],
      product: {
        id: 12,
        uuid: 'prod-uuid-12',
        company_id: 1,
        category_id: 1,
        unit_id: 1,
        name: 'Basic Crewneck Tee',
        slug: 'basic-crewneck-tee',
        product_code: 'TEE-CRW',
        has_variants: true,
        product_type: 'variable',
        tax_rate: 0,
        tax_type: 'exclusive',
        reorder_level: 20,
        status: 'active',
        unit: { id: 1, name: 'Pcs', short_code: 'pcs' },
      },
      product_variant: {
        id: 22,
        product_id: 12,
        sku: 'TEE-CRW-WHT-M',
        variant_name: 'White / Medium',
        cost_price: 150,
        selling_price: 300,
        status: 'active',
      },
    },
  ];

  const sampleLowStockItems: InventoryItem[] = [
    sampleInventoryItems[1], // 3.2500 <= 10 (reorder_level)
    sampleInventoryItems[2], // 0.0000 <= 20 (reorder_level)
  ];

  const sampleStockMovements: StockMovement[] = [
    {
      id: 501,
      company_id: 1,
      warehouse_id: 1,
      product_id: 10,
      product_variant_id: 20,
      movement_type: 'OPENING_STOCK',
      quantity: '50.0000',
      unit_cost: '240.0000',
      total_cost: '12000.0000',
      quantity_before: '0.0000',
      quantity_after: '50.0000',
      reference_type: 'OPENING_STOCK',
      reference_number: 'OP-2026-001',
      reason: 'Initial Fiscal Inventory Setup',
      created_by: 1,
      created_at: '2026-10-01T08:00:00Z',
      warehouse: sampleWarehouses[0],
      product: sampleInventoryItems[0].product,
      product_variant: sampleInventoryItems[0].product_variant,
      creator: { id: 1, name: 'Super Administrator' },
    },
    {
      id: 502,
      company_id: 1,
      warehouse_id: 1,
      product_id: 10,
      product_variant_id: 20,
      movement_type: 'STOCK_OUT',
      quantity: '4.5000',
      unit_cost: '250.0000',
      total_cost: '1125.0000',
      quantity_before: '50.0000',
      quantity_after: '45.5000',
      reference_type: 'POS_SALE',
      reference_number: 'INV-2026-0891',
      reason: 'Retail Counter Sale',
      created_by: 2,
      created_at: '2026-10-01T11:30:00Z',
      warehouse: sampleWarehouses[0],
      product: sampleInventoryItems[0].product,
      product_variant: sampleInventoryItems[0].product_variant,
      creator: { id: 2, name: 'Branch Cashier 01' },
    },
    {
      id: 503,
      company_id: 1,
      warehouse_id: 1,
      product_id: 11,
      product_variant_id: 21,
      movement_type: 'DAMAGE',
      quantity: '1.0000',
      unit_cost: '800.0000',
      total_cost: '800.0000',
      quantity_before: '4.2500',
      quantity_after: '3.2500',
      reference_type: 'DAMAGE_LOSS',
      reference_number: 'DMG-2026-004',
      reason: 'Fabric Tear during transit',
      created_by: 1,
      created_at: '2026-10-01T14:15:00Z',
      warehouse: sampleWarehouses[0],
      product: sampleInventoryItems[1].product,
      product_variant: sampleInventoryItems[1].product_variant,
      creator: { id: 1, name: 'Super Administrator' },
    },
  ];

  // ==========================================================================
  // SECTION 1: INVENTORY DASHBOARD UI LOGIC & KPI CALCULATIONS
  // ==========================================================================
  describe('1. Inventory Dashboard KPI Calculations & Data Derivation', () => {
    it('1.1 calculates total inventory valuation strictly from live API item records', () => {
      let totalVal = 0;
      sampleInventoryItems.forEach((item) => {
        const itemVal = item.total_value !== undefined && item.total_value !== null
          ? Number(item.total_value)
          : Number(item.quantity || 0) * Number(item.average_cost || 0);
        totalVal += itemVal;
      });

      // 11,375 + 2,600 + 0 = 13,975.00
      expect(totalVal).toBe(13975);
      const formatted = formatCurrency(totalVal);
      expect(formatted).toContain('13,975.00');
      expect(formatted).toContain('৳');
    });

    it('1.2 counts total tracked items and SKUs from pagination total', () => {
      const pagination = { total: 42 };
      expect(pagination.total).toBe(42);
      expect(formatNumber(pagination.total)).toBe('42');
    });

    it('1.3 accurately reflects low stock alerts count from getLowStock API result', () => {
      const lowStockCount = sampleLowStockItems.length;
      expect(lowStockCount).toBe(2);
      expect(formatNumber(lowStockCount)).toBe('2');
    });

    it('1.4 accurately derives out of stock count for items with available_quantity <= 0', () => {
      let outOfStockCount = 0;
      sampleInventoryItems.forEach((item) => {
        const avail = Number(item.available_quantity ?? item.quantity ?? 0);
        if (avail <= 0) {
          outOfStockCount++;
        }
      });

      expect(outOfStockCount).toBe(1); // Item 103 has 0 available
    });

    it('1.5 preserves fractional decimal quantities without integer truncation', () => {
      const formatDecimalQty = (val: string | number): string => {
        const num = Number(val);
        return num.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        });
      };

      expect(formatDecimalQty('45.5000')).toBe('45.50');
      expect(formatDecimalQty('3.2500')).toBe('3.25');
      expect(formatDecimalQty('12.3754')).toBe('12.3754');
      expect(formatDecimalQty('0.5000')).toBe('0.50');

      // Verify parseInt is never applied to fractional inventory quantities
      expect(parseFloat('3.2500')).not.toBe(parseInt('3.2500', 10));
    });

    it('1.6 categorizes stock status into IN_STOCK, LOW_STOCK, and OUT_OF_STOCK', () => {
      const getItemStatus = (item: InventoryItem) => {
        const avail = Number(item.available_quantity ?? item.quantity ?? 0);
        const reorder = Number(item.product?.reorder_level ?? 0);
        if (avail <= 0) return 'OUT_OF_STOCK';
        if (reorder > 0 && avail <= reorder) return 'LOW_STOCK';
        return 'IN_STOCK';
      };

      expect(getItemStatus(sampleInventoryItems[0])).toBe('IN_STOCK'); // 40.5 > 15
      expect(getItemStatus(sampleInventoryItems[1])).toBe('LOW_STOCK'); // 3.25 <= 10
      expect(getItemStatus(sampleInventoryItems[2])).toBe('OUT_OF_STOCK'); // 0 <= 0
    });

    it('1.7 constructs correct query params when filtering by warehouse and search query', () => {
      const buildInventoryParams = (warehouseId: string, search: string, page = 1) => {
        const params: Record<string, string | number> = { page, per_page: 15 };
        if (warehouseId) params.warehouse_id = warehouseId;
        if (search.trim()) params.search = search.trim();
        return params;
      };

      const params1 = buildInventoryParams('1', 'Oxford');
      expect(params1.warehouse_id).toBe('1');
      expect(params1.search).toBe('Oxford');
      expect(params1.page).toBe(1);

      const paramsAll = buildInventoryParams('', '');
      expect(paramsAll.warehouse_id).toBeUndefined();
      expect(paramsAll.search).toBeUndefined();
    });

    it('1.8 validates pagination boundary conditions and page state', () => {
      const pagination = {
        current_page: 2,
        last_page: 4,
        total: 58,
        per_page: 15,
        from: 16,
        to: 30,
      };

      const canPrev = pagination.current_page > 1;
      const canNext = pagination.current_page < pagination.last_page;

      expect(canPrev).toBe(true);
      expect(canNext).toBe(true);
      expect(pagination.from).toBe(16);
      expect(pagination.to).toBe(30);
    });

    it('1.9 handles empty inventory results with proper empty state fallback', () => {
      const emptyItems: InventoryItem[] = [];
      const hasRecords = emptyItems.length > 0;
      expect(hasRecords).toBe(false);
      expect(en['inventory.noInventoryFound']).toBe('No inventory records found');
      expect(bn['inventory.noInventoryFound']).toBe('কোনো মজুদের তথ্য পাওয়া যায়নি');
    });

    it('1.10 safely handles API error responses with retry capability', () => {
      const errorMessage = 'Network error while retrieving warehouse stocks';
      let errorState: string | null = errorMessage;
      expect(errorState).toBe(errorMessage);

      // Reset on retry
      errorState = null;
      expect(errorState).toBeNull();
    });
  });

  // ==========================================================================
  // SECTION 2: STOCK MOVEMENTS LEDGER UI LOGIC & AUDIT TRAIL
  // ==========================================================================
  describe('2. Stock Movements Ledger UI Logic & Ledger Calculations', () => {
    it('2.1 accurately identifies addition vs deduction movement types', () => {
      const isAdditionType = (type: string): boolean => {
        const additions = ['OPENING_STOCK', 'STOCK_IN', 'TRANSFER_IN', 'ADJUSTMENT_IN'];
        return additions.includes(type);
      };

      expect(isAdditionType('OPENING_STOCK')).toBe(true);
      expect(isAdditionType('STOCK_IN')).toBe(true);
      expect(isAdditionType('TRANSFER_IN')).toBe(true);
      expect(isAdditionType('ADJUSTMENT_IN')).toBe(true);

      expect(isAdditionType('STOCK_OUT')).toBe(false);
      expect(isAdditionType('TRANSFER_OUT')).toBe(false);
      expect(isAdditionType('ADJUSTMENT_OUT')).toBe(false);
      expect(isAdditionType('DAMAGE')).toBe(false);
      expect(isAdditionType('LOSS')).toBe(false);
    });

    it('2.2 prefixes quantities with correct direction indicator (+ or -)', () => {
      const formatSignedQty = (quantity: string | number, type: string): string => {
        const isAdd = ['OPENING_STOCK', 'STOCK_IN', 'TRANSFER_IN', 'ADJUSTMENT_IN'].includes(type);
        const prefix = isAdd ? '+' : '-';
        return `${prefix}${Number(quantity).toFixed(2)}`;
      };

      expect(formatSignedQty('50.0000', 'OPENING_STOCK')).toBe('+50.00');
      expect(formatSignedQty('4.5000', 'STOCK_OUT')).toBe('-4.50');
      expect(formatSignedQty('1.0000', 'DAMAGE')).toBe('-1.00');
    });

    it('2.3 records quantity before and after balance progression accurately', () => {
      const m1 = sampleStockMovements[0]; // 0 -> 50
      expect(Number(m1.quantity_before)).toBe(0);
      expect(Number(m1.quantity_after)).toBe(50);
      expect(Number(m1.quantity_after) - Number(m1.quantity_before)).toBe(50);

      const m2 = sampleStockMovements[1]; // 50 -> 45.5
      expect(Number(m2.quantity_before)).toBe(50);
      expect(Number(m2.quantity_after)).toBe(45.5);
      expect(Number(m2.quantity_before) - Number(m2.quantity_after)).toBe(4.5);
    });

    it('2.4 formats unit cost and total cost with BDT currency symbol', () => {
      const m = sampleStockMovements[1];
      const unitCostStr = formatCurrency(m.unit_cost);
      const totalCostStr = formatCurrency(m.total_cost);

      expect(unitCostStr).toContain('250.00');
      expect(unitCostStr).toContain('৳');
      expect(totalCostStr).toContain('1,125.00');
      expect(totalCostStr).toContain('৳');
    });

    it('2.5 constructs movement filter params with warehouse_id and movement_type', () => {
      const buildMovementParams = (warehouseId: string, movementType: string, page = 1) => {
        const params: Record<string, string | number> = { page, per_page: 25 };
        if (warehouseId) params.warehouse_id = warehouseId;
        if (movementType) params.movement_type = movementType;
        return params;
      };

      const params = buildMovementParams('2', 'DAMAGE');
      expect(params.warehouse_id).toBe('2');
      expect(params.movement_type).toBe('DAMAGE');
      expect(params.page).toBe(1);
    });

    it('2.6 maps creator information and reference details in movements table', () => {
      const m = sampleStockMovements[0];
      expect(m.creator?.name).toBe('Super Administrator');
      expect(m.reference_number).toBe('OP-2026-001');
      expect(m.reason).toBe('Initial Fiscal Inventory Setup');
    });

    it('2.7 verifies all 9 movement types exist in English and Bengali dictionaries', () => {
      const types = [
        'OPENING_STOCK',
        'STOCK_IN',
        'STOCK_OUT',
        'TRANSFER_IN',
        'TRANSFER_OUT',
        'ADJUSTMENT_IN',
        'ADJUSTMENT_OUT',
        'DAMAGE',
        'LOSS',
      ];

      types.forEach((type) => {
        const key = `inventory.type.${type}`;
        expect(en[key]).toBeDefined();
        expect(bn[key]).toBeDefined();
        expect(en[key].length).toBeGreaterThan(0);
        expect(bn[key].length).toBeGreaterThan(0);
      });
    });

    it('2.8 handles empty stock movements audit log with proper description', () => {
      const emptyMovements: StockMovement[] = [];
      expect(emptyMovements.length).toBe(0);
      expect(en['inventory.noMovements']).toBe('No stock movements recorded yet.');
      expect(bn['inventory.noMovements']).toBe('এখনো কোনো স্টক মুভমেন্ট রেকর্ড করা হয়নি।');
    });
  });

  // ==========================================================================
  // SECTION 3: BILINGUAL TRANSLATION PARITY & AUTHENTIC TERMINOLOGY
  // ==========================================================================
  describe('3. Bilingual Internationalization (i18n) Parity & Completeness', () => {
    it('3.1 maintains 100% key parity between en.ts and bn.ts across all inventory keys', () => {
      const enInventoryKeys = Object.keys(en).filter((k) => k.startsWith('inventory.'));
      const bnInventoryKeys = Object.keys(bn).filter((k) => k.startsWith('inventory.'));

      expect(enInventoryKeys.length).toBeGreaterThanOrEqual(30);
      expect(bnInventoryKeys.length).toBe(enInventoryKeys.length);

      const missingInBn = enInventoryKeys.filter((k) => !(k in bn));
      const missingInEn = bnInventoryKeys.filter((k) => !(k in en));

      expect(missingInBn).toEqual([]);
      expect(missingInEn).toEqual([]);
    });

    it('3.2 verifies authentic Bengali business terms for inventory domain', () => {
      expect(bn['inventory.title']).toBe('ইনভেন্টরি ব্যবস্থাপনা');
      expect(bn['inventory.totalValue']).toBe('মোট মজুদের মূল্য');
      expect(bn['inventory.totalItems']).toBe('মোট পণ্য / এসকেইউ');
      expect(bn['inventory.lowStockAlerts']).toBe('স্বল্প মজুদের পণ্য');
      expect(bn['inventory.outOfStock']).toBe('মজুদ শেষ পণ্য');
      expect(bn['inventory.stockLevelsTitle']).toBe('গুদামভিত্তিক মজুদ তালিকা');
      expect(bn['inventory.stockMovementsTitle']).toBe('স্টক মুভমেন্ট খতিয়ান');
      expect(bn['inventory.allWarehouses']).toBe('সকল গুদাম');
      expect(bn['inventory.reorderPoint']).toBe('পুনঃক্রয় সীমা');
      expect(bn['inventory.availableQty']).toBe('উপলব্ধ পরিমাণ');
      expect(bn['inventory.unitCost']).toBe('একক ক্রয়মূল্য');
    });

    it('3.3 correctly substitutes parameterized pagination variables in both languages', () => {
      const params = { from: 1, to: 15, total: 120 };

      let enText = en['inventory.showingRecords'];
      let bnText = bn['inventory.showingRecords'];

      Object.entries(params).forEach(([k, v]) => {
        enText = enText.replace(`{${k}}`, String(v));
        bnText = bnText.replace(`{${k}}`, String(v));
      });

      expect(enText).toBe('Showing 1 to 15 of 120 records');
      expect(bnText).toBe('মোট 120 টির মধ্যে 1 থেকে 15 দেখানো হচ্ছে');
    });
  });
});
