<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('code', 50); // CASH, CARD, BKASH, NAGAD, BANK, POINT_REDEMPTION
            $table->string('type', 50)->default('CASH'); // CASH, CARD, MFS, BANK, POINT
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->foreignId('account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->timestamps();

            $table->unique(['company_id', 'code']);
            $table->index(['company_id', 'is_active']);
        });

        Schema::create('pos_terminal_payment_methods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pos_terminal_id')->constrained('pos_terminals')->cascadeOnDelete();
            $table->foreignId('payment_method_id')->constrained('payment_methods')->cascadeOnDelete();
            $table->boolean('is_enabled')->default(true);
            $table->timestamps();

            $table->unique(['pos_terminal_id', 'payment_method_id'], 'term_pm_unique');
        });

        Schema::table('pos_terminals', function (Blueprint $table) {
            $table->foreignId('default_cash_account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->foreignId('default_card_account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->foreignId('default_bkash_account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->foreignId('default_nagad_account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->foreignId('default_bank_account_id')->nullable()->constrained('accounts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pos_terminals', function (Blueprint $table) {
            $table->dropForeign(['default_cash_account_id']);
            $table->dropForeign(['default_card_account_id']);
            $table->dropForeign(['default_bkash_account_id']);
            $table->dropForeign(['default_nagad_account_id']);
            $table->dropForeign(['default_bank_account_id']);
            $table->dropColumn([
                'default_cash_account_id',
                'default_card_account_id',
                'default_bkash_account_id',
                'default_nagad_account_id',
                'default_bank_account_id',
            ]);
        });

        Schema::dropIfExists('pos_terminal_payment_methods');
        Schema::dropIfExists('payment_methods');
    }
};
