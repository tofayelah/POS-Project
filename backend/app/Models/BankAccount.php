<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BankAccount extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'opening_balance' => 'decimal:4',
        'current_balance' => 'decimal:4',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function glAccount()
    {
        return $this->belongsTo(Account::class, 'account_id');
    }

    public function statements()
    {
        return $this->hasMany(BankStatement::class);
    }

    public function reconciliations()
    {
        return $this->hasMany(BankReconciliation::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
