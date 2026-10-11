<?php

namespace Tests\Feature\Company;

use Tests\TestCase;
use App\Models\User;
use App\Models\Company;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CompanyLogoUploadBackendTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $userA;
    protected User $userB;
    protected Company $companyA;
    protected Company $companyB;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin']);
        $adminRole = Role::firstOrCreate(['name' => 'Admin']);

        $updatePerm = Permission::firstOrCreate(['name' => 'companies.update'], ['group' => 'organization']);
        $createPerm = Permission::firstOrCreate(['name' => 'companies.create'], ['group' => 'organization']);
        
        $superAdminRole->permissions()->syncWithoutDetaching([$updatePerm->id, $createPerm->id]);
        $adminRole->permissions()->syncWithoutDetaching([$updatePerm->id]);

        $this->superAdmin = User::factory()->create([
            'email' => 'superadmin@retailcore.test',
        ]);
        $this->superAdmin->roles()->attach($superAdminRole->id);

        $this->userA = User::factory()->create([
            'email' => 'adminA@alpha.test',
        ]);
        $this->userA->roles()->attach($adminRole->id);

        $this->userB = User::factory()->create([
            'email' => 'adminB@beta.test',
        ]);
        $this->userB->roles()->attach($adminRole->id);

        $this->companyA = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Alpha Superstore',
            'code' => 'ALPHA-01',
            'country' => 'Bangladesh',
            'currency_code' => 'BDT',
            'status' => 'active',
        ]);

        $this->companyB = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Beta Electronics',
            'code' => 'BETA-02',
            'country' => 'Bangladesh',
            'currency_code' => 'BDT',
            'status' => 'active',
        ]);

        $this->companyA->users()->attach($this->userA->id);
        $this->companyB->users()->attach($this->userB->id);
    }

    public function test_super_admin_can_upload_valid_company_logo_file()
    {
        $file = UploadedFile::fake()->image('logo.png', 300, 300);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson("/api/v1/companies/{$this->companyA->id}/logo", [
                'logo' => $file,
            ]);

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $logoPath = $response->json('data.logo_path');
        $this->assertNotNull($logoPath);
        $this->assertStringStartsWith('/storage/logos/company_' . $this->companyA->id, $logoPath);

        $relativeDiskPath = str_replace('/storage/', '', $logoPath);
        Storage::disk('public')->assertExists($relativeDiskPath);
    }

    public function test_store_company_with_base64_logo_converts_to_stored_disk_file()
    {
        $base64Logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/companies', [
                'name' => 'Gamma Retail',
                'code' => 'GAMMA-03',
                'logo_path' => $base64Logo,
            ]);

        $response->assertStatus(201)
            ->assertJson(['success' => true]);

        $savedCompanyId = $response->json('data.id');
        $savedLogoPath = $response->json('data.logo_path');

        $this->assertNotNull($savedLogoPath);
        $this->assertStringStartsWith('/storage/logos/company_', $savedLogoPath);

        $relativeDiskPath = str_replace('/storage/', '', $savedLogoPath);
        Storage::disk('public')->assertExists($relativeDiskPath);
    }

    public function test_rejects_oversized_logo_upload()
    {
        // 3 MB file exceeds 2 MB limit
        $file = UploadedFile::fake()->create('huge_logo.png', 3100, 'image/png');

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson("/api/v1/companies/{$this->companyA->id}/logo", [
                'logo' => $file,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['logo']);
    }

    public function test_rejects_invalid_file_type()
    {
        $file = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson("/api/v1/companies/{$this->companyA->id}/logo", [
                'logo' => $file,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['logo']);
    }

    public function test_prevents_unauthorized_cross_company_logo_upload()
    {
        $file = UploadedFile::fake()->image('unauthorized_logo.png', 200, 200);

        // User A tries to upload logo for Company B (where User A has no access)
        $response = $this->actingAs($this->userA, 'sanctum')
            ->postJson("/api/v1/companies/{$this->companyB->id}/logo", [
                'logo' => $file,
            ]);

        $response->assertStatus(403);
    }

    public function test_can_delete_company_logo()
    {
        $file = UploadedFile::fake()->image('temp_logo.png', 200, 200);

        $uploadRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson("/api/v1/companies/{$this->companyA->id}/logo", [
                'logo' => $file,
            ]);

        $logoPath = $uploadRes->json('data.logo_path');
        $relativeDiskPath = str_replace('/storage/', '', $logoPath);
        Storage::disk('public')->assertExists($relativeDiskPath);

        // Now delete logo
        $deleteRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->deleteJson("/api/v1/companies/{$this->companyA->id}/logo");

        $deleteRes->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertNull($deleteRes->json('data.logo_path'));
        Storage::disk('public')->assertMissing($relativeDiskPath);
    }
}
