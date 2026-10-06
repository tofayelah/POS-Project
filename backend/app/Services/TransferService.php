<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Inventory;
use App\Models\ProductVariant;
use App\Models\StockTransfer;
use App\Models\StockTransferItem;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Illuminate\Support\Str;

class TransferService
{
    public function __construct(protected InventoryService $inventoryService) {}

    public function createTransfer(array $data, ?int $userId): StockTransfer
    {
        return DB::transaction(function () use ($data, $userId) {
            $companyId = (int) $data['company_id'];
            $sourceWarehouseId = (int) $data['source_warehouse_id'];
            $destinationWarehouseId = (int) $data['destination_warehouse_id'];

            if ($sourceWarehouseId === $destinationWarehouseId) {
                throw new ConflictHttpException("Source and destination warehouses cannot be the same.");
            }

            $sourceWarehouse = Warehouse::where('company_id', $companyId)->find($sourceWarehouseId);
            if (!$sourceWarehouse) {
                throw new ConflictHttpException("Source warehouse does not belong to the authorized company.");
            }
            if ($sourceWarehouse->status === 'inactive') {
                throw new ConflictHttpException("Source warehouse is inactive and cannot initiate stock transfers.");
            }

            $destinationWarehouse = Warehouse::where('company_id', $companyId)->find($destinationWarehouseId);
            if (!$destinationWarehouse) {
                throw new ConflictHttpException("Destination warehouse does not belong to the authorized company.");
            }
            if ($destinationWarehouse->status === 'inactive') {
                throw new ConflictHttpException("Destination warehouse is inactive and cannot receive stock transfers.");
            }

            if (empty($data['items']) || !is_array($data['items'])) {
                throw new ConflictHttpException("Transfer must include at least one item.");
            }

            // Verify item quantities
            foreach ($data['items'] as $itemData) {
                $qty = (float) ($itemData['quantity'] ?? 0);
                if ($qty <= 0) {
                    throw new ConflictHttpException("Transfer item quantity must be greater than zero.");
                }
            }

            $datePrefix = date('Ymd');
            $random = strtoupper(Str::random(4));
            $transferNumber = "TR-{$datePrefix}-{$random}";

            $transfer = StockTransfer::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $companyId,
                'source_warehouse_id' => $sourceWarehouseId,
                'destination_warehouse_id' => $destinationWarehouseId,
                'transfer_number' => $transferNumber,
                'status' => 'DRAFT',
                'requested_by' => $userId,
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($data['items'] as $item) {
                $variant = ProductVariant::where('company_id', $companyId)->findOrFail($item['product_variant_id']);
                StockTransferItem::create([
                    'stock_transfer_id' => $transfer->id,
                    'product_id' => $variant->product_id,
                    'product_variant_id' => $variant->id,
                    'source_storage_location_id' => $item['source_storage_location_id'] ?? null,
                    'destination_storage_location_id' => $item['destination_storage_location_id'] ?? null,
                    'stock_batch_id' => $item['stock_batch_id'] ?? null,
                    'quantity' => $item['quantity'],
                    'notes' => $item['notes'] ?? null,
                ]);
            }

            AuditLog::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $companyId,
                'user_id' => $userId,
                'event' => 'STOCK_TRANSFER_REQUESTED',
                'auditable_type' => StockTransfer::class,
                'auditable_id' => $transfer->id,
                'new_values' => ['status' => 'DRAFT', 'transfer_number' => $transferNumber, 'items_count' => count($data['items'])],
            ]);

            return $transfer->load(['items.productVariant', 'items.sourceStorageLocation', 'items.destinationStorageLocation', 'items.stockBatch']);
        });
    }

    public function submitTransfer(StockTransfer $transfer, ?int $userId): StockTransfer
    {
        return DB::transaction(function () use ($transfer, $userId) {
            $transfer = StockTransfer::where('id', $transfer->id)->lockForUpdate()->firstOrFail();

            if ($transfer->status !== 'DRAFT') {
                throw new ConflictHttpException("Only DRAFT transfers can be submitted.");
            }

            $transfer->update(['status' => 'PENDING_APPROVAL']);

            AuditLog::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $transfer->company_id,
                'user_id' => $userId,
                'event' => 'STOCK_TRANSFER_REQUESTED',
                'auditable_type' => StockTransfer::class,
                'auditable_id' => $transfer->id,
                'new_values' => ['status' => 'PENDING_APPROVAL'],
            ]);

            return $transfer;
        });
    }

    public function approveTransfer(StockTransfer $transfer, ?int $userId): StockTransfer
    {
        return DB::transaction(function () use ($transfer, $userId) {
            $transfer = StockTransfer::where('id', $transfer->id)->lockForUpdate()->firstOrFail();

            if ($transfer->status !== 'PENDING_APPROVAL') {
                throw new ConflictHttpException("Only PENDING_APPROVAL transfers can be approved.");
            }

            $transfer->update([
                'status' => 'APPROVED',
                'approved_by' => $userId,
                'approved_at' => now(),
            ]);

            AuditLog::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $transfer->company_id,
                'user_id' => $userId,
                'event' => 'STOCK_TRANSFER_APPROVED',
                'auditable_type' => StockTransfer::class,
                'auditable_id' => $transfer->id,
                'new_values' => ['status' => 'APPROVED'],
            ]);

            return $transfer;
        });
    }

    public function shipTransfer(StockTransfer $transfer, ?int $userId): StockTransfer
    {
        return DB::transaction(function () use ($transfer, $userId) {
            $transfer = StockTransfer::where('id', $transfer->id)->lockForUpdate()->firstOrFail();

            if ($transfer->status !== 'APPROVED') {
                throw new ConflictHttpException("Only APPROVED transfers can be shipped.");
            }

            // Verify warehouses are still active
            $source = Warehouse::find($transfer->source_warehouse_id);
            if (!$source || $source->status === 'inactive') {
                throw new ConflictHttpException("Source warehouse is inactive.");
            }

            $dest = Warehouse::find($transfer->destination_warehouse_id);
            if (!$dest || $dest->status === 'inactive') {
                throw new ConflictHttpException("Destination warehouse is inactive.");
            }

            // Decrease stock at source warehouse atomically
            foreach ($transfer->items as $item) {
                $this->inventoryService->processMovement(
                    companyId: $transfer->company_id,
                    warehouseId: $transfer->source_warehouse_id,
                    productVariantId: $item->product_variant_id,
                    movementType: 'TRANSFER_OUT',
                    quantity: (float) $item->quantity,
                    referenceType: StockTransfer::class,
                    referenceId: $transfer->id,
                    referenceNumber: $transfer->transfer_number,
                    userId: $userId,
                    storageLocationId: $item->source_storage_location_id,
                    stockBatchId: $item->stock_batch_id
                );
            }

            $transfer->update([
                'status' => 'IN_TRANSIT',
                'shipped_by' => $userId,
                'shipped_at' => now(),
            ]);

            AuditLog::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $transfer->company_id,
                'user_id' => $userId,
                'event' => 'STOCK_TRANSFER_SHIPPED',
                'auditable_type' => StockTransfer::class,
                'auditable_id' => $transfer->id,
                'new_values' => ['status' => 'IN_TRANSIT'],
            ]);

            return $transfer;
        });
    }

    public function receiveTransfer(StockTransfer $transfer, array $itemsData, ?int $userId): StockTransfer
    {
        return DB::transaction(function () use ($transfer, $itemsData, $userId) {
            $transfer = StockTransfer::where('id', $transfer->id)->lockForUpdate()->firstOrFail();

            if ($transfer->status !== 'IN_TRANSIT') {
                throw new ConflictHttpException("Only IN_TRANSIT transfers can be received.");
            }

            $dest = Warehouse::find($transfer->destination_warehouse_id);
            if (!$dest || $dest->status === 'inactive') {
                throw new ConflictHttpException("Destination warehouse is inactive and cannot receive stock.");
            }

            $itemsMap = collect($itemsData)->keyBy('item_id');

            foreach ($transfer->items as $item) {
                $receiveData = $itemsMap->get($item->id);
                $receiveQty = $receiveData ? (float) $receiveData['received_quantity'] : (float) $item->quantity;

                if ($receiveQty > (float) $item->quantity) {
                    throw new ConflictHttpException("Cannot receive more than shipped for item {$item->id}");
                }

                if ($receiveQty > 0) {
                    $item->update(['received_quantity' => $receiveQty]);
                    
                    $this->inventoryService->processMovement(
                        companyId: $transfer->company_id,
                        warehouseId: $transfer->destination_warehouse_id,
                        productVariantId: $item->product_variant_id,
                        movementType: 'TRANSFER_IN',
                        quantity: $receiveQty,
                        referenceType: StockTransfer::class,
                        referenceId: $transfer->id,
                        referenceNumber: $transfer->transfer_number,
                        userId: $userId,
                        storageLocationId: $item->destination_storage_location_id,
                        stockBatchId: $item->stock_batch_id
                    );
                }
            }

            $transfer->update([
                'status' => 'RECEIVED',
                'received_by' => $userId,
                'received_at' => now(),
            ]);

            AuditLog::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $transfer->company_id,
                'user_id' => $userId,
                'event' => 'STOCK_TRANSFER_RECEIVED',
                'auditable_type' => StockTransfer::class,
                'auditable_id' => $transfer->id,
                'new_values' => ['status' => 'RECEIVED'],
            ]);

            return $transfer;
        });
    }

    public function cancelTransfer(StockTransfer $transfer, ?int $userId): StockTransfer
    {
        return DB::transaction(function () use ($transfer, $userId) {
            $transfer = StockTransfer::where('id', $transfer->id)->lockForUpdate()->firstOrFail();

            if (in_array($transfer->status, ['IN_TRANSIT', 'RECEIVED', 'CANCELLED'])) {
                throw new ConflictHttpException("Cannot cancel a transfer in status {$transfer->status}.");
            }

            $transfer->update(['status' => 'CANCELLED']);

            AuditLog::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $transfer->company_id,
                'user_id' => $userId,
                'event' => 'STOCK_TRANSFER_CANCELLED',
                'auditable_type' => StockTransfer::class,
                'auditable_id' => $transfer->id,
                'new_values' => ['status' => 'CANCELLED'],
            ]);

            return $transfer;
        });
    }
}
