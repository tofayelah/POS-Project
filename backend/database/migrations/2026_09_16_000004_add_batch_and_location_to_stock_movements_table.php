<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->foreignId('stock_batch_id')->nullable()->constrained('stock_batches')->restrictOnDelete();
            $table->foreignId('storage_location_id')->nullable()->constrained('storage_locations')->restrictOnDelete();
            
            $table->index(['stock_batch_id']);
            $table->index(['storage_location_id']);
        });
    }
    public function down(): void {
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropForeign(['stock_batch_id']);
            $table->dropForeign(['storage_location_id']);
            $table->dropIndex(['stock_batch_id']);
            $table->dropIndex(['storage_location_id']);
            $table->dropColumn(['stock_batch_id', 'storage_location_id']);
        });
    }
};
