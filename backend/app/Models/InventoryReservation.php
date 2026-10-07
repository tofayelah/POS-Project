<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryReservation extends Model
{
    use HasFactory;

    const STATUS_RESERVED = 'RESERVED';
    const STATUS_ALLOCATED = 'ALLOCATED';
    const STATUS_CONSUMED = 'CONSUMED';
    const STATUS_RELEASED = 'RELEASED';

    protected $fillable = [
        'company_id',
        'warehouse_id',
        'product_variant_id',
        'sale_id',
        'reservation_token',
        'quantity',
        'status',
        'expires_at',
        'released_at',
        'consumed_at',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'decimal:4',
        'expires_at' => 'datetime',
        'released_at' => 'datetime',
        'consumed_at' => 'datetime',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }
}
