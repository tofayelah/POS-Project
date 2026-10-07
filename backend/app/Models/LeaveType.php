<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeaveType extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'name',
        'code',
        'is_paid',
        'default_days_per_year',
        'description',
        'status',
    ];

    protected $casts = [
        'is_paid' => 'boolean',
        'default_days_per_year' => 'decimal:2',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function balances()
    {
        return $this->hasMany(LeaveBalance::class);
    }

    public function applications()
    {
        return $this->hasMany(LeaveApplication::class);
    }
}
