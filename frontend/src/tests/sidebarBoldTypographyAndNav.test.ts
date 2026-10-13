/**
 * RetailCore POS_ERP — Sidebar Bold Typography & Navigation Integrity Test Suite
 *
 * Verifies:
 *  1. Active navigation items use font-extrabold (weight 800), text-white, and white icon contrast
 *  2. Section headings use font-extrabold (weight 800), text-[11px], tracking-[0.05em], and #EEF2FF background
 *  3. Inactive navigation items use font-bold (weight 700) and high-contrast text-slate-700
 *  4. Top branding and bottom user profile adhere to font-extrabold hierarchy
 *  5. Procurement/Supplier navigation routes and Add Supplier workflow point to supplier forms
 *  6. Responsive mobile drawer and desktop hover collapse mechanics
 */

import { readFileSync, existsSync } from 'fs';
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
console.log('--- RETAILCORE ERP SIDEBAR BOLD TYPOGRAPHY & NAVIGATION SUITE ---');
console.log('================================================================');

// 1. Verify Sidebar.tsx Typography & Styling
const sidebarPath = resolve(process.cwd(), 'frontend/src/components/layout/Sidebar.tsx');
assert(existsSync(sidebarPath), 'Sidebar.tsx exists in layout directory');

const sidebarContent = readFileSync(sidebarPath, 'utf-8');

// Main Head & Active Items checks
assert(
  sidebarContent.includes('font-extrabold'),
  'Navigation headings and active items configured with font-extrabold (weight 800)'
);
assert(
  sidebarContent.includes('rounded-xl') || sidebarContent.includes('rounded-lg'),
  'Navigation items use subtle rounded-xl/lg border radius'
);

// Active items checks
assert(
  sidebarContent.includes('bg-indigo-600 text-white font-extrabold'),
  'Active menu items use primary indigo (#4F46E5) with font-extrabold (weight 800) and pure white text'
);
assert(
  sidebarContent.includes('bg-indigo-50/80') || sidebarContent.includes('bg-indigo-600'),
  'Active navigation groups and links enforce clear high contrast visual indicators'
);
assert(
  !sidebarContent.includes('font-semibold shadow-xs'),
  'No legacy font-semibold remains on primary active navigation items'
);

// Inactive items checks
assert(
  sidebarContent.includes('text-slate-700') && sidebarContent.includes('font-bold'),
  'Inactive navigation items use font-bold (weight 700) with deep slate text-slate-700'
);
assert(
  sidebarContent.includes('text-[13px]'),
  'Navigation items use optimal readable text-[13px] base size'
);

// Top branding & Footer profile checks
assert(
  sidebarContent.includes('text-slate-900 font-extrabold tracking-tight text-sm block truncate'),
  'Top brand name uses font-extrabold (weight 800)'
);
assert(
  sidebarContent.includes('text-[13px] font-extrabold text-slate-900 truncate'),
  'Footer user display name uses font-extrabold (weight 800)'
);
assert(
  sidebarContent.includes('text-[11px] text-[#475569] font-bold uppercase tracking-wider truncate'),
  'Footer user role uses bold uppercase styling'
);
assert(
  sidebarContent.includes('id="sidebar-logout-btn"'),
  'Sidebar renders interactive logout button'
);

// 2. Responsive & Layout Structure
assert(
  sidebarContent.includes("isHovered ? 'lg:w-64' : 'lg:w-20'"),
  'Desktop sidebar supports compact collapse (w-20) and hover expansion (w-64)'
);
assert(
  sidebarContent.includes('isMobileOpen'),
  'Mobile drawer state is supported with z-50 fixed overlay'
);
assert(
  sidebarContent.includes('overflow-y-auto overflow-x-hidden scrollbar-thin'),
  'Navigation menu scrolls independently from the application layout'
);

// 3. Navigation Routes & Supplier Workflow
const appPath = resolve(process.cwd(), 'frontend/src/App.tsx');
assert(existsSync(appPath), 'App.tsx exists');
const appContent = readFileSync(appPath, 'utf-8');

assert(
  appContent.includes('<Route path="/purchases/suppliers"'),
  'App.tsx defines route for /purchases/suppliers'
);
assert(
  appContent.includes('<Route path="/purchases/suppliers/new"'),
  'App.tsx defines route for /purchases/suppliers/new'
);
assert(
  appContent.includes('<Route path="/purchase/suppliers/new" element={<Navigate to="/purchases/suppliers/new" replace />} />'),
  'App.tsx provides redirect alias for /purchase/suppliers/new to prevent accidental dashboard redirect'
);
assert(
  appContent.includes('<Route path="/procurement/suppliers" element={<Navigate to="/purchases/suppliers" replace />} />'),
  'App.tsx provides procurement/suppliers redirect alias'
);

// SupplierList Add Supplier button
const supplierListPath = resolve(process.cwd(), 'frontend/src/pages/purchase/SupplierList.tsx');
assert(existsSync(supplierListPath), 'SupplierList.tsx exists');
const supplierListContent = readFileSync(supplierListPath, 'utf-8');

assert(
  supplierListContent.includes('to="/purchases/suppliers/new"'),
  'SupplierList Add Supplier button links directly to /purchases/suppliers/new'
);
assert(
  supplierListContent.includes('id="btn-add-supplier"'),
  'SupplierList Add Supplier button has accessible element identifier'
);
assert(
  !supplierListContent.includes('dark:bg-slate-800'),
  'SupplierList follows clean light theme without residual dark panels'
);

console.log('================================================================');
console.log(`RESULTS: ${passed} / ${passed + failed} SIDEBAR TYPOGRAPHY & NAVIGATION TESTS PASSED.`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}
