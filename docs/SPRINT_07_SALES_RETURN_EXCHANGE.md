# SPRINT 07 — SALES RETURN & EXCHANGE

## Architecture Overview
Sprint 07 extends the retail architecture by implementing a fully hardened Sales Return and Exchange subsystem. Adhering strictly to immutability rules, `sales_returns` exist as distinctly compensating events rather than mutating the original Sprint 06 tables. 

### Immutability Rule
Completed sales (`status = COMPLETED`) remain entirely historically intact. Sales Returns map original items (`sales_return_items` -> `original_sale_item_id`) and safely process reversals by interfacing directly with Sprint 03 `InventoryService` and Sprint 05 `CustomerLedgerService`.

## Database Schema
- `sales_returns`: Header defining return_type (`REFUND`, `STORE_CREDIT`, `EXCHANGE`), amount diffs, logic mappings to POS, and customer fields.
- `sales_return_items`: Robust item tracking encapsulating returned quantities, snapshotting historical data (sku, barcode), and replacement stock definitions for explicit exchanges.
- `sales_return_payments`: Tracking specific payment/refund workflows returned to customers.

## Key Lifecycles & Operations
- **Returns & Refunds:** Validates return quantities logically against remaining `eligible_quantity` ensuring overlapping or duplicate returns fail securely.
- **Customer Credit:** Integrates natively into `CustomerLedgerService::addAdjustment()`, capturing safe accounting ledgers matching the returned amounts explicitly bound to registered customers, and specifically blocking walk-ins from generating credit.
- **Inventory Restoration:** Uses existing `InventoryService::processMovement` to RESTORE resellable stock (`RETURN_IN`) dynamically. Damaged items execute `RETURN_IN` mapping cost, immediately followed by `DAMAGE` movement securely capturing loss without bloating standard inventory.
- **Exchanges:** Natively tracked on identical return rows utilizing `replacement_product_variant_id`. Exchanging items generates precise `EXCHANGE_OUT` inventory triggers.
- **Concurrency & Idempotency:** Implemented utilizing explicit `DB::transaction()` boundaries mapping `lockForUpdate()` around `Sales`, `SaleItem`, and `ProductVariant`, enforcing rigid isolation limiting parallel cashiers from over-refunding remaining quantities.

## API Endpoints
- `GET /api/v1/sales-returns`
- `GET /api/v1/sales-returns/{id}`
- `POST /api/v1/sales-returns`
- `GET /api/v1/sales/{id}/returnable-items`

## Tests
Constructed a 50-case integration testing suite (`CompleteSalesReturnTestSuite`) validating limits, rollbacks, ledger integrations, and returnable-item verifications accurately mapping structural requirements without manual inspection failures.

## Future Accounting Compatibility (Sprint 09/10)
Preserved full snapshot references (including moving-average unit costs) natively within return execution allowing Accounting engines to rebuild deferred COGS and precise Sales Return entries accurately into the General Ledger during later integration.
