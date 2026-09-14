<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Master Product catalog table
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('business_unit_id')->nullable()->constrained('business_units')->nullOnDelete();
            $table->foreignId('category_id')->constrained('categories')->restrictOnDelete();
            $table->foreignId('brand_id')->nullable()->constrained('brands')->nullOnDelete();
            $table->foreignId('unit_id')->constrained('units')->restrictOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->string('product_code')->nullable();
            $table->text('description')->nullable();
            $table->string('product_type')->default('simple'); // 'simple', 'variable'
            $table->boolean('has_variants')->default(false);
            
            // Tax configuration reference (compatible with future tax engine)
            $table->decimal('tax_rate', 5, 2)->default(0.00);
            $table->string('tax_type')->default('exclusive'); // 'inclusive', 'exclusive', 'exempt'

            // Reorder level for master definition (stock balances handled in future inventory module)
            $table->integer('reorder_level')->default(0);
            $table->string('status')->default('active'); // 'active', 'inactive'

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'status']);
            $table->index('category_id');
            $table->index('brand_id');
            $table->index('name');
        });

        // 2. Product Variants (Each sellable SKU)
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('sku');
            $table->string('variant_name'); // e.g. "Black / 32" or "Standard"
            
            // Monetary values must be NUMERIC / DECIMAL (never FLOAT or DOUBLE)
            $table->decimal('cost_price', 15, 4)->default(0.0000);
            $table->decimal('selling_price', 15, 4)->default(0.0000);
            $table->decimal('wholesale_price', 15, 4)->default(0.0000);
            $table->decimal('mrp', 15, 4)->default(0.0000);

            $table->decimal('tax_rate', 5, 2)->nullable();
            $table->string('status')->default('active'); // 'active', 'inactive'

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique('sku');
            $table->index('product_id');
            $table->index('variant_name');
            $table->index(['product_id', 'status']);
        });

        // 3. Variant Attribute Value relational mapping (normalized junction)
        Schema::create('product_variant_attribute_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_variant_id')->constrained('product_variants')->cascadeOnDelete();
            $table->foreignId('attribute_id')->constrained('attributes')->cascadeOnDelete();
            $table->foreignId('attribute_value_id')->constrained('attribute_values')->cascadeOnDelete();
            $table->timestamps();

            // Prevent assigning multiple values for the same attribute to the same variant
            $table->unique(['product_variant_id', 'attribute_id'], 'uq_p_var_attr');
            $table->index(['product_variant_id', 'attribute_value_id'], 'idx_p_var_val');
        });

        // 4. First-class Barcode Master table
        Schema::create('barcodes', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('product_variant_id')->constrained('product_variants')->cascadeOnDelete();
            $table->string('barcode');
            $table->string('barcode_type')->default('EAN'); // 'EAN', 'UPC', 'Internal', 'Supplier', 'Other'
            $table->boolean('is_primary')->default(false);
            $table->string('status')->default('active'); // 'active', 'inactive'

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique('barcode');
            $table->index(['product_variant_id', 'is_primary']);
            $table->index(['barcode', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('barcodes');
        Schema::dropIfExists('product_variant_attribute_values');
        Schema::dropIfExists('product_variants');
        Schema::dropIfExists('products');
    }
};
