<?php

namespace App\Services;

use App\Models\GoodsReceipt;
use App\Models\JournalEntry;
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
     * Credit: Accounts Payable
     */
    public function postPurchaseReceipt(GoodsReceipt $receipt, ?int $userId = null): ?JournalEntry
    {
        $companyId = $receipt->company_id;
        if (!$this->accountMappingService->isAccountingEnabled($companyId)) {
            return null;
        }

        $assetAccount = $this->accountMappingService->getAccount($companyId, AccountMappingService::ROLE_INVENTORY_ASSET);
        $apAccount = $this->accountMappingService->getAccount($companyId, AccountMappingService::ROLE_ACCOUNTS_PAYABLE);

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
                    'account_id' => $apAccount->id,
                    'debit' => 0,
                    'credit' => $totalCost,
                    'warehouse_id' => $receipt->warehouse_id,
                    'description' => "Accounts payable liability for GR {$receipt->receipt_number}",
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
}
