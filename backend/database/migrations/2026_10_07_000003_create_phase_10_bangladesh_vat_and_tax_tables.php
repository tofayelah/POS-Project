<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. Extend existing tax_categories table if columns are missing
        if (Schema::hasTable('tax_categories')) {
            Schema::table('tax_categories', function (Blueprint $table) {
                if (!Schema::hasColumn('tax_categories', 'code')) {
                    $table->string('code')->nullable()->after('name');
                }
                if (!Schema::hasColumn('tax_categories', 'is_active')) {
                    $table->boolean('is_active')->default(true)->after('description');
                }
            });
        }

        // 2. Tax Profiles (Company / Unit / Branch Tax Registrations & NBR Profile)
        if (!Schema::hasTable('tax_profiles')) {
            Schema::create('tax_profiles', function (Blueprint $table) {
                $table->id();
                $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
                $table->foreignId('business_unit_id')->nullable()->constrained('business_units')->nullOnDelete();
                $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
                $table->string('legal_name');
                $table->string('trade_name');
                $table->string('bin', 50)->comment('13-digit or 9-digit Business Identification Number');
                $table->string('tin', 50)->comment('12-digit Taxpayer Identification Number');
                $table->string('vat_registration_number', 50)->nullable();
                $table->string('turnover_tax_enrollment_number', 50)->nullable();
                $table->string('taxpayer_type', 50)->default('VAT_REGISTERED')
                    ->comment('VAT_REGISTERED, TURNOVER_TAX, EXEMPT, NON_REGISTERED, OTHER');
                $table->string('tax_jurisdiction', 50)->default('Bangladesh');
                $table->string('tax_circle', 100)->nullable();
                $table->string('tax_zone', 100)->nullable();
                $table->string('commissionerate', 150)->nullable();
                $table->date('effective_from');
                $table->date('effective_to')->nullable();
                $table->string('status', 30)->default('ACTIVE')->comment('ACTIVE, INACTIVE');
                $table->text('address')->nullable();
                $table->string('contact_email', 150)->nullable();
                $table->string('contact_phone', 50)->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index(['company_id', 'status']);
                $table->index(['company_id', 'bin']);
            });
        }

        // 3. Tax Registrations (Certificates & Statutory Registrations)
        if (!Schema::hasTable('tax_registrations')) {
            Schema::create('tax_registrations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
                $table->foreignId('tax_profile_id')->nullable()->constrained('tax_profiles')->cascadeOnDelete();
                $table->string('registration_type', 50)->comment('VAT, TURNOVER_TAX, INCOME_TAX, CUSTOMS_BIN, OTHER');
                $table->string('registration_number', 100);
                $table->string('issuing_authority', 150)->default('National Board of Revenue (NBR)');
                $table->string('source_reference', 150)->nullable();
                $table->date('issue_date');
                $table->date('effective_date');
                $table->date('expiry_date')->nullable();
                $table->string('status', 30)->default('ACTIVE')->comment('ACTIVE, SUSPENDED, EXPIRED, CANCELLED');
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index(['company_id', 'registration_type']);
            });
        }

        // 4. Tax Rules (Effective-dated Tax Rates & Calculation Methods)
        if (!Schema::hasTable('tax_rules')) {
            Schema::create('tax_rules', function (Blueprint $table) {
                $table->id();
                $table->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete();
                $table->foreignId('tax_category_id')->constrained('tax_categories')->restrictOnDelete();
                $table->string('code', 50);
                $table->string('name', 150);
                $table->text('description')->nullable();
                $table->decimal('rate', 8, 4)->default(0);
                $table->string('calculation_method', 50)->default('PERCENTAGE')
                    ->comment('PERCENTAGE, FIXED, COMPOUND_PERCENTAGE, CONFIGURED');
                $table->string('base_method', 50)->default('NET_AMOUNT')
                    ->comment('NET_AMOUNT, GROSS_AMOUNT, ASSESSMENT_VALUE, PREVIOUS_COMPONENTS');
                $table->boolean('inclusive_allowed')->default(true);
                $table->boolean('exclusive_allowed')->default(true);
                $table->integer('priority')->default(1);
                $table->date('effective_from');
                $table->date('effective_to')->nullable();
                $table->string('legal_reference', 255)->nullable()
                    ->comment('e.g. VAT and Supplementary Duty Act 2012, Sec 15(3)');
                $table->string('status', 30)->default('ACTIVE')->comment('ACTIVE, INACTIVE, SUPERSEDED');
                $table->timestamps();
                $table->softDeletes();

                $table->index(['company_id', 'code']);
                $table->index(['tax_category_id', 'status']);
                $table->index(['effective_from', 'effective_to']);
            });
        }

        // 5. Tax Components (Compound Multi-Component Breakdown: VAT, SD, AT, WHT)
        if (!Schema::hasTable('tax_components')) {
            Schema::create('tax_components', function (Blueprint $table) {
                $table->id();
                $table->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete();
                $table->foreignId('tax_rule_id')->constrained('tax_rules')->cascadeOnDelete();
                $table->string('code', 50)->comment('VAT, SD, AT, WHT');
                $table->string('name', 150);
                $table->string('type', 50)->comment('OUTPUT_VAT, INPUT_VAT, SUPPLEMENTARY_DUTY, WITHHOLDING_TAX, ADVANCE_TAX, OTHER');
                $table->decimal('rate', 8, 4)->default(0);
                $table->integer('sequence')->default(1);
                $table->foreignId('account_id')->nullable()->constrained('accounts')->nullOnDelete();
                $table->string('legal_reference', 255)->nullable();
                $table->timestamps();

                $table->index(['tax_rule_id', 'sequence']);
            });
        }

        // 6. Tax Periods (Monthly / Quarterly Tax Audit & Filing Periods)
        if (!Schema::hasTable('tax_periods')) {
            Schema::create('tax_periods', function (Blueprint $table) {
                $table->id();
                $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
                $table->string('period_name', 100);
                $table->date('period_start');
                $table->date('period_end');
                $table->string('status', 30)->default('OPEN')
                    ->comment('OPEN, UNDER_REVIEW, ADJUSTMENT, FINALIZED, FILED, CLOSED');
                $table->timestamp('locked_at')->nullable();
                $table->foreignId('locked_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('filed_at')->nullable();
                $table->foreignId('filed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->string('filing_reference', 150)->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->unique(['company_id', 'period_start', 'period_end'], 'tax_period_company_dates_unique');
                $table->index(['company_id', 'status']);
            });
        }

        // 7. Tax Transactions (Authoritative Tax Subledger)
        if (!Schema::hasTable('tax_transactions')) {
            Schema::create('tax_transactions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
                $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
                $table->foreignId('tax_period_id')->nullable()->constrained('tax_periods')->nullOnDelete();
                $table->string('transaction_type', 50)
                    ->comment('SALE_OUTPUT, PURCHASE_INPUT, SALE_RETURN_REVERSAL, PURCHASE_RETURN_REVERSAL, EXPENSE_INPUT, PAYROLL_WITHHOLDING, TAX_ADJUSTMENT, TAX_SETTLEMENT, IMPORT_TAX');
                $table->string('source_type', 150);
                $table->unsignedBigInteger('source_id');
                $table->foreignId('tax_rule_id')->nullable()->constrained('tax_rules')->nullOnDelete();
                $table->foreignId('tax_category_id')->nullable()->constrained('tax_categories')->nullOnDelete();
                $table->string('document_number', 100);
                $table->date('document_date');
                $table->decimal('taxable_amount', 18, 4)->default(0);
                $table->decimal('tax_amount', 18, 4)->default(0);
                $table->decimal('sd_amount', 18, 4)->default(0);
                $table->decimal('at_amount', 18, 4)->default(0);
                $table->decimal('withholding_amount', 18, 4)->default(0);
                $table->decimal('total_tax_amount', 18, 4)->default(0);
                $table->boolean('is_inclusive')->default(false);
                $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
                $table->string('status', 30)->default('POSTED')->comment('POSTED, ADJUSTED, REVERSED, VOID');
                $table->string('legal_reference', 255)->nullable();
                $table->json('metadata')->nullable()->comment('Snapshot of rule, rate, calculations, customer/supplier BIN/TIN');
                $table->timestamp('posted_at');
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index(['company_id', 'transaction_type', 'document_date'], 'tax_trans_company_type_date_idx');
                $table->index(['source_type', 'source_id'], 'tax_trans_source_idx');
                $table->index(['tax_period_id', 'status'], 'tax_trans_period_status_idx');
            });
        }

        // 8. Tax Transaction Components (Detailed Component Breakdown)
        if (!Schema::hasTable('tax_transaction_components')) {
            Schema::create('tax_transaction_components', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tax_transaction_id')->constrained('tax_transactions')->cascadeOnDelete();
                $table->string('component_code', 50);
                $table->string('component_name', 150);
                $table->string('tax_type', 50)->comment('OUTPUT_VAT, INPUT_VAT, SUPPLEMENTARY_DUTY, WITHHOLDING_TAX, ADVANCE_TAX');
                $table->decimal('rate', 8, 4)->default(0);
                $table->decimal('taxable_base', 18, 4)->default(0);
                $table->decimal('tax_amount', 18, 4)->default(0);
                $table->foreignId('account_id')->nullable()->constrained('accounts')->nullOnDelete();
                $table->string('legal_reference', 255)->nullable();
                $table->timestamps();

                $table->index(['tax_transaction_id', 'tax_type'], 'tax_comp_trans_type_idx');
            });
        }

        // 9. Tax Adjustments (Credit/Debit Notes, NBR Adjustments, Rounding)
        if (!Schema::hasTable('tax_adjustments')) {
            Schema::create('tax_adjustments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
                $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
                $table->foreignId('tax_period_id')->constrained('tax_periods')->restrictOnDelete();
                $table->string('adjustment_number', 50);
                $table->string('adjustment_type', 50)
                    ->comment('OUTPUT_VAT_INCREASE, OUTPUT_VAT_DECREASE, INPUT_VAT_INCREASE, INPUT_VAT_DECREASE, ROUNDING, CREDIT_NOTE, DEBIT_NOTE, OTHER');
                $table->text('reason');
                $table->decimal('amount', 18, 4)->default(0);
                $table->decimal('tax_amount', 18, 4)->default(0);
                $table->string('legal_reference', 255)->nullable();
                $table->foreignId('source_tax_transaction_id')->nullable()->constrained('tax_transactions')->nullOnDelete();
                $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
                $table->string('status', 30)->default('DRAFT')->comment('DRAFT, APPROVED, POSTED, REJECTED');
                $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('approved_at')->nullable();
                $table->foreignId('posted_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('posted_at')->nullable();
                $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
                $table->timestamps();

                $table->unique(['company_id', 'adjustment_number'], 'tax_adj_company_number_unique');
                $table->index(['company_id', 'status']);
            });
        }

        // 10. Tax Reconciliations (Subledger vs General Ledger Verification)
        if (!Schema::hasTable('tax_reconciliations')) {
            Schema::create('tax_reconciliations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
                $table->foreignId('tax_period_id')->constrained('tax_periods')->restrictOnDelete();
                $table->string('reconciliation_number', 50);
                $table->date('reconciled_date');
                $table->decimal('output_vat_subledger', 18, 4)->default(0);
                $table->decimal('output_vat_gl', 18, 4)->default(0);
                $table->decimal('output_vat_difference', 18, 4)->default(0);
                $table->decimal('input_vat_subledger', 18, 4)->default(0);
                $table->decimal('input_vat_gl', 18, 4)->default(0);
                $table->decimal('input_vat_difference', 18, 4)->default(0);
                $table->decimal('adjustments_total', 18, 4)->default(0);
                $table->decimal('net_tax_payable', 18, 4)->default(0);
                $table->string('status', 30)->default('PENDING_REVIEW')
                    ->comment('RECONCILED, EXCEPTION, PENDING_REVIEW');
                $table->json('exceptions')->nullable()->comment('Detailed list of tax mismatches and GL discrepancies');
                $table->foreignId('reconciled_by')->nullable()->constrained('users')->nullOnDelete();
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->unique(['company_id', 'tax_period_id'], 'tax_recon_company_period_unique');
                $table->index(['company_id', 'status']);
            });
        }

        // 11. Extend Products with Tax Classification
        if (Schema::hasTable('products') && !Schema::hasColumn('products', 'tax_category_id')) {
            Schema::table('products', function (Blueprint $table) {
                $table->foreignId('tax_category_id')->nullable()->after('tax_rate')
                    ->constrained('tax_categories')->nullOnDelete();
            });
        }

        // 12. Extend Customers with Tax Status & Exemption
        if (Schema::hasTable('customers')) {
            Schema::table('customers', function (Blueprint $table) {
                if (!Schema::hasColumn('customers', 'tax_status')) {
                    $table->string('tax_status', 30)->default('TAXABLE')->after('tin_number')
                        ->comment('TAXABLE, ZERO_RATED, EXEMPT, WITHHOLDING_AGENT');
                }
                if (!Schema::hasColumn('customers', 'tax_exemption_number')) {
                    $table->string('tax_exemption_number', 100)->nullable()->after('tax_status');
                }
            });
        }

        // 13. Extend Suppliers with Tax Status & Withholding Agent
        if (Schema::hasTable('suppliers')) {
            Schema::table('suppliers', function (Blueprint $table) {
                if (!Schema::hasColumn('suppliers', 'tax_status')) {
                    $table->string('tax_status', 30)->default('TAXABLE')->after('qualification_status')
                        ->comment('TAXABLE, ZERO_RATED, EXEMPT, WITHHOLDING_AGENT');
                }
                if (!Schema::hasColumn('suppliers', 'tax_exemption_number')) {
                    $table->string('tax_exemption_number', 100)->nullable()->after('tax_status');
                }
                if (!Schema::hasColumn('suppliers', 'is_withholding_agent')) {
                    $table->boolean('is_withholding_agent')->default(false)->after('tax_exemption_number');
                }
                if (!Schema::hasColumn('suppliers', 'bin_number')) {
                    $table->string('bin_number', 50)->nullable()->after('is_withholding_agent');
                }
                if (!Schema::hasColumn('suppliers', 'tin_number')) {
                    $table->string('tin_number', 50)->nullable()->after('bin_number');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('suppliers')) {
            Schema::table('suppliers', function (Blueprint $table) {
                $cols = ['bin_number', 'tin_number', 'is_withholding_agent', 'tax_exemption_number', 'tax_status'];
                foreach ($cols as $col) {
                    if (Schema::hasColumn('suppliers', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('customers')) {
            Schema::table('customers', function (Blueprint $table) {
                $cols = ['tax_exemption_number', 'tax_status'];
                foreach ($cols as $col) {
                    if (Schema::hasColumn('customers', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('products') && Schema::hasColumn('products', 'tax_category_id')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropForeign(['tax_category_id']);
                $table->dropColumn('tax_category_id');
            });
        }

        Schema::dropIfExists('tax_reconciliations');
        Schema::dropIfExists('tax_adjustments');
        Schema::dropIfExists('tax_transaction_components');
        Schema::dropIfExists('tax_transactions');
        Schema::dropIfExists('tax_periods');
        Schema::dropIfExists('tax_components');
        Schema::dropIfExists('tax_rules');
        Schema::dropIfExists('tax_registrations');
        Schema::dropIfExists('tax_profiles');

        if (Schema::hasTable('tax_categories')) {
            Schema::table('tax_categories', function (Blueprint $table) {
                if (Schema::hasColumn('tax_categories', 'is_active')) {
                    $table->dropColumn('is_active');
                }
                if (Schema::hasColumn('tax_categories', 'code')) {
                    $table->dropColumn('code');
                }
            });
        }
    }
};
