<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Extend customers table with Phase 8 commercial, tax, classification, and RFM fields
        Schema::table('customers', function (Blueprint $table) {
            $table->string('company_name')->nullable()->after('name');
            $table->string('contact_person')->nullable()->after('company_name');
            $table->string('customer_type', 30)->default('RETAIL')->after('customer_group_id'); // RETAIL, WHOLESALE, CORPORATE
            $table->text('billing_address')->nullable()->after('address');
            $table->text('shipping_address')->nullable()->after('billing_address');
            $table->string('bin_number', 50)->nullable()->after('country'); // Bangladesh Business Identification Number (VAT)
            $table->string('tin_number', 50)->nullable()->after('bin_number'); // Taxpayer Identification Number
            $table->integer('credit_days')->default(0)->after('credit_limit'); // Payment terms in days
            $table->string('credit_status', 20)->default('ACTIVE')->after('credit_days'); // ACTIVE, ON_HOLD, BLOCKED
            $table->text('credit_hold_reason')->nullable()->after('credit_status');
            $table->foreignId('credit_approved_by')->nullable()->after('credit_hold_reason')->constrained('users')->nullOnDelete();
            $table->dateTime('credit_approved_at')->nullable()->after('credit_approved_by');

            // RFM and Segmentation snapshots
            $table->integer('rfm_recency_score')->default(1)->after('credit_approved_at');
            $table->integer('rfm_frequency_score')->default(1)->after('rfm_recency_score');
            $table->integer('rfm_monetary_score')->default(1)->after('rfm_frequency_score');
            $table->string('rfm_composite_score', 10)->nullable()->after('rfm_monetary_score');
            $table->string('rfm_segment', 50)->default('NEW_CUSTOMERS')->after('rfm_composite_score');
            $table->dateTime('rfm_calculated_at')->nullable()->after('rfm_segment');

            $table->index(['company_id', 'customer_type']);
            $table->index(['company_id', 'credit_status']);
            $table->index(['company_id', 'rfm_segment']);
        });

        // 2. Customer Credit Limit Requests (Approval Workflow)
        Schema::create('customer_credit_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->decimal('requested_credit_limit', 15, 4);
            $table->integer('requested_credit_days')->default(0);
            $table->decimal('current_credit_limit', 15, 4)->default(0);
            $table->integer('current_credit_days')->default(0);
            $table->text('reason');
            $table->text('risk_notes')->nullable();
            $table->string('status', 30)->default('PENDING'); // PENDING, APPROVED, REJECTED, SUSPENDED
            $table->foreignId('requested_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('reviewed_at')->nullable();
            $table->text('review_notes')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'customer_id']);
            $table->index(['company_id', 'status']);
        });

        // 3. Customer Credit Overrides (Exception / Override log with audit trails)
        Schema::create('customer_credit_overrides', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('sale_id')->nullable()->constrained('sales')->nullOnDelete();
            $table->decimal('previous_available_credit', 15, 4);
            $table->decimal('requested_exposure', 15, 4);
            $table->decimal('approved_exposure', 15, 4);
            $table->text('override_reason');
            $table->foreignId('approved_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index(['company_id', 'customer_id']);
            $table->index(['company_id', 'created_at']);
        });

        // 4. CRM Activities and Follow-ups
        Schema::create('customer_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->string('activity_type', 30); // CALL, MEETING, VISIT, EMAIL, MESSAGE, FOLLOW_UP, NOTE, TASK
            $table->string('subject');
            $table->text('description')->nullable();
            $table->dateTime('activity_at');
            $table->string('status', 30)->default('OPEN'); // OPEN, IN_PROGRESS, COMPLETED, CANCELLED, OVERDUE
            $table->string('priority', 20)->default('MEDIUM'); // LOW, MEDIUM, HIGH, URGENT
            $table->dateTime('next_action_date')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('completed_at')->nullable();
            $table->text('completion_notes')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'customer_id']);
            $table->index(['company_id', 'activity_type']);
            $table->index(['company_id', 'status']);
            $table->index(['company_id', 'next_action_date']);
            $table->index(['company_id', 'assigned_to']);
        });

        // 5. Customer Complaints and Service Requests
        Schema::create('customer_complaints', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->string('complaint_number', 50);
            $table->string('category', 50); // PRODUCT_QUALITY, BILLING, SERVICE, DELIVERY, STAFF_BEHAVIOR, OTHER
            $table->string('subject');
            $table->text('description');
            $table->string('priority', 20)->default('MEDIUM'); // LOW, MEDIUM, HIGH, URGENT
            $table->string('status', 30)->default('OPEN'); // OPEN, IN_PROGRESS, RESOLVED, CLOSED
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->text('resolution')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('resolved_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['company_id', 'complaint_number']);
            $table->index(['company_id', 'customer_id']);
            $table->index(['company_id', 'status']);
        });

        // 6. Customer Sales Opportunities
        Schema::create('customer_opportunities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->string('title');
            $table->string('stage', 30)->default('NEW'); // NEW, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST
            $table->decimal('estimated_value', 15, 4)->default(0);
            $table->integer('probability')->default(50); // 0-100 percentage
            $table->date('expected_close_date')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->text('lost_reason')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['company_id', 'customer_id']);
            $table->index(['company_id', 'stage']);
        });

        // 7. Extend sales table with salesperson attribution and invoice due_date
        Schema::table('sales', function (Blueprint $table) {
            $table->foreignId('salesperson_id')->nullable()->after('cashier_id')->constrained('users')->nullOnDelete();
            $table->date('due_date')->nullable()->after('sale_date');

            $table->index(['company_id', 'salesperson_id']);
            $table->index(['company_id', 'due_date']);
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropForeign(['salesperson_id']);
            $table->dropColumn(['salesperson_id', 'due_date']);
        });

        Schema::dropIfExists('customer_opportunities');
        Schema::dropIfExists('customer_complaints');
        Schema::dropIfExists('customer_activities');
        Schema::dropIfExists('customer_credit_overrides');
        Schema::dropIfExists('customer_credit_requests');

        Schema::table('customers', function (Blueprint $table) {
            $table->dropForeign(['credit_approved_by']);
            $table->dropColumn([
                'company_name',
                'contact_person',
                'customer_type',
                'billing_address',
                'shipping_address',
                'bin_number',
                'tin_number',
                'credit_days',
                'credit_status',
                'credit_hold_reason',
                'credit_approved_by',
                'credit_approved_at',
                'rfm_recency_score',
                'rfm_frequency_score',
                'rfm_monetary_score',
                'rfm_composite_score',
                'rfm_segment',
                'rfm_calculated_at'
            ]);
        });
    }
};
