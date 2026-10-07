<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EcommerceStore extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'company_id',
        'code',
        'name',
        'domain',
        'default_branch_id',
        'default_warehouse_id',
        'currency',
        'is_active',
        'guest_checkout_enabled',
        'cod_enabled',
        'online_payment_enabled',
        'order_prefix',
        'settings',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'guest_checkout_enabled' => 'boolean',
        'cod_enabled' => 'boolean',
        'online_payment_enabled' => 'boolean',
        'settings' => 'array',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function defaultBranch()
    {
        return $this->belongsTo(Branch::class, 'default_branch_id');
    }

    public function defaultWarehouse()
    {
        return $this->belongsTo(Warehouse::class, 'default_warehouse_id');
    }

    public function categories()
    {
        return $this->hasMany(EcommerceCategory::class, 'company_id', 'company_id');
    }
}
