<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkingCalendar extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'day_of_week',
        'is_working_day',
        'notes',
    ];

    protected $casts = [
        'day_of_week' => 'integer',
        'is_working_day' => 'boolean',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }
}
