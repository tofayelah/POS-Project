<?php

namespace Tests\Feature\System;

use Tests\TestCase;
use App\Models\User;
use App\Models\Company;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

class SystemV2Test extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Company $company;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::factory()->create(['name' => 'V2 Test Company']);
        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);

        $role = Role::firstOrCreate(['name' => 'Super Admin']);
        $this->user->roles()->attach($role->id);
    }

    /**
     * 1. Public health check returns HTTP 200 with sanitized contract when healthy.
     */
    public function test_health_returns_200_when_healthy(): void
    {
        $response = $this->getJson('/api/v2/health');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'system' => 'RetailCore POS_ERP',
                    'version' => '2.0.0-step1',
                    'api_version' => 'v2',
                    'status' => 'healthy',
                    'database' => 'connected',
                ],
            ])
            ->assertJsonStructure([
                'success',
                'data' => [
                    'system',
                    'version',
                    'api_version',
                    'status',
                    'database',
                    'architecture' => [
                        'framework',
                        'tenant_isolation',
                        'rbac_engine',
                        'accounting_engine',
                        'inventory_engine',
                    ],
                    'timestamp',
                ],
            ]);
    }

    /**
     * 2. Health check returns HTTP 503 degraded and safe schema when DB connection fails.
     */
    public function test_health_returns_503_when_database_fails(): void
    {
        DB::shouldReceive('connection')
            ->once()
            ->andThrow(new \PDOException('SQLSTATE[08006] [7] could not connect to server'));

        $response = $this->getJson('/api/v2/health');

        $response->assertStatus(503)
            ->assertJson([
                'success' => false,
                'data' => [
                    'status' => 'degraded',
                    'database' => 'disconnected',
                ],
            ]);

        // Verify zero internal database exception disclosure
        $content = $response->getContent();
        $this->assertStringNotContainsString('SQLSTATE', $content);
        $this->assertStringNotContainsString('could not connect', $content);
    }

    /**
     * 3. System status returns operational metadata without leaking secrets.
     */
    public function test_system_status_returns_operational_metadata(): void
    {
        $response = $this->getJson('/api/v2/system/status');

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure([
                'success',
                'data' => [
                    'environment',
                    'v2_foundation' => [
                        'step',
                        'name',
                        'status',
                        'installed_at',
                    ],
                    'github' => [
                        'repository',
                        'branch',
                        'commit',
                        'status',
                    ],
                    'live' => [
                        'environment',
                        'backend' => ['status', 'version', 'api_version'],
                        'frontend' => ['status', 'version'],
                        'database' => ['status'],
                    ],
                    'comparison' => [
                        'github_vs_live',
                        'backend_vs_frontend',
                    ],
                    'checked_at',
                ],
            ]);
    }

    /**
     * 4. Capabilities exposes approved architecture flags without granting RBAC bypass.
     */
    public function test_capabilities_returns_feature_matrix(): void
    {
        $response = $this->getJson('/api/v2/system/capabilities');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'v2_spec' => 'Step 1 Foundation',
                    'capabilities' => [
                        'product_master_v2' => true,
                        'pos_workflow_v2' => true,
                        'multi_tenant_rbac' => true,
                    ],
                ],
            ]);
    }

    /**
     * 5. Authenticated V2 status requires Sanctum authentication.
     */
    public function test_authenticated_v2_status_requires_sanctum(): void
    {
        $response = $this->getJson('/api/v2/status');
        $response->assertStatus(401);
    }

    /**
     * 6. Authenticated V2 capabilities requires Sanctum authentication.
     */
    public function test_authenticated_v2_capabilities_requires_sanctum(): void
    {
        $response = $this->getJson('/api/v2/capabilities');
        $response->assertStatus(401);
    }

    /**
     * 7. Authenticated V2 endpoints succeed for authenticated user.
     */
    public function test_authenticated_v2_endpoints_succeed_for_valid_user(): void
    {
        $statusResponse = $this->actingAs($this->user)
            ->getJson('/api/v2/status');

        $statusResponse->assertStatus(200)
            ->assertJson(['success' => true]);

        $capsResponse = $this->actingAs($this->user)
            ->getJson('/api/v2/capabilities');

        $capsResponse->assertStatus(200)
            ->assertJson(['success' => true]);
    }

    /**
     * 8. Public V2 endpoints never leak passwords, keys, or internal driver messages.
     */
    public function test_v2_endpoints_disclose_zero_secrets(): void
    {
        $endpoints = [
            '/api/v2/health',
            '/api/v2/system/status',
            '/api/v2/system/capabilities',
        ];

        foreach ($endpoints as $uri) {
            $response = $this->getJson($uri);
            $content = $response->getContent();

            $this->assertStringNotContainsString('password', strtolower($content));
            $this->assertStringNotContainsString('app_key', strtolower($content));
            $this->assertStringNotContainsString('secret', strtolower($content));
            $this->assertStringNotContainsString('pdo', strtolower($content));
            $this->assertStringNotContainsString('postgres', strtolower($content));
        }
    }
}
