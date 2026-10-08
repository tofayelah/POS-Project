<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BiSavedReport extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'dimensions' => 'array',
        'metrics' => 'array',
        'filters' => 'array',
        'group_by' => 'array',
        'schedule_recipients' => 'array',
        'is_public' => 'boolean',
        'last_run_at' => 'datetime',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
