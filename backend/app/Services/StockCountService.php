<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\ProductVariant;
use App\Models\StockCount;
use App\Models\StockCountItem;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Illuminate\Support\Str;

class StockCountService
{
    public function __construct(
        protected InventoryService $inventoryService
    ) {}

    public function createCount(array $data, ?int $userId): StockCount
    {
        return DB::transaction(function () use ($data, $userId) {
            $companyId = (int) $data['company_id'];
            $warehouseId = (int) $data['warehouse_id'];

            $warehouse = Warehouse::where('company_id', $companyId)->find($warehouseId);
            if (!$warehouse) {
                throw new ConflictHttpException("Warehouse does not belong to the authorized company.");
            }
            if ($warehouse->status === 'inactive') {
                throw new ConflictHttpException("Warehouse is inactive and cannot perform stock counts.");
            }

            $datePrefix = date('Ymd');
            $random = strtoupper(Str::random(4));
            $countNumber = "SC-{$datePrefix}-{$random}";

            $stockCount = StockCount::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $companyId,
                'warehouse_id' => $warehouseId,
                'storage_location_id' => $data['storage_location_id'] ?? null,
                'count_number' => $countNumber,
                'count_type' => $data['count_type'] ?? 'FULL',
                'count_date' => $data['count_date'] ?? now()->toDateString(),
                'status' => 'DRAFT',
                'counted_by' => $data['counted_by'] ?? $userId,
                'notes' => $data['notes'] ?? null,
                'created_by' => $userId,
            ]);

            // If explicit items provided, populate them
            if (!empty($data['items']) && is_array($data['items'])) {
                foreach ($data['items'] as $item) {
                    $variant = ProductVariant::where('company_id', $companyId)->findOrFail($item['product_variant_id']);
                    
                    // Fetch current authoritative system quantity
                    $inventory = Inventory::where('company_id', $companyId)
                        ->where('warehouse_id', $warehouseId)
                        ->where('product_variant_id', $variant->id)
                        ->first();

                    $systemQty = $inventory ? (float) $inventory->quantity : 0.0;
                    $countedQty = isset($item['counted_quantity']) ? (float) $item['counted_quantity'] : $systemQty;
                    $varianceQty = round($countedQty - $systemQty, 4);
                    $unitCost = $inventory && (float) $inventory->average_cost > 0
                        ? (float) $inventory->average_cost
                        : (float) ($variant->cost_price ?? 0);
                    $varianceAmount = round($varianceQty * $unitCost, 4);

                    StockCountItem::create([
                        'stock_count_id' => $stockCount->id,
                        'product_id' => $variant->product_id,
                        'product_variant_id' => $variant->id,
                        'stock_batch_id' => $item['stock_batch_id'] ?? null,
                        'storage_location_id' => $item['storage_location_id'] ?? ($data['storage_location_id'] ?? null),
                        'system_quantity' => $systemQty,
                        'counted_quantity' => $countedQty,
                        'variance_quantity' => $varianceQty,
                        'unit_cost' => $unitCost,
                        'variance_amount' => $varianceAmount,
                        'variance_reason' => $item['variance_reason'] ?? null,
                        'notes' => $item['notes'] ?? null,
                    ]);
                }
            } elseif (!empty($data['auto_populate']) || ($data['count_type'] ?? '') === 'FULL') {
                // Auto-populate all active inventory items in the warehouse
                $invQuery = Inventory::with(['productVariant'])
                    ->where('company_id', $companyId)
                    ->where('warehouse_id', $warehouseId);

                $inventories = $invQuery->get();

                foreach ($inventories as $inv) {
                    if (!$inv->productVariant) continue;

                    $systemQty = (float) $inv->quantity;
                    $unitCost = (float) $inv->average_cost > 0 ? (float) $inv->average_cost : (float) ($inv->productVariant->cost_price ?? 0);

                    StockCountItem::create([
                        'stock_count_id' => $stockCount->id,
                        'product_id' => $inv->product_id,
                        'product_variant_id' => $inv->product_variant_id,
                        'storage_location_id' => $data['storage_location_id'] ?? null,
                        'system_quantity' => $systemQty,
                        'counted_quantity' => $systemQty, // default to system until updated
                        'variance_quantity' => 0,
                        'unit_cost' => $unitCost,
                        'variance_amount' => 0,
                    ]);
                }
            }

            AuditLog::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $companyId,
                'user_id' => $userId,
                'event' => 'STOCK_COUNT_CREATED',
                'auditable_type' => StockCount::class,
                'auditable_id' => $stockCount->id,
                'new_values' => [
                    'count_number' => $countNumber,
                    'status' => 'DRAFT',
                    'warehouse_id' => $warehouseId,
                ],
            ]);

            return $stockCount->load(['warehouse', 'storageLocation', 'items.productVariant.product']);
        });
    }

    public function startCount(StockCount $count, ?int $userId): StockCount
    {
        return DB::transaction(function () use ($count, $userId) {
            $count = StockCount::where('id', $count->id)->lockForUpdate()->firstOrFail();

            if ($count->status !== 'DRAFT') {
                throw new ConflictHttpException("Only DRAFT counts can be moved to COUNTING status.");
            }

            $count->update([
                'status' => 'COUNTING',
                'counted_by' => $count->counted_by ?? $userId,
            ]);

            return $count;
        });
    }

    public function updateItems(StockCount $count, array $itemsData, ?int $userId): StockCount
    {
        return DB::transaction(function () use ($count, $itemsData, $userId) {
            $count = StockCount::where('id', $count->id)->lockForUpdate()->firstOrFail();

            if (!in_array($count->status, ['DRAFT', 'COUNTING'])) {
                throw new ConflictHttpException("Cannot modify items on a stock count with status {$count->status}.");
            }

            foreach ($itemsData as $itemData) {
                if (!isset($itemData['id'])) {
                    continue;
                }

                $item = StockCountItem::where('stock_count_id', $count->id)->find($itemData['id']);
                if (!$item) continue;

                $countedQty = (float) ($itemData['counted_quantity'] ?? $item->counted_quantity);
                $systemQty = (float) $item->system_quantity;
                $varianceQty = round($countedQty - $systemQty, 4);
                $unitCost = (float) $item->unit_cost;
                $varianceAmount = round($varianceQty * $unitCost, 4);

                $item->update([
                    'counted_quantity' => $countedQty,
                    'variance_quantity' => $varianceQty,
                    'variance_amount' => $varianceAmount,
                    'variance_reason' => $itemData['variance_reason'] ?? $item->variance_reason,
                    'notes' => $itemData['notes'] ?? $item->notes,
                ]);
            }

            return $count->fresh(['items.productVariant.product']);
        });
    }

    public function submitCount(StockCount $count, ?int $userId): StockCount
    {
        return DB::transaction(function () use ($count, $userId) {
            $count = StockCount::where('id', $count->id)->lockForUpdate()->firstOrFail();

            if (!in_array($count->status, ['DRAFT', 'COUNTING'])) {
                throw new ConflictHttpException("Only DRAFT or COUNTING stock counts can be submitted.");
            }

            $count->update([
                'status' => 'SUBMITTED',
                'submitted_by' => $userId,
            ]);

            AuditLog::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $count->company_id,
                'user_id' => $userId,
                'event' => 'STOCK_COUNT_SUBMITTED',
                'auditable_type' => StockCount::class,
                'auditable_id' => $count->id,
                'new_values' => ['status' => 'SUBMITTED'],
            ]);

            return $count;
        });
    }

    public function reviewCount(StockCount $count, ?int $userId): StockCount
    {
        return DB::transaction(function () use ($count, $userId) {
            $count = StockCount::where('id', $count->id)->lockForUpdate()->firstOrFail();

            if ($count->status !== 'SUBMITTED') {
                throw new ConflictHttpException("Only SUBMITTED stock counts can be reviewed.");
            }

            $count->update([
                'status' => 'REVIEWED',
                'reviewed_by' => $userId,
                'reviewed_at' => now(),
            ]);

            return $count;
        });
    }

    public function approveCount(StockCount $count, ?int $userId): StockCount
    {
        return DB::transaction(function () use ($count, $userId) {
            $count = StockCount::where('id', $count->id)->lockForUpdate()->firstOrFail();

            if (!in_array($count->status, ['SUBMITTED', 'REVIEWED'])) {
                throw new ConflictHttpException("Only SUBMITTED or REVIEWED stock counts can be approved.");
            }

            $count->update([
                'status' => 'APPROVED',
                'approved_by' => $userId,
                'approved_at' => now(),
            ]);

            AuditLog::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $count->company_id,
                'user_id' => $userId,
                'event' => 'STOCK_COUNT_APPROVED',
                'auditable_type' => StockCount::class,
                'auditable_id' => $count->id,
                'new_values' => ['status' => 'APPROVED'],
            ]);

            return $count;
        });
    }

    public function postCount(StockCount $count, ?int $userId): StockCount
    {
        return DB::transaction(function () use ($count, $userId) {
            $count = StockCount::where('id', $count->id)->lockForUpdate()->firstOrFail();

            if ($count->status === 'POSTED') {
                throw new ConflictHttpException("Stock count is already POSTED and immutable.");
            }

            if ($count->status !== 'APPROVED') {
                throw new ConflictHttpException("Only APPROVED stock counts can be posted to inventory ledger.");
            }

            // Post adjustments for all non-zero variances
            foreach ($count->items as $item) {
                $variance = (float) $item->variance_quantity;

                if ($variance > 0) {
                    // Positive variance: stock found -> ADJUSTMENT_IN
                    $this->inventoryService->adjustmentIn(
                        companyId: $count->company_id,
                        warehouseId: $count->warehouse_id,
                        productVariantId: $item->product_variant_id,
                        quantity: $variance,
                        unitCost: (float) $item->unit_cost,
                        referenceType: StockCount::class,
                        referenceId: $count->id,
                        referenceNumber: $count->count_number,
                        reason: $item->variance_reason ?? 'COUNTING_CORRECTION',
                        notes: "Physical stock count adjustment: {$count->count_number}",
                        userId: $userId,
                        stockBatchId: $item->stock_batch_id,
                        storageLocationId: $item->storage_location_id
                    );
                } elseif ($variance < 0) {
                    // Negative variance: stock missing/damaged -> ADJUSTMENT_OUT
                    $this->inventoryService->adjustmentOut(
                        companyId: $count->company_id,
                        warehouseId: $count->warehouse_id,
                        productVariantId: $item->product_variant_id,
                        quantity: abs($variance),
                        referenceType: StockCount::class,
                        referenceId: $count->id,
                        referenceNumber: $count->count_number,
                        reason: $item->variance_reason ?? 'COUNTING_CORRECTION',
                        notes: "Physical stock count adjustment: {$count->count_number}",
                        userId: $userId,
                        stockBatchId: $item->stock_batch_id,
                        storageLocationId: $item->storage_location_id
                    );
                }
            }

            $count->update([
                'status' => 'POSTED',
                'posted_by' => $userId,
                'posted_at' => now(),
            ]);

            AuditLog::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $count->company_id,
                'user_id' => $userId,
                'event' => 'STOCK_COUNT_POSTED',
                'auditable_type' => StockCount::class,
                'auditable_id' => $count->id,
                'new_values' => [
                    'status' => 'POSTED',
                    'count_number' => $count->count_number,
                    'items_count' => $count->items->count(),
                ],
            ]);

            return $count->fresh(['warehouse', 'storageLocation', 'items.productVariant.product']);
        });
    }

    public function cancelCount(StockCount $count, ?int $userId): StockCount
    {
        return DB::transaction(function () use ($count, $userId) {
            $count = StockCount::where('id', $count->id)->lockForUpdate()->firstOrFail();

            if (in_array($count->status, ['POSTED', 'CANCELLED'])) {
                throw new ConflictHttpException("Cannot cancel a stock count with status {$count->status}.");
            }

            $count->update(['status' => 'CANCELLED']);

            AuditLog::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $count->company_id,
                'user_id' => $userId,
                'event' => 'STOCK_COUNT_CANCELLED',
                'auditable_type' => StockCount::class,
                'auditable_id' => $count->id,
                'new_values' => ['status' => 'CANCELLED'],
            ]);

            return $count;
        });
    }
}
