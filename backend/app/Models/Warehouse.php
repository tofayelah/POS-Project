<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class Warehouse extends Model {
    use SoftDeletes;
    protected $guarded = ['id'];
    public function company() { return $this->belongsTo(Company::class); }
    public function businessUnit() { return $this->belongsTo(BusinessUnit::class); }
    public function branch() { return $this->belongsTo(Branch::class); }
}
