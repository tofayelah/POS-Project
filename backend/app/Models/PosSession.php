<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
        'status',
        'notes',
        'closed_by',
    ];

    protected $casts = [
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function terminal() { return $this->belongsTo(PosTerminal::class, 'pos_terminal_id'); }
    public function cashier() { return $this->belongsTo(User::class, 'cashier_id'); }
}
