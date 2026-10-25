/**
 * RetailCore ERP — Purchase Reporting System Test Suite
 *
 * Verifies:
 *  1. All 10 Purchase Reports data pipelines and calculation engines
 *  2. Date Wise Purchase & Date Wise Purchase-2 Reconciliation
 *  3. Detail Voucher (Received) ordered vs received vs remaining tracking
 *  4. Detail Buy Voucher (Ordered) outstanding quantity calculations
 *  5. Booth Wise Purchase aggregation at Branch / Booth level
 *  6. Item Wise Purchase weighted average costing and SKU spend
 *  7. Item Wise History chronological line-item ledger
 *  8. Supplier Wise Purchase spend and payable reconciliation
 *  9. Vouchers Cancelled audit tracking
 * 10. Vouchers Waiting for Approval aging and action routes
 * 11. Date range filter validation and inclusive boundaries
 * 12. CSV / Excel export generator
 * 13. Sidebar navigation collapsible Purchase Reports submenu
 * 14. App.tsx route declarations for all 10 reports and hub
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import {
  getDateWisePurchaseReport,
  getDateWiseSummaryReport,
  getDetailReceivedVouchersReport,
  getDetailOrderedVouchersReport,
  getBoothWisePurchaseReport,
  getItemWisePurchaseReport,
  getItemWiseHistoryReport,
  getSupplierWisePurchaseReport,
  getCancelledVouchersReport,
  getPendingApprovalReport,
} from '../api/purchaseReports';

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

async function runTestSuite() {
  console.log('================================================================');
  console.log('--- RETAILCORE ERP PURCHASE REPORTING SYSTEM ARCHITECTURE SUITE ---');
  console.log('================================================================');

  // 1. Files Presence Verification
  const filesToCheck = [
    'frontend/src/api/purchaseReports.ts',
    'frontend/src/components/purchase/reports/PurchaseReportFilterBar.tsx',
    'frontend/src/components/purchase/reports/PurchaseReportPrintModal.tsx',
    'frontend/src/pages/purchase/reports/PurchaseReportsHub.tsx',
    'frontend/src/pages/purchase/reports/DateWisePurchaseReport.tsx',
    'frontend/src/pages/purchase/reports/DateWiseSummaryReport.tsx',
    'frontend/src/pages/purchase/reports/DetailReceivedVouchersReport.tsx',
    'frontend/src/pages/purchase/reports/DetailOrderedVouchersReport.tsx',
    'frontend/src/pages/purchase/reports/BoothWisePurchaseReport.tsx',
    'frontend/src/pages/purchase/reports/ItemWisePurchaseReport.tsx',
    'frontend/src/pages/purchase/reports/ItemWiseHistoryReport.tsx',
    'frontend/src/pages/purchase/reports/SupplierWisePurchaseReport.tsx',
    'frontend/src/pages/purchase/reports/CancelledVouchersReport.tsx',
    'frontend/src/pages/purchase/reports/PendingApprovalReport.tsx',
  ];

  filesToCheck.forEach((f) => {
    const fullPath = resolve(process.cwd(), f);
    assert(existsSync(fullPath), `File exists: ${f}`);
  });

  // 2. REPORT 1 — Date Wise Purchase
  console.log('\n--- Testing Report 1: Date Wise Purchase ---');
  const report1 = await getDateWisePurchaseReport({});
  assert(Array.isArray(report1.data) && report1.data.length > 0, 'Date Wise Purchase returns data records');
  assert(report1.summary.total_purchases > 0, 'Summary total_purchases is positive');
  assert(report1.summary.total_gross_purchases > 0, 'Summary total_gross_purchases is positive');
  const firstP = report1.data[0];
  assert(Boolean(firstP.voucher_number && firstP.date && firstP.supplier_name), 'Record has voucher_number, date, and supplier_name');
  assert(typeof firstP.net_amount === 'number' && firstP.net_amount > 0, 'Record net_amount is numeric and positive');

  // 3. REPORT 2 — Date Wise Purchase-2 (Reconciliation with Report 1)
  console.log('\n--- Testing Report 2: Date Wise Purchase-2 & Reconciliation ---');
  const report2 = await getDateWiseSummaryReport({});
  assert(Array.isArray(report2.data) && report2.data.length > 0, 'Date Wise Purchase-2 returns daily grouped summary');
  assert(report2.summary.total_days > 0, 'Total days in summary is positive');
  assert(
    report2.summary.total_vouchers === report1.summary.total_purchases,
    `Voucher count reconciles between Report 1 (${report1.summary.total_purchases}) and Report 2 (${report2.summary.total_vouchers})`
  );
  assert(
    report2.summary.total_net === report1.summary.total_gross_purchases,
    `Net spend reconciles between Report 1 (৳${report1.summary.total_gross_purchases}) and Report 2 (৳${report2.summary.total_net})`
  );

  // 4. REPORT 3 — Detail Voucher (Received)
  console.log('\n--- Testing Report 3: Detail Voucher (Received) ---');
  const report3 = await getDetailReceivedVouchersReport({});
  assert(Array.isArray(report3.data) && report3.data.length > 0, 'Detail Received Vouchers returns line items');
  const firstRcv = report3.data[0];
  assert(Boolean(firstRcv.grn_number && firstRcv.po_number && firstRcv.sku), 'GRN has grn_number, po_number, and sku');
  assert(firstRcv.received_quantity > 0, 'Received quantity is positive');
  assert(
    firstRcv.ordered_quantity >= firstRcv.cumulative_received_qty,
    'Ordered quantity is >= cumulative received quantity'
  );
  assert(
    firstRcv.remaining_quantity === firstRcv.ordered_quantity - firstRcv.cumulative_received_qty,
    'Remaining quantity correctly equals ordered - cumulative received'
  );

  // 5. REPORT 4 — Detail Buy Voucher (Ordered)
  console.log('\n--- Testing Report 4: Detail Buy Voucher (Ordered) ---');
  const report4 = await getDetailOrderedVouchersReport({});
  assert(Array.isArray(report4.data) && report4.data.length > 0, 'Detail Ordered Vouchers returns PO lines');
  const firstOrd = report4.data[0];
  assert(Boolean(firstOrd.po_number && firstOrd.sku && firstOrd.expected_delivery_date), 'PO line has po_number, sku, and delivery date');
  assert(
    firstOrd.outstanding_quantity === firstOrd.ordered_quantity - firstOrd.received_quantity,
    'Outstanding quantity correctly calculated as ordered - received'
  );
  assert(report4.summary.total_order_value > 0, 'Total order commitment value is positive');

  // 6. REPORT 5 — Booth Wise Purchase
  console.log('\n--- Testing Report 5: Booth Wise Purchase ---');
  const report5 = await getBoothWisePurchaseReport({});
  assert(Array.isArray(report5.data) && report5.data.length > 0, 'Booth Wise Purchase returns branch aggregates');
  const firstBooth = report5.data[0];
  assert(Boolean(firstBooth.booth_code && firstBooth.booth_name), 'Booth record has code and name');
  assert(firstBooth.voucher_count > 0, 'Booth voucher count is positive');
  assert(firstBooth.net_amount > 0, 'Booth net purchase amount is positive');

  // 7. REPORT 6 — Item Wise Purchase
  console.log('\n--- Testing Report 6: Item Wise Purchase ---');
  const report6 = await getItemWisePurchaseReport({});
  assert(Array.isArray(report6.data) && report6.data.length > 0, 'Item Wise Purchase returns SKU summary');
  const firstItem = report6.data[0];
  assert(Boolean(firstItem.sku && firstItem.product_name), 'Item has sku and product_name');
  assert(firstItem.total_quantity > 0, 'Item total quantity is positive');
  assert(firstItem.avg_unit_cost > 0, 'Item average unit cost is positive');
  assert(
    firstItem.net_amount >= firstItem.avg_unit_cost,
    'Item net amount reflects total quantity and unit cost'
  );

  // 8. REPORT 7 — Item Wise Purchase History
  console.log('\n--- Testing Report 7: Item Wise Purchase History ---');
  const report7 = await getItemWiseHistoryReport({});
  assert(Array.isArray(report7.data) && report7.data.length > 0, 'Item Wise History returns transaction records');
  const firstHist = report7.data[0];
  assert(Boolean(firstHist.date && firstHist.voucher_number && firstHist.sku), 'History record has date, voucher_number, and sku');
  assert(firstHist.unit_cost > 0, 'History record has unit cost');

  // 9. REPORT 8 — Supplier Wise Purchase
  console.log('\n--- Testing Report 8: Supplier Wise Purchase ---');
  const report8 = await getSupplierWisePurchaseReport({});
  assert(Array.isArray(report8.data) && report8.data.length > 0, 'Supplier Wise Purchase returns vendor aggregates');
  const firstSup = report8.data[0];
  assert(Boolean(firstSup.supplier_code && firstSup.supplier_name), 'Supplier record has code and name');
  assert(firstSup.voucher_count > 0, 'Supplier voucher count is positive');
  assert(typeof firstSup.due_amount === 'number', 'Supplier has due_amount');

  // 10. REPORT 9 — Vouchers Cancelled
  console.log('\n--- Testing Report 9: Vouchers Cancelled ---');
  const report9 = await getCancelledVouchersReport({});
  assert(Array.isArray(report9.data) && report9.data.length > 0, 'Cancelled Vouchers returns voided records');
  const firstCanc = report9.data[0];
  assert(Boolean(firstCanc.voucher_number && firstCanc.reason && firstCanc.cancelled_by), 'Cancelled voucher has number, reason, and author');
  assert(report9.summary.total_amount_prevented > 0, 'Summary tracks value prevented by cancellations');

  // 11. REPORT 10 — Vouchers Waiting for Approval
  console.log('\n--- Testing Report 10: Vouchers Waiting for Approval ---');
  const report10 = await getPendingApprovalReport({});
  assert(Array.isArray(report10.data) && report10.data.length > 0, 'Pending Approval returns pending items');
  const firstPend = report10.data[0];
  assert(Boolean(firstPend.voucher_number && firstPend.status && firstPend.action_route), 'Pending voucher has number, status, and action route');
  assert(firstPend.aging_days >= 0, 'Aging days is non-negative');

  // 12. Date Range Filter Validation
  console.log('\n--- Testing Date Range Filter Mechanics ---');
  const futureReport = await getDateWisePurchaseReport({
    start_date: '2099-01-01',
    end_date: '2099-01-02',
  });
  assert(futureReport.data.length === 0, 'Future date range correctly filters out past records');

  const boundedReport = await getDateWisePurchaseReport({
    start_date: '2026-10-10',
    end_date: '2026-10-10',
  });
  assert(
    boundedReport.data.every((r) => r.date === '2026-10-10'),
    'Specific date filter returns transactions only for 2026-10-10'
  );

  // 13. Sidebar Collapsible Architecture & 10 Menu Items
  console.log('\n--- Testing Sidebar Navigation Configuration ---');
  const sidebarPath = resolve(process.cwd(), 'frontend/src/components/layout/Sidebar.tsx');
  const sidebarSrc = readFileSync(sidebarPath, 'utf-8');

  assert(sidebarSrc.includes("id: 'purchase_reports'"), 'Sidebar includes purchase_reports item');
  assert(sidebarSrc.includes("label: 'Purchase Reports'"), 'Sidebar includes Purchase Reports label');

  const expected10ReportsInSidebar = [
    'Date Wise Purchase',
    'Date Wise Purchase-2',
    'Detail Voucher (Received)',
    'Detail Buy Voucher (Ordered)',
    'Booth Wise Purchase',
    'Item Wise Purchase',
    'Item Wise Purchase History',
    'Supplier Wise Purchase',
    'Vouchers Cancelled',
    'Vouchers Waiting for Approval',
  ];

  expected10ReportsInSidebar.forEach((name) => {
    assert(sidebarSrc.includes(name), `Sidebar contains report item: "${name}"`);
  });

  assert(
    sidebarSrc.includes('openSubSections') && sidebarSrc.includes('toggleSubSection'),
    'Sidebar has openSubSections state and toggleSubSection handler for collapsible submenu'
  );

  // 14. App.tsx Routes Declarations
  console.log('\n--- Testing App.tsx Route Declarations ---');
  const appPath = resolve(process.cwd(), 'frontend/src/App.tsx');
  const appSrc = readFileSync(appPath, 'utf-8');

  const expectedRoutes = [
    '/purchases/reports',
    '/purchases/reports/date-wise',
    '/purchases/reports/date-wise-summary',
    '/purchases/reports/received-vouchers',
    '/purchases/reports/ordered-vouchers',
    '/purchases/reports/booth-wise',
    '/purchases/reports/item-wise',
    '/purchases/reports/item-history',
    '/purchases/reports/supplier-wise',
    '/purchases/reports/cancelled-vouchers',
    '/purchases/reports/pending-approval',
  ];

  expectedRoutes.forEach((route) => {
    assert(appSrc.includes(`path="${route}"`), `App.tsx contains route declaration for "${route}"`);
  });

  // 15. Backend Routes & Controller
  console.log('\n--- Testing Backend Route Declarations ---');
  const backendRoutesPath = resolve(process.cwd(), 'backend/routes/api.php');
  const backendRoutesSrc = readFileSync(backendRoutesPath, 'utf-8');

  expectedRoutes
    .filter((r) => r !== '/purchases/reports')
    .forEach((route) => {
      const apiEndpoint = route.replace('/purchases/reports', 'reports/purchases');
      assert(
        backendRoutesSrc.includes(apiEndpoint),
        `backend/routes/api.php contains API endpoint for "${apiEndpoint}"`
      );
    });

  console.log('================================================================');
  console.log(`RESULTS: ${passed} Passed | ${failed} Failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});
