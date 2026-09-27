<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            if (!Schema::hasColumn('companies', 'website')) {
                $table->string('website')->nullable()->after('email');
            }
            if (!Schema::hasColumn('companies', 'vat_registration')) {
                $table->string('vat_registration', 100)->nullable()->after('address');
            }
            if (!Schema::hasColumn('companies', 'tax_number')) {
                $table->string('tax_number', 100)->nullable()->after('vat_registration');
            }
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            if (Schema::hasColumn('companies', 'tax_number')) {
                $table->dropColumn('tax_number');
            }
            if (Schema::hasColumn('companies', 'vat_registration')) {
                $table->dropColumn('vat_registration');
            }
            if (Schema::hasColumn('companies', 'website')) {
                $table->dropColumn('website');
            }
        });
    }
};
