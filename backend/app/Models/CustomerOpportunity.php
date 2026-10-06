<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerOpportunity extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'customer_id',
        'title',
        'stage', // NEW, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST
        'estimated_value',
        'probability',
        'expected_close_date',
        'assigned_to',
        'lost_reason',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'estimated_value' => 'decimal:4',
        'probability' => 'integer',
        'expected_close_date' => 'date',
    ];

    protected $appends = [
        'probability_pct',
        'expected_value',
    ];

    public function getProbabilityPctAttribute(): ?int
    {
        return $this->probability;
    }

    public function getExpectedValueAttribute(): ?float
    {
        return $this->estimated_value !== null ? (float) $this->estimated_value : null;
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function salesperson(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
