<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Shipment extends Model
{
    use HasFactory;

    const STATUS_PENDING = 'PENDING';
    const STATUS_PICKED = 'PICKED';
    const STATUS_PACKED = 'PACKED';
    const STATUS_SHIPPED = 'SHIPPED';
    const STATUS_OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY';
    const STATUS_DELIVERED = 'DELIVERED';
    const STATUS_CANCELLED = 'CANCELLED';
    const STATUS_RETURNED = 'RETURNED';

    protected $fillable = [
        'company_id',
        'sale_id',
        'warehouse_id',
        'shipping_method_id',
        'shipment_number',
        'tracking_number',
        'carrier_name',
        'status',
        'shipping_cost',
        'notes',
        'shipped_at',
        'delivered_at',
        'created_by',
    ];

    protected $casts = [
        'shipping_cost' => 'decimal:4',
        'shipped_at' => 'datetime',
        'delivered_at' => 'datetime',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function shippingMethod()
    {
        return $this->belongsTo(ShippingMethod::class);
    }

    public function items()
    {
        return $this->hasMany(ShipmentItem::class);
    }
}
