<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalaryStructure extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'employee_id',
        'name',
        'code',
        'effective_from',
        'effective_to',
        'basic_salary',
        'gross_salary',
        'net_salary',
        'status',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'effective_from' => 'date',
        'effective_to' => 'date',
        'basic_salary' => 'decimal:4',
        'gross_salary' => 'decimal:4',
        'net_salary' => 'decimal:4',
    ];

    protected $appends = [
        'base_gross',
    ];

    public function getBaseGrossAttribute()
    {
        return (float) $this->gross_salary;
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function items()
    {
        return $this->hasMany(SalaryStructureItem::class);
    }
}
