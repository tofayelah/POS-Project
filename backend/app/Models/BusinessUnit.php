<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class BusinessUnit extends Model {
    use SoftDeletes;
    protected $guarded = ['id'];
    public function company() { return $this->belongsTo(Company::class); }
    public function branches() { return $this->hasMany(Branch::class); }
}
