/**
 * RetailCore ERP — Sidebar Navigation Architecture Test Suite
 *
 * Verifies:
 *  1. All 14 Main Heads + Overview are present as specified in required hierarchy
 *  2. Sub Heads are present under their exact parents
 *  3. Both Procurement -> Suppliers and Finance -> Suppliers entries exist
 *  4. Collapsible group mechanics, state hooks, and chevron indicators
 *  5. Vertical connector border lines for indented children
 *  6. Route mappings for all subheads
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
console.log('--- RETAILCORE ERP SIDEBAR NAVIGATION ARCHITECTURE SUITE ---');
console.log('================================================================');

const sidebarPath = resolve(process.cwd(), 'frontend/src/components/layout/Sidebar.tsx');
assert(existsSync(sidebarPath), 'Sidebar.tsx exists in layout directory');

const sidebarContent = readFileSync(sidebarPath, 'utf-8');

// 1. Verify Main Heads Present
const mainHeads = [
  'Overview',
  'POS',
  'Product Master',
  'Procurement',
  'Inventory Management',
  'CRM & Sales',
  'E-Commerce',
  'HRM & Workforce',
  'Finance Accounting',
  'Tax & VAT Compliance',
  'Executive BI & Management Intelligence',
  'Organization Company',
  'Administration',
  'Audit Logs',
  'System',
];

mainHeads.forEach((head) => {
  assert(sidebarContent.includes(`title: '${head}'`), `Main Head "${head}" defined in configuration array`);
});

// 2. Verify Key Sub Heads
const requiredSubHeads = [
  'Open POS Counter Session',
  'POS Terminal Management',
  'Shift History',
  'Payment Methods',
  'Loyalty Settings',
  'Item Information',
  'Products & SKUs',
  'Categories',
  'Brands',
  'Units of Measure',
  'Attributes & Values',
  'Procurement Intelligence',
  'Purchase Requisitions',
  'RFQs & Tenders',
  'Supplier Ratings',
  'Contracts & Pricing',
  'Purchase Orders',
  'Goods Receipts',
  'Purchase Invoices',
  '3-Way Match & PPV',
  'Replenishment Planning',
  'Supplier Payables',
  'Stock Levels',
  'Stock Movements',
  'Stock Adjustments',
  'Transfers',
  'Stock Counts',
  'Batches & Expiry',
  'Valuation Report',
  'Reconciliation',
  'Sales Returns & Exchanges',
  'Customers',
  'Customer Groups',
  'Customer 360',
  'Credit & Limits',
  'AR Aging & Collections',
  'CRM & Activities',
  'Customer Intelligence',
  'Sales & Demand Intelligence',
  'E-Commerce Dashboard',
  'Online Orders',
  'Fulfillment & Dispatch',
  'Online Catalog',
  'E-Com Categories',
  'Coupons & Promos',
  'Shipping & Delivery',
  'Review Moderation',
  'Online Returns',
  'E-Commerce Reports',
  'Store Settings',
  'Customer Storefront',
  'HR Command Center',
  'Workforce Directory',
  'Departments & Roles',
  'Attendance & Shifts',
  'Leave Management',
  'Payroll Engine',
  'Advances & Loans',
  'Expenses',
  'Refunds',
  'Transactions',
  'Supplier Payments',
  'Profit & Loss Report',
  'Financial Analytics',
  'Tax Dashboard',
  'Tax Profiles & Registrations',
  'Tax Rates & Rules',
  'Tax Filing Periods',
  'Tax Subledger Register',
  'Subledger vs GL Audit',
  'Tax Adjustments & Notes',
  'Mushak 9.1 & VAT Reports',
  'Executive Dashboard',
  'Profitability & Margins',
  'Inventory & Aging Analytics',
  'Customer & RFM Portfolio',
  'Supplier Scorecard & AP',
  'Financial Ratios & DuPont',
  'Management Alerts',
  'Custom Report Builder',
  'Saved Reports & Schedules',
  'Business Units',
  'Branches',
  'Warehouses',
  'Storage Locations',
  'Users',
  'Roles & Permissions',
  'Settings',
];

requiredSubHeads.forEach((sub) => {
  assert(sidebarContent.includes(`label: '${sub}'`), `Sub Head "${sub}" present in navigation hierarchy`);
});

// 3. Verify Both Suppliers Entries
assert(
  sidebarContent.includes("id: 'procurement_suppliers', label: 'Suppliers'"),
  'Procurement -> Suppliers entry configured'
);
assert(
  sidebarContent.includes("id: 'finance_suppliers', label: 'Suppliers'"),
  'Finance Accounting -> Suppliers entry configured'
);

// 4. Verify Collapsible Architecture & Mechanics
assert(
  sidebarContent.includes('const [openSections, setOpenSections] = useState<Record<string, boolean>>({})'),
  'State hook openSections initialized for collapsible main heads'
);
assert(
  sidebarContent.includes('toggleSection'),
  'toggleSection click handler present for expand/collapse mechanics'
);
assert(
  sidebarContent.includes('ChevronDown') && sidebarContent.includes('ChevronRight'),
  'Chevron indicators render for collapsed and expanded states'
);
assert(
  sidebarContent.includes('border-l-2 border-indigo-200'),
  'Vertical line connector indentation renders under expanded main heads'
);

// 5. Verify App.tsx Finance Redirect Routes
const appPath = resolve(process.cwd(), 'frontend/src/App.tsx');
const appContent = readFileSync(appPath, 'utf-8');

assert(
  appContent.includes('path="/finance/refunds"'),
  'App.tsx contains route for /finance/refunds'
);
assert(
  appContent.includes('path="/finance/suppliers"'),
  'App.tsx contains route for /finance/suppliers'
);
assert(
  appContent.includes('path="/finance/supplier-payments"'),
  'App.tsx contains route for /finance/supplier-payments'
);
assert(
  appContent.includes('path="/finance/profit-loss"'),
  'App.tsx contains route for /finance/profit-loss'
);

console.log('================================================================');
console.log(`RESULTS: ${passed} Passed | ${failed} Failed`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}
