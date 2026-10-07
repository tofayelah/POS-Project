<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeLoan extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'employee_id',
        'loan_number',
        'principal_amount',
        'interest_rate_percent',
        'total_payable',
        'installment_count',
        'installment_amount',
        'start_date',
        'status',
        'approved_by',
        'approved_at',
        'disbursed_by',
        'disbursed_at',
        'payment_id',
        'outstanding_balance',
        'total_recovered',
    ];

    protected $casts = [
        'principal_amount' => 'decimal:4',
        'interest_rate_percent' => 'decimal:2',
        'total_payable' => 'decimal:4',
        'installment_count' => 'integer',
        'installment_amount' => 'decimal:4',
        'start_date' => 'date',
        'outstanding_balance' => 'decimal:4',
        'total_recovered' => 'decimal:4',
        'approved_at' => 'datetime',
        'disbursed_at' => 'datetime',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function payment()
    {
        return $this->belongsTo(Payment::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function disburser()
    {
        return $this->belongsTo(User::class, 'disbursed_by');
    }

    public function repayments()
    {
        return $this->hasMany(EmployeeLoanRepayment::class);
    }
}
