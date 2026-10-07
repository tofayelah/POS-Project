<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TaxCategory extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    public const CODE_STANDARD_VAT = 'STANDARD_VAT';
    public const CODE_ZERO_RATED = 'ZERO_RATED';
    public const CODE_EXEMPT = 'EXEMPT';
    public const CODE_TURNOVER_TAX = 'TURNOVER_TAX';
    public const CODE_SUPPLEMENTARY_DUTY = 'SUPPLEMENTARY_DUTY';
    public const CODE_WITHHOLDING_TAX = 'WITHHOLDING_TAX';
    public const CODE_ADVANCE_TAX = 'ADVANCE_TAX';
    public const CODE_IMPORT_VAT = 'IMPORT_VAT';
    public const CODE_EXPORT_VAT = 'EXPORT_VAT';

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function rules(): HasMany
    {
        return $this->hasMany(TaxRule::class);
    }

    public function taxes(): HasMany
    {
        return $this->hasMany(Tax::class);
    }
}
