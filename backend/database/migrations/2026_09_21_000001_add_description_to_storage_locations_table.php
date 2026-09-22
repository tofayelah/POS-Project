<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('storage_locations', function (Blueprint $table) {
            if (!Schema::hasColumn('storage_locations', 'description')) {
                $table->text('description')->nullable()->after('name');
            }
        });
    }

    public function down(): void {
        Schema::table('storage_locations', function (Blueprint $table) {
            if (Schema::hasColumn('storage_locations', 'description')) {
                $table->dropColumn('description');
            }
        });
    }
};
