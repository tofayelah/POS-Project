<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaxComponent extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'rate' => 'float',
        'sequence' => 'integer',
    ];

    public const TYPE_OUTPUT_VAT = 'OUTPUT_VAT';
    public const TYPE_INPUT_VAT = 'INPUT_VAT';
    public const TYPE_SUPPLEMENTARY_DUTY = 'SUPPLEMENTARY_DUTY';
    public const TYPE_WITHHOLDING_TAX = 'WITHHOLDING_TAX';
    public const TYPE_ADVANCE_TAX = 'ADVANCE_TAX';
    public const TYPE_OTHER = 'OTHER';

    public function rule(): BelongsTo
    {
        return $this->belongsTo(TaxRule::class, 'tax_rule_id');
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
