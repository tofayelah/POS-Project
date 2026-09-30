<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PosTerminal extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'business_unit_id',
        'branch_id',
        'warehouse_id',
        'terminal_code',
        'terminal_name',
        'status',
        'receipt_header',
        'receipt_footer',
        'default_cash_account_id',
        'default_card_account_id',
        'default_bkash_account_id',
        'default_nagad_account_id',
        'default_bank_account_id',
        'created_by',
        'updated_by',
    ];

    public function company() { return $this->belongsTo(Company::class); }
    public function branch() { return $this->belongsTo(Branch::class); }
    public function warehouse() { return $this->belongsTo(Warehouse::class); }
    public function defaultCashAccount() { return $this->belongsTo(Account::class, 'default_cash_account_id'); }
    public function defaultCardAccount() { return $this->belongsTo(Account::class, 'default_card_account_id'); }
    public function defaultBkashAccount() { return $this->belongsTo(Account::class, 'default_bkash_account_id'); }
    public function defaultNagadAccount() { return $this->belongsTo(Account::class, 'default_nagad_account_id'); }
    public function defaultBankAccount() { return $this->belongsTo(Account::class, 'default_bank_account_id'); }

    public function paymentMethods()
    {
        return $this->belongsToMany(PaymentMethod::class, 'pos_terminal_payment_methods')
            ->withPivot('is_enabled')
            ->withTimestamps();
    }

    public function enabledPaymentMethods()
    {
        return $this->belongsToMany(PaymentMethod::class, 'pos_terminal_payment_methods')
            ->wherePivot('is_enabled', true)
            ->withPivot('is_enabled')
            ->withTimestamps();
    }
}
