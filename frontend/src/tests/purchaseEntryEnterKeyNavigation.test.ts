/**
 * RetailCore POS ERP — Purchase Entry Form Enter-Key Navigation Test Suite
 *
 * Verifies:
 * 1. PurchaseInvoiceForm.tsx provides handleFieldKeyDown helper function for Enter key field focus switching
 * 2. Supplier Select, Supplier Challan No, Purchase Date, Due Date, PO Ref, and GRN Ref implement Enter key navigation
 * 3. Barcode Scan input and Product Search filters handle Enter key focus transition
 * 4. Line Item Matrix table inputs (Qty, Cost, Discount, Tax, Selling Price) transition seamlessly on Enter key
 * 5. Financial breakdown inputs (Shipping, Other Cost, Amount Paid) navigate to Direct Save button on Enter key
 */

import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

let passed = 0;
let failed = 0;

function it(desc: string, fn: () => void) {
  try {
    fn();
    console.log(`[PASS] ${desc}`);
    passed++;
  } catch (err: any) {
    console.error(`[FAIL] ${desc} -> ${err.message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('--- PURCHASE ENTRY ENTER-KEY NAVIGATION TEST SUITE ---');
console.log('================================================================');

const formPath = resolve(process.cwd(), 'frontend/src/pages/purchase/PurchaseInvoiceForm.tsx');
assert(existsSync(formPath), 'PurchaseInvoiceForm.tsx must exist');
const content = readFileSync(formPath, 'utf-8');

it('PurchaseInvoiceForm.tsx implements handleFieldKeyDown helper function', () => {
  assert(content.includes('handleFieldKeyDown'), 'Contains handleFieldKeyDown helper function');
  assert(content.includes("e.key === 'Enter'"), 'Checks for Enter key press');
});

it('Supplier and Document fields implement Enter key navigation', () => {
  assert(content.includes('id="supplier_select_input"'), 'Supplier Select has ID supplier_select_input');
  assert(content.includes("handleFieldKeyDown(e, 'supplier_challan_input')"), 'Supplier Select navigates to Supplier Challan No');
  assert(content.includes('id="supplier_challan_input"'), 'Supplier Challan has ID supplier_challan_input');
  assert(content.includes("handleFieldKeyDown(e, 'purchase_date_input')"), 'Supplier Challan navigates to Purchase Date');
  assert(content.includes('id="purchase_date_input"'), 'Purchase Date has ID purchase_date_input');
  assert(content.includes("handleFieldKeyDown(e, 'due_date_input')"), 'Purchase Date navigates to Due Date');
  assert(content.includes('id="po_ref_select_input"'), 'PO Ref has ID po_ref_select_input');
  assert(content.includes("handleFieldKeyDown(e, 'grn_ref_select_input')"), 'PO Ref navigates to GRN Ref');
});

it('Barcode Scanner & Search filters implement Enter key navigation & auto-focus', () => {
  assert(content.includes('id="barcode_scan_input"'), 'Barcode Scanner input has ID barcode_scan_input');
  assert(content.includes('id="product_search_input"'), 'Product Search input has ID product_search_input');
  assert(content.includes("handleFieldKeyDown(e, 'category_filter_select')"), 'Product Search navigates to Category Filter');
  assert(content.includes("handleFieldKeyDown(e, 'brand_filter_select')"), 'Category Filter navigates to Brand Filter');
  assert(content.includes('qty_input_${newItemId}'), 'Item addition auto-focuses newly added item quantity input');
});

it('Line Item Matrix table fields implement column-by-column Enter key navigation', () => {
  assert(content.includes('id={`qty_input_${item.id}`}'), 'Quantity input has dynamic ID');
  assert(content.includes('handleFieldKeyDown(e, `cost_input_${item.id}`)'), 'Quantity input navigates to Unit Cost input');
  assert(content.includes('id={`cost_input_${item.id}`}'), 'Unit Cost input has dynamic ID');
  assert(content.includes('handleFieldKeyDown(e, `discount_input_${item.id}`)'), 'Unit Cost input navigates to Discount input');
  assert(content.includes('id={`discount_input_${item.id}`}'), 'Discount input has dynamic ID');
  assert(content.includes('handleFieldKeyDown(e, `tax_input_${item.id}`)'), 'Discount input navigates to Tax input');
  assert(content.includes('id={`tax_input_${item.id}`}'), 'Tax input has dynamic ID');
  assert(content.includes('handleFieldKeyDown(e, `selling_price_input_${item.id}`)'), 'Tax input navigates to Selling Price input');
  assert(content.includes("shipping_cost_input"), 'Last selling price input or filter navigates to Shipping Cost');
});

it('Financial Breakdown and Payment fields navigate to Direct Save button', () => {
  assert(content.includes('id="shipping_cost_input"'), 'Shipping Cost input has ID shipping_cost_input');
  assert(content.includes("handleFieldKeyDown(e, 'other_cost_input')"), 'Shipping Cost navigates to Other Cost');
  assert(content.includes('id="other_cost_input"'), 'Other Cost input has ID other_cost_input');
  assert(content.includes("handleFieldKeyDown(e, 'amount_paid_input')"), 'Other Cost navigates to Amount Paid');
  assert(content.includes('id="amount_paid_input"'), 'Amount Paid input has ID amount_paid_input');
  assert(content.includes("handleFieldKeyDown(e, 'btn_direct_save')"), 'Amount Paid navigates to Direct Save button');
  assert(content.includes('id="btn_direct_save"'), 'Direct Save button has ID btn_direct_save');
});

console.log('================================================================');
console.log(`RESULTS: ${passed} / ${passed + failed} ENTER-KEY NAVIGATION TESTS PASSED.`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}
