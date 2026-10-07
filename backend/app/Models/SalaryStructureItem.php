<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalaryStructureItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'salary_structure_id',
        'salary_component_id',
        'amount',
        'percentage',
    ];

    protected $casts = [
        'amount' => 'decimal:4',
        'percentage' => 'decimal:4',
    ];

    public function salaryStructure()
    {
        return $this->belongsTo(SalaryStructure::class);
    }

    public function component()
    {
        return $this->belongsTo(SalaryComponent::class, 'salary_component_id');
    }
}
