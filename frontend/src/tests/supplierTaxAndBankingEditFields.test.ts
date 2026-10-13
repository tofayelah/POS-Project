/**
 * RetailCore ERP — Supplier Tax Number, Banking Info & Additional Notes Edit Fields Verification Suite
 */

import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DEFAULT_SUPPLIERS,
  getStoredSuppliers,
  saveStoredSuppliers,
  updateSupplier,
  createSupplier,
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
console.log('--- SUPPLIER TAX & BANKING EDIT FIELDS VERIFICATION SUITE ---');
console.log('================================================================');

let passed = 0;
let failed = 0;

async function it(desc: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`[PASS] ${desc}`);
    passed++;
  } catch (err: any) {
    console.error(`[FAIL] ${desc}: ${err.message}`);
    failed++;
  }
}

async function runTests() {
  const formPath = resolve(process.cwd(), 'frontend/src/pages/purchase/SupplierForm.tsx');
  const listPath = resolve(process.cwd(), 'frontend/src/pages/purchase/SupplierList.tsx');
  const formContent = readFileSync(formPath, 'utf8');
  const listContent = readFileSync(listPath, 'utf8');

  await it('SupplierForm.tsx exists and is readable', () => {
    assert(existsSync(formPath), 'SupplierForm.tsx must exist');
  });

  await it('SupplierForm.tsx contains Tax Number / BIN / VAT Reg editable input field', () => {
    assert(formContent.includes('id="supplier_tax_number_input"'), 'Must have supplier_tax_number_input id');
    assert(formContent.includes('Tax Number / BIN / VAT Reg'), 'Must display Tax Number / BIN / VAT Reg label');
    assert(formContent.includes('formData.tax_number'), 'Must bind to formData.tax_number');
  });

  await it('SupplierForm.tsx contains Bank Name editable input field', () => {
    assert(formContent.includes('id="supplier_bank_name_input"'), 'Must have supplier_bank_name_input id');
    assert(formContent.includes('Bank Name'), 'Must display Bank Name label');
    assert(formContent.includes('formData.bank_name'), 'Must bind to formData.bank_name');
  });

  await it('SupplierForm.tsx contains Bank Account Number editable input field', () => {
    assert(formContent.includes('id="supplier_bank_ac_input"'), 'Must have supplier_bank_ac_input id');
    assert(formContent.includes('Bank Account Number'), 'Must display Bank Account Number label');
    assert(formContent.includes('formData.bank_account_no'), 'Must bind to formData.bank_account_no');
  });

  await it('SupplierForm.tsx contains Bank Branch / Routing editable input field', () => {
    assert(formContent.includes('id="supplier_bank_branch_input"'), 'Must have supplier_bank_branch_input id');
    assert(formContent.includes('Bank Branch / Routing'), 'Must display Bank Branch label');
    assert(formContent.includes('formData.bank_branch'), 'Must bind to formData.bank_branch');
  });

  await it('SupplierForm.tsx contains Internal Notes / Additional Notes editable textarea field', () => {
    assert(formContent.includes('id="supplier_notes_input"'), 'Must have supplier_notes_input id');
    assert(formContent.includes('formData.notes'), 'Must bind to formData.notes');
  });

  await it('SupplierForm.tsx connects Enter key navigation through tax, banking, and notes fields', () => {
    assert(formContent.includes("handleFieldKeyDown(e, 'supplier_tax_number_input')"), 'Phone must lead to tax input');
    assert(formContent.includes("handleFieldKeyDown(e, 'supplier_bank_name_input')"), 'Tax must lead to bank name');
    assert(formContent.includes("handleFieldKeyDown(e, 'supplier_bank_ac_input')"), 'Bank name must lead to bank account');
    assert(formContent.includes("handleFieldKeyDown(e, 'supplier_bank_branch_input')"), 'Bank account must lead to bank branch');
    assert(formContent.includes("handleFieldKeyDown(e, 'supplier_notes_input')"), 'Bank branch must lead to notes');
  });

  await it('SupplierForm.tsx loads and sets tax_number, bank details, and notes in loadData for editing', () => {
    assert(formContent.includes('tax_number: sup.tax_number'), 'Must populate tax_number on edit');
    assert(formContent.includes('bank_name: sup.bank_name'), 'Must populate bank_name on edit');
    assert(formContent.includes('bank_account_no: sup.bank_account_no'), 'Must populate bank_account_no on edit');
    assert(formContent.includes('bank_branch: sup.bank_branch'), 'Must populate bank_branch on edit');
    assert(formContent.includes('notes: sup.notes'), 'Must populate notes on edit');
  });

  await it('SupplierForm.tsx submits tax_number, banking details, and notes in payload', () => {
    assert(formContent.includes('tax_number: formData.tax_number?.trim()'), 'Must include tax_number in payload');
    assert(formContent.includes('bank_name: formData.bank_name?.trim()'), 'Must include bank_name in payload');
    assert(formContent.includes('bank_account_no: formData.bank_account_no?.trim()'), 'Must include bank_account_no in payload');
    assert(formContent.includes('bank_branch: formData.bank_branch?.trim()'), 'Must include bank_branch in payload');
    assert(formContent.includes('notes: formData.notes?.trim()'), 'Must include notes in payload');
  });

  await it('updateSupplier persists modified Tax Number and Banking info in local persistent store', async () => {
    saveStoredSuppliers([...DEFAULT_SUPPLIERS]);
    const updatedRes = await updateSupplier(1, {
      tax_number: 'BIN-999888777-0001',
      bank_name: 'City Bank PLC',
      bank_account_no: '220011994455',
      bank_branch: 'Gulshan-2 Branch, Dhaka',
      notes: 'Updated terms: 45 days credit with 2% prompt payment discount.',
    });

    assert.strictEqual(updatedRes.success, true);
    const stored = getStoredSuppliers().find((s) => s.id === 1);
    assert(stored, 'Supplier 1 must exist');
    assert.strictEqual(stored.tax_number, 'BIN-999888777-0001');
    assert.strictEqual(stored.bank_name, 'City Bank PLC');
    assert.strictEqual(stored.bank_account_no, '220011994455');
    assert.strictEqual(stored.bank_branch, 'Gulshan-2 Branch, Dhaka');
    assert.strictEqual(stored.notes, 'Updated terms: 45 days credit with 2% prompt payment discount.');
  });

  await it('SupplierList.tsx View modal provides direct edit action links for Tax, Bank, and Notes', () => {
    assert(listContent.includes('Edit Tax Info ↗'), 'Must have Edit Tax Info link');
    assert(listContent.includes('Edit Bank Info ↗'), 'Must have Edit Bank Info link');
    assert(listContent.includes('Edit Notes ↗'), 'Must have Edit Notes link');
    assert(listContent.includes('/purchases/suppliers/${selectedSupplierForView.id}/edit'), 'Must link to edit URL');
  });

  console.log('================================================================');
  console.log(`RESULTS: ${passed} / ${passed + failed} TESTS PASSED.`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runTests();
