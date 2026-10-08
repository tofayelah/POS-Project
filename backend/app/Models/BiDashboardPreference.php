<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BiDashboardPreference extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'widget_order' => 'array',
        'hidden_widgets' => 'array',
        'custom_filters' => 'array',
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
