<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Departments
        Schema::create('departments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->foreignId('business_unit_id')->nullable()->constrained('business_units')->nullOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->string('name');
            $table->string('code', 50);
            $table->text('description')->nullable();
            $table->string('status', 20)->default('ACTIVE');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'code']);
            $table->index(['company_id', 'status']);
        });

        // 2. Designations
        Schema::create('designations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->string('name');
            $table->string('code', 50);
            $table->text('description')->nullable();
            $table->string('status', 20)->default('ACTIVE');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'code']);
            $table->index(['company_id', 'status']);
        });

        // 3. Employees
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->foreignId('business_unit_id')->nullable()->constrained('business_units')->nullOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('department_id')->nullable()->constrained('departments')->restrictOnDelete();
            $table->foreignId('designation_id')->nullable()->constrained('designations')->restrictOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('employee_number', 50);
            $table->string('first_name');
            $table->string('last_name')->nullable();
            $table->string('email')->nullable();
            $table->string('phone', 50)->nullable();
            $table->string('gender', 20)->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('national_id', 100)->nullable();
            $table->text('address')->nullable();
            $table->date('joining_date');
            $table->date('confirmation_date')->nullable();
            $table->string('employment_type', 30)->default('FULL_TIME');
            $table->string('employment_status', 30)->default('ACTIVE');
            $table->date('resignation_date')->nullable();
            $table->date('termination_date')->nullable();
            $table->string('bank_name', 100)->nullable();
            $table->string('bank_account_number', 100)->nullable();
            $table->string('bank_routing_number', 100)->nullable();
            $table->string('emergency_contact_name', 100)->nullable();
            $table->string('emergency_contact_phone', 50)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'employee_number']);
            $table->index(['company_id', 'department_id']);
            $table->index(['company_id', 'branch_id']);
            $table->index(['company_id', 'employment_status']);
        });

        // 4. Shifts
        Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->string('name');
            $table->string('code', 50);
            $table->time('start_time');
            $table->time('end_time');
            $table->unsignedInteger('break_minutes')->default(0);
            $table->unsignedInteger('grace_minutes')->default(10);
            $table->unsignedInteger('overtime_after_minutes')->default(0);
            $table->boolean('is_overnight')->default(false);
            $table->string('status', 20)->default('ACTIVE');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['company_id', 'code']);
            $table->index(['company_id', 'status']);
        });

        // 5. Shift Assignments
        Schema::create('shift_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('shift_id')->constrained('shifts')->restrictOnDelete();
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['employee_id', 'effective_from', 'effective_to']);
            $table->index(['company_id', 'shift_id']);
        });

        // 6. Holiday Calendar
        Schema::create('holiday_calendars', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->string('name');
            $table->date('holiday_date');
            $table->string('type', 30)->default('PUBLIC'); // PUBLIC, COMPANY, OPTIONAL
            $table->text('description')->nullable();
            $table->string('status', 20)->default('ACTIVE');
            $table->timestamps();

            $table->unique(['company_id', 'holiday_date']);
        });

        // 7. Working Calendar (weekly off days)
        Schema::create('working_calendars', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->unsignedTinyInteger('day_of_week'); // 0 = Sunday, 1 = Monday ... 5 = Friday, 6 = Saturday
            $table->boolean('is_working_day')->default(true);
            $table->string('notes')->nullable();
            $table->timestamps();

            $table->unique(['company_id', 'day_of_week']);
        });

        // 8. Attendances
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('shift_id')->nullable()->constrained('shifts')->nullOnDelete();
            $table->date('attendance_date');
            $table->dateTime('check_in')->nullable();
            $table->dateTime('check_out')->nullable();
            $table->string('status', 30)->default('PRESENT'); // PRESENT, ABSENT, LATE, HALF_DAY, ON_LEAVE, HOLIDAY, WEEKLY_OFF, REMOTE, FIELD_WORK
            $table->unsignedInteger('late_minutes')->default(0);
            $table->unsignedInteger('early_leave_minutes')->default(0);
            $table->unsignedInteger('worked_minutes')->default(0);
            $table->unsignedInteger('overtime_minutes')->default(0);
            $table->string('source', 30)->default('WEB'); // WEB, BIOMETRIC, MANUAL
            $table->text('remarks')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('approved_at')->nullable();
            $table->timestamps();

            $table->unique(['employee_id', 'attendance_date']);
            $table->index(['company_id', 'attendance_date', 'status']);
        });

        // 9. Attendance Adjustments
        Schema::create('attendance_adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->foreignId('attendance_id')->constrained('attendances')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->dateTime('original_check_in')->nullable();
            $table->dateTime('original_check_out')->nullable();
            $table->string('original_status', 30);
            $table->dateTime('new_check_in')->nullable();
            $table->dateTime('new_check_out')->nullable();
            $table->string('new_status', 30);
            $table->text('reason');
            $table->foreignId('adjusted_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index(['company_id', 'attendance_id']);
        });

        // 10. Leave Types
        Schema::create('leave_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->string('name');
            $table->string('code', 50);
            $table->boolean('is_paid')->default(true);
            $table->decimal('default_days_per_year', 6, 2)->default(14);
            $table->text('description')->nullable();
            $table->string('status', 20)->default('ACTIVE');
            $table->timestamps();

            $table->unique(['company_id', 'code']);
        });

        // 11. Leave Balances
        Schema::create('leave_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('leave_type_id')->constrained('leave_types')->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            $table->decimal('opening_balance', 6, 2)->default(0);
            $table->decimal('accrued_days', 6, 2)->default(0);
            $table->decimal('used_days', 6, 2)->default(0);
            $table->decimal('pending_days', 6, 2)->default(0);
            $table->decimal('remaining_days', 6, 2)->default(0);
            $table->timestamps();

            $table->unique(['employee_id', 'leave_type_id', 'year']);
            $table->index(['company_id', 'year']);
        });

        // 12. Leave Applications
        Schema::create('leave_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('leave_type_id')->constrained('leave_types')->restrictOnDelete();
            $table->date('from_date');
            $table->date('to_date');
            $table->decimal('days', 6, 2);
            $table->text('reason');
            $table->string('status', 30)->default('DRAFT'); // DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'status']);
            $table->index(['employee_id', 'from_date', 'to_date']);
        });

        // 13. Salary Components
        Schema::create('salary_components', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->string('name');
            $table->string('code', 50);
            $table->string('type', 20); // EARNING, DEDUCTION
            $table->string('calculation_method', 30)->default('FIXED'); // FIXED, PERCENTAGE_OF_BASIC
            $table->decimal('default_amount', 15, 4)->default(0);
            $table->boolean('is_taxable')->default(true);
            $table->boolean('is_statutory')->default(false);
            $table->string('status', 20)->default('ACTIVE');
            $table->timestamps();

            $table->unique(['company_id', 'code']);
        });

        // 14. Salary Structures
        Schema::create('salary_structures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->foreignId('employee_id')->nullable()->constrained('employees')->cascadeOnDelete();
            $table->string('name')->nullable();
            $table->string('code', 50)->nullable();
            $table->date('effective_from')->nullable();
            $table->date('effective_to')->nullable();
            $table->decimal('basic_salary', 15, 4)->default(0);
            $table->decimal('gross_salary', 15, 4)->default(0);
            $table->decimal('net_salary', 15, 4)->default(0);
            $table->string('status', 20)->default('ACTIVE');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['company_id', 'status']);
        });

        // 15. Salary Structure Items
        Schema::create('salary_structure_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('salary_structure_id')->constrained('salary_structures')->cascadeOnDelete();
            $table->foreignId('salary_component_id')->constrained('salary_components')->restrictOnDelete();
            $table->decimal('amount', 15, 4)->default(0);
            $table->decimal('percentage', 8, 4)->nullable();
            $table->timestamps();

            $table->index(['salary_structure_id', 'salary_component_id'], 'sal_struct_items_struct_comp_idx');
        });

        // 16. Payroll Periods
        Schema::create('payroll_periods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->string('name');
            $table->date('period_start');
            $table->date('period_end');
            $table->date('payment_due_date')->nullable();
            $table->string('status', 30)->default('DRAFT'); // DRAFT, CALCULATING, CALCULATED, UNDER_REVIEW, APPROVED, POSTED, PAID, CANCELLED
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['company_id', 'period_start', 'period_end']);
            $table->index(['company_id', 'status']);
        });

        // 17. Payroll Runs
        Schema::create('payroll_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->foreignId('payroll_period_id')->constrained('payroll_periods')->restrictOnDelete();
            $table->string('run_number', 50);
            $table->string('status', 30)->default('DRAFT'); // DRAFT, CALCULATED, APPROVED, POSTED, PAID, CANCELLED
            $table->decimal('total_basic', 18, 4)->default(0);
            $table->decimal('total_allowances', 18, 4)->default(0);
            $table->decimal('total_overtime', 18, 4)->default(0);
            $table->decimal('total_bonuses', 18, 4)->default(0);
            $table->decimal('total_gross', 18, 4)->default(0);
            $table->decimal('total_deductions', 18, 4)->default(0);
            $table->decimal('total_loan_repayments', 18, 4)->default(0);
            $table->decimal('total_advance_repayments', 18, 4)->default(0);
            $table->decimal('total_net', 18, 4)->default(0);
            $table->decimal('total_paid', 18, 4)->default(0);
            $table->decimal('total_outstanding', 18, 4)->default(0);
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->foreignId('calculated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('calculated_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('approved_at')->nullable();
            $table->foreignId('posted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('posted_at')->nullable();
            $table->string('idempotency_key', 100)->nullable()->unique();
            $table->timestamps();

            $table->unique(['company_id', 'run_number']);
            $table->index(['company_id', 'status']);
        });

        // 18. Payroll Items
        Schema::create('payroll_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_run_id')->constrained('payroll_runs')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->restrictOnDelete();
            $table->foreignId('salary_structure_id')->nullable()->constrained('salary_structures')->nullOnDelete();
            $table->decimal('basic_salary_snapshot', 15, 4);
            $table->decimal('allowances_total_snapshot', 15, 4)->default(0);
            $table->unsignedInteger('overtime_minutes_snapshot')->default(0);
            $table->decimal('overtime_amount_snapshot', 15, 4)->default(0);
            $table->decimal('bonus_amount_snapshot', 15, 4)->default(0);
            $table->decimal('gross_amount', 15, 4);
            $table->decimal('unpaid_leave_days_snapshot', 6, 2)->default(0);
            $table->decimal('unpaid_leave_deduction_snapshot', 15, 4)->default(0);
            $table->decimal('loan_deduction_snapshot', 15, 4)->default(0);
            $table->decimal('advance_deduction_snapshot', 15, 4)->default(0);
            $table->decimal('tax_deduction_snapshot', 15, 4)->default(0);
            $table->decimal('other_deductions_total_snapshot', 15, 4)->default(0);
            $table->decimal('total_deductions', 15, 4)->default(0);
            $table->decimal('net_amount', 15, 4);
            $table->decimal('paid_amount', 15, 4)->default(0);
            $table->decimal('due_amount', 15, 4)->default(0);
            $table->string('payment_status', 30)->default('UNPAID'); // UNPAID, PARTIAL, PAID
            $table->json('breakdown_json')->nullable();
            $table->timestamps();

            $table->index(['payroll_run_id', 'employee_id']);
        });

        // 19. Employee Advances
        Schema::create('employee_advances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->restrictOnDelete();
            $table->string('advance_number', 50);
            $table->decimal('amount', 15, 4);
            $table->date('request_date');
            $table->dateTime('disbursed_at')->nullable();
            $table->text('reason');
            $table->string('status', 30)->default('DRAFT'); // DRAFT, SUBMITTED, APPROVED, DISBURSED, PARTIALLY_SETTLED, SETTLED, REJECTED, CANCELLED
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('approved_at')->nullable();
            $table->foreignId('disbursed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('payment_id')->nullable()->constrained('payments')->nullOnDelete();
            $table->decimal('outstanding_amount', 15, 4);
            $table->decimal('recovered_amount', 15, 4)->default(0);
            $table->timestamps();

            $table->unique(['company_id', 'advance_number']);
            $table->index(['company_id', 'employee_id', 'status']);
        });

        // 20. Employee Loans
        Schema::create('employee_loans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->restrictOnDelete();
            $table->string('loan_number', 50);
            $table->decimal('principal_amount', 15, 4);
            $table->decimal('interest_rate_percent', 6, 2)->default(0);
            $table->decimal('total_payable', 15, 4);
            $table->unsignedInteger('installment_count');
            $table->decimal('installment_amount', 15, 4);
            $table->date('start_date');
            $table->string('status', 30)->default('DRAFT'); // DRAFT, APPROVED, DISBURSED, ACTIVE, SETTLED, CANCELLED
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('approved_at')->nullable();
            $table->foreignId('disbursed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('disbursed_at')->nullable();
            $table->foreignId('payment_id')->nullable()->constrained('payments')->nullOnDelete();
            $table->decimal('outstanding_balance', 15, 4);
            $table->decimal('total_recovered', 15, 4)->default(0);
            $table->timestamps();

            $table->unique(['company_id', 'loan_number']);
            $table->index(['company_id', 'employee_id', 'status']);
        });

        // 21. Employee Loan Repayments
        Schema::create('employee_loan_repayments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_loan_id')->constrained('employee_loans')->cascadeOnDelete();
            $table->foreignId('payroll_item_id')->nullable()->constrained('payroll_items')->nullOnDelete();
            $table->decimal('amount', 15, 4);
            $table->date('repayment_date');
            $table->string('notes')->nullable();
            $table->timestamps();

            $table->index(['employee_loan_id', 'repayment_date']);
        });

        // 22. Employee Advance Repayments
        Schema::create('employee_advance_repayments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_advance_id')->constrained('employee_advances')->cascadeOnDelete();
            $table->foreignId('payroll_item_id')->nullable()->constrained('payroll_items')->nullOnDelete();
            $table->decimal('amount', 15, 4);
            $table->date('repayment_date');
            $table->string('notes')->nullable();
            $table->timestamps();

            $table->index(['employee_advance_id', 'repayment_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_advance_repayments');
        Schema::dropIfExists('employee_loan_repayments');
        Schema::dropIfExists('employee_loans');
        Schema::dropIfExists('employee_advances');
        Schema::dropIfExists('payroll_items');
        Schema::dropIfExists('payroll_runs');
        Schema::dropIfExists('payroll_periods');
        Schema::dropIfExists('salary_structure_items');
        Schema::dropIfExists('salary_structures');
        Schema::dropIfExists('salary_components');
        Schema::dropIfExists('leave_applications');
        Schema::dropIfExists('leave_balances');
        Schema::dropIfExists('leave_types');
        Schema::dropIfExists('attendance_adjustments');
        Schema::dropIfExists('attendances');
        Schema::dropIfExists('working_calendars');
        Schema::dropIfExists('holiday_calendars');
        Schema::dropIfExists('shift_assignments');
        Schema::dropIfExists('shifts');
        Schema::dropIfExists('employees');
        Schema::dropIfExists('designations');
        Schema::dropIfExists('departments');
    }
};
