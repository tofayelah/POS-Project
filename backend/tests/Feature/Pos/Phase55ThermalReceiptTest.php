<?php

namespace Tests\Feature\Pos;

use App\Models\Account;
use App\Models\AccountGroup;
use App\Models\AccountingPeriod;
use App\Models\AuditLog;
use App\Models\Branch;
use App\Models\BusinessUnit;
use App\Models\Category;
use App\Models\Company;
use App\Models\Customer;
use App\Models\FiscalYear;
use App\Models\Permission;
use App\Models\PosSession;
use App\Models\PosTerminal;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\Sale;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\AccountMappingService;
use App\Services\AccountingService;
use App\Services\InventoryService;
use App\Services\PosShiftService;
use App\Services\SalesReturnService;
use App\Services\SalesService;
use App\Services\StoreCreditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class Phase55ThermalReceiptTest extends TestCase
{
    use RefreshDatabase;

    protected Company $company;
    protected Company $otherCompany;
    protected User $cashier;
    protected User $unauthorizedUser;
    protected BusinessUnit $businessUnit;
    protected Branch $branch;
    protected Warehouse $warehouse;
    protected PosTerminal $terminal;
    protected PosSession $session;
    protected Product $product;
    protected ProductVariant $variant;
    protected Customer $customer;

    protected PosShiftService $shiftService;
    protected SalesService $salesService;
    protected SalesReturnService $salesReturnService;
    protected StoreCreditService $storeCreditService;
    protected AccountingService $accountingService;
    protected AccountMappingService $mappingService;
    protected InventoryService $inventoryService;

    protected Account $cashAccount;
    protected Account $arAccount;
    protected Account $salesRevenueAccount;
    protected Account $cogsAccount;
    protected Account $inventoryAssetAccount;
    protected Account $storeCreditAccount;

    protected function setUp(): void
    {
        parent::setUp();

        $this->shiftService = app(PosShiftService::class);
        $this->salesService = app(SalesService::class);
        $this->salesReturnService = app(SalesReturnService::class);
        $this->storeCreditService = app(StoreCreditService::class);
        $this->accountingService = app(AccountingService::class);
        $this->mappingService = app(AccountMappingService::class);
        $this->inventoryService = app(InventoryService::class);

        // 1. Tenants Setup
        $this->company = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'RetailCore Superstore Ltd',
            'legal_name' => 'RetailCore Superstore Ltd',
            'code' => 'COMP-RC-' . Str::random(4),
            'country' => 'Bangladesh',
            'address' => 'Gulshan-2, Dhaka 1212',
            'phone' => '+880 1711-000000',
            'vat_registration' => 'BIN-987654321-0101',
        ]);

        $this->otherCompany = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Other Tenant Corp',
            'code' => 'COMP-OT-' . Str::random(4),
            'country' => 'Bangladesh',
        ]);

        // 2. Permissions Setup
        $permList = [
            'pos.view', 'pos.open_session', 'pos.close_session',
            'pos_shifts.view', 'pos_shifts.open', 'pos_shifts.close',
            'pos_shifts.cash_in', 'pos_shifts.cash_out', 'pos_shifts.reconcile',
            'sales.view', 'sales.complete',
            'sales_return.view', 'sales_return.create', 'sales_return.refund',
            'store_credit.view', 'store_credit.issue', 'store_credit.redeem',
            'receipts.view', 'receipts.print', 'receipts.reprint',
        ];
        foreach ($permList as $pName) {
            Permission::firstOrCreate(['name' => $pName], ['group' => 'pos']);
        }

        $cashierRole = Role::firstOrCreate(['name' => 'Cashier']);
        $cashierPerms = Permission::whereIn('name', [
            'pos.view', 'pos.open_session', 'pos.close_session',
            'pos_shifts.view', 'pos_shifts.open', 'pos_shifts.close',
            'pos_shifts.cash_in', 'pos_shifts.cash_out', 'pos_shifts.reconcile',
            'sales.view', 'sales.complete',
            'sales_return.view', 'sales_return.create', 'sales_return.refund',
            'store_credit.view', 'store_credit.issue', 'store_credit.redeem',
            'receipts.view', 'receipts.print', 'receipts.reprint',
        ])->pluck('id');
        $cashierRole->permissions()->syncWithoutDetaching($cashierPerms);

        // 3. Users
        $this->cashier = User::factory()->create([
            'company_id' => $this->company->id,
            'name' => 'Anwar Cashier',
            'email' => 'anwar@retailcore.test',
            'status' => 'active',
        ]);
        $this->cashier->companies()->syncWithoutDetaching([$this->company->id]);
        $this->cashier->roles()->syncWithoutDetaching([$cashierRole->id]);

        $restrictedRole = Role::firstOrCreate(['name' => 'Restricted']);
        $restrictedRole->permissions()->syncWithoutDetaching([
            Permission::where('name', 'pos_shifts.cash_in')->first()->id
        ]);
        $this->unauthorizedUser = User::factory()->create([
            'company_id' => $this->company->id,
            'name' => 'Restricted User',
            'email' => 'restricted@retailcore.test',
            'status' => 'active',
        ]);
        $this->unauthorizedUser->companies()->syncWithoutDetaching([$this->company->id]);
        $this->unauthorizedUser->roles()->syncWithoutDetaching([$restrictedRole->id]);

        // 4. Org Hierarchy
        $this->businessUnit = BusinessUnit::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'name' => 'Retail Unit',
            'code' => 'BU-RET-' . Str::random(4),
        ]);

        $this->branch = Branch::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'name' => 'Gulshan Flagship Branch',
            'code' => 'BR-GUL',
            'address' => 'Gulshan-2, Dhaka',
        ]);
        $this->cashier->branches()->attach($this->branch->id);

        $this->warehouse = Warehouse::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'branch_id' => $this->branch->id,
            'name' => 'Gulshan Store Inventory',
            'code' => 'WH-GUL-' . Str::random(4),
            'is_active' => true,
        ]);

        // 5. Chart of Accounts
        $grpAsset = AccountGroup::create([
            'company_id' => $this->company->id,
            'name' => 'Current Assets',
            'code' => '1000',
            'account_type' => 'ASSET',
        ]);

        $grpLiability = AccountGroup::create([
            'company_id' => $this->company->id,
            'name' => 'Current Liabilities',
            'code' => '2000',
            'account_type' => 'LIABILITY',
        ]);

        $grpExp = AccountGroup::create([
            'company_id' => $this->company->id,
            'name' => 'Operating Expense',
            'code' => '5000',
            'account_type' => 'EXPENSE',
        ]);

        $grpRev = AccountGroup::create([
            'company_id' => $this->company->id,
            'name' => 'Revenue',
            'code' => '4000',
            'account_type' => 'REVENUE',
        ]);

        $this->cashAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpAsset->id,
            'account_code' => '1010',
            'account_name' => 'Cash in Drawer',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->arAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpAsset->id,
            'account_code' => '1020',
            'account_name' => 'Accounts Receivable',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->salesRevenueAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpRev->id,
            'account_code' => '4010',
            'account_name' => 'Sales Revenue',
            'account_type' => 'REVENUE',
            'normal_balance' => 'CREDIT',
            'is_active' => true,
        ]);

        $this->cogsAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpExp->id,
            'account_code' => '5001',
            'account_name' => 'Cost of Goods Sold',
            'account_type' => 'EXPENSE',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->inventoryAssetAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpAsset->id,
            'account_code' => '1030',
            'account_name' => 'Inventory Asset',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->storeCreditAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpLiability->id,
            'account_code' => '2100',
            'account_name' => 'Store Credit Liability',
            'account_type' => 'LIABILITY',
            'normal_balance' => 'CREDIT',
            'is_active' => true,
        ]);

        // Map accounts
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_CASH_BANK, $this->cashAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_ACCOUNTS_RECEIVABLE, $this->arAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_SALES_REVENUE, $this->salesRevenueAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_COGS, $this->cogsAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_INVENTORY_ASSET, $this->inventoryAssetAccount->id);
        $this->mappingService->setMapping($this->company->id, 'customer_store_credit', $this->storeCreditAccount->id);

        $this->mappingService->setAccountingEnabled($this->company->id, true);

        // Fiscal period
        $fiscalYear = FiscalYear::create([
            'company_id' => $this->company->id,
            'name' => 'FY 2026',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'status' => 'OPEN',
            'created_by' => $this->cashier->id,
        ]);

        AccountingPeriod::create([
            'company_id' => $this->company->id,
            'fiscal_year_id' => $fiscalYear->id,
            'name' => 'Period 2026-10',
            'start_date' => '2026-10-01',
            'end_date' => '2026-10-31',
            'status' => 'OPEN',
            'created_by' => $this->cashier->id,
        ]);

        // 6. POS Terminal
        $this->terminal = PosTerminal::create([
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'branch_id' => $this->branch->id,
            'warehouse_id' => $this->warehouse->id,
            'terminal_code' => 'POS-GUL-01',
            'terminal_name' => 'Gulshan Front Counter 01',
            'default_cash_account_id' => $this->cashAccount->id,
            'status' => 'ACTIVE',
        ]);

        // 7. Product Catalog & Inventory Stock
        $unit = Unit::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'name' => 'Pieces',
            'short_code' => 'PCS',
        ]);

        $cat = Category::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'name' => 'Beverages',
            'code' => 'BEV-' . Str::random(4),
        ]);

        $this->product = Product::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'category_id' => $cat->id,
            'unit_id' => $unit->id,
            'name' => 'Organic Orange Juice 1L',
            'code' => 'PRD-ORG-' . Str::random(4),
            'status' => 'ACTIVE',
            'tax_rate' => 0.00,
        ]);

        $this->variant = ProductVariant::create([
            'uuid' => (string) Str::uuid(),
            'product_id' => $this->product->id,
            'variant_name' => '1 Litre Bottle',
            'sku' => 'SKU-ORG-JUICE-1L',
            'cost_price' => 120.00,
            'selling_price' => 200.00,
            'status' => 'ACTIVE',
        ]);

        // Stock in 100 units
        $this->inventoryService->stockIn(
            $this->company->id,
            $this->warehouse->id,
            $this->variant->id,
            100,
            120.00,
            'OPENING_STOCK',
            1,
            'INIT-STOCK-001',
            'Opening stock for receipt tests',
            null,
            $this->cashier->id
        );

        // 8. Customer with points balance
        $this->customer = Customer::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'customer_code' => 'CUST-0001',
            'name' => 'Nusrat Jahan',
            'mobile' => '01819123456',
            'status' => 'active',
            'points_balance' => 150,
        ]);

        // Open POS Session
        $this->session = $this->shiftService->openShift(
            $this->company->id,
            $this->terminal->id,
            $this->cashier->id,
            2000.00,
            'Morning shift opening'
        );
    }

    /**
     * Helper to complete a sale
     */
    protected function createSampleSale(float $qty = 2.0, float $cashAmount = 400.00): Sale
    {
        $unitPrice = (float) $this->variant->selling_price;

        return $this->salesService->completeSale($this->company->id, [
            'pos_session_id' => $this->session->id,
            'pos_terminal_id' => $this->session->pos_terminal_id,
            'branch_id' => $this->session->branch_id,
            'warehouse_id' => $this->session->warehouse_id,
            'cashier_id' => $this->cashier->id,
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => $qty,
                    'unit_price' => $unitPrice,
                ]
            ],
            'payments' => [
                [
                    'method' => 'CASH',
                    'amount' => $cashAmount,
                ]
            ],
            'notes' => 'Counter sale test',
        ]);
    }

    public function test_get_sale_receipt_returns_authoritative_dto_and_metadata(): void
    {
        $sale = $this->createSampleSale(2.0, 450.00);

        $response = $this->actingAs($this->cashier)
            ->withHeaders(['X-Company-ID' => $this->company->id])
            ->getJson("/api/v1/sales/{$sale->id}/receipt");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.receipt_type', 'SALE')
            ->assertJsonPath('data.sale_id', $sale->id)
            ->assertJsonPath('data.invoice_number', $sale->invoice_number)
            ->assertJsonPath('data.company.name', 'RetailCore Superstore Ltd')
            ->assertJsonPath('data.branch.name', 'Gulshan Flagship Branch')
            ->assertJsonPath('data.terminal.code', 'POS-GUL-01')
            ->assertJsonPath('data.shift.session_number', $this->session->session_number)
            ->assertJsonPath('data.cashier.name', 'Anwar Cashier')
            ->assertJsonPath('data.customer.name', 'Nusrat Jahan')
            ->assertJsonPath('data.customer.code', 'CUST-0001')
            ->assertJsonPath('data.total_quantity', 2)
            ->assertJsonPath('data.is_reprint', false)
            ->assertJsonPath('data.reprint_count', 0);

        $data = $response->json('data');
        $this->assertCount(1, $data['items']);
        $this->assertEquals('Organic Orange Juice 1L', $data['items'][0]['name']);
        $this->assertEquals('SKU-ORG-JUICE-1L', $data['items'][0]['sku']);
        $this->assertEquals(2.0, $data['items'][0]['quantity']);
        $this->assertEquals(200.0, $data['items'][0]['unit_price']);

        // In stored ledger payments, cash allocated matches grand total = 400.00. Change = 0.00
        $this->assertEquals(400.0, $data['grand_total']);
        $this->assertEquals(0.0, $data['change_amount']);
    }

    public function test_sale_receipt_reprint_records_audit_log_and_increments_reprint_count(): void
    {
        $sale = $this->createSampleSale();

        // 1st reprint
        $resp1 = $this->actingAs($this->cashier)
            ->withHeaders(['X-Company-ID' => $this->company->id])
            ->postJson("/api/v1/sales/{$sale->id}/receipt/reprint", [
                'reason' => 'Customer paper jam reprint',
            ]);

        $resp1->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.is_reprint', true)
            ->assertJsonPath('data.reprint_count', 1);

        // Verify AuditLog
        $log1 = AuditLog::where('company_id', $this->company->id)
            ->where('auditable_type', Sale::class)
            ->where('auditable_id', $sale->id)
            ->where('event', 'RECEIPT_REPRINTED')
            ->first();

        $this->assertNotNull($log1);
        $this->assertEquals($this->cashier->id, $log1->user_id);
        $this->assertEquals('Customer paper jam reprint', $log1->new_values['reason']);
        $this->assertEquals($sale->invoice_number, $log1->new_values['invoice_number']);

        // 2nd reprint
        $resp2 = $this->actingAs($this->cashier)
            ->withHeaders(['X-Company-ID' => $this->company->id])
            ->postJson("/api/v1/sales/{$sale->id}/receipt/reprint", [
                'reason' => 'Duplicate copy requested for accounting',
            ]);

        $resp2->assertStatus(200)
            ->assertJsonPath('data.is_reprint', true)
            ->assertJsonPath('data.reprint_count', 2);

        $logCount = AuditLog::where('company_id', $this->company->id)
            ->where('auditable_type', Sale::class)
            ->where('auditable_id', $sale->id)
            ->where('event', 'RECEIPT_REPRINTED')
            ->count();
        $this->assertEquals(2, $logCount);
    }

    public function test_sale_receipt_reprint_preserves_financial_and_inventory_invariance(): void
    {
        $sale = $this->createSampleSale();

        // Baseline financial & inventory values
        $initialGrandTotal = (float) $sale->grand_total;
        $initialPaid = (float) $sale->paid_amount;
        $initialDue = (float) $sale->due_amount;
        $initialStock = (float) \App\Models\Inventory::where('company_id', $this->company->id)
            ->where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant->id)
            ->value('quantity');
        $initialCustomerPoints = (float) $this->customer->fresh()->points_balance;

        // Perform multiple reprints
        for ($i = 0; $i < 3; $i++) {
            $this->actingAs($this->cashier)
                ->withHeaders(['X-Company-ID' => $this->company->id])
                ->postJson("/api/v1/sales/{$sale->id}/receipt/reprint", [
                    'reason' => "Reprint attempt #{$i}",
                ])
                ->assertStatus(200);
        }

        // Fresh instances
        $freshSale = $sale->fresh();
        $freshStock = (float) \App\Models\Inventory::where('company_id', $this->company->id)
            ->where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant->id)
            ->value('quantity');
        $freshCustomerPoints = (float) $this->customer->fresh()->points_balance;

        // Verify Strict Invariance
        $this->assertEquals($initialGrandTotal, (float) $freshSale->grand_total);
        $this->assertEquals($initialPaid, (float) $freshSale->paid_amount);
        $this->assertEquals($initialDue, (float) $freshSale->due_amount);
        $this->assertEquals($initialStock, $freshStock);
        $this->assertEquals($initialCustomerPoints, $freshCustomerPoints);

        // Accounting trial balance invariance: total debits == total credits
        $trialBalance = DB::table('journal_entry_lines')
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->where('journal_entries.company_id', $this->company->id)
            ->selectRaw('SUM(debit) as total_debit, SUM(credit) as total_credit')
            ->first();

        $this->assertNotNull($trialBalance);
        $this->assertEquals(
            round((float) $trialBalance->total_debit, 2),
            round((float) $trialBalance->total_credit, 2),
            'Trial balance must remain in equilibrium'
        );
    }

    public function test_get_return_receipt_returns_authoritative_refund_data(): void
    {
        $sale = $this->createSampleSale();

        // Create a sales return for 1 unit
        $saleItem = $sale->items->first();
        $return = $this->salesReturnService->processReturn($this->company->id, [
            'original_sale_id' => $sale->id,
            'pos_session_id' => $this->session->id,
            'pos_terminal_id' => $this->terminal->id,
            'return_type' => 'REFUND',
            'reason' => 'Customer requested flavor change',
            'items' => [
                [
                    'original_sale_item_id' => $saleItem->id,
                    'return_quantity' => 1,
                    'condition' => 'RESELLABLE',
                    'inventory_action' => 'RESTORE',
                ]
            ],
            'refund_methods' => [
                [
                    'method' => 'CASH',
                    'amount' => 100.00,
                ],
                [
                    'method' => 'STORE_CREDIT',
                    'amount' => 100.00,
                ]
            ],
            'processed_by' => $this->cashier->id,
        ]);

        $response = $this->actingAs($this->cashier)
            ->withHeaders(['X-Company-ID' => $this->company->id])
            ->getJson("/api/v1/sales-returns/{$return->id}/receipt");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.receipt_type', 'SALES_RETURN')
            ->assertJsonPath('data.return_id', $return->id)
            ->assertJsonPath('data.return_number', $return->return_number)
            ->assertJsonPath('data.original_invoice_number', $sale->invoice_number)
            ->assertJsonPath('data.company.name', 'RetailCore Superstore Ltd')
            ->assertJsonPath('data.branch.name', 'Gulshan Flagship Branch')
            ->assertJsonPath('data.total_quantity', 1)
            ->assertJsonPath('data.refund_total', 200)
            ->assertJsonPath('data.cash_refund_amount', 100)
            ->assertJsonPath('data.customer_credit_amount', 100)
            ->assertJsonPath('data.is_reprint', false);

        $data = $response->json('data');
        $this->assertCount(1, $data['items']);
        $this->assertEquals(1.0, $data['items'][0]['return_quantity']);
        $this->assertEquals(200.0, $data['items'][0]['unit_price']);
    }

    public function test_return_receipt_reprint_records_audit_log_without_side_effects(): void
    {
        $sale = $this->createSampleSale();
        $saleItem = $sale->items->first();
        $return = $this->salesReturnService->processReturn($this->company->id, [
            'original_sale_id' => $sale->id,
            'pos_session_id' => $this->session->id,
            'pos_terminal_id' => $this->terminal->id,
            'return_type' => 'REFUND',
            'reason' => 'Defective cap',
            'items' => [
                [
                    'original_sale_item_id' => $saleItem->id,
                    'return_quantity' => 1,
                    'condition' => 'RESELLABLE',
                    'inventory_action' => 'RESTORE',
                ]
            ],
            'refund_methods' => [
                [
                    'method' => 'CASH',
                    'amount' => 200.00,
                ]
            ],
            'processed_by' => $this->cashier->id,
        ]);

        $resp = $this->actingAs($this->cashier)
            ->withHeaders(['X-Company-ID' => $this->company->id])
            ->postJson("/api/v1/sales-returns/{$return->id}/receipt/reprint", [
                'reason' => 'Customer lost return voucher slip',
            ]);

        $resp->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.is_reprint', true)
            ->assertJsonPath('data.reprint_count', 1);

        $log = AuditLog::where('company_id', $this->company->id)
            ->where('auditable_type', \App\Models\SalesReturn::class)
            ->where('auditable_id', $return->id)
            ->where('event', 'RECEIPT_REPRINTED')
            ->first();

        $this->assertNotNull($log);
        $this->assertEquals('Customer lost return voucher slip', $log->new_values['reason']);
        $this->assertEquals($return->return_number, $log->new_values['return_number']);
    }

    public function test_tenant_isolation_cross_company_receipt_returns_404(): void
    {
        $sale = $this->createSampleSale();

        // Allow cashier to access otherCompany so auth middleware allows it through,
        // but the record query inside ReceiptService scopes to otherCompany and returns 404
        $this->cashier->companies()->syncWithoutDetaching([$this->otherCompany->id]);

        // Query using a different company header
        $response = $this->actingAs($this->cashier)
            ->withHeaders(['X-Company-ID' => $this->otherCompany->id])
            ->getJson("/api/v1/sales/{$sale->id}/receipt");

        $response->assertStatus(404);

        // Reprint on different company header
        $reprintResp = $this->actingAs($this->cashier)
            ->withHeaders(['X-Company-ID' => $this->otherCompany->id])
            ->postJson("/api/v1/sales/{$sale->id}/receipt/reprint", [
                'reason' => 'Cross-tenant probe',
            ]);

        $reprintResp->assertStatus(404);
    }

    public function test_unauthenticated_and_unauthorized_receipt_access(): void
    {
        $sale = $this->createSampleSale();

        // 1. Unauthenticated request -> 401
        $this->getJson("/api/v1/sales/{$sale->id}/receipt")
            ->assertStatus(401);

        // 2. User without permissions -> 403
        $this->actingAs($this->unauthorizedUser)
            ->withHeaders(['X-Company-ID' => $this->company->id])
            ->getJson("/api/v1/sales/{$sale->id}/receipt")
            ->assertStatus(403);

        $this->actingAs($this->unauthorizedUser)
            ->withHeaders(['X-Company-ID' => $this->company->id])
            ->postJson("/api/v1/sales/{$sale->id}/receipt/reprint", ['reason' => 'Forbidden'])
            ->assertStatus(403);
    }
}
