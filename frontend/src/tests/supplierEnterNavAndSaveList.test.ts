/**
 * RetailCore ERP — Supplier Form Enter-Key Navigation, Visible ID & Save-to-List Verification Suite
 */

import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DEFAULT_SUPPLIERS,
  calculateNextSupplierCode,
  getStoredSuppliers,
  saveStoredSuppliers,
  createSupplier,
  getSuppliers,
  SUPPLIERS_STORAGE_KEY,
} from '../api/suppliers';

// Polyfill localStorage for node environment
const storageMock: Record<string, string> = {};
if (typeof globalThis.localStorage === 'undefined' || !globalThis.localStorage?.getItem) {
  globalThis.localStorage = {
    getItem: (key: string) => storageMock[key] ?? null,
    setItem: (key: string, value: string) => {
      storageMock[key] = String(value);
    },
    removeItem: (key: string) => {
      delete storageMock[key];
    },
    clear: () => {
      for (const k of Object.keys(storageMock)) delete storageMock[k];
    },
    key: (i: number) => Object.keys(storageMock)[i] ?? null,
    length: Object.keys(storageMock).length,
  } as any;
}

console.log('================================================================');
console.log('--- SUPPLIER ENTER NAV, VISIBLE ID & SAVE-TO-LIST TEST SUITE ---');
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
  // 1. Visible Supplier ID verification
  await it('Next Supplier ID calculation generates sequential code (SUP-0004 from initial 3)', () => {
    const nextCode = calculateNextSupplierCode(DEFAULT_SUPPLIERS);
    assert.strictEqual(nextCode, 'SUP-0004', `Expected SUP-0004 but got ${nextCode}`);
  });

  await it('SupplierForm.tsx prominently displays the assigned Supplier ID', () => {
    const formPath = resolve(process.cwd(), 'frontend/src/pages/purchase/SupplierForm.tsx');
    assert(existsSync(formPath), 'SupplierForm.tsx must exist');
    const content = readFileSync(formPath, 'utf-8');

    assert(content.includes('Supplier ID: {currentDisplayCode}'), 'Header displays Supplier ID');
    assert(content.includes('id="supplier_id_input"'), 'Contains supplier_id_input element');
    assert(content.includes('value={currentDisplayCode}'), 'Input displays actual current code');
    assert(content.includes('READ ONLY') || content.includes('Read-Only'), 'Marked read-only');
  });

  // 2. Enter key navigation verification
  await it('SupplierForm.tsx implements Enter key navigation between input fields', () => {
    const formPath = resolve(process.cwd(), 'frontend/src/pages/purchase/SupplierForm.tsx');
    const content = readFileSync(formPath, 'utf-8');

    assert(content.includes('handleFieldKeyDown'), 'Contains handleFieldKeyDown navigation function');
    assert(content.includes("handleFieldKeyDown(e, 'supplier_short_name_input')"), 'Supplier Name navigates to Short Name');
    assert(content.includes("handleFieldKeyDown(e, 'supplier_phone_input')"), 'Short Name navigates to Phone');
    assert(content.includes("handleFieldKeyDown(e, 'supplier_address_input')"), 'Phone navigates to Address');
    assert(content.includes("handleFieldKeyDown(e, 'contact_person_name_input')"), 'Address navigates to Contact Person');
    assert(content.includes("handleFieldKeyDown(e, 'contact_designation_input')"), 'Contact Person navigates to Designation');
    assert(content.includes("handleFieldKeyDown(e, 'contact_phone_input')"), 'Designation navigates to Contact Phone');
    assert(content.includes("handleFieldKeyDown(e, 'supplier_status_active_btn')"), 'Contact Phone navigates to Status');
    assert(content.includes("handleFieldKeyDown(e, 'btn_submit_supplier')"), 'Status navigates to Submit button');
  });

  // 3. Save Supplier and List persistence verification
  await it('Saving a supplier persists it and returns it in getSuppliers list', async () => {
    localStorage.clear();

    const createdRes = await createSupplier({
      name: 'Rahim Trading Ltd',
      short_name: 'RTL',
      mobile: '01711999888',
      address: 'Agrabad C/A, Chittagong',
      contact_person: 'Abdur Rahim',
      contact_designation: 'Managing Partner',
      contact_phone: '01711999888',
      status: 'ACTIVE',
    });

    assert(createdRes.success, 'Create response should be success');
    assert(createdRes.data, 'Created supplier data should be present');
    assert.strictEqual(createdRes.data.name, 'Rahim Trading Ltd');
    assert.strictEqual(createdRes.data.supplier_code, 'SUP-0004');

    // Now call getSuppliers
    const listRes = await getSuppliers();
    assert(listRes.success, 'List response should be success');
    const suppliers = Array.isArray(listRes.data)
      ? listRes.data
      : (listRes.data as any).data;

    assert(Array.isArray(suppliers), 'Suppliers should be an array');
    assert(suppliers.length >= 4, `Expected at least 4 suppliers but found ${suppliers.length}`);

    const found = suppliers.find((s: any) => s.supplier_code === 'SUP-0004');
    assert(found, 'Newly created supplier SUP-0004 must be present in the list');
    assert.strictEqual(found.name, 'Rahim Trading Ltd');
  });

  await it('vite.config.ts contains mock endpoints for suppliers next-code and CRUD operations', () => {
    const vitePath = resolve(process.cwd(), 'vite.config.ts');
    assert(existsSync(vitePath), 'vite.config.ts must exist');
    const content = readFileSync(vitePath, 'utf-8');

    assert(content.includes('/suppliers/next-code'), 'Vite mock handles next-code');
    assert(content.includes('/api/v1/suppliers'), 'Vite mock handles suppliers endpoints');
    assert(content.includes('devSuppliersStore'), 'Vite mock maintains devSuppliersStore');
  });

  await it('SupplierList.tsx displays newly added suppliers and summary counts', () => {
    const listPath = resolve(process.cwd(), 'frontend/src/pages/purchase/SupplierList.tsx');
    assert(existsSync(listPath), 'SupplierList.tsx must exist');
    const content = readFileSync(listPath, 'utf-8');

    assert(content.includes('useLocation'), 'SupplierList reads location state');
    assert(content.includes('justSavedState'), 'SupplierList detects just-saved supplier');
    assert(content.includes('isJustAdded'), 'SupplierList highlights newly saved supplier');
    assert(content.includes('filteredSuppliers.length'), 'SupplierList displays total counts');
  });

  console.log('================================================================');
  console.log(`RESULTS: ${passed} / ${passed + failed} TESTS PASSED.`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
