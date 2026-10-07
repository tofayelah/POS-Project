<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeAdvanceRepayment extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'employee_advance_id',
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

    public function advance()
    {
        return $this->belongsTo(EmployeeAdvance::class, 'employee_advance_id');
    }

    public function payrollItem()
    {
        return $this->belongsTo(PayrollItem::class);
    }
}
