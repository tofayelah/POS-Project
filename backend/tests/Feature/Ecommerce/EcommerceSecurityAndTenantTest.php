<?php

namespace Tests\Feature\Ecommerce;

use App\Models\Category;
use App\Models\Company;
use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\EcommerceStore;
use App\Models\OnlinePaymentTransaction;
use App\Models\Product;
use App\Models\Role;
use App\Models\Sale;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use Database\Seeders\EcommercePermissionsSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\TaxPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EcommerceSecurityAndTenantTest extends TestCase
{
    use RefreshDatabase;

    protected Company $companyA;
    protected Company $companyB;
    protected User $adminA;
    protected User $staffWithoutPerms;
    protected User $customerUserA;
    protected User $customerUserB;
    protected Customer $customerA;
    protected Customer $customerB;
    protected EcommerceStore $storeA;
    protected EcommerceStore $storeB;
    protected Product $productA;
    protected Product $productB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $this->seed(EcommercePermissionsSeeder::class);
        $this->seed(TaxPermissionsSeeder::class);

        // Setup Company A
        $this->companyA = Company::factory()->create();
        $warehouseA = Warehouse::create([
            'company_id' => $this->companyA->id,
            'name' => 'Hub A',
            'code' => 'HA-01',
            'status' => 'active',
        ]);
        $this->storeA = EcommerceStore::create([
            'company_id' => $this->companyA->id,
            'code' => 'STORE-A',
            'name' => 'Store A',
            'default_warehouse_id' => $warehouseA->id,
            'currency' => 'BDT',
            'is_active' => true,
        ]);

        $unitA = Unit::create(['company_id' => $this->companyA->id, 'name' => 'Pcs', 'short_code' => 'PC']);
        $catA = Category::create(['company_id' => $this->companyA->id, 'name' => 'Electronics', 'code' => 'ELEC']);
        $this->productA = Product::create([
            'company_id' => $this->companyA->id,
            'category_id' => $catA->id,
            'unit_id' => $unitA->id,
            'name' => 'Product Alpha',
            'slug' => 'product-alpha',
            'status' => 'active',
            'is_published' => true,
            'visibility' => 'BOTH',
        ]);

        // Setup Company B
        $this->companyB = Company::factory()->create();
        $warehouseB = Warehouse::create([
            'company_id' => $this->companyB->id,
            'name' => 'Hub B',
            'code' => 'HB-01',
            'status' => 'active',
        ]);
        $this->storeB = EcommerceStore::create([
            'company_id' => $this->companyB->id,
            'code' => 'STORE-B',
            'name' => 'Store B',
            'default_warehouse_id' => $warehouseB->id,
            'currency' => 'BDT',
            'is_active' => true,
        ]);

        $unitB = Unit::create(['company_id' => $this->companyB->id, 'name' => 'Pcs', 'short_code' => 'PC']);
        $catB = Category::create(['company_id' => $this->companyB->id, 'name' => 'Apparel', 'code' => 'APP']);
        $this->productB = Product::create([
            'company_id' => $this->companyB->id,
            'category_id' => $catB->id,
            'unit_id' => $unitB->id,
            'name' => 'Product Beta',
            'slug' => 'product-beta',
            'status' => 'active',
            'is_published' => true,
            'visibility' => 'BOTH',
        ]);

        // Setup Users
        $this->adminA = User::factory()->create();
        $this->adminA->companies()->attach($this->companyA->id);
        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin']);
        $this->adminA->roles()->attach($superAdmin->id);

        $this->staffWithoutPerms = User::factory()->create();
        $this->staffWithoutPerms->companies()->attach($this->companyA->id);
        $cashierRole = Role::firstOrCreate(['name' => 'Cashier']);
        $this->staffWithoutPerms->roles()->attach($cashierRole->id);

        // Setup Customers
        $this->customerUserA = User::factory()->create();
        $this->customerUserA->companies()->attach($this->companyA->id);
        $this->customerA = Customer::create([
            'company_id' => $this->companyA->id,
            'user_id' => $this->customerUserA->id,
            'customer_code' => 'CA-001',
            'name' => 'Customer A',
            'email' => $this->customerUserA->email,
            'mobile' => '+8801700000001',
            'status' => 'ACTIVE',
        ]);

        $this->customerUserB = User::factory()->create();
        $this->customerUserB->companies()->attach($this->companyA->id);
        $this->customerB = Customer::create([
            'company_id' => $this->companyA->id,
            'user_id' => $this->customerUserB->id,
            'customer_code' => 'CB-002',
            'name' => 'Customer B',
            'email' => $this->customerUserB->email,
            'mobile' => '+8801700000002',
            'status' => 'ACTIVE',
        ]);
    }

    public function test_tenant_isolation_storefront_cannot_access_foreign_products(): void
    {
        // Storefront A should only list Product Alpha, NOT Product Beta
        $response = $this->getJson("/api/v1/store/{$this->storeA->id}/products");
        $response->assertStatus(200);
        $response->assertJsonFragment(['name' => 'Product Alpha']);
        $response->assertJsonMissing(['name' => 'Product Beta']);

        // Querying Product Beta on Storefront A returns 404
        $detailResponse = $this->getJson("/api/v1/store/{$this->storeA->id}/products/product-beta");
        $detailResponse->assertStatus(404);
    }

    public function test_tenant_isolation_admin_cannot_access_or_modify_foreign_orders(): void
    {
        // Create an order for Company B
        $saleB = Sale::create([
            'company_id' => $this->companyB->id,
            'invoice_number' => 'INV-B-001',
            'order_number' => 'ORD-B-001',
            'channel' => 'ECOMMERCE',
            'status' => 'COMPLETED',
            'payment_status' => 'PAID',
            'fulfillment_status' => 'UNFULFILLED',
            'subtotal' => 500,
            'grand_total' => 500,
            'paid_amount' => 500,
            'due_amount' => 0,
            'sale_date' => now()->toDateString(),
        ]);

        // Admin A tries to access Order B
        $response = $this->actingAs($this->adminA)->withHeaders([
            'X-Company-ID' => (string)$this->companyA->id,
        ])->getJson("/api/v1/ecommerce/orders/{$saleB->id}");

        $response->assertStatus(404);
    }

    public function test_customer_security_boundary_cross_customer_order_access_forbidden(): void
    {
        // Create an order for Customer B
        $saleB = Sale::create([
            'company_id' => $this->companyA->id,
            'customer_id' => $this->customerB->id,
            'invoice_number' => 'INV-A-002',
            'order_number' => 'ORD-A-002',
            'channel' => 'ECOMMERCE',
            'status' => 'COMPLETED',
            'payment_status' => 'PAID',
            'fulfillment_status' => 'UNFULFILLED',
            'subtotal' => 800,
            'grand_total' => 800,
            'paid_amount' => 800,
            'due_amount' => 0,
            'sale_date' => now()->toDateString(),
        ]);

        // Customer A attempts to view Customer B's order
        $response = $this->actingAs($this->customerUserA)->getJson("/api/v1/customer/orders/{$saleB->id}");

        // Customer A cannot access Customer B's order (404 scoped to customer)
        $response->assertStatus(404);
    }

    public function test_customer_security_boundary_cross_customer_address_manipulation_forbidden(): void
    {
        $addressB = CustomerAddress::create([
            'customer_id' => $this->customerB->id,
            'recipient_name' => 'Customer B',
            'mobile' => '+8801700000002',
            'address_line_1' => 'Banani Road 11',
            'city' => 'Dhaka',
            'is_default_shipping' => true,
        ]);

        // Customer A attempts to delete Customer B's address
        $response = $this->actingAs($this->customerUserA)->deleteJson("/api/v1/customer/addresses/{$addressB->id}");

        $response->assertStatus(404);
    }

    public function test_rbac_enforcement_unauthorized_staff_receives_403_on_ecommerce_admin(): void
    {
        $response = $this->actingAs($this->staffWithoutPerms)->withHeaders([
            'X-Company-ID' => (string)$this->companyA->id,
        ])->getJson('/api/v1/ecommerce/store');

        $response->assertStatus(403);
    }

    public function test_payment_webhook_idempotency_prevents_duplicate_transactions(): void
    {
        // Create an online order
        $sale = Sale::create([
            'company_id' => $this->companyA->id,
            'customer_id' => $this->customerA->id,
            'invoice_number' => 'INV-A-PAY-01',
            'order_number' => 'ORD-A-PAY-01',
            'channel' => 'ECOMMERCE',
            'status' => 'COMPLETED',
            'payment_status' => 'DUE',
            'fulfillment_status' => 'UNFULFILLED',
            'subtotal' => 1000,
            'grand_total' => 1000,
            'paid_amount' => 0,
            'due_amount' => 1000,
            'sale_date' => now()->toDateString(),
        ]);

        $onlineTx = OnlinePaymentTransaction::create([
            'company_id' => $this->companyA->id,
            'store_id' => $this->storeA->id,
            'sale_id' => $sale->id,
            'gateway' => 'BKASH',
            'transaction_reference' => 'TXN-BKASH-UNIQUE-999',
            'amount' => 1000.00,
            'currency' => 'BDT',
            'status' => 'PENDING',
        ]);

        $payload = [
            'transaction_reference' => 'TXN-BKASH-UNIQUE-999',
            'status' => 'SUCCESS',
            'amount' => 1000.00,
            'currency' => 'BDT',
            'metadata' => ['sender' => '01811111111'],
        ];

        // 1st Webhook Call
        $response1 = $this->withHeaders([
            'X-Company-ID' => (string)$this->companyA->id,
        ])->postJson('/api/v1/payments/webhook/bkash', $payload);

        $response1->assertStatus(200);
        $response1->assertJson(['status' => 'processed']);

        $this->assertEquals(1, OnlinePaymentTransaction::where('transaction_reference', 'TXN-BKASH-UNIQUE-999')->count());
        $this->assertEquals('SUCCESS', $onlineTx->fresh()->status);
        $this->assertEquals('PAID', $sale->fresh()->payment_status);

        // 2nd Webhook Call (Identical payload - idempotency)
        $response2 = $this->withHeaders([
            'X-Company-ID' => (string)$this->companyA->id,
        ])->postJson('/api/v1/payments/webhook/bkash', $payload);

        $response2->assertStatus(200);
        $response2->assertJson(['status' => 'processed']);

        // Exactly one transaction record exists, no duplicates
        $this->assertEquals(1, OnlinePaymentTransaction::where('transaction_reference', 'TXN-BKASH-UNIQUE-999')->count());
    }
}
