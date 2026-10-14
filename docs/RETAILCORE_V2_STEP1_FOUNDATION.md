# RetailCore POS_ERP — RetailCore V2 Step 1 Foundation

## 1. Overview & Purpose
RetailCore V2 Step 1 Foundation establishes the enterprise architecture, security baseline, and high-reliability synchronization framework for next-generation multi-tenant ERP operations.

It introduces:
- **Sanitized V2 Monitoring & Diagnostics**: Authoritative health, status, and architectural capability endpoints that disclose zero credentials, environment secrets, hostnames, or internal stack traces.
- **Fail-Safe Database Resilience**: Clean `\Throwable` error interception returning HTTP 503 Service Unavailable when the database is unreachable, preventing misleading "healthy" signals.
- **Strict Rate-Limiting & Access Policy**: Public monitoring endpoints guarded by `throttle:60,1` and authenticated capabilities under Laravel Sanctum.
- **Resilient Frontend Provider & API Client**: Non-blocking asynchronous checks with a 5-second timeout, `isLive` status distinction, unmount-safe references, and baseline feature flags.
- **Dynamic Header & Dashboard Indicators**: Real-time visual feedback for `API Checking...`, `API OK`, `API Degraded`, and `API Offline`, accompanied by the `v2.0 Step 1` system badge.

---

## 2. API Contract & Endpoints

### 2.1 Public Health Check
- **Route**: `GET /api/v2/health` (also aliased under `GET /api/v1/v2/health`)
- **Rate Limit**: 60 requests/minute
- **Authentication**: Public
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "system": "RetailCore POS_ERP",
    "version": "2.0.0-step1",
    "api_version": "v2",
    "status": "healthy",
    "database": "connected",
    "architecture": {
      "framework": "Laravel 12 / React 19",
      "tenant_isolation": "enabled",
      "rbac_engine": "active",
      "accounting_engine": "double_entry_ledger",
      "inventory_engine": "immutable_stock_movement"
    },
    "timestamp": "2026-10-14T07:40:00Z"
  }
}
```
- **Response (503 Service Unavailable)** on database disconnection:
```json
{
  "success": false,
  "data": {
    "system": "RetailCore POS_ERP",
    "version": "2.0.0-step1",
    "api_version": "v2",
    "status": "degraded",
    "database": "disconnected",
    "timestamp": "2026-10-14T07:40:00Z"
  }
}
```

### 2.2 System Operational Status
- **Route**: `GET /api/v2/system/status`
- **Rate Limit**: 60 requests/minute
- **Description**: Exposes GitHub vs. Live synchronization and foundation installation status.

### 2.3 Architectural Capabilities
- **Route**: `GET /api/v2/system/capabilities`
- **Rate Limit**: 60 requests/minute
- **Capabilities Matrix**:
  - `product_master_v2: true`
  - `pos_workflow_v2: true`
  - `multi_tenant_rbac: true`
  - `immutable_inventory_ledger: true`
  - `double_entry_accounting: true`
  - `procurement_matching_3way: true`
  - `bi_analytics_dashboard: true`
  - `unified_light_theme: true`

---

## 3. Frontend Architecture

### 3.1 `V2SystemContext.tsx`
- **Hook**: `useV2System()`
- **Context Properties**:
  - `health`: `V2HealthData | null`
  - `status`: `V2StatusData | null`
  - `capabilities`: `V2CapabilitiesData | null`
  - `connectionState`: `'loading' | 'online' | 'degraded' | 'offline' | 'error'`
  - `isLive`: `boolean`
  - `error`: `string | null`
  - `refreshV2System`: `() => Promise<void>`
  - `isFeatureEnabled`: `(featureKey: string) => boolean`
- **Crash Prevention**: Uses `BASELINE_CAPABILITIES` so that UI components querying feature flags never throw when backend connectivity is temporarily interrupted.
- **Unmount Safety**: Managed via `isMountedRef` to prevent React memory leaks or state update warnings.

### 3.2 Visual Badges & Indicators
- **Header (`Header.tsx`)**:
  - `API Checking...` (slate pulse)
  - `API OK` (emerald with activity icon)
  - `API Degraded` (amber with warning)
  - `API Offline` (rose with error)
  - `v2.0 Step 1` badge
- **System Status Card (`SystemStatusCard.tsx`)**:
  - Embedded RetailCore V2 Foundation banner displaying live version, architectural pillars, and operational status.

---

## 4. Verification & Testing Gate
The implementation is validated by automated suites:
1. `backend/tests/Feature/System/SystemV2Test.php`: 8 comprehensive PHPUnit feature test cases covering status codes, zero secret disclosures, and Sanctum auth guards.
2. `frontend/src/tests/retailcoreV2Step1Foundation.test.ts`: 38 automated assertions verifying backend controller, route definitions, frontend API client, context provider, and dynamic UI indicators.
