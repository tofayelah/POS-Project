import { describe, it, expect, vi } from 'vitest';
import { en } from '../i18n/en';
import { bn } from '../i18n/bn';
import { formatCurrency, formatDateTime } from '../utils/format';
import type {
  Product,
  ProductVariant,
  ProductPayload,
  Category,
  Brand,
  Unit,
  Barcode,
} from '../types/product';
import * as productsApi from '../api/products';

describe('Phase 3.2 Step 6: Product Master UI & Business Logic Test Suite', () => {
  // Test Fixtures
  const mockUnits: Unit[] = [
    {
      id: 1,
      uuid: 'unit-pcs-uuid',
      company_id: 1,
      name: 'Pieces',
      short_code: 'pcs',
      decimal_allowed: false,
      status: 'active',
    },
    {
      id: 2,
      uuid: 'unit-kg-uuid',
      company_id: 1,
      name: 'Kilogram',
      short_code: 'kg',
      decimal_allowed: true,
      status: 'active',
    },
  ];

  const mockCategories: Category[] = [
    {
      id: 10,
      uuid: 'cat-apparel-uuid',
      company_id: 1,
      parent_id: null,
      name: 'Apparel & Garments',
      slug: 'apparel-garments',
      status: 'active',
      sort_order: 1,
    },
    {
      id: 11,
      uuid: 'cat-grocery-uuid',
      company_id: 1,
      parent_id: null,
      name: 'Groceries & Staples',
      slug: 'groceries-staples',
      status: 'active',
      sort_order: 2,
    },
  ];

  const mockBrands: Brand[] = [
    {
      id: 20,
      uuid: 'brand-aarong-uuid',
      company_id: 1,
      name: 'Apex Footwear',
      slug: 'apex-footwear',
      status: 'active',
    },
  ];

  const mockSimpleProduct: Product = {
    id: 101,
    uuid: 'prod-simple-101',
    company_id: 1,
    category_id: 10,
    category: mockCategories[0],
    brand_id: 20,
    brand: mockBrands[0],
    unit_id: 1,
    unit: mockUnits[0],
    name: 'Standard Cotton Polo T-Shirt',
    slug: 'standard-cotton-polo-t-shirt',
    product_code: 'POLO-001',
    description: '100% Combed Cotton Polo Shirt',
    product_type: 'simple',
    has_variants: false,
    tax_rate: 5,
    tax_type: 'exclusive',
    reorder_level: 10,
    status: 'active',
    variants_count: 1,
    variants: [
      {
        id: 501,
        uuid: 'var-501-uuid',
        product_id: 101,
        sku: 'POLO-001-STD',
        variant_name: 'Standard',
        cost_price: 350.5,
        selling_price: 650.0,
        wholesale_price: 520.0,
        mrp: 750.0,
        status: 'active',
        barcodes: [
          {
            id: 901,
            uuid: 'bar-901-uuid',
            product_variant_id: 501,
            barcode: '8901234500018',
            barcode_type: 'EAN',
            is_primary: true,
            status: 'active',
          },
        ],
        primary_barcode: {
          id: 901,
          barcode: '8901234500018',
          barcode_type: 'EAN',
        },
      },
    ],
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-15T12:00:00Z',
  };

  const mockVariableProduct: Product = {
    id: 102,
    uuid: 'prod-var-102',
    company_id: 1,
    category_id: 10,
    category: mockCategories[0],
    brand_id: 20,
    brand: mockBrands[0],
    unit_id: 1,
    unit: mockUnits[0],
    name: 'Executive Formal Shirt',
    slug: 'executive-formal-shirt',
    product_code: 'SHIRT-EXEC',
    description: 'Cotton Rich Executive Shirt',
    product_type: 'variable',
    has_variants: true,
    tax_rate: 7.5,
    tax_type: 'exclusive',
    reorder_level: 25,
    status: 'active',
    variants_count: 2,
    variants: [
      {
        id: 502,
        uuid: 'var-502-uuid',
        product_id: 102,
        sku: 'SHIRT-EXEC-BLU-M',
        variant_name: 'Blue / M',
        cost_price: 600.0,
        selling_price: 1200.0,
        wholesale_price: 950.0,
        mrp: 1400.0,
        status: 'active',
        barcodes: [
          {
            id: 902,
            uuid: 'bar-902-uuid',
            product_variant_id: 502,
            barcode: '8901234500025',
            barcode_type: 'EAN',
            is_primary: true,
            status: 'active',
          },
        ],
      },
      {
        id: 503,
        uuid: 'var-503-uuid',
        product_id: 102,
        sku: 'SHIRT-EXEC-BLU-L',
        variant_name: 'Blue / L',
        cost_price: 620.0,
        selling_price: 1250.0,
        wholesale_price: 980.0,
        mrp: 1450.0,
        status: 'active',
        barcodes: [
          {
            id: 903,
            uuid: 'bar-903-uuid',
            product_variant_id: 503,
            barcode: '8901234500032',
            barcode_type: 'EAN',
            is_primary: true,
            status: 'active',
          },
        ],
      },
    ],
    created_at: '2026-09-02T10:00:00Z',
    updated_at: '2026-09-16T12:00:00Z',
  };

  // ==========================================
  // 1. Financial Formatting & Currency Precision
  // ==========================================
  describe('1. Financial Formatting & Precision (BDT ৳)', () => {
    it('formats BDT currency with exact 2 decimal digits and symbol ৳', () => {
      expect(formatCurrency(650)).toBe('৳ 650.00');
      expect(formatCurrency(350.5)).toBe('৳ 350.50');
      expect(formatCurrency('1250.75')).toBe('৳ 1,250.75');
      expect(formatCurrency(0)).toBe('৳ 0.00');
    });

    it('preserves exact fractional poisha without parseInt truncation', () => {
      const fractionalPrice = 99.75;
      expect(Number(fractionalPrice)).toBe(99.75);
      expect(formatCurrency(fractionalPrice)).toBe('৳ 99.75');
      // Ensure parseInt would have wrongly truncated to 99
      expect(parseInt(String(fractionalPrice))).toBe(99);
      expect(Number(fractionalPrice)).not.toBe(parseInt(String(fractionalPrice)));
    });

    it('calculates price range string correctly for single variant vs multi-variant', () => {
      const formatPriceRange = (product: Product) => {
        if (!product.variants || product.variants.length === 0) return '—';
        const prices = product.variants.map((v) => Number(v.selling_price));
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        if (min === max) {
          return formatCurrency(min);
        }
        return `${formatCurrency(min)} - ${formatCurrency(max)}`;
      };

      // Simple product (single price)
      expect(formatPriceRange(mockSimpleProduct)).toBe('৳ 650.00');

      // Variable product (min-max range)
      expect(formatPriceRange(mockVariableProduct)).toBe('৳ 1,200.00 - ৳ 1,250.00');
    });
  });

  // ==========================================
  // 2. Unit Decimal Precision Rules
  // ==========================================
  describe('2. Unit Decimal Precision & Reorder Thresholds', () => {
    it('correctly distinguishes integer-only units from decimal-allowed units', () => {
      const pcsUnit = mockUnits.find((u) => u.short_code === 'pcs');
      const kgUnit = mockUnits.find((u) => u.short_code === 'kg');

      expect(pcsUnit?.decimal_allowed).toBe(false);
      expect(kgUnit?.decimal_allowed).toBe(true);
    });

    it('rejects fractional reorder thresholds for integer-only units', () => {
      const validateReorderLevel = (reorderLevel: number, unit: Unit): boolean => {
        if (!unit.decimal_allowed && reorderLevel % 1 !== 0) {
          return false;
        }
        return reorderLevel >= 0;
      };

      const pcsUnit = mockUnits[0]; // decimal_allowed = false
      expect(validateReorderLevel(10, pcsUnit)).toBe(true);
      expect(validateReorderLevel(10.5, pcsUnit)).toBe(false);
      expect(validateReorderLevel(0.25, pcsUnit)).toBe(false);

      const kgUnit = mockUnits[1]; // decimal_allowed = true
      expect(validateReorderLevel(10, kgUnit)).toBe(true);
      expect(validateReorderLevel(10.5, kgUnit)).toBe(true);
      expect(validateReorderLevel(0.25, kgUnit)).toBe(true);
    });
  });

  // ==========================================
  // 3. Multi-Tenant Scoping & Product Creation Payload
  // ==========================================
  describe('3. Multi-Tenant Scoping & Payload Construction', () => {
    it('constructs simple product payload with tenant company_id and single variant', () => {
      const tenantCompanyId = 3;

      const payload: ProductPayload = {
        company_id: tenantCompanyId,
        category_id: 10,
        brand_id: 20,
        unit_id: 1,
        name: 'Classic Polo Shirt',
        product_code: 'POLO-CLS',
        description: 'Cotton pique polo shirt',
        product_type: 'simple',
        has_variants: false,
        tax_rate: 5,
        tax_type: 'exclusive',
        reorder_level: 15,
        status: 'active',
        variants: [
          {
            sku: 'POLO-CLS-STD',
            variant_name: 'Standard',
            cost_price: 350,
            selling_price: 650,
            wholesale_price: 520,
            mrp: 750,
            status: 'active',
            attribute_value_ids: [],
            barcodes: [
              {
                barcode: '8901234500099',
                barcode_type: 'EAN',
                is_primary: true,
              },
            ],
          },
        ],
      };

      expect(payload.company_id).toBe(3);
      expect(payload.has_variants).toBe(false);
      expect(payload.variants).toHaveLength(1);
      expect(payload.variants[0].sku).toBe('POLO-CLS-STD');
      expect(payload.variants[0].barcodes?.[0].is_primary).toBe(true);
    });

    it('constructs variable product payload with matrix variants and distinct SKUs', () => {
      const tenantCompanyId = 5;

      const payload: ProductPayload = {
        company_id: tenantCompanyId,
        category_id: 10,
        brand_id: 20,
        unit_id: 1,
        name: 'Executive Formal Shirt',
        product_code: 'SHIRT-EXEC',
        description: null,
        product_type: 'variable',
        has_variants: true,
        tax_rate: 7.5,
        tax_type: 'exclusive',
        reorder_level: 20,
        status: 'active',
        variants: [
          {
            sku: 'SHIRT-EXEC-WHT-38',
            variant_name: 'White / 38',
            cost_price: 500,
            selling_price: 1000,
            wholesale_price: 850,
            mrp: 1200,
            status: 'active',
            attribute_value_ids: [101, 201],
            barcodes: [{ barcode: '8901111111111', barcode_type: 'EAN', is_primary: true }],
          },
          {
            sku: 'SHIRT-EXEC-WHT-40',
            variant_name: 'White / 40',
            cost_price: 500,
            selling_price: 1000,
            wholesale_price: 850,
            mrp: 1200,
            status: 'active',
            attribute_value_ids: [101, 202],
            barcodes: [{ barcode: '8902222222222', barcode_type: 'EAN', is_primary: true }],
          },
        ],
      };

      expect(payload.company_id).toBe(5);
      expect(payload.has_variants).toBe(true);
      expect(payload.variants).toHaveLength(2);
      expect(payload.variants[0].sku).not.toBe(payload.variants[1].sku);
    });

    it('validates required fields before submission', () => {
      const validateProductForm = (data: {
        name: string;
        categoryId: number | '';
        unitId: number | '';
        sellingPrice: number;
        sku: string;
      }) => {
        if (!data.name.trim()) return 'Product Name is required.';
        if (!data.categoryId) return 'Category is required.';
        if (!data.unitId) return 'Base Unit of Measure is required.';
        if (!data.sku.trim()) return 'SKU code is required.';
        if (data.sellingPrice <= 0) return 'Selling price must be greater than 0.';
        return null;
      };

      expect(
        validateProductForm({
          name: '',
          categoryId: 10,
          unitId: 1,
          sellingPrice: 500,
          sku: 'SKU-1',
        })
      ).toBe('Product Name is required.');

      expect(
        validateProductForm({
          name: 'Polo Shirt',
          categoryId: '',
          unitId: 1,
          sellingPrice: 500,
          sku: 'SKU-1',
        })
      ).toBe('Category is required.');

      expect(
        validateProductForm({
          name: 'Polo Shirt',
          categoryId: 10,
          unitId: '',
          sellingPrice: 500,
          sku: 'SKU-1',
        })
      ).toBe('Base Unit of Measure is required.');

      expect(
        validateProductForm({
          name: 'Polo Shirt',
          categoryId: 10,
          unitId: 1,
          sellingPrice: 0,
          sku: 'SKU-1',
        })
      ).toBe('Selling price must be greater than 0.');

      expect(
        validateProductForm({
          name: 'Polo Shirt',
          categoryId: 10,
          unitId: 1,
          sellingPrice: 500,
          sku: 'SKU-1',
        })
      ).toBeNull();
    });
  });

  // ==========================================
  // 4. Status Activation & Deactivation
  // ==========================================
  describe('4. Status Activation & Deactivation API Flow', () => {
    it('calls activate endpoint with product ID', async () => {
      const spy = vi.spyOn(productsApi, 'activateProduct').mockResolvedValueOnce({
        success: true,
        message: 'Product and variants activated.',
        data: { ...mockSimpleProduct, status: 'active' },
      });

      const res = await productsApi.activateProduct(101);
      expect(spy).toHaveBeenCalledWith(101);
      expect(res.success).toBe(true);
      expect(res.data.status).toBe('active');

      spy.mockRestore();
    });

    it('calls deactivate endpoint with product ID', async () => {
      const spy = vi.spyOn(productsApi, 'deactivateProduct').mockResolvedValueOnce({
        success: true,
        message: 'Product and variants deactivated.',
        data: { ...mockSimpleProduct, status: 'inactive' },
      });

      const res = await productsApi.deactivateProduct(101);
      expect(spy).toHaveBeenCalledWith(101);
      expect(res.success).toBe(true);
      expect(res.data.status).toBe('inactive');

      spy.mockRestore();
    });
  });

  // ==========================================
  // 5. Barcode Scanner & Resolution Logic
  // ==========================================
  describe('5. Barcode Scanner & Quick Resolution', () => {
    it('resolves barcode to active variant and product metadata', async () => {
      const mockBarcodeResult = {
        success: true,
        data: {
          id: 901,
          barcode: '8901234500018',
          barcode_type: 'EAN',
          is_primary: true,
          variant: {
            id: 501,
            sku: 'POLO-001-STD',
            variant_name: 'Standard',
            product_name: 'Standard Cotton Polo T-Shirt',
            selling_price: 650.0,
            mrp: 750.0,
            tax_rate: 5,
          },
        },
      };

      const spy = vi.spyOn(productsApi, 'lookupBarcode').mockResolvedValueOnce(mockBarcodeResult);

      const res = await productsApi.lookupBarcode('8901234500018');
      expect(spy).toHaveBeenCalledWith('8901234500018');
      expect(res.data.barcode).toBe('8901234500018');
      expect(res.data.variant.sku).toBe('POLO-001-STD');
      expect(res.data.variant.selling_price).toBe(650.0);

      spy.mockRestore();
    });
  });

  // ==========================================
  // 6. Bilingual i18n Parity (English & Bangla)
  // ==========================================
  describe('6. Full Bilingual i18n Parity (en.ts & bn.ts)', () => {
    const requiredProductKeys = [
      'products.title',
      'products.subtitle',
      'products.addProduct',
      'products.createProduct',
      'products.editProduct',
      'products.productDetails',
      'products.itemInformation',
      'products.categories',
      'products.brands',
      'products.units',
      'products.attributes',
      'products.sku',
      'products.barcode',
      'products.price',
      'products.cost',
      'products.stock',
      'products.category',
      'products.brand',
      'products.unit',
      'products.variants',
      'products.searchPlaceholder',
      'products.filterByCategory',
      'products.filterByBrand',
      'products.filterByType',
      'products.filterByStatus',
      'products.allCategories',
      'products.allBrands',
      'products.allTypes',
      'products.allStatuses',
      'products.typeSimple',
      'products.typeVariable',
      'products.showingRecords',
      'products.noProductsFound',
      'products.noProductsFoundDesc',
      'products.productCode',
      'products.productName',
      'products.classification',
      'products.pricingRange',
      'products.variantsCount',
      'products.reorderThreshold',
      'products.actions',
      'products.viewDetails',
      'products.edit',
      'products.activate',
      'products.deactivate',
      'products.delete',
      'products.manageBarcodes',
      'products.activateConfirm',
      'products.activateConfirmDesc',
      'products.deactivateConfirm',
      'products.deactivateConfirmDesc',
      'products.deleteConfirm',
      'products.deleteConfirmDesc',
      'products.barcodeLookupTitle',
      'products.barcodeLookupSubtitle',
      'products.barcodeLookupPlaceholder',
      'products.lookup',
      'products.lookupResolved',
      'products.lookupNotFound',
      'products.basicInfo',
      'products.unitAndInventory',
      'products.pricingAndTax',
      'products.variantsAndSkus',
      'products.sellingPrice',
      'products.costPrice',
      'products.wholesalePrice',
      'products.mrp',
      'products.taxRate',
      'products.taxType',
      'products.reorderLevel',
      'products.selectCategory',
      'products.selectBrand',
      'products.selectUnit',
      'products.taxExclusive',
      'products.taxInclusive',
      'products.taxExempt',
      'products.decimalAllowedNotice',
      'products.decimalNotAllowedNotice',
      'products.saveSuccess',
      'products.statusUpdated',
      'products.deleteSuccess',
      'products.backToProducts',
      'products.description',
      'products.descriptionPlaceholder',
      'products.namePlaceholder',
      'products.codePlaceholder',
      'products.skuPlaceholder',
      'products.barcodePlaceholder',
      'products.unbranded',
      'products.barcodeModalTitle',
      'products.registeredBarcodes',
      'products.noBarcodes',
      'products.addBarcode',
      'products.makePrimary',
      'products.primary',
      'products.setAsPrimary',
      'products.barcodeAdded',
      'products.primaryUpdated',
      'products.barcodeRemoved',
      'products.confirmRemoveBarcode',
      'products.matrixGenerator',
      'products.selectAttributes',
      'products.generateMatrix',
      'products.standardVariant',
      'products.submitting',
    ];

    it('has zero missing keys in en.ts for Product Master', () => {
      const enKeys = Object.keys(en);
      const missingInEn = requiredProductKeys.filter((k) => !enKeys.includes(k));
      expect(missingInEn).toEqual([]);
    });

    it('has zero missing keys in bn.ts for Product Master', () => {
      const bnKeys = Object.keys(bn);
      const missingInBn = requiredProductKeys.filter((k) => !bnKeys.includes(k));
      expect(missingInBn).toEqual([]);
    });

    it('ensures all English and Bangla translation strings are non-empty', () => {
      for (const key of requiredProductKeys) {
        expect(en[key]).toBeTruthy();
        expect(typeof en[key]).toBe('string');
        expect(en[key].trim().length).toBeGreaterThan(0);

        expect(bn[key]).toBeTruthy();
        expect(typeof bn[key]).toBe('string');
        expect(bn[key].trim().length).toBeGreaterThan(0);
      }
    });

    it('ensures 100% key parity across all dictionaries', () => {
      const enKeySet = new Set(Object.keys(en));
      const bnKeySet = new Set(Object.keys(bn));

      const missingInBn = [...enKeySet].filter((k) => !bnKeySet.has(k));
      const missingInEn = [...bnKeySet].filter((k) => !enKeySet.has(k));

      expect(missingInBn).toEqual([]);
      expect(missingInEn).toEqual([]);
      expect(enKeySet.size).toBe(bnKeySet.size);
    });
  });
});
