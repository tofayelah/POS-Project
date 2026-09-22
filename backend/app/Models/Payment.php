<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Payment extends Model {
    protected $guarded = [];

    protected $casts = [
        'amount' => 'decimal:4',
        'idempotency_key' => 'string',
        'payload_hash' => 'string',
    ];

    public function allocations() { return $this->hasMany(PaymentAllocation::class); }
}
