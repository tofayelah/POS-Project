<?php

namespace Tests\Feature\System;

use Tests\TestCase;
use App\Models\User;
use App\Models\Company;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;

class SystemStatusTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Company $company;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::factory()->create(['name' => 'System Monitor Test Company']);
        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);

        $role = Role::firstOrCreate(['name' => 'Super Admin']);
        $this->user->roles()->attach($role->id);
    }

    /**
     * 1. Authenticated user can retrieve system status.
     */
    public function test_authenticated_status_request_succeeds(): void
    {
        $response = $this->actingAs($this->user)
            ->withHeaders(['X-Company-ID' => (string) $this->company->id])
            ->getJson('/api/v1/system/status');

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure([
                'success',
                'data' => [
                    'environment',
                    'github' => [
                        'repository',
                        'branch',
                        'commit',
                        'status',
                    ],
                    'ai_studio' => [
                        'commit',
                        'build_id',
                        'status',
                    ],
                    'live' => [
                        'environment',
                        'commit',
                        'commit_full',
                        'branch',
                        'deployed_at',
                        'backend' => ['status', 'version', 'api_version'],
                        'frontend' => ['status', 'version'],
                        'database' => ['status'],
                    ],
                    'comparison' => [
                        'github_vs_live',
                        'backend_vs_frontend',
                        'github_vs_ai_studio',
                    ],
                    'checked_at',
                ],
            ]);
    }

    /**
     * 2. Unauthenticated request is rejected with 401 Unauthorized.
     */
    public function test_unauthorized_request_is_rejected(): void
    {
        $response = $this->getJson('/api/v1/system/status');
        $response->assertStatus(401);
    }

    /**
     * 3. Environment reporting reflects configured environment.
     */
    public function test_environment_reporting_reflects_configuration(): void
    {
        Config::set('system.environment', 'staging');

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/system/status');

        $response->assertStatus(200)
            ->assertJsonPath('data.environment', 'staging')
            ->assertJsonPath('data.live.environment', 'STAGING');
    }

    /**
     * 4. Git commit reporting reflects configured commit.
     */
    public function test_commit_reporting_reflects_configured_commit(): void
    {
        Config::set('system.git_commit', '82b2d50917d50ce9e5de6b5f6c1ce8a32f1aac89');

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/system/status');

        $response->assertStatus(200)
            ->assertJsonPath('data.live.commit', '82b2d50')
            ->assertJsonPath('data.live.commit_full', '82b2d50917d50ce9e5de6b5f6c1ce8a32f1aac89')
            ->assertJsonPath('data.live.backend.version', '82b2d50');
    }

    /**
     * 5. Database health check reports healthy when connection is active.
     */
    public function test_database_health_check_reports_healthy(): void
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/system/status');

        $response->assertStatus(200)
            ->assertJsonPath('data.live.database.status', 'healthy');
    }

    /**
     * 6. Response contains only safe fields.
     */
    public function test_safe_response_fields_structure(): void
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/system/status');

        $data = $response->json('data');
        $this->assertArrayHasKey('environment', $data);
        $this->assertArrayHasKey('github', $data);
        $this->assertArrayHasKey('ai_studio', $data);
        $this->assertArrayHasKey('live', $data);
        $this->assertArrayHasKey('comparison', $data);
        $this->assertArrayHasKey('checked_at', $data);
    }

    /**
     * 7. No secret leakage: passwords, keys, tokens, DB host/credentials must not appear.
     */
    public function test_no_secret_leakage_in_response(): void
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/system/status');

        $content = $response->getContent();

        $this->assertStringNotContainsString('password', strtolower($content));
        $this->assertStringNotContainsString('app_key', strtolower($content));
        $this->assertStringNotContainsString('db_password', strtolower($content));
        $this->assertStringNotContainsString('secret', strtolower($content));
        $this->assertStringNotContainsString('/var/www/html', $content);
        $this->assertStringNotContainsString('5432', $content);
        $this->assertStringNotContainsString('retailcore_db', $content);
    }

    /**
     * 8. GitHub unavailable handling reports status unavailable and comparison unknown.
     */
    public function test_github_unavailable_handling(): void
    {
        Config::set('system.github_repository', null);
        Config::set('system.github_commit_override', null);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/system/status');

        $response->assertStatus(200)
            ->assertJsonPath('data.github.status', 'unavailable')
            ->assertJsonPath('data.github.commit', null)
            ->assertJsonPath('data.comparison.github_vs_live', 'UNKNOWN');
    }

    /**
     * 9. AI Studio unavailable/unconfigured handling reports not_reported.
     */
    public function test_ai_studio_unavailable_reports_not_reported(): void
    {
        Config::set('system.ai_studio_commit', null);
        Config::set('system.ai_studio_build_id', null);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/system/status');

        $response->assertStatus(200)
            ->assertJsonPath('data.ai_studio.status', 'not_reported')
            ->assertJsonPath('data.ai_studio.commit', null)
            ->assertJsonPath('data.comparison.github_vs_ai_studio', 'NOT_REPORTED');
    }

    /**
     * 10. Version comparison: GitHub vs Live synchronized when commits match.
     */
    public function test_version_comparison_synchronized_when_commits_match(): void
    {
        Config::set('system.git_commit', '82b2d50917d50ce9e5de6b5f6c1ce8a32f1aac89');
        Config::set('system.github_commit_override', '82b2d50917d50ce9e5de6b5f6c1ce8a32f1aac89');

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/system/status');

        $response->assertStatus(200)
            ->assertJsonPath('data.github.commit', '82b2d50')
            ->assertJsonPath('data.live.commit', '82b2d50')
            ->assertJsonPath('data.comparison.github_vs_live', 'UP_TO_DATE');
    }

    /**
     * 11. Backend vs Frontend mismatch detected when versions differ.
     */
    public function test_backend_vs_frontend_mismatch_detected(): void
    {
        Config::set('system.git_commit', '82b2d50917d50ce9e5de6b5f6c1ce8a32f1aac89');

        $response = $this->actingAs($this->user)
            ->withHeaders(['X-Frontend-Version' => '6d9a52f'])
            ->getJson('/api/v1/system/status');

        $response->assertStatus(200)
            ->assertJsonPath('data.live.backend.version', '82b2d50')
            ->assertJsonPath('data.live.frontend.version', '6d9a52f')
            ->assertJsonPath('data.comparison.backend_vs_frontend', 'VERSION_MISMATCH');
    }

    /**
     * 12. GitHub vs Live mismatch detected when Live server is outdated.
     */
    public function test_github_vs_live_outdated_detected(): void
    {
        Config::set('system.git_commit', '6d9a52fcfb008dc7f9f3d22fa22645c7651a8acf');
        Config::set('system.github_commit_override', '82b2d50917d50ce9e5de6b5f6c1ce8a32f1aac89');

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/system/status');

        $response->assertStatus(200)
            ->assertJsonPath('data.github.commit', '82b2d50')
            ->assertJsonPath('data.live.commit', '6d9a52f')
            ->assertJsonPath('data.comparison.github_vs_live', 'OUTDATED');
    }
}
