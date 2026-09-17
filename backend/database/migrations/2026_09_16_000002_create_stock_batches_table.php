<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('stock_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('variant_id')->constrained('product_variants')->restrictOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->string('batch_no', 100);
            $table->date('mfg_date')->nullable();
            $table->date('exp_date')->nullable();
            $table->decimal('unit_cost', 15, 4)->default(0);
            $table->string('status', 50)->default('ACTIVE');
            $table->timestamps();
            
            $table->unique(['company_id', 'variant_id', 'batch_no']);
            $table->index(['exp_date']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('stock_batches');
    }
};
