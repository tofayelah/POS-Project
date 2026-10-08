<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BiAlert extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'threshold_value' => 'decimal:4',
        'current_value' => 'decimal:4',
        'acknowledged_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function acknowledgedBy()
    {
        return $this->belongsTo(User::class, 'acknowledged_by');
    }
}
