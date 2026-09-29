<?php

namespace App\Services;

use App\Models\GoodsReceipt;
use App\Models\JournalEntry;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\StockMovement;

class InventoryAccountingService
{
    public function __construct(
        protected AccountingService $accountingService,
        protected AccountMappingService $accountMappingService
    ) {}

    /**
     * Post automated journal entry for positive stock adjustment (ADJUSTMENT_IN).
     * Debit: Inventory Asset
     * Credit: Inventory Adjustment (P&L / offset)
     */
    public function postAdjustmentIn(StockMovement $movement, ?int $userId = null): ?JournalEntry
    {
        $companyId = $movement->company_id;
        if (!$this->accountMappingService->isAccountingEnabled($companyId)) {
            return null;
        }

        $assetAccount = $this->accountMappingService->getAccount($companyId, AccountMappingService::ROLE_INVENTORY_ASSET);
        $adjAccount = $this->accountMappingService->getAccount($companyId, AccountMappingService::ROLE_INVENTORY_ADJUSTMENT);

        $amount = round((float) ($movement->total_cost ?? (abs((float) $movement->quantity) * (float) ($movement->unit_cost ?? $movement->unit_price ?? 0))), 4);
        if ($amount <= 0) {
            return null;
        }

        $journalDate = $movement->created_at ? $movement->created_at->format('Y-m-d') : date('Y-m-d');

        $data = [
            'journal_date' => $journalDate,
            'reference_type' => 'StockMovement',
            'reference_id' => $movement->id,
            'description' => "Inventory Adjustment IN: {$movement->reference_number}",
            'source' => 'INVENTORY',
            'idempotency_key' => "INV-ADJ-{$movement->id}",
            'lines' => [
                [
                    'account_id' => $assetAccount->id,
                    'debit' => $amount,
                    'credit' => 0,
                    'warehouse_id' => $movement->warehouse_id,
                    'description' => "Stock adjustment IN inventory addition (movement #{$movement->id})",
                ],
                [
                    'account_id' => $adjAccount->id,
                    'debit' => 0,
                    'credit' => $amount,
                    'warehouse_id' => $movement->warehouse_id,
                    'description' => "Stock adjustment IN offset (movement #{$movement->id})",
                ],
            ],
        ];

        return $this->accountingService->postAutomatedJournal($companyId, $data, $userId);
    }

    /**
     * Post automated journal entry for negative stock adjustment (ADJUSTMENT_OUT).
     * Debit: Inventory Adjustment (expense/loss)
     * Credit: Inventory Asset (reduction)
     */
    public function postAdjustmentOut(StockMovement $movement, ?int $userId = null): ?JournalEntry
    {
        $companyId = $movement->company_id;
        if (!$this->accountMappingService->isAccountingEnabled($companyId)) {
            return null;
        }

        $assetAccount = $this->accountMappingService->getAccount($companyId, AccountMappingService::ROLE_INVENTORY_ASSET);
        $adjAccount = $this->accountMappingService->getAccount($companyId, AccountMappingService::ROLE_INVENTORY_ADJUSTMENT);

        $amount = round((float) ($movement->total_cost ?? (abs((float) $movement->quantity) * (float) ($movement->unit_cost ?? $movement->unit_price ?? 0))), 4);
        if ($amount <= 0) {
            return null;
        }

        $journalDate = $movement->created_at ? $movement->created_at->format('Y-m-d') : date('Y-m-d');

        $data = [
            'journal_date' => $journalDate,
            'reference_type' => 'StockMovement',
            'reference_id' => $movement->id,
            'description' => "Inventory Adjustment OUT: {$movement->reference_number}",
            'source' => 'INVENTORY',
            'idempotency_key' => "INV-ADJ-{$movement->id}",
            'lines' => [
                [
                    'account_id' => $adjAccount->id,
                    'debit' => $amount,
                    'credit' => 0,
                    'warehouse_id' => $movement->warehouse_id,
                    'description' => "Stock adjustment OUT expense/loss (movement #{$movement->id})",
                ],
                [
                    'account_id' => $assetAccount->id,
                    'debit' => 0,
                    'credit' => $amount,
                    'warehouse_id' => $movement->warehouse_id,
                    'description' => "Stock adjustment OUT inventory reduction (movement #{$movement->id})",
                ],
            ],
        ];

        return $this->accountingService->postAutomatedJournal($companyId, $data, $userId);
    }

