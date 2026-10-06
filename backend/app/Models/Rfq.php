<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Rfq extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'issue_date' => 'date',
        'deadline_date' => 'date',
        'target_delivery_date' => 'date',
        'awarded_at' => 'datetime',
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

    public function requisition(): BelongsTo
    {
        return $this->belongsTo(PurchaseRequisition::class, 'purchase_requisition_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(RfqItem::class);
    }

    public function invitedSuppliers(): HasMany
    {
        return $this->hasMany(RfqInvitedSupplier::class);
    }

    public function quotations(): HasMany
    {
        return $this->hasMany(SupplierQuotation::class);
    }

    public function awardedSupplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'awarded_supplier_id');
    }

    public function awardedQuotation(): BelongsTo
    {
        return $this->belongsTo(SupplierQuotation::class, 'awarded_quotation_id');
    }

    public function awardedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'awarded_by');
    }
}
