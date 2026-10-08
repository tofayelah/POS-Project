<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BankStatementLine extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'transaction_date' => 'date',
        'value_date' => 'date',
        'debit' => 'decimal:4',
        'credit' => 'decimal:4',
        'balance' => 'decimal:4',
    ];

    public function bankStatement()
    {
        return $this->belongsTo(BankStatement::class);
    }

    public function matches()
    {
        return $this->hasMany(BankReconciliationMatch::class);
    }
}
