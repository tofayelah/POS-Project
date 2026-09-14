<?php

namespace App\Services;

use App\Models\Account;
use App\Models\AccountingPeriod;
use App\Models\FiscalYear;
use App\Models\JournalEntry;
use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Carbon\Carbon;

class AccountingService
{
    public function generateJournalNumber($companyId)
    {
        return DB::transaction(function () use ($companyId) {
            $lastJournal = JournalEntry::where('company_id', $companyId)
                ->lockForUpdate()
                ->orderBy('id', 'desc')
                ->first();
                
            $nextId = $lastJournal ? intval(substr($lastJournal->journal_number, -6)) + 1 : 1;
            $year = date('Y');
            
            return 'JV-' . $year . '-' . str_pad($nextId, 6, '0', STR_PAD_LEFT);
        });
    }

    public function determinePeriod($companyId, $date)
    {
        $period = AccountingPeriod::where('company_id', $companyId)
            ->where('start_date', '<=', $date)
            ->where('end_date', '>=', $date)
            ->first();
            
        if (!$period) {
            throw new ConflictHttpException("No accounting period found for date {$date}");
        }
        
        return $period;
    }

    public function createJournal($companyId, array $data, $userId)
    {
        if (isset($data['idempotency_key'])) {
            $existing = JournalEntry::where('company_id', $companyId)
                ->where('idempotency_key', $data['idempotency_key'])
                ->first();
            if ($existing) return $existing;
        }

        return DB::transaction(function () use ($companyId, $data, $userId) {
            
            $journalDate = $data['journal_date'];
            
            // Just for creation, we don't *strictly* need an open period for a DRAFT, but let's assign it anyway
            $period = $this->determinePeriod($companyId, $journalDate);
            
            // Validate lines
            if (count($data['lines']) < 2) {
                throw new ConflictHttpException("A journal entry must have at least 2 lines.");
            }
            
            $totalDebit = 0;
            $totalCredit = 0;
            
            foreach ($data['lines'] as $line) {
                $debit = $line['debit'] ?? 0;
                $credit = $line['credit'] ?? 0;
                
                if ($debit < 0 || $credit < 0) {
                    throw new ConflictHttpException("Debit and Credit amounts cannot be negative.");
                }
                if ($debit > 0 && $credit > 0) {
                    throw new ConflictHttpException("A journal line cannot have both debit and credit values.");
                }
                if ($debit == 0 && $credit == 0) {
                    throw new ConflictHttpException("A journal line must have either a debit or credit value.");
                }
                
                // Account validation
                $account = Account::where('company_id', $companyId)->find($line['account_id']);
                if (!$account) {
                    throw new ConflictHttpException("Account ID {$line['account_id']} is invalid or does not belong to your company.");
                }
                if (!$account->is_active) {
                    throw new ConflictHttpException("Account {$account->account_code} is inactive.");
                }
                if ($data['source'] === 'MANUAL' && !$account->allow_manual_posting) {
                    throw new ConflictHttpException("Account {$account->account_code} does not allow manual posting.");
                }

                $totalDebit += $debit;
                $totalCredit += $credit;
            }
            
            // Format to 4 decimals to avoid floating point issues during comparison
            $totalDebit = round($totalDebit, 4);
            $totalCredit = round($totalCredit, 4);
            
            if (abs($totalDebit - $totalCredit) > 0.00001) {
                throw new ConflictHttpException("Journal entry is unbalanced. Total Debit: {$totalDebit}, Total Credit: {$totalCredit}");
            }

            $journal = JournalEntry::create([
                'company_id' => $companyId,
                'fiscal_year_id' => $period->fiscal_year_id,
                'accounting_period_id' => $period->id,
                'journal_number' => $this->generateJournalNumber($companyId),
                'journal_date' => $journalDate,
                'reference_type' => $data['reference_type'] ?? null,
                'reference_id' => $data['reference_id'] ?? null,
                'description' => $data['description'],
                'status' => 'DRAFT',
                'source' => $data['source'] ?? 'MANUAL',
                'idempotency_key' => $data['idempotency_key'] ?? null,
                'created_by' => $userId,
            ]);

            foreach ($data['lines'] as $line) {
                $journal->lines()->create([
                    'account_id' => $line['account_id'],
                    'description' => $line['description'] ?? null,
                    'debit' => $line['debit'] ?? 0,
                    'credit' => $line['credit'] ?? 0,
                    'business_unit_id' => $line['business_unit_id'] ?? null,
                    'branch_id' => $line['branch_id'] ?? null,
                    'warehouse_id' => $line['warehouse_id'] ?? null,
                    'reference' => $line['reference'] ?? null,
                ]);
            }

            AuditLog::log($companyId, $userId, 'JOURNAL_CREATED', $journal->id, 'JournalEntry', "Created Journal Entry {$journal->journal_number}");

            return $journal->load('lines');
        });
    }

