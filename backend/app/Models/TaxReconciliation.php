<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaxReconciliation extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'reconciled_date' => 'date',
        'output_vat_subledger' => 'decimal:4',
        'output_vat_gl' => 'decimal:4',
        'output_vat_difference' => 'decimal:4',
        'input_vat_subledger' => 'decimal:4',
        'input_vat_gl' => 'decimal:4',
        'input_vat_difference' => 'decimal:4',
        'adjustments_total' => 'decimal:4',
        'net_tax_payable' => 'decimal:4',
        'exceptions' => 'array',
    ];

    public const STATUS_RECONCILED = 'RECONCILED';
    public const STATUS_EXCEPTION = 'EXCEPTION';
    public const STATUS_PENDING_REVIEW = 'PENDING_REVIEW';

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(TaxPeriod::class, 'tax_period_id');
    }

    public function reconciledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reconciled_by');
    }
}
