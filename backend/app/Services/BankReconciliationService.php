<?php

namespace App\Services;

use App\Models\BankAccount;
use App\Models\BankStatement;
use App\Models\BankStatementLine;
use App\Models\BankReconciliation;
use App\Models\BankReconciliationMatch;
use App\Models\JournalEntryLine;
use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Carbon\Carbon;

class BankReconciliationService
{
    public function createBankAccount(int $companyId, array $data, int $userId): BankAccount
    {
        $account = BankAccount::create([
            'company_id' => $companyId,
            'account_id' => $data['account_id'] ?? null,
            'bank_name' => $data['bank_name'],
            'branch_name' => $data['branch_name'] ?? null,
            'account_name' => $data['account_name'],
            'account_number_masked' => $data['account_number_masked'],
            'routing_number' => $data['routing_number'] ?? null,
            'swift_bic' => $data['swift_bic'] ?? null,
            'currency' => $data['currency'] ?? 'BDT',
            'opening_balance' => (float) ($data['opening_balance'] ?? 0),
            'current_balance' => (float) ($data['opening_balance'] ?? 0),
            'status' => 'ACTIVE',
            'created_by' => $userId,
        ]);

        AuditLog::log($companyId, $userId, 'BANK_ACCOUNT_CREATED', $account->id, 'BankAccount', "Created bank account: {$account->account_name}");

        return $account;
    }

    public function importBankStatement(int $companyId, int $bankAccountId, array $data, int $userId): BankStatement
    {
        return DB::transaction(function () use ($companyId, $bankAccountId, $data, $userId) {
            $bankAccount = BankAccount::where('company_id', $companyId)->findOrFail($bankAccountId);

            $statement = BankStatement::create([
                'company_id' => $companyId,
                'bank_account_id' => $bankAccountId,
                'statement_identifier' => $data['statement_identifier'] ?? 'STMT-' . time(),
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'],
                'opening_balance' => (float) ($data['opening_balance'] ?? 0),
                'closing_balance' => (float) ($data['closing_balance'] ?? 0),
                'status' => 'IMPORTED',
                'imported_by' => $userId,
            ]);

            if (!empty($data['lines'])) {
                foreach ($data['lines'] as $l) {
                    $statement->lines()->create([
                        'transaction_date' => $l['transaction_date'],
                        'value_date' => $l['value_date'] ?? null,
                        'description' => $l['description'] ?? 'Transaction',
                        'reference_number' => $l['reference_number'] ?? null,
                        'cheque_number' => $l['cheque_number'] ?? null,
                        'debit' => (float) ($l['debit'] ?? 0),
                        'credit' => (float) ($l['credit'] ?? 0),
                        'balance' => (float) ($l['balance'] ?? 0),
                        'status' => 'UNMATCHED',
                    ]);
                }
            }

            // Update bank account current balance to statement closing balance if provided
            if (isset($data['closing_balance'])) {
                $bankAccount->current_balance = (float) $data['closing_balance'];
                $bankAccount->save();
            }

            AuditLog::log($companyId, $userId, 'BANK_STATEMENT_IMPORTED', $statement->id, 'BankStatement', "Imported bank statement {$statement->statement_identifier} with " . count($data['lines'] ?? []) . " lines");

            return $statement->load('lines');
        });
    }

