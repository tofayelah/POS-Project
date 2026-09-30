<?php

namespace Tests\Feature\Pos;

use Tests\TestCase;
use App\Models\User;
use App\Models\Company;
use App\Models\BusinessUnit;
use App\Models\Branch;
use App\Models\Warehouse;
use App\Models\PosTerminal;
use App\Models\PosSession;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

class PosSessionTest extends TestCase
{
    use RefreshDatabase;

    protected Company $company;
    protected User $cashier;
    protected BusinessUnit $businessUnit;
    protected Branch $branch;
    protected Warehouse $warehouse;
    protected PosTerminal $activeTerminal;
    protected PosTerminal $inactiveTerminal;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Session Test Company',
            'code' => 'COMP-' . Str::random(5),
            'country' => 'Bangladesh',
        ]);

        $this->cashier = User::factory()->create();
        $this->cashier->companies()->attach($this->company->id);

        $permOpen = Permission::firstOrCreate(['name' => 'pos.open_session'], ['group' => 'pos']);
        $permClose = Permission::firstOrCreate(['name' => 'pos.close_session'], ['group' => 'pos']);
        $permView = Permission::firstOrCreate(['name' => 'pos.view'], ['group' => 'pos']);
        $role = Role::firstOrCreate(['name' => 'POS Cashier']);
        $role->permissions()->syncWithoutDetaching([$permOpen->id, $permClose->id, $permView->id]);
        $this->cashier->roles()->syncWithoutDetaching([$role->id]);

        $this->businessUnit = BusinessUnit::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'name' => 'Retail BU',
            'code' => 'BU-' . Str::random(5),
        ]);

        $this->branch = Branch::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'name' => 'Main Branch',
            'code' => 'BR-' . Str::random(5),
        ]);

        $this->warehouse = Warehouse::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'branch_id' => $this->branch->id,
            'name' => 'Main Warehouse',
            'code' => 'WH-' . Str::random(5),
            'is_active' => true,
        ]);

        $this->activeTerminal = PosTerminal::create([
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'branch_id' => $this->branch->id,
            'warehouse_id' => $this->warehouse->id,
            'terminal_code' => 'POS-SES-01',
            'terminal_name' => 'Session Counter 1',
            'status' => 'ACTIVE',
        ]);

        $this->inactiveTerminal = PosTerminal::create([
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'branch_id' => $this->branch->id,
            'warehouse_id' => $this->warehouse->id,
            'terminal_code' => 'POS-SES-02',
            'terminal_name' => 'Session Counter 2 Inactive',
            'status' => 'INACTIVE',
        ]);
    }

    public function test_can_open_session_with_active_terminal()
    {
        $response = $this->actingAs($this->cashier)->postJson('/api/v1/pos/sessions/open', [
            'pos_terminal_id' => $this->activeTerminal->id,
            'opening_cash' => 2500.00,
            'notes' => 'Morning shift open float',
        ], [
            'X-Company-ID' => $this->company->id,
        ]);

        $response->assertStatus(201);
        $response->assertJson(['success' => true]);

        $sessionId = $response->json('data.id');
        $session = PosSession::find($sessionId);

        $this->assertNotNull($session);
        $this->assertEquals($this->company->id, $session->company_id);
        $this->assertEquals($this->activeTerminal->id, $session->pos_terminal_id);
        $this->assertEquals($this->cashier->id, $session->cashier_id);
        $this->assertEquals(2500.00, (float)$session->opening_cash);
        $this->assertEquals('OPEN', $session->status);
        $this->assertStringStartsWith('SES-', $session->session_number);
    }

    public function test_cannot_open_session_with_inactive_terminal()
    {
        $response = $this->actingAs($this->cashier)->postJson('/api/v1/pos/sessions/open', [
            'pos_terminal_id' => $this->inactiveTerminal->id,
            'opening_cash' => 1000.00,
        ], [
            'X-Company-ID' => $this->company->id,
        ]);

        // Throws ModelNotFoundException or 409/404 since status != ACTIVE
        $this->assertContains($response->getStatusCode(), [404, 409]);
        $this->assertDatabaseMissing('pos_sessions', [
            'pos_terminal_id' => $this->inactiveTerminal->id,
            'status' => 'OPEN',
        ]);
    }

    public function test_cannot_open_session_with_other_company_terminal()
    {
        $companyB = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Foreign Company B',
            'code' => 'COMP-B-' . Str::random(3),
            'country' => 'Bangladesh',
        ]);

        $buB = BusinessUnit::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $companyB->id,
            'name' => 'BU B',
            'code' => 'BU-B',
        ]);

        $whB = Warehouse::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $companyB->id,
            'business_unit_id' => $buB->id,
            'name' => 'WH B',
            'code' => 'WH-B',
        ]);

        $terminalB = PosTerminal::create([
            'company_id' => $companyB->id,
            'business_unit_id' => $buB->id,
            'warehouse_id' => $whB->id,
            'terminal_code' => 'POS-COMP-B',
            'terminal_name' => 'Foreign Terminal',
            'status' => 'ACTIVE',
        ]);

        $response = $this->actingAs($this->cashier)->postJson('/api/v1/pos/sessions/open', [
            'pos_terminal_id' => $terminalB->id,
            'opening_cash' => 1000.00,
        ], [
            'X-Company-ID' => $this->company->id,
        ]);

        $this->assertContains($response->getStatusCode(), [404, 409]);
    }

    public function test_cannot_open_duplicate_session_on_same_terminal()
    {
        // First session opens successfully
        $this->actingAs($this->cashier)->postJson('/api/v1/pos/sessions/open', [
            'pos_terminal_id' => $this->activeTerminal->id,
            'opening_cash' => 1000.00,
        ], [
            'X-Company-ID' => $this->company->id,
        ])->assertStatus(201);

        // Another cashier attempts to open a session on the same terminal
        $cashier2 = User::factory()->create();
        $cashier2->companies()->attach($this->company->id);
        $role = Role::where('name', 'POS Cashier')->first();
        $cashier2->roles()->syncWithoutDetaching([$role->id]);

        $response = $this->actingAs($cashier2)->postJson('/api/v1/pos/sessions/open', [
            'pos_terminal_id' => $this->activeTerminal->id,
            'opening_cash' => 1500.00,
        ], [
            'X-Company-ID' => $this->company->id,
        ]);

        $response->assertStatus(409);
        $response->assertJson(['success' => false]);
        $this->assertStringContainsString('Terminal already has an open session', $response->json('message'));
    }

    public function test_cashier_cannot_open_multiple_sessions_simultaneously()
    {
        $terminal2 = PosTerminal::create([
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'branch_id' => $this->branch->id,
            'warehouse_id' => $this->warehouse->id,
            'terminal_code' => 'POS-SES-EXTRA',
            'terminal_name' => 'Extra Terminal',
            'status' => 'ACTIVE',
        ]);

        // First session opens on terminal 1
        $this->actingAs($this->cashier)->postJson('/api/v1/pos/sessions/open', [
            'pos_terminal_id' => $this->activeTerminal->id,
            'opening_cash' => 1000.00,
        ], [
            'X-Company-ID' => $this->company->id,
        ])->assertStatus(201);

        // Same cashier tries to open another session on terminal 2
        $response = $this->actingAs($this->cashier)->postJson('/api/v1/pos/sessions/open', [
            'pos_terminal_id' => $terminal2->id,
            'opening_cash' => 1000.00,
        ], [
            'X-Company-ID' => $this->company->id,
        ]);

        $response->assertStatus(409);
        $response->assertJson(['success' => false]);
        $this->assertStringContainsString('Cashier already has an open session', $response->json('message'));
    }

    public function test_cashier_cannot_open_session_on_unassigned_branch_terminal()
    {
        $otherBranch = Branch::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'name' => 'Chittagong Branch',
            'code' => 'BR-CTG',
        ]);

        $otherTerminal = PosTerminal::create([
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'branch_id' => $otherBranch->id,
            'warehouse_id' => $this->warehouse->id,
            'terminal_code' => 'POS-CTG-01',
            'terminal_name' => 'CTG Counter',
            'status' => 'ACTIVE',
        ]);

        // Scope cashier to Gulshan branch only
        $this->cashier->branches()->attach($this->branch->id);

        $response = $this->actingAs($this->cashier)->postJson('/api/v1/pos/sessions/open', [
            'pos_terminal_id' => $otherTerminal->id,
            'opening_cash' => 1000.00,
        ], [
            'X-Company-ID' => $this->company->id,
        ]);

        $response->assertStatus(409);
        $this->assertStringContainsString("Cashier does not have access to this terminal's branch", $response->json('message'));
    }

    public function test_negative_opening_cash_is_rejected()
    {
        $response = $this->actingAs($this->cashier)->postJson('/api/v1/pos/sessions/open', [
            'pos_terminal_id' => $this->activeTerminal->id,
            'opening_cash' => -500.00,
        ], [
            'X-Company-ID' => $this->company->id,
        ]);

        $this->assertContains($response->getStatusCode(), [422, 409]);
    }

    public function test_closed_session_cannot_receive_new_pos_sale()
    {
        // 1. Open session
        $openRes = $this->actingAs($this->cashier)->postJson('/api/v1/pos/sessions/open', [
            'pos_terminal_id' => $this->activeTerminal->id,
            'opening_cash' => 1000.00,
        ], [
            'X-Company-ID' => $this->company->id,
        ])->assertStatus(201);

        $sessionId = $openRes->json('data.id');

        // 2. Close session
        $this->actingAs($this->cashier)->postJson("/api/v1/pos/sessions/{$sessionId}/close", [
            'closing_cash' => 1000.00,
        ], [
            'X-Company-ID' => $this->company->id,
        ])->assertStatus(200);

        // 3. Attempt to submit a sale against the closed session
        $product = \App\Models\Product::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'name' => 'Test Item',
            'code' => 'ITM-01',
        ]);

        $variant = \App\Models\ProductVariant::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'product_id' => $product->id,
            'sku' => 'ITM-01-V',
            'variant_name' => 'Default',
            'selling_price' => 100.00,
            'mrp' => 100.00,
        ]);

        $salePayload = [
            'pos_session_id' => $sessionId,
            'cashier_id' => $this->cashier->id,
            'items' => [
                [
                    'product_variant_id' => $variant->id,
                    'quantity' => 1,
                    'unit_price' => 100.00,
                ]
            ],
            'payments' => [
                [
                    'payment_method' => 'CASH',
                    'amount' => 100.00,
                ]
            ],
        ];

        $permSale = Permission::firstOrCreate(['name' => 'sales.complete'], ['group' => 'sales']);
        $role = Role::where('name', 'POS Cashier')->first();
        $role->permissions()->syncWithoutDetaching([$permSale->id]);

        $saleResponse = $this->actingAs($this->cashier)->postJson('/api/v1/sales/complete', $salePayload, [
            'X-Company-ID' => $this->company->id,
        ]);

        // Closed session must reject sales
        $this->assertContains($saleResponse->getStatusCode(), [400, 404, 409, 422]);
        $this->assertDatabaseMissing('sales', [
            'pos_session_id' => $sessionId,
        ]);
    }

    public function test_pos_session_reconciliation_report()
    {
        // 1. Open session
        $openRes = $this->actingAs($this->cashier)->postJson('/api/v1/pos/sessions/open', [
            'pos_terminal_id' => $this->activeTerminal->id,
            'opening_cash' => 2000.00,
        ], [
            'X-Company-ID' => $this->company->id,
        ])->assertStatus(201);

        $sessionId = $openRes->json('data.id');

        // 2. Fetch reconciliation report
        $recResponse = $this->actingAs($this->cashier)->getJson("/api/v1/pos/sessions/{$sessionId}/reconciliation", [
            'X-Company-ID' => $this->company->id,
        ]);

        $recResponse->assertStatus(200);
        $recResponse->assertJson(['success' => true]);

        $data = $recResponse->json('data');
        $this->assertEquals(2000.00, $data['cash']['opening_cash']);
        $this->assertEquals(0.00, $data['cash']['cash_sales']);
        $this->assertEquals(2000.00, $data['cash']['expected_cash']);
        $this->assertEquals('OPEN', $data['session_info']['status']);
    }
}
