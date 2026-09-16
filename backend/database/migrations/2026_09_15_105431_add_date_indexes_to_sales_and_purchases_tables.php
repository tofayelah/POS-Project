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
        Schema::table('sales', function (Blueprint $table) {
            $table->index('sale_date', 'sales_sale_date_index');
        });

        Schema::table('purchases', function (Blueprint $table) {
            $table->index('invoice_date', 'purchases_invoice_date_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropIndex('sales_sale_date_index');
        });

        Schema::table('purchases', function (Blueprint $table) {
            $table->dropIndex('purchases_invoice_date_index');
        });
    }
};
