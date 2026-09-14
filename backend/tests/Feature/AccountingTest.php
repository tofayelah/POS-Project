<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Company;
use App\Models\Role;
use Spatie\Permission\Models\Permission;

class AccountingTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $company;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->company = Company::create(['name' => 'Test Company']);
        
        $role = Role::create(['name' => 'Super Admin', 'company_id' => $this->company->id]);
        
        $this->user = User::factory()->create();
        $this->user->roles()->attach($role->id);
        $this->user->companies()->attach($this->company->id);
    }

    public function test_account_creation()
    {
        $response = $this->actingAs($this->user)->postJson('/api/v1/accounts', [
            'account_name' => 'Cash',
            'account_code' => '1000',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'allow_manual_posting' => true,
        ], ['X-Company-ID' => $this->company->id]);
        
        $response->assertStatus(201);
        $this->assertDatabaseHas('accounts', ['account_code' => '1000']);
    }

    public function test_journal_creation()
    {
        // 1. Create fiscal year and period
        $fy = $this->actingAs($this->user)->postJson('/api/v1/fiscal-years', [
            'name' => '2024',
            'start_date' => '2024-01-01',
            'end_date' => '2024-12-31',
        ], ['X-Company-ID' => $this->company->id])->json('data');
        
        $this->actingAs($this->user)->postJson('/api/v1/accounting-periods', [
            'fiscal_year_id' => $fy['id'],
            'name' => 'Jan 2024',
            'start_date' => '2024-01-01',
            'end_date' => '2024-01-31',
        ], ['X-Company-ID' => $this->company->id]);

        // 2. Create accounts
        $cash = $this->actingAs($this->user)->postJson('/api/v1/accounts', [
            'account_name' => 'Cash',
            'account_code' => '1000',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'allow_manual_posting' => true,
        ], ['X-Company-ID' => $this->company->id])->json('data');

        $revenue = $this->actingAs($this->user)->postJson('/api/v1/accounts', [
            'account_name' => 'Sales',
            'account_code' => '4000',
            'account_type' => 'REVENUE',
            'normal_balance' => 'CREDIT',
            'allow_manual_posting' => true,
        ], ['X-Company-ID' => $this->company->id])->json('data');

        // 3. Create journal
        $response = $this->actingAs($this->user)->postJson('/api/v1/journals', [
            'journal_date' => '2024-01-15',
            'description' => 'Daily Sales',
            'lines' => [
                ['account_id' => $cash['id'], 'debit' => 100, 'credit' => 0],
                ['account_id' => $revenue['id'], 'debit' => 0, 'credit' => 100],
            ]
        ], ['X-Company-ID' => $this->company->id]);
        
        $response->assertStatus(201);
        $this->assertDatabaseHas('journal_entries', ['description' => 'Daily Sales', 'status' => 'DRAFT']);
    }

    public function test_unbalanced_journal_rejection()
    {
        $fy = $this->actingAs($this->user)->postJson('/api/v1/fiscal-years', [
            'name' => '2024',
            'start_date' => '2024-01-01',
            'end_date' => '2024-12-31',
        ], ['X-Company-ID' => $this->company->id])->json('data');
        
        $this->actingAs($this->user)->postJson('/api/v1/accounting-periods', [
            'fiscal_year_id' => $fy['id'],
            'name' => 'Jan 2024',
            'start_date' => '2024-01-01',
            'end_date' => '2024-01-31',
        ], ['X-Company-ID' => $this->company->id]);

        $cash = $this->actingAs($this->user)->postJson('/api/v1/accounts', [
            'account_name' => 'Cash',
            'account_code' => '1000',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'allow_manual_posting' => true,
        ], ['X-Company-ID' => $this->company->id])->json('data');

        $revenue = $this->actingAs($this->user)->postJson('/api/v1/accounts', [
            'account_name' => 'Sales',
            'account_code' => '4000',
            'account_type' => 'REVENUE',
            'normal_balance' => 'CREDIT',
            'allow_manual_posting' => true,
        ], ['X-Company-ID' => $this->company->id])->json('data');

        $response = $this->actingAs($this->user)->postJson('/api/v1/journals', [
            'journal_date' => '2024-01-15',
            'description' => 'Daily Sales Unbalanced',
            'lines' => [
                ['account_id' => $cash['id'], 'debit' => 100, 'credit' => 0],
                ['account_id' => $revenue['id'], 'debit' => 0, 'credit' => 90], // Unbalanced!
            ]
        ], ['X-Company-ID' => $this->company->id]);
        
        $response->assertStatus(409);
    }
}
