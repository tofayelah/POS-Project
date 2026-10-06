<?php

namespace Tests\Feature\Procurement;

use App\Models\Company;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\PurchaseOrder;
use App\Models\Rfq;
use App\Models\Role;
use App\Models\Supplier;
use App\Models\SupplierQuotation;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RfqAndQuotationComparisonTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Company $company;
    protected Warehouse $warehouse;
    protected Supplier $supplierA;
    protected Supplier $supplierB;
    protected ProductVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\ProcurementPermissionsSeeder::class);

        $this->company = Company::factory()->create();

        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);
        $adminRole = Role::firstOrCreate(['name' => 'Admin']);
        $this->user->roles()->attach($adminRole->id);

        $this->warehouse = Warehouse::create([
            'company_id' => $this->company->id,
            'name' => 'Chittagong Hub',
        ]);

        $this->supplierA = Supplier::create([
            'company_id' => $this->company->id,
            'supplier_code' => 'SUP-RFQ-A',
            'name' => 'Dhaka Tech Supplies',
            'qualification_status' => 'QUALIFIED',
            'status' => 'ACTIVE',
            'score_cached' => 88.5,
            'agreed_lead_time_days' => 5,
        ]);

        $this->supplierB = Supplier::create([
            'company_id' => $this->company->id,
            'supplier_code' => 'SUP-RFQ-B',
            'name' => 'Karnaphuli Trading',
            'qualification_status' => 'QUALIFIED',
            'status' => 'ACTIVE',
            'score_cached' => 75.0,
            'agreed_lead_time_days' => 12,
        ]);

        $product = Product::create([
            'company_id' => $this->company->id,
            'name' => 'Network Switch 24-Port',
            'type' => 'STANDARD',
        ]);

        $this->variant = ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $product->id,
            'sku' => 'NET-SW-24P',
            'cost_price' => 12000,
        ]);
    }

    public function test_can_create_rfq_and_invite_suppliers()
    {
        $response = $this->actingAs($this->user)->postJson(
            '/api/v1/rfqs',
            [
                'title' => 'Tender for 10 Network Switches',
                'issue_date' => now()->toDateString(),
                'deadline_date' => now()->addDays(7)->toDateString(),
                'items' => [
                    [
                        'product_id' => $this->variant->product_id,
                        'product_variant_id' => $this->variant->id,
                        'requested_quantity' => 10,
                        'target_unit_price' => 12000,
                    ],
                ],
                'invited_supplier_ids' => [$this->supplierA->id],
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $response->assertStatus(201)
                 ->assertJsonPath('data.status', 'DRAFT')
                 ->assertJsonPath('data.title', 'Tender for 10 Network Switches');

        $rfqId = $response->json('data.id');

        // Invite Supplier B
        $inviteRes = $this->actingAs($this->user)->postJson(
            "/api/v1/rfqs/{$rfqId}/invite",
            ['supplier_ids' => [$this->supplierB->id]],
            ['X-Company-ID' => $this->company->id]
        );

        $inviteRes->assertStatus(200);

        $rfq = Rfq::find($rfqId);
        $this->assertEquals('SENT', $rfq->status);
        $this->assertCount(2, $rfq->invitedSuppliers);
    }

    public function test_can_record_quotations_and_compare_with_advisory_ranking()
    {
        $rfq = Rfq::create([
            'company_id' => $this->company->id,
            'rfq_number' => 'RFQ-TEST-COMP-01',
            'title' => 'Procurement of 10 Switches',
            'status' => 'SENT',
            'issue_date' => now()->toDateString(),
        ]);

        $rfqItem = \App\Models\RfqItem::create([
            'rfq_id' => $rfq->id,
            'product_id' => $this->variant->product_id,
            'product_variant_id' => $this->variant->id,
            'requested_quantity' => 10,
            'target_unit_price' => 12000,
        ]);

        // Supplier A Quote: 11,500 BDT each, lead time 5 days (Best price & fast)
        $quoteResA = $this->actingAs($this->user)->postJson(
            "/api/v1/rfqs/{$rfq->id}/quotations",
            [
                'supplier_id' => $this->supplierA->id,
                'quotation_number' => 'QT-DHAKA-101',
                'lead_time_days' => 5,
                'items' => [
                    [
                        'rfq_item_id' => $rfqItem->id,
                        'product_id' => $this->variant->product_id,
                        'product_variant_id' => $this->variant->id,
                        'quantity' => 10,
                        'unit_price' => 11500,
                    ],
                ],
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $quoteResA->assertStatus(201)
                  ->assertJsonPath('data.grand_total', '115000.0000');

        // Supplier B Quote: 12,200 BDT each, lead time 12 days
        $quoteResB = $this->actingAs($this->user)->postJson(
            "/api/v1/rfqs/{$rfq->id}/quotations",
            [
                'supplier_id' => $this->supplierB->id,
                'quotation_number' => 'QT-KARN-202',
                'lead_time_days' => 12,
                'items' => [
                    [
                        'rfq_item_id' => $rfqItem->id,
                        'product_id' => $this->variant->product_id,
                        'product_variant_id' => $this->variant->id,
                        'quantity' => 10,
                        'unit_price' => 12200,
                    ],
                ],
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $quoteResB->assertStatus(201);

        // Compare quotations
        $compareRes = $this->actingAs($this->user)->getJson(
            "/api/v1/rfqs/{$rfq->id}/compare",
            ['X-Company-ID' => $this->company->id]
        );

        $compareRes->assertStatus(200)
                   ->assertJsonPath('data.quotations_count', 2)
                   ->assertJsonPath('data.recommended_quotation_id', $quoteResA->json('data.id'));

        $this->assertNotEmpty($compareRes->json('data.advisory_notes'));
    }

    public function test_can_award_quotation_and_generate_purchase_order()
    {
        $rfq = Rfq::create([
            'company_id' => $this->company->id,
            'rfq_number' => 'RFQ-TEST-AWARD-01',
            'title' => 'Award Tender',
            'status' => 'UNDER_EVALUATION',
            'issue_date' => now()->toDateString(),
        ]);

        $quoteA = SupplierQuotation::create([
            'company_id' => $this->company->id,
            'rfq_id' => $rfq->id,
            'supplier_id' => $this->supplierA->id,
            'quotation_number' => 'QT-A-01',
            'quotation_date' => now()->toDateString(),
            'subtotal' => 50000,
            'grand_total' => 50000,
            'lead_time_days' => 6,
            'status' => 'SUBMITTED',
            'is_awarded' => false,
        ]);

        \App\Models\SupplierQuotationItem::create([
            'supplier_quotation_id' => $quoteA->id,
            'product_id' => $this->variant->product_id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 5,
            'unit_price' => 10000,
            'line_total' => 50000,
        ]);

        $quoteB = SupplierQuotation::create([
            'company_id' => $this->company->id,
            'rfq_id' => $rfq->id,
            'supplier_id' => $this->supplierB->id,
            'quotation_number' => 'QT-B-01',
            'quotation_date' => now()->toDateString(),
            'subtotal' => 55000,
            'grand_total' => 55000,
            'lead_time_days' => 10,
            'status' => 'SUBMITTED',
            'is_awarded' => false,
        ]);

        // Award Quote A
        $awardRes = $this->actingAs($this->user)->postJson(
            "/api/v1/rfqs/{$rfq->id}/award",
            [
                'quotation_id' => $quoteA->id,
                'notes' => 'Awarded to lowest compliant bidder.',
                'create_po' => true,
                'warehouse_id' => $this->warehouse->id,
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $awardRes->assertStatus(200)
                 ->assertJsonPath('data.rfq.status', 'AWARDED')
                 ->assertJsonPath('data.quotation.is_awarded', true)
                 ->assertJsonPath('data.quotation.status', 'ACCEPTED');

        // Check Quote B was rejected
        $quoteB->refresh();
        $this->assertEquals('REJECTED', $quoteB->status);

        // Check PO was created
        $poData = $awardRes->json('data.purchase_order');
        $this->assertNotNull($poData);
        $this->assertEquals($this->supplierA->id, $poData['supplier_id']);
        $this->assertEquals('50000.0000', $poData['grand_total']);
        $this->assertEquals($rfq->id, $poData['rfq_id']);
        $this->assertEquals($quoteA->id, $poData['supplier_quotation_id']);

        // Check Audit Log
        $this->assertDatabaseHas('audit_logs', [
            'event' => 'RFQ_QUOTATION_AWARDED',
            'auditable_type' => Rfq::class,
            'auditable_id' => $rfq->id,
        ]);
    }
}
