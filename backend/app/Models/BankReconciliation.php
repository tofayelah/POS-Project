<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BankReconciliation extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'reconciliation_date' => 'date',
        'gl_balance' => 'decimal:4',
        'statement_balance' => 'decimal:4',
        'difference' => 'decimal:4',
        'completed_at' => 'datetime',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function bankAccount()
    {
        return $this->belongsTo(BankAccount::class);
    }

    public function bankStatement()
    {
        return $this->belongsTo(BankStatement::class);
    }

    public function matches()
    {
        return $this->hasMany(BankReconciliationMatch::class);
    }

    public function completedBy()
    {
        return $this->belongsTo(User::class, 'completed_by');
    }
}
