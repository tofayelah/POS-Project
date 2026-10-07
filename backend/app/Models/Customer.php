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
        'company_name',
        'contact_person',
        'customer_type',
        'mobile',
        'alternate_mobile',
        'email',
        'address',
        'billing_address',
        'shipping_address',
        'city',
        'country',
        'bin_number',
        'tin_number',
        'tax_status',
        'tax_exemption_number',
        'credit_limit',
        'credit_days',
        'credit_status',
        'credit_hold_reason',
        'credit_approved_by',
        'credit_approved_at',
        'payment_terms',
        'opening_balance',
        'points_balance',
        'rfm_recency_score',
        'rfm_frequency_score',
        'rfm_monetary_score',
        'rfm_composite_score',
        'rfm_segment',
        'rfm_calculated_at',
        'notes',
        'status',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'credit_limit' => 'decimal:4',
        'credit_days' => 'integer',
        'credit_approved_at' => 'datetime',
        'opening_balance' => 'decimal:4',
        'points_balance' => 'decimal:4',
        'rfm_recency_score' => 'integer',
        'rfm_frequency_score' => 'integer',
        'rfm_monetary_score' => 'integer',
        'rfm_calculated_at' => 'datetime',
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

    public function pointLedgers()
    {
        return $this->hasMany(CustomerPointLedger::class);
    }

    public function storeCreditAccount()
    {
        return $this->hasOne(StoreCreditAccount::class);
    }

    public function storeCreditTransactions()
    {
        return $this->hasMany(StoreCreditTransaction::class);
    }

    public function creditRequests()
    {
        return $this->hasMany(CustomerCreditRequest::class);
    }

    public function creditOverrides()
    {
        return $this->hasMany(CustomerCreditOverride::class);
    }

    public function activities()
    {
        return $this->hasMany(CustomerActivity::class);
    }

    public function complaints()
    {
        return $this->hasMany(CustomerComplaint::class);
    }

    public function opportunities()
    {
        return $this->hasMany(CustomerOpportunity::class);
    }

    public function sales()
    {
        return $this->hasMany(Sale::class);
    }

    public function salesReturns()
    {
        return $this->hasMany(SalesReturn::class);
    }
}

