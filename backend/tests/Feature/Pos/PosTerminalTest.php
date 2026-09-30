<?php

namespace Tests\Feature\Pos;

use Tests\TestCase;
use App\Models\User;
use App\Models\Company;
use App\Models\BusinessUnit;
use App\Models\Branch;
use App\Models\Warehouse;
use App\Models\PosTerminal;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

class PosTerminalTest extends TestCase
{
    use RefreshDatabase;

    protected Company $company;
    protected User $user;
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
            'name' => 'Test Retail POS Company',
            'code' => 'COMP-' . Str::random(5),
            'country' => 'Bangladesh',
        ]);

        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);

        $perm = Permission::firstOrCreate(['name' => 'pos.view'], ['group' => 'pos']);
        $role = Role::firstOrCreate(['name' => 'POS Manager']);
        $role->permissions()->syncWithoutDetaching([$perm->id]);
        $this->user->roles()->syncWithoutDetaching([$role->id]);

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
            'name' => 'Gulshan Branch',
            'code' => 'BR-' . Str::random(5),
        ]);

        $this->warehouse = Warehouse::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'branch_id' => $this->branch->id,
            'name' => 'Gulshan Store Warehouse',
            'code' => 'WH-' . Str::random(5),
            'is_active' => true,
        ]);

        $this->activeTerminal = PosTerminal::create([
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'branch_id' => $this->branch->id,
            'warehouse_id' => $this->warehouse->id,
            'terminal_code' => 'POS-01',
            'terminal_name' => 'Counter 1 Active',
            'status' => 'ACTIVE',
        ]);

        $this->inactiveTerminal = PosTerminal::create([
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'branch_id' => $this->branch->id,
            'warehouse_id' => $this->warehouse->id,
            'terminal_code' => 'POS-02',
            'terminal_name' => 'Counter 2 Inactive',
            'status' => 'INACTIVE',
        ]);
    }

    public function test_user_can_list_all_terminals_without_filter()
    {
        $response = $this->actingAs($this->user)->getJson('/api/v1/pos/terminals', [
            'X-Company-ID' => $this->company->id,
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);
        $this->assertCount(2, $response->json('data'));
    }

    public function test_user_can_list_active_terminals_only_with_status_filter()
    {
        $response = $this->actingAs($this->user)->getJson('/api/v1/pos/terminals?status=ACTIVE', [
            'X-Company-ID' => $this->company->id,
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('POS-01', $data[0]['terminal_code']);
        $this->assertEquals('ACTIVE', $data[0]['status']);
    }

    public function test_terminal_tenant_isolation()
    {
        $companyB = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Company B',
            'code' => 'COMP-B',
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
            'terminal_code' => 'POS-B1',
            'terminal_name' => 'Company B Terminal',
            'status' => 'ACTIVE',
        ]);

        $response = $this->actingAs($this->user)->getJson('/api/v1/pos/terminals', [
            'X-Company-ID' => $this->company->id,
        ]);

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->toArray();
        $this->assertNotContains($terminalB->id, $ids);
    }

    public function test_user_branch_scoping_for_terminals()
    {
        $branch2 = Branch::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'name' => 'Dhanmondi Branch',
            'code' => 'BR-DHAN',
        ]);

        $terminalBranch2 = PosTerminal::create([
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'branch_id' => $branch2->id,
            'warehouse_id' => $this->warehouse->id,
            'terminal_code' => 'POS-DHAN',
            'terminal_name' => 'Dhanmondi Counter',
            'status' => 'ACTIVE',
        ]);

        // Assign user specifically to Gulshan branch ($this->branch)
        $this->user->branches()->attach($this->branch->id);

        $response = $this->actingAs($this->user)->getJson('/api/v1/pos/terminals', [
            'X-Company-ID' => $this->company->id,
        ]);

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->toArray();
        $this->assertContains($this->activeTerminal->id, $ids);
        $this->assertNotContains($terminalBranch2->id, $ids);
    }

    public function test_can_create_pos_terminal()
    {
        $payload = [
            'terminal_name' => 'New Counter 3',
            'terminal_code' => 'POS-03',
            'warehouse_id' => $this->warehouse->id,
            'branch_id' => $this->branch->id,
            'status' => 'ACTIVE',
            'receipt_header' => 'Welcome to RetailCore',
            'receipt_footer' => 'Thank you for shopping!',
        ];

        $response = $this->actingAs($this->user)->postJson('/api/v1/pos/terminals', $payload, [
            'X-Company-ID' => $this->company->id,
        ]);

        $response->assertStatus(201);
        $response->assertJson(['success' => true]);
        $this->assertDatabaseHas('pos_terminals', [
            'company_id' => $this->company->id,
            'terminal_code' => 'POS-03',
            'terminal_name' => 'New Counter 3',
            'status' => 'ACTIVE',
        ]);
    }

    public function test_create_terminal_rejects_duplicate_code_in_same_company()
    {
        $payload = [
            'terminal_name' => 'Duplicate Code Counter',
            'terminal_code' => 'POS-01', // already used
            'warehouse_id' => $this->warehouse->id,
            'status' => 'ACTIVE',
        ];

        $response = $this->actingAs($this->user)->postJson('/api/v1/pos/terminals', $payload, [
            'X-Company-ID' => $this->company->id,
        ]);

        $response->assertStatus(422);
        $response->assertJson(['success' => false]);
    }

    public function test_can_update_pos_terminal()
    {
        $payload = [
            'terminal_name' => 'Renamed Counter 1',
            'terminal_code' => 'POS-01-REVISED',
            'status' => 'INACTIVE',
        ];

        $response = $this->actingAs($this->user)->putJson("/api/v1/pos/terminals/{$this->activeTerminal->id}", $payload, [
            'X-Company-ID' => $this->company->id,
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        $this->activeTerminal->refresh();
        $this->assertEquals('Renamed Counter 1', $this->activeTerminal->terminal_name);
        $this->assertEquals('POS-01-REVISED', $this->activeTerminal->terminal_code);
        $this->assertEquals('INACTIVE', $this->activeTerminal->status);
    }

    public function test_can_toggle_terminal_status_active_to_inactive()
    {
        $response = $this->actingAs($this->user)->putJson("/api/v1/pos/terminals/{$this->activeTerminal->id}", [
            'status' => 'INACTIVE',
        ], [
            'X-Company-ID' => $this->company->id,
        ]);

        $response->assertStatus(200);
        $this->activeTerminal->refresh();
        $this->assertEquals('INACTIVE', $this->activeTerminal->status);

        // Toggle back to ACTIVE
        $response2 = $this->actingAs($this->user)->putJson("/api/v1/pos/terminals/{$this->activeTerminal->id}", [
            'status' => 'ACTIVE',
        ], [
            'X-Company-ID' => $this->company->id,
        ]);

        $response2->assertStatus(200);
        $this->activeTerminal->refresh();
        $this->assertEquals('ACTIVE', $this->activeTerminal->status);
    }

    public function test_create_terminal_rejects_invalid_branch()
    {
        $payload = [
            'terminal_name' => 'Bad Branch Terminal',
            'terminal_code' => 'POS-BAD-BR',
            'warehouse_id' => $this->warehouse->id,
            'branch_id' => 999999, // non-existent branch
            'status' => 'ACTIVE',
        ];

        $response = $this->actingAs($this->user)->postJson('/api/v1/pos/terminals', $payload, [
            'X-Company-ID' => $this->company->id,
        ]);

        $this->assertContains($response->getStatusCode(), [422, 404]);
    }

    public function test_create_terminal_rejects_invalid_warehouse()
    {
        $payload = [
            'terminal_name' => 'Bad WH Terminal',
            'terminal_code' => 'POS-BAD-WH',
            'warehouse_id' => 999999, // non-existent warehouse
            'status' => 'ACTIVE',
        ];

        $response = $this->actingAs($this->user)->postJson('/api/v1/pos/terminals', $payload, [
            'X-Company-ID' => $this->company->id,
        ]);

        $this->assertContains($response->getStatusCode(), [422, 404]);
    }

    public function test_create_terminal_rejects_invalid_company_gl_account()
    {
        $companyOther = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Other Corp',
            'code' => 'OTHER',
            'country' => 'Bangladesh',
        ]);

        $accountOther = \App\Models\Account::create([
            'company_id' => $companyOther->id,
            'account_code' => '1001-OTH',
            'account_name' => 'Other Cash',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $payload = [
            'terminal_name' => 'Bad GL Terminal',
            'terminal_code' => 'POS-BAD-GL',
            'warehouse_id' => $this->warehouse->id,
            'default_cash_account_id' => $accountOther->id, // belongs to other company
            'status' => 'ACTIVE',
        ];

        $response = $this->actingAs($this->user)->postJson('/api/v1/pos/terminals', $payload, [
            'X-Company-ID' => $this->company->id,
        ]);

        $this->assertContains($response->getStatusCode(), [422, 404]);
    }

    public function test_create_terminal_rejects_mismatched_warehouse_and_branch()
    {
        $otherBranch = Branch::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'name' => 'Mismatched Branch',
            'code' => 'BR-MIS',
        ]);

        // $this->warehouse is assigned to $this->branch, not $otherBranch
        $payload = [
            'terminal_name' => 'Mismatched Terminal',
            'terminal_code' => 'POS-MISMATCH',
            'warehouse_id' => $this->warehouse->id,
            'branch_id' => $otherBranch->id,
            'status' => 'ACTIVE',
        ];

        $response = $this->actingAs($this->user)->postJson('/api/v1/pos/terminals', $payload, [
            'X-Company-ID' => $this->company->id,
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('Selected warehouse does not belong to the chosen branch', $response->json('message'));
    }
}
