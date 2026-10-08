<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FixedAsset extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'purchase_date' => 'date',
        'purchase_cost' => 'decimal:4',
        'residual_value' => 'decimal:4',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function category()
    {
        return $this->belongsTo(FixedAssetCategory::class, 'category_id');
    }

    public function assetAccount()
    {
        return $this->belongsTo(Account::class, 'asset_account_id');
    }

    public function accumulatedDepreciationAccount()
    {
        return $this->belongsTo(Account::class, 'accumulated_depreciation_account_id');
    }

    public function depreciationExpenseAccount()
    {
        return $this->belongsTo(Account::class, 'depreciation_expense_account_id');
    }

    public function costCentre()
    {
        return $this->belongsTo(CostCentre::class);
    }

    public function depreciationEntries()
    {
        return $this->hasMany(AssetDepreciationEntry::class);
    }

    public function disposal()
    {
        return $this->hasOne(AssetDisposal::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getAccumulatedDepreciationAttribute(): float
    {
        return (float) $this->depreciationEntries()->sum('depreciation_amount');
    }

    public function getBookValueAttribute(): float
    {
        return (float) max(0, $this->purchase_cost - $this->accumulated_depreciation);
    }
}
