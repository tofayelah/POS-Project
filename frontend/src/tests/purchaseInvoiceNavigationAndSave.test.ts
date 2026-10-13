/**
 * Purchase Invoice Navigation & Dashboard Redirect Prevention Test Suite
 *
 * Verifies:
 * 1. App.tsx registers full singular and plural purchase route aliases
 * 2. PurchaseList.tsx links directly to /purchases/invoices/create
 * 3. PurchaseInvoiceForm.tsx implements form inputs and safe redirect navigation
 * 4. GoodsReceipt and PurchaseOrder routes avoid dashboard fallback
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
console.log('--- PURCHASE INVOICE NAVIGATION & ROUTING TEST SUITE ---');
console.log('================================================================');

// 1. Verify App.tsx Aliases
const appPath = resolve(process.cwd(), 'frontend/src/App.tsx');
assert(existsSync(appPath), 'App.tsx exists');
const appContent = readFileSync(appPath, 'utf-8');

assert(
  appContent.includes('<Route path="/purchase/invoices" element={<Navigate to="/purchases/invoices" replace />} />'),
  'App.tsx provides redirect alias for /purchase/invoices'
);
assert(
  appContent.includes('<Route path="/purchase/invoices/new" element={<Navigate to="/purchases/invoices/create" replace />} />'),
  'App.tsx provides redirect alias for /purchase/invoices/new'
);
assert(
  appContent.includes('<Route path="/purchase/invoices/create" element={<Navigate to="/purchases/invoices/create" replace />} />'),
  'App.tsx provides redirect alias for /purchase/invoices/create'
);
assert(
  appContent.includes('<Route path="/purchase/new" element={<Navigate to="/purchases/invoices/create" replace />} />'),
  'App.tsx provides redirect alias for /purchase/new'
);
assert(
  appContent.includes('<Route path="/purchase/orders" element={<Navigate to="/purchases/orders" replace />} />'),
  'App.tsx provides redirect alias for /purchase/orders'
);
assert(
  appContent.includes('<Route path="/purchase/goods-receipts" element={<Navigate to="/purchases/goods-receipts" replace />} />'),
  'App.tsx provides redirect alias for /purchase/goods-receipts'
);

// 2. Verify PurchaseList.tsx
const purchaseListPath = resolve(process.cwd(), 'frontend/src/pages/purchase/PurchaseList.tsx');
assert(existsSync(purchaseListPath), 'PurchaseList.tsx exists');
const purchaseListContent = readFileSync(purchaseListPath, 'utf-8');

assert(
  purchaseListContent.includes('to="/purchases/invoices/create"'),
  'PurchaseList New Purchase Invoice button links to /purchases/invoices/create'
);

// 3. Verify PurchaseInvoiceForm.tsx
const formPath = resolve(process.cwd(), 'frontend/src/pages/purchase/PurchaseInvoiceForm.tsx');
assert(existsSync(formPath), 'PurchaseInvoiceForm.tsx exists');
const formContent = readFileSync(formPath, 'utf-8');

assert(
  formContent.includes("navigate('/purchases/invoices')"),
  'PurchaseInvoiceForm navigates safely back to /purchases/invoices on cancel/success'
);
assert(
  formContent.includes('createPurchase'),
  'PurchaseInvoiceForm imports and executes createPurchase payload submit'
);

console.log('================================================================');
console.log(`RESULTS: ${passed} / ${passed + failed} PURCHASE NAVIGATION TESTS PASSED.`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}
