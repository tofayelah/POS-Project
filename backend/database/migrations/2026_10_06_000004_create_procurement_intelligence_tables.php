<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Extend Suppliers table
        Schema::table('suppliers', function (Blueprint $table) {
            $table->string('qualification_status', 30)->default('QUALIFIED')->after('status');
            $table->string('supplier_type', 50)->nullable()->after('qualification_status');
            $table->string('legal_name')->nullable()->after('name');
            $table->string('trade_license_no', 100)->nullable()->after('tax_number');
            $table->string('bin_vat_no', 100)->nullable()->after('trade_license_no');
            $table->string('tin_no', 100)->nullable()->after('bin_vat_no');
            $table->string('risk_rating', 20)->default('LOW')->after('credit_limit');
            $table->integer('agreed_lead_time_days')->default(7)->after('payment_terms');
            $table->decimal('min_order_value', 15, 4)->default(0)->after('agreed_lead_time_days');
            $table->decimal('min_order_qty', 15, 4)->default(0)->after('min_order_value');
            $table->text('block_reason')->nullable()->after('notes');
            $table->decimal('score_cached', 5, 2)->nullable()->after('block_reason');
            $table->timestamp('last_evaluated_at')->nullable()->after('score_cached');
            $table->text('qualification_notes')->nullable()->after('last_evaluated_at');
            $table->timestamp('qualified_at')->nullable()->after('qualification_notes');
            $table->foreignId('qualified_by')->nullable()->after('qualified_at')->constrained('users')->nullOnDelete();

            $table->index(['company_id', 'qualification_status']);
        });

        // 2. Purchase Requisitions
        Schema::create('purchase_requisitions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('business_unit_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('warehouse_id')->constrained()->restrictOnDelete();

            $table->string('requisition_no', 50);
            $table->string('title')->nullable();
            $table->string('status', 30)->default('DRAFT'); // DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, CONVERTED, CANCELLED
            $table->string('priority', 20)->default('MEDIUM'); // LOW, MEDIUM, HIGH, URGENT
            $table->date('required_date')->nullable();
            $table->decimal('estimated_total_cost', 15, 4)->default(0);
            $table->text('notes')->nullable();
            $table->text('rejection_reason')->nullable();

            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('rejected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('rejected_at')->nullable();

            $table->string('converted_to_type', 20)->nullable(); // PO, RFQ
            $table->unsignedBigInteger('converted_to_id')->nullable();
            $table->timestamp('converted_at')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'requisition_no']);
            $table->index(['company_id', 'status']);
            $table->index(['company_id', 'warehouse_id']);
        });

        // 3. Purchase Requisition Items
        Schema::create('purchase_requisition_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_requisition_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('product_variant_id')->constrained()->restrictOnDelete();
            $table->foreignId('preferred_supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();

            $table->decimal('requested_quantity', 15, 4);
            $table->decimal('estimated_unit_cost', 15, 4)->default(0);
            $table->decimal('estimated_total_cost', 15, 4)->default(0);
            $table->decimal('converted_quantity', 15, 4)->default(0);
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index('purchase_requisition_id');
            $table->index('product_variant_id');
        });

        // 4. Requests for Quotation (RFQs)
        Schema::create('rfqs', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('purchase_requisition_id')->nullable()->constrained()->nullOnDelete();

            $table->string('rfq_number', 50);
            $table->string('title');
            $table->string('status', 30)->default('DRAFT'); // DRAFT, SENT, UNDER_EVALUATION, AWARDED, CANCELLED, CLOSED
            $table->date('issue_date');
            $table->date('deadline_date')->nullable();
            $table->date('target_delivery_date')->nullable();
            $table->text('notes')->nullable();

            $table->foreignId('awarded_supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->unsignedBigInteger('awarded_quotation_id')->nullable();
            $table->foreignId('awarded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('awarded_at')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'rfq_number']);
            $table->index(['company_id', 'status']);
        });

        // 5. RFQ Items
        Schema::create('rfq_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rfq_id')->constrained('rfqs')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('product_variant_id')->constrained()->restrictOnDelete();

            $table->decimal('requested_quantity', 15, 4);
            $table->decimal('target_unit_price', 15, 4)->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index('rfq_id');
            $table->index('product_variant_id');
        });

        // 6. RFQ Invited Suppliers
        Schema::create('rfq_invited_suppliers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rfq_id')->constrained('rfqs')->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained()->cascadeOnDelete();
            $table->string('status', 30)->default('INVITED'); // INVITED, RESPONDED, DECLINED
            $table->timestamp('invited_at')->nullable();
            $table->timestamps();

            $table->unique(['rfq_id', 'supplier_id']);
        });

        // 7. Supplier Quotations
        Schema::create('supplier_quotations', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('rfq_id')->constrained('rfqs')->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained()->restrictOnDelete();

            $table->string('quotation_number', 50);
            $table->date('quotation_date');
            $table->date('validity_date')->nullable();
            $table->integer('lead_time_days')->default(7);
            $table->string('payment_terms')->nullable();
            $table->string('currency', 10)->default('BDT');

            $table->decimal('subtotal', 15, 4)->default(0);
            $table->decimal('discount_total', 15, 4)->default(0);
            $table->decimal('tax_total', 15, 4)->default(0);
            $table->decimal('grand_total', 15, 4)->default(0);

            $table->string('status', 30)->default('SUBMITTED'); // SUBMITTED, ACCEPTED, REJECTED
            $table->boolean('is_awarded')->default(false);
            $table->text('evaluation_notes')->nullable();

            $table->foreignId('awarded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('awarded_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            $table->unique(['company_id', 'rfq_id', 'supplier_id', 'quotation_number'], 'sq_unique_quote');
            $table->index(['company_id', 'rfq_id']);
            $table->index('supplier_id');
        });

        // 8. Supplier Quotation Items
        Schema::create('supplier_quotation_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_quotation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('rfq_item_id')->nullable()->constrained('rfq_items')->nullOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('product_variant_id')->constrained()->restrictOnDelete();

            $table->decimal('quantity', 15, 4);
            $table->decimal('unit_price', 15, 4);
            $table->decimal('discount', 15, 4)->default(0);
            $table->decimal('tax', 15, 4)->default(0);
            $table->decimal('line_total', 15, 4);
            $table->integer('lead_time_days')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index('supplier_quotation_id');
            $table->index('product_variant_id');
        });

        // 9. Supplier Contracts
        Schema::create('supplier_contracts', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained()->restrictOnDelete();

            $table->string('contract_number', 50);
            $table->string('title');
            $table->string('status', 30)->default('DRAFT'); // DRAFT, ACTIVE, EXPIRED, TERMINATED
            $table->date('start_date');
            $table->date('end_date');
            $table->string('payment_terms')->nullable();
            $table->decimal('min_spend_commitment', 15, 4)->default(0);
            $table->decimal('max_spend_limit', 15, 4)->default(0);
            $table->decimal('contract_value', 15, 4)->default(0);
            $table->text('notes')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'contract_number']);
            $table->index(['company_id', 'supplier_id', 'status']);
        });

        // 10. Supplier Price Agreements
        Schema::create('supplier_price_agreements', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained()->restrictOnDelete();
            $table->foreignId('supplier_contract_id')->nullable()->constrained('supplier_contracts')->nullOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('product_variant_id')->constrained()->restrictOnDelete();

            $table->decimal('agreed_unit_price', 15, 4);
            $table->decimal('min_order_quantity', 15, 4)->default(1);
            $table->integer('lead_time_days')->default(7);
            $table->date('effective_date');
            $table->date('expiry_date')->nullable();
            $table->string('status', 30)->default('ACTIVE'); // ACTIVE, INACTIVE
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['company_id', 'supplier_id', 'product_variant_id'], 'spa_supplier_variant_idx');
            $table->index(['company_id', 'status']);
        });

        // 11. Extend Purchase Orders table with procurement intelligence references
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->foreignId('purchase_requisition_id')->nullable()->after('supplier_id')->constrained('purchase_requisitions')->nullOnDelete();
            $table->foreignId('supplier_contract_id')->nullable()->after('purchase_requisition_id')->constrained('supplier_contracts')->nullOnDelete();
            $table->foreignId('rfq_id')->nullable()->after('supplier_contract_id')->constrained('rfqs')->nullOnDelete();
            $table->foreignId('supplier_quotation_id')->nullable()->after('rfq_id')->constrained('supplier_quotations')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropForeign(['purchase_requisition_id']);
            $table->dropForeign(['supplier_contract_id']);
            $table->dropForeign(['rfq_id']);
            $table->dropForeign(['supplier_quotation_id']);
            $table->dropColumn(['purchase_requisition_id', 'supplier_contract_id', 'rfq_id', 'supplier_quotation_id']);
        });

        Schema::dropIfExists('supplier_price_agreements');
        Schema::dropIfExists('supplier_contracts');
        Schema::dropIfExists('supplier_quotation_items');
        Schema::dropIfExists('supplier_quotations');
        Schema::dropIfExists('rfq_invited_suppliers');
        Schema::dropIfExists('rfq_items');
        Schema::dropIfExists('rfqs');
        Schema::dropIfExists('purchase_requisition_items');
        Schema::dropIfExists('purchase_requisitions');

        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropForeign(['qualified_by']);
            $table->dropColumn([
                'qualification_status',
                'supplier_type',
                'legal_name',
                'trade_license_no',
                'bin_vat_no',
                'tin_no',
                'risk_rating',
                'agreed_lead_time_days',
                'min_order_value',
                'min_order_qty',
                'block_reason',
                'score_cached',
                'last_evaluated_at',
                'qualification_notes',
                'qualified_at',
                'qualified_by',
            ]);
        });
    }
};
