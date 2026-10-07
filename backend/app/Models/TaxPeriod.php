<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class TaxPeriod extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'locked_at' => 'datetime',
        'filed_at' => 'datetime',
    ];

    public const STATUS_OPEN = 'OPEN';
    public const STATUS_UNDER_REVIEW = 'UNDER_REVIEW';
    public const STATUS_ADJUSTMENT = 'ADJUSTMENT';
    public const STATUS_FINALIZED = 'FINALIZED';
    public const STATUS_FILED = 'FILED';
    public const STATUS_CLOSED = 'CLOSED';

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function lockedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'locked_by');
    }

    public function filedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'filed_by');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(TaxTransaction::class);
    }

    public function adjustments(): HasMany
    {
        return $this->hasMany(TaxAdjustment::class);
    }

    public function reconciliation(): HasOne
    {
        return $this->hasOne(TaxReconciliation::class);
    }

    public function isLocked(): bool
    {
        return in_array($this->status, [self::STATUS_FINALIZED, self::STATUS_FILED, self::STATUS_CLOSED], true);
    }
}
