<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Sale extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'business_unit_id',
        'branch_id',
        'warehouse_id',
        'pos_terminal_id',
        'pos_session_id',
        'customer_id',
        'invoice_number',
        'idempotency_key',
        'sale_date',
        'status',
        'subtotal',
        'discount_total',
        'tax_total',
        'grand_total',
        'paid_amount',
        'due_amount',
        'payment_status',
        'notes',
        'cashier_id',
        'created_by',
        'updated_by',
    ];

    public function items() { return $this->hasMany(SaleItem::class); }
    public function payments() { return $this->hasMany(SalePayment::class); }
    public function customer() { return $this->belongsTo(Customer::class); }
    public function terminal() { return $this->belongsTo(PosTerminal::class, 'pos_terminal_id'); }
    public function session() { return $this->belongsTo(PosSession::class, 'pos_session_id'); }
    public function cashier() { return $this->belongsTo(User::class, 'cashier_id'); }
    public function branch() { return $this->belongsTo(Branch::class); }
    public function warehouse() { return $this->belongsTo(Warehouse::class); }

    public function paymentAllocations() { return $this->morphMany(PaymentAllocation::class, 'allocatable'); }
    public function transactionTaxes() { return $this->morphMany(TransactionTax::class, 'taxable'); }
}