    public function startReconciliation(int $companyId, int $bankAccountId, ?int $statementId, string $reconciliationDate, int $userId): BankReconciliation
    {
        return DB::transaction(function () use ($companyId, $bankAccountId, $statementId, $reconciliationDate, $userId) {
            $bankAccount = BankAccount::where('company_id', $companyId)->findOrFail($bankAccountId);

            // Compute GL balance for the linked GL account up to reconciliationDate
            $glBalance = 0;
            if ($bankAccount->account_id) {
                $glBalance = (float) JournalEntryLine::whereHas('journalEntry', function ($q) use ($companyId, $reconciliationDate) {
                    $q->where('company_id', $companyId)
                      ->where('status', 'POSTED')
                      ->where('journal_date', '<=', $reconciliationDate);
                })->where('account_id', $bankAccount->account_id)
                  ->sum(DB::raw('debit - credit'));
            }

            $statementBalance = 0;
            if ($statementId) {
                $statement = BankStatement::where('company_id', $companyId)->findOrFail($statementId);
                $statementBalance = (float) $statement->closing_balance;
            } else {
                $statementBalance = (float) $bankAccount->current_balance;
            }

            $diff = round($glBalance - $statementBalance, 2);

            $recon = BankReconciliation::create([
                'company_id' => $companyId,
                'bank_account_id' => $bankAccountId,
                'bank_statement_id' => $statementId,
                'reconciliation_date' => $reconciliationDate,
                'gl_balance' => $glBalance,
                'statement_balance' => $statementBalance,
                'difference' => $diff,
                'status' => 'IN_PROGRESS',
            ]);

            AuditLog::log($companyId, $userId, 'BANK_RECONCILIATION_STARTED', $recon->id, 'BankReconciliation', "Started reconciliation for {$bankAccount->account_name}");

            return $recon;
        });
    }

    public function runAutoMatch(int $companyId, int $reconciliationId, int $userId): array
    {
        return DB::transaction(function () use ($companyId, $reconciliationId, $userId) {
            $recon = BankReconciliation::where('company_id', $companyId)->with('bankAccount')->lockForUpdate()->findOrFail($reconciliationId);
            $bankAccountId = $recon->bank_account_id;
            $glAccountId = $recon->bankAccount->account_id;

            if (!$glAccountId) {
                throw new ConflictHttpException("Cannot auto-match: bank account is not linked to an authoritative GL Account.");
            }

            // Unmatched statement lines
            $stmtLines = BankStatementLine::where('bank_statement_id', $recon->bank_statement_id)
                ->where('status', 'UNMATCHED')
                ->get();

            // Available GL journal lines that haven't been matched yet
            $alreadyMatchedGlLineIds = BankReconciliationMatch::pluck('journal_entry_line_id')->filter()->toArray();

            $glLines = JournalEntryLine::whereHas('journalEntry', function ($q) use ($companyId, $recon) {
                $q->where('company_id', $companyId)
                  ->where('status', 'POSTED')
                  ->where('journal_date', '<=', $recon->reconciliation_date);
            })->where('account_id', $glAccountId)
              ->whereNotIn('id', $alreadyMatchedGlLineIds)
              ->get();

            $matchesCount = 0;

            foreach ($stmtLines as $stmtLine) {
                $foundGlLine = null;
                $matchType = 'MANUAL';

                // In bank statement: debit = withdrawal, credit = deposit.
                // In GL for bank asset: debit = deposit (cash in), credit = withdrawal (cash out).
                $expectedGlDebit = (float) $stmtLine->credit;
                $expectedGlCredit = (float) $stmtLine->debit;

                // Pass 1: Exact reference match
                if (!empty($stmtLine->reference_number)) {
                    $foundGlLine = $glLines->first(function ($gl) use ($stmtLine, $expectedGlDebit, $expectedGlCredit) {
                        return (abs((float) $gl->debit - $expectedGlDebit) < 0.01 && abs((float) $gl->credit - $expectedGlCredit) < 0.01)
                            && ($gl->reference === $stmtLine->reference_number || (string) $gl->journal_entry_id === $stmtLine->reference_number);
                    });
                    if ($foundGlLine) {
                        $matchType = 'REFERENCE';
                    }
                }

                // Pass 2: Exact amount match within ±3 days date window
                if (!$foundGlLine) {
                    $stmtDate = Carbon::parse($stmtLine->transaction_date);
                    $foundGlLine = $glLines->first(function ($gl) use ($stmtDate, $expectedGlDebit, $expectedGlCredit) {
                        $glDate = Carbon::parse($gl->journalEntry->journal_date ?? $gl->created_at);
                        $dateDiff = abs($stmtDate->diffInDays($glDate));
                        return $dateDiff <= 3 && abs((float) $gl->debit - $expectedGlDebit) < 0.01 && abs((float) $gl->credit - $expectedGlCredit) < 0.01;
                    });
                    if ($foundGlLine) {
                        $matchType = 'WINDOW';
                    }
                }

                // Pass 3: Exact amount match
                if (!$foundGlLine) {
                    $foundGlLine = $glLines->first(function ($gl) use ($expectedGlDebit, $expectedGlCredit) {
                        return abs((float) $gl->debit - $expectedGlDebit) < 0.01 && abs((float) $gl->credit - $expectedGlCredit) < 0.01;
                    });
                    if ($foundGlLine) {
                        $matchType = 'EXACT';
                    }
                }

                if ($foundGlLine) {
                    $matchedAmount = $expectedGlDebit > 0 ? $expectedGlDebit : $expectedGlCredit;

                    BankReconciliationMatch::create([
                        'bank_reconciliation_id' => $recon->id,
                        'bank_statement_line_id' => $stmtLine->id,
                        'journal_entry_line_id' => $foundGlLine->id,
                        'match_type' => $matchType,
                        'matched_amount' => $matchedAmount,
                        'notes' => "Auto-matched by {$matchType}",
                        'matched_by' => $userId,
                    ]);

                    $stmtLine->status = 'MATCHED';
                    $stmtLine->save();

                    // Remove from candidates pool
                    $glLines = $glLines->reject(fn($item) => $item->id === $foundGlLine->id);
                    $matchesCount++;
                }
            }

            AuditLog::log($companyId, $userId, 'BANK_RECON_AUTO_MATCHED', $recon->id, 'BankReconciliation', "Auto-matched {$matchesCount} lines for reconciliation #{$recon->id}");

            return [
                'reconciliation_id' => $recon->id,
                'matched_count' => $matchesCount,
                'unmatched_statement_lines' => BankStatementLine::where('bank_statement_id', $recon->bank_statement_id)->where('status', 'UNMATCHED')->count(),
            ];
        });
    }

