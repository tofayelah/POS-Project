/**
 * RetailCore ERP — Supplier List Summary KPIs, Actions (View, Edit, Deactive, Delete)
 * & View Modal (View Ledger, Edit Supplier) Test Suite
 */

import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DEFAULT_SUPPLIERS,
  getStoredSuppliers,
  saveStoredSuppliers,
  updateSupplier,
  deleteSupplier,
} from '../api/suppliers';
import { formatBDT } from '../utils/supplierUtils';

let passed = 0;
let failed = 0;

function it(name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res
        .then(() => {
          console.log(`[PASS] ${name}`);
          passed++;
        })
        .catch((err) => {
          console.error(`[FAIL] ${name} -> ${err.message}`);
          failed++;
        });
    } else {
      console.log(`[PASS] ${name}`);
      passed++;
    }
  } catch (err: any) {
    console.error(`[FAIL] ${name} -> ${err.message}`);
    failed++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('--- SUPPLIER SUMMARY KPIS, ACTIONS & VIEW MODAL TEST SUITE ---');
  console.log('================================================================');

  const listPath = resolve(process.cwd(), 'frontend/src/pages/purchase/SupplierList.tsx');
  assert(existsSync(listPath), 'SupplierList.tsx exists');
  const content = readFileSync(listPath, 'utf-8');

  // 1. KPI Summary Cards Verification
  await it('SupplierList renders Total Suppliers, Active Suppliers, and Total Payables summary cards', () => {
    assert(content.includes('id="supplier-summary-cards"'), 'KPI summary container exists');
    assert(content.includes('Total Suppliers'), 'Total Suppliers label is present');
    assert(content.includes('Active Suppliers'), 'Active Suppliers label is present');
    assert(content.includes('Total Payables'), 'Total Payables label is present');
    assert(content.includes('জন'), 'Display count in Bengali unit "জন"');
    assert(content.includes('formatBDT(totalPayablesAmount)'), 'Total Payables is formatted in BDT');
  });

  // 2. Action Buttons Verification
  await it('SupplierList table provides View, Edit, Deactive/Activate, and Delete action buttons', () => {
    assert(content.includes('btn-view-supplier-'), 'View action button ID pattern exists');
    assert(content.includes('btn-edit-supplier-'), 'Edit action button ID pattern exists');
    assert(content.includes('btn-toggle-status-supplier-'), 'Deactivate/Activate button ID pattern exists');
    assert(content.includes('btn-delete-supplier-'), 'Delete button ID pattern exists');
    assert(content.includes('Deactive'), 'Deactive label is rendered for active suppliers');
    assert(content.includes('Activate'), 'Activate label is rendered for inactive suppliers');
    assert(content.includes('Trash2'), 'Trash2 icon is used for delete action');
  });

  // 3. View Modal Verification
  await it('Supplier View Modal displays full supplier details and action buttons (View Ledger, Edit Supplier)', () => {
    assert(content.includes('id="supplier-view-modal"'), 'Supplier view modal container exists');
    assert(content.includes('btn-modal-view-ledger'), 'View Ledger button exists in modal');
    assert(content.includes('btn-modal-edit-supplier'), 'Edit Supplier button exists in modal');
    assert(content.includes('btn-close-supplier-modal'), 'Close button exists in modal');
    assert(content.includes('/purchases/suppliers/${selectedSupplierForView.id}/ledger'), 'View Ledger links to supplier ledger route');
    assert(content.includes('/purchases/suppliers/${selectedSupplierForView.id}/edit'), 'Edit Supplier links to edit route');
  });

  // 4. Delete Confirmation Modal
  await it('Delete confirmation modal safeguards destructive deletion', () => {
    assert(content.includes('id="supplier-delete-modal"'), 'Delete confirmation modal exists');
    assert(content.includes('btn-confirm-delete'), 'Confirm delete button exists');
    assert(content.includes('btn-cancel-delete'), 'Cancel delete button exists');
  });

  // 5. Functional Status Toggle & Delete API
  await it('updateSupplier and deleteSupplier properly update local persistent store', async () => {
    saveStoredSuppliers(DEFAULT_SUPPLIERS);
    const initialList = getStoredSuppliers();
    assert.strictEqual(initialList.length, 3);

    // Toggle status of supplier 1
    const updateRes = await updateSupplier(1, { status: 'INACTIVE' });
    assert(updateRes.success, 'Update status must succeed');
    const updatedList = getStoredSuppliers();
    const sup1 = updatedList.find((s) => s.id === 1);
    assert.strictEqual(sup1?.status, 'INACTIVE');

    // Delete supplier 3
    const deleteRes = await deleteSupplier(3);
    assert(deleteRes.success, 'Delete supplier must succeed');
    const afterDeleteList = getStoredSuppliers();
    assert.strictEqual(afterDeleteList.length, 2);
    assert(!afterDeleteList.some((s) => s.id === 3), 'Deleted supplier must be removed');
  });

  console.log('================================================================');
  console.log(`RESULTS: ${passed} / ${passed + failed} TESTS PASSED.`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
