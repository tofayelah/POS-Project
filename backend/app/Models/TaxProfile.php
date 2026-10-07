<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TaxProfile extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'effective_from' => 'date',
        'effective_to' => 'date',
    ];

    public const TYPE_VAT_REGISTERED = 'VAT_REGISTERED';
    public const TYPE_TURNOVER_TAX = 'TURNOVER_TAX';
    public const TYPE_EXEMPT = 'EXEMPT';
    public const TYPE_NON_REGISTERED = 'NON_REGISTERED';
    public const TYPE_OTHER = 'OTHER';

    public const STATUS_ACTIVE = 'ACTIVE';
    public const STATUS_INACTIVE = 'INACTIVE';

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function businessUnit(): BelongsTo
    {
        return $this->belongsTo(BusinessUnit::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(TaxRegistration::class);
    }
}