    /**
     * Post automated journal entry for Goods Receipt from purchase order.
     * Debit: Inventory Asset
     * Credit: AP Clearing / GRNI
     */
    public function postPurchaseReceipt(GoodsReceipt $receipt, ?int $userId = null): ?JournalEntry
    {
        $companyId = $receipt->company_id;
        if (!$this->accountMappingService->isAccountingEnabled($companyId)) {
            return null;
        }

        $assetAccount = $this->accountMappingService->getAccount($companyId, AccountMappingService::ROLE_INVENTORY_ASSET);
        $apClearingAccount = $this->accountMappingService->getAccount($companyId, AccountMappingService::ROLE_AP_CLEARING);

        $totalCost = 0;
        foreach ($receipt->items as $item) {
            $qty = (float) $item->received_quantity;
            $cost = (float) $item->unit_cost;
            $totalCost += ($qty * $cost);
        }
        $totalCost = round($totalCost, 4);

        if ($totalCost <= 0) {
            return null;
        }

        $journalDate = $receipt->receipt_date ? $receipt->receipt_date->format('Y-m-d') : date('Y-m-d');

        $data = [
            'journal_date' => $journalDate,
            'reference_type' => 'GoodsReceipt',
            'reference_id' => $receipt->id,
            'description' => "Goods Receipt: {$receipt->receipt_number}",
            'source' => 'PURCHASE',
            'idempotency_key' => "PURCHASE-GR-{$receipt->id}",
            'lines' => [
                [
                    'account_id' => $assetAccount->id,
                    'debit' => $totalCost,
                    'credit' => 0,
                    'warehouse_id' => $receipt->warehouse_id,
                    'description' => "Goods receipt inventory asset for GR {$receipt->receipt_number}",
                ],
                [
                    'account_id' => $apClearingAccount->id,
                    'debit' => 0,
                    'credit' => $totalCost,
                    'warehouse_id' => $receipt->warehouse_id,
                    'description' => "AP clearing accrual for GR {$receipt->receipt_number}",
                ],
            ],
        ];

        return $this->accountingService->postAutomatedJournal($companyId, $data, $userId);
    }

    /**
     * Post automated journal entry for Purchase Invoice (Supplier Bill).
     * Debit: AP Clearing / GRNI
     * Credit: Accounts Payable
     */
    public function postPurchaseInvoice(Purchase $purchase, ?int $userId = null): ?JournalEntry
    {
        $companyId = $purchase->company_id;
        if (!$this->accountMappingService->isAccountingEnabled($companyId)) {
            return null;
        }

        $apClearingAccount = $this->accountMappingService->getAccount($companyId, AccountMappingService::ROLE_AP_CLEARING);
        $apAccount = $this->accountMappingService->getAccount($companyId, AccountMappingService::ROLE_ACCOUNTS_PAYABLE);

        $amount = round((float) $purchase->grand_total, 4);
        if ($amount <= 0) {
            return null;
        }

        $journalDate = $purchase->invoice_date ? $purchase->invoice_date->format('Y-m-d') : date('Y-m-d');

        $data = [
            'journal_date' => $journalDate,
            'reference_type' => 'Purchase',
            'reference_id' => $purchase->id,
            'description' => "Purchase Invoice: {$purchase->supplier_invoice_number}",
            'source' => 'PURCHASE',
            'idempotency_key' => "PURCHASE-INV-{$purchase->id}",
            'lines' => [
                [
                    'account_id' => $apClearingAccount->id,
                    'debit' => $amount,
                    'credit' => 0,
                    'warehouse_id' => $purchase->warehouse_id,
                    'branch_id' => $purchase->branch_id,
                    'description' => "AP clearing offset for Purchase #{$purchase->supplier_invoice_number}",
                ],
                [
                    'account_id' => $apAccount->id,
                    'debit' => 0,
                    'credit' => $amount,
                    'warehouse_id' => $purchase->warehouse_id,
                    'branch_id' => $purchase->branch_id,
                    'description' => "Accounts payable liability for Purchase #{$purchase->supplier_invoice_number}",
                ],
            ],
        ];

        return $this->accountingService->postAutomatedJournal($companyId, $data, $userId);
    }

    /**
     * Internal stock transfers between warehouses of the same company.
     * Per accounting rules: Transfers remain strictly neutral (NO P&L, revenue, or expense entries).
     */
    public function postTransfer(?StockMovement $outMovement = null, ?StockMovement $inMovement = null, ?int $userId = null): null
    {
        return null;
    }

