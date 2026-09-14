<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Account extends Model
{
    use HasFactory;

    protected $guarded = ['id'];
    
    protected $casts = [
        'is_system' => 'boolean',
        'is_active' => 'boolean',
        'allow_manual_posting' => 'boolean',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }
    
    public function parent()
    {
        return $this->belongsTo(Account::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(Account::class, 'parent_id');
    }
    
    public function group()
    {
        return $this->belongsTo(AccountGroup::class, 'account_group_id');
    }
}
