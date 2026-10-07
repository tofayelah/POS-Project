<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OnlinePaymentTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'sale_id',
        'gateway',
        'transaction_reference',
        'amount',
        'currency',
        'status',
        'idempotency_key',
        'payload_snapshot',
        'webhook_response',
    ];

    protected $casts = [
        'amount' => 'decimal:4',
        'payload_snapshot' => 'array',
        'webhook_response' => 'array',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }
}
