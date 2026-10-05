<?php

namespace App\Models;

use DomainException;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreCreditTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'customer_id',
        'store_credit_account_id',
        'type',
        'amount',
        'balance_before',
        'balance_after',
        'reference_type',
        'reference_id',
        'reference_number',
        'description',
        'expires_at',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:4',
        'balance_before' => 'decimal:4',
        'balance_after' => 'decimal:4',
        'expires_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::updating(function () {
            throw new DomainException('Store credit transactions are immutable and cannot be updated.');
        });

        static::deleting(function () {
            throw new DomainException('Store credit transactions are immutable and cannot be deleted.');
        });
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(StoreCreditAccount::class, 'store_credit_account_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
