<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class TransactionTax extends Model {
    protected $guarded = [];
    public function taxable() { return $this->morphTo(); }
    public function tax() { return $this->belongsTo(Tax::class); }
}
