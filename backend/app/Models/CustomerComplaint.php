<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerComplaint extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'customer_id',
        'complaint_number',
        'category', // PRODUCT_QUALITY, BILLING, SERVICE, DELIVERY, STAFF_BEHAVIOR, OTHER
        'subject',
        'description',
        'priority', // LOW, MEDIUM, HIGH, URGENT
        'status', // OPEN, IN_PROGRESS, RESOLVED, CLOSED
        'assigned_to',
        'resolution',
        'resolved_by',
        'resolved_at',
        'created_by',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
    ];

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

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
