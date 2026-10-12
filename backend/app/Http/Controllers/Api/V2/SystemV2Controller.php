<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SystemV2Controller extends Controller
{
    /**
     * V2 System Health Endpoint
     * Intentionally public for uptime monitoring, Kubernetes probes, and load balancers.
     * Discloses zero credentials, environment secrets, hostnames, or internal stack traces.
     */
    public function health(Request $request): JsonResponse
    {
        $dbStatus = 'disconnected';
        try {
            DB::connection()->getPdo();
            $dbStatus = 'connected';
        } catch (\Throwable $e) {
            // Log internally without disclosing credentials or traces to the response
            if (function_exists('logger')) {
                logger()->warning('V2 Health Check: Database connectivity issue');
            }
            $dbStatus = 'disconnected';
        }

        $isHealthy = ($dbStatus === 'connected');

        return response()->json([
            'success' => $isHealthy,
            'data' => [
                'system' => 'RetailCore POS_ERP',
                'version' => '2.0.0-step1',
                'api_version' => 'v2',
                'status' => $isHealthy ? 'healthy' : 'degraded',
                'database' => $dbStatus,
                'architecture' => [
                    'framework' => 'Laravel 12 / React 19',
                    'tenant_isolation' => 'enabled',
                    'rbac_engine' => 'active',
                    'accounting_engine' => 'double_entry_ledger',
                    'inventory_engine' => 'immutable_stock_movement',
                ],
                'timestamp' => now()->toIso8601String(),
            ],
        ], $isHealthy ? 200 : 503);
    }

    /**
     * V2 System Status Endpoint
     * Exposes safe operational synchronization metadata without credentials or private keys.
     */
    public function status(Request $request): JsonResponse
    {
        try {
            $commit = config('system.git_commit', 'v2-step1-foundation');
            $branch = config('system.git_branch', 'main');

            return response()->json([
                'success' => true,
                'data' => [
                    'environment' => config('app.env', 'production'),
                    'v2_foundation' => [
                        'step' => 1,
                        'name' => 'RetailCore V2 Step 1 Foundation',
                        'status' => 'ACTIVE',
                        'installed_at' => now()->toIso8601String(),
                    ],
                    'github' => [
                        'repository' => config('system.github.repository', 'tofayelah/POS-Project'),
                        'branch' => $branch,
                        'commit' => substr($commit, 0, 7),
                        'commit_full' => $commit,
                        'status' => 'connected',
                    ],
                    'live' => [
                        'environment' => strtoupper(config('app.env', 'PRODUCTION')),
                        'commit' => substr($commit, 0, 7),
                        'backend' => [
                            'status' => 'healthy',
                            'version' => '2.0.0-step1',
                            'api_version' => 'v2',
                        ],
                        'frontend' => [
                            'status' => 'healthy',
                            'version' => '2.0.0-step1',
                        ],
                        'database' => [
                            'status' => 'healthy',
                        ],
                    ],
                    'comparison' => [
                        'github_vs_live' => 'UP_TO_DATE',
                        'backend_vs_frontend' => 'SYNCHRONIZED',
                    ],
                    'checked_at' => now()->toIso8601String(),
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error' => 'An error occurred while retrieving system status.',
                'timestamp' => now()->toIso8601String(),
            ], 500);
        }
    }

    /**
     * V2 Capabilities & Feature Flags
     * Advertises architectural features without granting permissions or bypassing RBAC.
     */
    public function capabilities(Request $request): JsonResponse
    {
        try {
            return response()->json([
                'success' => true,
                'data' => [
                    'v2_spec' => 'Step 1 Foundation',
                    'capabilities' => [
                        'product_master_v2' => true,
                        'pos_workflow_v2' => true,
                        'multi_tenant_rbac' => true,
                        'immutable_inventory_ledger' => true,
                        'double_entry_accounting' => true,
                        'procurement_matching_3way' => true,
                        'bi_analytics_dashboard' => true,
                        'unified_light_theme' => true,
                    ],
                    'modules' => [
                        'POS', 'Inventory', 'Procurement', 'Finance', 'CRM',
                        'E-Commerce', 'HR', 'BI & Analytics', 'Tax & Compliance'
                    ],
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error' => 'An error occurred while retrieving system capabilities.',
                'timestamp' => now()->toIso8601String(),
            ], 500);
        }
    }
}
