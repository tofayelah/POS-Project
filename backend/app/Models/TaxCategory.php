<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class TaxCategory extends Model {
    protected $guarded = [];
    public function taxes() { return $this->hasMany(Tax::class); }
}
