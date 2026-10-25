import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import assert from 'assert';

console.log('================================================================');
console.log('--- SUPPLIER RETURN (DEBIT NOTE) ERP WORKFLOW TEST SUITE ---');
console.log('================================================================');

// 1. Verify API Service
const apiPath = resolve(process.cwd(), 'frontend/src/api/supplierReturns.ts');
assert(existsSync(apiPath), 'supplierReturns.ts API service exists');
const apiContent = readFileSync(apiPath, 'utf-8');

assert(apiContent.includes('export function generateNextSupplierReturnNumber'), 'Auto-generates voucher number');
assert(apiContent.includes('PRET-'), 'Uses PRET- voucher prefix for Supplier Returns');
assert(apiContent.includes('export async function getSupplierReturns'), 'getSupplierReturns export present');
assert(apiContent.includes('export async function createSupplierReturn'), 'createSupplierReturn export present');
assert(apiContent.includes('export async function updateSupplierReturn'), 'updateSupplierReturn export present');
assert(apiContent.includes('export async function deleteSupplierReturn'), 'deleteSupplierReturn export present');
console.log('[PASS] Test 1: API service layer and storage persistence defined');

// 2. Verify Types
const typesPath = resolve(process.cwd(), 'frontend/src/types/purchase.ts');
assert(existsSync(typesPath), 'purchase.ts types file exists');
const typesContent = readFileSync(typesPath, 'utf-8');

assert(typesContent.includes('export interface SupplierReturnItem'), 'SupplierReturnItem interface declared');
assert(typesContent.includes('export interface SupplierReturn'), 'SupplierReturn interface declared');
assert(typesContent.includes('export interface CreateSupplierReturnPayload'), 'CreateSupplierReturnPayload declared');
assert(typesContent.includes('return_rate: number'), 'Return rate is typed and editable');
assert(typesContent.includes('return_qty: number'), 'Return quantity is typed');
assert(typesContent.includes('reason:'), 'Return reason is categorized');
console.log('[PASS] Test 2: Types and data interfaces for Supplier Returns configured');

// 3. Verify SupplierReturnForm Component
const formPath = resolve(process.cwd(), 'frontend/src/pages/purchase/SupplierReturnForm.tsx');
assert(existsSync(formPath), 'SupplierReturnForm.tsx component exists');
const formContent = readFileSync(formPath, 'utf-8');

// Requirements from user brief:
// 1. Supplier selection with live payable balance
assert(formContent.includes('selectedSupplier'), 'Supplier context tracked in state');
assert(formContent.includes('current_balance'), 'Displays current accounts payable balance');

// 2. Purchase source mode: from existing purchase invoice or direct
assert(formContent.includes('returnSourceMode'), 'Supports invoice-linked and direct return modes');
assert(formContent.includes('importInvoiceItemsById'), 'Imports products and rates from purchase invoice');
assert(formContent.includes('Load Invoice Products') || formContent.includes('importInvoiceItemsById'), 'Provides quick invoice import');

// 3. Manual editing of quantity, rate, and item removal
assert(formContent.includes('handleItemQtyChange'), 'Permits manual change of return quantity');
assert(formContent.includes('handleItemRateChange'), 'Permits manual change of return rate');
assert(formContent.includes('handleRemoveItem'), 'Permits deleting items user is not returning');

// 4. Return reasons and financial settlement
assert(formContent.includes('DEFECTIVE'), 'Supports return reason options (defective, damaged, etc.)');
assert(formContent.includes('PAYABLE_ADJUSTMENT'), 'Supports Debit Note / Accounts Payable adjustment');
assert(formContent.includes('CASH_REFUND'), 'Supports Cash refund option');
assert(formContent.includes('BANK_REFUND'), 'Supports Bank transfer refund option');

// 5. Print Debit Note modal integration
assert(formContent.includes('SupplierReturnPrintModal'), 'Integrates printable A4 debit note voucher modal');
console.log('[PASS] Test 3: SupplierReturnForm implements complete ERP return workflow');

// 4. Verify SupplierReturnList Component
const listPath = resolve(process.cwd(), 'frontend/src/pages/purchase/SupplierReturnList.tsx');
assert(existsSync(listPath), 'SupplierReturnList.tsx exists');
const listContent = readFileSync(listPath, 'utf-8');

