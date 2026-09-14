# Sprint 03 — Inventory Foundation

## Architecture Overview
The inventory module follows a strict immutable ledger architecture.

- `inventories`: The current stock position per `company_id` + `warehouse_id` + `product_variant_id`.
- `stock_movements`: The immutable ledger of all stock quantity changes.
- `stock_transfers` & `stock_transfer_items`: The workflow for moving stock between warehouses.

### Core Rules
1. **Never edit `stock_movements`**. All movements are immutable. If a mistake is made, a compensating adjustment must be recorded.
2. **Never change stock without a movement**. Every quantity change requires a corresponding `stock_movement` record.
3. **Product & Variant**: Inventory is scoped to the `product_variant_id`, never just the `product_id`.
4. **Moving Average Cost**: Cost valuation uses a moving average logic during incoming stock movements.

## Endpoints

- `GET /api/v1/inventory` - View stock levels (supports filtering by warehouse, variant)
- `POST /api/v1/inventory/opening-stock` - Set initial stock
- `POST /api/v1/inventory/adjustments` - Adjust stock (add/subtract) with a mandatory reason
- `POST /api/v1/inventory/damage-loss` - Record damage or loss
- `GET /api/v1/inventory/movements` - View movement ledger

**Transfers**
- `POST /api/v1/inventory/transfers` - Create draft transfer
- `POST /api/v1/inventory/transfers/{id}/submit` - Submit transfer for approval
- `POST /api/v1/inventory/transfers/{id}/approve` - Approve transfer
- `POST /api/v1/inventory/transfers/{id}/ship` - Ship (decreases source stock)
- `POST /api/v1/inventory/transfers/{id}/receive` - Receive (increases destination stock)
- `POST /api/v1/inventory/transfers/{id}/cancel` - Cancel transfer

## Safety & Concurrency
- `DB::transaction` wraps every movement.
- `lockForUpdate()` is used on the `inventories` row before updating stock to prevent concurrent mutation race conditions.
- Negative stock is prevented unless explicitly bypassed by system configuration (default disabled).
