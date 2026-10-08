<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BudgetControl extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'threshold_percentage' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function account()
    {
        return $this->belongsTo(Account::class);
    }

    public function costCentre()
    {
        return $this->belongsTo(CostCentre::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
