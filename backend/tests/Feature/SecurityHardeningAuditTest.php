<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Tests\TestCase;

class SecurityHardeningAuditTest extends TestCase
{
    use RefreshDatabase;

    protected Company $company;
    protected User $superAdmin;
    protected User $companyAdmin;
    protected Role $superAdminRole;
    protected Role $adminRole;
    protected Role $staffRole;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Hardening Test Company',
            'code' => 'HTC-01',
            'country' => 'Bangladesh',
        ]);

        $this->superAdminRole = Role::firstOrCreate([
            'name' => 'Super Admin',
            'description' => 'System Super Administrator',
        ]);

        $this->adminRole = Role::firstOrCreate([
            'name' => 'Admin',
            'description' => 'Company Administrator',
        ]);

        $this->staffRole = Role::firstOrCreate([
            'name' => 'Staff',
            'description' => 'Branch Staff',
        ]);

        // Create Permissions
        $userView = Permission::firstOrCreate(['name' => 'users.view'], ['group' => 'users']);
        $userCreate = Permission::firstOrCreate(['name' => 'users.create'], ['group' => 'users']);
        $userUpdate = Permission::firstOrCreate(['name' => 'users.update'], ['group' => 'users']);
        $userDelete = Permission::firstOrCreate(['name' => 'users.delete'], ['group' => 'users']);

        $this->adminRole->permissions()->sync([
            $userView->id,
            $userCreate->id,
            $userUpdate->id,
            $userDelete->id,
        ]);

        // Super Admin
        $this->superAdmin = User::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Root Super Admin',
            'email' => 'root@posproject.local',
            'password' => Hash::make('SuperPass123!'),
            'status' => 'active',
        ]);
        $this->superAdmin->roles()->attach($this->superAdminRole->id);
        $this->superAdmin->companies()->attach($this->company->id);

        // Company Admin (non-Super Admin)
        $this->companyAdmin = User::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Tenant Admin',
            'email' => 'admin@posproject.local',
            'password' => Hash::make('AdminPass123!'),
            'status' => 'active',
        ]);
        $this->companyAdmin->roles()->attach($this->adminRole->id);
        $this->companyAdmin->companies()->attach($this->company->id);
    }

    public function test_login_rate_limiter_throttles_after_excessive_attempts()
    {
        RateLimiter::clear(Str::transliterate(Str::lower('target@example.com')).'|127.0.0.1');

        // First 5 failed attempts
        for ($i = 0; $i < 5; $i++) {
            $response = $this->postJson('/api/v1/login', [
                'email' => 'target@example.com',
                'password' => 'wrongpassword',
            ], ['REMOTE_ADDR' => '127.0.0.1']);

            $response->assertStatus(401);
        }

        // 6th attempt must be throttled with HTTP 429
        $response = $this->postJson('/api/v1/login', [
            'email' => 'target@example.com',
            'password' => 'wrongpassword',
        ], ['REMOTE_ADDR' => '127.0.0.1']);

        $response->assertStatus(429);
        $this->assertFalse($response->json('success'));
        $this->assertStringContainsString('Too many login attempts', $response->json('message'));
    }

    public function test_non_super_admin_cannot_create_user_with_super_admin_role()
    {
        $response = $this->actingAs($this->companyAdmin, 'sanctum')
            ->withHeader('X-Company-ID', (string) $this->company->id)
            ->postJson('/api/v1/users', [
                'name' => 'Escalated User',
                'email' => 'escalate@posproject.local',
                'password' => 'Secret123!',
                'role' => 'Super Admin',
                'company_id' => $this->company->id,
            ]);

        $response->assertStatus(403);
        $this->assertFalse($response->json('success'));
        $this->assertStringContainsString('Only Super Admins can assign the Super Admin role', $response->json('message'));
    }

    public function test_non_super_admin_cannot_update_user_to_super_admin_role()
    {
        $targetUser = User::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Regular Staff',
            'email' => 'staff@posproject.local',
            'password' => Hash::make('Secret123!'),
            'status' => 'active',
        ]);
        $targetUser->roles()->attach($this->staffRole->id);
        $targetUser->companies()->attach($this->company->id);

        $response = $this->actingAs($this->companyAdmin, 'sanctum')
            ->withHeader('X-Company-ID', (string) $this->company->id)
            ->putJson("/api/v1/users/{$targetUser->id}", [
                'role' => 'Super Admin',
            ]);

        $response->assertStatus(403);
        $this->assertFalse($response->json('success'));
        $this->assertStringContainsString('Only Super Admins can assign the Super Admin role', $response->json('message'));
    }

    public function test_non_super_admin_cannot_modify_or_delete_super_admin_user()
    {
        // Attempt modification
        $modResponse = $this->actingAs($this->companyAdmin, 'sanctum')
            ->withHeader('X-Company-ID', (string) $this->company->id)
            ->putJson("/api/v1/users/{$this->superAdmin->id}", [
                'name' => 'Hacked Root',
            ]);

        $modResponse->assertStatus(403);
        $this->assertStringContainsString('Only Super Admins can modify a Super Admin user', $modResponse->json('message'));

        // Attempt deletion
        $delResponse = $this->actingAs($this->companyAdmin, 'sanctum')
            ->withHeader('X-Company-ID', (string) $this->company->id)
            ->deleteJson("/api/v1/users/{$this->superAdmin->id}");

        $delResponse->assertStatus(403);
        $this->assertStringContainsString('Only Super Admins can delete a Super Admin user', $delResponse->json('message'));
    }

    public function test_super_admin_can_manage_roles_normally()
    {
        $targetUser = User::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'New Super Admin Candidate',
            'email' => 'candidate@posproject.local',
            'password' => Hash::make('Secret123!'),
            'status' => 'active',
        ]);
        $targetUser->companies()->attach($this->company->id);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->withHeader('X-Company-ID', (string) $this->company->id)
            ->putJson("/api/v1/users/{$targetUser->id}", [
                'role' => 'Super Admin',
            ]);

        $response->assertStatus(200);
        $this->assertTrue($response->json('success'));
        $this->assertTrue($targetUser->fresh()->hasRole('Super Admin'));
    }
}
