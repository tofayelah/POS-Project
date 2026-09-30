<?php

namespace Tests\Feature\Pos;

use App\Models\Account;
use App\Models\AccountGroup;
use App\Models\AccountingPeriod;
use App\Models\Branch;
use App\Models\BusinessUnit;
use App\Models\Category;
use App\Models\Company;
use App\Models\Customer;
use App\Models\CustomerLedger;
use App\Models\CustomerPointLedger;
use App\Models\FiscalYear;
use App\Models\JournalEntry;
use App\Models\LoyaltySetting;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\PaymentMethod;
use App\Models\PosSession;
use App\Models\PosTerminal;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\AccountMappingService;
use App\Services\AccountingService;
use App\Services\InventoryAccountingService;
use App\Services\InventoryService;
use App\Services\LoyaltyService;
use App\Services\PaymentService;
use App\Services\SalesService;
use Exception;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Tests\TestCase;

class LoyaltyAndPaymentTest extends TestCase
{
    use RefreshDatabase;

    protected Company $company;
    protected User $user;
    protected BusinessUnit $businessUnit;
    protected Branch $branch;
    protected Warehouse $warehouse;
    protected PosTerminal $terminal;
    protected PosSession $session;
    protected Product $product;
    protected ProductVariant $variant;
    protected Customer $customer;

    protected FiscalYear $fiscalYear;
    protected AccountingPeriod $accountingPeriod;

    protected Account $arAccount;
    protected Account $salesRevenueAccount;
    protected Account $vatPayableAccount;
    protected Account $cogsAccount;
    protected Account $inventoryAssetAccount;
    protected Account $cashBankAccount;
    protected Account $apAccount;
    protected Account $loyaltyExpenseAccount;

    protected AccountMappingService $mappingService;
    protected AccountingService $accountingService;
    protected InventoryAccountingService $inventoryAccountingService;
    protected InventoryService $inventoryService;
    protected PaymentService $paymentService;
    protected SalesService $salesService;
    protected LoyaltyService $loyaltyService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->mappingService = app(AccountMappingService::class);
        $this->accountingService = app(AccountingService::class);
        $this->inventoryAccountingService = app(InventoryAccountingService::class);
        $this->inventoryService = app(InventoryService::class);
        $this->paymentService = app(PaymentService::class);
        $this->salesService = app(SalesService::class);
        $this->loyaltyService = app(LoyaltyService::class);

