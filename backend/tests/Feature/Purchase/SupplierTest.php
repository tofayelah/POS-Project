<?php

namespace Tests\Feature\Purchase;

use App\Models\Company;
use App\Models\Purchase;
use App\Models\PurchaseOrder;
use App\Models\Role;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SupplierTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $company;
    protected $otherCompany;

    protected function setUp(): void
    {
        parent::setUp();
        $this->company = Company::factory()->create(['name' => 'Primary Test Company']);
        $this->otherCompany = Company::factory()->create(['name' => 'Secondary Company']);
        
        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);

        $role = Role::firstOrCreate(['name' => 'Super Admin']);
        $this->user->roles()->attach($role->id);
    }

    public function test_can_create_supplier_with_auto_generated_code_and_short_name()
    {
        $response = $this->actingAs($this->user)->postJson('/api/v1/suppliers', [
            'name' => 'TM International',
            'mobile' => '01711000000',
            'address' => 'Motijheel C/A, Dhaka',
            'contact_person' => 'Tariq Mahmood',
            'designation' => 'Sales Director',
            'contact_phone' => '01811000000',
        ], ['X-Company-ID' => $this->company->id]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.name', 'TM International')
                 ->assertJsonPath('data.short_name', 'TMI')
                 ->assertJsonPath('data.status', 'ACTIVE')
                 ->assertJsonPath('data.contact_person', 'Tariq Mahmood')
                 ->assertJsonPath('data.contact_designation', 'Sales Director');

        $this->assertMatchesRegularExpression('/^SUP-\d{4}$/', $response->json('data.supplier_code'));
    }

    public function test_single_word_name_generates_three_letter_short_name()
    {
        $response = $this->actingAs($this->user)->postJson('/api/v1/suppliers', [
            'name' => 'Square',
            'mobile' => '01712000000',
        ], ['X-Company-ID' => $this->company->id]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.short_name', 'SQU');
    }

    public function test_supplier_code_is_server_authoritative()
    {
        $response = $this->actingAs($this->user)->postJson('/api/v1/suppliers', [
            'name' => 'Apex Wholesale',
            'supplier_code' => 'FORCED-CODE-999',
        ], ['X-Company-ID' => $this->company->id]);

        $response->assertStatus(201);
        // Server generates authoritative SUP-xxxx code instead of forced code
        $this->assertNotEquals('FORCED-CODE-999', $response->json('data.supplier_code'));
        $this->assertMatchesRegularExpression('/^SUP-\d{4}$/', $response->json('data.supplier_code'));
    }

    public function test_cannot_create_duplicate_supplier_name_in_same_company()
    {
        Supplier::create([
            'company_id' => $this->company->id,
            'supplier_code' => 'SUP-0001',
            'name' => 'TM International',
            'short_name' => 'TMI',
        ]);

        $response = $this->actingAs($this->user)->postJson('/api/v1/suppliers', [
            'name' => 'TM International',
        ], ['X-Company-ID' => $this->company->id]);

        $response->assertStatus(422)
                 ->assertJsonPath('success', false);
    }

    public function test_tenant_isolation_allows_same_supplier_name_in_different_companies()
    {
        Supplier::create([
            'company_id' => $this->otherCompany->id,
            'supplier_code' => 'SUP-0001',
            'name' => 'TM International',
            'short_name' => 'TMI',
        ]);

        $response = $this->actingAs($this->user)->postJson('/api/v1/suppliers', [
            'name' => 'TM International',
        ], ['X-Company-ID' => $this->company->id]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.name', 'TM International');
    }

    public function test_supplier_id_and_company_are_immutable_on_update()
    {
        $supplier = Supplier::create([
            'company_id' => $this->company->id,
            'supplier_code' => 'SUP-0001',
            'name' => 'Original Supplier',
            'short_name' => 'OS',
            'status' => 'ACTIVE',
        ]);

        $response = $this->actingAs($this->user)->putJson('/api/v1/suppliers/' . $supplier->id, [
            'supplier_code' => 'SUP-CHANGED',
            'company_id' => $this->otherCompany->id,
            'contact_person' => 'New Contact',
        ], ['X-Company-ID' => $this->company->id]);

        $response->assertStatus(200);
        $fresh = $supplier->fresh();
        $this->assertEquals('SUP-0001', $fresh->supplier_code);
        $this->assertEquals($this->company->id, $fresh->company_id);
        $this->assertEquals('New Contact', $fresh->contact_person);
        $this->assertEquals('OS', $fresh->short_name);
    }

    public function test_can_update_status_to_inactive()
    {
        $supplier = Supplier::create([
            'company_id' => $this->company->id,
            'supplier_code' => 'SUP-0001',
            'name' => 'Acme Corp',
            'status' => 'ACTIVE',
        ]);

        $response = $this->actingAs($this->user)->putJson('/api/v1/suppliers/' . $supplier->id, [
            'status' => 'INACTIVE',
        ], ['X-Company-ID' => $this->company->id]);

        $response->assertStatus(200)
                 ->assertJsonPath('data.status', 'INACTIVE');
    }

    public function test_inactive_supplier_cannot_be_used_for_new_purchases()
    {
        $supplier = Supplier::create([
            'company_id' => $this->company->id,
            'supplier_code' => 'SUP-0001',
            'name' => 'Inactive Vendor',
            'status' => 'INACTIVE',
        ]);

        $warehouse = Warehouse::factory()->create(['company_id' => $this->company->id]);
        $product = Product::factory()->create(['company_id' => $this->company->id]);
        $variant = ProductVariant::factory()->create(['product_id' => $product->id]);

        $response = $this->actingAs($this->user)->postJson('/api/v1/purchases', [
            'supplier_id' => $supplier->id,
            'warehouse_id' => $warehouse->id,
            'purchase_date' => now()->toDateString(),
            'supplier_invoice_number' => 'INV-999',
            'items' => [
                [
                    'product_id' => $product->id,
                    'product_variant_id' => $variant->id,
                    'quantity' => 10,
                    'unit_cost' => 100,
                ],
            ],
        ], ['X-Company-ID' => $this->company->id]);

        $response->assertStatus(422)
                 ->assertJsonPath('success', false);
        $this->assertStringContainsString('inactive', strtolower($response->json('message')));
    }

    public function test_cannot_access_supplier_from_another_company()
    {
        $otherSupplier = Supplier::create([
            'company_id' => $this->otherCompany->id,
            'supplier_code' => 'SUP-0001',
            'name' => 'Secret Supplier',
        ]);

        $response = $this->actingAs($this->user)->getJson('/api/v1/suppliers/' . $otherSupplier->id, [
            'X-Company-ID' => $this->company->id,
        ]);

        $response->assertStatus(404);
    }

    public function test_current_balance_is_read_only_via_balance_endpoint()
    {
        $supplier = Supplier::create([
            'company_id' => $this->company->id,
            'supplier_code' => 'SUP-0001',
            'name' => 'Balance Test Supplier',
            'opening_balance' => 500,
        ]);

        $response = $this->actingAs($this->user)->getJson('/api/v1/suppliers/' . $supplier->id . '/balance', [
            'X-Company-ID' => $this->company->id,
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('data.balance', 500);

        // Attempting to send current_balance in update does not affect balance
        $updateRes = $this->actingAs($this->user)->putJson('/api/v1/suppliers/' . $supplier->id, [
            'current_balance' => 999999,
            'balance' => 999999,
        ], ['X-Company-ID' => $this->company->id]);

        $updateRes->assertStatus(200);

        $balanceRes = $this->actingAs($this->user)->getJson('/api/v1/suppliers/' . $supplier->id . '/balance', [
            'X-Company-ID' => $this->company->id,
        ]);
        $this->assertEquals(500, $balanceRes->json('data.balance'));
    }
}
