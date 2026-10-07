<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Shift extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'name',
        'code',
        'start_time',
        'end_time',
        'break_minutes',
        'grace_minutes',
        'overtime_after_minutes',
        'is_overnight',
        'status',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_overnight' => 'boolean',
        'break_minutes' => 'integer',
        'grace_minutes' => 'integer',
        'overtime_after_minutes' => 'integer',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function assignments()
    {
        return $this->hasMany(ShiftAssignment::class);
    }
}
