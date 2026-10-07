<?php

namespace Tests\Feature\Ecommerce;

use App\Models\Category;
use App\Models\Company;
use App\Models\Customer;
use App\Models\EcommerceStore;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Shipment;
use App\Models\ShippingMethod;
use App\Models\StockMovement;
use App\Models\TaxTransaction;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\EcommerceCheckoutService;
use App\Services\OrderFulfillmentService;
use App\Services\EcommerceReturnService;
use Database\Seeders\EcommercePermissionsSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\TaxPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EcommerceFulfillmentAndReturnTest extends TestCase
{
    use RefreshDatabase;

    protected Company $company;
    protected User $user;
    protected Customer $customer;
    protected Warehouse $warehouse;
    protected ProductVariant $variant;
    protected ShippingMethod $shippingMethod;
    protected EcommerceStore $store;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $this->seed(EcommercePermissionsSeeder::class);
        $this->seed(TaxPermissionsSeeder::class);

        $this->company = Company::factory()->create();

        $this->warehouse = Warehouse::create([
            'company_id' => $this->company->id,
            'name' => 'Dhaka Central Hub',
            'code' => 'DCH-01',
            'status' => 'active',
        ]);

        $unit = Unit::create([
            'company_id' => $this->company->id,
            'name' => 'Pieces',
            'short_code' => 'PCS',
        ]);

        $category = Category::create([
            'company_id' => $this->company->id,
            'name' => 'Gadgets',
            'code' => 'GAD',
        ]);

        $this->shippingMethod = ShippingMethod::create([
            'company_id' => $this->company->id,
            'name' => 'Steadfast Standard',
            'code' => 'STEADFAST',
            'carrier_name' => 'Steadfast',
            'estimated_days' => '2-3 Days',
            'is_active' => true,
        ]);

        $p = Product::create([
            'company_id' => $this->company->id,
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'name' => 'Fast Charger 65W',
            'slug' => 'fast-charger-65w',
            'status' => 'active',
            'is_published' => true,
            'visibility' => 'BOTH',
        ]);

        $this->variant = ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $p->id,
            'sku' => 'CHG-65W',
            'variant_name' => 'White',
            'cost_price' => 600,
            'selling_price' => 1200,
        ]);

        Inventory::create([
            'company_id' => $this->company->id,
            'warehouse_id' => $this->warehouse->id,
            'product_id' => $p->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 20,
            'reserved_quantity' => 0,
            'available_quantity' => 20,
            'average_cost' => 600,
            'total_value' => 12000,
        ]);

        $this->store = EcommerceStore::create([
            'company_id' => $this->company->id,
            'code' => 'MAIN',
            'name' => 'Main Store',
            'default_warehouse_id' => $this->warehouse->id,
            'currency' => 'BDT',
            'is_active' => true,
            'guest_checkout_enabled' => true,
            'cod_enabled' => true,
        ]);

        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);
        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin']);
        $this->user->roles()->attach($superAdmin->id);

        $this->customer = Customer::create([
            'company_id' => $this->company->id,
            'user_id' => $this->user->id,
            'customer_code' => 'CUST-002',
            'name' => 'Karim Ullah',
            'email' => $this->user->email,
            'mobile' => '+8801811111111',
            'status' => 'ACTIVE',
        ]);
    }

    public function test_complete_fulfillment_lifecycle_with_stock_movement_and_cod_collection(): void
    {
        // 1. Create Order via Checkout
        $checkoutService = app(EcommerceCheckoutService::class);
        $sale = $checkoutService->checkout(
            $this->company->id,
            [
                'customer_id' => $this->customer->id,
                'warehouse_id' => $this->warehouse->id,
                'payment_method' => 'COD',
                'shipping_method_id' => $this->shippingMethod->id,
                'shipping_address' => [
                    'recipient_name' => 'Karim Ullah',
                    'mobile' => '+8801811111111',
                    'address_line_1' => 'Agrabad',
                    'city' => 'Chittagong',
                ],
                'items' => [
                    [
                        'product_variant_id' => $this->variant->id,
                        'quantity' => 3,
                    ]
                ],
            ],
            $this->user->id
        );

        $this->assertEquals('UNFULFILLED', $sale->fulfillment_status);
        $this->assertEquals('DUE', $sale->payment_status);

        // Before fulfillment: physical inventory is NOT deducted yet, only reserved
        $inv = Inventory::where('company_id', $this->company->id)
            ->where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant->id)
            ->first();

        $this->assertEquals(20.0, (float)$inv->quantity);
        $this->assertEquals(3.0, (float)$inv->reserved_quantity);
        $this->assertEquals(17.0, (float)$inv->available_quantity);
        $this->assertEquals(0, StockMovement::where('company_id', $this->company->id)->count());

        // 2. Admin creates Shipment (Allocation)
        $fulfillmentService = app(OrderFulfillmentService::class);
        $shipment = $fulfillmentService->createShipment(
            $this->company->id,
            $sale->id,
            ['carrier_name' => 'Steadfast', 'tracking_number' => 'ST-998877'],
            $this->user->id
        );

        $this->assertEquals('ALLOCATED', $sale->fresh()->fulfillment_status);
        $this->assertEquals(Shipment::STATUS_PENDING, $shipment->status);

        // 3. Mark As Shipped (Dispatches physical goods & consumes reservation)
        $shipment = $fulfillmentService->markAsShipped(
            $this->company->id,
            $shipment->id,
            'ST-998877',
            $this->user->id
        );

        $this->assertEquals('SHIPPED', $sale->fresh()->fulfillment_status);
        $this->assertEquals(Shipment::STATUS_SHIPPED, $shipment->status);

        // Verify physical stock was deducted via canonical StockMovement
        $invAfter = Inventory::where('company_id', $this->company->id)
            ->where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant->id)
            ->first();

        $this->assertEquals(17.0, (float)$invAfter->quantity);
        $this->assertEquals(0.0, (float)$invAfter->reserved_quantity);
        $this->assertEquals(17.0, (float)$invAfter->available_quantity);

        $movement = StockMovement::where('company_id', $this->company->id)
            ->where('reference_type', 'Sale')
            ->where('reference_id', $sale->id)
            ->first();

        $this->assertNotNull($movement);
        $this->assertEquals('STOCK_OUT', $movement->movement_type);
        $this->assertEquals(3.0, (float)$movement->quantity);

        // 4. Mark As Delivered (Collects COD payment)
        $shipment = $fulfillmentService->markAsDelivered(
            $this->company->id,
            $shipment->id,
            $this->user->id
        );

        $freshSale = $sale->fresh();
        $this->assertEquals('DELIVERED', $freshSale->fulfillment_status);
        $this->assertEquals('PAID', $freshSale->payment_status);
        $this->assertEquals(0.0, (float)$freshSale->due_amount);
        $this->assertGreaterThan(0, (float)$freshSale->paid_amount);
    }

    public function test_order_cancellation_releases_reservation_cleanly(): void
    {
        $checkoutService = app(EcommerceCheckoutService::class);
        $sale = $checkoutService->checkout(
            $this->company->id,
            [
                'customer_id' => $this->customer->id,
                'warehouse_id' => $this->warehouse->id,
                'payment_method' => 'COD',
                'shipping_method_id' => $this->shippingMethod->id,
                'shipping_address' => [
                    'recipient_name' => 'Karim Ullah',
                    'mobile' => '+8801811111111',
                    'address_line_1' => 'Road 1',
                    'city' => 'Dhaka',
                ],
                'items' => [
                    [
                        'product_variant_id' => $this->variant->id,
                        'quantity' => 4,
                    ]
                ],
            ],
            $this->user->id
        );

        $invBefore = Inventory::where('company_id', $this->company->id)
            ->where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant->id)
            ->first();

        $this->assertEquals(4.0, (float)$invBefore->reserved_quantity);
        $this->assertEquals(16.0, (float)$invBefore->available_quantity);

        // Cancel order
        $fulfillmentService = app(OrderFulfillmentService::class);
        $cancelledSale = $fulfillmentService->cancelOrder($this->company->id, $sale->id, 'Customer changed mind', $this->user->id);

        $this->assertEquals('VOIDED', $cancelledSale->status);
        $this->assertEquals('CANCELLED', $cancelledSale->fulfillment_status);

        // Verify reservation released and stock restored
        $invAfter = Inventory::where('company_id', $this->company->id)
            ->where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant->id)
            ->first();

        $this->assertEquals(0.0, (float)$invAfter->reserved_quantity);
        $this->assertEquals(20.0, (float)$invAfter->available_quantity);
        $this->assertEquals(20.0, (float)$invAfter->quantity);

        // Verify zero stock movement occurred
        $this->assertEquals(0, StockMovement::where('company_id', $this->company->id)->count());
    }

    public function test_online_return_process_restocks_and_reverses_vat(): void
    {
        // 1. Setup completed delivered sale
        $checkoutService = app(EcommerceCheckoutService::class);
        $sale = $checkoutService->checkout(
            $this->company->id,
            [
                'customer_id' => $this->customer->id,
                'warehouse_id' => $this->warehouse->id,
                'payment_method' => 'COD',
                'shipping_method_id' => $this->shippingMethod->id,
                'shipping_address' => [
                    'recipient_name' => 'Karim Ullah',
                    'mobile' => '+8801811111111',
                    'address_line_1' => 'Road 1',
                    'city' => 'Dhaka',
                ],
                'items' => [
                    [
                        'product_variant_id' => $this->variant->id,
                        'quantity' => 2,
                    ]
                ],
            ],
            $this->user->id
        );

        $fulfillmentService = app(OrderFulfillmentService::class);
        $shipment = $fulfillmentService->createShipment($this->company->id, $sale->id, [], $this->user->id);
        $fulfillmentService->markAsShipped($this->company->id, $shipment->id, 'TRK-01', $this->user->id);
        $fulfillmentService->markAsDelivered($this->company->id, $shipment->id, $this->user->id);

        $saleItem = $sale->items->first();

        // Stock quantity right now after shipping 2 units is 18
        $invMid = Inventory::where('company_id', $this->company->id)
            ->where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant->id)
            ->first();
        $this->assertEquals(18.0, (float)$invMid->quantity);

        // 2. Process Return of 1 unit
        $returnService = app(EcommerceReturnService::class);
        $salesReturn = $returnService->processOnlineReturn(
            companyId: $this->company->id,
            saleId: $sale->id,
            items: [
                [
                    'sale_item_id' => $saleItem->id,
                    'quantity' => 1,
                    'condition' => 'GOOD',
                ]
            ],
            returnType: 'CUSTOMER_CREDIT',
            reason: 'Wrong color received',
            userId: $this->user->id
        );

        $this->assertNotNull($salesReturn);
        $this->assertEquals('COMPLETED', $salesReturn->status);
        $this->assertEquals('PARTIALLY_RETURNED', $sale->fresh()->fulfillment_status);

        // Verify restocking: 1 unit returned back into inventory (18 + 1 = 19)
        $invAfterReturn = Inventory::where('company_id', $this->company->id)
            ->where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant->id)
            ->first();
        $this->assertEquals(19.0, (float)$invAfterReturn->quantity);

        // Verify VAT reversal in Tax Subledger
        $taxTx = TaxTransaction::where('company_id', $this->company->id)
            ->where('source_type', \App\Models\SalesReturn::class)
            ->where('source_id', $salesReturn->id)
            ->first();

        $this->assertNotNull($taxTx);
        $this->assertEquals(TaxTransaction::TYPE_SALE_RETURN_REVERSAL, $taxTx->transaction_type);
    }
}
