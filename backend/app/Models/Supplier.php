<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Supplier extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'opening_balance' => 'decimal:4',
        'credit_limit' => 'decimal:4',
        'min_order_value' => 'decimal:4',
        'min_order_qty' => 'decimal:4',
        'score_cached' => 'decimal:2',
        'last_evaluated_at' => 'datetime',
        'qualified_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
            if (empty($model->qualification_status)) {
                $model->qualification_status = 'QUALIFIED';
            }
        });
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function businessUnit(): BelongsTo
    {
        return $this->belongsTo(BusinessUnit::class);
    }
    
    public function ledgers(): HasMany
    {
        return $this->hasMany(SupplierLedger::class);
    }

    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrder::class);
    }

    public function contracts(): HasMany
    {
        return $this->hasMany(SupplierContract::class);
    }

    public function priceAgreements(): HasMany
    {
        return $this->hasMany(SupplierPriceAgreement::class);
    }

    public function quotations(): HasMany
    {
        return $this->hasMany(SupplierQuotation::class);
    }

    public function qualifiedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'qualified_by');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'ACTIVE');
    }

    public function scopeQualified($query)
    {
        return $query->where('qualification_status', 'QUALIFIED');
    }

    public function scopeActiveAndQualified($query)
    {
        return $query->where('status', 'ACTIVE')->where('qualification_status', 'QUALIFIED');
    }
}
