<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PayrollItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'payroll_run_id',
        'employee_id',
        'salary_structure_id',
        'basic_salary_snapshot',
        'allowances_total_snapshot',
        'overtime_minutes_snapshot',
        'overtime_amount_snapshot',
        'bonus_amount_snapshot',
        'gross_amount',
        'unpaid_leave_days_snapshot',
        'unpaid_leave_deduction_snapshot',
        'loan_deduction_snapshot',
        'advance_deduction_snapshot',
        'tax_deduction_snapshot',
        'other_deductions_total_snapshot',
        'total_deductions',
        'net_amount',
        'paid_amount',
        'due_amount',
        'payment_status',
        'breakdown_json',
    ];

    protected $casts = [
        'basic_salary_snapshot' => 'decimal:4',
        'allowances_total_snapshot' => 'decimal:4',
        'overtime_minutes_snapshot' => 'integer',
        'overtime_amount_snapshot' => 'decimal:4',
        'bonus_amount_snapshot' => 'decimal:4',
        'gross_amount' => 'decimal:4',
        'unpaid_leave_days_snapshot' => 'decimal:2',
        'unpaid_leave_deduction_snapshot' => 'decimal:4',
        'loan_deduction_snapshot' => 'decimal:4',
        'advance_deduction_snapshot' => 'decimal:4',
        'tax_deduction_snapshot' => 'decimal:4',
        'other_deductions_total_snapshot' => 'decimal:4',
        'total_deductions' => 'decimal:4',
        'net_amount' => 'decimal:4',
        'paid_amount' => 'decimal:4',
        'due_amount' => 'decimal:4',
        'breakdown_json' => 'array',
    ];

    public function payrollRun()
    {
        return $this->belongsTo(PayrollRun::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function salaryStructure()
    {
        return $this->belongsTo(SalaryStructure::class);
    }
}