    /**
     * Post automated journal entry for a Sale Invoice.
     * Debit: Accounts Receivable (grand_total)
     * Credit: Sales Revenue (grand_total - tax_total)
     * Credit: VAT Payable (tax_total, if > 0)
     */
    public function postSaleInvoice(Sale $sale, ?int $userId = null): ?JournalEntry
    {
        $companyId = $sale->company_id;
        if (!$this->accountMappingService->isAccountingEnabled($companyId)) {
            return null;
        }

        $grandTotal = round((float) $sale->grand_total, 4);
        if ($grandTotal <= 0) {
            return null;
        }

        $taxTotal = round((float) $sale->tax_total, 4);
        $revenueTotal = round($grandTotal - $taxTotal, 4);

        $arAccount = $this->accountMappingService->getAccount($companyId, AccountMappingService::ROLE_ACCOUNTS_RECEIVABLE);
        $revenueAccount = $this->accountMappingService->getAccount($companyId, AccountMappingService::ROLE_SALES_REVENUE);

        $lines = [
            [
                'account_id' => $arAccount->id,
                'debit' => $grandTotal,
                'credit' => 0,
                'branch_id' => $sale->branch_id,
                'warehouse_id' => $sale->warehouse_id,
                'description' => "Accounts receivable for Sale {$sale->invoice_number}",
            ],
            [
                'account_id' => $revenueAccount->id,
                'debit' => 0,
                'credit' => $revenueTotal,
                'branch_id' => $sale->branch_id,
                'warehouse_id' => $sale->warehouse_id,
                'description' => "Sales revenue for Sale {$sale->invoice_number}",
            ],
        ];

        if ($taxTotal > 0) {
            $vatAccount = $this->accountMappingService->getAccount($companyId, AccountMappingService::ROLE_VAT_PAYABLE);
            $lines[] = [
                'account_id' => $vatAccount->id,
                'debit' => 0,
                'credit' => $taxTotal,
                'branch_id' => $sale->branch_id,
                'warehouse_id' => $sale->warehouse_id,
                'description' => "VAT payable for Sale {$sale->invoice_number}",
            ];
        }

        $journalDate = $sale->sale_date ? (is_string($sale->sale_date) ? $sale->sale_date : $sale->sale_date->format('Y-m-d')) : date('Y-m-d');

        $data = [
            'journal_date' => $journalDate,
            'reference_type' => 'Sale',
            'reference_id' => $sale->id,
            'description' => "Sale Invoice: {$sale->invoice_number}",
            'source' => 'SALES',
            'idempotency_key' => "SALE-INV-{$sale->id}",
            'lines' => $lines,
        ];

        return $this->accountingService->postAutomatedJournal($companyId, $data, $userId);
    }

    /**
     * Post automated journal entry for Cost of Goods Sold (COGS) on a completed sale.
     * Debit: Cost of Goods Sold (COGS)
     * Credit: Inventory Asset (reduction)
     */
    public function postSaleCogs(Sale $sale, float $totalCogs, ?int $userId = null): ?JournalEntry
    {
        $companyId = $sale->company_id;
        if (!$this->accountMappingService->isAccountingEnabled($companyId)) {
            return null;
        }

        $cogsAmount = round($totalCogs, 4);
        if ($cogsAmount <= 0) {
            return null;
        }

        $cogsAccount = $this->accountMappingService->getAccount($companyId, AccountMappingService::ROLE_COGS);
        $assetAccount = $this->accountMappingService->getAccount($companyId, AccountMappingService::ROLE_INVENTORY_ASSET);

        $journalDate = $sale->sale_date ? (is_string($sale->sale_date) ? $sale->sale_date : $sale->sale_date->format('Y-m-d')) : date('Y-m-d');

        $data = [
            'journal_date' => $journalDate,
            'reference_type' => 'Sale',
            'reference_id' => $sale->id,
            'description' => "Cost of Goods Sold for Sale: {$sale->invoice_number}",
            'source' => 'SALES',
            'idempotency_key' => "SALE-COGS-{$sale->id}",
            'lines' => [
                [
                    'account_id' => $cogsAccount->id,
                    'debit' => $cogsAmount,
                    'credit' => 0,
                    'branch_id' => $sale->branch_id,
                    'warehouse_id' => $sale->warehouse_id,
                    'description' => "COGS for Sale {$sale->invoice_number}",
                ],
                [
                    'account_id' => $assetAccount->id,
                    'debit' => 0,
                    'credit' => $cogsAmount,
                    'branch_id' => $sale->branch_id,
                    'warehouse_id' => $sale->warehouse_id,
                    'description' => "Inventory asset reduction for Sale {$sale->invoice_number}",
                ],
            ],
        ];

        return $this->accountingService->postAutomatedJournal($companyId, $data, $userId);
    }
}
