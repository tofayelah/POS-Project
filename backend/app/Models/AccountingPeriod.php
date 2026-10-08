<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AccountingPeriod extends Model
{
    use HasFactory;

    protected $guarded = ['id'];
    
    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'closed_at' => 'datetime',
        'reopened_at' => 'datetime',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }
    
    public function fiscalYear()
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function closedBy()
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function reopenedBy()
    {
        return $this->belongsTo(User::class, 'reopened_by');
    }

    public function isOpen(): bool
    {
        return $this->status === 'OPEN';
    }

    public function isSoftLocked(): bool
    {
        return $this->status === 'SOFT_LOCK' || $this->status === 'LOCKED';
    }

    public function isClosed(): bool
    {
        return $this->status === 'CLOSED';
    }
}
