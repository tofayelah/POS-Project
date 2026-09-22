<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('idempotency_key', 150)->nullable()->after('payment_number');
            $table->string('payload_hash', 64)->nullable()->after('idempotency_key');

            $table->unique(['company_id', 'idempotency_key'], 'payments_company_idempotency_unique');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropUnique('payments_company_idempotency_unique');
            $table->dropColumn(['payload_hash', 'idempotency_key']);
        });
    }
};
