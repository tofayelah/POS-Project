<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Saved Custom BI Reports & Scheduled Reports
        Schema::create('bi_saved_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('dataset'); // sales, profitability, inventory, procurement, customer, supplier, finance, pos, ecommerce, hr
            $table->json('dimensions');
            $table->json('metrics');
            $table->json('filters')->nullable();
            $table->json('group_by')->nullable();
            $table->string('sort_by')->nullable();
            $table->string('sort_direction')->default('desc');
            $table->string('chart_type')->default('table'); // table, bar, line, pie, area
            $table->boolean('is_public')->default(false);
            $table->string('schedule_frequency')->nullable(); // DAILY, WEEKLY, MONTHLY
            $table->json('schedule_recipients')->nullable();
            $table->timestamp('last_run_at')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'dataset']);
            $table->index(['company_id', 'user_id']);
        });

        // 2. BI Management Alerts
        Schema::create('bi_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('code')->index();
            $table->string('title');
            $table->string('metric');
            $table->string('severity')->default('WARNING'); // INFO, WARNING, CRITICAL
            $table->string('threshold_type')->default('MIN'); // MIN, MAX, PCT_DROP, PCT_RISE
            $table->decimal('threshold_value', 15, 4);
            $table->decimal('current_value', 15, 4)->nullable();
            $table->text('message');
            $table->string('status')->default('ACTIVE'); // ACTIVE, ACKNOWLEDGED, RESOLVED
            $table->timestamp('acknowledged_at')->nullable();
            $table->foreignId('acknowledged_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'status']);
            $table->index(['company_id', 'severity']);
        });

        // 3. User Dashboard Personalization Preferences
        Schema::create('bi_dashboard_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('dashboard_key'); // executive, sales, finance, inventory, etc.
            $table->json('widget_order')->nullable();
            $table->json('hidden_widgets')->nullable();
            $table->json('custom_filters')->nullable();
            $table->timestamps();

            $table->unique(['company_id', 'user_id', 'dashboard_key'], 'bi_dash_pref_user_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bi_dashboard_preferences');
        Schema::dropIfExists('bi_alerts');
        Schema::dropIfExists('bi_saved_reports');
    }
};
