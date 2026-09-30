<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerPointLedger extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'customer_id',
        'sale_id',
        'transaction_type',
        'points',
        'balance_before',
        'balance_after',
        'reference_number',
        'description',
        'created_by',
    ];

    protected $casts = [
        'points' => 'decimal:4',
        'balance_before' => 'decimal:4',
        'balance_after' => 'decimal:4',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
