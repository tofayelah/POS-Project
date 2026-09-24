<?php

namespace Tests\Feature\Reports;

use Tests\TestCase;
use App\Models\User;
use App\Models\Company;
use App\Models\Supplier;
use App\Models\Purchase;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

class SupplierPayablesReportTest extends TestCase
{
    use RefreshDatabase;

    protected User $userA;
    protected Company $companyA;
    protected User $userB;
    protected Company $companyB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->companyA = Company::factory()->create(['name' => 'Company A']);
        $this->userA = User::factory()->create();
        $this->userA->companies()->attach($this->companyA->id);
        $role = \App\Models\Role::firstOrCreate(['name' => 'Super Admin']);
        $this->userA->roles()->attach($role->id);

        $this->companyB = Company::factory()->create(['name' => 'Company B']);
        $this->userB = User::factory()->create();
        $this->userB->companies()->attach($this->companyB->id);
        $this->userB->roles()->attach($role->id);
    }

    /**
     * T01 - Supplier payables returns 200, correct fields, and exact financial figures:
     * Invoice = 7,500 BDT, Paid = 3,000 BDT, Due = 4,500 BDT.
     */
    public function test_supplier_payables_returns_correct_aggregates_for_e2e_scenario(): void
    {
        $supplier = Supplier::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->companyA->id,
            'supplier_code' => 'SUP-001',
            'name' => 'Apex Innerwear Fabrics Ltd',
            'opening_balance' => 0,
            'status' => 'ACTIVE',
        ]);

        $purchase = Purchase::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->companyA->id,
            'supplier_id' => $supplier->id,
            'supplier_invoice_number' => 'INV-SUP-001',
            'invoice_date' => now()->toDateString(),
            'grand_total' => 7500.0,
            'status' => 'POSTED',
        ]);

        $payment = Payment::create([
            'company_id' => $this->companyA->id,
            'payment_number' => 'PAY-2026-000001',
            'amount' => 3000.0,
            'payment_method' => 'BANK',
            'payment_type' => 'SUPPLIER',
            'status' => 'COMPLETED',
        ]);

        PaymentAllocation::create([
            'payment_id' => $payment->id,
            'allocatable_type' => Purchase::class,
            'allocatable_id' => $purchase->id,
            'amount' => 3000.0,
        ]);

        $response = $this->actingAs($this->userA)
            ->withHeader('X-Company-ID', (string) $this->companyA->id)
            ->getJson('/api/v1/reports/supplier-payables');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'data' => [
                '*' => [
                    'id',
                    'supplier_code',
                    'name',
                    'total_purchases',
                    'total_paid',
                    'balance',
                    'status',
                ]
            ],
            'meta',
            'summary' => [
                'total_payables',
            ]
        ]);

        $data = $response->json('data');
        $this->assertCount(1, $data);
        $row = $data[0];

        $this->assertEquals($supplier->id, $row['id']);
        $this->assertEquals('SUP-001', $row['supplier_code']);
        $this->assertEquals('Apex Innerwear Fabrics Ltd', $row['name']);
        $this->assertEquals(7500.0, (float) $row['total_purchases']);
        $this->assertEquals(3000.0, (float) $row['total_paid']);
        $this->assertEquals(4500.0, (float) $row['balance']);

        $summary = $response->json('summary');
        $this->assertEquals(4500.0, (float) $summary['total_payables']);
    }

    /**
     * T02 - Opening balance is correctly factored into live payable balance:
     * Opening = 1,000, Invoice = 2,000, Paid = 500 => Balance = 2,500.
     */
    public function test_supplier_payables_includes_opening_balance(): void
    {
        $supplier = Supplier::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->companyA->id,
            'supplier_code' => 'SUP-OPEN-01',
            'name' => 'Supplier With Opening',
            'opening_balance' => 1000.0,
            'status' => 'ACTIVE',
        ]);

        $purchase = Purchase::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->companyA->id,
            'supplier_id' => $supplier->id,
            'supplier_invoice_number' => 'INV-OPEN-001',
            'invoice_date' => now()->toDateString(),
            'grand_total' => 2000.0,
            'status' => 'POSTED',
        ]);

        $payment = Payment::create([
            'company_id' => $this->companyA->id,
            'payment_number' => 'PAY-2026-000002',
            'amount' => 500.0,
            'payment_method' => 'CASH',
            'payment_type' => 'SUPPLIER',
            'status' => 'COMPLETED',
        ]);

        PaymentAllocation::create([
            'payment_id' => $payment->id,
            'allocatable_type' => Purchase::class,
            'allocatable_id' => $purchase->id,
            'amount' => 500.0,
        ]);

        $response = $this->actingAs($this->userA)
            ->withHeader('X-Company-ID', (string) $this->companyA->id)
            ->getJson('/api/v1/reports/supplier-payables');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);

        $row = $data[0];
        $this->assertEquals(2000.0, (float) $row['total_purchases']);
        $this->assertEquals(500.0, (float) $row['total_paid']);
        $this->assertEquals(2500.0, (float) $row['balance']);
        $this->assertEquals(2500.0, (float) $response->json('summary.total_payables'));
    }

    /**
     * T03 - Strict multi-tenant company isolation:
     * Company B cannot see Company A's suppliers or payables.
     */
    public function test_supplier_payables_enforces_company_isolation(): void
    {
        Supplier::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->companyA->id,
            'supplier_code' => 'SUP-COMP-A',
            'name' => 'Supplier Company A',
            'opening_balance' => 5000.0,
            'status' => 'ACTIVE',
        ]);

        $responseB = $this->actingAs($this->userB)
            ->withHeader('X-Company-ID', (string) $this->companyB->id)
            ->getJson('/api/v1/reports/supplier-payables');

        $responseB->assertStatus(200);
        $this->assertCount(0, $responseB->json('data'));
        $this->assertEquals(0, (float) $responseB->json('summary.total_payables'));
    }

    /**
     * T04 - Sorting and searching work deterministically without column errors.
     */
    public function test_supplier_payables_sorting_and_filtering(): void
    {
        Supplier::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->companyA->id,
            'supplier_code' => 'SUP-Z',
            'name' => 'Alpha Supplier',
            'opening_balance' => 100.0,
            'status' => 'ACTIVE',
        ]);

        Supplier::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->companyA->id,
            'supplier_code' => 'SUP-A',
            'name' => 'Beta Supplier',
            'opening_balance' => 500.0,
            'status' => 'ACTIVE',
        ]);

        // Sort by balance desc
        $resSort = $this->actingAs($this->userA)
            ->withHeader('X-Company-ID', (string) $this->companyA->id)
            ->getJson('/api/v1/reports/supplier-payables?sort_by=balance&sort_direction=desc');

        $resSort->assertStatus(200);
        $data = $resSort->json('data');
        $this->assertCount(2, $data);
        $this->assertEquals('Beta Supplier', $data[0]['name']);
        $this->assertEquals('Alpha Supplier', $data[1]['name']);

        // Search by code
        $resSearch = $this->actingAs($this->userA)
            ->withHeader('X-Company-ID', (string) $this->companyA->id)
            ->getJson('/api/v1/reports/supplier-payables?search=SUP-Z');

        $resSearch->assertStatus(200);
        $this->assertCount(1, $resSearch->json('data'));
        $this->assertEquals('Alpha Supplier', $resSearch->json('data.0.name'));
    }
}
