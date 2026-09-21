<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class BusinessUnit extends Model {
    use SoftDeletes;
    protected $guarded = ['id'];
    public function company() { return $this->belongsTo(Company::class); }
    public function branches() { return $this->hasMany(Branch::class); }
    public function warehouses() { return $this->hasMany(Warehouse::class); }
    public function users() { return $this->belongsToMany(User::class, 'user_business_unit_access'); }
}
