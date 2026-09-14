<?php

namespace Tests\Feature\ProductMaster;

use App\Models\Category;
use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RbacScopeTest extends TestCase
{
    use RefreshDatabase;

    protected User $userA;
    protected User $userB;
    protected Company $companyA;
    protected Company $companyB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->companyA = Company::create(['name' => 'Company A']);
        $this->companyB = Company::create(['name' => 'Company B']);
        
        $this->userA = User::create([
            'name' => 'Admin A',
            'email' => 'admin_a@test.com',
            'password' => bcrypt('password'),
            'company_id' => $this->companyA->id,
        ]);
        
        $this->userB = User::create([
            'name' => 'Admin B',
            'email' => 'admin_b@test.com',
            'password' => bcrypt('password'),
            'company_id' => $this->companyB->id,
        ]);
    }

    public function test_unauthenticated_request_rejected()
    {
        $response = $this->getJson('/api/v1/products');
        $response->assertStatus(401);
    }

    public function test_company_isolation_prevents_accessing_other_company_data()
    {
        $categoryA = Category::create([
            'company_id' => $this->companyA->id,
            'name' => 'Category A',
            'slug' => 'cat-a'
        ]);

        $payload = [
            'name' => 'Attempt Update',
        ];

        // User B attempts to update User A's category
        // The scope middleware should reject this
        $response = $this->actingAs($this->userB)->putJson('/api/v1/categories/' . $categoryA->id, $payload);
        
        $response->assertStatus(403);
    }
}
