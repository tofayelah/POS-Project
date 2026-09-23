<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('goods_receipt_items', function (Blueprint $table) {
            $table->foreignId('storage_location_id')->nullable()->constrained('storage_locations')->restrictOnDelete();
            $table->foreignId('stock_batch_id')->nullable()->constrained('stock_batches')->restrictOnDelete();
            $table->string('batch_number', 100)->nullable();
            $table->date('expiry_date')->nullable();

            $table->index(['storage_location_id']);
            $table->index(['stock_batch_id']);
        });
    }

    public function down(): void
    {
        Schema::table('goods_receipt_items', function (Blueprint $table) {
            $table->dropForeign(['storage_location_id']);
            $table->dropForeign(['stock_batch_id']);
            $table->dropIndex(['storage_location_id']);
            $table->dropIndex(['stock_batch_id']);
            $table->dropColumn(['storage_location_id', 'stock_batch_id', 'batch_number', 'expiry_date']);
        });
    }
};
