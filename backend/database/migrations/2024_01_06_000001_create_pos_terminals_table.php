<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_terminals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->onDelete('cascade');
            $table->foreignId('business_unit_id')->nullable()->constrained('business_units')->onDelete('cascade');
            $table->foreignId('branch_id')->nullable()->constrained('branches')->onDelete('cascade');
            $table->foreignId('warehouse_id')->nullable()->constrained('warehouses')->onDelete('cascade');
            
            $table->string('terminal_code');
            $table->string('terminal_name');
            $table->enum('status', ['ACTIVE', 'INACTIVE'])->default('ACTIVE');
            
            $table->text('receipt_header')->nullable();
            $table->text('receipt_footer')->nullable();
            
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
            
            $table->timestamps();
            
            $table->unique(['company_id', 'terminal_code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_terminals');
    }
};
