<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockBatch extends Model
{
    protected $guarded = [];

    protected $casts = [
        'mfg_date' => 'date',
        'exp_date' => 'date',
        'unit_cost' => 'decimal:4',
    ];

    protected $appends = ['expiry_status'];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function inventoryBatches(): HasMany
    {
        return $this->hasMany(InventoryBatch::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function isBlocked(): bool
    {
        return $this->status === 'BLOCKED';
    }

    public function isExpired(): bool
    {
        if (!$this->exp_date) {
            return false;
        }
        return $this->exp_date->isPast();
    }

    public function isNearExpiry(int $days = 30): bool
    {
        if (!$this->exp_date || $this->isExpired()) {
            return false;
        }
        return $this->exp_date->lte(now()->addDays($days));
    }

    public function getExpiryStatusAttribute(): string
    {
        if ($this->isBlocked()) {
            return 'BLOCKED';
        }
        if ($this->isExpired()) {
            return 'EXPIRED';
        }
        if ($this->isNearExpiry(7)) {
            return 'NEAR_EXPIRY_7';
        }
        if ($this->isNearExpiry(30)) {
            return 'NEAR_EXPIRY_30';
        }
        return 'ACTIVE';
    }
}
