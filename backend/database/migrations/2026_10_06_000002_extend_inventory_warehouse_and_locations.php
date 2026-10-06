<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. Extend warehouses with contact information and default flag
        Schema::table('warehouses', function (Blueprint $table) {
            if (!Schema::hasColumn('warehouses', 'phone')) {
                $table->string('phone', 50)->nullable()->after('address');
            }
            if (!Schema::hasColumn('warehouses', 'email')) {
                $table->string('email', 100)->nullable()->after('phone');
            }
            if (!Schema::hasColumn('warehouses', 'is_default')) {
                $table->boolean('is_default')->default(false)->after('status');
            }
        });

        // 2. Extend storage_locations with hierarchy, type, and capacity metadata
        Schema::table('storage_locations', function (Blueprint $table) {
            if (!Schema::hasColumn('storage_locations', 'parent_id')) {
                $table->foreignId('parent_id')->nullable()->after('warehouse_id')
                    ->constrained('storage_locations')->nullOnDelete();
            }
            if (!Schema::hasColumn('storage_locations', 'type')) {
                $table->string('type', 50)->nullable()->default('BIN')->after('name'); // AISLE, RACK, SHELF, BIN
            }
            if (!Schema::hasColumn('storage_locations', 'capacity')) {
                $table->decimal('capacity', 15, 4)->nullable()->after('type');
            }
        });

        // 3. Extend inventories with min/max stock and reorder thresholds
        Schema::table('inventories', function (Blueprint $table) {
            if (!Schema::hasColumn('inventories', 'min_stock')) {
                $table->decimal('min_stock', 15, 4)->nullable()->after('available_quantity');
            }
            if (!Schema::hasColumn('inventories', 'max_stock')) {
                $table->decimal('max_stock', 15, 4)->nullable()->after('min_stock');
            }
            if (!Schema::hasColumn('inventories', 'reorder_point')) {
                $table->decimal('reorder_point', 15, 4)->nullable()->after('max_stock');
            }
            if (!Schema::hasColumn('inventories', 'reorder_quantity')) {
                $table->decimal('reorder_quantity', 15, 4)->nullable()->after('reorder_point');
            }
        });

        // 4. Extend stock_transfer_items with source location, destination location, and batch tracking
        Schema::table('stock_transfer_items', function (Blueprint $table) {
            if (!Schema::hasColumn('stock_transfer_items', 'source_storage_location_id')) {
                $table->foreignId('source_storage_location_id')->nullable()->after('product_variant_id')
                    ->constrained('storage_locations')->nullOnDelete();
            }
            if (!Schema::hasColumn('stock_transfer_items', 'destination_storage_location_id')) {
                $table->foreignId('destination_storage_location_id')->nullable()->after('source_storage_location_id')
                    ->constrained('storage_locations')->nullOnDelete();
            }
            if (!Schema::hasColumn('stock_transfer_items', 'stock_batch_id')) {
                $table->foreignId('stock_batch_id')->nullable()->after('destination_storage_location_id')
                    ->constrained('stock_batches')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('stock_transfer_items', function (Blueprint $table) {
            if (Schema::hasColumn('stock_transfer_items', 'stock_batch_id')) {
                $table->dropForeign(['stock_batch_id']);
                $table->dropColumn('stock_batch_id');
            }
            if (Schema::hasColumn('stock_transfer_items', 'destination_storage_location_id')) {
                $table->dropForeign(['destination_storage_location_id']);
                $table->dropColumn('destination_storage_location_id');
            }
            if (Schema::hasColumn('stock_transfer_items', 'source_storage_location_id')) {
                $table->dropForeign(['source_storage_location_id']);
                $table->dropColumn('source_storage_location_id');
            }
        });

        Schema::table('inventories', function (Blueprint $table) {
            $table->dropColumn(['min_stock', 'max_stock', 'reorder_point', 'reorder_quantity']);
        });

        Schema::table('storage_locations', function (Blueprint $table) {
            if (Schema::hasColumn('storage_locations', 'parent_id')) {
                $table->dropForeign(['parent_id']);
                $table->dropColumn(['parent_id', 'type', 'capacity']);
            }
        });

        Schema::table('warehouses', function (Blueprint $table) {
            $table->dropColumn(['phone', 'email', 'is_default']);
        });
    }
};
