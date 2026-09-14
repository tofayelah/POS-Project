<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class Company extends Model {
    use SoftDeletes;
    protected $guarded = ['id'];
    public function businessUnits() { return $this->hasMany(BusinessUnit::class); }
    public function branches() { return $this->hasMany(Branch::class); }
}
