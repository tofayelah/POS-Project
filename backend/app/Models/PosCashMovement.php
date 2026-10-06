<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use DomainException;

class PosCashMovement extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'branch_id',
        'pos_session_id',
        'pos_terminal_id',
        'user_id',
        'movement_number',
        'type',
        'amount',
        'reason',
        'reference',
        'idempotency_key',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:4',
    ];

    protected static function boot()
    {
        parent::boot();

        static::updating(function () {
            throw new DomainException('POS cash movements are append-only and cannot be modified.');
        });

        static::deleting(function () {
            throw new DomainException('POS cash movements are immutable and cannot be deleted.');
        });
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function session()
    {
        return $this->belongsTo(PosSession::class, 'pos_session_id');
    }

    public function terminal()
    {
        return $this->belongsTo(PosTerminal::class, 'pos_terminal_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
