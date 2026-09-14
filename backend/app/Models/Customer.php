<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'company_id',
        'business_unit_id',
        'customer_group_id',
        'customer_code',
        'name',
        'mobile',
        'alternate_mobile',
        'email',
        'address',
        'city',
        'country',
        'credit_limit',
        'payment_terms',
        'opening_balance',
        'notes',
        'status',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'credit_limit' => 'decimal:4',
        'opening_balance' => 'decimal:4',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function group()
    {
        return $this->belongsTo(CustomerGroup::class, 'customer_group_id');
    }

    public function ledgers()
    {
        return $this->hasMany(CustomerLedger::class);
    }
}
