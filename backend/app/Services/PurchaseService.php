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
            
            if ($receipt->status !== 'DRAFT') {
                throw new ConflictHttpException("Goods Receipt must be in DRAFT status to be posted.");
            }
            
            $po = $receipt->purchaseOrder;
            if (!$po) {
                throw new ConflictHttpException("Invalid Purchase Order association.");
            }
            
            // Check PO status
            if (!in_array($po->status, ['APPROVED', 'PARTIALLY_RECEIVED'])) {
                throw new ConflictHttpException("Purchase Order must be APPROVED or PARTIALLY_RECEIVED to post a receipt.");
            }

            foreach ($receipt->items as $item) {
                $poItem = PurchaseOrderItem::where('id', $item->purchase_order_item_id)
                    ->lockForUpdate()
                    ->firstOrFail();
                
                if ($item->received_quantity > $poItem->pending_quantity) {
                    throw new ConflictHttpException("Cannot over-receive item. Requested: {$item->received_quantity}, Pending: {$poItem->pending_quantity}");
                }
                
                // Process Inventory via InventoryService (STOCK_IN)
                $this->inventoryService->processMovement(
                    companyId: $receipt->company_id,
                    warehouseId: $receipt->warehouse_id,
                    productVariantId: $item->product_variant_id,
                    movementType: 'STOCK_IN',
                    quantity: $item->received_quantity,
                    unitCost: $item->unit_cost,
                    referenceType: 'GoodsReceipt',
                    referenceId: $receipt->id,
                    referenceNumber: $receipt->receipt_number,
                    reason: 'Goods received from PO ' . $po->po_number,
                    notes: $item->notes,
                    userId: $userId
                );
                
                // Update PO Item quantities
                $poItem->received_quantity += $item->received_quantity;
                $poItem->pending_quantity = $poItem->quantity - $poItem->received_quantity;
                $poItem->save();
            }
            
            // Update Receipt Status
            $receipt->status = 'POSTED';
            $receipt->posted_by = $userId;
            $receipt->posted_at = now();
            $receipt->save();
            
            // Re-evaluate PO Status
            $allReceived = true;
            $poItems = PurchaseOrderItem::where('purchase_order_id', $po->id)->get();
            foreach ($poItems as $pItem) {
                if ($pItem->pending_quantity > 0) {
                    $allReceived = false;
                    break;
                }
            }
            
            $po->status = $allReceived ? 'FULLY_RECEIVED' : 'PARTIALLY_RECEIVED';
            $po->save();
            
            AuditLog::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $receipt->company_id,
                'user_id' => $userId,
                'event' => 'GOODS_RECEIPT_POSTED',
                'auditable_type' => GoodsReceipt::class,
                'auditable_id' => $receipt->id,
                'new_values' => ['status' => 'POSTED'],
            ]);
            
            // Inventory Accounting Integration (Gate 1.4)
            app(InventoryAccountingService::class)->postPurchaseReceipt($receipt, $userId);

            return $receipt;
        });
    }

    public function postPurchaseInvoice(int $purchaseId, ?int $userId): Purchase
    {
        return DB::transaction(function () use ($purchaseId, $userId) {
            $purchase = Purchase::lockForUpdate()->findOrFail($purchaseId);
            
            if ($purchase->status !== 'DRAFT') {
                throw new ConflictHttpException("Purchase must be in DRAFT status to be posted.");
            }
            
            // Supplier Ledger Entry
            $supplier = Supplier::lockForUpdate()->findOrFail($purchase->supplier_id);
            
            $balanceBefore = SupplierLedger::where('supplier_id', $supplier->id)
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
            
            return $purchase;
        });
    }
}
