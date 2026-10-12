/**
 * RetailCore POS_ERP — Global Theme & Text Visibility Test Suite
 *
 * Verifies:
 *  1. Global CSS Theme Tokens & CSS variables defined in :root
 *  2. Form Control & Input Contrast (white backgrounds, dark readable text #0f172a, readable placeholders)
 *  3. Table Header & Row Contrast (light-gray header with dark text, white body rows)
 *  4. Executive Dashboard & KPI Soft-Tinted Cards
 *  5. Product Catalog & Master Hierarchy Screens (Category, Brand, Unit, Attributes) free of contrasting dark-mode collisions
 *  6. Sidebar & Shell navigation items (white background, indigo active item, readable text)
 */

import { readFileSync } from 'fs';
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
console.log('--- RETAILCORE POS_ERP GLOBAL THEME & VISIBILITY TEST SUITE ---');
console.log('================================================================');

// 1. Verify index.css tokens
const indexCssPath = resolve(process.cwd(), 'frontend/src/index.css');
const indexCssContent = readFileSync(indexCssPath, 'utf-8');

assert(indexCssContent.includes('--color-primary: #4338ca') || indexCssContent.includes('--color-primary: #4f46e5'), 'Primary brand token configured in :root');
assert(indexCssContent.includes('--color-bg-page: #f8fafc'), 'Page background token is clean light neutral #f8fafc');
assert(indexCssContent.includes('--color-bg-card: #ffffff'), 'Card background token is crisp white #ffffff');
assert(indexCssContent.includes('--color-text-main: #0f172a'), 'Main text color is deep navy/slate #0f172a');
assert(indexCssContent.includes('--color-border: #e2e8f0'), 'Border color token is subtle slate #e2e8f0');
assert(indexCssContent.includes('--color-table-header: #f1f5f9'), 'Table header background token is configured');
assert(indexCssContent.includes('input, select, textarea'), 'Global form inputs enforce white background and dark readable text');
assert(!indexCssContent.includes('h1, h2, h3, h4, h5, h6 {\n    color: #0f172a !important;'), 'Headings do not enforce !important that would override intentional text-white');

// 2. Verify CategoryList.tsx
const categoryListPath = resolve(process.cwd(), 'frontend/src/pages/products/CategoryList.tsx');
const categoryListContent = readFileSync(categoryListPath, 'utf-8');
assert(!categoryListContent.includes('dark:bg-slate-800'), 'CategoryList has no dark:bg-slate-800 overrides');
assert(categoryListContent.includes('bg-slate-100 uppercase text-xs font-bold text-slate-800'), 'CategoryList table header has dark readable headings on light background');
assert(categoryListContent.includes('font-bold text-slate-900'), 'CategoryList row items display deep navy text');

// 3. Verify BrandList.tsx
const brandListPath = resolve(process.cwd(), 'frontend/src/pages/products/BrandList.tsx');
const brandListContent = readFileSync(brandListPath, 'utf-8');
assert(!brandListContent.includes('dark:bg-slate-800'), 'BrandList has no dark:bg-slate-800 overrides');
assert(brandListContent.includes('bg-slate-100 uppercase text-xs font-bold text-slate-800'), 'BrandList table header has dark readable headings');

// 4. Verify UnitList.tsx
const unitListPath = resolve(process.cwd(), 'frontend/src/pages/products/UnitList.tsx');
const unitListContent = readFileSync(unitListPath, 'utf-8');
assert(!unitListContent.includes('dark:bg-slate-800'), 'UnitList has no dark:bg-slate-800 overrides');
assert(unitListContent.includes('bg-slate-100 uppercase text-xs font-bold text-slate-800'), 'UnitList table header is high-contrast light slate');

// 5. Verify AttributeList.tsx
const attributeListPath = resolve(process.cwd(), 'frontend/src/pages/products/AttributeList.tsx');
const attributeListContent = readFileSync(attributeListPath, 'utf-8');
assert(!attributeListContent.includes('dark:bg-slate-800'), 'AttributeList has no dark:bg-slate-800 overrides');
assert(attributeListContent.includes('bg-slate-100 uppercase text-xs font-bold text-slate-800'), 'AttributeList table header has high contrast');

// 6. Verify ItemInformation.tsx
const itemInfoPath = resolve(process.cwd(), 'frontend/src/pages/products/ItemInformation.tsx');
const itemInfoContent = readFileSync(itemInfoPath, 'utf-8');
assert(!itemInfoContent.includes('dark:bg-slate-800'), 'ItemInformation product card has no dark:bg-slate-800 overrides');
assert(itemInfoContent.includes('bg-slate-100 border-b border-slate-200 text-slate-800 font-bold'), 'Variant matrix table header has high contrast text');

// 7. Verify Sidebar.tsx
const sidebarPath = resolve(process.cwd(), 'frontend/src/components/layout/Sidebar.tsx');
const sidebarContent = readFileSync(sidebarPath, 'utf-8');
assert(!sidebarContent.includes("'bg-slate-800 text-white font-semibold'"), 'Sidebar active items do not use dark gray box');
assert(!sidebarContent.includes("'text-slate-400 hover:text-white hover:bg-slate-800/40'"), 'Sidebar inactive items do not use dark hover background');
assert(sidebarContent.includes("'bg-indigo-600 text-white font-extrabold shadow-sm [&>svg]:text-white'"), 'Sidebar active items use modern indigo with extra-bold white text');
assert(sidebarContent.includes("'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'"), 'Sidebar inactive items use bold readable text');
assert(sidebarContent.includes('text-[11px] font-extrabold text-[#475569] uppercase tracking-[0.05em]'), 'Sidebar section headers use extra-bold uppercase styling');
assert(sidebarContent.includes('bg-[#F8FAFC]'), 'Sidebar uses premium light background #F8FAFC');
assert(sidebarContent.includes('border-[#E2E8F0]'), 'Sidebar right border is modern slate #E2E8F0');
assert(sidebarContent.includes('bg-[#EEF2FF]'), 'Sidebar section headers use #EEF2FF tinted background');
assert(!sidebarContent.includes('bg-slate-800'), 'Sidebar contains no residual dark bg-slate-800 active tags');

// 8. Verify ProcurementDashboard.tsx
const procPath = resolve(process.cwd(), 'frontend/src/pages/procurement/ProcurementDashboard.tsx');
const procContent = readFileSync(procPath, 'utf-8');
assert(!procContent.includes('bg-slate-900 border border-slate-800 p-5 rounded-xl hover:border-slate-700'), 'ProcurementDashboard KPI cards are light themed');
assert(procContent.includes('bg-white border border-slate-200 p-5 rounded-xl'), 'ProcurementDashboard KPI cards use white surfaces with subtle border');

console.log('================================================================');
console.log(`RESULTS: ${passed} / ${passed + failed} THEME & VISIBILITY TESTS PASSED.`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}
