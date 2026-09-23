<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Purchase extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'invoice_date' => 'date',
        'due_date' => 'date',
        'subtotal' => 'decimal:4',
        'discount_total' => 'decimal:4',
        'tax_total' => 'decimal:4',
        'shipping_cost' => 'decimal:4',
        'other_cost' => 'decimal:4',
        'grand_total' => 'decimal:4',
        'posted_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function goodsReceipt(): BelongsTo
    {
        return $this->belongsTo(GoodsReceipt::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseItem::class);
    }

    public function paymentAllocations() { return $this->morphMany(PaymentAllocation::class, 'allocatable'); }
    public function transactionTaxes() { return $this->morphMany(TransactionTax::class, 'taxable'); }

    public function getPaidAmountAttribute(): float
    {
        return round((float) $this->paymentAllocations()->sum('amount'), 4);
    }

    public function getDueAmountAttribute(): float
    {
        return max(0, round((float) $this->grand_total - $this->paid_amount, 4));
    }

    public function getPaymentStatusAttribute(): string
    {
        if ($this->paid_amount <= 0) {
            return 'DUE';
        }
        if ($this->due_amount <= 0.0001) {
            return 'PAID';
        }
        return 'PARTIAL';
    }
}
