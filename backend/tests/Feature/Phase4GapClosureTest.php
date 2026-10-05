<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AccountGroup;
use App\Models\AccountingPeriod;
use App\Models\Branch;
use App\Models\BusinessUnit;
use App\Models\Company;
use App\Models\Customer;
use App\Models\CustomerLedger;
use App\Models\FiscalYear;
use App\Models\JournalEntry;
use App\Models\Permission;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalesReturn;
use App\Models\Supplier;
use App\Models\SupplierLedger;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\AccountingService;
use App\Services\AccountMappingService;
use App\Services\CustomerLedgerService;
use App\Services\InventoryAccountingService;
use App\Services\InventoryService;
use App\Services\SalesReturnService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class Phase4GapClosureTest extends TestCase
{
    use RefreshDatabase;

    protected Company $company;
    protected User $adminUser;
    protected User $regularUser;
    protected Warehouse $warehouse;
    protected Branch $branch;

    protected Account $assetAccount;
    protected Account $revenueAccount;
    protected Account $cogsAccount;
    protected Account $arAccount;
    protected Account $apAccount;
    protected Account $cashAccount;
    protected Account $vatAccount;

    protected AccountMappingService $mappingService;
    protected InventoryAccountingService $invAccountingService;
    protected SalesReturnService $salesReturnService;
    protected CustomerLedgerService $customerLedgerService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->mappingService = app(AccountMappingService::class);
        $this->invAccountingService = app(InventoryAccountingService::class);
        $this->customerLedgerService = app(CustomerLedgerService::class);
        $this->salesReturnService = app(SalesReturnService::class);

        // 1. Company Setup
        $this->company = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Phase 4 Verification Retail Corp',
            'code' => 'P4-' . Str::random(5),
            'country' => 'Bangladesh',
        ]);

        // 2. Roles and Users
        $adminRole = Role::firstOrCreate(['name' => 'Super Admin']);
        $cashierRole = Role::create([
            'name' => 'Cashier',
            'company_id' => $this->company->id,
        ]);
        $posPerm = Permission::firstOrCreate(['name' => 'pos.view']);
        $cashierRole->permissions()->attach($posPerm->id);

        $this->adminUser = User::factory()->create();
        $this->adminUser->roles()->attach($adminRole->id);
        $this->adminUser->companies()->attach($this->company->id);

        $this->regularUser = User::factory()->create();
        $this->regularUser->roles()->attach($cashierRole->id);
        $this->regularUser->companies()->attach($this->company->id);

        // 3. Fiscal Year and Period
        $fy = FiscalYear::create([
            'company_id' => $this->company->id,
            'name' => 'FY 2026',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'status' => 'OPEN',
            'created_by' => $this->adminUser->id,
        ]);

        AccountingPeriod::create([
            'company_id' => $this->company->id,
            'fiscal_year_id' => $fy->id,
            'name' => 'Period 2026-01 to 2026-12',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'status' => 'OPEN',
            'created_by' => $this->adminUser->id,
        ]);

        // 4. Business Unit, Branch and Warehouse
        $bu = BusinessUnit::create([
            'company_id' => $this->company->id,
            'name' => 'Retail Division',
            'code' => 'BU-01',
            'status' => 'active',
        ]);

        $this->branch = Branch::create([
            'company_id' => $this->company->id,
            'business_unit_id' => $bu->id,
            'name' => 'Main Outlet Dhaka',
            'code' => 'BR-01',
            'status' => 'active',
        ]);

        $this->warehouse = Warehouse::create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'name' => 'Central Hub Warehouse',
            'code' => 'WH-01',
            'status' => 'active',
        ]);

        // 5. Account Groups & Accounts
        $assetGrp = AccountGroup::create(['company_id' => $this->company->id, 'name' => 'Assets', 'code' => '1000', 'account_type' => 'ASSET']);
        $liabGrp = AccountGroup::create(['company_id' => $this->company->id, 'name' => 'Liabilities', 'code' => '2000', 'account_type' => 'LIABILITY']);
        $revGrp = AccountGroup::create(['company_id' => $this->company->id, 'name' => 'Revenue', 'code' => '4000', 'account_type' => 'REVENUE']);
        $expGrp = AccountGroup::create(['company_id' => $this->company->id, 'name' => 'Expense', 'code' => '5000', 'account_type' => 'EXPENSE']);

        $this->assetAccount = Account::create(['company_id' => $this->company->id, 'account_group_id' => $assetGrp->id, 'account_code' => '1300', 'account_name' => 'Merchandise Inventory', 'account_type' => 'ASSET', 'normal_balance' => 'DEBIT', 'is_active' => true]);
        $this->arAccount = Account::create(['company_id' => $this->company->id, 'account_group_id' => $assetGrp->id, 'account_code' => '1200', 'account_name' => 'Accounts Receivable', 'account_type' => 'ASSET', 'normal_balance' => 'DEBIT', 'is_active' => true]);
        $this->cashAccount = Account::create(['company_id' => $this->company->id, 'account_group_id' => $assetGrp->id, 'account_code' => '1010', 'account_name' => 'Cash in Hand', 'account_type' => 'ASSET', 'normal_balance' => 'DEBIT', 'is_active' => true]);

        $this->apAccount = Account::create(['company_id' => $this->company->id, 'account_group_id' => $liabGrp->id, 'account_code' => '2010', 'account_name' => 'Accounts Payable', 'account_type' => 'LIABILITY', 'normal_balance' => 'CREDIT', 'is_active' => true]);
        $this->vatAccount = Account::create(['company_id' => $this->company->id, 'account_group_id' => $liabGrp->id, 'account_code' => '2050', 'account_name' => 'VAT Output Payable', 'account_type' => 'LIABILITY', 'normal_balance' => 'CREDIT', 'is_active' => true]);

        $this->revenueAccount = Account::create(['company_id' => $this->company->id, 'account_group_id' => $revGrp->id, 'account_code' => '4010', 'account_name' => 'Retail Sales Revenue', 'account_type' => 'REVENUE', 'normal_balance' => 'CREDIT', 'is_active' => true]);
        $this->cogsAccount = Account::create(['company_id' => $this->company->id, 'account_group_id' => $expGrp->id, 'account_code' => '5010', 'account_name' => 'Cost of Goods Sold', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT', 'is_active' => true]);

        // 6. Map roles
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_INVENTORY_ASSET, $this->assetAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_ACCOUNTS_RECEIVABLE, $this->arAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_ACCOUNTS_PAYABLE, $this->apAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_CASH_BANK, $this->cashAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_SALES_REVENUE, $this->revenueAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_VAT_PAYABLE, $this->vatAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_COGS, $this->cogsAccount->id);
        $this->mappingService->setAccountingEnabled($this->company->id, true);
    }

    /**
     * P0-A: Sales Return GL Bridge & COGS Reversal Test.
     */
    public function test_sales_return_posts_balanced_general_ledger_and_cogs_reversal(): void
    {
        // 1. Setup Customer & Product
        $customer = Customer::create([
            'company_id' => $this->company->id,
            'customer_code' => 'CUST-P4-001',
            'name' => 'Tanvir Rahman',
            'opening_balance' => 0,
            'status' => 'ACTIVE',
        ]);

        $product = Product::create([
            'company_id' => $this->company->id,
            'name' => 'Premium Polo Shirt',
            'code' => 'POLO-01',
            'status' => 'active',
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'POLO-BLK-L',
            'price' => 1000.00,
            'cost' => 600.00,
        ]);

        // Initial inventory stock
        app(InventoryService::class)->processMovement(
            $this->company->id,
            $this->warehouse->id,
            $variant->id,
            'OPENING_STOCK',
            10,
            600.00,
            'Purchase',
            1,
            'GR-INIT',
            'Initial Stock',
            null,
            $this->adminUser->id
        );

        // 2. Create and complete a Sale (1 unit sold for 1000 + 50 VAT)
        $sale = Sale::create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'warehouse_id' => $this->warehouse->id,
            'customer_id' => $customer->id,
            'cashier_id' => $this->adminUser->id,
            'invoice_number' => 'INV-P4-1001',
            'sale_date' => '2026-03-15',
            'status' => 'COMPLETED',
            'subtotal' => 1000.00,
            'discount_total' => 0,
            'tax_total' => 50.00,
            'grand_total' => 1050.00,
            'paid_amount' => 1050.00,
            'due_amount' => 0,
            'payment_status' => 'PAID',
            'created_by' => $this->adminUser->id,
        ]);

        $saleItem = SaleItem::create([
            'sale_id' => $sale->id,
            'product_variant_id' => $variant->id,
            'sku_snapshot' => $variant->sku,
            'product_name_snapshot' => $product->name,
            'quantity' => 1,
            'unit_price' => 1000.00,
            'unit_cost_snapshot' => 600.00,
            'discount' => 0,
            'tax' => 50.00,
            'subtotal' => 1000.00,
            'line_total' => 1050.00,
        ]);

        // 3. Process Sales Return via SalesReturnService
        $returnData = [
            'original_sale_id' => $sale->id,
            'processed_by' => $this->adminUser->id,
            'items' => [
                [
                    'original_sale_item_id' => $saleItem->id,
                    'return_quantity' => 1,
                    'condition' => 'RESELLABLE',
                    'inventory_action' => 'RESTORE',
                    'reason' => 'Wrong size',
                ]
            ],
            'refund_methods' => [
                [
                    'method' => 'CASH',
                    'amount' => 1050.00,
                ]
            ],
        ];

        $salesReturn = $this->salesReturnService->processReturn($this->company->id, $returnData);

        $this->assertEquals('COMPLETED', $salesReturn->status);
        $this->assertEquals(1050.00, (float) $salesReturn->refund_total);

        // 4. Assert General Ledger Invoice Journal Entry
        $invJournal = JournalEntry::where('company_id', $this->company->id)
            ->where('reference_type', 'SalesReturn')
            ->where('reference_id', $salesReturn->id)
            ->where('idempotency_key', "RET-INV-{$salesReturn->id}")
            ->first();

        $this->assertNotNull($invJournal, 'Sales return invoice journal must be posted.');
        $this->assertEquals($invJournal->total_debit, $invJournal->total_credit, 'Invoice journal must be strictly balanced.');
        $this->assertEquals('POSTED', $invJournal->status);

        // Check line totals for Invoice journal:
        // DR Sales Revenue 1000.00, DR VAT 50.00, CR Cash 1050.00
        $revLine = $invJournal->lines()->where('account_id', $this->revenueAccount->id)->first();
        $vatLine = $invJournal->lines()->where('account_id', $this->vatAccount->id)->first();
        $cashLine = $invJournal->lines()->where('account_id', $this->cashAccount->id)->first();

        $this->assertNotNull($revLine);
        $this->assertEquals(1000.00, (float) $revLine->debit);
        $this->assertEquals(0, (float) $revLine->credit);

        $this->assertNotNull($vatLine);
        $this->assertEquals(50.00, (float) $vatLine->debit);
        $this->assertEquals(0, (float) $vatLine->credit);

        $this->assertNotNull($cashLine);
        $this->assertEquals(0, (float) $cashLine->debit);
        $this->assertEquals(1050.00, (float) $cashLine->credit);

        // 5. Assert COGS Reversal Journal Entry
        $cogsJournal = JournalEntry::where('company_id', $this->company->id)
            ->where('reference_type', 'SalesReturn')
            ->where('reference_id', $salesReturn->id)
            ->where('idempotency_key', "RET-COGS-{$salesReturn->id}")
            ->first();

        $this->assertNotNull($cogsJournal, 'COGS reversal journal must be posted.');
        $this->assertEquals($cogsJournal->total_debit, $cogsJournal->total_credit, 'COGS journal must be strictly balanced.');

        // DR Inventory Asset 600.00, CR COGS 600.00
        $assetLine = $cogsJournal->lines()->where('account_id', $this->assetAccount->id)->first();
        $cogsLine = $cogsJournal->lines()->where('account_id', $this->cogsAccount->id)->first();

        $this->assertNotNull($assetLine);
        $this->assertEquals(600.00, (float) $assetLine->debit);
        $this->assertEquals(0, (float) $assetLine->credit);

        $this->assertNotNull($cogsLine);
        $this->assertEquals(0, (float) $cogsLine->debit);
        $this->assertEquals(600.00, (float) $cogsLine->credit);
    }

    /**
     * P0-B: Authoritative Customer Balance & Receivables Report Reconciliation.
     */
    public function test_customer_balance_and_receivables_report_use_authoritative_ledger(): void
    {
        $customer = Customer::create([
            'company_id' => $this->company->id,
            'customer_code' => 'CUST-LEDGER-01',
            'name' => 'Corporate Client Apex',
            'opening_balance' => 1000.00,
            'credit_limit' => 50000.00,
            'status' => 'ACTIVE',
        ]);

        // Post Opening Balance in Ledger
        $this->customerLedgerService->postTransaction(
            $this->company->id,
            $customer->id,
            'OPENING_BALANCE',
            1000.00,
            0,
            '2026-01-01',
            Customer::class,
            $customer->id,
            'OB-01',
            'Initial Opening Balance',
            $this->adminUser->id
        );

        // Post Sale in Ledger: Debit 2500.00 (Customer owes +2500)
        $this->customerLedgerService->postTransaction(
            $this->company->id,
            $customer->id,
            'SALE',
            2500.00,
            0,
            '2026-01-15',
            'Sale',
            101,
            'INV-101',
            'Sale Invoice',
            $this->adminUser->id
        );

        // Post Store Credit Adjustment: Credit 500.00 (Customer due reduced by 500)
        $this->customerLedgerService->postTransaction(
            $this->company->id,
            $customer->id,
            'ADJUSTMENT',
            0,
            500.00,
            '2026-01-20',
            'Adjustment',
            1,
            'ADJ-01',
            'Store credit rebate',
            $this->adminUser->id
        );

        // Authoritative balance in ledger: 1000 + 2500 - 500 = 3000.00
        $expectedBalance = 3000.00;

        // Verify CustomerController::balance
        $response = $this->actingAs($this->adminUser)
            ->withHeader('X-Company-ID', (string) $this->company->id)
            ->getJson("/api/v1/customers/{$customer->id}/balance");

        $response->assertStatus(200);
        $this->assertEquals($expectedBalance, (float) $response->json('data.balance'));

        // Verify CustomerReportController::receivables
        $reportResponse = $this->actingAs($this->adminUser)
            ->withHeader('X-Company-ID', (string) $this->company->id)
            ->getJson('/api/v1/reports/customer-receivables');

        $reportResponse->assertStatus(200);
        $reportData = collect($reportResponse->json('data'))->firstWhere('id', $customer->id);
        $this->assertNotNull($reportData);
        $this->assertEquals($expectedBalance, (float) $reportData['balance']);
    }

    /**
     * P0-C: Authoritative Supplier Balance & Payables Report Reconciliation.
     */
    public function test_supplier_balance_and_payables_report_use_authoritative_ledger(): void
    {
        $supplier = Supplier::create([
            'company_id' => $this->company->id,
            'supplier_code' => 'SUPP-LEDGER-01',
            'name' => 'Beximco Yarn & Cotton Ltd',
            'opening_balance' => 5000.00,
            'status' => 'ACTIVE',
        ]);

        // Opening balance in ledger
        SupplierLedger::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'supplier_id' => $supplier->id,
            'transaction_type' => 'OPENING_BALANCE',
            'credit' => 5000.00,
            'debit' => 0,
            'balance_before' => 0,
            'balance_after' => 5000.00,
            'transaction_date' => '2026-01-01',
            'created_by' => $this->adminUser->id,
        ]);

        // Purchase Invoice in ledger: Credit 7500.00 (We owe supplier +7500)
        SupplierLedger::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'supplier_id' => $supplier->id,
            'transaction_type' => 'PURCHASE',
            'credit' => 7500.00,
            'debit' => 0,
            'balance_before' => 5000.00,
            'balance_after' => 12500.00,
            'transaction_date' => '2026-01-10',
            'created_by' => $this->adminUser->id,
        ]);

        // Payment in ledger: Debit 4000.00 (We paid 4000, reducing liability)
        SupplierLedger::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'supplier_id' => $supplier->id,
            'transaction_type' => 'PAYMENT',
            'credit' => 0,
            'debit' => 4000.00,
            'balance_before' => 12500.00,
            'balance_after' => 8500.00,
            'transaction_date' => '2026-01-20',
            'created_by' => $this->adminUser->id,
        ]);

        $expectedPayables = 8500.00;

        // Verify SupplierController::balance
        $response = $this->actingAs($this->adminUser)
            ->withHeader('X-Company-ID', (string) $this->company->id)
            ->getJson("/api/v1/suppliers/{$supplier->id}/balance");

        $response->assertStatus(200);
        $this->assertEquals($expectedPayables, (float) $response->json('data.balance'));

        // Verify SupplierReportController::payables
        $reportResponse = $this->actingAs($this->adminUser)
            ->withHeader('X-Company-ID', (string) $this->company->id)
            ->getJson('/api/v1/reports/supplier-payables');

        $reportResponse->assertStatus(200);
        $reportData = collect($reportResponse->json('data'))->firstWhere('id', $supplier->id);
        $this->assertNotNull($reportData);
        $this->assertEquals($expectedPayables, (float) $reportData['balance']);
    }

    /**
     * P1-A, P1-B, P1-C: RBAC Enforcement on Protected Endpoints.
     */
    public function test_rbac_protects_company_update_payments_and_sales_returns(): void
    {
        // 1. Regular user without permissions receives 403 on company update
        $companyUpdateResponse = $this->actingAs($this->regularUser)
            ->withHeader('X-Company-ID', (string) $this->company->id)
            ->putJson('/api/v1/company', ['name' => 'Hacked Company Name']);

        $companyUpdateResponse->assertStatus(403);

        // 2. Regular user without permissions receives 403 on payments
        $paymentIndexResponse = $this->actingAs($this->regularUser)
            ->withHeader('X-Company-ID', (string) $this->company->id)
            ->getJson('/api/v1/payments');

        $paymentIndexResponse->assertStatus(403);

        $paymentCreateResponse = $this->actingAs($this->regularUser)
            ->withHeader('X-Company-ID', (string) $this->company->id)
            ->postJson('/api/v1/payments', ['amount' => 100]);

        $paymentCreateResponse->assertStatus(403);

        // 3. Regular user without permissions receives 403 on sales return approve
        $returnApproveResponse = $this->actingAs($this->regularUser)
            ->withHeader('X-Company-ID', (string) $this->company->id)
            ->postJson('/api/v1/sales-returns/999/approve');

        $returnApproveResponse->assertStatus(403);

        // 4. Admin user bypasses checks and does NOT receive 403
        $adminCompanyResponse = $this->actingAs($this->adminUser)
            ->withHeader('X-Company-ID', (string) $this->company->id)
            ->putJson('/api/v1/company', ['name' => 'Valid Admin Update Ltd']);

        $this->assertNotEquals(403, $adminCompanyResponse->status());

        $adminPaymentResponse = $this->actingAs($this->adminUser)
            ->withHeader('X-Company-ID', (string) $this->company->id)
            ->getJson('/api/v1/payments');

        $this->assertNotEquals(403, $adminPaymentResponse->status());
    }

    /**
     * P1-F: CompanyController::show() No Dummy Creation Test.
     */
    public function test_company_show_returns_404_when_company_not_found_without_dummy_creation(): void
    {
        // Truncate companies to ensure completely empty company table
        DB::statement('TRUNCATE companies CASCADE');

        // User with no company attached querying non-existent company
        $freshUser = User::factory()->create();

        $response = $this->actingAs($freshUser)
            ->getJson('/api/v1/company');

        $response->assertStatus(404);
        $response->assertJson([
            'success' => false,
            'message' => 'Company not found.',
        ]);

        // Assert Apex Retail Ltd was NOT created
        $this->assertFalse(
            Company::where('name', 'Apex Retail Ltd')->exists(),
            'GET /company must not auto-create dummy company Apex Retail Ltd.'
        );
    }
}
