<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. E-Commerce Stores
        Schema::create('ecommerce_stores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->onDelete('cascade');
            $table->string('code', 50);
            $table->string('name', 150);
            $table->string('domain', 200)->nullable();
            $table->foreignId('default_branch_id')->nullable()->constrained('branches')->onDelete('set null');
            $table->foreignId('default_warehouse_id')->nullable()->constrained('warehouses')->onDelete('set null');
            $table->string('currency', 10)->default('BDT');
            $table->boolean('is_active')->default(true);
            $table->boolean('guest_checkout_enabled')->default(true);
            $table->boolean('cod_enabled')->default(true);
            $table->boolean('online_payment_enabled')->default(true);
            $table->string('order_prefix', 20)->default('EC-');
            $table->json('settings')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'code']);
        });

        // 2. Hierarchical E-Commerce Categories
        Schema::create('ecommerce_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->onDelete('cascade');
            $table->foreignId('parent_id')->nullable()->constrained('ecommerce_categories')->onDelete('set null');
            $table->string('name', 150);
            $table->string('slug', 180);
            $table->text('description')->nullable();
            $table->string('image', 255)->nullable();
            $table->string('icon', 100)->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->string('seo_title', 255)->nullable();
            $table->text('seo_description')->nullable();
            $table->timestamps();

            $table->unique(['company_id', 'slug']);
        });

        // 3. Inventory Reservations (Lifecycle: RESERVED -> ALLOCATED -> CONSUMED / RELEASED)
        Schema::create('inventory_reservations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->onDelete('cascade');
            $table->foreignId('warehouse_id')->constrained('warehouses')->onDelete('cascade');
            $table->foreignId('product_variant_id')->constrained('product_variants')->onDelete('cascade');
            $table->foreignId('sale_id')->nullable()->constrained('sales')->onDelete('set null');
            $table->string('reservation_token', 100)->nullable();
            $table->decimal('quantity', 15, 4);
            $table->string('status', 30)->default('RESERVED'); // RESERVED, ALLOCATED, CONSUMED, RELEASED
            $table->dateTime('expires_at')->nullable();
            $table->dateTime('released_at')->nullable();
            $table->dateTime('consumed_at')->nullable();
            $table->string('notes', 255)->nullable();
            $table->timestamps();

            $table->index(['company_id', 'warehouse_id', 'product_variant_id', 'status'], 'inv_res_lookup_idx');
            $table->index('expires_at');
            $table->index('reservation_token');
        });

        // 4. Carts
        Schema::create('ecommerce_carts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->onDelete('cascade');
            $table->foreignId('store_id')->nullable()->constrained('ecommerce_stores')->onDelete('set null');
            $table->foreignId('customer_id')->nullable()->constrained('customers')->onDelete('set null');
            $table->string('guest_token', 100)->nullable();
            $table->string('coupon_code', 50)->nullable();
            $table->decimal('discount_amount', 15, 4)->default(0);
            $table->dateTime('expires_at')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'guest_token']);
            $table->index(['company_id', 'customer_id']);
        });

        // 5. Cart Items
        Schema::create('ecommerce_cart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cart_id')->constrained('ecommerce_carts')->onDelete('cascade');
            $table->foreignId('product_variant_id')->constrained('product_variants')->onDelete('cascade');
            $table->decimal('quantity', 15, 4)->default(1);
            $table->decimal('unit_price_snapshot', 15, 4)->default(0);
            $table->timestamps();

            $table->unique(['cart_id', 'product_variant_id']);
        });

        // 6. Customer Addresses
        Schema::create('customer_addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->onDelete('cascade');
            $table->string('address_type', 30)->default('SHIPPING'); // SHIPPING, BILLING, BOTH
            $table->string('recipient_name', 150);
            $table->string('mobile', 50);
            $table->string('address_line_1', 255);
            $table->string('address_line_2', 255)->nullable();
            $table->string('area', 100)->nullable();
            $table->string('city', 100);
            $table->string('district', 100)->nullable();
            $table->string('division', 100)->nullable();
            $table->string('postal_code', 20)->nullable();
            $table->boolean('is_default_shipping')->default(false);
            $table->boolean('is_default_billing')->default(false);
            $table->timestamps();

            $table->index('customer_id');
        });

        // 7. Shipping Zones
        Schema::create('shipping_zones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->onDelete('cascade');
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->json('regions')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 8. Shipping Methods
        Schema::create('shipping_methods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->onDelete('cascade');
            $table->string('name', 150);
            $table->string('code', 50);
            $table->string('carrier_name', 100)->nullable();
            $table->string('estimated_days', 50)->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['company_id', 'code']);
        });

        // 9. Shipping Rates
        Schema::create('shipping_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shipping_method_id')->constrained('shipping_methods')->onDelete('cascade');
            $table->foreignId('shipping_zone_id')->constrained('shipping_zones')->onDelete('cascade');
            $table->decimal('base_rate', 15, 4)->default(0);
            $table->decimal('per_kg_rate', 15, 4)->default(0);
            $table->decimal('free_shipping_threshold', 15, 4)->nullable();
            $table->timestamps();

            $table->unique(['shipping_method_id', 'shipping_zone_id'], 'sm_sz_rate_unique');
        });

        // 10. Shipments
        Schema::create('shipments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->onDelete('cascade');
            $table->foreignId('sale_id')->constrained('sales')->onDelete('cascade');
            $table->foreignId('warehouse_id')->nullable()->constrained('warehouses')->onDelete('set null');
            $table->foreignId('shipping_method_id')->nullable()->constrained('shipping_methods')->onDelete('set null');
            $table->string('shipment_number', 50);
            $table->string('tracking_number', 100)->nullable();
            $table->string('carrier_name', 100)->nullable();
            $table->string('status', 30)->default('PENDING'); // PENDING, PICKED, PACKED, SHIPPED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED, RETURNED
            $table->decimal('shipping_cost', 15, 4)->default(0);
            $table->text('notes')->nullable();
            $table->dateTime('shipped_at')->nullable();
            $table->dateTime('delivered_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->unique(['company_id', 'shipment_number']);
            $table->index(['company_id', 'status']);
        });

        // 11. Shipment Items
        Schema::create('shipment_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shipment_id')->constrained('shipments')->onDelete('cascade');
            $table->foreignId('sale_item_id')->constrained('sale_items')->onDelete('cascade');
            $table->foreignId('product_variant_id')->constrained('product_variants')->onDelete('cascade');
            $table->decimal('quantity', 15, 4);
            $table->timestamps();
        });

        // 12. Coupons
        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->onDelete('cascade');
            $table->string('code', 50);
            $table->string('title', 150)->nullable();
            $table->string('discount_type', 30)->default('PERCENTAGE'); // PERCENTAGE, FIXED
            $table->decimal('discount_value', 15, 4);
            $table->decimal('min_order_amount', 15, 4)->default(0);
            $table->decimal('max_discount_amount', 15, 4)->nullable();
            $table->integer('usage_limit')->nullable();
            $table->integer('usage_count')->default(0);
            $table->integer('per_customer_limit')->default(1);
            $table->dateTime('valid_from')->nullable();
            $table->dateTime('valid_until')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['company_id', 'code']);
        });

        // 13. Coupon Usages
        Schema::create('coupon_usages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coupon_id')->constrained('coupons')->onDelete('cascade');
            $table->foreignId('customer_id')->nullable()->constrained('customers')->onDelete('set null');
            $table->foreignId('sale_id')->constrained('sales')->onDelete('cascade');
            $table->decimal('discount_amount', 15, 4);
            $table->dateTime('used_at');
            $table->timestamps();

            $table->index(['coupon_id', 'customer_id']);
        });

        // 14. Promotions
        Schema::create('promotions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->onDelete('cascade');
            $table->string('name', 150);
            $table->string('promotion_type', 50)->default('CART_PERCENTAGE');
            $table->decimal('discount_value', 15, 4)->default(0);
            $table->integer('priority')->default(0);
            $table->json('rules')->nullable();
            $table->dateTime('start_date')->nullable();
            $table->dateTime('end_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 15. Product Reviews
        Schema::create('product_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->onDelete('cascade');
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->foreignId('customer_id')->constrained('customers')->onDelete('cascade');
            $table->foreignId('sale_id')->nullable()->constrained('sales')->onDelete('set null');
            $table->tinyInteger('rating');
            $table->string('review_title', 200)->nullable();
            $table->text('review_text')->nullable();
            $table->boolean('is_verified_purchase')->default(false);
            $table->string('status', 30)->default('PENDING'); // PENDING, APPROVED, REJECTED
            $table->text('moderation_notes')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->dateTime('approved_at')->nullable();
            $table->timestamps();

            $table->index(['product_id', 'status']);
        });

        // 16. Wishlists
        Schema::create('wishlists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->onDelete('cascade');
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->foreignId('product_variant_id')->nullable()->constrained('product_variants')->onDelete('set null');
            $table->timestamps();

            $table->unique(['customer_id', 'product_id', 'product_variant_id'], 'wishlist_unique_entry');
        });

        // 17. Online Payment Transactions
        Schema::create('online_payment_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->onDelete('cascade');
            $table->foreignId('sale_id')->constrained('sales')->onDelete('cascade');
            $table->string('gateway', 50); // BKASH, NAGAD, SSLCOMMERZ, CARD, COD
            $table->string('transaction_reference', 100)->nullable();
            $table->decimal('amount', 15, 4);
            $table->string('currency', 10)->default('BDT');
            $table->string('status', 30)->default('PENDING'); // PENDING, SUCCESS, FAILED, CANCELLED
            $table->string('idempotency_key', 100)->nullable();
            $table->json('payload_snapshot')->nullable();
            $table->json('webhook_response')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'transaction_reference']);
            $table->index('idempotency_key');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('online_payment_transactions');
        Schema::dropIfExists('wishlists');
        Schema::dropIfExists('product_reviews');
        Schema::dropIfExists('promotions');
        Schema::dropIfExists('coupon_usages');
        Schema::dropIfExists('coupons');
        Schema::dropIfExists('shipment_items');
        Schema::dropIfExists('shipments');
        Schema::dropIfExists('shipping_rates');
        Schema::dropIfExists('shipping_methods');
        Schema::dropIfExists('shipping_zones');
        Schema::dropIfExists('customer_addresses');
        Schema::dropIfExists('ecommerce_cart_items');
        Schema::dropIfExists('ecommerce_carts');
        Schema::dropIfExists('inventory_reservations');
        Schema::dropIfExists('ecommerce_categories');
        Schema::dropIfExists('ecommerce_stores');
    }
};
