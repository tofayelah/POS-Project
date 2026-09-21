<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class Company extends Model {
    use SoftDeletes;
    protected $guarded = ['id'];
    public function businessUnits() { return $this->hasMany(BusinessUnit::class); }
    public function branches() { return $this->hasMany(Branch::class); }
    public function warehouses() { return $this->hasMany(Warehouse::class); }
    public function storageLocations() { return $this->hasMany(StorageLocation::class); }
    public function users() { return $this->belongsToMany(User::class, 'user_company_access'); }
}
