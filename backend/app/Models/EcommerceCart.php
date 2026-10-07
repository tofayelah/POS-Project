<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EcommerceCart extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'store_id',
        'customer_id',
        'guest_token',
        'coupon_code',
        'discount_amount',
        'expires_at',
    ];

    protected $casts = [
        'discount_amount' => 'decimal:4',
        'expires_at' => 'datetime',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function store()
    {
        return $this->belongsTo(EcommerceStore::class, 'store_id');
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function items()
    {
        return $this->hasMany(EcommerceCartItem::class, 'cart_id');
    }
}
