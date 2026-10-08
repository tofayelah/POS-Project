<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BankReconciliationMatch extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'matched_amount' => 'decimal:4',
    ];

    public function bankReconciliation()
    {
        return $this->belongsTo(BankReconciliation::class);
    }

    public function statementLine()
    {
        return $this->belongsTo(BankStatementLine::class, 'bank_statement_line_id');
    }

    public function journalLine()
    {
        return $this->belongsTo(JournalEntryLine::class, 'journal_entry_line_id');
    }

    public function matchedBy()
    {
        return $this->belongsTo(User::class, 'matched_by');
    }
}
