<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('inventory_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_id')->constrained('inventories')->restrictOnDelete();
            $table->foreignId('stock_batch_id')->constrained('stock_batches')->restrictOnDelete();
            $table->foreignId('storage_location_id')->nullable()->constrained('storage_locations')->restrictOnDelete();
            $table->decimal('quantity', 15, 4)->default(0);
            $table->timestamps();
            
            $table->unique(['inventory_id', 'stock_batch_id', 'storage_location_id'], 'uq_inv_batch_loc');
            $table->index(['inventory_id']);
            $table->index(['stock_batch_id']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('inventory_batches');
    }
};
