<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class TaxRate extends Model {
    protected $guarded = [];
    public function tax() { return $this->belongsTo(Tax::class); }
}
