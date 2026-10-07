<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ShippingRate extends Model
{
    use HasFactory;

    protected $fillable = [
        'shipping_method_id',
        'shipping_zone_id',
        'base_rate',
        'per_kg_rate',
        'free_shipping_threshold',
    ];

    protected $casts = [
        'base_rate' => 'decimal:4',
        'per_kg_rate' => 'decimal:4',
        'free_shipping_threshold' => 'decimal:4',
    ];

    public function method()
    {
        return $this->belongsTo(ShippingMethod::class, 'shipping_method_id');
    }

    public function zone()
    {
        return $this->belongsTo(ShippingZone::class, 'shipping_zone_id');
    }
}
