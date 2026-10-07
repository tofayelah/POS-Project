<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EcommerceCartItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'cart_id',
        'product_variant_id',
        'quantity',
        'unit_price_snapshot',
    ];

    protected $casts = [
        'quantity' => 'decimal:4',
        'unit_price_snapshot' => 'decimal:4',
    ];

    public function cart()
    {
        return $this->belongsTo(EcommerceCart::class, 'cart_id');
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }
}
