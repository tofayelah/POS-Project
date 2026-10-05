<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_credit_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->string('status', 20)->default('ACTIVE'); // ACTIVE, SUSPENDED, CLOSED
            $table->decimal('current_balance', 15, 4)->default(0.0000);
            $table->timestamps();

            $table->unique(['company_id', 'customer_id'], 'store_credit_acc_comp_cust_uq');
            $table->index(['company_id', 'status']);
        });

        Schema::create('store_credit_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('store_credit_account_id')->constrained('store_credit_accounts')->cascadeOnDelete();
            $table->string('type', 50); // ISSUE, REDEEM, REFUND, ADJUSTMENT, REVERSAL, EXPIRY
            $table->decimal('amount', 15, 4); // signed: positive for credit addition, negative for deduction
            $table->decimal('balance_before', 15, 4);
            $table->decimal('balance_after', 15, 4);
            $table->string('reference_type', 100)->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->string('reference_number', 100)->nullable();
            $table->text('description')->nullable();
            $table->dateTime('expires_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['company_id', 'customer_id'], 'sc_trans_comp_cust_idx');
            $table->index(['store_credit_account_id', 'created_at'], 'sc_trans_acc_created_idx');
            $table->index(['reference_type', 'reference_id'], 'sc_trans_ref_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_credit_transactions');
        Schema::dropIfExists('store_credit_accounts');
    }
};
