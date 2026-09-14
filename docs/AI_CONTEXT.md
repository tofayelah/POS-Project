# RetailCore ERP - AI Context

## Project Overview
**Name:** RetailCore ERP
**Type:** Production-grade, self-hosted Retail POS + Inventory + Purchasing + Accounting ERP.
**Objective:** Build a scalable foundation supporting multiple companies, business units, branches, and warehouses, culminating in a robust double-entry accounting and immutable inventory ledger system.

## Environment Constraints
- **AI Studio Preview:** The live AI Studio container is a Node.js environment. It cannot run PHP 8.3+ or Docker Compose.
- **Resolution:** The codebase is structured as a standard monorepo (`backend/`, `frontend/`, `docker/`). Development here focuses on writing the exact production-ready code. Verification and execution will occur locally on the user's machine via `docker-compose up` after exporting the project. 
- *Note:* We use npm workspaces in the root `package.json` to allow the AI Studio container to compile the `/frontend` SPA for live previewing.

## Architecture Decisions
- **Stack:** Laravel 12 API (PHP 8.3+), React 19/TypeScript/Vite (Frontend SPA), PostgreSQL 16 (Database), Docker Compose (Infrastructure).
- **Authentication:** Laravel Sanctum token-based auth for SPA.
- **IDs:** Primary integer IDs for internal relationships, UUIDs for public API endpoints.
- **Money:** PostgreSQL `NUMERIC(15,4)` to prevent floating-point errors.
- **Timezones:** UTC internally. Displayed according to business timezone (Default: `Asia/Dhaka`).
- **Data Integrity:** Strict foreign keys, unique constraints, NOT NULL constraints. 
- **Transactions:** DB transactions mandatory for multi-table writes.
- **CORS:** Restricted to `http://localhost:3000` with `supports_credentials = true`.

## Organizational Hierarchy
1. Company
2. Business Unit
3. Branch
4. Warehouse
5. POS Terminal (Future)

## User & Organizational Access
- RBAC implemented via database-driven roles and permissions.
- Scoped access implemented via pivot tables (`user_company_access`, `user_business_unit_access`, `user_branch_access`, `user_warehouse_access`).
- Authorization enforces both role permissions and organizational scope natively via backend Models & Policies.

## Important Invariants (Future)
- **Accounting:** Double-entry bookkeeping. Every posted journal must satisfy TOTAL DEBITS = TOTAL CREDITS. Immutable.
- **Inventory:** Stock changes must originate from controlled stock movements. No arbitrary overwrite of stock quantities.

## Sprint History
- **Sprint 01:** Foundation (Auth, Organization CRUD, RBAC, Settings, Audit Logs, Infrastructure). [STATICALLY VERIFIED & PRE-EXPORT REMEDIATED]

## Known Technical Debt
- **Backend Verification:** Because the AI Studio sandbox strictly runs Node.js and lacks PHP 8.3+ / Composer / Docker, the Laravel backend code (migrations, routes, models, controllers) was scaffolded statically. It *must* be executed and tested locally on the user's host environment.
