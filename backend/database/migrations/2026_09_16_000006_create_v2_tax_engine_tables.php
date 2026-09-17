<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('tax_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->timestamps();
        });
        
        Schema::create('taxes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->foreignId('tax_category_id')->constrained('tax_categories')->restrictOnDelete();
            $table->string('name');
            $table->string('tax_type');
            $table->boolean('is_inclusive');
            $table->foreignId('collected_account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->foreignId('paid_account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        
        Schema::create('tax_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tax_id')->constrained('taxes')->restrictOnDelete();
            $table->decimal('rate', 8, 4);
            $table->date('valid_from');
            $table->date('valid_to')->nullable();
            $table->timestamps();
        });
        
        Schema::create('transaction_taxes', function (Blueprint $table) {
            $table->id();
            $table->string('taxable_type', 150);
            $table->unsignedBigInteger('taxable_id');
            $table->foreignId('tax_id')->constrained('taxes')->restrictOnDelete();
            $table->decimal('tax_rate', 8, 4);
            $table->decimal('taxable_amount', 18, 4);
            $table->decimal('tax_amount', 18, 4);
            $table->timestamps();
            
            $table->index(['taxable_type', 'taxable_id']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('transaction_taxes');
        Schema::dropIfExists('tax_rates');
        Schema::dropIfExists('taxes');
        Schema::dropIfExists('tax_categories');
    }
};
