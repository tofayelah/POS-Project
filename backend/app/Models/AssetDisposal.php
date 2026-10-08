<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AssetDisposal extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'disposal_date' => 'date',
        'asset_cost' => 'decimal:4',
        'accumulated_depreciation' => 'decimal:4',
        'book_value' => 'decimal:4',
        'sale_proceeds' => 'decimal:4',
        'gain_loss_amount' => 'decimal:4',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function fixedAsset()
    {
        return $this->belongsTo(FixedAsset::class);
    }

    public function journalEntry()
    {
        return $this->belongsTo(JournalEntry::class);
    }

    public function disposedBy()
    {
        return $this->belongsTo(User::class, 'disposed_by');
    }
}
