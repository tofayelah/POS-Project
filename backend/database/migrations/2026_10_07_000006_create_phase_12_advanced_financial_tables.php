<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Cost Centres
        Schema::create('cost_centres', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('cost_centres')->nullOnDelete();
            $table->string('code');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('status')->default('ACTIVE'); // ACTIVE, INACTIVE
            $table->foreignId('manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['company_id', 'code']);
            $table->index(['company_id', 'status']);
        });

        // 2. Profit Centres
        Schema::create('profit_centres', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('business_unit_id')->nullable()->constrained('business_units')->nullOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->string('code');
            $table->string('name');
            $table->string('type')->default('BRANCH'); // RETAIL, WHOLESALE, ECOMMERCE, B2B, BRANCH, BUSINESS_UNIT
            $table->text('description')->nullable();
            $table->string('status')->default('ACTIVE'); // ACTIVE, INACTIVE
            $table->foreignId('manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['company_id', 'code']);
            $table->index(['company_id', 'status']);
        });

        // 3. Extend accounting_periods with closing/reopening audit columns
        Schema::table('accounting_periods', function (Blueprint $table) {
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('reopened_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reopened_at')->nullable();
            $table->text('reopen_reason')->nullable();
        });

        // 4. Extend journal_entry_lines with cost_centre_id and profit_centre_id
        Schema::table('journal_entry_lines', function (Blueprint $table) {
            $table->foreignId('cost_centre_id')->nullable()->constrained('cost_centres')->nullOnDelete();
            $table->foreignId('profit_centre_id')->nullable()->constrained('profit_centres')->nullOnDelete();
        });

        // 5. Budgets
        Schema::create('budgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->cascadeOnDelete();
            $table->string('name');
            $table->string('budget_type')->default('ORIGINAL'); // ORIGINAL, REVISED, FORECAST, FINAL
            $table->string('status')->default('DRAFT'); // DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, ACTIVE, CLOSED
            $table->integer('version')->default(1);
            $table->decimal('total_budgeted_amount', 18, 4)->default(0);
            $table->text('notes')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['company_id', 'fiscal_year_id']);
            $table->index(['company_id', 'status']);
        });

        // 6. Budget Lines
        Schema::create('budget_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('budget_id')->constrained('budgets')->cascadeOnDelete();
            $table->foreignId('account_id')->constrained('accounts');
            $table->foreignId('cost_centre_id')->nullable()->constrained('cost_centres')->nullOnDelete();
            $table->foreignId('profit_centre_id')->nullable()->constrained('profit_centres')->nullOnDelete();
            $table->foreignId('accounting_period_id')->nullable()->constrained('accounting_periods')->nullOnDelete();
            $table->foreignId('business_unit_id')->nullable()->constrained('business_units')->nullOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->decimal('amount', 18, 4)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['budget_id', 'account_id']);
        });

        // 7. Budget Controls
        Schema::create('budget_controls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->foreignId('cost_centre_id')->nullable()->constrained('cost_centres')->nullOnDelete();
            $table->string('control_action')->default('WARNING'); // ALLOW, WARNING, APPROVAL_REQUIRED, BLOCK
            $table->decimal('threshold_percentage', 8, 2)->default(100.00);
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['company_id', 'is_active']);
        });

        // 8. Bank Accounts
        Schema::create('bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->string('bank_name');
            $table->string('branch_name')->nullable();
            $table->string('account_name');
            $table->string('account_number_masked');
            $table->string('routing_number')->nullable();
            $table->string('swift_bic')->nullable();
            $table->string('currency')->default('BDT');
            $table->decimal('opening_balance', 18, 4)->default(0);
            $table->decimal('current_balance', 18, 4)->default(0);
            $table->string('status')->default('ACTIVE'); // ACTIVE, INACTIVE, CLOSED
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['company_id', 'status']);
        });

        // 9. Bank Statements
        Schema::create('bank_statements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('bank_account_id')->constrained('bank_accounts')->cascadeOnDelete();
            $table->string('statement_identifier');
            $table->date('start_date');
            $dateEnd = $table->date('end_date');
            $table->decimal('opening_balance', 18, 4)->default(0);
            $table->decimal('closing_balance', 18, 4)->default(0);
            $table->string('status')->default('IMPORTED'); // IMPORTED, RECONCILING, RECONCILED
            $table->foreignId('imported_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['company_id', 'bank_account_id']);
        });

        // 10. Bank Statement Lines
        Schema::create('bank_statement_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bank_statement_id')->constrained('bank_statements')->cascadeOnDelete();
            $table->date('transaction_date');
            $table->date('value_date')->nullable();
            $table->text('description');
            $table->string('reference_number')->nullable();
            $table->string('cheque_number')->nullable();
            $table->decimal('debit', 18, 4)->default(0); // Money out / withdrawal
            $table->decimal('credit', 18, 4)->default(0); // Money in / deposit
            $table->decimal('balance', 18, 4)->default(0);
            $table->string('status')->default('UNMATCHED'); // UNMATCHED, MATCHED, PARTIALLY_MATCHED, IGNORED
            $table->timestamps();

            $table->index(['bank_statement_id', 'status']);
        });

        // 11. Bank Reconciliations
        Schema::create('bank_reconciliations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('bank_account_id')->constrained('bank_accounts')->cascadeOnDelete();
            $table->foreignId('bank_statement_id')->nullable()->constrained('bank_statements')->nullOnDelete();
            $table->date('reconciliation_date');
            $table->decimal('gl_balance', 18, 4)->default(0);
            $table->decimal('statement_balance', 18, 4)->default(0);
            $table->decimal('difference', 18, 4)->default(0);
            $table->string('status')->default('IN_PROGRESS'); // IN_PROGRESS, COMPLETED
            $table->foreignId('completed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('completed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'bank_account_id']);
        });

        // 12. Bank Reconciliation Matches
        Schema::create('bank_reconciliation_matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bank_reconciliation_id')->constrained('bank_reconciliations')->cascadeOnDelete();
            $table->foreignId('bank_statement_line_id')->constrained('bank_statement_lines')->cascadeOnDelete();
            $table->foreignId('journal_entry_line_id')->nullable()->constrained('journal_entry_lines')->nullOnDelete();
            $table->string('match_type')->default('MANUAL'); // EXACT, REFERENCE, WINDOW, MANUAL
            $table->decimal('matched_amount', 18, 4)->default(0);
            $table->text('notes')->nullable();
            $table->foreignId('matched_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['bank_reconciliation_id']);
        });

        // 13. Year-End Closings
        Schema::create('year_end_closings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->cascadeOnDelete();
            $table->date('closing_date');
            $table->foreignId('retained_earnings_account_id')->constrained('accounts');
            $table->decimal('total_revenue', 18, 4)->default(0);
            $table->decimal('total_expense', 18, 4)->default(0);
            $table->decimal('net_profit_amount', 18, 4)->default(0);
            $table->foreignId('closing_journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->string('status')->default('COMPLETED'); // COMPLETED, REVERSED
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('closed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'fiscal_year_id']);
        });

        // 14. Fixed Asset Categories
        Schema::create('fixed_asset_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('code');
            $table->string('name');
            $table->string('depreciation_method')->default('STRAIGHT_LINE'); // STRAIGHT_LINE
            $table->integer('useful_life_months')->default(60);
            $table->foreignId('asset_account_id')->constrained('accounts');
            $table->foreignId('accumulated_depreciation_account_id')->constrained('accounts');
            $table->foreignId('depreciation_expense_account_id')->constrained('accounts');
            $table->string('status')->default('ACTIVE'); // ACTIVE, INACTIVE
            $table->timestamps();

            $table->unique(['company_id', 'code']);
        });

        // 15. Fixed Assets
        Schema::create('fixed_assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('fixed_asset_categories')->cascadeOnDelete();
            $table->string('asset_code');
            $table->string('name');
            $table->text('description')->nullable();
            $table->date('purchase_date');
            $table->decimal('purchase_cost', 18, 4)->default(0);
            $table->decimal('residual_value', 18, 4)->default(0);
            $table->integer('useful_life_months')->default(60);
            $table->string('depreciation_method')->default('STRAIGHT_LINE');
            $table->string('location')->nullable();
            $table->string('custodian')->nullable();
            $table->foreignId('asset_account_id')->constrained('accounts');
            $table->foreignId('accumulated_depreciation_account_id')->constrained('accounts');
            $table->foreignId('depreciation_expense_account_id')->constrained('accounts');
            $table->foreignId('cost_centre_id')->nullable()->constrained('cost_centres')->nullOnDelete();
            $table->string('status')->default('ACTIVE'); // DRAFT, ACTIVE, DEPRECIATING, FULLY_DEPRECIATED, DISPOSED
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['company_id', 'asset_code']);
            $table->index(['company_id', 'status']);
        });

        // 16. Asset Depreciation Entries
        Schema::create('asset_depreciation_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fixed_asset_id')->constrained('fixed_assets')->cascadeOnDelete();
            $table->foreignId('accounting_period_id')->nullable()->constrained('accounting_periods')->nullOnDelete();
            $table->date('depreciation_date');
            $table->decimal('depreciation_amount', 18, 4)->default(0);
            $table->decimal('accumulated_depreciation_before', 18, 4)->default(0);
            $table->decimal('accumulated_depreciation_after', 18, 4)->default(0);
            $table->decimal('book_value_after', 18, 4)->default(0);
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->foreignId('posted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['company_id', 'fixed_asset_id']);
        });

        // 17. Asset Disposals
        Schema::create('asset_disposals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fixed_asset_id')->constrained('fixed_assets')->cascadeOnDelete();
            $table->date('disposal_date');
            $table->decimal('asset_cost', 18, 4)->default(0);
            $table->decimal('accumulated_depreciation', 18, 4)->default(0);
            $table->decimal('book_value', 18, 4)->default(0);
            $table->decimal('sale_proceeds', 18, 4)->default(0);
            $table->decimal('gain_loss_amount', 18, 4)->default(0);
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->foreignId('disposed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['company_id', 'fixed_asset_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_disposals');
        Schema::dropIfExists('asset_depreciation_entries');
        Schema::dropIfExists('fixed_assets');
        Schema::dropIfExists('fixed_asset_categories');
        Schema::dropIfExists('year_end_closings');
        Schema::dropIfExists('bank_reconciliation_matches');
        Schema::dropIfExists('bank_reconciliations');
        Schema::dropIfExists('bank_statement_lines');
        Schema::dropIfExists('bank_statements');
        Schema::dropIfExists('bank_accounts');
        Schema::dropIfExists('budget_controls');
        Schema::dropIfExists('budget_lines');
        Schema::dropIfExists('budgets');

        Schema::table('journal_entry_lines', function (Blueprint $table) {
            $table->dropForeign(['profit_centre_id']);
            $table->dropForeign(['cost_centre_id']);
            $table->dropColumn(['profit_centre_id', 'cost_centre_id']);
        });

        Schema::table('accounting_periods', function (Blueprint $table) {
            $table->dropForeign(['reopened_by']);
            $table->dropForeign(['closed_by']);
            $table->dropColumn(['closed_by', 'closed_at', 'reopened_by', 'reopened_at', 'reopen_reason']);
        });

        Schema::dropIfExists('profit_centres');
        Schema::dropIfExists('cost_centres');
    }
};
