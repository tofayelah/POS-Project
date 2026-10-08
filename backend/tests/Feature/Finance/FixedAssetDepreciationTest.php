<?php

namespace Tests\Feature\Finance;

use App\Models\Account;
use App\Models\AccountingPeriod;
use App\Models\Company;
use App\Models\FiscalYear;
use App\Models\FixedAsset;
use App\Models\FixedAssetCategory;
use App\Models\JournalEntry;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FixedAssetDepreciationTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Company $company;
    protected FiscalYear $fiscalYear;
    protected AccountingPeriod $period;
    protected Account $assetAccount;
    protected Account $accumDeprAccount;
    protected Account $deprExpenseAccount;
    protected Account $cashAccount;
    protected Account $gainLossAccount;
    protected FixedAssetCategory $category;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
        $this->seed(\Database\Seeders\AccountingPermissionSeeder::class);
        $this->seed(\Database\Seeders\FinancialManagementPermissionsSeeder::class);

        $this->company = Company::factory()->create();

        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);
        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin']);
        $this->user->roles()->attach($superAdmin->id);

        $this->fiscalYear = FiscalYear::create([
            'company_id' => $this->company->id,
            'name' => 'FY 2026',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'status' => 'OPEN',
            'is_current' => true,
        ]);

        $this->period = AccountingPeriod::create([
            'company_id' => $this->company->id,
            'fiscal_year_id' => $this->fiscalYear->id,
            'name' => 'October 2026',
            'start_date' => '2026-10-01',
            'end_date' => '2026-10-31',
            'status' => 'OPEN',
        ]);

        $this->assetAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '1510',
            'account_name' => 'Office Equipment',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
            'allow_manual_posting' => true,
        ]);

        $this->accumDeprAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '1519',
            'account_name' => 'Accumulated Depreciation - Office Equipment',
            'account_type' => 'ASSET',
            'normal_balance' => 'CREDIT',
            'is_active' => true,
            'allow_manual_posting' => true,
        ]);

        $this->deprExpenseAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '6500',
            'account_name' => 'Depreciation Expense',
            'account_type' => 'EXPENSE',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
            'allow_manual_posting' => true,
        ]);

        $this->cashAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '1010',
            'account_name' => 'Cash Account',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
            'allow_manual_posting' => true,
        ]);

        $this->gainLossAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '5900',
            'account_name' => 'Loss on Asset Disposal',
            'account_type' => 'EXPENSE',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
            'allow_manual_posting' => true,
        ]);

        $this->category = FixedAssetCategory::create([
            'company_id' => $this->company->id,
            'code' => 'CAT-OFFICE-EQ',
            'name' => 'Office Equipment & Computers',
            'depreciation_method' => 'STRAIGHT_LINE',
            'useful_life_months' => 24, // 24 months
            'asset_account_id' => $this->assetAccount->id,
            'accumulated_depreciation_account_id' => $this->accumDeprAccount->id,
            'depreciation_expense_account_id' => $this->deprExpenseAccount->id,
            'status' => 'ACTIVE',
        ]);
    }

    public function test_register_asset_and_run_depreciation(): void
    {
        // Register an asset: Cost 120,000, Residual 0, 24 months useful life -> 5,000 / month
        $registerRes = $this->actingAs($this->user)->postJson('/api/v1/financial-management/fixed-assets', [
            'category_id' => $this->category->id,
            'asset_code' => 'AST-MAC-001',
            'name' => 'MacBook Pro M3 Max',
            'purchase_date' => '2026-10-01',
            'purchase_cost' => 120000,
            'residual_value' => 0,
            'useful_life_months' => 24,
            'location' => 'Head Office HQ',
        ], ['X-Company-ID' => $this->company->id]);

        $registerRes->assertStatus(201);
        $assetId = $registerRes->json('data.id');

        // Run Depreciation
        $deprRes = $this->actingAs($this->user)->postJson('/api/v1/financial-management/fixed-assets/run-depreciation', [
            'depreciation_date' => '2026-10-31',
            'accounting_period_id' => $this->period->id,
        ], ['X-Company-ID' => $this->company->id]);

        $deprRes->assertStatus(200);
        $this->assertEquals(1, $deprRes->json('data.processed_assets_count'));
        $this->assertEquals(5000, (float) $deprRes->json('data.total_depreciation'));

        // Check asset details
        $assetRes = $this->actingAs($this->user)->getJson("/api/v1/financial-management/fixed-assets/{$assetId}", ['X-Company-ID' => $this->company->id]);
        $assetRes->assertStatus(200);
        $this->assertEquals(5000, $assetRes->json('data.accumulated_depreciation'));
        $this->assertEquals(115000, $assetRes->json('data.book_value'));

        // Verify Journal Entry was created and balanced
        $journalId = $deprRes->json('data.entries.0.journal_id');
        $journal = JournalEntry::with('lines')->find($journalId);
        $this->assertNotNull($journal);
        $this->assertEquals('POSTED', $journal->status);
        $this->assertEquals(5000, (float) $journal->lines->sum('debit'));
        $this->assertEquals(5000, (float) $journal->lines->sum('credit'));
    }

    public function test_asset_disposal_workflow_with_loss_posting(): void
    {
        $asset = FixedAsset::create([
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'asset_code' => 'AST-PRINTER-01',
            'name' => 'HP LaserJet Printer',
            'purchase_date' => '2026-10-01',
            'purchase_cost' => 50000,
            'residual_value' => 0,
            'useful_life_months' => 10,
            'asset_account_id' => $this->assetAccount->id,
            'accumulated_depreciation_account_id' => $this->accumDeprAccount->id,
            'depreciation_expense_account_id' => $this->deprExpenseAccount->id,
            'status' => 'ACTIVE',
            'created_by' => $this->user->id,
        ]);

        // Run depreciation once (5,000 accumulated)
        $this->actingAs($this->user)->postJson('/api/v1/financial-management/fixed-assets/run-depreciation', [
            'depreciation_date' => '2026-10-15',
            'accounting_period_id' => $this->period->id,
        ], ['X-Company-ID' => $this->company->id]);

        // Book value is 50,000 - 5,000 = 45,000. Sell for 30,000 -> Loss = 15,000.
        $disposeRes = $this->actingAs($this->user)->postJson("/api/v1/financial-management/fixed-assets/{$asset->id}/dispose", [
            'disposal_date' => '2026-10-25',
            'sale_proceeds' => 30000,
            'settlement_account_id' => $this->cashAccount->id,
            'gain_loss_account_id' => $this->gainLossAccount->id,
            'notes' => 'Sold to secondary buyer',
        ], ['X-Company-ID' => $this->company->id]);

        $disposeRes->assertStatus(200);
        $disposalData = $disposeRes->json('data');
        $this->assertEquals(45000, (float) $disposalData['book_value']);
        $this->assertEquals(30000, (float) $disposalData['sale_proceeds']);
        $this->assertEquals(-15000, (float) $disposalData['gain_loss_amount']);

        // Check asset status is DISPOSED
        $asset->refresh();
        $this->assertEquals('DISPOSED', $asset->status);
    }
}
