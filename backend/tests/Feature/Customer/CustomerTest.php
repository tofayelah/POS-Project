<?php

namespace Tests\Feature\Customer;

use App\Models\Company;
use App\Models\Customer;
use App\Models\CustomerGroup;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $company;

    protected function setUp(): void
    {
        parent::setUp();
        $this->company = Company::factory()->create();
        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);
    }

    public function test_can_create_customer_with_opening_balance()
    {
        $response = $this->actingAs($this->user)->postJson('/api/v1/customers', [
            'customer_code' => 'CUS-001',
            'name' => 'John Doe',
            'mobile' => '01711000000',
            'opening_balance_amount' => 500,
            'opening_balance_direction' => 'DEBIT',
            'opening_balance_date' => now()->toDateString(),
            'status' => 'ACTIVE'
        ], ['X-Company-ID' => $this->company->id]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.customer_code', 'CUS-001');

        $this->assertDatabaseHas('customers', [
            'customer_code' => 'CUS-001',
            'opening_balance' => 500
        ]);

        $this->assertDatabaseHas('customer_ledgers', [
            'transaction_type' => 'OPENING_BALANCE',
            'debit' => 500,
            'credit' => 0
        ]);
    }
    
    public function test_cannot_create_duplicate_customer_code()
    {
        Customer::create([
            'company_id' => $this->company->id,
            'customer_code' => 'CUS-001',
            'name' => 'Existing Customer'
        ]);
        
        $response = $this->actingAs($this->user)->postJson('/api/v1/customers', [
            'customer_code' => 'CUS-001',
            'name' => 'John Doe',
            'status' => 'ACTIVE'
        ], ['X-Company-ID' => $this->company->id]);
        
        $response->assertStatus(422);
    }

    public function test_can_search_customers()
    {
        Customer::create([
            'company_id' => $this->company->id,
            'customer_code' => 'CUS-001',
            'name' => 'John Doe',
            'mobile' => '01711123456'
        ]);

        $response = $this->actingAs($this->user)->getJson('/api/v1/customers/search?q=01711', ['X-Company-ID' => $this->company->id]);
        
        $response->assertStatus(200)
                 ->assertJsonCount(1, 'data')
                 ->assertJsonPath('data.0.name', 'John Doe');
    }
}
