<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sale_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained('sales')->onDelete('cascade');
            
            $table->string('payment_method'); // CASH, CARD, BKASH, NAGAD, BANK
            $table->decimal('amount', 15, 4);
            
            $table->string('reference')->nullable();
            $table->string('transaction_number')->nullable();
            $table->text('notes')->nullable();
            
            $table->foreignId('received_by')->nullable()->constrained('users')->onDelete('set null');
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_payments');
    }
};
