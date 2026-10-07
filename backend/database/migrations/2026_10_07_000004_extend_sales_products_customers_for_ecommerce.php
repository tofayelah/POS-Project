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
        // 1. Extend sales table for Omnichannel & E-Commerce
        Schema::table('sales', function (Blueprint $table) {
            $table->foreignId('cashier_id')->nullable()->change();
            
            if (!Schema::hasColumn('sales', 'channel')) {
                $table->string('channel', 30)->default('POS')->after('warehouse_id');
            }
            if (!Schema::hasColumn('sales', 'order_number')) {
                $table->string('order_number', 50)->nullable()->after('invoice_number');
            }
            if (!Schema::hasColumn('sales', 'fulfillment_status')) {
                $table->string('fulfillment_status', 30)->default('UNFULFILLED')->after('payment_status');
            }
            if (!Schema::hasColumn('sales', 'shipping_amount')) {
                $table->decimal('shipping_amount', 15, 4)->default(0)->after('tax_total');
            }
            if (!Schema::hasColumn('sales', 'shipping_method_id')) {
                $table->unsignedBigInteger('shipping_method_id')->nullable()->after('shipping_amount');
            }
            if (!Schema::hasColumn('sales', 'shipping_address_snapshot')) {
                $table->json('shipping_address_snapshot')->nullable()->after('notes');
            }
            if (!Schema::hasColumn('sales', 'billing_address_snapshot')) {
                $table->json('billing_address_snapshot')->nullable()->after('shipping_address_snapshot');
            }
            if (!Schema::hasColumn('sales', 'tracking_number')) {
                $table->string('tracking_number', 100)->nullable()->after('billing_address_snapshot');
            }
            if (!Schema::hasColumn('sales', 'delivery_notes')) {
                $table->text('delivery_notes')->nullable()->after('tracking_number');
            }
        });

        // Add indices safely
        Schema::table('sales', function (Blueprint $table) {
            $table->index(['company_id', 'channel'], 'sales_company_channel_idx');
            $table->index(['company_id', 'fulfillment_status'], 'sales_company_fulfillment_idx');
            $table->index(['company_id', 'order_number'], 'sales_company_order_number_idx');
        });

        // 2. Extend products table for Catalog & Online Publishing
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'is_published')) {
                $table->boolean('is_published')->default(false)->after('status');
            }
            if (!Schema::hasColumn('products', 'visibility')) {
                $table->string('visibility', 30)->default('BOTH')->after('is_published');
            }
            if (!Schema::hasColumn('products', 'featured')) {
                $table->boolean('featured')->default(false)->after('visibility');
            }
            if (!Schema::hasColumn('products', 'new_arrival')) {
                $table->boolean('new_arrival')->default(false)->after('featured');
            }
            if (!Schema::hasColumn('products', 'best_seller')) {
                $table->boolean('best_seller')->default(false)->after('new_arrival');
            }
            if (!Schema::hasColumn('products', 'sort_order')) {
                $table->integer('sort_order')->default(0)->after('best_seller');
            }
            if (!Schema::hasColumn('products', 'short_description')) {
                $table->text('short_description')->nullable()->after('sort_order');
            }
            if (!Schema::hasColumn('products', 'images')) {
                $table->json('images')->nullable()->after('description');
            }
            if (!Schema::hasColumn('products', 'seo_title')) {
                $table->string('seo_title', 255)->nullable()->after('images');
            }
            if (!Schema::hasColumn('products', 'seo_description')) {
                $table->text('seo_description')->nullable()->after('seo_title');
            }
            if (!Schema::hasColumn('products', 'badge')) {
                $table->string('badge', 50)->nullable()->after('seo_description');
            }
        });

        Schema::table('products', function (Blueprint $table) {
            $table->index(['company_id', 'is_published', 'visibility'], 'products_company_published_vis_idx');
        });

        // 3. Extend customers table to link auth users
        Schema::table('customers', function (Blueprint $table) {
            if (!Schema::hasColumn('customers', 'user_id')) {
                $table->foreignId('user_id')->nullable()->after('company_id')->constrained('users')->onDelete('set null');
                $table->index(['company_id', 'user_id'], 'customers_company_user_idx');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            if (Schema::hasColumn('customers', 'user_id')) {
                $table->dropForeign(['user_id']);
                $table->dropIndex('customers_company_user_idx');
                $table->dropColumn('user_id');
            }
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('products_company_published_vis_idx');
            $cols = ['is_published', 'visibility', 'featured', 'new_arrival', 'best_seller', 'sort_order', 'short_description', 'images', 'seo_title', 'seo_description', 'badge'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('products', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->dropIndex('sales_company_channel_idx');
            $table->dropIndex('sales_company_fulfillment_idx');
            $table->dropIndex('sales_company_order_number_idx');
            $cols = ['channel', 'order_number', 'fulfillment_status', 'shipping_amount', 'shipping_method_id', 'shipping_address_snapshot', 'billing_address_snapshot', 'tracking_number', 'delivery_notes'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('sales', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
