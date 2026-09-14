# Sprint 04 — Suppliers + Purchase

## Architecture Overview
The Supplier and Purchase module provides a production-grade foundation for procurement, strictly integrating with the existing Inventory Foundation.

- `suppliers`: The source of truth for vendor entities, uniquely scoped per company.
- `supplier_ledgers`: An immutable ledger tracking opening balances, purchases, and eventually payments.
- `purchase_orders`: The initial intent to purchase, controlling quantities ordered and expected.
- `goods_receipts`: The physical receipt of items, acting as the trigger for inventory increases.
- `purchases`: The financial invoice mapping to supplier payables.

### Core Rules
1. **Goods Receipt triggers Inventory**: The `GoodsReceiptController` utilizes the `PurchaseService` which safely wraps `InventoryService::processMovement('STOCK_IN')`. We DO NOT duplicate inventory logic.
2. **Immutability**: `supplier_ledgers` and `stock_movements` are strictly append-only.
3. **Quantity Control**: The system strictly prevents over-receiving. `received_quantity` cannot exceed `pending_quantity` on a Purchase Order line item.
4. **Valuation**: The moving average logic inside `InventoryService` remains the sole authority for inventory valuation, receiving `unit_cost` from the Goods Receipt line items.

## Endpoints

**Suppliers**
- `GET /api/v1/suppliers`
- `POST /api/v1/suppliers` (Automatically generates an opening balance ledger entry if > 0)
- `GET /api/v1/suppliers/{id}`
- `PUT /api/v1/suppliers/{id}`
- `DELETE /api/v1/suppliers/{id}`

**Purchase Orders**
- `GET /api/v1/purchase-orders`
- `POST /api/v1/purchase-orders`
- `GET /api/v1/purchase-orders/{id}`
- `POST /api/v1/purchase-orders/{id}/approve`

**Goods Receipts**
- `GET /api/v1/goods-receipts`
- `POST /api/v1/goods-receipts`
- `POST /api/v1/goods-receipts/{id}/post` (Triggers DB transaction updating PO status, PO quantities, and Inventory)

**Purchases (Invoices)**
- `GET /api/v1/purchases`
- `POST /api/v1/purchases`
- `POST /api/v1/purchases/{id}/post` (Triggers Supplier Ledger update)

## Safety & Concurrency
- All critical multi-step operations (`postGoodsReceipt`, `postPurchaseInvoice`) use `DB::transaction`.
- `lockForUpdate()` is used heavily: on Goods Receipt, Purchase Order Items, Purchases, and Suppliers, preventing race conditions.
- Uses `InventoryService` which enforces database-level row locks on inventory positions.

## Future Compatibility
- **Customers / POS / Sales Return**: Ready. No dependency conflicts.
- **Supplier Payment**: `supplier_ledgers` is structured to accept `PAYMENT` transaction types, mapping easily to a future Cash/Bank module.
- **Accounting Engine**: The `supplier_ledgers` can be mirrored into an Accounts Payable sub-ledger when Sprint 09 is built. General Ledger journals have explicitly been avoided in this sprint.
