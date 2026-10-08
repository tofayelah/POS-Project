<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AssetDepreciationEntry extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'depreciation_date' => 'date',
        'depreciation_amount' => 'decimal:4',
        'accumulated_depreciation_before' => 'decimal:4',
        'accumulated_depreciation_after' => 'decimal:4',
        'book_value_after' => 'decimal:4',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function fixedAsset()
    {
        return $this->belongsTo(FixedAsset::class);
    }

    public function accountingPeriod()
    {
        return $this->belongsTo(AccountingPeriod::class);
    }

    public function journalEntry()
    {
        return $this->belongsTo(JournalEntry::class);
    }

    public function postedBy()
    {
        return $this->belongsTo(User::class, 'posted_by');
    }
}
