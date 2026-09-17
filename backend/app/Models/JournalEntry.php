<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JournalEntry extends Model
{
    use HasFactory;

    protected $guarded = ['id'];
    
    protected $casts = [
        'journal_date' => 'date',
        'posted_at' => 'datetime',
        'reversed_at' => 'datetime',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }
    
    public function fiscalYear()
    {
        return $this->belongsTo(FiscalYear::class);
    }
    
    public function accountingPeriod()
    {
        return $this->belongsTo(AccountingPeriod::class);
    }

    public function lines()
    {
        return $this->hasMany(JournalEntryLine::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
    
    public function poster()
    {
        return $this->belongsTo(User::class, 'posted_by');
    }
    
    public function reverser()
    {
        return $this->belongsTo(User::class, 'reversed_by');
    }
    
    public function reversalOf()
    {
        return $this->belongsTo(JournalEntry::class, 'reversal_of_id');
    }

    public function sourceDocument() { return $this->morphTo(); }
}
