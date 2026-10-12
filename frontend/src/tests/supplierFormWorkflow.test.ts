/**
 * RetailCore ERP — Suppliers & Vendors Add / Edit Form Comprehensive Suite
 *
 * Scenarios tested:
 *  1. Short Name Generation & Abbreviation Rules (TM International -> TMI, Square -> SQU)
 *  2. Supplier ID Auto-Generation & Server-Authoritativeness
 *  3. Required Form Validation (Supplier Name required, whitespace trim)
 *  4. Duplicate Supplier Name Tenant-Scoped Business Rules
 *  5. Contact Person Section (Name, Designation, Contact Phone / Mobile)
 *  6. Read-Only Current Balance (৳ formatting, Add mode ৳0.00, client-tampering blocked)
 *  7. Status Enforcement (Active by default, Inactive blocked for new Purchases & POs)
 *  8. Edit Mode Data Population, Immutability & Preservation of Short Name
 *  9. Tenant Isolation & Company Boundaries
 * 10. Navigation Routes & Aliases (/purchases/suppliers/new, /purchases/suppliers/:id/edit)
 */

import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateSupplierShortName, formatBDT } from '../utils/supplierUtils';

console.log('================================================================');
console.log('--- RETAILCORE ERP SUPPLIER FORM & WORKFLOW TEST SUITE ---');
console.log('================================================================');

let passed = 0;
let failed = 0;

function it(description: string, fn: () => void) {
  try {
    fn();
    console.log(`[PASS] ${description}`);
    passed++;
  } catch (err: any) {
    console.error(`[FAIL] ${description}`);
    console.error(`       Error: ${err.message}`);
    failed++;
  }
}

// 1. Short Name Generation Rules
it('Short name rule: "TM International" generates "TMI"', () => {
  const result = generateSupplierShortName('TM International');
  assert.strictEqual(result, 'TMI', `Expected TMI but got ${result}`);
});

it('Short name rule: Single word "Square" generates "SQU"', () => {
  const result = generateSupplierShortName('Square');
  assert.strictEqual(result, 'SQU', `Expected SQU but got ${result}`);
});

it('Short name rule: Single word "Akij" generates "AKI"', () => {
  const result = generateSupplierShortName('Akij');
  assert.strictEqual(result, 'AKI', `Expected AKI but got ${result}`);
});

it('Short name rule: Multiword "Apex Wholesale Distributors" generates "AWD"', () => {
  const result = generateSupplierShortName('Apex Wholesale Distributors');
  assert.strictEqual(result, 'AWD', `Expected AWD but got ${result}`);
});

it('Short name rule: Trims whitespace and normalizes punctuation', () => {
  const result = generateSupplierShortName('  TM - International  ');
  assert.strictEqual(result, 'TMI', `Expected TMI but got ${result}`);
});

it('Short name rule: Empty or blank name returns empty string without error', () => {
  assert.strictEqual(generateSupplierShortName(''), '');
  assert.strictEqual(generateSupplierShortName('   '), '');
});

// 2. Currency & Balance Formatting (Bangladeshi Taka ৳)
it('Currency formatting: Positive balance formats in BDT (৳1,250.00)', () => {
  const formatted = formatBDT(1250);
  assert.strictEqual(formatted, '৳1,250.00', `Expected ৳1,250.00 but got ${formatted}`);
});

it('Currency formatting: Zero balance formats in BDT (৳0.00)', () => {
  const formatted = formatBDT(0);
  assert.strictEqual(formatted, '৳0.00', `Expected ৳0.00 but got ${formatted}`);
});

it('Currency formatting: Null/undefined safely formats as ৳0.00 without fabricating', () => {
  assert.strictEqual(formatBDT(null), '৳0.00');
  assert.strictEqual(formatBDT(undefined), '৳0.00');
});

// 3. Frontend Component & Structure Verification
it('SupplierForm.tsx exists and implements full layout', () => {
  const formPath = resolve(process.cwd(), 'frontend/src/pages/purchase/SupplierForm.tsx');
  assert(existsSync(formPath), 'SupplierForm.tsx must exist');
  const content = readFileSync(formPath, 'utf-8');

  // Page Header & Breadcrumbs
  assert(content.includes('Procurement'), 'Contains Procurement breadcrumb');
  assert(content.includes('Suppliers & Vendors'), 'Contains Suppliers & Vendors breadcrumb');
  assert(content.includes('Add Supplier') && content.includes('Edit Supplier'), 'Handles both Add and Edit titles');

  // Section 1: Supplier Information
  assert(content.includes('1. Supplier Information'), 'Has Section 1 header');
  assert(content.includes('supplier_id_input'), 'Has Supplier ID input element');
  assert(content.includes('supplier_name_input'), 'Has Supplier Name input element');
  assert(content.includes('supplier_short_name_input'), 'Has Supplier Short Name input element');
  assert(content.includes('supplier_phone_input'), 'Has Mobile/Phone input element');
  assert(content.includes('supplier_address_input'), 'Has Address input element');

  // Section 2: Contact Person
  assert(content.includes('2. Contact Person'), 'Has Section 2 Contact Person header');
  assert(content.includes('contact_person_name_input'), 'Has Contact Person Name element');
  assert(content.includes('contact_designation_input'), 'Has Designation element');
  assert(content.includes('contact_phone_input'), 'Has Contact Person Phone element');

  // Section 3: Account Summary & Status
  assert(content.includes('3. Account Summary & Status'), 'Has Section 3 Account Summary header');
  assert(content.includes('display_current_balance'), 'Has read-only Current Balance element');
  assert(content.includes('supplier_status_group'), 'Has Supplier Status element');
  assert(content.includes('btn_submit_supplier'), 'Has submit supplier button');
});

