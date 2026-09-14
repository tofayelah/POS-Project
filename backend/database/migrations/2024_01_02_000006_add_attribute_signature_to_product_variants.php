<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->string('attribute_signature')->default('')->after('variant_name');
            $table->unique(['product_id', 'attribute_signature'], 'uq_prod_attr_sig');
        });
    }

    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropUnique('uq_prod_attr_sig');
            $table->dropColumn('attribute_signature');
        });
    }
};
