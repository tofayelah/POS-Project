<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\JournalEntryLine;
use App\Models\TaxAdjustment;
use App\Models\TaxPeriod;
use App\Models\TaxReconciliation;
use App\Models\TaxTransaction;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class TaxReconciliationService
{
    public function __construct(
        protected AccountMappingService $accountMappingService
    ) {}

    public function reconcilePeriod(int $companyId, int $taxPeriodId, ?int $userId = null): TaxReconciliation
    {
        $period = TaxPeriod::where('company_id', $companyId)->find($taxPeriodId);
        if (!$period) {
            throw new NotFoundHttpException("Tax period ID {$taxPeriodId} not found.");
        }

        // 1. Aggregate Tax Subledger (TaxTransactions)
        $outputVatSubledger = (float) TaxTransaction::where('company_id', $companyId)
            ->where('tax_period_id', $taxPeriodId)
            ->where('transaction_type', TaxTransaction::TYPE_SALE_OUTPUT)
            ->where('status', TaxTransaction::STATUS_POSTED)
            ->sum('tax_amount');

        $inputVatSubledger = (float) TaxTransaction::where('company_id', $companyId)
            ->where('tax_period_id', $taxPeriodId)
            ->where('transaction_type', TaxTransaction::TYPE_PURCHASE_INPUT)
            ->where('status', TaxTransaction::STATUS_POSTED)
            ->sum('tax_amount');

        $adjustmentsTotal = (float) TaxAdjustment::where('company_id', $companyId)
            ->where('tax_period_id', $taxPeriodId)
            ->where('status', TaxAdjustment::STATUS_POSTED)
            ->sum('tax_amount');

        // 2. Aggregate General Ledger (JournalLines within period date range)
        $outputVatGl = 0.0;
        $inputVatGl = 0.0;

        try {
            $outputVatAccount = $this->accountMappingService->getAccount($companyId, AccountMappingService::ROLE_OUTPUT_VAT_PAYABLE);
            // Liability account: Net balance = Credit - Debit
            $outputVatGlLines = JournalEntryLine::where('account_id', $outputVatAccount->id)
                ->whereHas('journalEntry', function ($q) use ($companyId, $period) {
                    $q->where('company_id', $companyId)
                      ->where('status', 'POSTED')
                      ->whereBetween('journal_date', [$period->period_start, $period->period_end]);
                })
                ->selectRaw('SUM(credit) as total_credit, SUM(debit) as total_debit')
                ->first();

            $outputVatGl = (float)(($outputVatGlLines->total_credit ?? 0) - ($outputVatGlLines->total_debit ?? 0));
        } catch (\Exception $e) {
            // Unmapped: GL balance remains 0
            $outputVatGl = 0.0;
        }

        try {
            $inputVatAccount = $this->accountMappingService->getAccount($companyId, AccountMappingService::ROLE_INPUT_VAT_RECEIVABLE);
            // Asset account: Net balance = Debit - Credit
            $inputVatGlLines = JournalEntryLine::where('account_id', $inputVatAccount->id)
                ->whereHas('journalEntry', function ($q) use ($companyId, $period) {
                    $q->where('company_id', $companyId)
                      ->where('status', 'POSTED')
                      ->whereBetween('journal_date', [$period->period_start, $period->period_end]);
                })
                ->selectRaw('SUM(debit) as total_debit, SUM(credit) as total_credit')
                ->first();

            $inputVatGl = (float)(($inputVatGlLines->total_debit ?? 0) - ($inputVatGlLines->total_credit ?? 0));
        } catch (\Exception $e) {
            $inputVatGl = 0.0;
        }

        $outputDiff = round($outputVatSubledger - $outputVatGl, 4);
        $inputDiff = round($inputVatSubledger - $inputVatGl, 4);
        $netTaxPayable = round($outputVatSubledger - $inputVatSubledger + $adjustmentsTotal, 4);

        $exceptions = [];
        if (abs($outputDiff) > 0.01) {
            $exceptions[] = [
                'type' => 'GL_OUTPUT_VAT_MISMATCH',
                'description' => "Output VAT Subledger ({$outputVatSubledger}) does not match GL ({$outputVatGl}). Difference: {$outputDiff}",
                'difference' => $outputDiff,
            ];
        }
        if (abs($inputDiff) > 0.01) {
            $exceptions[] = [
                'type' => 'GL_INPUT_VAT_MISMATCH',
                'description' => "Input VAT Subledger ({$inputVatSubledger}) does not match GL ({$inputVatGl}). Difference: {$inputDiff}",
                'difference' => $inputDiff,
            ];
        }

        $status = empty($exceptions) ? TaxReconciliation::STATUS_RECONCILED : TaxReconciliation::STATUS_EXCEPTION;

        return DB::transaction(function () use (
            $companyId, $taxPeriodId, $period, $outputVatSubledger, $outputVatGl, $outputDiff,
            $inputVatSubledger, $inputVatGl, $inputDiff, $adjustmentsTotal, $netTaxPayable,
            $status, $exceptions, $userId
        ) {
            $reconNumber = 'RECON-' . $period->period_start->format('Ym') . '-' . str_pad($taxPeriodId, 4, '0', STR_PAD_LEFT);

            $reconciliation = TaxReconciliation::updateOrCreate(
                [
                    'company_id' => $companyId,
                    'tax_period_id' => $taxPeriodId,
                ],
                [
                    'reconciliation_number' => $reconNumber,
                    'reconciled_date' => now()->toDateString(),
                    'output_vat_subledger' => $outputVatSubledger,
                    'output_vat_gl' => $outputVatGl,
                    'output_vat_difference' => $outputDiff,
                    'input_vat_subledger' => $inputVatSubledger,
                    'input_vat_gl' => $inputVatGl,
                    'input_vat_difference' => $inputDiff,
                    'adjustments_total' => $adjustmentsTotal,
                    'net_tax_payable' => $netTaxPayable,
                    'status' => $status,
                    'exceptions' => $exceptions,
                    'reconciled_by' => $userId,
                ]
            );

            AuditLog::create([
                'company_id' => $companyId,
                'user_id' => $userId,
                'event' => 'TAX_RECONCILIATION_PERFORMED',
                'auditable_type' => TaxReconciliation::class,
                'auditable_id' => $reconciliation->id,
                'new_values' => $reconciliation->toArray(),
            ]);

            return $reconciliation;
        });
    }
}