        // 1. Organization Setup
        $this->company = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'POS RetailCore Loyalty Corp',
            'code' => 'COMP-' . Str::random(5),
            'country' => 'Bangladesh',
        ]);

        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);

        $this->businessUnit = BusinessUnit::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'name' => 'Retail Division',
            'code' => 'BU-' . Str::random(5),
        ]);

        $this->branch = Branch::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'name' => 'Dhaka Main Store',
            'code' => 'BR-' . Str::random(5),
        ]);

        $this->warehouse = Warehouse::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'branch_id' => $this->branch->id,
            'name' => 'Main Outlet Warehouse',
            'code' => 'WH-' . Str::random(5),
            'is_active' => true,
        ]);

        // 2. POS Terminal & Session Setup
        $this->terminal = PosTerminal::create([
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'branch_id' => $this->branch->id,
            'warehouse_id' => $this->warehouse->id,
            'terminal_code' => 'POS-01',
            'terminal_name' => 'Counter 1 POS',
            'status' => 'ACTIVE',
        ]);

        $this->session = PosSession::create([
            'company_id' => $this->company->id,
            'business_unit_id' => $this->businessUnit->id,
            'branch_id' => $this->branch->id,
            'warehouse_id' => $this->warehouse->id,
            'pos_terminal_id' => $this->terminal->id,
            'cashier_id' => $this->user->id,
            'session_number' => 'SES-' . date('Ymd') . '-001',
            'opening_cash' => 5000.00,
            'status' => 'OPEN',
        ]);

        // 3. Catalog Setup
        $category = Category::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'name' => 'Apparel',
            'code' => 'CAT-' . Str::random(5),
        ]);

        $unit = Unit::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'name' => 'Pieces',
            'short_code' => 'PCS',
        ]);

        $this->product = Product::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'name' => 'Cotton Polo Shirt',
            'code' => 'PROD-' . Str::random(5),
            'status' => 'ACTIVE',
            'tax_rate' => 0.00, // 0% VAT for clean integer totals
        ]);

        $this->variant = ProductVariant::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $this->company->id,
            'product_id' => $this->product->id,
            'sku' => 'SHIRT-BLK-L',
            'variant_name' => 'Black / Large',
            'cost_price' => 300.00,
            'selling_price' => 1000.00,
            'mrp' => 1000.00,
            'tax_rate' => 0.00,
            'status' => 'ACTIVE',
        ]);

        // 4. Customer with initial 500 points
        $this->customer = Customer::create([
            'company_id' => $this->company->id,
            'customer_code' => 'CUST-001',
            'name' => 'Loyal Customer',
            'mobile' => '01711000000',
            'credit_limit' => 10000.00,
            'points_balance' => 500.00,
            'status' => 'ACTIVE',
        ]);

        // 5. Fiscal Year & Period
        $year = date('Y');
        $this->fiscalYear = FiscalYear::create([
            'company_id' => $this->company->id,
            'name' => "FY {$year}",
            'start_date' => "{$year}-01-01",
            'end_date' => "{$year}-12-31",
            'status' => 'OPEN',
            'created_by' => $this->user->id,
        ]);

        $this->accountingPeriod = AccountingPeriod::create([
            'company_id' => $this->company->id,
            'fiscal_year_id' => $this->fiscalYear->id,
            'name' => "Period {$year}-01 to {$year}-12",
            'start_date' => "{$year}-01-01",
            'end_date' => "{$year}-12-31",
            'status' => 'OPEN',
            'created_by' => $this->user->id,
        ]);

        // 6. Chart of Accounts Setup
        $grpAsset = AccountGroup::create([
            'company_id' => $this->company->id,
            'name' => 'Current Assets',
            'code' => '1000',
            'account_type' => 'ASSET',
        ]);

        $grpLiab = AccountGroup::create([
            'company_id' => $this->company->id,
            'name' => 'Current Liabilities',
            'code' => '2000',
            'account_type' => 'LIABILITY',
        ]);

        $grpRev = AccountGroup::create([
            'company_id' => $this->company->id,
            'name' => 'Revenue',
            'code' => '4000',
            'account_type' => 'REVENUE',
        ]);

        $grpExp = AccountGroup::create([
            'company_id' => $this->company->id,
            'name' => 'Operating Expense',
            'code' => '5000',
            'account_type' => 'EXPENSE',
        ]);

        $this->arAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpAsset->id,
            'account_code' => '1200',
            'account_name' => 'Accounts Receivable Control',
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

        $this->vatPayableAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpLiab->id,
            'account_code' => '2020',
            'account_name' => 'VAT Payable Control',
            'account_type' => 'LIABILITY',
            'normal_balance' => 'CREDIT',
            'is_active' => true,
        ]);

        $this->cogsAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpExp->id,
            'account_code' => '5010',
            'account_name' => 'Cost of Goods Sold',
            'account_type' => 'EXPENSE',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->inventoryAssetAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpAsset->id,
            'account_code' => '1500',
            'account_name' => 'Merchandise Inventory Asset',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->cashBankAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpAsset->id,
            'account_code' => '1010',
            'account_name' => 'Cash in Drawer / Bank Account',
            'account_type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        $this->apAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpLiab->id,
            'account_code' => '2010',
            'account_name' => 'Accounts Payable',
            'account_type' => 'LIABILITY',
            'normal_balance' => 'CREDIT',
            'is_active' => true,
        ]);

        $this->loyaltyExpenseAccount = Account::create([
            'company_id' => $this->company->id,
            'account_group_id' => $grpExp->id,
            'account_code' => '5020',
            'account_name' => 'Loyalty Rewards Expense',
            'account_type' => 'EXPENSE',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);

        // 7. Map Accounting Roles
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_ACCOUNTS_RECEIVABLE, $this->arAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_SALES_REVENUE, $this->salesRevenueAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_VAT_PAYABLE, $this->vatPayableAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_COGS, $this->cogsAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_INVENTORY_ASSET, $this->inventoryAssetAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_CASH_BANK, $this->cashBankAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_ACCOUNTS_PAYABLE, $this->apAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_AP_CLEARING, $this->apAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_INVENTORY_ADJUSTMENT, $this->cogsAccount->id);
        $this->mappingService->setMapping($this->company->id, AccountMappingService::ROLE_LOYALTY_EXPENSE, $this->loyaltyExpenseAccount->id);

        // 8. Seed Inventory (100 units @ 300.00 cost)
        $this->inventoryService->stockIn(
            $this->company->id,
            $this->warehouse->id,
            $this->variant->id,
            100,
            300.00,
            'OPENING_STOCK',
            1,
            'INIT-STOCK-001',
            'Opening stock for test',
            null,
            $this->user->id
        );

        // 9. Loyalty Settings
        $this->loyaltyService->getSettings($this->company->id);
    }

    /**
     * Test: Multi-payment tender combining Point Redemption (৳400) + Cash (৳500) + bKash (৳100) = ৳1,000.
     * Verifies:
     * - Grand Total matches exact payment sum (tolerance <= 0.0001)
     * - Due amount = 0, status = PAID
     * - Points redeemed: 400 points deducted from customer balance (500 -> 100)
     * - Point earning = 0 (because point redemption was used)
     * - Accounting: Point payment posts DR Loyalty Expense, CR AR. Cash/MFS posts DR Cash/Bank, CR AR.
     */
    public function test_multi_payment_with_point_redemption_and_exact_total()
    {
        $this->mappingService->setAccountingEnabled($this->company->id, true);

        // Grand Total: 1000
        $payload = [
            'pos_session_id' => $this->session->id,
            'cashier_id' => $this->user->id,
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 1,
                    'unit_price' => 1000.00,
                ],
            ],
            'payments' => [
                ['method' => 'POINT_REDEMPTION', 'amount' => 400.00],
                ['method' => 'CASH', 'amount' => 500.00],
                ['method' => 'BKASH', 'amount' => 100.00, 'transaction_ref' => 'TRX-BKASH-01'],
            ],
        ];

        $sale = $this->salesService->completeSale($this->company->id, $payload);

        $this->assertEquals(1000.00, (float) $sale->grand_total);
        $this->assertEquals(1000.00, (float) $sale->paid_amount);
        $this->assertEquals(0.00, (float) $sale->due_amount);
        $this->assertEquals('PAID', $sale->payment_status);

        // Check customer points balance: 500 - 400 = 100 (earned 0 because redemption used)
        $customer = $this->customer->fresh();
        $this->assertEquals(100.00, (float) $customer->points_balance);

        // Verify CustomerPointLedger REDEEM entry
        $pointLedger = CustomerPointLedger::where('customer_id', $this->customer->id)
            ->where('sale_id', $sale->id)
            ->first();
        $this->assertNotNull($pointLedger);
        $this->assertEquals('REDEEM', $pointLedger->transaction_type);
        $this->assertEquals(-400.00, (float) $pointLedger->points);
        $this->assertEquals(500.00, (float) $pointLedger->balance_before);
        $this->assertEquals(100.00, (float) $pointLedger->balance_after);

        // Verify Authoritative Payments created: 3 payments
        $payments = Payment::where('company_id', $this->company->id)->orderBy('id')->get();
        $this->assertCount(3, $payments);
        $this->assertEquals('POINT_REDEMPTION', $payments[0]->payment_method);
        $this->assertEquals(400.00, (float) $payments[0]->amount);
        $this->assertEquals('CASH', $payments[1]->payment_method);
        $this->assertEquals(500.00, (float) $payments[1]->amount);
        $this->assertEquals('BKASH', $payments[2]->payment_method);
        $this->assertEquals(100.00, (float) $payments[2]->amount);

        // Verify Point Payment Journal Entry: DR Loyalty Expense, CR AR
        $pointJournal = JournalEntry::with('lines')
            ->where('company_id', $this->company->id)
            ->where('reference_type', 'Payment')
            ->where('reference_id', $payments[0]->id)
            ->first();
        $this->assertNotNull($pointJournal);
        $drLine = $pointJournal->lines->firstWhere('debit', '>', 0);
        $crLine = $pointJournal->lines->firstWhere('credit', '>', 0);
        $this->assertEquals($this->loyaltyExpenseAccount->id, $drLine->account_id);
        $this->assertEquals(400.00, (float) $drLine->debit);
        $this->assertEquals($this->arAccount->id, $crLine->account_id);
        $this->assertEquals(400.00, (float) $crLine->credit);

        // Verify Cash Payment Journal Entry: DR Cash/Bank, CR AR
        $cashJournal = JournalEntry::with('lines')
            ->where('company_id', $this->company->id)
            ->where('reference_type', 'Payment')
            ->where('reference_id', $payments[1]->id)
            ->first();
        $this->assertNotNull($cashJournal);
        $cashDr = $cashJournal->lines->firstWhere('debit', '>', 0);
        $this->assertEquals($this->cashBankAccount->id, $cashDr->account_id);
        $this->assertEquals(500.00, (float) $cashDr->debit);
    }

    /**
     * Test: Overpayment in split payments is strictly rejected (no silent truncation).
     */
    public function test_overpayment_in_split_payment_is_rejected()
    {
        $payload = [
            'pos_session_id' => $this->session->id,
            'cashier_id' => $this->user->id,
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 1,
                    'unit_price' => 1000.00,
                ],
            ],
            'payments' => [
                ['method' => 'POINT_REDEMPTION', 'amount' => 400.00],
                ['method' => 'CASH', 'amount' => 500.00],
                ['method' => 'BKASH', 'amount' => 300.00], // Total = 1200 > 1000
            ],
        ];

        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage('exceeds grand total');

        $this->salesService->completeSale($this->company->id, $payload);
    }

    /**
     * Test: Points Earning - 1 Point per ৳100 eligible purchase when no discount or redemption.
     */
    public function test_points_earning_when_no_discount_or_redemption()
    {
        $customer = Customer::create([
            'company_id' => $this->company->id,
            'customer_code' => 'CUST-002',
            'name' => 'New Customer',
            'points_balance' => 0.00,
            'status' => 'ACTIVE',
        ]);

        // Purchase: 2 units @ 1000 = 2000 subtotal. Should earn 2000 / 100 = 20 points
        $payload = [
            'pos_session_id' => $this->session->id,
            'cashier_id' => $this->user->id,
            'customer_id' => $customer->id,
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 2,
                    'unit_price' => 1000.00,
                ],
            ],
            'payments' => [
                ['method' => 'CASH', 'amount' => 2000.00],
            ],
        ];

        $sale = $this->salesService->completeSale($this->company->id, $payload);

        $customer = $customer->fresh();
        $this->assertEquals(20.00, (float) $customer->points_balance);

        $pointLedger = CustomerPointLedger::where('customer_id', $customer->id)->first();
        $this->assertNotNull($pointLedger);
        $this->assertEquals('EARN', $pointLedger->transaction_type);
        $this->assertEquals(20.00, (float) $pointLedger->points);
        $this->assertEquals(0.00, (float) $pointLedger->balance_before);
        $this->assertEquals(20.00, (float) $pointLedger->balance_after);
    }

    /**
     * Test: Discount rule - if any discount is applied, earned points = 0.
     */
    public function test_discount_applied_results_in_zero_points_earned()
    {
        $customer = Customer::create([
            'company_id' => $this->company->id,
            'customer_code' => 'CUST-003',
            'name' => 'Discount Customer',
            'points_balance' => 0.00,
            'status' => 'ACTIVE',
        ]);

        // 1 unit @ 1000, discount = 100, grand total = 900
        $payload = [
            'pos_session_id' => $this->session->id,
            'cashier_id' => $this->user->id,
            'customer_id' => $customer->id,
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 1,
                    'unit_price' => 1000.00,
                    'discount' => 100.00,
                ],
            ],
            'payments' => [
                ['method' => 'CASH', 'amount' => 900.00],
            ],
        ];

        $this->salesService->completeSale($this->company->id, $payload);

        $customer = $customer->fresh();
        $this->assertEquals(0.00, (float) $customer->points_balance);

        $pointLedgersCount = CustomerPointLedger::where('customer_id', $customer->id)->count();
        $this->assertEquals(0, $pointLedgersCount);
    }

    /**
     * Test: Mutual exclusivity - Discount and Point Redemption cannot be used together.
     */
    public function test_discount_and_point_redemption_cannot_be_used_together()
    {
        $payload = [
            'pos_session_id' => $this->session->id,
            'cashier_id' => $this->user->id,
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 1,
                    'unit_price' => 1000.00,
                    'discount' => 50.00, // Discount applied
                ],
            ],
            'payments' => [
                ['method' => 'POINT_REDEMPTION', 'amount' => 400.00],
                ['method' => 'CASH', 'amount' => 550.00],
            ],
        ];

        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage('Discounts and loyalty point redemption cannot be combined');

        $this->salesService->completeSale($this->company->id, $payload);
    }

    /**
     * Test: Minimum Point Redemption = 400 points. Customer with < 400 points is blocked.
     */
    public function test_customer_with_less_than_400_points_cannot_redeem()
    {
        $customer = Customer::create([
            'company_id' => $this->company->id,
            'customer_code' => 'CUST-LOW',
            'name' => 'Low Points Customer',
            'points_balance' => 350.00, // < 400
            'status' => 'ACTIVE',
        ]);

        $payload = [
            'pos_session_id' => $this->session->id,
            'cashier_id' => $this->user->id,
            'customer_id' => $customer->id,
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 1,
                    'unit_price' => 1000.00,
                ],
            ],
            'payments' => [
                ['method' => 'POINT_REDEMPTION', 'amount' => 350.00],
                ['method' => 'CASH', 'amount' => 650.00],
            ],
        ];

        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage('A minimum balance of 400 points is required to redeem');

        $this->salesService->completeSale($this->company->id, $payload);
    }

    /**
     * Test: Attempting to redeem less than 400 points even if customer has >= 400 points is blocked.
     */
    public function test_redeeming_less_than_400_points_is_blocked()
    {
        // Customer has 500 points, tries to redeem only 200
        $payload = [
            'pos_session_id' => $this->session->id,
            'cashier_id' => $this->user->id,
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 1,
                    'unit_price' => 1000.00,
                ],
            ],
            'payments' => [
                ['method' => 'POINT_REDEMPTION', 'amount' => 200.00],
                ['method' => 'CASH', 'amount' => 800.00],
            ],
        ];

        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage('Minimum redemption is 400 points');

        $this->salesService->completeSale($this->company->id, $payload);
    }

    /**
     * Test: Attempting to redeem more than available balance is blocked.
     */
    public function test_redeeming_more_than_available_balance_is_blocked()
    {
        // Customer has 500 points, tries to redeem 600
        $payload = [
            'pos_session_id' => $this->session->id,
            'cashier_id' => $this->user->id,
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 1,
                    'unit_price' => 1000.00,
                ],
            ],
            'payments' => [
                ['method' => 'POINT_REDEMPTION', 'amount' => 600.00],
                ['method' => 'CASH', 'amount' => 400.00],
            ],
        ];

        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage('exceed available balance');

        $this->salesService->completeSale($this->company->id, $payload);
    }

    /**
     * Test: Walk-in customer cannot redeem loyalty points.
     */
    public function test_walk_in_customer_cannot_redeem_points()
    {
        $payload = [
            'pos_session_id' => $this->session->id,
            'cashier_id' => $this->user->id,
            'customer_id' => null, // Walk-in
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 1,
                    'unit_price' => 1000.00,
                ],
            ],
            'payments' => [
                ['method' => 'POINT_REDEMPTION', 'amount' => 400.00],
                ['method' => 'CASH', 'amount' => 600.00],
            ],
        ];

        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage('Walk-in customers cannot redeem loyalty points');

        $this->salesService->completeSale($this->company->id, $payload);
    }

    /**
     * Test: Terminal payment methods restriction is enforced.
     */
    public function test_terminal_payment_method_restriction()
    {
        // Create payment methods and assign only CASH to terminal
        $cashPm = PaymentMethod::create([
            'company_id' => $this->company->id,
            'name' => 'Cash Only',
            'code' => 'CASH',
            'type' => 'CASH',
            'is_active' => true,
        ]);
        $cardPm = PaymentMethod::create([
            'company_id' => $this->company->id,
            'name' => 'Card Payment',
            'code' => 'CARD',
            'type' => 'CARD',
            'is_active' => true,
        ]);

        $this->terminal->paymentMethods()->sync([
            $cashPm->id => ['is_enabled' => true],
            $cardPm->id => ['is_enabled' => false], // Card is disabled on terminal
        ]);

        // Attempting to pay with CARD on this terminal should fail
        $payload = [
            'pos_session_id' => $this->session->id,
            'cashier_id' => $this->user->id,
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 1,
                    'unit_price' => 1000.00,
                ],
            ],
            'payments' => [
                ['method' => 'CARD', 'amount' => 1000.00],
            ],
        ];

        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage("Payment method 'CARD' is not enabled for this POS terminal");

        $this->salesService->completeSale($this->company->id, $payload);
    }
}
