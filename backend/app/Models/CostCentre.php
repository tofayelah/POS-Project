<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CostCentre extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function parent()
    {
        return $this->belongsTo(CostCentre::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(CostCentre::class, 'parent_id');
    }

    public function manager()
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function journalLines()
    {
        return $this->hasMany(JournalEntryLine::class);
    }

    public function budgetLines()
    {
        return $this->hasMany(BudgetLine::class);
    }

    public function fixedAssets()
    {
        return $this->hasMany(FixedAsset::class);
    }
}
