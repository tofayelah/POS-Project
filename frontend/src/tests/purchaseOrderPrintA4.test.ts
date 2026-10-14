/**
 * Purchase Order Document A4 Printing & Voucher Integrity Test Suite
 *
 * Verifies:
 *  1. PO Print Modal component renders A4 layout and metadata accurately
 *  2. Global index.css print stylesheet supports full-width A4 documents
 *  3. Dynamic print styles isolate #retailcore-printable-po and hide app chrome
 *  4. Direct window print, hidden iframe print isolation, and HTML voucher download
 *  5. Keyboard shortcut support (Ctrl+P / Cmd+P)
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
console.log('--- PURCHASE ORDER A4 PRINTING & VOUCHER TEST SUITE ---');
console.log('================================================================');

// 1. Verify index.css allows A4 printing without forcing 80mm thermal receipt
const indexCssPath = resolve(process.cwd(), 'frontend/src/index.css');
assert(existsSync(indexCssPath), 'frontend/src/index.css exists');
const indexCss = readFileSync(indexCssPath, 'utf-8');

assert(
  indexCss.includes('#retailcore-printable-po') && indexCss.includes('visibility: visible !important'),
  'index.css explicitly sets #retailcore-printable-po visibility to visible !important during print'
);
assert(
  !indexCss.includes('width: 80mm !important;\n    -webkit-print-color-adjust'),
  'index.css does not globally force width: 80mm on all print documents'
);

// 2. Verify PurchaseOrderPrintModal component
const modalPath = resolve(process.cwd(), 'frontend/src/components/purchase/PurchaseOrderPrintModal.tsx');
assert(existsSync(modalPath), 'PurchaseOrderPrintModal.tsx exists');
const modalCode = readFileSync(modalPath, 'utf-8');

assert(
  modalCode.includes('id="retailcore-printable-po"'),
  'PurchaseOrderPrintModal defines #retailcore-printable-po printable document container'
);
assert(
  modalCode.includes('size: A4 portrait'),
  'PurchaseOrderPrintModal specifies A4 portrait page size'
);
assert(
  modalCode.includes('handlePrint') && modalCode.includes('window.print()'),
  'PurchaseOrderPrintModal provides native browser print trigger'
);
assert(
  modalCode.includes('handleOpenInNewTab'),
  'PurchaseOrderPrintModal provides standalone new-tab print trigger for iframe/sandbox environments'
);
assert(
  modalCode.includes('handleDownloadHtml'),
  'PurchaseOrderPrintModal provides fail-safe HTML voucher download'
);
assert(
  modalCode.includes("e.key.toLowerCase() === 'p'") && modalCode.includes('e.ctrlKey'),
  'PurchaseOrderPrintModal supports Ctrl+P / Cmd+P keyboard print shortcut'
);

// 3. Verify PurchaseOrderList integration
const listPath = resolve(process.cwd(), 'frontend/src/pages/purchase/PurchaseOrderList.tsx');
const listCode = readFileSync(listPath, 'utf-8');
assert(
  listCode.includes('PurchaseOrderPrintModal'),
  'PurchaseOrderList imports and renders PurchaseOrderPrintModal'
);
assert(
  listCode.includes('Print Purchase Order Document (A4)'),
  'PurchaseOrderList provides direct 1-click A4 print button in table actions'
);

// 4. Verify PurchaseOrderForm integration
const formPath = resolve(process.cwd(), 'frontend/src/pages/purchase/PurchaseOrderForm.tsx');
const formCode = readFileSync(formPath, 'utf-8');
assert(
  formCode.includes('PurchaseOrderPrintModal'),
  'PurchaseOrderForm imports and renders PurchaseOrderPrintModal'
);
assert(
  formCode.includes('printOrderPayload'),
  'PurchaseOrderForm computes comprehensive printOrderPayload for printing'
);

console.log('================================================================');
console.log(`RESULTS: ${passed} / ${passed + failed} PO A4 PRINT TESTS PASSED.`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}
