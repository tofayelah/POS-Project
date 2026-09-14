<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalesReturnPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'sales_return_id',
        'payment_method',
        'amount',
        'reference',
        'notes',
    ];

    public function salesReturn() { return $this->belongsTo(SalesReturn::class); }
}