    public function postJournal($companyId, $journalId, $userId)
    {
        return DB::transaction(function () use ($companyId, $journalId, $userId) {
            $journal = JournalEntry::where('company_id', $companyId)->lockForUpdate()->findOrFail($journalId);
            
            if ($journal->status !== 'DRAFT') {
                throw new ConflictHttpException("Only DRAFT journals can be posted.");
            }
            
            // Validate period status
            $period = AccountingPeriod::where('company_id', $companyId)->lockForUpdate()->find($journal->accounting_period_id);
            if (!$period) {
                throw new ConflictHttpException("Associated accounting period not found.");
            }
            if ($period->status !== 'OPEN') {
                throw new ConflictHttpException("Cannot post to a {$period->status} period.");
            }
            
            // Validate FY status
            $fy = FiscalYear::where('company_id', $companyId)->find($journal->fiscal_year_id);
            if ($fy->status !== 'OPEN') {
                throw new ConflictHttpException("Cannot post to a closed fiscal year.");
            }

            // Verify lines are balanced
            $totalDebit = $journal->lines()->sum('debit');
            $totalCredit = $journal->lines()->sum('credit');
            
            if (abs($totalDebit - $totalCredit) > 0.00001) {
                throw new ConflictHttpException("Journal entry is unbalanced and cannot be posted.");
            }

            $journal->status = 'POSTED';
            $journal->posted_by = $userId;
            $journal->posted_at = Carbon::now();
            $journal->save();
            
            AuditLog::log($companyId, $userId, 'JOURNAL_POSTED', $journal->id, 'JournalEntry', "Posted Journal Entry {$journal->journal_number}");
            
            return $journal;
        });
    }

    public function cancelJournal($companyId, $journalId, $userId)
    {
        return DB::transaction(function () use ($companyId, $journalId, $userId) {
            $journal = JournalEntry::where('company_id', $companyId)->lockForUpdate()->findOrFail($journalId);
            
            if ($journal->status !== 'DRAFT') {
                throw new ConflictHttpException("Only DRAFT journals can be cancelled.");
            }
            
            $journal->status = 'CANCELLED';
            $journal->save();
            
            AuditLog::log($companyId, $userId, 'JOURNAL_CANCELLED', $journal->id, 'JournalEntry', "Cancelled Journal Entry {$journal->journal_number}");
            
            return $journal;
        });
    }

    public function reverseJournal($companyId, $journalId, $userId, $reversalDate = null)
    {
        return DB::transaction(function () use ($companyId, $journalId, $userId, $reversalDate) {
            $originalJournal = JournalEntry::where('company_id', $companyId)
                ->with('lines')
                ->lockForUpdate()
                ->findOrFail($journalId);
                
            if ($originalJournal->status !== 'POSTED') {
                throw new ConflictHttpException("Only POSTED journals can be reversed.");
            }
            
            // Check if already reversed
            $existingReversal = JournalEntry::where('company_id', $companyId)
                ->where('reversal_of_id', $originalJournal->id)
                ->first();
                
            if ($existingReversal) {
                throw new ConflictHttpException("This journal has already been reversed by {$existingReversal->journal_number}.");
            }
            
            $revDate = $reversalDate ?? $originalJournal->journal_date;
            $period = $this->determinePeriod($companyId, $revDate);
            
            if ($period->status !== 'OPEN') {
                throw new ConflictHttpException("Cannot post reversal to a {$period->status} period.");
            }
            
            // Create reversal journal
            $reversalJournal = JournalEntry::create([
                'company_id' => $companyId,
                'fiscal_year_id' => $period->fiscal_year_id,
                'accounting_period_id' => $period->id,
                'journal_number' => $this->generateJournalNumber($companyId),
                'journal_date' => $revDate,
                'reference_type' => $originalJournal->reference_type,
                'reference_id' => $originalJournal->reference_id,
                'description' => "Reversal of " . $originalJournal->journal_number . ": " . $originalJournal->description,
                'status' => 'POSTED', // Auto-post the reversal
                'source' => $originalJournal->source,
                'created_by' => $userId,
                'posted_by' => $userId,
                'posted_at' => Carbon::now(),
                'reversal_of_id' => $originalJournal->id,
            ]);
            
            foreach ($originalJournal->lines as $line) {
                // Swap debit and credit
                $reversalJournal->lines()->create([
                    'account_id' => $line->account_id,
                    'description' => clone $line->description,
                    'debit' => $line->credit,
                    'credit' => $line->debit,
                    'business_unit_id' => $line->business_unit_id,
                    'branch_id' => $line->branch_id,
                    'warehouse_id' => $line->warehouse_id,
                    'reference' => $line->reference,
                ]);
            }
            
            // Mark original as reversed
            $originalJournal->status = 'REVERSED';
            $originalJournal->reversed_by = $userId;
            $originalJournal->reversed_at = Carbon::now();
            $originalJournal->save();
            
            AuditLog::log($companyId, $userId, 'JOURNAL_REVERSED', $originalJournal->id, 'JournalEntry', "Reversed Journal Entry {$originalJournal->journal_number} with {$reversalJournal->journal_number}");
            
            return $reversalJournal->load('lines');
        });
    }
}
