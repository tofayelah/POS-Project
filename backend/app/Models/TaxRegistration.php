<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaxRegistration extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'issue_date' => 'date',
        'effective_date' => 'date',
        'expiry_date' => 'date',
    ];

    public const TYPE_VAT = 'VAT';
    public const TYPE_TURNOVER_TAX = 'TURNOVER_TAX';
    public const TYPE_INCOME_TAX = 'INCOME_TAX';
    public const TYPE_CUSTOMS_BIN = 'CUSTOMS_BIN';
    public const TYPE_OTHER = 'OTHER';

    public const STATUS_ACTIVE = 'ACTIVE';
    public const STATUS_SUSPENDED = 'SUSPENDED';
    public const STATUS_EXPIRED = 'EXPIRED';
    public const STATUS_CANCELLED = 'CANCELLED';

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function taxProfile(): BelongsTo
    {
        return $this->belongsTo(TaxProfile::class);
    }
}
