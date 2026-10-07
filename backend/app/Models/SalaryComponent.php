<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalaryComponent extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'name',
        'code',
        'type', // EARNING, DEDUCTION
        'calculation_method', // FIXED, PERCENTAGE_OF_BASIC
        'default_amount',
        'is_taxable',
        'is_statutory',
        'status',
    ];

    protected $casts = [
        'default_amount' => 'decimal:4',
        'is_taxable' => 'boolean',
        'is_statutory' => 'boolean',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }
}