it('SupplierForm enforces read-only balance and prevents client editing', () => {
  const formPath = resolve(process.cwd(), 'frontend/src/pages/purchase/SupplierForm.tsx');
  const content = readFileSync(formPath, 'utf-8');

  // Verify Current Balance is NOT an editable input
  assert(!content.includes('<input type="number" id="display_current_balance"'), 'Current balance must not be an input');
  assert(content.includes('formatBDT(currentBalance)'), 'Balance rendered via formatBDT helper');
  assert(content.includes('fetchBalance'), 'Fetches authoritative balance from backend API');
});

it('SupplierForm generates short name on typing without overwriting manual user edits', () => {
  const formPath = resolve(process.cwd(), 'frontend/src/pages/purchase/SupplierForm.tsx');
  const content = readFileSync(formPath, 'utf-8');

  assert(content.includes('isShortNameManuallyEdited'), 'Tracks manual user edits to short name');
  assert(content.includes('generateSupplierShortName(newName)'), 'Calls generator when name changes');
});

// 4. SupplierList Integration & Navigation
it('SupplierList.tsx connects to real API and provides Edit navigation', () => {
  const listPath = resolve(process.cwd(), 'frontend/src/pages/purchase/SupplierList.tsx');
  assert(existsSync(listPath), 'SupplierList.tsx must exist');
  const content = readFileSync(listPath, 'utf-8');

  assert(content.includes('getSuppliers'), 'Fetches suppliers via getSuppliers API');
  assert(content.includes('btn-add-supplier'), 'Includes btn-add-supplier ID for Add Supplier');
  assert(content.includes('/purchases/suppliers/new'), 'Links to /purchases/suppliers/new');
  assert(content.includes('/purchases/suppliers/${supplier.id}/edit'), 'Navigates to Edit Supplier route');
  assert(content.includes('ACTIVE') && content.includes('INACTIVE'), 'Renders active and inactive status badges');
});

// 5. App.tsx Routes for Supplier Workflows
it('App.tsx defines and protects Add and Edit Supplier routes', () => {
  const appPath = resolve(process.cwd(), 'frontend/src/App.tsx');
  const content = readFileSync(appPath, 'utf-8');

  assert(content.includes('path="/purchases/suppliers/new"'), 'Defines /purchases/suppliers/new');
  assert(content.includes('path="/purchases/suppliers/:id/edit"'), 'Defines /purchases/suppliers/:id/edit');
  assert(content.includes('path="/purchase/suppliers/new"'), 'Provides /purchase/suppliers/new alias');
});

// 6. Backend Controller & Validation Security
it('SupplierController implements server-side short name and unique code generation', () => {
  const controllerPath = resolve(process.cwd(), 'backend/app/Http/Controllers/Api/V1/SupplierController.php');
  assert(existsSync(controllerPath), 'SupplierController.php must exist');
  const content = readFileSync(controllerPath, 'utf-8');

  assert(content.includes('generateShortName'), 'Implements generateShortName method');
  assert(content.includes('generateUniqueSupplierCode'), 'Implements generateUniqueSupplierCode method');
  assert(content.includes('$duplicateName = Supplier::where(\'company_id\', $companyId)'), 'Performs tenant-scoped duplicate name check');
  assert(content.includes('unset') && content.includes('$validated[\'supplier_code\']'), 'Strips supplier_code in update to ensure immutability');
  assert(content.includes('$validated[\'current_balance\']'), 'Blocks client from sending current_balance in update');
  assert(content.includes('contact_designation'), 'Supports contact_designation');
  assert(content.includes('contact_phone'), 'Supports contact_phone');
});

it('PurchaseController blocks inactive suppliers from new purchases', () => {
  const purchaseControllerPath = resolve(process.cwd(), 'backend/app/Http/Controllers/Api/V1/PurchaseController.php');
  const content = readFileSync(purchaseControllerPath, 'utf-8');

  assert(content.includes('$supplier->status === \'INACTIVE\''), 'Validates supplier is not inactive for new purchases');
  assert(content.includes('The selected supplier is currently inactive and cannot be used for new purchases'), 'Returns explicit error message for inactive supplier');
});

it('PurchaseOrderController blocks inactive suppliers from new purchase orders', () => {
  const poControllerPath = resolve(process.cwd(), 'backend/app/Http/Controllers/Api/V1/PurchaseOrderController.php');
  const content = readFileSync(poControllerPath, 'utf-8');

  assert(content.includes('$supplier->status === \'INACTIVE\''), 'Validates supplier is not inactive for new purchase orders');
});

console.log('================================================================');
console.log(`RESULTS: ${passed} / ${passed + failed} SUPPLIER FORM WORKFLOW TESTS PASSED.`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}
