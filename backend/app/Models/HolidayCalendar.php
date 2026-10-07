<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HolidayCalendar extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'name',
        'holiday_date',
        'type',
        'description',
        'status',
    ];

    protected $casts = [
        'holiday_date' => 'date',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }
}
