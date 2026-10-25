/**
 * Purchase Voucher A4 Printing & Modern ERP Voucher Format Test Suite
 *
 * Verifies:
 * 1. PurchaseVoucherPrintModal component renders modern ERP voucher format
 * 2. Document specifies A4 portrait page size (@page { size: A4 portrait; })
 * 3. index.css print stylesheet isolates #retailcore-printable-voucher and renders visible
 * 4. Multi-path printing triggers: Direct print, Standalone new-tab print, and HTML download
 * 5. Keyboard shortcut support (Ctrl+P / Cmd+P)
 * 6. Executive ERP voucher components: 4-signature block, vendor/warehouse cards, BDT words, breakdown
 * 7. Seamless integration in PurchaseInvoiceForm.tsx
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
console.log('--- PURCHASE VOUCHER A4 PRINTING & ERP FORMAT TEST SUITE ---');
console.log('================================================================');

// 1. Verify index.css allows Purchase Voucher A4 printing
const indexCssPath = resolve(process.cwd(), 'frontend/src/index.css');
assert(existsSync(indexCssPath), 'frontend/src/index.css exists');
const indexCss = readFileSync(indexCssPath, 'utf-8');

assert(
  indexCss.includes('#retailcore-printable-voucher') && indexCss.includes('visibility: visible !important'),
  'index.css explicitly sets #retailcore-printable-voucher visibility to visible !important during print'
);
assert(
  indexCss.includes('#retailcore-printable-voucher,\n  .a4-printable-document') ||
  indexCss.includes('#retailcore-printable-voucher') && indexCss.includes('padding: 8mm !important'),
  'index.css configures #retailcore-printable-voucher with A4 page formatting'
);

// 2. Verify PurchaseVoucherPrintModal component
const modalPath = resolve(process.cwd(), 'frontend/src/components/purchase/PurchaseVoucherPrintModal.tsx');
assert(existsSync(modalPath), 'PurchaseVoucherPrintModal.tsx exists');
const modalCode = readFileSync(modalPath, 'utf-8');

assert(
  modalCode.includes('id="retailcore-printable-voucher"'),
  'PurchaseVoucherPrintModal defines #retailcore-printable-voucher printable container'
);
assert(
  modalCode.includes('size: A4 portrait'),
  'PurchaseVoucherPrintModal specifies A4 portrait page size'
);
assert(
  modalCode.includes('handlePrint') && modalCode.includes('window.print()'),
  'PurchaseVoucherPrintModal provides direct browser print trigger'
);
assert(
  modalCode.includes('handleOpenInNewTab'),
  'PurchaseVoucherPrintModal provides standalone new-tab print preview for iframe/sandbox environments'
);
assert(
  modalCode.includes('handleDownloadHtml'),
  'PurchaseVoucherPrintModal provides standalone HTML voucher download'
);
assert(
  modalCode.includes("e.key.toLowerCase() === 'p'") && modalCode.includes('e.ctrlKey'),
  'PurchaseVoucherPrintModal supports Ctrl+P / Cmd+P keyboard print shortcut'
);

// 3. Verify Modern ERP Voucher Format
assert(
  modalCode.includes('RETAILCORE POS_ERP — PURCHASE VOUCHER'),
  'Voucher includes official RETAILCORE POS_ERP — PURCHASE VOUCHER title'
);
assert(
  modalCode.includes('Vendor / Supplier Profile') && modalCode.includes('Receiving Warehouse & Terms'),
  'Voucher features executive 2-column Vendor and Warehouse cards'
);
assert(
  modalCode.includes('Total Amount in Words') && modalCode.includes('numberToWordsBDT'),
  'Voucher calculates and displays authoritative BDT Amount in Words'
);
assert(
  modalCode.includes('Prepared By') &&
  modalCode.includes('Inspected / Verified By') &&
  modalCode.includes('Accounts Payable Officer') &&
  modalCode.includes('Authorized Signatory'),
  'Voucher includes professional 4-column ERP authorization and signature block'
);

// 4. Verify PurchaseInvoiceForm integration
const formPath = resolve(process.cwd(), 'frontend/src/pages/purchase/PurchaseInvoiceForm.tsx');
assert(existsSync(formPath), 'PurchaseInvoiceForm.tsx exists');
const formCode = readFileSync(formPath, 'utf-8');

assert(
  formCode.includes('PurchaseVoucherPrintModal'),
  'PurchaseInvoiceForm imports and renders PurchaseVoucherPrintModal'
);
assert(
  formCode.includes('effectivePrintVoucher'),
  'PurchaseInvoiceForm computes comprehensive effectivePrintVoucher payload for printing'
);
assert(
  formCode.includes('btn_print_voucher') && formCode.includes('Print Voucher (A4)'),
  'PurchaseInvoiceForm provides sticky action button to trigger A4 print preview'
);

console.log('================================================================');
console.log(`RESULTS: ${passed} / ${passed + failed} VOUCHER PRINT TESTS PASSED.`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}
