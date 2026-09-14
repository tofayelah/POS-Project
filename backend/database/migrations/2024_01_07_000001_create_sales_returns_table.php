<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_returns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->onDelete('cascade');
            $table->foreignId('business_unit_id')->nullable()->constrained('business_units')->onDelete('cascade');
            $table->foreignId('branch_id')->nullable()->constrained('branches')->onDelete('cascade');
            $table->foreignId('warehouse_id')->nullable()->constrained('warehouses')->onDelete('cascade');
            
            $table->foreignId('pos_terminal_id')->nullable()->constrained('pos_terminals')->onDelete('set null');
            $table->foreignId('pos_session_id')->nullable()->constrained('pos_sessions')->onDelete('set null');
            
            $table->foreignId('original_sale_id')->constrained('sales')->onDelete('cascade');
            $table->foreignId('customer_id')->nullable()->constrained('customers')->onDelete('set null');
            
            $table->string('return_number');
            $table->date('return_date');
            
            $table->string('idempotency_key')->nullable();
            
            $table->enum('status', ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'COMPLETED', 'CANCELLED', 'REJECTED'])->default('DRAFT');
            $table->enum('return_type', ['REFUND', 'STORE_CREDIT', 'EXCHANGE']);
            
            $table->decimal('subtotal', 15, 4)->default(0);
            $table->decimal('discount', 15, 4)->default(0);
            $table->decimal('tax', 15, 4)->default(0);
            $table->decimal('refund_total', 15, 4)->default(0);
            
            $table->decimal('customer_credit_amount', 15, 4)->default(0);
            $table->decimal('cash_refund_amount', 15, 4)->default(0);
            $table->decimal('exchange_difference', 15, 4)->default(0);
            
            $table->string('reason')->nullable();
            $table->text('notes')->nullable();
            
            $table->foreignId('processed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
            
            $table->timestamps();
            
            $table->unique(['company_id', 'return_number']);
            $table->unique(['company_id', 'idempotency_key']);
        });
        
        Schema::create('sales_return_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_return_id')->constrained('sales_returns')->onDelete('cascade');
            $table->foreignId('original_sale_item_id')->constrained('sale_items')->onDelete('cascade');
            
            $table->foreignId('original_product_variant_id')->constrained('product_variants')->onDelete('cascade');
            $table->foreignId('replacement_product_variant_id')->nullable()->constrained('product_variants')->onDelete('cascade');
            
            $table->string('sku_snapshot');
            $table->string('barcode_snapshot')->nullable();
            $table->string('product_name_snapshot');
            $table->string('variant_description_snapshot')->nullable();
            
            $table->decimal('original_unit_price', 15, 4)->default(0);
            $table->decimal('return_quantity', 15, 4)->default(0);
            $table->decimal('return_unit_price', 15, 4)->default(0);
            $table->decimal('discount', 15, 4)->default(0);
            $table->decimal('tax', 15, 4)->default(0);
            $table->decimal('refund_line_total', 15, 4)->default(0);
            
            $table->enum('condition', ['RESELLABLE', 'DAMAGED', 'DEFECTIVE', 'OPENED', 'UNSELLABLE'])->default('RESELLABLE');
            $table->enum('inventory_action', ['RESTORE', 'WRITE_OFF', 'PENDING_INSPECTION'])->default('RESTORE');
            $table->string('reason')->nullable();
            
            $table->decimal('replacement_quantity', 15, 4)->nullable();
            $table->decimal('replacement_unit_price', 15, 4)->nullable();
            $table->decimal('replacement_line_total', 15, 4)->nullable();
            
            $table->timestamps();
        });
        
        Schema::create('sales_return_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_return_id')->constrained('sales_returns')->onDelete('cascade');
            $table->string('payment_method'); // CASH, CARD, BKASH, CUSTOMER_CREDIT, etc.
            $table->decimal('amount', 15, 4)->default(0);
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_return_payments');
        Schema::dropIfExists('sales_return_items');
        Schema::dropIfExists('sales_returns');
    }
};