    public function matchManually(int $companyId, int $reconciliationId, int $stmtLineId, ?int $glLineId, int $userId): BankReconciliationMatch
    {
        return DB::transaction(function () use ($companyId, $reconciliationId, $stmtLineId, $glLineId, $userId) {
            $recon = BankReconciliation::where('company_id', $companyId)->findOrFail($reconciliationId);
            $stmtLine = BankStatementLine::findOrFail($stmtLineId);

            $matchedAmount = (float) max($stmtLine->debit, $stmtLine->credit);

            $match = BankReconciliationMatch::create([
                'bank_reconciliation_id' => $recon->id,
                'bank_statement_line_id' => $stmtLine->id,
                'journal_entry_line_id' => $glLineId,
                'match_type' => 'MANUAL',
                'matched_amount' => $matchedAmount,
                'notes' => 'Manually matched by user',
                'matched_by' => $userId,
            ]);

            $stmtLine->status = 'MATCHED';
            $stmtLine->save();

            AuditLog::log($companyId, $userId, 'BANK_RECON_MANUAL_MATCH', $recon->id, 'BankReconciliation', "Manually matched statement line #{$stmtLine->id}");

            return $match;
        });
    }

    public function finalizeReconciliation(int $companyId, int $reconciliationId, ?string $notes, int $userId): BankReconciliation
    {
        return DB::transaction(function () use ($companyId, $reconciliationId, $notes, $userId) {
            $recon = BankReconciliation::where('company_id', $companyId)->lockForUpdate()->findOrFail($reconciliationId);

            // Re-calculate difference
            $unmatchedStmtLines = BankStatementLine::where('bank_statement_id', $recon->bank_statement_id)
                ->where('status', 'UNMATCHED')
                ->count();

            $recon->status = 'COMPLETED';
            $recon->completed_by = $userId;
            $recon->completed_at = Carbon::now();
            $recon->notes = $notes;
            $recon->save();

            if ($recon->bank_statement_id) {
                BankStatement::where('id', $recon->bank_statement_id)->update(['status' => 'RECONCILED']);
            }

            AuditLog::log($companyId, $userId, 'BANK_RECON_COMPLETED', $recon->id, 'BankReconciliation', "Completed reconciliation #{$recon->id} (Remaining unmatched stmt lines: {$unmatchedStmtLines})");

            return $recon->load('matches.statementLine', 'matches.journalLine');
        });
    }
}
