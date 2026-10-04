<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Update product_variants table
        Schema::table('product_variants', function (Blueprint $table) {
            if (!Schema::hasColumn('product_variants', 'company_id')) {
                $table->foreignId('company_id')->nullable()->after('product_id')->constrained('companies')->cascadeOnDelete();
            }
        });

        // Backfill company_id from products
        DB::statement('UPDATE product_variants SET company_id = products.company_id FROM products WHERE product_variants.product_id = products.id AND product_variants.company_id IS NULL');

        // Make company_id NOT NULL and update unique index
        DB::statement('ALTER TABLE product_variants ALTER COLUMN company_id SET NOT NULL');

        Schema::table('product_variants', function (Blueprint $table) {
            // Drop global unique constraint on sku
            $table->dropUnique(['sku']);
            // Add composite unique constraint
            $table->unique(['company_id', 'sku'], 'product_variants_company_sku_unique');
        });

        // 2. Update barcodes table
        Schema::table('barcodes', function (Blueprint $table) {
            if (!Schema::hasColumn('barcodes', 'company_id')) {
                $table->foreignId('company_id')->nullable()->after('product_variant_id')->constrained('companies')->cascadeOnDelete();
            }
        });

        // Backfill company_id from product_variants
        DB::statement('UPDATE barcodes SET company_id = product_variants.company_id FROM product_variants WHERE barcodes.product_variant_id = product_variants.id AND barcodes.company_id IS NULL');

        // Make company_id NOT NULL and update unique index
        DB::statement('ALTER TABLE barcodes ALTER COLUMN company_id SET NOT NULL');

        Schema::table('barcodes', function (Blueprint $table) {
            // Drop global unique constraint on barcode
            $table->dropUnique(['barcode']);
            // Add composite unique constraint
            $table->unique(['company_id', 'barcode'], 'barcodes_company_barcode_unique');
        });
    }

    public function down(): void
    {
        Schema::table('barcodes', function (Blueprint $table) {
            $table->dropUnique('barcodes_company_barcode_unique');
            $table->unique('barcode');
            $table->dropForeign(['company_id']);
            $table->dropColumn('company_id');
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropUnique('product_variants_company_sku_unique');
            $table->unique('sku');
            $table->dropForeign(['company_id']);
            $table->dropColumn('company_id');
        });
    }
};
