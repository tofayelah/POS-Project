<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerCreditOverride extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'customer_id',
        'sale_id',
        'previous_available_credit',
        'requested_exposure',
        'approved_exposure',
        'override_reason',
        'approved_by',
    ];

    protected $casts = [
        'previous_available_credit' => 'decimal:4',
        'requested_exposure' => 'decimal:4',
        'approved_exposure' => 'decimal:4',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
