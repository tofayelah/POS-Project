<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class YearEndClosing extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'closing_date' => 'date',
        'total_revenue' => 'decimal:4',
        'total_expense' => 'decimal:4',
        'net_profit_amount' => 'decimal:4',
        'closed_at' => 'datetime',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function fiscalYear()
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function retainedEarningsAccount()
    {
        return $this->belongsTo(Account::class, 'retained_earnings_account_id');
    }

    public function closingJournalEntry()
    {
        return $this->belongsTo(JournalEntry::class, 'closing_journal_entry_id');
    }

    public function closedBy()
    {
        return $this->belongsTo(User::class, 'closed_by');
    }
}
