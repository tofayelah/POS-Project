<?php

namespace Tests\Feature\Reports;

use Tests\TestCase;
use App\Models\User;
use App\Models\Company;
use App\Models\Supplier;
use App\Models\Purchase;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\Role;
use App\Models\BusinessUnit;
use App\Models\Branch;
use App\Models\Warehouse;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

class DashboardSummaryReportTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Company $company;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::factory()->create(['name' => 'Test Retail Company']);
        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);

        $role = Role::firstOrCreate(['name' => 'Super Admin']);
        $this->user->roles()->attach($role->id);
    }

    /**
     * T01 - Dashboard summary returns HTTP 200 and all 25 required keys for the frontend
     */
    public function test_dashboard_summary_returns_all_25_expected_keys(): void
    {
        $response = $this->actingAs($this->user)
            ->withHeaders(['X-Company-ID' => (string) $this->company->id])
            ->getJson('/api/v1/dashboard/summary?date_from=' . now()->subDays(7)->toDateString() . '&date_to=' . now()->toDateString());

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure([
                'success',
                'data' => [
                    'gross_sales',
                    'sales_returns',
                    'net_sales',
                    'purchases',
                    'expenses',
                    'gross_profit',
                    'gross_margin',
                    'cash_sales',
                    'credit_sales',
                    'receivables',
                    'payables',
                    'inventory_value',
                    'sales_trend',
                    'top_products',
                    'top_customers',
                    'total_products',
                    'low_stock',
                    'low_stock_details',
                    'accounting_health' => [
                        'posted_journals',
                        'unbalanced_journals',
                        'status',
                    ],
                    'net_profit',
                    'cash_balance',
                    'bank_balance',
                    'payment_methods',
                    'recent_sales',
                    'recent_purchases',
                ]
            ]);
    }

    /**
     * T02 - PRIMARY FIX 1: Unbalanced journals query grouping does not trigger SQLSTATE 42803 in PostgreSQL
     */
    public function test_dashboard_summary_unbalanced_journals_grouping_query_executes_in_postgres(): void
    {
        $account = Account::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'account_code' => 'ACC-101',
            'account_name' => 'Cash in Hand',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'status' => 'ACTIVE',
        ]);

        $journal = JournalEntry::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'journal_number' => 'JE-001',
            'journal_date' => now()->toDateString(),
            'description' => 'Test Journal Entry',
            'status' => 'POSTED',
            'created_by' => $this->user->id,
        ]);

        JournalEntryLine::create([
            'journal_entry_id' => $journal->id,
            'account_id' => $account->id,
            'debit' => 100.00,
            'credit' => 0.00,
        ]);

        JournalEntryLine::create([
            'journal_entry_id' => $journal->id,
            'account_id' => $account->id,
            'debit' => 0.00,
            'credit' => 100.00,
        ]);

        $response = $this->actingAs($this->user)
            ->withHeaders(['X-Company-ID' => (string) $this->company->id])
            ->getJson('/api/v1/dashboard/summary');

        $response->assertStatus(200);
        $data = $response->json('data.accounting_health');

        $this->assertNotNull($data);
        $this->assertEquals(1, $data['posted_journals']);
        $this->assertEquals(0, $data['unbalanced_journals']);
        $this->assertEquals('Healthy', $data['status']);
    }

    /**
     * T03 - PRIMARY FIX 2: Recent purchases query projects valid purchases table columns without SQLSTATE 42703
     */
    public function test_dashboard_summary_recent_purchases_query_executes_with_correct_schema(): void
    {
        $supplier = Supplier::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'supplier_code' => 'SUP-TEST-001',
            'name' => 'Apex Fabrics Ltd',
            'opening_balance' => 0,
            'status' => 'ACTIVE',
        ]);

        Purchase::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'supplier_id' => $supplier->id,
            'supplier_invoice_number' => 'INV-SUP-999',
            'invoice_date' => now()->toDateString(),
            'status' => 'POSTED',
            'subtotal' => 5000,
            'discount_total' => 0,
            'tax_total' => 0,
            'shipping_cost' => 0,
            'other_cost' => 0,
            'grand_total' => 5000,
        ]);

        $response = $this->actingAs($this->user)
            ->withHeaders(['X-Company-ID' => (string) $this->company->id])
            ->getJson('/api/v1/dashboard/summary');

        $response->assertStatus(200);
        $recentPurchases = $response->json('data.recent_purchases');

        $this->assertIsArray($recentPurchases);
        $this->assertCount(1, $recentPurchases);
        $this->assertEquals('INV-SUP-999', $recentPurchases[0]['invoice']);
        $this->assertEquals('Apex Fabrics Ltd', $recentPurchases[0]['supplier']);
        $this->assertEquals(5000, (float) $recentPurchases[0]['amount']);
        $this->assertEquals(0, (float) $recentPurchases[0]['paid']);
        $this->assertEquals(5000, (float) $recentPurchases[0]['due']);
        $this->assertEquals('DUE', $recentPurchases[0]['status']);
    }

    /**
     * T04 - Authoritative Payment Statuses: DUE, PARTIAL, PAID and allocation cross-purchase isolation
     */
    public function test_dashboard_summary_recent_purchases_authoritative_payment_statuses(): void
    {
        $supplier = Supplier::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'supplier_code' => 'SUP-TEST-002',
            'name' => 'Dhaka Textile Mills',
            'opening_balance' => 0,
            'status' => 'ACTIVE',
        ]);

        // Purchase 1: Unpaid (grand_total = 1000) -> paid: 0, due: 1000, status: DUE
        $p1 = Purchase::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'supplier_id' => $supplier->id,
            'supplier_invoice_number' => 'PO-UNPAID',
            'invoice_date' => now()->subDays(3)->toDateString(),
            'status' => 'POSTED',
            'subtotal' => 1000,
            'discount_total' => 0,
            'tax_total' => 0,
            'shipping_cost' => 0,
            'other_cost' => 0,
            'grand_total' => 1000,
        ]);

        // Purchase 2: Partially Paid (grand_total = 2500, paid = 1000) -> paid: 1000, due: 1500, status: PARTIAL
        $p2 = Purchase::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'supplier_id' => $supplier->id,
            'supplier_invoice_number' => 'PO-PARTIAL',
            'invoice_date' => now()->subDays(2)->toDateString(),
            'status' => 'POSTED',
            'subtotal' => 2500,
            'discount_total' => 0,
            'tax_total' => 0,
            'shipping_cost' => 0,
            'other_cost' => 0,
            'grand_total' => 2500,
        ]);

        $payment1 = Payment::create([
            'company_id' => $this->company->id,
            'payment_number' => 'PAY-P2-001',
            'amount' => 1000.0,
            'payment_method' => 'BANK',
            'payment_type' => 'SUPPLIER',
            'status' => 'COMPLETED',
        ]);

        PaymentAllocation::create([
            'payment_id' => $payment1->id,
            'allocatable_type' => Purchase::class,
            'allocatable_id' => $p2->id,
            'amount' => 1000.0,
        ]);

        // Purchase 3: Fully Paid (grand_total = 3000, paid = 3000) -> paid: 3000, due: 0, status: PAID
        $p3 = Purchase::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'supplier_id' => $supplier->id,
            'supplier_invoice_number' => 'PO-PAID',
            'invoice_date' => now()->subDays(1)->toDateString(),
            'status' => 'POSTED',
            'subtotal' => 3000,
            'discount_total' => 0,
            'tax_total' => 0,
            'shipping_cost' => 0,
            'other_cost' => 0,
            'grand_total' => 3000,
        ]);

        $payment2 = Payment::create([
            'company_id' => $this->company->id,
            'payment_number' => 'PAY-P3-001',
            'amount' => 3000.0,
            'payment_method' => 'CASH',
            'payment_type' => 'SUPPLIER',
            'status' => 'COMPLETED',
        ]);

        // Test polymorphic string type 'Purchase'
        PaymentAllocation::create([
            'payment_id' => $payment2->id,
            'allocatable_type' => 'Purchase',
            'allocatable_id' => $p3->id,
            'amount' => 3000.0,
        ]);

        $response = $this->actingAs($this->user)
            ->withHeaders(['X-Company-ID' => (string) $this->company->id])
            ->getJson('/api/v1/dashboard/summary');

        $response->assertStatus(200);
        $recent = collect($response->json('data.recent_purchases'));

        $itemP1 = $recent->firstWhere('invoice', 'PO-UNPAID');
        $this->assertNotNull($itemP1);
        $this->assertEquals(1000, (float) $itemP1['amount']);
        $this->assertEquals(0, (float) $itemP1['paid']);
        $this->assertEquals(1000, (float) $itemP1['due']);
        $this->assertEquals('DUE', $itemP1['status']);

        $itemP2 = $recent->firstWhere('invoice', 'PO-PARTIAL');
        $this->assertNotNull($itemP2);
        $this->assertEquals(2500, (float) $itemP2['amount']);
        $this->assertEquals(1000, (float) $itemP2['paid']);
        $this->assertEquals(1500, (float) $itemP2['due']);
        $this->assertEquals('PARTIAL', $itemP2['status']);

        $itemP3 = $recent->firstWhere('invoice', 'PO-PAID');
        $this->assertNotNull($itemP3);
        $this->assertEquals(3000, (float) $itemP3['amount']);
        $this->assertEquals(3000, (float) $itemP3['paid']);
        $this->assertEquals(0, (float) $itemP3['due']);
        $this->assertEquals('PAID', $itemP3['status']);
    }

    /**
     * T05 - Company isolation: purchases from company B do not appear in company A
     */
    public function test_dashboard_summary_recent_purchases_company_isolation(): void
    {
        $companyB = Company::factory()->create(['name' => 'Company Beta']);
        $supplierB = Supplier::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $companyB->id,
            'supplier_code' => 'SUP-B-001',
            'name' => 'Beta Supplier Ltd',
            'opening_balance' => 0,
            'status' => 'ACTIVE',
        ]);

        Purchase::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $companyB->id,
            'supplier_id' => $supplierB->id,
            'supplier_invoice_number' => 'PO-COMP-B',
            'invoice_date' => now()->toDateString(),
            'status' => 'POSTED',
            'subtotal' => 9900,
            'discount_total' => 0,
            'tax_total' => 0,
            'shipping_cost' => 0,
            'other_cost' => 0,
            'grand_total' => 9900,
        ]);

        $response = $this->actingAs($this->user)
            ->withHeaders(['X-Company-ID' => (string) $this->company->id])
            ->getJson('/api/v1/dashboard/summary');

        $response->assertStatus(200);
        $invoices = collect($response->json('data.recent_purchases'))->pluck('invoice');
        $this->assertFalse($invoices->contains('PO-COMP-B'));
    }

    /**
     * T06 - Branch and warehouse filtering in recent purchases
     */
    public function test_dashboard_summary_recent_purchases_respects_branch_and_warehouse_filters(): void
    {
        $bu = BusinessUnit::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'name' => 'Main Retail Unit',
            'code' => 'BU-' . Str::random(4),
        ]);

        $branch1 = Branch::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $bu->id,
            'name' => 'Branch North',
            'code' => 'BR-' . Str::random(4),
        ]);

        $warehouse1 = Warehouse::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $bu->id,
            'branch_id' => $branch1->id,
            'name' => 'Warehouse North',
            'code' => 'WH-' . Str::random(4),
            'is_active' => true,
        ]);

        $branch2 = Branch::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $bu->id,
            'name' => 'Branch South',
            'code' => 'BR-' . Str::random(4),
        ]);

        $warehouse2 = Warehouse::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $bu->id,
            'branch_id' => $branch2->id,
            'name' => 'Warehouse South',
            'code' => 'WH-' . Str::random(4),
            'is_active' => true,
        ]);

        $supplier = Supplier::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'supplier_code' => 'SUP-TEST-003',
            'name' => 'Filter Supplier',
            'opening_balance' => 0,
            'status' => 'ACTIVE',
        ]);

        Purchase::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'branch_id' => $branch1->id,
            'warehouse_id' => $warehouse1->id,
            'supplier_id' => $supplier->id,
            'supplier_invoice_number' => 'PO-NORTH',
            'invoice_date' => now()->toDateString(),
            'status' => 'POSTED',
            'subtotal' => 1200,
            'discount_total' => 0,
            'tax_total' => 0,
            'shipping_cost' => 0,
            'other_cost' => 0,
            'grand_total' => 1200,
        ]);

        Purchase::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'branch_id' => $branch2->id,
            'warehouse_id' => $warehouse2->id,
            'supplier_id' => $supplier->id,
            'supplier_invoice_number' => 'PO-SOUTH',
            'invoice_date' => now()->toDateString(),
            'status' => 'POSTED',
            'subtotal' => 2400,
            'discount_total' => 0,
            'tax_total' => 0,
            'shipping_cost' => 0,
            'other_cost' => 0,
            'grand_total' => 2400,
        ]);

        // Filter by branch1 and warehouse1
        $response = $this->actingAs($this->user)
            ->withHeaders(['X-Company-ID' => (string) $this->company->id])
            ->getJson("/api/v1/dashboard/summary?branch_id={$branch1->id}&warehouse_id={$warehouse1->id}");

        $response->assertStatus(200);
        $recent = collect($response->json('data.recent_purchases'));
        $this->assertTrue($recent->contains('invoice', 'PO-NORTH'));
        $this->assertFalse($recent->contains('invoice', 'PO-SOUTH'));
    }
}
