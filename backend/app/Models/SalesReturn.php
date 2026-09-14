<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalesReturn extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'business_unit_id',
        'branch_id',
        'warehouse_id',
        'pos_terminal_id',
        'pos_session_id',
        'original_sale_id',
        'customer_id',
        'return_number',
        'return_date',
        'idempotency_key',
        'status',
        'return_type',
        'subtotal',
        'discount',
        'tax',
        'refund_total',
        'customer_credit_amount',
        'cash_refund_amount',
        'exchange_difference',
        'reason',
        'notes',
        'processed_by',
        'created_by',
        'updated_by',
    ];

    public function items() { return $this->hasMany(SalesReturnItem::class); }
    public function payments() { return $this->hasMany(SalesReturnPayment::class); }
    public function originalSale() { return $this->belongsTo(Sale::class, 'original_sale_id'); }
    public function customer() { return $this->belongsTo(Customer::class); }
    public function processor() { return $this->belongsTo(User::class, 'processed_by'); }
    public function branch() { return $this->belongsTo(Branch::class); }
    public function warehouse() { return $this->belongsTo(Warehouse::class); }
}
