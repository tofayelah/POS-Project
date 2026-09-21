<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class Branch extends Model {
    use SoftDeletes;
    protected $guarded = ['id'];
    public function company() { return $this->belongsTo(Company::class); }
    public function businessUnit() { return $this->belongsTo(BusinessUnit::class); }
    public function warehouses() { return $this->hasMany(Warehouse::class); }
    public function users() { return $this->belongsToMany(User::class, 'user_branch_access'); }
}
