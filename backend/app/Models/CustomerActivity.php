<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerActivity extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'customer_id',
        'activity_type', // CALL, MEETING, VISIT, EMAIL, MESSAGE, FOLLOW_UP, NOTE, TASK
        'subject',
        'description',
        'activity_at',
        'status', // OPEN, IN_PROGRESS, COMPLETED, CANCELLED, OVERDUE
        'priority', // LOW, MEDIUM, HIGH, URGENT
        'next_action_date',
        'assigned_to',
        'created_by',
        'completed_at',
        'completion_notes',
    ];

    protected $casts = [
        'activity_at' => 'datetime',
        'next_action_date' => 'datetime',
        'completed_at' => 'datetime',
    ];

    protected static function booted()
    {
        static::creating(function ($activity) {
            if (empty($activity->activity_at)) {
                $activity->activity_at = now();
            }
        });
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

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
