<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeAdvance extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'employee_id',
        'advance_number',
        'amount',
        'request_date',
        'disbursed_at',
        'reason',
        'status',
        'approved_by',
        'approved_at',
        'disbursed_by',
        'payment_id',
        'outstanding_amount',
        'recovered_amount',
    ];

    protected $casts = [
        'amount' => 'decimal:4',
        'outstanding_amount' => 'decimal:4',
        'recovered_amount' => 'decimal:4',
        'request_date' => 'date',
        'disbursed_at' => 'datetime',
        'approved_at' => 'datetime',
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
        return $this->hasMany(EmployeeAdvanceRepayment::class);
    }
}
