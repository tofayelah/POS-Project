<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            if (!Schema::hasColumn('settings', 'branch_id')) {
                $table->foreignId('branch_id')->nullable()->after('company_id')->constrained('branches')->nullOnDelete();
            }
            if (!Schema::hasColumn('settings', 'description')) {
                $table->text('description')->nullable()->after('type');
            }
            if (!Schema::hasColumn('settings', 'is_system')) {
                $table->boolean('is_system')->default(false)->after('description');
            }
            if (!Schema::hasColumn('settings', 'is_editable')) {
                $table->boolean('is_editable')->default(true)->after('is_system');
            }
            if (!Schema::hasColumn('settings', 'created_by')) {
                $table->foreignId('created_by')->nullable()->after('is_editable')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('settings', 'updated_by')) {
                $table->foreignId('updated_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            }

            // Drop original company-wide unique constraint to allow branch overrides
            $table->dropUnique('settings_company_id_group_key_unique');

            $table->index(['company_id', 'group']);
            $table->index(['company_id', 'key']);
            $table->index('branch_id');
        });

        // Add PostgreSQL partial unique indexes for company global vs branch-scoped settings
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS settings_company_global_unique ON settings (company_id, "group", key) WHERE branch_id IS NULL');
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS settings_company_branch_unique ON settings (company_id, branch_id, "group", key) WHERE branch_id IS NOT NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS settings_company_global_unique');
        DB::statement('DROP INDEX IF EXISTS settings_company_branch_unique');

        Schema::table('settings', function (Blueprint $table) {
            $table->dropIndex(['company_id', 'group']);
            $table->dropIndex(['company_id', 'key']);
            $table->dropIndex(['branch_id']);
            if (Schema::hasColumn('settings', 'branch_id')) {
                $table->dropConstrainedForeignId('branch_id');
            }
            if (Schema::hasColumn('settings', 'created_by')) {
                $table->dropConstrainedForeignId('created_by');
            }
            if (Schema::hasColumn('settings', 'updated_by')) {
                $table->dropConstrainedForeignId('updated_by');
            }
            $table->dropColumn(array_filter([
                Schema::hasColumn('settings', 'description') ? 'description' : null,
                Schema::hasColumn('settings', 'is_system') ? 'is_system' : null,
                Schema::hasColumn('settings', 'is_editable') ? 'is_editable' : null,
            ]));

            $table->unique(['company_id', 'group', 'key'], 'settings_company_id_group_key_unique');
        });
    }
};
