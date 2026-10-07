<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PayrollPeriod extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'name',
        'period_start',
        'period_end',
        'payment_due_date',
        'status',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'payment_due_date' => 'date',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function runs()
    {
        return $this->hasMany(PayrollRun::class);
    }
}
