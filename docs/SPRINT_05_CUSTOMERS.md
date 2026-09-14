# Sprint 05 — Customer Foundation

## Architecture Overview
The Customer module provides a production-grade foundation for CRM and future Sales (POS) operations.

- `customers`: The core source of truth for customer entities, uniquely scoped per company.
- `customer_groups`: Categorization framework for future pricing/discount policies.
- `customer_ledgers`: An immutable ledger tracking customer opening balances, adjustments, and future sales/payments.

### Core Rules
1. **Ledger Immutability**: `customer_ledgers` is strictly append-only. No edits are allowed. Mistakes must be fixed via an `ADJUSTMENT` entry.
2. **Opening Balance Integrity**: A customer can only have one `OPENING_BALANCE` entry. It supports both DEBIT (customer owes us) and CREDIT (we owe customer) directions.
3. **Transaction Safety**: All ledger entries, including opening balances and adjustments, use pessimistic locking (`lockForUpdate()`) and atomic DB transactions.
4. **Data Isolation**: All operations explicitly check the route attribute `company_id`. No entity can bleed across organizational boundaries.

## Endpoints

**Customer Groups**
- `GET /api/v1/customer-groups`
- `POST /api/v1/customer-groups`
- `GET /api/v1/customer-groups/{id}`
- `PUT /api/v1/customer-groups/{id}`
- `DELETE /api/v1/customer-groups/{id}`

**Customers**
- `GET /api/v1/customers`
- `POST /api/v1/customers` (Optionally generates opening balance ledger entry)
- `GET /api/v1/customers/{id}`
- `PUT /api/v1/customers/{id}`
- `DELETE /api/v1/customers/{id}`
- `GET /api/v1/customers/search?q={query}` (Optimized for fast POS lookup)

**Customer Ledger**
- `GET /api/v1/customers/{id}/ledger`
- `POST /api/v1/customers/{id}/opening-balance`
- `POST /api/v1/customers/{id}/ledger/adjustment`

## Future Compatibility
- **POS / Sales**: Ready. `customer_id` is clean and perfectly isolated. Search API is designed for fast, indexed queries.
- **Credit Limits & Payment Terms**: Foundation built. Not enforced until Sales modules are constructed.
- **Accounting Engine**: The `customer_ledgers` can be mirrored into an Accounts Receivable sub-ledger when Sprint 09/10 is built. General Ledger journals have been explicitly avoided in this sprint.

## RBAC
Strict permission checks enforce boundaries at the route level:
- `customers.view`, `.create`, `.update`, `.delete`
- `customer_groups.view`, `.create`, `.update`, `.delete`
- `customer_ledger.view`, `.create_opening_balance`, `.create_adjustment`

## Audit Logging
Comprehensive events tracking entity lifecycle and ledger operations:
- `CUSTOMER_CREATED`
- `CUSTOMER_UPDATED`
- `CUSTOMER_OPENING_BALANCE_CREATED`
- `CUSTOMER_LEDGER_ADJUSTED`
