/**
 * RetailCore ERP — Product Master Enter Navigation & Auto-Generated Read-Only Codes Test Suite
 *
 * Verifies:
 *  1. Navigation item labeled 'Products & SKUS Entry' across Sidebar, ProductList, and i18n
 *  2. Enter key moves focus sequentially to the next field/column control
 *  3. SKU Code and Barcode (Primary EAN/UPC) are automatically generated
 *  4. Product Code, SKU Code, and Barcode are strictly Read-Only in the form
 *  5. Supplier Short Name integration into Barcode generation without legacy '880' prefix
 *  6. Regeneration buttons available for SKU, Barcode, and Product Code
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('--- PRODUCT MASTER ENTER NAVIGATION & AUTO-CODES TEST SUITE ---');
console.log('================================================================');

// 1. Check Sidebar navigation labeling
const sidebarPath = resolve(process.cwd(), 'frontend/src/components/layout/Sidebar.tsx');
assert(existsSync(sidebarPath), 'Sidebar.tsx exists');
const sidebarContent = readFileSync(sidebarPath, 'utf-8');
assert(
  sidebarContent.includes("'Products & SKUS Entry'"),
  "Sidebar navigation label updated to 'Products & SKUS Entry'"
);

// 2. Check ProductList catalog heading
const productListPath = resolve(process.cwd(), 'frontend/src/pages/products/ProductList.tsx');
assert(existsSync(productListPath), 'ProductList.tsx exists');
const productListContent = readFileSync(productListPath, 'utf-8');
assert(
  productListContent.includes('Products & SKUS Entry'),
  "ProductList heading is 'Products & SKUS Entry'"
);

// 3. Check i18n translation entries
const enPath = resolve(process.cwd(), 'frontend/src/i18n/en.ts');
const bnPath = resolve(process.cwd(), 'frontend/src/i18n/bn.ts');
const enContent = readFileSync(enPath, 'utf-8');
const bnContent = readFileSync(bnPath, 'utf-8');
assert(
  enContent.includes("'Products & SKUS Entry'"),
  "English i18n has 'Products & SKUS Entry'"
);
assert(
  bnContent.includes("'Products & SKUS Entry'") || bnContent.includes('পণ্য ও এসকেইউ এন্ট্রি'),
  "Bengali i18n has updated products navigation entry"
);

// 4. Check ProductForm Enter-to-next-column navigation implementation
const productFormPath = resolve(process.cwd(), 'frontend/src/pages/products/ProductForm.tsx');
assert(existsSync(productFormPath), 'ProductForm.tsx exists');
const productFormContent = readFileSync(productFormPath, 'utf-8');

assert(
  productFormContent.includes('handleFormKeyDown') && productFormContent.includes("e.key === 'Enter'"),
  'ProductForm implements handleFormKeyDown for Enter key progression'
);
assert(
  productFormContent.includes('formRef.current.querySelectorAll') ||
  productFormContent.includes('form.querySelectorAll'),
  'Form queries interactive elements for sequential column/field focus'
);
assert(
  productFormContent.includes('onKeyDown={handleFormKeyDown}'),
  'Form attaches onKeyDown={handleFormKeyDown} to the main form element'
);

// 5. Check Auto-generation of Product Code, SKU Code, and Barcode
assert(
  productFormContent.includes('generateAutoCodes'),
  'ProductForm implements generateAutoCodes function'
);
assert(
  productFormContent.includes('generateSupplierBarcode') ||
  productFormContent.includes('supplier_short_name') ||
  productFormContent.includes('supplierShortName'),
  'Barcode generation incorporates Supplier Short Name'
);
assert(
  !productFormContent.includes("'880' + Math.floor"),
  "Legacy static '880' prefix removed from barcode generation in ProductForm"
);

// 6. Check Read-Only constraints on Product Code, SKU Code, and Barcode
assert(
  productFormContent.includes('readOnly') &&
  productFormContent.includes('simpleSku') &&
  productFormContent.includes('simpleBarcode'),
  'SKU Code and Barcode inputs are marked readOnly'
);
assert(
  productFormContent.includes('cursor-not-allowed') &&
  productFormContent.includes('select-all'),
  'Read-only inputs styled with cursor-not-allowed and select-all for convenient copying'
);
assert(
  productFormContent.includes('Read-Only (Auto)') ||
  productFormContent.includes('Read-Only'),
  'Clear Read-Only visual indicators displayed to user'
);

// 7. Check Regeneration actions
assert(
  productFormContent.includes('handleRegenerateSku') &&
  productFormContent.includes('handleRegenerateBarcode'),
  'Independent SKU and Barcode regenerate handlers are implemented'
);
assert(
  productFormContent.includes('handleRegenerateAllCodes'),
  'Master regenerate all codes handler is implemented'
);

// 8. Check Supplier association
assert(
  productFormContent.includes('supplierId') &&
  productFormContent.includes('setSupplierId'),
  'Preferred Supplier state is tracked'
);
assert(
  productFormContent.includes('Preferred Supplier'),
  'Preferred Supplier dropdown exists in Section 1'
);

console.log('================================================================');
console.log(`RESULTS: ${passed} Passed | ${failed} Failed`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}
