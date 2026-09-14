# Sprint 01 — Authentication & Authorization Security Documentation

## 1. Authentication Mechanism
- **Engine**: Laravel Sanctum Personal Access Tokens.
- **Login**: `POST /api/v1/auth/login`. Validates credentials against hashed passwords using `Hash::check()`. Rejects inactive accounts with `HTTP 403`. Updates `last_login_at`. Returns personal access token with flat list of user permissions.
- **Logout**: `POST /api/v1/auth/logout`. Deletes `$request->user()->currentAccessToken()` from the `personal_access_tokens` database table.
- **Session Verification**: `GET /api/v1/auth/me`. Resolves authenticated user, reloads roles and permissions, and returns profile payload. Rejection returns `HTTP 401`.

## 2. Authorization Mechanism
- **Model**: Database-driven Role-Based Access Control (RBAC).
- **Backend Middleware**: `App\Http\Middleware\CheckPermission` (`permission:<permission_name>`).
  - Blocks unauthenticated requests with `HTTP 401`.
  - Blocks inactive users with `HTTP 403`.
  - Grants global enterprise bypass to `Super Admin`.
  - Enforces explicit permission checks against `$user->roles->flatMap->permissions`. Rejects unauthorized users with `HTTP 403 Forbidden`.
- **Laravel Gate**: `Gate::before` callback defined in `AppServiceProvider` granting universal bypass to `Super Admin`.

## 3. Permission Naming Standard
Permissions use the dot-notation domain convention:
- **Users**: `users.view`, `users.create`, `users.update`, `users.delete`, `users.activate`, `users.deactivate`
- **Roles**: `roles.view`, `roles.create`, `roles.update`, `roles.delete`, `roles.assign`
- **Business Units**: `business_units.view`, `business_units.create`, `business_units.update`, `business_units.delete`
- **Branches**: `branches.view`, `branches.create`, `branches.update`, `branches.delete`
- **Warehouses**: `warehouses.view`, `warehouses.create`, `warehouses.update`, `warehouses.delete`
- **Settings**: `settings.view`, `settings.update`
- **Audit Logs**: `audit_logs.view`

## 4. Organizational Authorization Model
- **Hierarchy**: Company $\rightarrow$ Business Unit $\rightarrow$ Branch $\rightarrow$ Warehouse.
- **Pivot Tables**: `user_company_access`, `user_business_unit_access`, `user_branch_access`, `user_warehouse_access`.
- **Backend Middleware**: `App\Http\Middleware\CheckOrganizationalScope` (`scope:<scope_type>`).
- **Scope Verification**: Intercepts target entity IDs from route parameters, query strings, or request payloads. Verifies that non-Super-Admin users hold direct assignment to the target entity or its parent company/branch. Unauthorized ID tampering returns `HTTP 403 Forbidden`.

## 5. Login Rate Limiting
- **Limiter**: Dedicated `RateLimiter::for('login')` registered in `AppServiceProvider`.
- **Threshold**: 5 requests per minute.
- **Keying**: Normalized lowercase email and client IP (`$normalizedEmail . '|' . $request->ip()`).
- **Response**: `HTTP 429 Too Many Requests` with generic message (`"Too many login attempts. Please try again in 60 seconds."`) and `Retry-After` header. Zero account enumeration exposure.

## 6. Token / Session Storage Decision
- **Current Setup**: Bearer tokens stored in browser `localStorage`.
- **Decision**: Bearer token architecture temporarily preserved to maintain compatibility across decoupled development container origins (`localhost:3000` vs `localhost:8000`) and keep existing verified frontend flows intact.
- **Production Migration Plan**: Migrate to Sanctum first-party cookie session authentication (`httpOnly`, `Secure`, `SameSite=Lax`, CSRF protection) upon production deployment under a unified top-level domain (e.g. `.retailcore.com`).

## 7. Security Considerations
- **No Sensitive Credential Logging**: Passwords, hashes, and tokens are never logged to console, error handlers, or audit logs.
- **Constant-Time Response**: Login endpoint avoids user enumeration timing discrepancies.
- **Default Deny**: All backend permission and scope checks default to denial if relations are missing or unassigned.
