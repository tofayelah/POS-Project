<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->decimal('points_balance', 15, 4)->default(0)->after('opening_balance');
        });

        Schema::create('customer_point_ledgers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('sale_id')->nullable()->constrained('sales')->nullOnDelete();
            $table->string('transaction_type', 50); // EARN, REDEEM, ADJUSTMENT, REVERSAL
            $table->decimal('points', 15, 4); // signed value
            $table->decimal('balance_before', 15, 4);
            $table->decimal('balance_after', 15, 4);
            $table->string('reference_number', 100)->nullable();
            $table->text('description')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['company_id', 'customer_id']);
            $table->index(['customer_id', 'created_at']);
            $table->index(['sale_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_point_ledgers');

        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('points_balance');
        });
    }
};
