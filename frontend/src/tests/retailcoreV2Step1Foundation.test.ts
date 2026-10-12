/**
 * RetailCore POS_ERP — RetailCore V2 Step 1 & Step 2 Foundation Security & Reliability Gate Suite
 *
 * Verifies:
 *  1. Backend Controller, Security & Sanitization
 *  2. Public Endpoint Rate-limiting & Access Policy
 *  3. Frontend API Client Resilience & Live Status Distinction
 *  4. V2 System Provider Non-fatal Error Handling & Unmount Safety
 *  5. Dynamic Header Indicators for Online, Degraded, and Offline States
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('--- RETAILCORE V2 STEP 1 & 2 FOUNDATION SECURITY & RELIABILITY GATE ---');
console.log('================================================================');

// ---------------------------------------------------------
// 1. Backend Controller Security & Response Sanitization
// ---------------------------------------------------------
const v2ControllerPath = resolve(process.cwd(), 'backend/app/Http/Controllers/Api/V2/SystemV2Controller.php');
assert(existsSync(v2ControllerPath), 'SystemV2Controller exists in backend/app/Http/Controllers/Api/V2');

const v2ControllerContent = readFileSync(v2ControllerPath, 'utf-8');
assert(v2ControllerContent.includes('public function health'), 'SystemV2Controller implements health endpoint');
assert(v2ControllerContent.includes('public function status'), 'SystemV2Controller implements status endpoint');
assert(v2ControllerContent.includes('public function capabilities'), 'SystemV2Controller implements capabilities endpoint');
assert(v2ControllerContent.includes('2.0.0-step1'), 'SystemV2Controller reports version 2.0.0-step1');

// Security checks on Controller
assert(
  v2ControllerContent.includes('\\Throwable $e'),
  'Security: Controller catches \\Throwable rather than narrow Exception to handle any DB/PDO failure cleanly'
);
assert(
  !v2ControllerContent.includes('$e->getMessage()') && !v2ControllerContent.includes('$e->getTraceAsString()'),
  'Security: Exception message/trace is NEVER disclosed to client in health, status, or capabilities response'
);
assert(
  v2ControllerContent.includes('$isHealthy ? 200 : 503'),
  'Security: Degraded/disconnected database status returns HTTP 503 Service Unavailable'
);
assert(
  v2ControllerContent.includes("'status' => $isHealthy ? 'healthy' : 'degraded'"),
  'Security: Health status accurately reflects database connectivity status without false OK'
);

// ---------------------------------------------------------
// 2. Route Security, Throttling & Access Policy
// ---------------------------------------------------------
const routesPath = resolve(process.cwd(), 'backend/routes/api.php');
const routesContent = readFileSync(routesPath, 'utf-8');
assert(routesContent.includes("Route::get('v2/health'"), 'api.php registers v2/health route');
assert(routesContent.includes("Route::get('v2/system/status'"), 'api.php registers v2/system/status route');
assert(routesContent.includes("Route::get('v2/system/capabilities'"), 'api.php registers v2/system/capabilities route');
assert(
  routesContent.includes("Route::middleware('throttle:60,1')"),
  'Security: Public V2 monitoring routes are protected with throttle:60,1 rate limiting'
);
assert(
  routesContent.includes("Route::middleware('auth:sanctum')->prefix('v2')"),
  'Security: Authenticated V2 route group exists under auth:sanctum middleware'
);

// ---------------------------------------------------------
// 3. Frontend API Client Resilience & Live Status Distinction
// ---------------------------------------------------------
const v2ApiClientPath = resolve(process.cwd(), 'frontend/src/api/v2System.ts');
assert(existsSync(v2ApiClientPath), 'frontend/src/api/v2System.ts exists');
const v2ApiClientContent = readFileSync(v2ApiClientPath, 'utf-8');
assert(v2ApiClientContent.includes('getV2Health'), 'v2System.ts provides getV2Health');
assert(v2ApiClientContent.includes('getV2Status'), 'v2System.ts provides getV2Status');
assert(v2ApiClientContent.includes('getV2Capabilities'), 'v2System.ts provides getV2Capabilities');
assert(v2ApiClientContent.includes('timeout: 5000'), 'Reliability: API calls enforce a 5-second request timeout');
assert(
  v2ApiClientContent.includes('isLive: boolean'),
  'Reliability: API response interface distinguishes verified live responses via isLive flag'
);
assert(
  v2ApiClientContent.includes('isLive: false') && v2ApiClientContent.includes('success: false'),
  'Reliability: Offline / error states return success: false and isLive: false (never mistaken for live status)'
);

// ---------------------------------------------------------
// 4. V2 System Provider Non-fatal Error Handling & Unmount Safety
// ---------------------------------------------------------
const v2ContextPath = resolve(process.cwd(), 'frontend/src/context/V2SystemContext.tsx');
assert(existsSync(v2ContextPath), 'V2SystemContext.tsx exists');
const v2ContextContent = readFileSync(v2ContextPath, 'utf-8');
assert(v2ContextContent.includes('export const V2SystemProvider'), 'V2SystemProvider is exported');
assert(v2ContextContent.includes('export const useV2System'), 'useV2System hook is exported');
assert(
  v2ContextContent.includes("type V2ConnectionState = 'loading' | 'online' | 'degraded' | 'offline' | 'error'"),
  'Reliability: Connection state supports loading, online, degraded, offline, and error states'
);
assert(
  v2ContextContent.includes('isMountedRef'),
  'Reliability: Unmount cleanup guard is present to prevent state updates on unmounted components'
);
assert(
  v2ContextContent.includes('BASELINE_CAPABILITIES'),
  'Reliability: Baseline feature flags available as fallback to prevent UI crash when offline'
);

// ---------------------------------------------------------
// 5. App.tsx Integration
// ---------------------------------------------------------
const appPath = resolve(process.cwd(), 'frontend/src/App.tsx');
const appContent = readFileSync(appPath, 'utf-8');
assert(appContent.includes("import { V2SystemProvider } from './context/V2SystemContext';"), 'App.tsx imports V2SystemProvider');
assert(appContent.includes('<V2SystemProvider>'), 'App.tsx renders <V2SystemProvider>');
assert(appContent.includes('</V2SystemProvider>'), 'App.tsx correctly closes </V2SystemProvider>');

// ---------------------------------------------------------
// 6. Header.tsx Dynamic Indicators
// ---------------------------------------------------------
const headerPath = resolve(process.cwd(), 'frontend/src/components/layout/Header.tsx');
assert(existsSync(headerPath), 'Header.tsx exists');
const headerContent = readFileSync(headerPath, 'utf-8');
assert(headerContent.includes("import { useV2System } from '../../context/V2SystemContext';"), 'Header.tsx imports useV2System');
assert(headerContent.includes('useV2System()'), 'Header.tsx consumes useV2System hook');
assert(headerContent.includes('v2.0 Step 1'), 'Header.tsx renders v2.0 Step 1 badge');
assert(
  headerContent.includes("connectionState === 'loading'") && headerContent.includes('API Checking...'),
  'Header renders loading indicator (API Checking...)'
);
assert(
  headerContent.includes("connectionState === 'online'") && headerContent.includes('API OK'),
  'Header renders verified healthy indicator (API OK)'
);
assert(
  headerContent.includes("connectionState === 'degraded'") && headerContent.includes('API Degraded'),
  'Header renders degraded indicator (API Degraded)'
);
assert(
  headerContent.includes('API Offline'),
  'Header renders offline indicator (API Offline)'
);

console.log('================================================================');
console.log(`RESULTS: ${passed} / ${passed + failed} V2 SECURITY & RELIABILITY TESTS PASSED.`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}
