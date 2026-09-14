<?php

namespace Tests\Feature\Purchase;

use App\Models\Company;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SupplierTest extends TestCase
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

    public function test_can_create_supplier()
    {
        $response = $this->actingAs($this->user)->postJson('/api/v1/suppliers', [
            'supplier_code' => 'SUP-001',
            'name' => 'Acme Corp',
            'email' => 'contact@acme.com',
            'opening_balance' => 1000
        ], ['X-Company-ID' => $this->company->id]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.supplier_code', 'SUP-001')
                 ->assertJsonPath('data.opening_balance', '1000.0000');
                 
        $this->assertDatabaseHas('supplier_ledgers', [
            'transaction_type' => 'OPENING_BALANCE',
            'credit' => 1000
        ]);
    }

    public function test_cannot_create_duplicate_supplier_code_in_same_company()
    {
        Supplier::create([
            'company_id' => $this->company->id,
            'supplier_code' => 'SUP-001',
            'name' => 'Acme Corp 1'
        ]);

        $response = $this->actingAs($this->user)->postJson('/api/v1/suppliers', [
            'supplier_code' => 'SUP-001',
            'name' => 'Acme Corp 2'
        ], ['X-Company-ID' => $this->company->id]);

        $response->assertStatus(422);
    }

    public function test_can_update_supplier_status()
    {
        $supplier = Supplier::create([
            'company_id' => $this->company->id,
            'supplier_code' => 'SUP-001',
            'name' => 'Acme Corp 1'
        ]);

        $response = $this->actingAs($this->user)->putJson('/api/v1/suppliers/' . $supplier->id, [
            'status' => 'INACTIVE'
        ], ['X-Company-ID' => $this->company->id]);

        $response->assertStatus(200)
                 ->assertJsonPath('data.status', 'INACTIVE');
    }
}
