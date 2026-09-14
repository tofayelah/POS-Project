<?php

namespace Tests\Feature\Customer;

use App\Models\Company;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerLedgerTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $company;
    protected $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->company = Company::factory()->create();
        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);
        
        $this->customer = Customer::create([
            'company_id' => $this->company->id,
            'customer_code' => 'CUS-001',
            'name' => 'Test Customer'
        ]);
    }

    public function test_can_add_opening_balance()
    {
        $response = $this->actingAs($this->user)->postJson("/api/v1/customers/{$this->customer->id}/opening-balance", [
            'amount' => 1000,
            'direction' => 'DEBIT',
            'date' => now()->toDateString(),
            'notes' => 'Initial balance'
        ], ['X-Company-ID' => $this->company->id]);

        $response->assertStatus(201);
        
        $this->assertDatabaseHas('customer_ledgers', [
            'customer_id' => $this->customer->id,
            'transaction_type' => 'OPENING_BALANCE',
            'debit' => 1000,
            'credit' => 0,
            'balance_after' => 1000
        ]);
    }

    public function test_cannot_add_duplicate_opening_balance()
    {
        $this->actingAs($this->user)->postJson("/api/v1/customers/{$this->customer->id}/opening-balance", [
            'amount' => 1000,
            'direction' => 'DEBIT',
            'date' => now()->toDateString()
        ], ['X-Company-ID' => $this->company->id]);

        $response = $this->actingAs($this->user)->postJson("/api/v1/customers/{$this->customer->id}/opening-balance", [
            'amount' => 500,
            'direction' => 'CREDIT',
            'date' => now()->toDateString()
        ], ['X-Company-ID' => $this->company->id]);

        $response->assertStatus(422);
    }
    
    public function test_can_add_adjustment()
    {
        $this->actingAs($this->user)->postJson("/api/v1/customers/{$this->customer->id}/opening-balance", [
            'amount' => 1000,
            'direction' => 'DEBIT',
            'date' => now()->toDateString()
        ], ['X-Company-ID' => $this->company->id]);

        $response = $this->actingAs($this->user)->postJson("/api/v1/customers/{$this->customer->id}/ledger/adjustment", [
            'amount' => 500,
            'direction' => 'CREDIT',
            'date' => now()->toDateString(),
            'notes' => 'Correction'
        ], ['X-Company-ID' => $this->company->id]);

        $response->assertStatus(201);
        
        $this->assertDatabaseHas('customer_ledgers', [
            'customer_id' => $this->customer->id,
            'transaction_type' => 'ADJUSTMENT',
            'debit' => 0,
            'credit' => 500,
            'balance_before' => 1000,
            'balance_after' => 500
        ]);
    }
}
