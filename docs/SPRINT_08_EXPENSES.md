# SPRINT 08 — EXPENSES

## Expense Architecture
Provides a robust operational expense management subsystem natively supporting independent multi-line categories dynamically scoping down to specific supplier liabilities (optional) across business units without touching inventory or bridging General Ledger natively.

## Category Hierarchy
Supported recursively through `parent_id` natively bound by `company_id`.

## Expense Lifecycle
Safely supports transitions across DRAFT, PENDING_APPROVAL, APPROVED, COMPLETED, CANCELLED, and REJECTED states tightly wrapped inside transactional locks tracking transition boundaries via `requested_by`, `approved_by`, `completed_by`, etc.

## Payment Architecture
Decoupled payment mechanism maintaining historically immutable `expense_payments` tables preserving method splits accurately mapping to outstanding headers dynamically tracking UNPAID, PARTIAL, and PAID statuses correctly.

## Supplier Interaction
Optionally integrates `supplier_id` directly retaining exact transaction paths avoiding modifying general ledgers implicitly but remaining fully prepared for SupplierLedger injections downstream if structurally commanded.

## RBAC & Approval
Granularly protected through distinct `.create`, `.approve`, `.reject`, `.complete`, `.cancel`, and `.payment.create` rules preventing arbitrary self-completion loops natively inside `ExpenseController`.

## Organization Scope
Strictly bound cross-table by `company_id` injections mapping granular boundaries identically against users.

## Idempotency & Concurrency
Comprehensively secured by explicit `idempotency_key` unique constraints coupled tightly inside `DB::transaction()` boundaries acquiring `lockForUpdate()` exclusively prior to processing fractional calculation loops.

## Audit Logging
Hooks emit discrete events capturing originations natively across state boundary movements correctly identifying modifying authors dynamically.

## Future Accounting Compatibility
Ensures structured abstraction blocks (`expense_category_id`, `subtotal`, `tax`, `discount`, `total_amount`, and atomic `payment_method` rows) correctly mirroring original events perfectly enabling accurate Sprint 09 GL compilation safely.

## Future Reporting Compatibility
Direct references structurally prepared facilitating fast filtering loops against categories, branches, and statuses.
