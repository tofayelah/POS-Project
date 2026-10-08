<?php

namespace Tests\Feature\Finance;

use App\Models\Account;
use App\Models\AccountingPeriod;
use App\Models\Company;
use App\Models\Customer;
use App\Models\FiscalYear;
use App\Models\Purchase;
use App\Models\Role;
use App\Models\Sale;
use App\Models\Supplier;
use App\Models\User;
use App\Services\AccountingService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinancialAnalyticsAndArApTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Company $company;
    protected FiscalYear $fiscalYear;
    protected AccountingPeriod $period;
    protected Account $arGlAccount;
    protected Account $apGlAccount;
    protected Account $cashGlAccount;
    protected Account $salesGlAccount;
    protected Account $cogsGlAccount;

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

        $this->arGlAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '1030',
            'account_name' => 'Accounts Receivable',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
            'allow_manual_posting' => true,
        ]);

        $this->apGlAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '2010',
            'account_name' => 'Accounts Payable',
            'account_type' => 'LIABILITY',
            'normal_balance' => 'CREDIT',
            'is_active' => true,
            'allow_manual_posting' => true,
        ]);

        $this->cashGlAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '1010',
            'account_name' => 'Cash in Hand',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
            'allow_manual_posting' => true,
        ]);

        $this->salesGlAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '4000',
            'account_name' => 'Sales Revenue',
            'account_type' => 'REVENUE',
            'normal_balance' => 'CREDIT',
            'is_active' => true,
            'allow_manual_posting' => true,
        ]);

        $this->cogsGlAccount = Account::create([
            'company_id' => $this->company->id,
            'account_code' => '5000',
            'account_name' => 'Cost of Goods Sold',
            'account_type' => 'EXPENSE',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
            'allow_manual_posting' => true,
        ]);
    }

    public function test_advanced_ar_aging_buckets_and_gl_reconciliation(): void
    {
        $customer = Customer::create([
            'company_id' => $this->company->id,
            'customer_code' => 'CUST-001',
            'name' => 'Apex Retailers',
            'mobile' => '01700000001',
            'credit_limit' => 50000,
        ]);

        $today = Carbon::today();

        // 1. Current invoice due in 10 days
        Sale::create([
            'company_id' => $this->company->id,
            'customer_id' => $customer->id,
            'cashier_id' => $this->user->id,
            'invoice_number' => 'INV-2026-001',
            'sale_date' => $today->toDateString(),
            'due_date' => $today->copy()->addDays(10)->toDateString(),
            'status' => 'COMPLETED',
            'grand_total' => 20000,
            'paid_amount' => 0,
            'due_amount' => 20000,
            'payment_status' => 'DUE',
            'channel' => 'pos',
        ]);

        // 2. Overdue invoice 45 days past due (bucket 31-60)
        Sale::create([
            'company_id' => $this->company->id,
            'customer_id' => $customer->id,
            'cashier_id' => $this->user->id,
            'invoice_number' => 'INV-2026-002',
            'sale_date' => $today->copy()->subDays(75)->toDateString(),
            'due_date' => $today->copy()->subDays(45)->toDateString(),
            'status' => 'COMPLETED',
            'grand_total' => 15000,
            'paid_amount' => 0,
            'due_amount' => 15000,
            'payment_status' => 'DUE',
            'channel' => 'pos',
        ]);

        $res = $this->actingAs($this->user)->getJson('/api/v1/financial-management/ar/aging', ['X-Company-ID' => $this->company->id]);
        $res->assertStatus(200);

        $summary = $res->json('data.summary');
        $this->assertEquals(20000, (float) $summary['total_current']);
        $this->assertEquals(15000, (float) $summary['total_31_60']);
        $this->assertEquals(35000, (float) $summary['grand_total_subledger']);

        $customers = $res->json('data.customers');
        $this->assertCount(1, $customers);
        $this->assertEquals('Apex Retailers', $customers[0]['customer_name']);
        $this->assertEquals(45, $customers[0]['max_overdue_days']);
        $this->assertEquals('URGENT', $customers[0]['priority_level']);
    }

    public function test_advanced_ap_aging_buckets(): void
    {
        $supplier = Supplier::create([
            'company_id' => $this->company->id,
            'supplier_code' => 'SUPP-001',
            'name' => 'Unilever Bangladesh',
            'mobile' => '01800000001',
        ]);

        $today = Carbon::today();

        // Overdue bill 15 days past due (bucket 1-30)
        Purchase::create([
            'company_id' => $this->company->id,
            'supplier_id' => $supplier->id,
            'supplier_invoice_number' => 'BILL-UNI-101',
            'invoice_date' => $today->copy()->subDays(45)->toDateString(),
            'due_date' => $today->copy()->subDays(15)->toDateString(),
            'status' => 'POSTED',
            'grand_total' => 40000,
            'paid_amount' => 0,
            'due_amount' => 40000,
            'payment_status' => 'PARTIAL',
        ]);

        $res = $this->actingAs($this->user)->getJson('/api/v1/financial-management/ap/aging', ['X-Company-ID' => $this->company->id]);
        $res->assertStatus(200);

        $summary = $res->json('data.summary');
        $this->assertEquals(40000, (float) $summary['total_1_30']);
        $this->assertEquals(40000, (float) $summary['grand_total_subledger']);
    }

    public function test_financial_ratios_with_divide_by_zero_guards(): void
    {
        // When there are zero transactions, all ratios must return 0.0 or safe float, never 500 or division by zero error!
        $res = $this->actingAs($this->user)->getJson('/api/v1/financial-management/analytics/ratios', ['X-Company-ID' => $this->company->id]);
        $res->assertStatus(200);

        $ratios = $res->json('data');
        $this->assertEquals(0.0, (float) $ratios['profitability_ratios']['gross_margin_pct']);
        $this->assertEquals(0.0, (float) $ratios['profitability_ratios']['operating_margin_pct']);
        $this->assertEquals(0.0, (float) $ratios['profitability_ratios']['net_margin_pct']);
        $this->assertEquals(0.0, (float) $ratios['liquidity_ratios']['current_ratio']);
        $this->assertEquals(0.0, (float) $ratios['liquidity_ratios']['quick_ratio']);
        $this->assertEquals(0.0, (float) $ratios['efficiency_and_leverage']['inventory_turnover']);
        $this->assertEquals(0.0, (float) $ratios['efficiency_and_leverage']['days_sales_outstanding']);
    }

    public function test_cash_treasury_positions_and_deterministic_forecast(): void
    {
        $accountingService = app(AccountingService::class);
        $accountingService->postAutomatedJournal($this->company->id, [
            'journal_date' => '2026-10-02',
            'description' => 'Opening Cash Balance',
            'lines' => [
                ['account_id' => $this->cashGlAccount->id, 'debit' => 200000, 'credit' => 0],
                ['account_id' => $this->salesGlAccount->id, 'debit' => 0, 'credit' => 200000],
            ],
        ], $this->user->id);

        $posRes = $this->actingAs($this->user)->getJson('/api/v1/financial-management/cash-treasury/positions', ['X-Company-ID' => $this->company->id]);
        $posRes->assertStatus(200);
        $this->assertEquals(200000, (float) $posRes->json('data.total_liquid_cash'));

        $fcstRes = $this->actingAs($this->user)->getJson('/api/v1/financial-management/cash-treasury/forecast', ['X-Company-ID' => $this->company->id]);
        $fcstRes->assertStatus(200);
        $this->assertEquals(200000, (float) $fcstRes->json('data.current_cash'));
        $this->assertArrayHasKey('day_7', $fcstRes->json('data.projections'));
        $this->assertArrayHasKey('day_30', $fcstRes->json('data.projections'));
        $this->assertArrayHasKey('day_60', $fcstRes->json('data.projections'));
        $this->assertArrayHasKey('day_90', $fcstRes->json('data.projections'));
    }

    public function test_multi_tenant_isolation(): void
    {
        $otherCompany = Company::factory()->create();

        // Querying from user of company A must not return accounts or data from company B
        $res = $this->actingAs($this->user)->getJson('/api/v1/financial-management/cash-treasury/positions', [
            'X-Company-ID' => $this->company->id,
        ]);
        $res->assertStatus(200);

        // Another company's request with unauthorized user will be forbidden / empty
        $otherUser = User::factory()->create();
        $otherUser->companies()->attach($otherCompany->id);

        $otherRes = $this->actingAs($otherUser)->getJson('/api/v1/financial-management/cash-treasury/positions', [
            'X-Company-ID' => $otherCompany->id,
        ]);
        $otherRes->assertStatus(200);
        $this->assertEquals(0, (float) $otherRes->json('data.total_liquid_cash'));
    }
}
