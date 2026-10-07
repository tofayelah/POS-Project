<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeLoanRepayment extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'employee_loan_id',
        'payroll_item_id',
        'amount',
        'repayment_date',
        'notes',
        'created_at',
    ];

    protected $casts = [
        'amount' => 'decimal:4',
        'repayment_date' => 'date',
        'created_at' => 'datetime',
    ];

    public function loan()
    {
        return $this->belongsTo(EmployeeLoan::class, 'employee_loan_id');
    }

    public function payrollItem()
    {
        return $this->belongsTo(PayrollItem::class);
    }
}
