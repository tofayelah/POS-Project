<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JournalEntryLine extends Model
{
    use HasFactory;

    protected $guarded = ['id'];
    
    protected $casts = [
        'debit' => 'decimal:4',
        'credit' => 'decimal:4',
    ];

    public function journalEntry()
    {
        return $this->belongsTo(JournalEntry::class);
    }
    
    public function account()
    {
        return $this->belongsTo(Account::class);
    }
    
    public function businessUnit()
    {
        return $this->belongsTo(BusinessUnit::class);
    }
    
    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
    
    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }
}
