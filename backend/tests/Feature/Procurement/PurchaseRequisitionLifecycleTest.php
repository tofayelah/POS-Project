<?php

namespace Tests\Feature\Procurement;

use App\Models\Company;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\PurchaseOrder;
use App\Models\PurchaseRequisition;
use App\Models\Rfq;
use App\Models\Role;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchaseRequisitionLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $staffUser;
    protected Company $company;
    protected Warehouse $warehouse;
    protected Supplier $supplier;
    protected ProductVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\ProcurementPermissionsSeeder::class);

        $this->company = Company::factory()->create();

        $this->adminUser = User::factory()->create();
        $this->adminUser->companies()->attach($this->company->id);
        $adminRole = Role::firstOrCreate(['name' => 'Admin']);
        $this->adminUser->roles()->attach($adminRole->id);

        $this->staffUser = User::factory()->create();
        $this->staffUser->companies()->attach($this->company->id);
        $managerRole = Role::firstOrCreate(['name' => 'Manager']);
        $this->staffUser->roles()->attach($managerRole->id);

        $this->supplier = Supplier::create([
            'company_id' => $this->company->id,
            'supplier_code' => 'SUP-REQ-01',
            'name' => 'Padma Materials Ltd',
            'qualification_status' => 'QUALIFIED',
            'status' => 'ACTIVE',
        ]);

        $this->warehouse = Warehouse::create([
            'company_id' => $this->company->id,
            'name' => 'Main Requisition Depot',
        ]);

        $product = Product::create([
            'company_id' => $this->company->id,
            'name' => 'Industrial Bearing',
            'type' => 'STANDARD',
        ]);

        $this->variant = ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $product->id,
            'sku' => 'IND-BRG-100',
            'cost_price' => 250,
        ]);
    }

    public function test_can_create_purchase_requisition_with_items_and_auto_number()
    {
        $response = $this->actingAs($this->adminUser)->postJson(
            '/api/v1/purchase-requisitions',
            [
                'warehouse_id' => $this->warehouse->id,
                'title' => 'Quarterly Maintenance Spares',
                'priority' => 'HIGH',
                'required_date' => now()->addDays(14)->toDateString(),
                'notes' => 'Urgent replacement stock',
                'items' => [
                    [
                        'product_id' => $this->variant->product_id,
                        'product_variant_id' => $this->variant->id,
                        'requested_quantity' => 20,
                        'estimated_unit_cost' => 250,
                        'preferred_supplier_id' => $this->supplier->id,
                    ],
                ],
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $response->assertStatus(201)
                 ->assertJsonPath('data.status', 'DRAFT')
                 ->assertJsonPath('data.priority', 'HIGH')
                 ->assertJsonPath('data.estimated_total_cost', '5000.0000');

        $reqNumber = $response->json('data.requisition_no');
        $this->assertStringStartsWith('REQ-', $reqNumber);

        $this->assertDatabaseHas('purchase_requisitions', [
            'requisition_no' => $reqNumber,
            'company_id' => $this->company->id,
            'status' => 'DRAFT',
        ]);

        $this->assertDatabaseHas('purchase_requisition_items', [
            'product_variant_id' => $this->variant->id,
            'requested_quantity' => 20,
        ]);
    }

    public function test_can_submit_and_review_requisition()
    {
        $req = PurchaseRequisition::create([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'requisition_no' => 'REQ-TEST-SUBMIT',
            'status' => 'DRAFT',
            'requested_by' => $this->staffUser->id,
        ]);

        // Submit
        $submitRes = $this->actingAs($this->staffUser)->postJson(
            "/api/v1/purchase-requisitions/{$req->id}/submit",
            [],
            ['X-Company-ID' => $this->company->id]
        );

        $submitRes->assertStatus(200)
                  ->assertJsonPath('data.status', 'SUBMITTED');

        // Review
        $reviewRes = $this->actingAs($this->adminUser)->postJson(
            "/api/v1/purchase-requisitions/{$req->id}/review",
            ['notes' => 'Budget verified against OPEX.'],
            ['X-Company-ID' => $this->company->id]
        );

        $reviewRes->assertStatus(200)
                  ->assertJsonPath('data.status', 'UNDER_REVIEW');
    }

    public function test_can_approve_requisition_and_records_audit_log()
    {
        $req = PurchaseRequisition::create([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'requisition_no' => 'REQ-TEST-APPROVE',
            'status' => 'UNDER_REVIEW',
            'requested_by' => $this->staffUser->id,
        ]);

        $response = $this->actingAs($this->adminUser)->postJson(
            "/api/v1/purchase-requisitions/{$req->id}/approve",
            [],
            ['X-Company-ID' => $this->company->id]
        );

        $response->assertStatus(200)
                 ->assertJsonPath('data.status', 'APPROVED');

        $req->refresh();
        $this->assertEquals('APPROVED', $req->status);
        $this->assertEquals($this->adminUser->id, $req->approved_by);
        $this->assertNotNull($req->approved_at);

        $this->assertDatabaseHas('audit_logs', [
            'event' => 'PURCHASE_REQUISITION_APPROVED',
            'auditable_type' => PurchaseRequisition::class,
            'auditable_id' => $req->id,
        ]);
    }

    public function test_segregation_of_duties_prevents_self_approval_for_non_admin()
    {
        $req = PurchaseRequisition::create([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'requisition_no' => 'REQ-TEST-SOD',
            'status' => 'SUBMITTED',
            'requested_by' => $this->staffUser->id,
        ]);

        // staffUser tries to approve their own requisition with enforce_segregation=true
        $response = $this->actingAs($this->staffUser)->postJson(
            "/api/v1/purchase-requisitions/{$req->id}/approve",
            ['enforce_segregation' => true],
            ['X-Company-ID' => $this->company->id]
        );

        $response->assertStatus(422)
                 ->assertJsonPath('success', false);
    }

    public function test_can_reject_requisition_with_reason()
    {
        $req = PurchaseRequisition::create([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'requisition_no' => 'REQ-TEST-REJECT',
            'status' => 'SUBMITTED',
            'requested_by' => $this->staffUser->id,
        ]);

        $response = $this->actingAs($this->adminUser)->postJson(
            "/api/v1/purchase-requisitions/{$req->id}/reject",
            ['reason' => 'Duplicate request, spares already ordered.'],
            ['X-Company-ID' => $this->company->id]
        );

        $response->assertStatus(200)
                 ->assertJsonPath('data.status', 'REJECTED');

        $req->refresh();
        $this->assertEquals('REJECTED', $req->status);
        $this->assertEquals('Duplicate request, spares already ordered.', $req->rejection_reason);
    }

    public function test_can_convert_approved_requisition_to_purchase_order()
    {
        $req = PurchaseRequisition::create([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'requisition_no' => 'REQ-TEST-CONV-PO',
            'status' => 'APPROVED',
            'requested_by' => $this->staffUser->id,
        ]);

        \App\Models\PurchaseRequisitionItem::create([
            'purchase_requisition_id' => $req->id,
            'product_id' => $this->variant->product_id,
            'product_variant_id' => $this->variant->id,
            'requested_quantity' => 15,
            'estimated_unit_cost' => 250,
            'estimated_total_cost' => 3750,
            'converted_quantity' => 0,
        ]);

        $response = $this->actingAs($this->adminUser)->postJson(
            "/api/v1/purchase-requisitions/{$req->id}/convert-po",
            [
                'supplier_id' => $this->supplier->id,
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $response->assertStatus(200)
                 ->assertJsonPath('data.status', 'DRAFT')
                 ->assertJsonPath('data.supplier_id', $this->supplier->id);

        $poId = $response->json('data.id');
        $this->assertNotNull($poId);

        $po = PurchaseOrder::find($poId);
        $this->assertEquals($req->id, $po->purchase_requisition_id);
        $this->assertEquals(15, (float) $po->items->first()->quantity);

        $req->refresh();
        $this->assertEquals('CONVERTED', $req->status);
        $this->assertEquals('PO', $req->converted_to_type);
        $this->assertEquals($poId, $req->converted_to_id);
        $this->assertEquals(15, (float) $req->items->first()->converted_quantity);
    }

    public function test_can_convert_approved_requisition_to_rfq()
    {
        $req = PurchaseRequisition::create([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'requisition_no' => 'REQ-TEST-CONV-RFQ',
            'status' => 'APPROVED',
            'requested_by' => $this->staffUser->id,
        ]);

        \App\Models\PurchaseRequisitionItem::create([
            'purchase_requisition_id' => $req->id,
            'product_id' => $this->variant->product_id,
            'product_variant_id' => $this->variant->id,
            'requested_quantity' => 50,
            'estimated_unit_cost' => 250,
            'estimated_total_cost' => 12500,
            'converted_quantity' => 0,
        ]);

        $response = $this->actingAs($this->adminUser)->postJson(
            "/api/v1/purchase-requisitions/{$req->id}/convert-rfq",
            [
                'title' => 'Tender for 50 Bearings',
                'deadline_date' => now()->addDays(10)->toDateString(),
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $response->assertStatus(200)
                 ->assertJsonPath('data.status', 'DRAFT')
                 ->assertJsonPath('data.title', 'Tender for 50 Bearings');

        $rfqId = $response->json('data.id');
        $rfq = Rfq::find($rfqId);
        $this->assertEquals($req->id, $rfq->purchase_requisition_id);
        $this->assertEquals(50, (float) $rfq->items->first()->requested_quantity);

        $req->refresh();
        $this->assertEquals('CONVERTED', $req->status);
        $this->assertEquals('RFQ', $req->converted_to_type);
        $this->assertEquals($rfqId, $req->converted_to_id);
    }
}
