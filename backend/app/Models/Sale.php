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
        'due_date',
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
        'salesperson_id',
        'channel',
        'order_number',
        'fulfillment_status',
        'shipping_amount',
        'shipping_method_id',
        'shipping_address_snapshot',
        'billing_address_snapshot',
        'tracking_number',
        'delivery_notes',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'subtotal' => 'decimal:4',
        'discount_total' => 'decimal:4',
        'tax_total' => 'decimal:4',
        'shipping_amount' => 'decimal:4',
        'grand_total' => 'decimal:4',
        'paid_amount' => 'decimal:4',
        'due_amount' => 'decimal:4',
        'shipping_address_snapshot' => 'array',
        'billing_address_snapshot' => 'array',
    ];

    public function items() { return $this->hasMany(SaleItem::class); }
    public function payments() { return $this->hasMany(SalePayment::class); }
    public function customer() { return $this->belongsTo(Customer::class); }
    public function terminal() { return $this->belongsTo(PosTerminal::class, 'pos_terminal_id'); }
    public function posTerminal() { return $this->belongsTo(PosTerminal::class, 'pos_terminal_id'); }
    public function session() { return $this->belongsTo(PosSession::class, 'pos_session_id'); }
    public function cashier() { return $this->belongsTo(User::class, 'cashier_id'); }
    public function salesperson() { return $this->belongsTo(User::class, 'salesperson_id'); }
    public function branch() { return $this->belongsTo(Branch::class); }
    public function warehouse() { return $this->belongsTo(Warehouse::class); }
    public function shippingMethod() { return $this->belongsTo(ShippingMethod::class, 'shipping_method_id'); }
    public function shipments() { return $this->hasMany(Shipment::class); }
    public function reservations() { return $this->hasMany(InventoryReservation::class); }
    public function couponUsages() { return $this->hasMany(CouponUsage::class); }
    public function onlinePaymentTransactions() { return $this->hasMany(OnlinePaymentTransaction::class); }
    public function salesReturns() { return $this->hasMany(SalesReturn::class, 'original_sale_id'); }

    public function paymentAllocations() { return $this->morphMany(PaymentAllocation::class, 'allocatable'); }
    public function transactionTaxes() { return $this->morphMany(TransactionTax::class, 'taxable'); }

    public function scopeEcommerce($query)
    {
        return $query->where('channel', 'ECOMMERCE');
    }

    public function scopePos($query)
    {
        return $query->where('channel', 'POS');
    }
}
