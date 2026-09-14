# Sprint 06 — POS + Sales

## Architecture Overview
This module completes the Sales foundation, implementing the core POS and Checkout functionality integrated directly with the Inventory (Sprint 03) and Customer (Sprint 05) components.

- `pos_terminals` & `pos_sessions`: Organizational scopes for cashier tracking. 
- `sales`: The primary transaction wrapper covering DRAFT, HELD, COMPLETED, and VOIDED statuses.
- `sale_items`: Granular cart items mapped structurally to `product_variants`.
- `sale_payments`: Supports CASH, CARD, BKASH, NAGAD, BANK. Allows mixed combinations.

### Core Rules
1. **No Direct Quantity Mutability**: POS does not update `inventories.quantity` directly. It calls `InventoryService::stockOut()` ensuring strict atomic integrity and locking.
2. **Strict Concurrency Safety**: All ledger entries, stock reductions, and sale finalizations are locked under `DB::transaction()` holding `lockForUpdate()` on variant records preventing negative stock conditions.
3. **Immutability**: Completed sales cannot be altered. Changes are prohibited. Later sprints will use Sales Return / Exchanges for adjustment.
4. **Idempotency & Uniqueness**: Duplicate submissions are naturally caught by the `invoice_number` uniqueness index under the `company_id` scope.

## Integration Dependencies
- **Stock Lock**: Connects to Sprint 03 `InventoryService` for accurate depletion of available inventory.
- **Credit Sales**: Connects to Sprint 05 `CustomerLedgerService`. A sale generating a due balance automatically registers a `DEBIT` entry on the customer's ledger as a Receivable.
- **Credit Limit**: Walk-in customers cannot run credit sales. Registered customers are checked against `credit_limit`.
- **Cost Snapshots**: Retains cost parameters directly in `sale_items` at the moment of depletion to permit true historical COGS generation inside Sprint 10 without retrospective recalculation.

## Endpoints

**POS Terminals**
- `GET /api/v1/pos/terminals`
- `POST /api/v1/pos/terminals`
- `PUT /api/v1/pos/terminals/{id}`

**POS Sessions**
- `GET /api/v1/pos/sessions/current`
- `POST /api/v1/pos/sessions/open`
- `POST /api/v1/pos/sessions/{id}/close`

**POS Products**
- `GET /api/v1/pos/products/search?q={query}`
- `GET /api/v1/pos/barcode/{barcode}`

**Sales**
- `GET /api/v1/sales`
- `GET /api/v1/sales/{id}`
- `POST /api/v1/sales/hold`
- `POST /api/v1/sales/complete`

## RBAC
Strict permission scopes are established for future UI tuning:
- `pos.view`, `pos.open_session`, `pos.close_session`, `pos.hold`
- `sales.view`, `sales.complete`

## Missing Functionalities Deferred
1. **Returns & Exchanges**: Specifically excluded as requested. Planned for Sprint 07.
2. **COGS Accounting Ledger**: Explicit accounting journal tracking deferred. Planned for Sprint 10.
