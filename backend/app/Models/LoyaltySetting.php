<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoyaltySetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'earning_spend_per_point',
        'earning_points_awarded',
        'redemption_point_value',
        'min_redemption_points',
        'is_active',
        'disallow_earn_on_discount',
        'disallow_earn_on_redemption',
        'disallow_discount_with_redemption',
    ];

    protected $casts = [
        'earning_spend_per_point' => 'decimal:4',
        'earning_points_awarded' => 'decimal:4',
        'redemption_point_value' => 'decimal:4',
        'min_redemption_points' => 'decimal:4',
        'is_active' => 'boolean',
        'disallow_earn_on_discount' => 'boolean',
        'disallow_earn_on_redemption' => 'boolean',
        'disallow_discount_with_redemption' => 'boolean',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
