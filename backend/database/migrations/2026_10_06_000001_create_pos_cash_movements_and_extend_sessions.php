<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pos_sessions', function (Blueprint $table) {
            if (!Schema::hasColumn('pos_sessions', 'cash_in_total')) {
                $table->decimal('cash_in_total', 15, 4)->default(0)->after('cash_difference');
            }
            if (!Schema::hasColumn('pos_sessions', 'cash_out_total')) {
                $table->decimal('cash_out_total', 15, 4)->default(0)->after('cash_in_total');
            }
            if (!Schema::hasColumn('pos_sessions', 'cash_sales_total')) {
                $table->decimal('cash_sales_total', 15, 4)->default(0)->after('cash_out_total');
            }
            if (!Schema::hasColumn('pos_sessions', 'cash_refunds_total')) {
                $table->decimal('cash_refunds_total', 15, 4)->default(0)->after('cash_sales_total');
            }
            if (!Schema::hasColumn('pos_sessions', 'variance_status')) {
                $table->string('variance_status', 20)->nullable()->after('cash_refunds_total');
            }
            if (!Schema::hasColumn('pos_sessions', 'variance_approved_by')) {
                $table->foreignId('variance_approved_by')->nullable()->constrained('users')->nullOnDelete()->after('variance_status');
            }
            if (!Schema::hasColumn('pos_sessions', 'variance_approved_at')) {
                $table->timestamp('variance_approved_at')->nullable()->after('variance_approved_by');
            }
            if (!Schema::hasColumn('pos_sessions', 'denominations')) {
                $table->json('denominations')->nullable()->after('variance_approved_at');
            }
        });

        if (!Schema::hasTable('pos_cash_movements')) {
            Schema::create('pos_cash_movements', function (Blueprint $table) {
                $table->id();
                $table->foreignId('company_id')->constrained('companies')->onDelete('cascade');
                $table->foreignId('branch_id')->nullable()->constrained('branches')->onDelete('set null');
                $table->foreignId('pos_session_id')->constrained('pos_sessions')->onDelete('cascade');
                $table->foreignId('pos_terminal_id')->constrained('pos_terminals')->onDelete('cascade');
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                
                $table->string('movement_number', 50);
                $table->enum('type', ['CASH_IN', 'CASH_OUT', 'ADJUSTMENT']);
                $table->decimal('amount', 15, 4);
                $table->string('reason', 255);
                $table->string('reference', 100)->nullable();
                $table->string('idempotency_key', 100)->nullable();
                $table->text('notes')->nullable();
                
                $table->timestamps();
                
                $table->index(['company_id', 'pos_session_id']);
                $table->index(['pos_session_id', 'created_at']);
                $table->unique(['company_id', 'movement_number']);
            });
        }

        // Postgres partial unique index to prevent duplicate concurrent OPEN sessions
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("CREATE UNIQUE INDEX IF NOT EXISTS unique_active_pos_terminal_session ON pos_sessions (pos_terminal_id) WHERE status = 'OPEN';");
            DB::statement("CREATE UNIQUE INDEX IF NOT EXISTS unique_active_pos_cashier_session ON pos_sessions (cashier_id) WHERE status = 'OPEN';");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("DROP INDEX IF EXISTS unique_active_pos_terminal_session;");
            DB::statement("DROP INDEX IF EXISTS unique_active_pos_cashier_session;");
        }

        Schema::dropIfExists('pos_cash_movements');

        Schema::table('pos_sessions', function (Blueprint $table) {
            $columns = [
                'cash_in_total',
                'cash_out_total',
                'cash_sales_total',
                'cash_refunds_total',
                'variance_status',
                'variance_approved_by',
                'variance_approved_at',
                'denominations',
            ];
            foreach ($columns as $column) {
                if (Schema::hasColumn('pos_sessions', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
