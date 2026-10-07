<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class TaxTransaction extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'document_date' => 'date',
        'taxable_amount' => 'decimal:4',
        'tax_amount' => 'decimal:4',
        'sd_amount' => 'decimal:4',
        'at_amount' => 'decimal:4',
        'withholding_amount' => 'decimal:4',
        'total_tax_amount' => 'decimal:4',
        'is_inclusive' => 'boolean',
        'metadata' => 'array',
        'posted_at' => 'datetime',
    ];

    public const TYPE_SALE_OUTPUT = 'SALE_OUTPUT';
    public const TYPE_PURCHASE_INPUT = 'PURCHASE_INPUT';
    public const TYPE_SALE_RETURN_REVERSAL = 'SALE_RETURN_REVERSAL';
    public const TYPE_PURCHASE_RETURN_REVERSAL = 'PURCHASE_RETURN_REVERSAL';
    public const TYPE_EXPENSE_INPUT = 'EXPENSE_INPUT';
    public const TYPE_PAYROLL_WITHHOLDING = 'PAYROLL_WITHHOLDING';
    public const TYPE_TAX_ADJUSTMENT = 'TAX_ADJUSTMENT';
    public const TYPE_TAX_SETTLEMENT = 'TAX_SETTLEMENT';
    public const TYPE_IMPORT_TAX = 'IMPORT_TAX';

    public const STATUS_POSTED = 'POSTED';
    public const STATUS_ADJUSTED = 'ADJUSTED';
    public const STATUS_REVERSED = 'REVERSED';
    public const STATUS_VOID = 'VOID';

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(TaxPeriod::class, 'tax_period_id');
    }

    public function source(): MorphTo
    {
        return $this->morphTo();
    }

    public function rule(): BelongsTo
    {
        return $this->belongsTo(TaxRule::class, 'tax_rule_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(TaxCategory::class, 'tax_category_id');
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }

    public function components(): HasMany
    {
        return $this->hasMany(TaxTransactionComponent::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
