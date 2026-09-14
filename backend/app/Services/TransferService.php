<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\StockTransfer;
use App\Models\StockTransferItem;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Illuminate\Support\Str;

class TransferService
{
    public function __construct(protected InventoryService $inventoryService) {}

    public function createTransfer(array $data, ?int $userId): StockTransfer
    {
        return DB::transaction(function () use ($data, $userId) {
            if ($data['source_warehouse_id'] == $data['destination_warehouse_id']) {
                throw new ConflictHttpException("Source and destination warehouses cannot be the same.");
            }

            $transfer = StockTransfer::create([
                'company_id' => $data['company_id'],
                'source_warehouse_id' => $data['source_warehouse_id'],
                'destination_warehouse_id' => $data['destination_warehouse_id'],
                'status' => 'DRAFT',
                'requested_by' => $userId,
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($data['items'] as $item) {
                $variant = \App\Models\ProductVariant::findOrFail($item['product_variant_id']);
                StockTransferItem::create([
                    'stock_transfer_id' => $transfer->id,
                    'product_id' => $variant->product_id,
                    'product_variant_id' => $variant->id,
                    'quantity' => $item['quantity'],
                    'notes' => $item['notes'] ?? null,
                ]);
            }

            AuditLog::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $data['company_id'],
                'user_id' => $userId,
                'event' => 'TRANSFER_CREATED',
                'auditable_type' => StockTransfer::class,
                'auditable_id' => $transfer->id,
                'new_values' => ['status' => 'DRAFT', 'items_count' => count($data['items'])],
            ]);

            return $transfer->load('items.productVariant');
        });
    }

    public function submitTransfer(StockTransfer $transfer, ?int $userId): StockTransfer
    {
        return DB::transaction(function () use ($transfer, $userId) {
            if ($transfer->status !== 'DRAFT') {
                throw new ConflictHttpException("Only DRAFT transfers can be submitted.");
            }

            $transfer->update(['status' => 'PENDING_APPROVAL']);

            return $transfer;
        });
    }

    public function approveTransfer(StockTransfer $transfer, ?int $userId): StockTransfer
    {
        return DB::transaction(function () use ($transfer, $userId) {
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
                'event' => 'TRANSFER_APPROVED',
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
            if ($transfer->status !== 'APPROVED') {
                throw new ConflictHttpException("Only APPROVED transfers can be shipped.");
            }

            // Decrease stock at source warehouse
            foreach ($transfer->items as $item) {
                $this->inventoryService->processMovement(
                    companyId: $transfer->company_id,
                    warehouseId: $transfer->source_warehouse_id,
                    productVariantId: $item->product_variant_id,
                    movementType: 'TRANSFER_OUT',
                    quantity: $item->quantity,
                    referenceType: StockTransfer::class,
                    referenceId: $transfer->id,
                    referenceNumber: $transfer->transfer_number,
                    userId: $userId
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
                'event' => 'TRANSFER_SHIPPED',
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
            if ($transfer->status !== 'IN_TRANSIT') {
                throw new ConflictHttpException("Only IN_TRANSIT transfers can be received.");
            }

            $itemsMap = collect($itemsData)->keyBy('item_id');

            foreach ($transfer->items as $item) {
                $receiveData = $itemsMap->get($item->id);
                $receiveQty = $receiveData ? $receiveData['received_quantity'] : $item->quantity; // Default to full if not specified

                if ($receiveQty > $item->quantity) {
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
                        userId: $userId
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
                'event' => 'TRANSFER_RECEIVED',
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
            if (in_array($transfer->status, ['IN_TRANSIT', 'RECEIVED', 'CANCELLED'])) {
                throw new ConflictHttpException("Cannot cancel a transfer in status {$transfer->status}.");
            }

            $transfer->update(['status' => 'CANCELLED']);

            AuditLog::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $transfer->company_id,
                'user_id' => $userId,
                'event' => 'TRANSFER_CANCELLED',
                'auditable_type' => StockTransfer::class,
                'auditable_id' => $transfer->id,
                'new_values' => ['status' => 'CANCELLED'],
            ]);

            return $transfer;
        });
    }
}
