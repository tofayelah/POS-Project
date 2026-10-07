<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeaveBalance extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'employee_id',
        'leave_type_id',
        'year',
        'opening_balance',
        'accrued_days',
        'used_days',
        'pending_days',
        'remaining_days',
        'entitled_days',
        'taken_days',
    ];

    protected $casts = [
        'year' => 'integer',
        'opening_balance' => 'decimal:2',
        'accrued_days' => 'decimal:2',
        'used_days' => 'decimal:2',
        'pending_days' => 'decimal:2',
        'remaining_days' => 'decimal:2',
    ];

    protected $appends = [
        'entitled_days',
        'taken_days',
    ];

    public function getTakenDaysAttribute()
    {
        return (float) ($this->attributes['used_days'] ?? 0);
    }

    public function setTakenDaysAttribute($value)
    {
        $this->attributes['used_days'] = $value;
    }

    public function getEntitledDaysAttribute()
    {
        return (float) ($this->attributes['accrued_days'] ?? 0);
    }

    public function setEntitledDaysAttribute($value)
    {
        $this->attributes['accrued_days'] = $value;
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function leaveType()
    {
        return $this->belongsTo(LeaveType::class);
    }
}
