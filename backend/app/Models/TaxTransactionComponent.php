<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaxTransactionComponent extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'rate' => 'decimal:4',
        'taxable_base' => 'decimal:4',
        'tax_amount' => 'decimal:4',
    ];

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(TaxTransaction::class, 'tax_transaction_id');
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