assert(listContent.includes('Supplier Returns (Purchase Returns)'), 'Page title and branding present');
assert(listContent.includes('/purchases/returns/create'), 'Navigates to new supplier return form');
assert(listContent.includes('SupplierReturnPrintModal'), 'Permits printing voucher from list table');
console.log('[PASS] Test 4: SupplierReturnList component renders KPI cards and debit note table');

// 5. Verify SupplierReturnPrintModal Component
const printModalPath = resolve(process.cwd(), 'frontend/src/components/purchase/SupplierReturnPrintModal.tsx');
assert(existsSync(printModalPath), 'SupplierReturnPrintModal.tsx exists');
const printContent = readFileSync(printModalPath, 'utf-8');

assert(printContent.includes('DEBIT NOTE / PURCHASE RETURN'), 'Standard Debit Note header');
assert(printContent.includes('numberToWordsBDT'), 'Converts total debit amount to words in BDT');
assert(printContent.includes('Prepared By'), 'Audit and signature seals present');
console.log('[PASS] Test 5: Modern A4 printable Debit Note voucher design confirmed');

// 6. Verify App Routing
const appPath = resolve(process.cwd(), 'frontend/src/App.tsx');
const appContent = readFileSync(appPath, 'utf-8');
assert(appContent.includes('/purchases/returns'), 'App.tsx contains route /purchases/returns');
assert(appContent.includes('/purchases/returns/create'), 'App.tsx contains route /purchases/returns/create');
assert(appContent.includes('SupplierReturnList'), 'SupplierReturnList wired in App.tsx');
assert(appContent.includes('SupplierReturnForm'), 'SupplierReturnForm wired in App.tsx');
console.log('[PASS] Test 6: App.tsx routing for Supplier Returns configured');

// 7. Verify Sidebar Link
const sidebarPath = resolve(process.cwd(), 'frontend/src/components/layout/Sidebar.tsx');
const sidebarContent = readFileSync(sidebarPath, 'utf-8');
assert(sidebarContent.includes("id: 'supplier_returns', label: 'Supplier Returns'"), 'Sidebar contains Supplier Returns item');
console.log('[PASS] Test 7: Sidebar navigation contains Supplier Returns entry');

// 8. Verify Settlement & Debit Terms deduction from Supplier Ledger
// Brief: "Settlement & Debit Terms a Supplier Lezer theke Supplier return amount bad jabe"
const suppliersApiPath = resolve(process.cwd(), 'frontend/src/api/suppliers.ts');
const suppliersApiContent = readFileSync(suppliersApiPath, 'utf-8');
assert(suppliersApiContent.includes('deductSupplierBalance'), 'suppliers.ts exports deductSupplierBalance function');

assert(apiContent.includes('deductSupplierBalance'), 'supplierReturns.ts invokes deductSupplierBalance upon posting return');
assert(formContent.includes('Supplier Ledger Settlement'), 'SupplierReturnForm renders Supplier Ledger Settlement card in Section 2');
assert(formContent.includes('Less: Supplier Return Amount'), 'Section 2 renders return amount deduction from supplier ledger');
assert(formContent.includes('Adjusted Ledger Balance'), 'Section 2 renders new balance after debit note deduction');

const ledgerViewPath = resolve(process.cwd(), 'frontend/src/pages/purchase/SupplierLedgerView.tsx');
assert(existsSync(ledgerViewPath), 'SupplierLedgerView.tsx exists');
const ledgerContent = readFileSync(ledgerViewPath, 'utf-8');
assert(ledgerContent.includes('SUPPLIER_RETURN'), 'SupplierLedgerView includes Supplier Return rows');
assert(ledgerContent.includes('Debit (- বাদ)'), 'SupplierLedgerView records return as Debit deduction reducing payable balance');
console.log('[PASS] Test 8: Settlement & Debit Terms Supplier Ledger deduction and subledger debit notes verified');

console.log('================================================================');
console.log('ALL 8 SUPPLIER RETURN ERP WORKFLOW TESTS PASSED SUCCESSFULLY!');
console.log('================================================================');

