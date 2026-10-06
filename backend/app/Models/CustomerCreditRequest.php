<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerCreditRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'customer_id',
        'requested_credit_limit',
        'requested_credit_days',
        'current_credit_limit',
        'current_credit_days',
        'reason',
        'risk_notes',
        'status', // PENDING, APPROVED, REJECTED, SUSPENDED
        'requested_by',
        'reviewed_by',
        'reviewed_at',
        'review_notes',
    ];

    protected $casts = [
        'requested_credit_limit' => 'decimal:4',
        'current_credit_limit' => 'decimal:4',
        'requested_credit_days' => 'integer',
        'current_credit_days' => 'integer',
        'reviewed_at' => 'datetime',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
