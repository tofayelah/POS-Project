<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use DomainException;

class PosSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'business_unit_id',
        'branch_id',
        'warehouse_id',
        'pos_terminal_id',
        'cashier_id',
        'session_number',
        'opened_at',
        'closed_at',
        'opening_cash',
        'closing_cash',
        'expected_cash',
        'cash_difference',
        'cash_in_total',
        'cash_out_total',
        'cash_sales_total',
        'cash_refunds_total',
        'variance_status',
        'variance_approved_by',
        'variance_approved_at',
        'denominations',
        'status',
        'notes',
        'closed_by',
    ];

    protected $casts = [
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
        'variance_approved_at' => 'datetime',
        'opening_cash' => 'decimal:4',
        'closing_cash' => 'decimal:4',
        'expected_cash' => 'decimal:4',
        'cash_difference' => 'decimal:4',
        'cash_in_total' => 'decimal:4',
        'cash_out_total' => 'decimal:4',
        'cash_sales_total' => 'decimal:4',
        'cash_refunds_total' => 'decimal:4',
        'denominations' => 'array',
    ];

    protected static function boot()
    {
        parent::boot();

        static::updating(function ($session) {
            if ($session->getOriginal('status') === 'CLOSED') {
                $dirty = array_keys($session->getDirty());
                $allowedOnClosed = ['variance_approved_by', 'variance_approved_at', 'notes', 'updated_at'];
                $disallowed = array_diff($dirty, $allowedOnClosed);
                if (!empty($disallowed)) {
                    throw new DomainException('Closed POS sessions are immutable and cannot be modified: ' . implode(', ', $disallowed));
                }
            }
        });

        static::deleting(function ($session) {
            if ($session->status === 'CLOSED') {
                throw new DomainException('Closed POS sessions cannot be deleted.');
            }
        });
    }

    public function terminal() { return $this->belongsTo(PosTerminal::class, 'pos_terminal_id'); }
    public function cashier() { return $this->belongsTo(User::class, 'cashier_id'); }
    public function closedBy() { return $this->belongsTo(User::class, 'closed_by'); }
    public function varianceApprover() { return $this->belongsTo(User::class, 'variance_approved_by'); }
    public function branch() { return $this->belongsTo(Branch::class, 'branch_id'); }
    public function company() { return $this->belongsTo(Company::class, 'company_id'); }
    public function sales() { return $this->hasMany(Sale::class, 'pos_session_id'); }
    public function salesReturns() { return $this->hasMany(SalesReturn::class, 'pos_session_id'); }
    public function cashMovements() { return $this->hasMany(PosCashMovement::class, 'pos_session_id'); }
}
