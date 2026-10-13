/**
 * RetailCore ERP — New Purchase Entry Form Enter-Key Navigation Test Suite
 */

import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

console.log('================================================================');
console.log('--- NEW PURCHASE ENTRY ENTER-KEY NAVIGATION TEST SUITE ---');
console.log('================================================================');

let passed = 0;
let failed = 0;

async function it(desc: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`[PASS] ${desc}`);
    passed++;
  } catch (err: any) {
    console.error(`[FAIL] ${desc} -> ${err.message}`);
    failed++;
  }
}

async function runTests() {
  const formPath = resolve(process.cwd(), 'frontend/src/pages/purchase/PurchaseInvoiceForm.tsx');

  await it('PurchaseInvoiceForm component file exists at target location', () => {
    assert(existsSync(formPath), `File not found at ${formPath}`);
  });

  const formContent = readFileSync(formPath, 'utf-8');

  await it('Form contains Enter key navigation helper handleFieldKeyDown', () => {
    assert(
      formContent.includes('handleFieldKeyDown') && formContent.includes("e.key === 'Enter'"),
      'Form defines Enter key event listener handleFieldKeyDown'
    );
  });

  await it('Supplier select advances focus to supplier_challan_input on Enter', () => {
    assert(
      formContent.includes('id="supplier_select_input"') &&
        formContent.includes("handleFieldKeyDown(e, 'supplier_challan_input')"),
      'Supplier select has onKeyDown moving to supplier_challan_input'
    );
  });

  await it('Supplier challan input advances focus to purchase_date_input on Enter', () => {
    assert(
      formContent.includes('id="supplier_challan_input"') &&
        formContent.includes("handleFieldKeyDown(e, 'purchase_date_input')"),
      'Supplier challan input has onKeyDown moving to purchase_date_input'
    );
  });

  await it('Purchase date input advances focus to due_date_input on Enter', () => {
    assert(
      formContent.includes('id="purchase_date_input"') &&
        formContent.includes("handleFieldKeyDown(e, 'due_date_input')"),
      'Purchase date input has onKeyDown moving to due_date_input'
    );
  });

  await it('Purchase order ref select advances focus to grn_ref_select_input on Enter', () => {
    assert(
      formContent.includes('id="po_ref_select_input"') &&
        formContent.includes("handleFieldKeyDown(e, 'grn_ref_select_input')"),
      'PO select has onKeyDown moving to grn_ref_select_input'
    );
  });

  await it('Goods receipt ref select advances focus to barcode_scan_input on Enter', () => {
    assert(
      formContent.includes('id="grn_ref_select_input"') &&
        formContent.includes("handleFieldKeyDown(e, 'barcode_scan_input')"),
      'GRN select has onKeyDown moving to barcode_scan_input'
    );
  });

  await it('Barcode scanner input handles empty Enter by moving to product_search_input or line items', () => {
    assert(
      formContent.includes('id="barcode_scan_input"') &&
        formContent.includes("if (e.key === 'Enter' && !barcodeScanInput.trim())"),
      'Barcode scan input forwards empty Enter key to next field'
    );
  });

  await it('Product search input advances focus to category_filter_select on Enter', () => {
    assert(
      formContent.includes('id="product_search_input"') &&
        formContent.includes("handleFieldKeyDown(e, 'category_filter_select')"),
      'Product search input has onKeyDown moving to category_filter_select'
    );
  });

  await it('Line item columns (Qty -> Cost -> Discount -> Tax -> Selling Price) advance focus sequentially on Enter', () => {
    assert(
      formContent.includes('cost_input_') &&
        formContent.includes('discount_input_') &&
        formContent.includes('tax_input_') &&
        formContent.includes('selling_price_input_'),
      'Line item matrix fields have configured sequential IDs'
    );
    assert(
      formContent.includes("handleFieldKeyDown(e, `cost_input_${item.id}`)") &&
        formContent.includes("handleFieldKeyDown(e, `discount_input_${item.id}`)") &&
        formContent.includes("handleFieldKeyDown(e, `tax_input_${item.id}`)") &&
        formContent.includes("handleFieldKeyDown(e, `selling_price_input_${item.id}`)"),
      'Line item columns move focus seamlessly upon pressing Enter'
    );
  });

  await it('Financial totals (Shipping -> Other Costs -> Amount Paid) advance focus on Enter', () => {
    assert(
      formContent.includes('id="shipping_cost_input"') &&
        formContent.includes("handleFieldKeyDown(e, 'other_cost_input')") &&
        formContent.includes('id="other_cost_input"') &&
        formContent.includes("handleFieldKeyDown(e, 'amount_paid_input')"),
      'Financial breakdown inputs advance focus sequentially on Enter'
    );
  });

  await it('Amount paid input advances focus to method input or btn_direct_save on Enter', () => {
    assert(
      formContent.includes('id="amount_paid_input"') &&
        formContent.includes("btn_direct_save"),
      'Amount paid input advances to direct save button or payment method input'
    );
  });

  console.log('\n================================================================');
  console.log(`SUMMARY: ${passed} Passed | ${failed} Failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
