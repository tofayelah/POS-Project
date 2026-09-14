# SPRINT 11: REPORTS & DASHBOARD

## Overview
This document outlines the implementation of the Reports & Dashboard module (Sprint 11).

## Implementation Details

### 1. Controllers (backend/app/Http/Controllers/Api/V1/Reports/)
- **DashboardReportController**: `summary` endpoint providing net sales, gross profit, cost of goods sold, and KPI counts. Uses strict date bounds.
- **SalesReportController**: `sales` and `salesReturns` endpoints.
- **PurchaseReportController**: `purchases` endpoint.
- **ExpenseReportController**: `expenses` endpoint.
- **InventoryReportController**: `stockSummary` (valuation) and `movements` endpoints.
- **CustomerReportController**: `receivables` and `ledger` endpoints.
- **SupplierReportController**: `payables` and `ledger` endpoints.

### 2. Frontend
- **Dashboard.tsx**: Uses `recharts` for visual data representation. Implements date range selection and KPI grids.

### 3. Data Integrity & Reconciliation
- **Reports are READ-ONLY**. No new tables or ledgers were created.
- **COGS**: Uses historical snapshot values (`total_cost_snapshot`) from `sale_items`. Current product cost is not used to recalculate past sales.
- **Customer/Supplier Ledgers**: Receivables and Payables query directly from `CustomerLedger` and `SupplierLedger` aggregations.
- **Date Bounds**: Utilizes `startOfDay` and `endOfDay` for precise `between` query constraints.

### 4. Security & Permissions
- All report routes are secured via `auth:sanctum`.
- Strict middleware enforcement using `permission:reports.*`.
- Organization isolation enforced implicitly via `$request->attributes->get('company_id')`.

## Status
- Frontend implemented and verified (TypeScript compiles).
- Backend controllers and routes structurally complete.
- Backend tests created but could not be executed because the required PHP/Laravel/PostgreSQL runtime is unavailable in the environment.
