<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class SupplierPriceAgreement extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'agreed_unit_price' => 'decimal:4',
        'min_order_quantity' => 'decimal:4',
        'effective_date' => 'date',
        'expiry_date' => 'date',
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

    public function contract(): BelongsTo
    {
        return $this->belongsTo(SupplierContract::class, 'supplier_contract_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function scopeActive($query)
    {
        $today = now()->toDateString();
        return $query->where('status', 'ACTIVE')
            ->where('effective_date', '<=', $today)
            ->where(function ($q) use ($today) {
                $q->whereNull('expiry_date')
                  ->orWhere('expiry_date', '>=', $today);
            });
    }
}
