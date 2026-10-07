<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class TaxRule extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'rate' => 'float',
        'inclusive_allowed' => 'boolean',
        'exclusive_allowed' => 'boolean',
        'effective_from' => 'date',
        'effective_to' => 'date',
        'priority' => 'integer',
    ];

    public const CALC_PERCENTAGE = 'PERCENTAGE';
    public const CALC_FIXED = 'FIXED';
    public const CALC_COMPOUND = 'COMPOUND_PERCENTAGE';
    public const CALC_CONFIGURED = 'CONFIGURED';

    public const BASE_NET = 'NET_AMOUNT';
    public const BASE_GROSS = 'GROSS_AMOUNT';
    public const BASE_ASSESSMENT = 'ASSESSMENT_VALUE';
    public const BASE_PREVIOUS = 'PREVIOUS_COMPONENTS';

    public const STATUS_ACTIVE = 'ACTIVE';
    public const STATUS_INACTIVE = 'INACTIVE';
    public const STATUS_SUPERSEDED = 'SUPERSEDED';

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(TaxCategory::class, 'tax_category_id');
    }

    public function components(): HasMany
    {
        return $this->hasMany(TaxComponent::class)->orderBy('sequence');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(TaxTransaction::class);
    }

    public function isEffectiveOn(string $date): bool
    {
        if ($this->status !== self::STATUS_ACTIVE) {
            return false;
        }

        if ($this->effective_from->format('Y-m-d') > $date) {
            return false;
        }

        if ($this->effective_to && $this->effective_to->format('Y-m-d') < $date) {
            return false;
        }

        return true;
    }
}
