<?php

namespace Tests\Feature\ProductMaster;

use App\Models\Category;
use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MasterDataTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Company $company;

    protected function setUp(): void
    {
        parent::setUp();
        $this->company = Company::create(['name' => 'Test Company']);
        $this->user = User::create([
            'name' => 'Admin',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'company_id' => $this->company->id,
        ]);
    }

    public function test_can_create_category_hierarchy()
    {
        $parent = Category::create([
            'company_id' => $this->company->id,
            'name' => 'Parent',
            'slug' => 'parent'
        ]);

        $payload = [
            'company_id' => $this->company->id,
            'name' => 'Child',
            'parent_id' => $parent->id
        ];

        $response = $this->actingAs($this->user)->postJson('/api/v1/categories', $payload);
        $response->assertStatus(201);
        $this->assertDatabaseHas('categories', ['name' => 'Child', 'parent_id' => $parent->id]);
    }

    public function test_can_create_brand()
    {
        $payload = [
            'company_id' => $this->company->id,
            'name' => 'Samsung',
        ];

        $response = $this->actingAs($this->user)->postJson('/api/v1/brands', $payload);
        $response->assertStatus(201);
        $this->assertDatabaseHas('brands', ['name' => 'Samsung']);
    }

    public function test_can_create_unit()
    {
        $payload = [
            'company_id' => $this->company->id,
            'name' => 'Kilogram',
            'short_code' => 'kg',
            'decimal_allowed' => true
        ];

        $response = $this->actingAs($this->user)->postJson('/api/v1/units', $payload);
        $response->assertStatus(201);
        $this->assertDatabaseHas('units', ['short_code' => 'kg', 'decimal_allowed' => true]);
    }
}
