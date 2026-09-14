<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->onDelete('cascade');
            $table->foreignId('business_unit_id')->nullable()->constrained('business_units')->onDelete('cascade');
            $table->foreignId('branch_id')->nullable()->constrained('branches')->onDelete('cascade');
            $table->foreignId('warehouse_id')->nullable()->constrained('warehouses')->onDelete('cascade');
            
            $table->foreignId('pos_terminal_id')->constrained('pos_terminals')->onDelete('cascade');
            $table->foreignId('cashier_id')->constrained('users')->onDelete('cascade');
            
            $table->string('session_number');
            $table->timestamp('opened_at')->useCurrent();
            $table->timestamp('closed_at')->nullable();
            
            $table->decimal('opening_cash', 15, 4)->default(0);
            $table->decimal('closing_cash', 15, 4)->nullable();
            $table->decimal('expected_cash', 15, 4)->nullable();
            $table->decimal('cash_difference', 15, 4)->nullable();
            
            $table->enum('status', ['OPEN', 'CLOSED'])->default('OPEN');
            $table->text('notes')->nullable();
            
            $table->foreignId('closed_by')->nullable()->constrained('users')->onDelete('set null');
            
            $table->timestamps();
            
            $table->unique(['company_id', 'session_number']);
            // Allow one OPEN session per terminal
            // $table->unique(['pos_terminal_id', 'status'])->where('status', 'OPEN'); // Might need raw SQL depending on DB, skip for now in migration but enforce in code
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_sessions');
    }
};
