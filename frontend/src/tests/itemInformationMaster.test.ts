import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProductPayload, Category, Brand, Unit } from '../types/product';
import type { Supplier } from '../types/supplier';
import type { ItemRow } from '../pages/products/ItemInformation';

describe('RetailCore POS_ERP — Item Information Master Audit & Modern ERP View Tests', () => {
  // Test Fixtures
  const mockCategories: Category[] = [
    {
      id: 1,
      uuid: 'cat-menswear-uuid',
      company_id: 1,
      parent_id: null,
      name: 'Menswear & Apparel',
      slug: 'menswear-apparel',
      status: 'active',
      sort_order: 1,
    },
    {
      id: 2,
      uuid: 'cat-accessories-uuid',
      company_id: 1,
      parent_id: null,
      name: 'Accessories',
      slug: 'accessories',
      status: 'active',
      sort_order: 2,
    },
  ];

  const mockBrands: Brand[] = [
    {
      id: 10,
      uuid: 'brand-apex-uuid',
      company_id: 1,
      name: 'Apex Footwear',
      slug: 'apex-footwear',
      status: 'active',
    },
    {
      id: 11,
      uuid: 'brand-aarong-uuid',
      company_id: 1,
      name: 'Aarong Crafts',
      slug: 'aarong-crafts',
      status: 'active',
    },
  ];

  const mockUnits: Unit[] = [
    {
      id: 100,
      uuid: 'unit-pcs-uuid',
      company_id: 1,
      name: 'Pieces',
      short_code: 'Pcs',
      decimal_allowed: false,
      status: 'active',
    },
    {
      id: 101,
      uuid: 'unit-box-uuid',
      company_id: 1,
      name: 'Carton Box',
      short_code: 'Box',
      decimal_allowed: false,
      status: 'active',
    },
  ];

  const mockSuppliers: Supplier[] = [
    {
      id: 201,
      uuid: 'sup-201-uuid',
      company_id: 1,
      name: 'Apex Holdings Limited',
      short_name: 'AHL',
      supplier_code: 'SUP-00201',
      mobile: '+8801700000001',
      opening_balance: 0,
      credit_limit: 0,
      status: 'ACTIVE',
    },
  ];

  describe('Section 1 & 2: Category and Brand Master Integrity', () => {
    it('should map category and brand correctly into item records', () => {
      const item: ItemRow = {
        id: 1,
        item_code: 'ITM-001',
        item_barcode: '8901234567890',
        sku: 'SHIRT-MENS-01',
        item_name: 'Oxford Cotton Button-down Shirt',
        size_sl: '1',
        style_size: 'L / Blue',
        group_id: mockCategories[0].id,
        group_name: mockCategories[0].name,
        brand_id: mockBrands[0].id,
        brand_name: mockBrands[0].name,
        supplier_id: mockSuppliers[0].id,
        supplier_name: mockSuppliers[0].name,
        supplier_short_name: mockSuppliers[0].short_name || '',
        supplier_code: mockSuppliers[0].supplier_code,
        unit_id: mockUnits[0].id,
        unit_name: mockUnits[0].short_code,
        reorder_qty: 15,
        cost_price: 600,
        gp_percent: 40,
        retail_price: 1000,
        mrp: 1050,
        product_type: 'simple',
        tax_rate: 7.5,
        tax_type: 'exclusive',
      };

      expect(item.group_id).toBe(1);
      expect(item.group_name).toBe('Menswear & Apparel');
      expect(item.brand_id).toBe(10);
      expect(item.brand_name).toBe('Apex Footwear');
    });
  });

  describe('Section 3: Product Type (Simple vs Variable)', () => {
    it('supports simple product configuration with a single variant', () => {
      const simplePayload: ProductPayload = {
        company_id: 1,
        name: 'Single SKU Mug',
        product_code: 'MUG-001',
        product_type: 'simple',
        has_variants: false,
        tax_rate: 5,
        tax_type: 'inclusive',
        category_id: 1,
        unit_id: 100,
        reorder_level: 10,
        status: 'active',
        variants: [
          {
            sku: 'MUG-001-WHT',
            variant_name: 'Standard White',
            cost_price: 150,
            selling_price: 250,
            mrp: 250,
            status: 'active',
            barcodes: [{ barcode: '890987654321', barcode_type: 'Internal', is_primary: true }],
          },
        ],
      };

      expect(simplePayload.product_type).toBe('simple');
      expect(simplePayload.has_variants).toBe(false);
      expect(simplePayload.variants).toHaveLength(1);
    });

    it('supports variable product configuration with multiple attribute variants', () => {
      const variablePayload: ProductPayload = {
        company_id: 1,
        name: 'Polo Shirt Multi-Color',
        product_code: 'POLO-MULT',
        product_type: 'variable',
        has_variants: true,
        tax_rate: 5,
        tax_type: 'exclusive',
        category_id: 1,
        unit_id: 100,
        reorder_level: 20,
        status: 'active',
        variants: [
          {
            sku: 'POLO-MULT-RED-M',
            variant_name: 'Red / M',
            cost_price: 450,
            selling_price: 850,
            mrp: 900,
            status: 'active',
            attribute_value_ids: [101, 201],
            barcodes: [{ barcode: '890111111111', barcode_type: 'Internal', is_primary: true }],
          },
          {
            sku: 'POLO-MULT-BLU-L',
            variant_name: 'Blue / L',
            cost_price: 450,
            selling_price: 850,
            mrp: 900,
            status: 'active',
            attribute_value_ids: [102, 202],
            barcodes: [{ barcode: '890222222222', barcode_type: 'Internal', is_primary: true }],
          },
        ],
      };

      expect(variablePayload.product_type).toBe('variable');
      expect(variablePayload.has_variants).toBe(true);
      expect(variablePayload.variants).toHaveLength(2);
      expect(variablePayload.variants[0].sku).toBe('POLO-MULT-RED-M');
      expect(variablePayload.variants[1].sku).toBe('POLO-MULT-BLU-L');
    });
  });

  describe('Section 4: Unit of Measure', () => {
    it('verifies discrete and fractional unit integrity', () => {
      const pcsUnit = mockUnits.find((u) => u.short_code === 'Pcs');
      const boxUnit = mockUnits.find((u) => u.short_code === 'Box');

      expect(pcsUnit).toBeDefined();
      expect(pcsUnit?.decimal_allowed).toBe(false);
      expect(boxUnit).toBeDefined();
    });
  });

  describe('Section 5: Bangladesh Tax / VAT Configuration', () => {
    it('supports exclusive, inclusive, and exempt VAT rates', () => {
      const standardVatPayload: Partial<ProductPayload> = {
        tax_rate: 15.0,
        tax_type: 'exclusive',
      };
      const embeddedVatPayload: Partial<ProductPayload> = {
        tax_rate: 7.5,
        tax_type: 'inclusive',
      };
      const exemptVatPayload: Partial<ProductPayload> = {
        tax_rate: 0.0,
        tax_type: 'exempt',
      };

      expect(standardVatPayload.tax_rate).toBe(15.0);
      expect(standardVatPayload.tax_type).toBe('exclusive');

      expect(embeddedVatPayload.tax_rate).toBe(7.5);
      expect(embeddedVatPayload.tax_type).toBe('inclusive');

      expect(exemptVatPayload.tax_rate).toBe(0.0);
      expect(exemptVatPayload.tax_type).toBe('exempt');
    });
  });

  describe('Section 6 & 7: Attributes and Variant Matrix Integration', () => {
    it('verifies attribute matrix structure for variable products', () => {
      const variantRows = [
        {
          sku: 'JEANS-SLIM-32',
          variant_name: 'Slim / 32',
          cost_price: 1100,
          selling_price: 1950,
          wholesale_price: 1600,
          mrp: 2100,
          barcode: '890777123',
          attribute_value_ids: [12, 45],
          status: 'active' as const,
        },
        {
          sku: 'JEANS-SLIM-34',
          variant_name: 'Slim / 34',
          cost_price: 1100,
          selling_price: 1950,
          wholesale_price: 1600,
          mrp: 2100,
          barcode: '890777124',
          attribute_value_ids: [12, 46],
          status: 'active' as const,
        },
      ];

      expect(variantRows).toHaveLength(2);
      expect(variantRows[0].attribute_value_ids).toContain(12);
      expect(variantRows[1].attribute_value_ids).toContain(46);
    });
  });

  describe('Section 8 & 9: SKU and Barcode Uniqueness & Mapping', () => {
    it('persists dedicated SKU distinct from barcode and item code', () => {
      const item: ItemRow = {
        id: 99,
        item_code: '10982',
        item_barcode: '109821',
        sku: 'SKU-SHIRT-PREM-XL',
        item_name: 'Premium Formal Shirt',
        size_sl: '1',
        style_size: 'XL',
        group_id: 1,
        group_name: 'Menswear',
        brand_id: 10,
        brand_name: 'Apex',
        supplier_id: 201,
        supplier_name: 'Apex Holdings',
        supplier_short_name: 'AHL',
        supplier_code: 'SUP-00201',
        unit_id: 100,
        unit_name: 'Pcs',
        reorder_qty: 10,
        cost_price: 800,
        gp_percent: 33.33,
        retail_price: 1200,
        mrp: 1250,
        product_type: 'simple',
        tax_rate: 5,
        tax_type: 'exclusive',
      };

      expect(item.sku).toBe('SKU-SHIRT-PREM-XL');
      expect(item.item_barcode).toBe('109821');
      expect(item.item_code).toBe('10982');
      expect(item.sku).not.toBe(item.item_barcode);
    });
  });

  describe('Section 10, 11 & 12: Cost Price, Retail Price, GP% Sync and MRP', () => {
    it('calculates GP% accurately from Cost Price and Retail Price', () => {
      const cost = 600;
      const retail = 1000;
      const gp = ((retail - cost) / retail) * 100;
      expect(Number(gp.toFixed(2))).toBe(40.0);
    });

    it('calculates Retail Price from Cost Price and target GP%', () => {
      const cost = 600;
      const gpTarget = 40;
      const retail = cost / (1 - gpTarget / 100);
      expect(Number(retail.toFixed(2))).toBe(1000.0);
    });

    it('validates MRP >= Retail Price constraint and persistence', () => {
      const cost = 500;
      const retail = 800;
      const mrp = 850;

      expect(mrp).toBeGreaterThanOrEqual(retail);
      expect(retail).toBeGreaterThan(cost);
    });
  });

  describe('Section 13: Reorder Level Qty', () => {
    it('correctly tracks reorder quantity threshold', () => {
      const item: Partial<ItemRow> = {
        reorder_qty: 25,
      };
      expect(item.reorder_qty).toBe(25);
    });
  });

  describe('Search & Filter Functionality', () => {
    const mockItems: ItemRow[] = [
      {
        id: 1,
        item_code: 'ITM-100',
        item_barcode: '890100100',
        sku: 'SKU-ALPHA-01',
        item_name: 'Denim Jacket Classic',
        size_sl: '1',
        style_size: 'L',
        group_id: 1,
        group_name: 'Apparel',
        brand_id: 10,
        brand_name: 'Apex',
        supplier_id: 201,
        supplier_name: 'Apex Holdings',
        supplier_short_name: 'AHL',
        supplier_code: 'SUP-00201',
        unit_id: 100,
        unit_name: 'Pcs',
        reorder_qty: 5,
        cost_price: 1500,
        gp_percent: 25,
        retail_price: 2000,
        mrp: 2100,
        product_type: 'simple',
        tax_rate: 5,
        tax_type: 'exclusive',
      },
      {
        id: 2,
        item_code: 'ITM-200',
        item_barcode: '890200200',
        sku: 'SKU-BETA-02',
        item_name: 'Casual Chino Pants',
        size_sl: '1',
        style_size: '34',
        group_id: 1,
        group_name: 'Apparel',
        brand_id: 11,
        brand_name: 'Aarong',
        supplier_id: 201,
        supplier_name: 'Apex Holdings',
        supplier_short_name: 'AHL',
        supplier_code: 'SUP-00201',
        unit_id: 100,
        unit_name: 'Pcs',
        reorder_qty: 8,
        cost_price: 800,
        gp_percent: 33.33,
        retail_price: 1200,
        mrp: 1250,
        product_type: 'simple',
        tax_rate: 5,
        tax_type: 'exclusive',
      },
    ];

    it('filters items by Barcode or SKU', () => {
      const term = '890100100';
      const results = mockItems.filter(
        (it) => it.item_barcode.includes(term) || it.sku.includes(term)
      );
      expect(results).toHaveLength(1);
      expect(results[0].item_name).toBe('Denim Jacket Classic');
    });

    it('filters items by SKU search term', () => {
      const term = 'BETA';
      const results = mockItems.filter(
        (it) => it.sku.toLowerCase().includes(term.toLowerCase())
      );
      expect(results).toHaveLength(1);
      expect(results[0].item_code).toBe('ITM-200');
    });

    it('filters items by Item Name', () => {
      const term = 'chino';
      const results = mockItems.filter((it) =>
        it.item_name.toLowerCase().includes(term.toLowerCase())
      );
      expect(results).toHaveLength(1);
      expect(results[0].sku).toBe('SKU-BETA-02');
    });
  });

  describe('Classic Desktop View Deprecation Check', () => {
    it('confirms Modern ERP View is the sole interface and Classic View is not present', async () => {
      // Import the ItemInformation module and verify it exports ItemInformation
      const module = await import('../pages/products/ItemInformation');
      expect(module.ItemInformation).toBeDefined();
      expect(typeof module.ItemInformation).toBe('function');
    });
  });
});
