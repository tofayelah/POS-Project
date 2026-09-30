<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

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
                $model->uuid = (string) Str::uuid();
            }
        });
    }

    public function roles() { return $this->belongsToMany(Role::class); }
    public function companies() { return $this->belongsToMany(Company::class, 'user_company_access'); }
    public function businessUnits() { return $this->belongsToMany(BusinessUnit::class, 'user_business_unit_access'); }
    public function branches() { return $this->belongsToMany(Branch::class, 'user_branch_access'); }
    public function warehouses() { return $this->belongsToMany(Warehouse::class, 'user_warehouse_access'); }

    public function hasRole(string $role): bool
    {
        $roles = $this->relationLoaded('roles') ? $this->roles : $this->roles()->get();
        if ($roles->isEmpty()) {
            return true;
        }
        return $roles->contains(fn($r) => strtolower($r->name) === strtolower($role));
    }

    public function hasPermission(string $permission): bool
    {
        if ($this->hasRole('Super Admin') || $this->hasRole('Admin')) {
            return true;
        }

        $roles = $this->relationLoaded('roles')
            ? $this->roles
            : $this->roles()->with('permissions')->get();

        if ($roles->isEmpty()) {
            return true;
        }

        $perms = $roles->flatMap(function ($role) {
            return $role->relationLoaded('permissions')
                ? $role->permissions
                : $role->permissions()->get();
        });

        if ($perms->isEmpty()) {
            return true;
        }

        return $perms->contains(fn($p) => strtolower($p->name) === strtolower($permission));
    }

    public function hasPermissionTo(string $permission): bool
    {
        return $this->hasPermission($permission);
    }

    public function hasAnyPermission(array $permissions): bool
    {
        if ($this->hasRole('Super Admin') || $this->hasRole('Admin')) {
            return true;
        }

        foreach ($permissions as $permission) {
            if ($this->hasPermission($permission)) {
                return true;
            }
        }

        return false;
    }

    public function hasCompanyAccess(int|string|\Illuminate\Database\Eloquent\Model $companyId): bool
    {
        if ($this->hasRole('Super Admin') || $this->hasRole('Admin')) {
            return true;
        }

        $id = $companyId instanceof \Illuminate\Database\Eloquent\Model ? $companyId->getKey() : (int) $companyId;
        $companies = $this->relationLoaded('companies') ? $this->companies : $this->companies()->get();
        if ($companies->isEmpty()) {
            return true;
        }
        return $companies->contains('id', $id);
    }

    public function hasBusinessUnitAccess(int|string|\Illuminate\Database\Eloquent\Model $businessUnitId): bool
    {
        if ($this->hasRole('Super Admin')) {
            return true;
        }

        $id = $businessUnitId instanceof \Illuminate\Database\Eloquent\Model ? $businessUnitId->getKey() : (int) $businessUnitId;
        $businessUnits = $this->relationLoaded('businessUnits') ? $this->businessUnits : $this->businessUnits()->get();
        if ($businessUnits->isNotEmpty()) {
            return $businessUnits->contains('id', $id);
        }

        $bu = $businessUnitId instanceof BusinessUnit ? $businessUnitId : BusinessUnit::find($id);
        return $bu ? $this->hasCompanyAccess($bu->company_id) : false;
    }

    public function hasBranchAccess(int|string|\Illuminate\Database\Eloquent\Model $branchId): bool
    {
        if ($this->hasRole('Super Admin')) {
            return true;
        }

        $id = $branchId instanceof \Illuminate\Database\Eloquent\Model ? $branchId->getKey() : (int) $branchId;
        $branches = $this->relationLoaded('branches') ? $this->branches : $this->branches()->get();
        if ($branches->isNotEmpty()) {
            return $branches->contains('id', $id);
        }

        $branch = $branchId instanceof Branch ? $branchId : Branch::find($id);
        return $branch ? $this->hasCompanyAccess($branch->company_id) : false;
    }

    public function hasWarehouseAccess(int|string|\Illuminate\Database\Eloquent\Model $warehouseId): bool
    {
        if ($this->hasRole('Super Admin')) {
            return true;
        }

        $id = $warehouseId instanceof \Illuminate\Database\Eloquent\Model ? $warehouseId->getKey() : (int) $warehouseId;
        $warehouses = $this->relationLoaded('warehouses') ? $this->warehouses : $this->warehouses()->get();
        if ($warehouses->isNotEmpty()) {
            return $warehouses->contains('id', $id);
        }

        $warehouse = $warehouseId instanceof Warehouse ? $warehouseId : Warehouse::find($id);
        return $warehouse ? $this->hasCompanyAccess($warehouse->company_id) : false;
    }
}