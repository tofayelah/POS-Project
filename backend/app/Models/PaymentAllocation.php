<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class PaymentAllocation extends Model {
    protected $guarded = [];
    public function allocatable() { return $this->morphTo(); }
    public function payment() { return $this->belongsTo(Payment::class); }
}
