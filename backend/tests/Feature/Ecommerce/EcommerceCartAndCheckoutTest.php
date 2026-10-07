<?php

namespace Tests\Feature\Ecommerce;

use App\Models\Category;
use App\Models\Company;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\EcommerceCart;
use App\Models\EcommerceStore;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\Sale;
use App\Models\ShippingMethod;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\InventoryReservationService;
use App\Services\StoreCreditService;
use Carbon\Carbon;
use Database\Seeders\EcommercePermissionsSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\TaxPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EcommerceCartAndCheckoutTest extends TestCase
{
    use RefreshDatabase;

    protected Company $company;
    protected User $user;
    protected Customer $customer;
    protected Warehouse $warehouse;
    protected ProductVariant $variant1;
    protected ProductVariant $variant2;
    protected ShippingMethod $shippingMethod;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $this->seed(EcommercePermissionsSeeder::class);
        $this->seed(TaxPermissionsSeeder::class);

        $this->company = Company::factory()->create();

        $this->warehouse = Warehouse::create([
            'company_id' => $this->company->id,
            'name' => 'Fulfillment Hub',
            'code' => 'FH-01',
            'status' => 'active',
        ]);

        $unit = Unit::create([
            'company_id' => $this->company->id,
            'name' => 'Pieces',
            'short_code' => 'PCS',
        ]);

        $category = Category::create([
            'company_id' => $this->company->id,
            'name' => 'Accessories',
            'code' => 'ACC',
        ]);

        $this->shippingMethod = ShippingMethod::create([
            'company_id' => $this->company->id,
            'name' => 'Standard Delivery',
            'code' => 'STANDARD',
            'carrier_name' => 'Steadfast Courier',
            'estimated_days' => '2-3 Days',
            'is_active' => true,
        ]);

        // Product 1
        $p1 = Product::create([
            'company_id' => $this->company->id,
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'name' => 'Smart Watch Pro',
            'slug' => 'smart-watch-pro',
            'status' => 'active',
            'is_published' => true,
            'visibility' => 'BOTH',
        ]);
        $this->variant1 = ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $p1->id,
            'sku' => 'SW-PRO-01',
            'variant_name' => 'Black',
            'cost_price' => 2000,
            'selling_price' => 3500,
        ]);

        // Product 2
        $p2 = Product::create([
            'company_id' => $this->company->id,
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'name' => 'Wireless Earbuds',
            'slug' => 'wireless-earbuds',
            'status' => 'active',
            'is_published' => true,
            'visibility' => 'BOTH',
        ]);
        $this->variant2 = ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $p2->id,
            'sku' => 'EAR-01',
            'variant_name' => 'White',
            'cost_price' => 800,
            'selling_price' => 1500,
        ]);

        // Stock in Warehouse
        Inventory::create([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'product_id' => $p1->id,
            'product_variant_id' => $this->variant1->id,
            'quantity' => 10,
            'reserved_quantity' => 0,
            'available_quantity' => 10,
            'average_cost' => 2000,
            'total_value' => 20000,
        ]);

        Inventory::create([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'product_id' => $p2->id,
            'product_variant_id' => $this->variant2->id,
            'quantity' => 5,
            'reserved_quantity' => 0,
            'available_quantity' => 5,
            'average_cost' => 800,
            'total_value' => 4000,
        ]);

        // Store
        EcommerceStore::create([
            'company_id' => $this->company->id,
            'code' => 'MAIN',
            'name' => 'Main Store',
            'default_warehouse_id' => $this->warehouse->id,
            'currency' => 'BDT',
            'is_active' => true,
            'guest_checkout_enabled' => true,
            'cod_enabled' => true,
            'order_prefix' => 'ORD-',
        ]);

        // Customer & Auth User
        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);

        $this->customer = Customer::create([
            'company_id' => $this->company->id,
            'user_id' => $this->user->id,
            'customer_code' => 'CUST-001',
            'name' => 'Tofayel Ahmed',
            'email' => $this->user->email,
            'mobile' => '+8801711111111',
            'city' => 'Dhaka',
            'status' => 'ACTIVE',
        ]);
    }

    public function test_guest_cart_lifecycle_and_stock_validation(): void
    {
        $guestToken = 'guest-session-12345';

        // 1. Add 2 units of Smart Watch
        $res = $this->withHeader('X-Company-ID', $this->company->id)
            ->withHeader('X-Guest-Token', $guestToken)
            ->postJson('/api/v1/store/MAIN/cart/items', [
                'product_variant_id' => $this->variant1->id,
                'quantity' => 2,
            ]);

        $res->assertStatus(200)
            ->assertJsonPath('items_count', 1)
            ->assertJsonPath('total_units', 2)
            ->assertJsonPath('subtotal', 7000); // 2 * 3500

        // 2. Prevent adding more than available stock
        $overflowRes = $this->withHeader('X-Company-ID', $this->company->id)
            ->withHeader('X-Guest-Token', $guestToken)
            ->postJson('/api/v1/store/MAIN/cart/items', [
                'product_variant_id' => $this->variant1->id,
                'quantity' => 15, // available is only 10
            ]);

        $overflowRes->assertStatus(409); // Conflict / Insufficient stock
    }

    public function test_cart_coupon_application_and_discount(): void
    {
        $guestToken = 'guest-coupon-test';

        // Create Coupon (10% discount, min ৳3000)
        Coupon::create([
            'company_id' => $this->company->id,
            'code' => 'SAVE10',
            'discount_type' => 'PERCENTAGE',
            'discount_value' => 10,
            'min_order_amount' => 3000,
            'is_active' => true,
        ]);

        // Add 1 Smart Watch (৳3500)
        $this->withHeader('X-Company-ID', $this->company->id)
            ->withHeader('X-Guest-Token', $guestToken)
            ->postJson('/api/v1/store/MAIN/cart/items', [
                'product_variant_id' => $this->variant1->id,
                'quantity' => 1,
            ]);

        // Apply coupon
        $couponRes = $this->withHeader('X-Company-ID', $this->company->id)
            ->withHeader('X-Guest-Token', $guestToken)
            ->postJson('/api/v1/store/MAIN/cart/coupon', [
                'code' => 'SAVE10',
            ]);

        $couponRes->assertStatus(200)
            ->assertJsonPath('subtotal', 3500)
            ->assertJsonPath('discount_total', 350); // 10% of 3500
    }

    public function test_atomic_checkout_creates_sale_and_inventory_reservation(): void
    {
        $checkoutData = [
            'payment_method' => 'COD',
            'shipping_method_id' => $this->shippingMethod->id,
            'shipping_address' => [
                'recipient_name' => 'Tofayel Ahmed',
                'mobile' => '+8801711111111',
                'address_line_1' => 'House 12, Road 4, Dhanmondi',
                'city' => 'Dhaka',
                'district' => 'Dhaka',
            ],
            'items' => [
                [
                    'product_variant_id' => $this->variant1->id,
                    'quantity' => 2,
                ],
                [
                    'product_variant_id' => $this->variant2->id,
                    'quantity' => 1,
                ]
            ],
            'delivery_notes' => 'Please call before delivery',
        ];

        $response = $this->actingAs($this->user)
            ->withHeader('X-Company-ID', $this->company->id)
            ->postJson('/api/v1/store/MAIN/checkout', $checkoutData);

        $response->assertStatus(201);
        $orderNumber = $response->json('order_number');
        $this->assertNotEmpty($orderNumber);
        $this->assertEquals('COD', $response->json('payment_method'));
        $this->assertEquals('DUE', $response->json('payment_status'));
        $this->assertEquals('UNFULFILLED', $response->json('fulfillment_status'));

        // Grand total: (2 * 3500) + (1 * 1500) = 8500 + 60 (shipping) = 8560
        $this->assertEquals(8560, $response->json('grand_total'));

        // Verify Sale in database
        $sale = Sale::where('company_id', $this->company->id)->where('order_number', $orderNumber)->first();
        $this->assertNotNull($sale);
        $this->assertEquals('ECOMMERCE', $sale->channel);
        $this->assertEquals($this->customer->id, $sale->customer_id);

        // Verify Inventory Reservation was atomically created
        $inv1 = Inventory::where('company_id', $this->company->id)
            ->where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant1->id)
            ->first();

        $this->assertEquals(2.0, (float)$inv1->reserved_quantity);
        $this->assertEquals(8.0, (float)$inv1->available_quantity);
    }

    public function test_store_credit_checkout_deducts_balance_atomically(): void
    {
        // Issue ৳10000 store credit to customer
        $scService = app(StoreCreditService::class);
        $scService->issueCredit(
            $this->company->id,
            $this->customer->id,
            10000,
            'Test',
            null,
            'TEST-SC-01',
            'Bonus store credit'
        );

        $checkoutData = [
            'payment_method' => 'STORE_CREDIT',
            'shipping_method_id' => $this->shippingMethod->id,
            'shipping_address' => [
                'recipient_name' => 'Tofayel Ahmed',
                'mobile' => '+8801711111111',
                'address_line_1' => 'Gulshan 2',
                'city' => 'Dhaka',
            ],
            'items' => [
                [
                    'product_variant_id' => $this->variant2->id,
                    'quantity' => 1,
                ]
            ],
        ];

        $response = $this->actingAs($this->user)
            ->withHeader('X-Company-ID', $this->company->id)
            ->postJson('/api/v1/store/MAIN/checkout', $checkoutData);

        $response->assertStatus(201);
        $this->assertEquals('PAID', $response->json('payment_status'));

        // Total was 1500 + 60 = 1560. New store credit balance should be 10000 - 1560 = 8440
        $newBalance = $scService->getBalance($this->company->id, $this->customer->id);
        $this->assertEquals(8440.0, $newBalance);
    }

    public function test_checkout_idempotency_prevents_duplicate_orders(): void
    {
        $idempotencyKey = 'IDEMP-TEST-ORDER-XYZ';

        $checkoutData = [
            'idempotency_key' => $idempotencyKey,
            'payment_method' => 'COD',
            'shipping_address' => [
                'recipient_name' => 'Tofayel Ahmed',
                'mobile' => '+8801711111111',
                'address_line_1' => 'Banani',
                'city' => 'Dhaka',
            ],
            'items' => [
                [
                    'product_variant_id' => $this->variant2->id,
                    'quantity' => 1,
                ]
            ],
        ];

        // First call
        $res1 = $this->actingAs($this->user)
            ->withHeader('X-Company-ID', $this->company->id)
            ->postJson('/api/v1/store/MAIN/checkout', $checkoutData);

        $res1->assertStatus(201);
        $firstOrderNumber = $res1->json('order_number');

        // Duplicate call with same idempotency key
        $res2 = $this->actingAs($this->user)
            ->withHeader('X-Company-ID', $this->company->id)
            ->postJson('/api/v1/store/MAIN/checkout', $checkoutData);

        $res2->assertStatus(201);
        $this->assertEquals($firstOrderNumber, $res2->json('order_number'));

        // Total orders in DB must be exactly 1
        $count = Sale::where('company_id', $this->company->id)
            ->where('idempotency_key', $idempotencyKey)
            ->count();
        $this->assertEquals(1, $count);
    }
}
