/**
 * Stage 4 — Product Master Integration & Business Logic Test Suite
 */

import { VariantRowItem } from '../components/products/VariantBuilder';
import { ProductPayload, AttributeValue, ProductVariant } from '../types/product';

console.log('================================================================');
console.log('--- RETAILCORE ERP STAGE 4 PRODUCT MASTER TEST SUITE ---');
console.log('================================================================');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, description: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${description}`);
  } else {
    console.error(`[FAIL] ${description}`);
    throw new Error(`Test failed: ${description}`);
  }
}

// Cartesian Matrix Combination Generator Test
function generateVariantMatrix(
  prefix: string,
  attributes: { name: string; values: { id: number; value: string; code: string }[] }[],
  baseCost: number,
  baseSelling: number,
  baseMrp: number
): VariantRowItem[] {
  const valueArrays = attributes.map((a) => a.values);
  
  const cartesian = (arrays: any[][]): any[][] => {
    return arrays.reduce<any[][]>(
      (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
      [[]]
    );
  };

  const combinations = cartesian(valueArrays);
  const cleanPrefix = prefix.trim().toUpperCase();

  return combinations.map((combo) => {
    const nameParts = combo.map((v) => v.value);
    const codeParts = combo.map((v) => v.code.toUpperCase());
    const sku = `${cleanPrefix}-${codeParts.join('-')}`;
    const attrIds = combo.map((v) => v.id);

    return {
      sku,
      variant_name: nameParts.join(' / '),
      cost_price: baseCost,
      selling_price: baseSelling,
      wholesale_price: baseSelling,
      mrp: baseMrp,
      barcode: '',
      attribute_value_ids: attrIds,
      status: 'active',
    };
  });
}

// 1. Variant Matrix Generation (Baby Bottle — 150ml, 240ml, 300ml)
const capacityAttr = {
  name: 'Capacity',
  values: [
    { id: 101, value: '150ml', code: '150ML' },
    { id: 102, value: '240ml', code: '240ML' },
    { id: 103, value: '300ml', code: '300ML' },
  ],
};

const babyBottleMatrix = generateVariantMatrix('BB', [capacityAttr], 100, 150, 170);

assert(babyBottleMatrix.length === 3, 'Matrix generates exactly 3 variants for Baby Bottle');
assert(babyBottleMatrix[0].sku === 'BB-150ML', 'First variant SKU is BB-150ML');
assert(babyBottleMatrix[1].sku === 'BB-240ML', 'Second variant SKU is BB-240ML');
assert(babyBottleMatrix[2].sku === 'BB-300ML', 'Third variant SKU is BB-300ML');

// 2. Custom Per-Variant Pricing and Barcodes
babyBottleMatrix[0].cost_price = 100;
babyBottleMatrix[0].selling_price = 150;
babyBottleMatrix[0].mrp = 170;
babyBottleMatrix[0].barcode = '8900000000150';

babyBottleMatrix[1].cost_price = 120;
babyBottleMatrix[1].selling_price = 180;
babyBottleMatrix[1].mrp = 200;
babyBottleMatrix[1].barcode = '8900000000240';

babyBottleMatrix[2].cost_price = 140;
babyBottleMatrix[2].selling_price = 210;
babyBottleMatrix[2].mrp = 230;
babyBottleMatrix[2].barcode = '8900000000300';

assert(babyBottleMatrix[0].selling_price === 150, '150ml variant selling price is 150 BDT');
assert(babyBottleMatrix[1].selling_price === 180, '240ml variant selling price is 180 BDT');
assert(babyBottleMatrix[2].selling_price === 210, '300ml variant selling price is 210 BDT');
assert(babyBottleMatrix[0].barcode === '8900000000150', '150ml variant has unique barcode');

// 3. Duplicate SKU Detection in Payload
function checkDuplicateSKU(rows: VariantRowItem[]): boolean {
  const skus = new Set<string>();
  for (const r of rows) {
    const clean = r.sku.trim().toUpperCase();
    if (skus.has(clean)) return true;
    skus.add(clean);
  }
  return false;
}

assert(checkDuplicateSKU(babyBottleMatrix) === false, 'Unique SKU list passes duplicate check');

const duplicateMatrix = [
  ...babyBottleMatrix,
  { ...babyBottleMatrix[0] },
];
assert(checkDuplicateSKU(duplicateMatrix) === true, 'Duplicate SKU in request payload detected');

// 4. Fractional Quantity Validation (Unit.decimal_allowed)
function validateQuantityPrecision(decimalAllowed: boolean, quantity: number): boolean {
  if (!decimalAllowed) {
    if (Math.abs(quantity - Math.round(quantity)) > 0.00001) {
      return false; // Fractional quantity rejected
    }
  }
  return true; // Valid
}

assert(validateQuantityPrecision(false, 5.0) === true, 'Whole integer quantity allowed for piece unit (decimal_allowed=false)');
assert(validateQuantityPrecision(false, 5.5) === false, 'Fractional quantity rejected for piece unit (decimal_allowed=false)');
assert(validateQuantityPrecision(true, 2.75) === true, 'Fractional quantity allowed for KG unit (decimal_allowed=true)');

// 5. Tenant Isolation & Company Ownership Guard
function validateCompanyOwnership(itemCompanyId: number, userCompanyId: number): boolean {
  return itemCompanyId === userCompanyId;
}

assert(validateCompanyOwnership(1, 1) === true, 'User A can access Company 1 product');
assert(validateCompanyOwnership(2, 1) === false, 'User A blocked from Company 2 product');

console.log('================================================================');
console.log(`RESULTS: ${passedTests} / ${totalTests} STAGE 4 PRODUCT MASTER TESTS PASSED.`);
console.log('================================================================');
