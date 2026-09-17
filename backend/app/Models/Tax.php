<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Tax extends Model {
    protected $guarded = [];
    public function category() { return $this->belongsTo(TaxCategory::class); }
    public function rates() { return $this->hasMany(TaxRate::class); }
    public function collectedAccount() { return $this->belongsTo(Account::class, 'collected_account_id'); }
    public function paidAccount() { return $this->belongsTo(Account::class, 'paid_account_id'); }
}
