<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;

class InventoryReconciliationService
{
    /**
     * Run full reconciliation between stock movement ledger and inventory balance.
     */
    public function reconcile(int $companyId, ?int $warehouseId = null, ?int $userId = null, ?string $ip = null, ?string $userAgent = null): array
    {
        $incomingTypes = ['OPENING_STOCK', 'STOCK_IN', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'RETURN_IN', 'RETURN_DAMAGED_IN'];
        $incomingListStr = "'" . implode("','", $incomingTypes) . "'";

        $query = Inventory::with(['warehouse', 'product', 'productVariant'])
            ->where('company_id', $companyId);

        if ($warehouseId) {
            $query->where('warehouse_id', $warehouseId);
        }

        $inventories = $query->get();

        $discrepancies = [];
        $negativeStockItems = [];
        $totalChecked = $inventories->count();

        // Calculate movement sums grouped by warehouse_id and product_variant_id
        $movementSumsQuery = StockMovement::where('company_id', $companyId)
            ->select(
                'warehouse_id',
                'product_variant_id',
                DB::raw("SUM(CASE WHEN movement_type IN ({$incomingListStr}) THEN quantity ELSE -quantity END) as net_movement")
            )
            ->groupBy('warehouse_id', 'product_variant_id');

        if ($warehouseId) {
            $movementSumsQuery->where('warehouse_id', $warehouseId);
        }

        $movementSums = $movementSumsQuery->get()->keyBy(function ($item) {
            return "{$item->warehouse_id}_{$item->product_variant_id}";
        });

        foreach ($inventories as $inv) {
            $key = "{$inv->warehouse_id}_{$inv->product_variant_id}";
            $movementData = $movementSums->get($key);
            $ledgerQuantity = $movementData ? (float) $movementData->net_movement : 0.0;
            $balanceQuantity = (float) $inv->quantity;

            $diff = round($ledgerQuantity - $balanceQuantity, 4);

            if (abs($diff) > 0.0001) {
                $discrepancies[] = [
                    'inventory_id' => $inv->id,
                    'warehouse_id' => $inv->warehouse_id,
                    'warehouse_name' => $inv->warehouse?->name,
                    'product_id' => $inv->product_id,
                    'product_name' => $inv->product?->name,
                    'product_variant_id' => $inv->product_variant_id,
                    'sku' => $inv->productVariant?->sku,
                    'balance_quantity' => $balanceQuantity,
                    'ledger_quantity' => $ledgerQuantity,
                    'discrepancy' => $diff,
                    'issue' => $diff > 0 ? 'Ledger exceeds inventory balance' : 'Inventory balance exceeds ledger',
                ];
            }

            if ($balanceQuantity < 0 || (float) $inv->available_quantity < 0) {
                $negativeStockItems[] = [
                    'inventory_id' => $inv->id,
                    'warehouse_id' => $inv->warehouse_id,
                    'warehouse_name' => $inv->warehouse?->name,
                    'sku' => $inv->productVariant?->sku,
                    'quantity' => $balanceQuantity,
                    'available_quantity' => (float) $inv->available_quantity,
                ];
            }
        }

        // Check for orphan batches
        $orphanBatches = InventoryBatch::with(['batch', 'warehouse', 'variant'])
            ->whereHas('batch', function ($q) use ($companyId) {
                $q->where('company_id', $companyId);
            })
            ->whereDoesntHave('batch')
            ->get()
            ->map(function ($ib) {
                return [
                    'inventory_batch_id' => $ib->id,
                    'warehouse_id' => $ib->warehouse_id,
                    'batch_id' => $ib->stock_batch_id,
                    'quantity' => (float) $ib->quantity,
                ];
            });

        $hasIssues = count($discrepancies) > 0 || count($negativeStockItems) > 0 || count($orphanBatches) > 0;
        $status = $hasIssues ? 'DISCREPANCIES_FOUND' : 'HEALTHY';

        // Log reconciliation in AuditLog
        AuditLog::create([
            'company_id' => $companyId,
            'user_id' => $userId,
            'event' => 'INVENTORY_RECONCILIATION_RUN',
            'auditable_type' => Inventory::class,
            'auditable_id' => null,
            'old_values' => null,
            'new_values' => [
                'warehouse_id' => $warehouseId,
                'total_checked' => $totalChecked,
                'discrepancies_count' => count($discrepancies),
                'negative_stock_count' => count($negativeStockItems),
                'orphan_batches_count' => count($orphanBatches),
                'status' => $status,
            ],
            'ip_address' => $ip,
            'user_agent' => $userAgent,
        ]);

        return [
            'status' => $status,
            'total_checked' => $totalChecked,
            'discrepancies_count' => count($discrepancies),
            'discrepancies' => $discrepancies,
            'negative_stock_count' => count($negativeStockItems),
            'negative_stock_items' => $negativeStockItems,
            'orphan_batches_count' => count($orphanBatches),
            'orphan_batches' => $orphanBatches,
            'reconciled_at' => now()->toIso8601String(),
        ];
    }
}
