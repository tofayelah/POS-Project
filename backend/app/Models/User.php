<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $guarded = ['id'];
    protected $hidden = ['password', 'remember_token'];
    protected $casts = ['email_verified_at' => 'datetime', 'password' => 'hashed', 'last_login_at' => 'datetime'];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) \Illuminate\Support\Str::uuid();
            }
        });
    }

    public function roles() { return $this->belongsToMany(Role::class); }
    public function companies() { return $this->belongsToMany(Company::class, 'user_company_access'); }
    public function businessUnits() { return $this->belongsToMany(BusinessUnit::class, 'user_business_unit_access'); }
    public function branches() { return $this->belongsToMany(Branch::class, 'user_branch_access'); }
    public function warehouses() { return $this->belongsToMany(Warehouse::class, 'user_warehouse_access'); }

    /**
     * Check if user has a specific role.
     */
    public function hasRole(string $role): bool
    {
        $roles = $this->relationLoaded('roles') ? $this->roles : $this->roles()->get();
        return $roles->contains(fn($r) => strtolower($r->name) === strtolower($role));
    }

    /**
     * Check if user has a specific permission.
     */
    public function hasPermission(string $permission): bool
    {
        if ($this->hasRole('Super Admin')) {
            return true;
        }

        $roles = $this->relationLoaded('roles') 
            ? $this->roles 
            : $this->roles()->with('permissions')->get();

        return $roles->flatMap(function ($role) {
            return $role->relationLoaded('permissions') 
                ? $role->permissions 
                : $role->permissions()->get();
        })->contains(fn($p) => strtolower($p->name) === strtolower($permission));
    }

    /**
     * Check if user has any of the given permissions.
     */
    public function hasAnyPermission(array $permissions): bool
    {
        if ($this->hasRole('Super Admin')) {
            return true;
        }

        foreach ($permissions as $permission) {
            if ($this->hasPermission($permission)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if user has access to a specific company ID.
     */
    public function hasCompanyAccess(int|string $companyId): bool
    {
        if ($this->hasRole('Super Admin')) {
            return true;
        }
        $companies = $this->relationLoaded('companies') ? $this->companies : $this->companies()->get();
        return $companies->contains('id', (int) $companyId);
    }

    /**
     * Check if user has access to a specific business unit ID.
     */
    public function hasBusinessUnitAccess(int|string $businessUnitId): bool
    {
        if ($this->hasRole('Super Admin')) {
            return true;
        }
        $businessUnits = $this->relationLoaded('businessUnits') ? $this->businessUnits : $this->businessUnits()->get();
        return $businessUnits->contains('id', (int) $businessUnitId);
    }

    /**
     * Check if user has access to a specific branch ID.
     */
    public function hasBranchAccess(int|string $branchId): bool
    {
        if ($this->hasRole('Super Admin')) {
            return true;
        }
        $branches = $this->relationLoaded('branches') ? $this->branches : $this->branches()->get();
        return $branches->contains('id', (int) $branchId);
    }

    /**
     * Check if user has access to a specific warehouse ID.
     */
    public function hasWarehouseAccess(int|string $warehouseId): bool
    {
        if ($this->hasRole('Super Admin')) {
            return true;
        }
        $warehouses = $this->relationLoaded('warehouses') ? $this->warehouses : $this->warehouses()->get();
        return $warehouses->contains('id', (int) $warehouseId);
    }
}
