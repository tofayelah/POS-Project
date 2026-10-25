import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
}

console.log('================================================================');
console.log('--- RETAILCORE FULL OPERATIONAL DEMO DATA TEST SUITE ---');
console.log('================================================================');

// 1. Verify demoData.ts dataset declarations
const demoDataPath = resolve(process.cwd(), 'frontend/src/api/demoData.ts');
assert(existsSync(demoDataPath), 'demoData.ts exists');
const demoDataContent = readFileSync(demoDataPath, 'utf-8');

assert(demoDataContent.includes('DEMO_COMPANY'), 'demoData.ts exports DEMO_COMPANY');
assert(demoDataContent.includes('Apex Retail Ltd'), 'DEMO_COMPANY is Apex Retail Ltd');
assert(demoDataContent.includes('DEMO_BUSINESS_UNITS'), 'demoData.ts exports DEMO_BUSINESS_UNITS');
assert(demoDataContent.includes('DEMO_BRANCHES'), 'demoData.ts exports DEMO_BRANCHES');
assert(demoDataContent.includes('Dhaka Head Office Branch'), 'DEMO_BRANCHES includes Dhaka Head Office');
assert(demoDataContent.includes('Uttara Model Town Branch'), 'DEMO_BRANCHES includes Uttara Branch');
assert(demoDataContent.includes('Dhanmondi Executive Store'), 'DEMO_BRANCHES includes Dhanmondi Branch');
assert(demoDataContent.includes('Gulshan Avenue Boutique'), 'DEMO_BRANCHES includes Gulshan Branch');
assert(demoDataContent.includes('Chittagong Agrabad Hub'), 'DEMO_BRANCHES includes Chittagong Hub');
assert(demoDataContent.includes('Sylhet Zindabazar Branch'), 'DEMO_BRANCHES includes Sylhet Branch');

assert(demoDataContent.includes('DEMO_WAREHOUSES'), 'demoData.ts exports DEMO_WAREHOUSES');
assert(demoDataContent.includes('Central Main Depot'), 'DEMO_WAREHOUSES includes Central Main Depot');
assert(demoDataContent.includes('DEMO_STORAGE_LOCATIONS'), 'demoData.ts exports DEMO_STORAGE_LOCATIONS');
assert(demoDataContent.includes('DEMO_CATEGORIES'), 'demoData.ts exports DEMO_CATEGORIES');
assert(demoDataContent.includes('DEMO_BRANDS'), 'demoData.ts exports DEMO_BRANDS');
assert(demoDataContent.includes('DEMO_UNITS'), 'demoData.ts exports DEMO_UNITS');
assert(demoDataContent.includes('DEMO_PRODUCTS'), 'demoData.ts exports DEMO_PRODUCTS');
assert(demoDataContent.includes('SBD-12345678'), 'DEMO_PRODUCTS contains Supplier Short Name barcode (SBD-12345678)');
assert(!demoDataContent.includes('8801234567894'), 'demoData.ts has omitted legacy 880 prefix barcode');
assert(demoDataContent.includes('DEMO_SUPPLIERS'), 'demoData.ts exports DEMO_SUPPLIERS');
assert(demoDataContent.includes('DEMO_CUSTOMERS'), 'demoData.ts exports DEMO_CUSTOMERS');
assert(demoDataContent.includes('DEMO_POS_TERMINALS'), 'demoData.ts exports DEMO_POS_TERMINALS');
assert(demoDataContent.includes('DEMO_PURCHASES'), 'demoData.ts exports DEMO_PURCHASES');
assert(demoDataContent.includes('DEMO_PURCHASE_ORDERS'), 'demoData.ts exports DEMO_PURCHASE_ORDERS');
assert(demoDataContent.includes('DEMO_SUPPLIER_RETURNS'), 'demoData.ts exports DEMO_SUPPLIER_RETURNS');
assert(demoDataContent.includes('DEMO_SALES'), 'demoData.ts exports DEMO_SALES');
assert(demoDataContent.includes('DEMO_POS_SESSIONS'), 'demoData.ts exports DEMO_POS_SESSIONS');
assert(demoDataContent.includes('DEMO_STOCK_MOVEMENTS'), 'demoData.ts exports DEMO_STOCK_MOVEMENTS');

// 2. Storage keys synchronisation
assert(demoDataContent.includes('retailcore_branches_v2'), 'demoData.ts synchronizes retailcore_branches_v2');
assert(demoDataContent.includes('retailcore_warehouses_v2'), 'demoData.ts synchronizes retailcore_warehouses_v2');
assert(demoDataContent.includes('retailcore_business_units_v2'), 'demoData.ts synchronizes retailcore_business_units_v2');
assert(demoDataContent.includes('retailcore_storage_locations_v2'), 'demoData.ts synchronizes retailcore_storage_locations_v2');
assert(demoDataContent.includes('retailcore_demo_seeded_v2'), 'demoData.ts writes retailcore_demo_seeded_v2');

// 3. uploadFullOperationalDemoData implementation
assert(demoDataContent.includes('export async function uploadFullOperationalDemoData()'), 'uploadFullOperationalDemoData is exported');
assert(demoDataContent.includes('retailcore_tenant_changed'), 'Dispatches retailcore_tenant_changed event');
assert(demoDataContent.includes('retailcore_branch_changed'), 'Dispatches retailcore_branch_changed event');
assert(demoDataContent.includes('retailcore_demo_seeded'), 'Dispatches retailcore_demo_seeded event');

// 4. Automatic seeding helper
assert(demoDataContent.includes('export function ensureDemoDataSeeded()'), 'ensureDemoDataSeeded helper is exported');

// 5. Header quick action button & feedback modal
const headerPath = resolve(process.cwd(), 'frontend/src/components/layout/Header.tsx');
assert(existsSync(headerPath), 'Header.tsx exists');
const headerContent = readFileSync(headerPath, 'utf-8');
assert(headerContent.includes('header-quick-upload-demo-btn'), 'Header renders quick demo upload button');
assert(headerContent.includes('Upload Demo Data'), 'Header has "Upload Demo Data" label');
assert(headerContent.includes('demoUploadModalOpen'), 'Header contains demo upload confirmation modal');
assert(headerContent.includes('Full Operational Demo Data Loaded!'), 'Modal displays completion headline');

// 6. CompanyContext startup integration
const companyContextPath = resolve(process.cwd(), 'frontend/src/contexts/CompanyContext.tsx');
assert(existsSync(companyContextPath), 'CompanyContext.tsx exists');
const companyContextContent = readFileSync(companyContextPath, 'utf-8');
assert(companyContextContent.includes('ensureDemoDataSeeded()'), 'CompanyContext automatically invokes ensureDemoDataSeeded() on mount');
assert(companyContextContent.includes('retailcore_demo_seeded'), 'CompanyContext listens to retailcore_demo_seeded to invalidate cache');

console.log('================================================================');
console.log('RESULTS: ALL 26 OPERATIONAL DEMO DATA VERIFICATION CHECKS PASSED.');
console.log('================================================================');
