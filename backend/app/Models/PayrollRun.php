<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PayrollRun extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'payroll_period_id',
        'run_number',
        'status',
        'total_basic',
        'total_allowances',
        'total_overtime',
        'total_bonuses',
        'total_gross',
        'total_deductions',
        'total_loan_repayments',
        'total_advance_repayments',
        'total_net',
        'total_paid',
        'total_outstanding',
        'journal_entry_id',
        'calculated_by',
        'calculated_at',
        'approved_by',
        'approved_at',
        'posted_by',
        'posted_at',
        'idempotency_key',
    ];

    protected $casts = [
        'total_basic' => 'float',
        'total_allowances' => 'float',
        'total_overtime' => 'float',
        'total_bonuses' => 'float',
        'total_gross' => 'float',
        'total_deductions' => 'float',
        'total_loan_repayments' => 'float',
        'total_advance_repayments' => 'float',
        'total_net' => 'float',
        'total_paid' => 'float',
        'total_outstanding' => 'float',
        'calculated_at' => 'datetime',
        'approved_at' => 'datetime',
        'posted_at' => 'datetime',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function period()
    {
        return $this->belongsTo(PayrollPeriod::class, 'payroll_period_id');
    }

    public function items()
    {
        return $this->hasMany(PayrollItem::class);
    }

    public function journalEntry()
    {
        return $this->belongsTo(JournalEntry::class);
    }

    public function calculator()
    {
        return $this->belongsTo(User::class, 'calculated_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function poster()
    {
        return $this->belongsTo(User::class, 'posted_by');
    }
}
