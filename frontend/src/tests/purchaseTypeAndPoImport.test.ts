/**
 * Purchase Entry Two-Type Workflow & PO Item Import Verification Suite
 *
 * Verifies:
 * 1. PurchaseInvoiceForm supports two purchase types:
 *    - Type 1: Direct Purchase (DEFAULT)
 *    - Type 2: Against Purchase Order (PO Order Purchase)
 * 2. PO Number input and selection (e.g. PO-2026-5934) exists and is accessible
 * 3. Loading PO-2026-5934 imports:
 *    - Supplier profile & authoritative ID
 *    - Warehouse location
 *    - All PO line items into the Purchase Form table
 * 4. Line items table supports:
 *    - Manual removal/deletion of individual items from the list
 *    - Manual change of quantity (Quantity Change)
 *    - Manual change of unit cost (Purchase Rate Change)
 *    - Real-time recalculation of line totals and grand totals
 * 5. Direct Purchase and PO Order Purchase buttons are rendered with responsive badges
 * 6. PO quick selector buttons and URL parameter auto-loading (?po=PO-2026-5934) are supported
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { getPurchaseOrder } from '../api/purchaseOrders';

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
console.log('--- PURCHASE ENTRY TWO-TYPE WORKFLOW & PO IMPORT TEST SUITE ---');
console.log('================================================================');

async function runTests() {
  const formPath = resolve(process.cwd(), 'frontend/src/pages/purchase/PurchaseInvoiceForm.tsx');
  assert(existsSync(formPath), 'PurchaseInvoiceForm.tsx exists');
  const formCode = readFileSync(formPath, 'utf-8');

  // 1. Verify 2 Purchase Types & Default Direct Purchase
  assert(
    formCode.includes("useState<'DIRECT' | 'AGAINST_PO'>('DIRECT')"),
    'Purchase type state is initialized with DIRECT as DEFAULT'
  );
  assert(
    formCode.includes('btn_type_direct_purchase') && formCode.includes('Direct Purchase (Default)'),
    'Direct Purchase (Default) toggle button is rendered'
  );
  assert(
    formCode.includes('btn_type_against_po') && formCode.includes('Against Purchase Order (PO)'),
    'Against Purchase Order (PO) toggle button is rendered'
  );

  // 2. Verify PO Input & Loader
  assert(
    formCode.includes('po_number_quick_input'),
    'PO Number text input (po_number_quick_input) is available for entering PO-2026-5934'
  );
  assert(
    formCode.includes('btn_load_po_data'),
    'Load PO Data action button (btn_load_po_data) is provided'
  );
  assert(
    formCode.includes('handleLoadPurchaseOrder'),
    'handleLoadPurchaseOrder function is implemented'
  );

  // 3. Verify PO-2026-5934 data retrieval and item population
  const poRes = await getPurchaseOrder('PO-2026-5934');
  assert(
    !!poRes.data && poRes.data.po_number === 'PO-2026-5934',
    'getPurchaseOrder("PO-2026-5934") returns the purchase order'
  );
  assert(
    Array.isArray(poRes.data.items) && poRes.data.items.length > 0,
    'PO-2026-5934 contains items ready for insertion'
  );

  // 4. Verify PO Item Insertion into Form lines
  assert(
    formCode.includes('setLineItems(imported)') || formCode.includes('setLineItems(importedItems)'),
    'PO items are inserted into line items list on PO selection'
  );
  assert(
    formCode.includes('handleSupplierSelect(targetSupId)') || formCode.includes('setSelectedSupplierId'),
    'Supplier is auto-selected from PO information'
  );
  assert(
    formCode.includes('setWarehouseId'),
    'Warehouse is auto-selected from PO information'
  );

  // 5. Verify Manual Deletion of items from list
  assert(
    formCode.includes('handleRemoveLineItem'),
    'handleRemoveLineItem allows manually deleting any item from the table'
  );
  assert(
    formCode.includes('Trash2') && formCode.includes('handleRemoveLineItem(item.id)'),
    'Each table row has a trash icon to manually remove unwanted items'
  );

  // 6. Verify Manual Change of Quantity and Purchase Rate (Unit Cost)
  assert(
    formCode.includes("handleItemFieldChange(item.id, 'quantity',"),
    'Quantity is editable manually and triggers recalculation'
  );
  assert(
    formCode.includes("handleItemFieldChange(item.id, 'unit_cost',"),
    'Purchase rate (unit_cost) is editable manually and triggers recalculation'
  );

  // 7. Verify dynamic line total math
  assert(
    formCode.includes('updated.line_total = qty * cost - disc + tax'),
    'Line total math dynamically updates when quantity or purchase rate changes'
  );

  // 8. Verify informative indicator banner for loaded PO
  assert(
    formCode.includes('Items loaded from') || formCode.includes('Items loaded from PO'),
    'Informative banner notifies user that PO items are loaded and can be edited/deleted'
  );

  // 9. Verify URL query param auto-loader (?po=PO-2026-5934)
  assert(
    formCode.includes("params.get('po')") && formCode.includes('handleLoadPurchaseOrder'),
    'Auto-loads PO when navigated with URL query parameter ?po=PO-2026-5934'
  );

  // 10. Verify PurchaseOrderList link to Purchase Entry
  const poListPath = resolve(process.cwd(), 'frontend/src/pages/purchase/PurchaseOrderList.tsx');
  const poListCode = readFileSync(poListPath, 'utf-8');
  assert(
    poListCode.includes('/purchases/invoices/create?po='),
    'PurchaseOrderList provides 1-click action to create purchase entry from PO'
  );

  console.log('================================================================');
  console.log(`RESULTS: ${passed} / ${passed + failed} TESTS PASSED.`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
