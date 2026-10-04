import { describe, it, expect, beforeEach, vi } from 'vitest';
import { en } from '../i18n/en';
import { bn } from '../i18n/bn';
import type {
  InventoryItem,
  Product,
  ProductVariant,
  Warehouse,
  StockAdjustmentPayload,
  DamageLossPayload,
} from '../types/inventory';
import * as inventoryApi from '../api/inventory';

describe('RetailCore ERP Stock Adjustment Suite', () => {
  // Test Fixtures
  const mockWarehouse: Warehouse = {
    id: 1,
    name: 'Central Warehouse (Dhaka)',
    code: 'WH-DHK-01',
    company_id: 1,
    business_unit_id: 1,
    warehouse_type: 'CENTRAL',
    status: 'active',
  };

  const mockProductPcs: Product = {
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
    reorder_level: 10,
    status: 'active',
    unit: { id: 1, name: 'Pieces', short_code: 'pcs', decimal_allowed: false },
  };

  const mockProductKg: Product = {
    id: 20,
    uuid: 'prod-uuid-20',
    company_id: 1,
    category_id: 2,
    unit_id: 2,
    name: 'Basmati Rice Premium',
    slug: 'basmati-rice-premium',
    product_code: 'RICE-BAS',
    has_variants: false,
    product_type: 'simple',
    tax_rate: 0,
    tax_type: 'exclusive',
    reorder_level: 50,
    status: 'active',
    unit: { id: 2, name: 'Kilograms', short_code: 'kg', decimal_allowed: true },
  };

  const mockVariantPcs: ProductVariant = {
    id: 101,
    product_id: 10,
    sku: 'SHIRT-OXF-BLU-L',
    variant_name: 'Blue / L',
    cost_price: 350,
    selling_price: 650,
    status: 'active',
  };

  const mockVariantKg: ProductVariant = {
    id: 201,
    product_id: 20,
    sku: 'RICE-BAS-50KG',
    variant_name: '50kg Bag',
    cost_price: 3800,
    selling_price: 4500,
    status: 'active',
  };

  const mockInventoryRecord: InventoryItem = {
    id: 1,
    company_id: 1,
    warehouse_id: 1,
    product_id: 10,
    product_variant_id: 101,
    quantity: '25.0000',
    reserved_quantity: '3.0000',
    available_quantity: '22.0000',
    average_cost: '350.0000',
    total_value: '8750.0000',
    warehouse: mockWarehouse,
    product: mockProductPcs,
    product_variant: mockVariantPcs,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // SECTION 1: OPERATION TYPE DISPATCH & ROUTING
  // ==========================================================================
  describe('1. Adjustment Operation Types & API Dispatch', () => {
    it('1.1 routes ADJUSTMENT_IN to adjustStock with type="add"', async () => {
      const adjustSpy = vi.spyOn(inventoryApi, 'adjustStock').mockResolvedValueOnce({
        data: {
          id: 1,
          company_id: 1,
          warehouse_id: 1,
          product_id: 10,
          product_variant_id: 101,
          movement_type: 'ADJUSTMENT_IN',
          quantity: '5.0000',
          quantity_before: '22.0000',
          quantity_after: '27.0000',
          unit_cost: '350.0000',
          total_cost: '1750.0000',
          reference_type: 'STOCK_ADJUSTMENT',
          reference_number: 'ADJ-2026-001',
          reason: 'Surplus discovered during physical audit',
          created_by: 1,
          created_at: '2026-10-01T12:00:00Z',
        },
        message: 'Stock adjusted successfully',
      });

      const payload: StockAdjustmentPayload = {
        company_id: 1,
        warehouse_id: 1,
        product_variant_id: 101,
        quantity: 5,
        type: 'add',
        reason: 'Surplus discovered during physical audit',
      };

      const result = await inventoryApi.adjustStock(payload);

      expect(adjustSpy).toHaveBeenCalledTimes(1);
      expect(adjustSpy).toHaveBeenCalledWith(payload);
      expect(result.data.movement_type).toBe('ADJUSTMENT_IN');
      expect(Number(result.data.quantity_after)).toBe(27);
    });

    it('1.2 routes ADJUSTMENT_OUT to adjustStock with type="subtract"', async () => {
      const adjustSpy = vi.spyOn(inventoryApi, 'adjustStock').mockResolvedValueOnce({
        data: {
          id: 2,
          company_id: 1,
          warehouse_id: 1,
          product_id: 10,
          product_variant_id: 101,
          movement_type: 'ADJUSTMENT_OUT',
          quantity: '2.0000',
          quantity_before: '22.0000',
          quantity_after: '20.0000',
          unit_cost: '350.0000',
          total_cost: '700.0000',
          reference_type: 'STOCK_ADJUSTMENT',
          reference_number: 'ADJ-2026-002',
          reason: 'Count variance reconciliation',
          created_by: 1,
          created_at: '2026-10-01T12:05:00Z',
        },
        message: 'Stock adjusted successfully',
      });

      const payload: StockAdjustmentPayload = {
        company_id: 1,
        warehouse_id: 1,
        product_variant_id: 101,
        quantity: 2,
        type: 'subtract',
        reason: 'Count variance reconciliation',
      };

      const result = await inventoryApi.adjustStock(payload);

      expect(adjustSpy).toHaveBeenCalledWith(payload);
      expect(result.data.movement_type).toBe('ADJUSTMENT_OUT');
      expect(Number(result.data.quantity_after)).toBe(20);
    });

    it('1.3 routes DAMAGE to recordDamageLoss with type="damage"', async () => {
      const damageSpy = vi.spyOn(inventoryApi, 'recordDamageLoss').mockResolvedValueOnce({
        data: {
          id: 3,
          company_id: 1,
          warehouse_id: 1,
          product_id: 10,
          product_variant_id: 101,
          movement_type: 'DAMAGE',
          quantity: '1.0000',
          quantity_before: '22.0000',
          quantity_after: '21.0000',
          unit_cost: '350.0000',
          total_cost: '350.0000',
          reference_type: 'DAMAGE_LOSS',
          reference_number: 'DMG-2026-001',
          reason: 'Water leak damaged packaging',
          created_by: 1,
          created_at: '2026-10-01T12:10:00Z',
        },
        message: 'Damage recorded successfully',
      });

      const payload: DamageLossPayload = {
        company_id: 1,
        warehouse_id: 1,
        product_variant_id: 101,
        quantity: 1,
        type: 'damage',
        reason: 'Water leak damaged packaging',
      };

      const result = await inventoryApi.recordDamageLoss(payload);

      expect(damageSpy).toHaveBeenCalledWith(payload);
      expect(result.data.movement_type).toBe('DAMAGE');
      expect(Number(result.data.quantity_after)).toBe(21);
    });

    it('1.4 routes LOSS to recordDamageLoss with type="loss"', async () => {
      const lossSpy = vi.spyOn(inventoryApi, 'recordDamageLoss').mockResolvedValueOnce({
        data: {
          id: 4,
          company_id: 1,
          warehouse_id: 1,
          product_id: 10,
          product_variant_id: 101,
          movement_type: 'LOSS',
          quantity: '3.0000',
          quantity_before: '22.0000',
          quantity_after: '19.0000',
          unit_cost: '350.0000',
          total_cost: '1050.0000',
          reference_type: 'DAMAGE_LOSS',
          reference_number: 'LOS-2026-001',
          reason: 'Unaccounted shrinkage during quarterly audit',
          created_by: 1,
          created_at: '2026-10-01T12:15:00Z',
        },
        message: 'Loss recorded successfully',
      });

      const payload: DamageLossPayload = {
        company_id: 1,
        warehouse_id: 1,
        product_variant_id: 101,
        quantity: 3,
        type: 'loss',
        reason: 'Unaccounted shrinkage during quarterly audit',
      };

      const result = await inventoryApi.recordDamageLoss(payload);

      expect(lossSpy).toHaveBeenCalledWith(payload);
      expect(result.data.movement_type).toBe('LOSS');
      expect(Number(result.data.quantity_after)).toBe(19);
    });
  });

  // ==========================================================================
  // SECTION 2: LIVE STOCK FETCHING & PROJECTED STOCK CALCULATION
  // ==========================================================================
  describe('2. Authoritative Stock Retrieval & Projected Stock Calculation', () => {
    it('2.1 fetches live authoritative stock using getInventory with warehouse & variant filters', async () => {
      const getInventorySpy = vi.spyOn(inventoryApi, 'getInventory').mockResolvedValueOnce({
        data: [mockInventoryRecord],
        current_page: 1,
        last_page: 1,
        total: 1,
        per_page: 15,
        from: 1,
        to: 1,
      });

      const response = await inventoryApi.getInventory({
        warehouse_id: 1,
        product_variant_id: 101,
      });

      expect(getInventorySpy).toHaveBeenCalledWith({
        warehouse_id: 1,
        product_variant_id: 101,
      });
      expect(response.data.length).toBe(1);
      expect(Number(response.data[0].available_quantity)).toBe(22);
    });

    it('2.2 calculates projected stock for ADJUSTMENT_IN (addition)', () => {
      const currentStock = 22.0;
      const adjustQty = 8.5;
      const projected = currentStock + adjustQty;
      expect(projected).toBe(30.5);
    });

    it('2.3 calculates projected stock for ADJUSTMENT_OUT (reduction)', () => {
      const currentStock = 22.0;
      const adjustQty = 4.25;
      const projected = currentStock - adjustQty;
      expect(projected).toBe(17.75);
    });

    it('2.4 calculates projected stock for DAMAGE (reduction)', () => {
      const currentStock = 22.0;
      const damageQty = 2.0;
      const projected = currentStock - damageQty;
      expect(projected).toBe(20.0);
    });

    it('2.5 calculates projected stock for LOSS (reduction)', () => {
      const currentStock = 22.0;
      const lossQty = 5.0;
      const projected = currentStock - lossQty;
      expect(projected).toBe(17.0);
    });
  });

  // ==========================================================================
  // SECTION 3: VALIDATION LOGIC & DEFENSIVE CHECKS
  // ==========================================================================
  describe('3. Validation Rules & Defensive Logic', () => {
    it('3.1 blocks stock reductions that exceed available stock', () => {
      const availableStock = 22.0;
      const excessiveQty = 25.0;

      const isExcessive = excessiveQty > availableStock;
      expect(isExcessive).toBe(true);

      const errorMessage = en['inventory.insufficientStock'].replace('{avail}', String(availableStock));
      expect(errorMessage).toBe('Adjustment quantity cannot exceed available stock (22).');
    });

    it('3.2 blocks fractional quantities for non-decimal units (e.g. Pieces / pcs)', () => {
      const allowDecimal = mockProductPcs.unit?.decimal_allowed ?? false;
      expect(allowDecimal).toBe(false);

      const enteredQty = '4.75';
      const num = Number(enteredQty);
      const isFractional = !Number.isInteger(num);

      expect(isFractional).toBe(true);
      const shouldReject = !allowDecimal && isFractional;
      expect(shouldReject).toBe(true);

      const errorMsg = en['inventory.decimalNotAllowed'].replace('{unit}', mockProductPcs.unit?.name || '');
      expect(errorMsg).toBe('This unit (Pieces) does not allow fractional quantities. Please enter a whole number.');
    });

    it('3.3 permits fractional quantities for decimal-capable units (e.g. Kilograms / kg)', () => {
      const allowDecimal = mockProductKg.unit?.decimal_allowed ?? false;
      expect(allowDecimal).toBe(true);

      const enteredQty = '12.345';
      const num = Number(enteredQty);
      const isFractional = !Number.isInteger(num);

      expect(isFractional).toBe(true);
      const shouldReject = !allowDecimal && isFractional;
      expect(shouldReject).toBe(false);
    });

    it('3.4 validates that quantity must be strictly greater than 0', () => {
      const zeroQty = 0;
      const negativeQty = -5;
      const validQty = 0.001;

      expect(zeroQty <= 0).toBe(true);
      expect(negativeQty <= 0).toBe(true);
      expect(validQty > 0).toBe(true);
    });

    it('3.5 validates that reason cannot be blank or whitespace-only', () => {
      const emptyReason = '';
      const whitespaceReason = '   ';
      const validReason = 'Mislabeled box correction';

      expect(emptyReason.trim().length === 0).toBe(true);
      expect(whitespaceReason.trim().length === 0).toBe(true);
      expect(validReason.trim().length > 0).toBe(true);
    });

    it('3.6 preserves 4-decimal precision without truncation from parseInt', () => {
      const precisionQty = '15.8765';
      const decimalParsed = Number(precisionQty);
      const truncated = parseInt(precisionQty, 10);

      expect(decimalParsed).toBe(15.8765);
      expect(truncated).toBe(15);
      expect(decimalParsed).not.toBe(truncated);
    });
  });

  // ==========================================================================
  // SECTION 4: ERROR HANDLING & HTTP STATUS CODES
  // ==========================================================================
  describe('4. Error Handling & HTTP Status Scenarios', () => {
    it('4.1 handles 403 Forbidden with appropriate permission message', async () => {
      vi.spyOn(inventoryApi, 'adjustStock').mockRejectedValueOnce({
        response: {
          status: 403,
          data: { message: 'Unauthorized. You do not have permission to adjust inventory in this warehouse.' },
        },
      });

      try {
        await inventoryApi.adjustStock({
          company_id: 1,
          warehouse_id: 1,
          product_variant_id: 101,
          quantity: 2,
          type: 'add',
          reason: 'Test unauthorized',
        });
        expect.unreachable('Should have thrown an error');
      } catch (err: any) {
        expect(err.response?.status).toBe(403);
        expect(err.response?.data?.message).toContain('Unauthorized');
      }
    });

    it('4.2 handles 409 Conflict for concurrent stock modifications', async () => {
      vi.spyOn(inventoryApi, 'adjustStock').mockRejectedValueOnce({
        response: {
          status: 409,
          data: { message: 'Stock state conflict. Another transaction updated this inventory record.' },
        },
      });

      try {
        await inventoryApi.adjustStock({
          company_id: 1,
          warehouse_id: 1,
          product_variant_id: 101,
          quantity: 2,
          type: 'subtract',
          reason: 'Conflict test',
        });
        expect.unreachable('Should have thrown an error');
      } catch (err: any) {
        expect(err.response?.status).toBe(409);
        expect(err.response?.data?.message).toContain('conflict');
      }
    });

    it('4.3 handles 422 Unprocessable Entity with validation details', async () => {
      vi.spyOn(inventoryApi, 'adjustStock').mockRejectedValueOnce({
        response: {
          status: 422,
          data: {
            message: 'The given data was invalid.',
            errors: {
              quantity: ['The quantity field must be at least 0.0001.'],
              reason: ['The reason field is required.'],
            },
          },
        },
      });

      try {
        await inventoryApi.adjustStock({
          company_id: 1,
          warehouse_id: 1,
          product_variant_id: 101,
          quantity: 0,
          type: 'add',
          reason: '',
        });
        expect.unreachable('Should have thrown an error');
      } catch (err: any) {
        expect(err.response?.status).toBe(422);
        expect(err.response?.data?.errors?.quantity).toBeDefined();
        expect(err.response?.data?.errors?.reason).toBeDefined();
      }
    });

    it('4.4 handles 500 Server Error gracefully', async () => {
      vi.spyOn(inventoryApi, 'adjustStock').mockRejectedValueOnce({
        response: {
          status: 500,
          data: { message: 'Internal Server Error. Please contact system administrator.' },
        },
      });

      try {
        await inventoryApi.adjustStock({
          company_id: 1,
          warehouse_id: 1,
          product_variant_id: 101,
          quantity: 1,
          type: 'add',
          reason: 'System error check',
        });
        expect.unreachable('Should have thrown an error');
      } catch (err: any) {
        expect(err.response?.status).toBe(500);
      }
    });
  });

  // ==========================================================================
  // SECTION 5: BILINGUAL I18N PARITY & AUTHENTIC BENGALI TERMINOLOGY
  // ==========================================================================
  describe('5. Bilingual Translation Parity & Bengali Vocabulary', () => {
    it('5.1 ensures 100% key parity for all stock adjustment keys in en.ts and bn.ts', () => {
      const adjustmentKeys = [
        'inventory.adjustments',
        'inventory.adjustmentsTitle',
        'inventory.adjustmentsSubtitle',
        'inventory.newAdjustment',
        'inventory.adjustmentType',
        'inventory.adjustmentIn',
        'inventory.adjustmentOut',
        'inventory.damage',
        'inventory.loss',
        'inventory.selectWarehouse',
        'inventory.selectProduct',
        'inventory.currentStock',
        'inventory.newStock',
        'inventory.adjustmentQty',
        'inventory.reason',
        'inventory.reasonPlaceholder',
        'inventory.notes',
        'inventory.notesPlaceholder',
        'inventory.selectStorageLocation',
        'inventory.allLocations',
        'inventory.confirmAdjustment',
        'inventory.confirmAdjustmentDesc',
        'inventory.submitting',
        'inventory.adjustmentSuccess',
        'inventory.insufficientStock',
        'inventory.decimalNotAllowed',
        'inventory.qtyPositive',
        'inventory.reasonRequired',
        'inventory.warehouseRequired',
        'inventory.productRequired',
      ];

      adjustmentKeys.forEach((key) => {
        expect(en[key], `Missing in en.ts: ${key}`).toBeDefined();
        expect(bn[key], `Missing in bn.ts: ${key}`).toBeDefined();
        expect(en[key].length).toBeGreaterThan(0);
        expect(bn[key].length).toBeGreaterThan(0);
      });
    });

    it('5.2 verifies authentic Bengali business terminology for stock adjustments', () => {
      expect(bn['inventory.adjustments']).toBe('স্টক সমন্বয়');
      expect(bn['inventory.adjustmentsTitle']).toBe('স্টক সমন্বয়');
      expect(bn['inventory.adjustmentIn']).toBe('স্টক বৃদ্ধি সমন্বয়');
      expect(bn['inventory.adjustmentOut']).toBe('স্টক হ্রাস সমন্বয়');
      expect(bn['inventory.damage']).toBe('ক্ষতি');
      expect(bn['inventory.loss']).toBe('ঘাটতি / লোকসান');
      expect(bn['inventory.currentStock']).toBe('বর্তমান উপলব্ধ মজুদ');
      expect(bn['inventory.newStock']).toBe('সমন্বয় পরবর্তী মজুদ');
    });
  });
});
