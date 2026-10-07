<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'employee_id',
        'shift_id',
        'attendance_date',
        'check_in',
        'check_out',
        'status',
        'late_minutes',
        'early_leave_minutes',
        'worked_minutes',
        'overtime_minutes',
        'source',
        'remarks',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'attendance_date' => 'date',
        'check_in' => 'datetime',
        'check_out' => 'datetime',
        'approved_at' => 'datetime',
        'late_minutes' => 'integer',
        'early_leave_minutes' => 'integer',
        'worked_minutes' => 'integer',
        'overtime_minutes' => 'integer',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function shift()
    {
        return $this->belongsTo(Shift::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function adjustments()
    {
        return $this->hasMany(AttendanceAdjustment::class);
    }
}
