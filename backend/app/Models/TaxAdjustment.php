<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaxAdjustment extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'amount' => 'decimal:4',
        'tax_amount' => 'decimal:4',
        'approved_at' => 'datetime',
        'posted_at' => 'datetime',
    ];

    public const TYPE_OUTPUT_INCREASE = 'OUTPUT_VAT_INCREASE';
    public const TYPE_OUTPUT_DECREASE = 'OUTPUT_VAT_DECREASE';
    public const TYPE_INPUT_INCREASE = 'INPUT_VAT_INCREASE';
    public const TYPE_INPUT_DECREASE = 'INPUT_VAT_DECREASE';
    public const TYPE_ROUNDING = 'ROUNDING';
    public const TYPE_CREDIT_NOTE = 'CREDIT_NOTE';
    public const TYPE_DEBIT_NOTE = 'DEBIT_NOTE';
    public const TYPE_OTHER = 'OTHER';

    public const STATUS_DRAFT = 'DRAFT';
    public const STATUS_APPROVED = 'APPROVED';
    public const STATUS_POSTED = 'POSTED';
    public const STATUS_REJECTED = 'REJECTED';

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

    public function sourceTransaction(): BelongsTo
    {
        return $this->belongsTo(TaxTransaction::class, 'source_tax_transaction_id');
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function postedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
