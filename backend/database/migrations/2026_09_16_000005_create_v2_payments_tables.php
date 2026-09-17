<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->restrictOnDelete();
            $table->string('payment_number', 100);
            $table->decimal('amount', 18, 4);
            $table->string('payment_method', 50);
            $table->string('payment_type', 50);
            $table->string('reference_number', 150)->nullable();
            $table->string('status', 50)->default('PENDING');
            $table->timestamps();
            
            $table->unique(['company_id', 'payment_number']);
            $table->index(['payment_method']);
        });
        
        Schema::create('payment_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->constrained('payments')->restrictOnDelete();
            $table->string('allocatable_type', 150);
            $table->unsignedBigInteger('allocatable_id');
            $table->decimal('amount', 18, 4);
            $table->timestamps();
            
            $table->index(['allocatable_type', 'allocatable_id']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('payment_allocations');
        Schema::dropIfExists('payments');
    }
};
