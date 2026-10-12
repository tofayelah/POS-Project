<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            if (!Schema::hasColumn('suppliers', 'contact_designation')) {
                $table->string('contact_designation', 100)->nullable()->after('contact_person');
            }
            if (!Schema::hasColumn('suppliers', 'contact_phone')) {
                $table->string('contact_phone', 50)->nullable()->after('contact_designation');
            }
        });
    }

    public function down(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            if (Schema::hasColumn('suppliers', 'contact_designation')) {
                $table->dropColumn('contact_designation');
            }
            if (Schema::hasColumn('suppliers', 'contact_phone')) {
                $table->dropColumn('contact_phone');
            }
        });
    }
};
