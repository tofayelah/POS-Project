<?php

namespace App\Services;

use App\Models\Account;
use App\Models\AuditLog;
use App\Models\JournalEntry;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\SalesReturn;
use App\Models\TaxAdjustment;
use App\Models\TaxPeriod;
use App\Models\TaxTransaction;
use App\Models\TaxTransactionComponent;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class TaxPostingService
{
    public function __construct(
        protected AccountingService $accountingService,
        protected AccountMappingService $accountMappingService,
        protected PaymentService $paymentService
    ) {}

    /**
     * Post Output VAT from a Sale into the Tax Subledger and General Ledger idempotently.
     */
    public function postSaleTax(
        int $companyId,
        Sale $sale,
        array $taxCalculation,
        ?int $taxPeriodId = null,
        ?int $userId = null
    ): TaxTransaction {
        return DB::transaction(function () use ($companyId, $sale, $taxCalculation, $taxPeriodId, $userId) {
            // Idempotency check: return existing if already posted
            $existing = TaxTransaction::where('company_id', $companyId)
                ->where('source_type', Sale::class)
                ->where('source_id', $sale->id)
                ->where('transaction_type', TaxTransaction::TYPE_SALE_OUTPUT)
                ->first();

            if ($existing) {
                return $existing->load('components');
            }

            // Determine tax period if not provided
            $periodId = $taxPeriodId ?? $this->resolveTaxPeriodId($companyId, $sale->sale_date ?? now()->toDateString());
            $this->validatePeriodNotLocked($periodId);

            $taxableAmount = round((float) ($taxCalculation['taxable_amount'] ?? $sale->subtotal), 4);
            $vatAmount = round((float) ($taxCalculation['tax_amount'] ?? $sale->tax_total), 4);
            $sdAmount = round((float) ($taxCalculation['sd_amount'] ?? 0), 4);
            $atAmount = round((float) ($taxCalculation['at_amount'] ?? 0), 4);
            $totalTax = round((float) ($taxCalculation['total_tax_amount'] ?? ($vatAmount + $sdAmount + $atAmount)), 4);
            $isInclusive = (bool) ($taxCalculation['is_inclusive'] ?? false);

            $journalEntryId = null;

            // If automated accounting is enabled and tax amounts exist, ensure GL journal exists
            if ($this->accountMappingService->isAccountingEnabled($companyId) && $totalTax > 0) {
                $vatAccount = $this->resolveAccount($companyId, AccountMappingService::ROLE_OUTPUT_VAT_PAYABLE, 'LIABILITY', 'VAT Payable');
                $revenueAccount = $this->resolveAccount($companyId, AccountMappingService::ROLE_SALES_REVENUE, 'REVENUE', 'Sales Revenue');
                $arAccount = $this->resolveAccount($companyId, AccountMappingService::ROLE_ACCOUNTS_RECEIVABLE, 'ASSET', 'Accounts Receivable');

                $journalLines = [];
                $journalLines[] = [
                    'account_id' => $arAccount->id,
                    'debit' => $totalTax,
                    'credit' => 0,
                    'description' => "Output VAT on Sale {$sale->invoice_number}",
                ];

                $journalLines[] = [
                    'account_id' => $vatAccount->id,
                    'debit' => 0,
                    'credit' => $vatAmount,
                    'description' => "Output VAT on Sale {$sale->invoice_number}",
                ];

                if ($sdAmount > 0) {
                    $sdAccount = $this->resolveAccount($companyId, AccountMappingService::ROLE_SUPPLEMENTARY_DUTY_PAYABLE, 'LIABILITY', 'Supplementary Duty Payable');
                    $journalLines[] = [
                        'account_id' => $sdAccount->id,
                        'debit' => 0,
                        'credit' => $sdAmount,
                        'description' => "Supplementary Duty on Sale {$sale->invoice_number}",
                    ];
                }

                $journal = $this->accountingService->createJournal($companyId, [
                    'journal_date' => $sale->sale_date ?? now()->toDateString(),
                    'reference_type' => 'Sale',
                    'reference_id' => $sale->id,
                    'description' => "Tax entry for Sale {$sale->invoice_number}",
                    'source' => 'SALES_TAX',
                    'lines' => $journalLines,
                    'idempotency_key' => "TAX-SALE-{$sale->id}",
                ], $userId);

                $this->accountingService->postJournal($companyId, $journal->id, $userId);
                $journalEntryId = $journal->id;
            }

            // Create immutable TaxTransaction
            $taxTransaction = TaxTransaction::create([
                'company_id' => $companyId,
                'branch_id' => $sale->branch_id,
                'tax_period_id' => $periodId,
                'transaction_type' => TaxTransaction::TYPE_SALE_OUTPUT,
                'source_type' => Sale::class,
                'source_id' => $sale->id,
                'tax_rule_id' => $taxCalculation['tax_rule_id'] ?? null,
                'tax_category_id' => null,
                'document_number' => $sale->invoice_number,
                'document_date' => $sale->sale_date ?? now()->toDateString(),
                'taxable_amount' => $taxableAmount,
                'tax_amount' => $vatAmount,
                'sd_amount' => $sdAmount,
                'at_amount' => $atAmount,
                'withholding_amount' => 0,
                'total_tax_amount' => $totalTax,
                'is_inclusive' => $isInclusive,
                'journal_entry_id' => $journalEntryId,
                'status' => TaxTransaction::STATUS_POSTED,
                'legal_reference' => $taxCalculation['legal_reference'] ?? null,
                'metadata' => [
                    'customer_id' => $sale->customer_id,
                    'customer_bin' => $sale->customer?->bin_number,
                    'customer_tin' => $sale->customer?->tin_number,
                    'rule_code' => $taxCalculation['tax_rule_code'] ?? null,
                    'components' => $taxCalculation['components'] ?? [],
                ],
                'posted_at' => now(),
                'created_by' => $userId,
            ]);

            // Save individual components
            if (!empty($taxCalculation['components'])) {
                foreach ($taxCalculation['components'] as $comp) {
                    TaxTransactionComponent::create([
                        'tax_transaction_id' => $taxTransaction->id,
                        'component_code' => $comp['code'] ?? 'VAT',
                        'component_name' => $comp['name'] ?? 'VAT',
                        'tax_type' => $comp['type'] ?? 'OUTPUT_VAT',
                        'rate' => $comp['rate'] ?? 0,
                        'taxable_base' => $comp['taxable_base'] ?? $taxableAmount,
                        'tax_amount' => $comp['tax_amount'] ?? $vatAmount,
                        'legal_reference' => $comp['legal_reference'] ?? null,
                    ]);
                }
            }

            AuditLog::create([
                'company_id' => $companyId,
                'user_id' => $userId,
                'event' => 'TAX_TRANSACTION_POSTED',
                'auditable_type' => TaxTransaction::class,
                'auditable_id' => $taxTransaction->id,
                'new_values' => $taxTransaction->toArray(),
            ]);

            return $taxTransaction->load('components');
        });
    }

    /**
     * Post Input VAT from a Purchase into the Tax Subledger and General Ledger idempotently.
     */
    public function postPurchaseTax(
        int $companyId,
        Purchase $purchase,
        array $taxCalculation,
        ?int $taxPeriodId = null,
        ?int $userId = null
    ): TaxTransaction {
        return DB::transaction(function () use ($companyId, $purchase, $taxCalculation, $taxPeriodId, $userId) {
            $existing = TaxTransaction::where('company_id', $companyId)
                ->where('source_type', Purchase::class)
                ->where('source_id', $purchase->id)
                ->where('transaction_type', TaxTransaction::TYPE_PURCHASE_INPUT)
                ->first();

            if ($existing) {
                return $existing->load('components');
            }

            $periodId = $taxPeriodId ?? $this->resolveTaxPeriodId($companyId, $purchase->invoice_date ?? now()->toDateString());
            $this->validatePeriodNotLocked($periodId);

            $taxableAmount = round((float) ($taxCalculation['taxable_amount'] ?? $purchase->subtotal), 4);
            $vatAmount = round((float) ($taxCalculation['tax_amount'] ?? $purchase->tax_total), 4);
            $sdAmount = round((float) ($taxCalculation['sd_amount'] ?? 0), 4);
            $totalTax = round((float) ($taxCalculation['total_tax_amount'] ?? ($vatAmount + $sdAmount)), 4);
            $isInclusive = (bool) ($taxCalculation['is_inclusive'] ?? false);

            $journalEntryId = null;

            if ($this->accountMappingService->isAccountingEnabled($companyId) && $totalTax > 0) {
                $inputVatAccount = $this->resolveAccount($companyId, AccountMappingService::ROLE_INPUT_VAT_RECEIVABLE, 'ASSET', 'Input VAT Receivable');
                $apAccount = $this->resolveAccount($companyId, AccountMappingService::ROLE_ACCOUNTS_PAYABLE, 'LIABILITY', 'Accounts Payable');

                $docNumber = $purchase->supplier_invoice_number ?? $purchase->invoice_number ?? "PO-{$purchase->id}";
                $journalLines = [
                    [
                        'account_id' => $inputVatAccount->id,
                        'debit' => $totalTax,
                        'credit' => 0,
                        'description' => "Input VAT for Purchase {$docNumber}",
                    ],
                    [
                        'account_id' => $apAccount->id,
                        'debit' => 0,
                        'credit' => $totalTax,
                        'description' => "Input VAT payable to supplier for Purchase {$docNumber}",
                    ],
                ];

                $journal = $this->accountingService->createJournal($companyId, [
                    'journal_date' => $purchase->invoice_date ?? now()->toDateString(),
                    'reference_type' => 'Purchase',
                    'reference_id' => $purchase->id,
                    'description' => "Input Tax for Purchase {$docNumber}",
                    'source' => 'PURCHASE_TAX',
                    'lines' => $journalLines,
                    'idempotency_key' => "TAX-PURCHASE-{$purchase->id}",
                ], $userId);

                $this->accountingService->postJournal($companyId, $journal->id, $userId);
                $journalEntryId = $journal->id;
            }

            $docNumber = $purchase->supplier_invoice_number ?? $purchase->invoice_number ?? "PO-{$purchase->id}";
            $taxTransaction = TaxTransaction::create([
                'company_id' => $companyId,
                'branch_id' => $purchase->branch_id,
                'tax_period_id' => $periodId,
                'transaction_type' => TaxTransaction::TYPE_PURCHASE_INPUT,
                'source_type' => Purchase::class,
                'source_id' => $purchase->id,
                'tax_rule_id' => $taxCalculation['tax_rule_id'] ?? null,
                'tax_category_id' => null,
                'document_number' => $docNumber,
                'document_date' => $purchase->invoice_date ?? now()->toDateString(),
                'taxable_amount' => $taxableAmount,
                'tax_amount' => $vatAmount,
                'sd_amount' => $sdAmount,
                'at_amount' => 0,
                'withholding_amount' => 0,
                'total_tax_amount' => $totalTax,
                'is_inclusive' => $isInclusive,
                'journal_entry_id' => $journalEntryId,
                'status' => TaxTransaction::STATUS_POSTED,
                'legal_reference' => $taxCalculation['legal_reference'] ?? null,
                'metadata' => [
                    'supplier_id' => $purchase->supplier_id,
                    'supplier_bin' => $purchase->supplier?->bin_number,
                    'components' => $taxCalculation['components'] ?? [],
                ],
                'posted_at' => now(),
                'created_by' => $userId,
            ]);

            if (!empty($taxCalculation['components'])) {
                foreach ($taxCalculation['components'] as $comp) {
                    TaxTransactionComponent::create([
                        'tax_transaction_id' => $taxTransaction->id,
                        'component_code' => $comp['code'] ?? 'VAT',
                        'component_name' => $comp['name'] ?? 'Input VAT',
                        'tax_type' => 'INPUT_VAT',
                        'rate' => $comp['rate'] ?? 0,
                        'taxable_base' => $comp['taxable_base'] ?? $taxableAmount,
                        'tax_amount' => $comp['tax_amount'] ?? $vatAmount,
                        'legal_reference' => $comp['legal_reference'] ?? null,
                    ]);
                }
            }

            AuditLog::create([
                'company_id' => $companyId,
                'user_id' => $userId,
                'event' => 'TAX_TRANSACTION_PURCHASE_POSTED',
                'auditable_type' => TaxTransaction::class,
                'auditable_id' => $taxTransaction->id,
                'new_values' => $taxTransaction->toArray(),
            ]);

            return $taxTransaction->load('components');
        });
    }

    /**
     * Post VAT reversal for Sales Return idempotently.
     */
    public function postSalesReturnTax(
        int $companyId,
        SalesReturn $salesReturn,
        array $taxCalculation,
        ?int $taxPeriodId = null,
        ?int $userId = null
    ): TaxTransaction {
        return DB::transaction(function () use ($companyId, $salesReturn, $taxCalculation, $taxPeriodId, $userId) {
            $existing = TaxTransaction::where('company_id', $companyId)
                ->where('source_type', SalesReturn::class)
                ->where('source_id', $salesReturn->id)
                ->where('transaction_type', TaxTransaction::TYPE_SALE_RETURN_REVERSAL)
                ->first();

            if ($existing) {
                return $existing->load('components');
            }

            $periodId = $taxPeriodId ?? $this->resolveTaxPeriodId($companyId, $salesReturn->return_date ?? now()->toDateString());
            $this->validatePeriodNotLocked($periodId);
            $vatAmount = round((float) ($taxCalculation['tax_amount'] ?? $salesReturn->tax_total), 4);
            $taxableAmount = round((float) ($taxCalculation['taxable_amount'] ?? $salesReturn->subtotal), 4);

            $taxTransaction = TaxTransaction::create([
                'company_id' => $companyId,
                'branch_id' => $salesReturn->branch_id,
                'tax_period_id' => $periodId,
                'transaction_type' => TaxTransaction::TYPE_SALE_RETURN_REVERSAL,
                'source_type' => SalesReturn::class,
                'source_id' => $salesReturn->id,
                'tax_rule_id' => $taxCalculation['tax_rule_id'] ?? null,
                'tax_category_id' => null,
                'document_number' => $salesReturn->return_number,
                'document_date' => $salesReturn->return_date ?? now()->toDateString(),
                'taxable_amount' => $taxableAmount,
                'tax_amount' => $vatAmount,
                'sd_amount' => 0,
                'at_amount' => 0,
                'withholding_amount' => 0,
                'total_tax_amount' => $vatAmount,
                'is_inclusive' => false,
                'journal_entry_id' => null,
                'status' => TaxTransaction::STATUS_POSTED,
                'metadata' => [
                    'original_sale_id' => $salesReturn->sale_id,
                    'reason' => $salesReturn->reason,
                ],
                'posted_at' => now(),
                'created_by' => $userId,
            ]);

            return $taxTransaction;
        });
    }

    /**
     * Post formal Tax Adjustment into GL and Tax Subledger.
     */
    public function postAdjustmentTax(int $companyId, TaxAdjustment $adjustment, ?int $userId = null): TaxTransaction
    {
        return DB::transaction(function () use ($companyId, $adjustment, $userId) {
            if ($adjustment->status === TaxAdjustment::STATUS_POSTED) {
                throw new ConflictHttpException("Tax adjustment is already posted.");
            }

            $taxAccount = $this->resolveAccount($companyId, AccountMappingService::ROLE_OUTPUT_VAT_PAYABLE, 'LIABILITY', 'VAT Payable');
            $adjAccount = $this->resolveAccount($companyId, AccountMappingService::ROLE_TAX_ADJUSTMENT, 'EXPENSE', 'Tax Adjustment');

            $amount = round((float) $adjustment->tax_amount, 4);
            $journalLines = [];

            if (in_array($adjustment->adjustment_type, [TaxAdjustment::TYPE_OUTPUT_INCREASE, TaxAdjustment::TYPE_INPUT_DECREASE], true)) {
                $journalLines[] = ['account_id' => $adjAccount->id, 'debit' => $amount, 'credit' => 0, 'description' => $adjustment->reason];
                $journalLines[] = ['account_id' => $taxAccount->id, 'debit' => 0, 'credit' => $amount, 'description' => $adjustment->reason];
            } else {
                $journalLines[] = ['account_id' => $taxAccount->id, 'debit' => $amount, 'credit' => 0, 'description' => $adjustment->reason];
                $journalLines[] = ['account_id' => $adjAccount->id, 'debit' => 0, 'credit' => $amount, 'description' => $adjustment->reason];
            }

            $journal = $this->accountingService->createJournal($companyId, [
                'journal_date' => now()->toDateString(),
                'reference_type' => 'TaxAdjustment',
                'reference_id' => $adjustment->id,
                'description' => "Tax Adjustment {$adjustment->adjustment_number}",
                'source' => 'TAX_ADJUSTMENT',
                'lines' => $journalLines,
                'idempotency_key' => "TAX-ADJ-{$adjustment->id}",
            ], $userId);

            $this->accountingService->postJournal($companyId, $journal->id, $userId);

            $adjustment->update([
                'status' => TaxAdjustment::STATUS_POSTED,
                'journal_entry_id' => $journal->id,
                'posted_by' => $userId,
                'posted_at' => now(),
            ]);

            return TaxTransaction::create([
                'company_id' => $companyId,
                'branch_id' => $adjustment->branch_id,
                'tax_period_id' => $adjustment->tax_period_id,
                'transaction_type' => TaxTransaction::TYPE_TAX_ADJUSTMENT,
                'source_type' => TaxAdjustment::class,
                'source_id' => $adjustment->id,
                'document_number' => $adjustment->adjustment_number,
                'document_date' => now()->toDateString(),
                'taxable_amount' => $adjustment->amount,
                'tax_amount' => $amount,
                'total_tax_amount' => $amount,
                'journal_entry_id' => $journal->id,
                'status' => TaxTransaction::STATUS_POSTED,
                'legal_reference' => $adjustment->legal_reference,
                'metadata' => ['adjustment_type' => $adjustment->adjustment_type, 'reason' => $adjustment->reason],
                'posted_at' => now(),
                'created_by' => $userId,
            ]);
        });
    }

    /**
     * Settle tax liability via PaymentService and record Tax Settlement transaction.
     */
    public function settleTaxPayable(
        int $companyId,
        int $taxPeriodId,
        float $amount,
        int $paymentMethodId,
        string $referenceNumber,
        ?int $userId = null
    ): TaxTransaction {
        return DB::transaction(function () use ($companyId, $taxPeriodId, $amount, $paymentMethodId, $referenceNumber, $userId) {
            $period = TaxPeriod::where('company_id', $companyId)->findOrFail($taxPeriodId);
            $settleAmount = round($amount, 4);

            $taxAccount = $this->resolveAccount($companyId, AccountMappingService::ROLE_OUTPUT_VAT_PAYABLE, 'LIABILITY', 'VAT Payable');
            $cashAccount = $this->resolveAccount($companyId, AccountMappingService::ROLE_CASH_BANK, 'ASSET', 'Cash/Bank');

            // Debit VAT Payable, Credit Cash/Bank
            $journalLines = [
                [
                    'account_id' => $taxAccount->id,
                    'debit' => $settleAmount,
                    'credit' => 0,
                    'description' => "Treasury Challan VAT settlement for period {$period->period_name}",
                ],
                [
                    'account_id' => $cashAccount->id,
                    'debit' => 0,
                    'credit' => $settleAmount,
                    'description' => "Treasury Challan VAT settlement for period {$period->period_name}",
                ],
            ];

            $journal = $this->accountingService->createJournal($companyId, [
                'journal_date' => now()->toDateString(),
                'reference_type' => 'TaxPeriod',
                'reference_id' => $period->id,
                'description' => "Tax Settlement: Treasury Challan {$referenceNumber}",
                'source' => 'TAX_SETTLEMENT',
                'lines' => $journalLines,
                'idempotency_key' => "TAX-SETTLE-{$period->id}-" . md5($referenceNumber),
            ], $userId);

            $this->accountingService->postJournal($companyId, $journal->id, $userId);

            return TaxTransaction::create([
                'company_id' => $companyId,
                'tax_period_id' => $period->id,
                'transaction_type' => TaxTransaction::TYPE_TAX_SETTLEMENT,
                'source_type' => TaxPeriod::class,
                'source_id' => $period->id,
                'document_number' => $referenceNumber,
                'document_date' => now()->toDateString(),
                'taxable_amount' => 0,
                'tax_amount' => -$settleAmount,
                'total_tax_amount' => -$settleAmount,
                'journal_entry_id' => $journal->id,
                'status' => TaxTransaction::STATUS_POSTED,
                'legal_reference' => 'Treasury Challan / e-Challan payment',
                'metadata' => [
                    'challan_reference' => $referenceNumber,
                    'payment_method_id' => $paymentMethodId,
                    'period_name' => $period->period_name,
                ],
                'posted_at' => now(),
                'created_by' => $userId,
            ]);
        });
    }

    protected function validatePeriodNotLocked(?int $periodId): void
    {
        if (!$periodId) {
            return;
        }

        $period = TaxPeriod::find($periodId);
        if ($period && $period->isLocked()) {
            throw new \RuntimeException("Tax period is closed or locked (Status: {$period->status}). Postings are prohibited.");
        }
    }

    protected function resolveTaxPeriodId(int $companyId, string $date): ?int
    {
        $period = TaxPeriod::where('company_id', $companyId)
            ->where('period_start', '<=', $date)
            ->where('period_end', '>=', $date)
            ->first();

        return $period?->id;
    }

    protected function resolveAccount(int $companyId, string $role, string $typeFallback, string $nameFallback): Account
    {
        if ($this->accountMappingService->isConfigured($companyId, $role)) {
            return $this->accountMappingService->getAccount($companyId, $role);
        }

        $account = Account::where('company_id', $companyId)
            ->where('is_active', true)
            ->where('account_type', $typeFallback)
            ->first();

        if ($account) {
            return $account;
        }

        // Create fallback account if none exists
        $normalBalance = in_array($typeFallback, ['ASSET', 'EXPENSE'], true) ? 'DEBIT' : 'CREDIT';
        return Account::firstOrCreate(
            ['company_id' => $companyId, 'account_name' => $nameFallback],
            [
                'account_code' => strtoupper(substr($role, 0, 4)) . '-' . rand(100, 999),
                'account_type' => $typeFallback,
                'normal_balance' => $normalBalance,
                'is_active' => true,
                'allow_manual_posting' => true,
            ]
        );
    }
}
