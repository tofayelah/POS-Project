<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AttendanceAdjustment extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'company_id',
        'attendance_id',
        'employee_id',
        'original_check_in',
        'original_check_out',
        'original_status',
        'new_check_in',
        'new_check_out',
        'new_status',
        'reason',
        'adjusted_by',
        'created_at',
    ];

    protected $casts = [
        'original_check_in' => 'datetime',
        'original_check_out' => 'datetime',
        'new_check_in' => 'datetime',
        'new_check_out' => 'datetime',
        'created_at' => 'datetime',
    ];

    public function attendance()
    {
        return $this->belongsTo(Attendance::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function adjustedBy()
    {
        return $this->belongsTo(User::class, 'adjusted_by');
    }
}
