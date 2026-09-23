<?php

namespace App\Services;

use App\Models\GoodsReceipt;
use App\Models\GoodsReceiptItem;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Supplier;
use App\Models\SupplierLedger;
use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Illuminate\Support\Str;

class PurchaseService
{
    protected InventoryService $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    public function postGoodsReceipt(int $receiptId, ?int $userId): GoodsReceipt
    {
        return DB::transaction(function () use ($receiptId, $userId) {
            $receipt = GoodsReceipt::with(['items', 'purchaseOrder'])->lockForUpdate()->findOrFail($receiptId);
            
            // Idempotency: If already POSTED, return existing receipt state
            if ($receipt->status === 'POSTED') {
                return $receipt->load(['items', 'purchaseOrder']);
            }

            if ($receipt->status === 'CANCELLED') {
                throw new ConflictHttpException("Cannot post a CANCELLED Goods Receipt.");
            }
            
            if ($receipt->status !== 'DRAFT') {
                throw new ConflictHttpException("Goods Receipt must be in DRAFT status to be posted.");
            }
            
            $po = $receipt->purchaseOrder;
            if (!$po) {
                throw new ConflictHttpException("Invalid Purchase Order association.");
            }

            // Company isolation check
            if ($po->company_id !== $receipt->company_id) {
                throw new ConflictHttpException("Purchase Order company mismatch.");
            }
            
            // Check PO status
            if (!in_array($po->status, ['APPROVED', 'PARTIALLY_RECEIVED'])) {
                throw new ConflictHttpException("Purchase Order must be APPROVED or PARTIALLY_RECEIVED to post a receipt.");
            }

            // Warehouse validation
            $warehouse = \App\Models\Warehouse::where('id', $receipt->warehouse_id)
                ->where('company_id', $receipt->company_id)
                ->first();
            if (!$warehouse) {
                throw new ConflictHttpException("Warehouse does not belong to the receipt's company.");
            }

            foreach ($receipt->items as $item) {
                $poItem = PurchaseOrderItem::where('id', $item->purchase_order_item_id)
                    ->lockForUpdate()
                    ->firstOrFail();
                
                if ($poItem->purchase_order_id !== $po->id) {
                    throw new ConflictHttpException("Purchase order item #{$poItem->id} does not belong to PO #{$po->id}.");
                }

                if ($item->product_variant_id !== $poItem->product_variant_id) {
                    throw new ConflictHttpException("Product variant mismatch on receipt item #{$item->id}.");
                }

                if ($item->received_quantity <= 0) {
                    throw new ConflictHttpException("Received quantity must be greater than zero.");
                }
                
                if ($item->received_quantity > $poItem->pending_quantity) {
                    throw new ConflictHttpException("Cannot over-receive item. Requested: {$item->received_quantity}, Pending: {$poItem->pending_quantity}");
                }

                // Storage location validation
                if (!empty($item->storage_location_id)) {
                    $loc = \App\Models\StorageLocation::where('id', $item->storage_location_id)
                        ->where('company_id', $receipt->company_id)
                        ->where('warehouse_id', $receipt->warehouse_id)
                        ->first();
                    if (!$loc) {
                        throw new ConflictHttpException("Storage location #{$item->storage_location_id} does not belong to warehouse #{$receipt->warehouse_id} or company #{$receipt->company_id}.");
                    }
                }

                // Stock batch validation
                if (!empty($item->stock_batch_id)) {
                    $batch = \App\Models\StockBatch::where('id', $item->stock_batch_id)
                        ->where('company_id', $receipt->company_id)
                        ->where('product_id', $item->product_id)
                        ->first();
                    if (!$batch) {
                        throw new ConflictHttpException("Stock batch #{$item->stock_batch_id} does not belong to product #{$item->product_id} or company #{$receipt->company_id}.");
                    }
                }
                
                // Process Inventory via authoritative InventoryService::stockIn()
                $this->inventoryService->stockIn(
                    companyId: $receipt->company_id,
                    warehouseId: $receipt->warehouse_id,
                    productVariantId: $item->product_variant_id,
                    quantity: (float) $item->received_quantity,
                    unitCost: (float) $item->unit_cost,
                    referenceType: 'GoodsReceipt',
                    referenceId: $receipt->id,
                    referenceNumber: $receipt->receipt_number,
                    reason: 'Goods received from PO ' . $po->po_number,
                    notes: $item->notes,
                    userId: $userId,
                    stockBatchId: $item->stock_batch_id,
                    batchNumber: $item->batch_number,
                    storageLocationId: $item->storage_location_id
                );
                
                // Update PO Item quantities
                $poItem->received_quantity += $item->received_quantity;
                $poItem->pending_quantity = max(0, $poItem->quantity - $poItem->received_quantity);
                $poItem->save();
            }
            
            // Re-evaluate PO Status
            $allReceived = !PurchaseOrderItem::where('purchase_order_id', $po->id)
                ->where('pending_quantity', '>', 0)
                ->exists();
            
            $po->status = $allReceived ? 'FULLY_RECEIVED' : 'PARTIALLY_RECEIVED';
            $po->save();
            
            // Inventory Accounting Integration (Gate 1.4 / 1.5)
            // When auto_posting_enabled = true, posts DR Inventory Asset, CR AP Clearing.
            // If accounting fails (e.g. closed period, missing mapping), exception is thrown and rolls back entire transaction.
            app(InventoryAccountingService::class)->postPurchaseReceipt($receipt, $userId);

            // Update Receipt Status
            $receipt->status = 'POSTED';
            $receipt->posted_by = $userId;
            $receipt->posted_at = now();
            $receipt->save();
            
            AuditLog::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $receipt->company_id,
                'user_id' => $userId,
                'event' => 'GOODS_RECEIPT_POSTED',
                'auditable_type' => GoodsReceipt::class,
                'auditable_id' => $receipt->id,
                'new_values' => ['status' => 'POSTED', 'receipt_number' => $receipt->receipt_number],
            ]);

            return $receipt->load(['items', 'purchaseOrder']);
        });
    }

    public function postPurchaseInvoice(int $purchaseId, ?int $userId): Purchase
    {
        return DB::transaction(function () use ($purchaseId, $userId) {
            $purchase = Purchase::lockForUpdate()->findOrFail($purchaseId);
            
            // Idempotency: If already POSTED, return existing purchase state
            if ($purchase->status === 'POSTED') {
                return $purchase->load(['items', 'supplier']);
            }

            if ($purchase->status === 'CANCELLED') {
                throw new ConflictHttpException("Cannot post a CANCELLED Purchase.");
            }

            if ($purchase->status !== 'DRAFT') {
                throw new ConflictHttpException("Purchase must be in DRAFT status to be posted.");
            }
            
            // Supplier Ledger Entry
            $supplier = Supplier::where('id', $purchase->supplier_id)
                ->where('company_id', $purchase->company_id)
                ->lockForUpdate()
                ->firstOrFail();
            
            $balanceBefore = SupplierLedger::where('supplier_id', $supplier->id)
                ->where('company_id', $purchase->company_id)
                ->orderBy('id', 'desc')
                ->value('balance_after') ?? $supplier->opening_balance;
                
            $balanceAfter = $balanceBefore + $purchase->grand_total;
            
            SupplierLedger::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $purchase->company_id,
                'supplier_id' => $purchase->supplier_id,
                'transaction_type' => 'PURCHASE',
                'reference_type' => 'Purchase',
                'reference_id' => $purchase->id,
                'reference_number' => $purchase->supplier_invoice_number,
                'credit' => $purchase->grand_total,
                'debit' => 0,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'transaction_date' => $purchase->invoice_date,
                'created_by' => $userId,
            ]);

            // General Ledger Posting (Gate 1.5): DR AP Clearing, CR Accounts Payable
            app(InventoryAccountingService::class)->postPurchaseInvoice($purchase, $userId);
            
            $purchase->status = 'POSTED';
            $purchase->posted_by = $userId;
            $purchase->posted_at = now();
            $purchase->save();
            
            AuditLog::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $purchase->company_id,
                'user_id' => $userId,
                'event' => 'PURCHASE_POSTED',
                'auditable_type' => Purchase::class,
                'auditable_id' => $purchase->id,
                'new_values' => ['status' => 'POSTED', 'grand_total' => $purchase->grand_total],
            ]);
            
            return $purchase->load(['items', 'supplier']);
        });
    }
}
