<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalesReturn;
use App\Models\SalesReturnItem;
use App\Models\SalesReturnPayment;
use App\Models\ProductVariant;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class SalesReturnService
{
    protected $inventoryService;
    protected $customerLedgerService;

    public function __construct(InventoryService $inventoryService, CustomerLedgerService $customerLedgerService)
    {
        $this->inventoryService = $inventoryService;
        $this->customerLedgerService = $customerLedgerService;
    }

    /**
     * Calculate returnable quantity for a sale item.
     */
    public function getReturnableQuantity(int $companyId, int $saleItemId): float
    {
        $saleItem = SaleItem::whereHas('sale', function ($q) use ($companyId) {
            $q->where('company_id', $companyId);
        })->findOrFail($saleItemId);

        $returnedQty = SalesReturnItem::where('original_sale_item_id', $saleItemId)
            ->whereHas('salesReturn', function ($q) {
                $q->where('status', 'COMPLETED');
            })
            ->sum('return_quantity');

        return max(0, $saleItem->quantity - $returnedQty);
    }

    /**
     * Process a return/exchange.
     */
    public function processReturn(int $companyId, array $data): SalesReturn
    {
        return DB::transaction(function () use ($companyId, $data) {
            // Idempotency check
            if (!empty($data['idempotency_key'])) {
                $existingReturn = SalesReturn::where('company_id', $companyId)
                    ->where('idempotency_key', $data['idempotency_key'])
                    ->first();
                if ($existingReturn) {
                    return $existingReturn->load(['items', 'payments']);
                }
            }

            // Original Sale Validation
            $originalSale = Sale::where('company_id', $companyId)
                ->lockForUpdate() // Lock sale
                ->findOrFail($data['original_sale_id']);

            if ($originalSale->status !== 'COMPLETED') {
                throw new ConflictHttpException("Only completed sales can be returned.");
            }

            // Generate return number
            $attempts = 0;
            do {
                $returnNumber = 'RET-' . date('YmdHis') . '-' . rand(100, 999);
                $exists = SalesReturn::where('company_id', $companyId)->where('return_number', $returnNumber)->exists();
                $attempts++;
            } while ($exists && $attempts < 5);

            if ($exists) {
                throw new ConflictHttpException("Failed to generate unique return number.");
            }

            // Process Items
            $subtotal = 0;
            $totalDiscount = 0;
            $totalTax = 0;
            $refundTotal = 0;
            
            $exchangeSubtotal = 0;
            
            $processedItems = [];
            
            foreach ($data['items'] as $itemData) {
                // Lock Sale Item
                $saleItem = SaleItem::where('id', $itemData['original_sale_item_id'])
                    ->where('sale_id', $originalSale->id)
                    ->lockForUpdate()
                    ->firstOrFail();
                    
                $returnQty = (float) $itemData['return_quantity'];
                if ($returnQty <= 0) {
                    throw new ConflictHttpException("Return quantity must be greater than zero.");
                }

                // Check eligibility inside lock
                $returnedQty = SalesReturnItem::where('original_sale_item_id', $saleItem->id)
                    ->whereHas('salesReturn', function ($q) {
                        $q->where('status', 'COMPLETED');
                    })
                    ->sum('return_quantity');
                
                $eligibleQty = $saleItem->quantity - $returnedQty;
                
                if ($returnQty > $eligibleQty) {
                    throw new ConflictHttpException("Requested return quantity ({$returnQty}) exceeds eligible quantity ({$eligibleQty}) for item ID {$saleItem->id}.");
                }

                // Calculate proportions
                $proportion = $returnQty / $saleItem->quantity;
                $itemRefundSubtotal = $saleItem->unit_price * $returnQty;
                $itemRefundDiscount = $saleItem->discount * $proportion;
                $itemRefundTax = $saleItem->tax * $proportion;
                $itemRefundTotal = $itemRefundSubtotal - $itemRefundDiscount + $itemRefundTax;

                $subtotal += $itemRefundSubtotal;
                $totalDiscount += $itemRefundDiscount;
                $totalTax += $itemRefundTax;
                $refundTotal += $itemRefundTotal;

                // Prepare processed item
                $pItem = [
                    'original_sale_item_id' => $saleItem->id,
                    'original_product_variant_id' => $saleItem->product_variant_id,
                    'sku_snapshot' => $saleItem->sku_snapshot,
                    'barcode_snapshot' => $saleItem->barcode_snapshot,
                    'product_name_snapshot' => $saleItem->product_name_snapshot,
                    'variant_description_snapshot' => $saleItem->variant_description_snapshot,
                    'original_unit_price' => $saleItem->unit_price,
                    'return_quantity' => $returnQty,
                    'return_unit_price' => $saleItem->unit_price,
                    'discount' => $itemRefundDiscount,
                    'tax' => $itemRefundTax,
                    'refund_line_total' => $itemRefundTotal,
                    'condition' => $itemData['condition'] ?? 'RESELLABLE',
                    'inventory_action' => $itemData['inventory_action'] ?? 'RESTORE',
                    'reason' => $itemData['reason'] ?? null,
                    'replacement_product_variant_id' => null,
                    'replacement_quantity' => null,
                    'replacement_unit_price' => null,
                    'replacement_line_total' => null,
                ];

                // Inventory Restoration
                if ($pItem['inventory_action'] === 'RESTORE' && $pItem['condition'] === 'RESELLABLE') {
                    $this->inventoryService->processMovement(
                        $companyId,
                        $originalSale->warehouse_id,
                        $saleItem->product_variant_id,
                        'RETURN_IN',
                        $returnQty,
                        $saleItem->unit_cost_snapshot,
                        'SALES_RETURN',
                        0, // Will update with return ID later
                        $returnNumber,
                        'Restored from return',
                        null,
                        $data['processed_by']
                    );
                } elseif (in_array($pItem['condition'], ['DAMAGED', 'DEFECTIVE', 'UNSELLABLE'])) {
                    if ($pItem['inventory_action'] === 'WRITE_OFF') {
                        // First bring it back in for accounting/cost balancing
                        $this->inventoryService->processMovement(
                            $companyId,
                            $originalSale->warehouse_id,
                            $saleItem->product_variant_id,
                            'RETURN_IN',
                            $returnQty,
                            $saleItem->unit_cost_snapshot,
                            'SALES_RETURN',
                            0,
                            $returnNumber,
                            'Returned damaged',
                            null,
                            $data['processed_by']
                        );
                        // Then write it off
                        $this->inventoryService->processMovement(
                            $companyId,
                            $originalSale->warehouse_id,
                            $saleItem->product_variant_id,
                            'DAMAGE',
                            $returnQty,
                            $saleItem->unit_cost_snapshot,
                            'SALES_RETURN',
                            0,
                            $returnNumber,
                            'Write off damaged return',
                            null,
                            $data['processed_by']
                        );
                    }
                }

                // Handle Exchange
                if (!empty($itemData['replacement_product_variant_id']) && !empty($itemData['replacement_quantity'])) {
                    $repVariant = ProductVariant::where('id', $itemData['replacement_product_variant_id'])
                        ->lockForUpdate()
                        ->firstOrFail();
                        
                    $repQty = (float) $itemData['replacement_quantity'];
                    $repPrice = (float) ($itemData['replacement_unit_price'] ?? $repVariant->price ?? 0);
                    $repLineTotal = $repQty * $repPrice;
                    
                    $pItem['replacement_product_variant_id'] = $repVariant->id;
                    $pItem['replacement_quantity'] = $repQty;
                    $pItem['replacement_unit_price'] = $repPrice;
                    $pItem['replacement_line_total'] = $repLineTotal;
                    
                    $exchangeSubtotal += $repLineTotal;

                    // Stock Out Replacement
                    $this->inventoryService->stockOut(
                        $companyId,
                        $originalSale->warehouse_id,
                        $repVariant->id,
                        $repQty,
                        'EXCHANGE_OUT',
                        0,
                        $returnNumber
                    );
                }

                $processedItems[] = $pItem;
            }

            // Calculate Difference
            // If exchangeSubtotal > refundTotal, customer owes us (positive difference)
            // If refundTotal > exchangeSubtotal, we owe customer (negative difference)
            $difference = $exchangeSubtotal - $refundTotal;
            
            // Refund validations
            $customerCreditAmount = 0;
            $cashRefundAmount = 0;
            
            $payments = [];
            if ($difference < 0) {
                // We owe customer
                $amountToRefund = abs($difference);
                $totalRefunded = 0;
                
                foreach (($data['refund_methods'] ?? []) as $rm) {
                    $rmAmount = (float) $rm['amount'];
                    if ($rmAmount <= 0) continue;
                    
                    $totalRefunded += $rmAmount;
                    
                    if ($rm['method'] === 'CUSTOMER_CREDIT') {
                        if (!$originalSale->customer_id) {
                            throw new ConflictHttpException("Cannot issue customer credit to walk-in customer.");
                        }
                        $customerCreditAmount += $rmAmount;
                    } else {
                        $cashRefundAmount += $rmAmount;
                    }
                    
                    $payments[] = [
                        'payment_method' => $rm['method'],
                        'amount' => $rmAmount,
                        'reference' => $rm['reference'] ?? null,
                        'notes' => $rm['notes'] ?? null,
                    ];
                }
                
                if (round($totalRefunded, 4) !== round($amountToRefund, 4)) {
                    throw new ConflictHttpException("Total refund amount ({$totalRefunded}) does not match the required refund ({$amountToRefund}).");
                }
            } elseif ($difference > 0) {
                // Customer owes us
                $totalPaid = 0;
                foreach (($data['exchange_payments'] ?? []) as $ep) {
                    $epAmount = (float) $ep['amount'];
                    if ($epAmount <= 0) continue;
                    
                    $totalPaid += $epAmount;
                    
                    $payments[] = [
                        'payment_method' => $ep['method'],
                        'amount' => $epAmount,
                        'reference' => $ep['reference'] ?? null,
                        'notes' => $ep['notes'] ?? null,
                    ];
                }
                
                if (round($totalPaid, 4) < round($difference, 4)) {
                    throw new ConflictHttpException("Total paid for exchange ({$totalPaid}) is less than the required amount ({$difference}).");
                }
            }
            
            // Create Return Record
            $salesReturn = SalesReturn::create([
                'company_id' => $companyId,
                'business_unit_id' => $originalSale->business_unit_id,
                'branch_id' => $originalSale->branch_id,
                'warehouse_id' => $originalSale->warehouse_id,
                'pos_terminal_id' => $data['pos_terminal_id'] ?? null,
                'pos_session_id' => $data['pos_session_id'] ?? null,
                'original_sale_id' => $originalSale->id,
                'customer_id' => $originalSale->customer_id,
                'return_number' => $returnNumber,
                'return_date' => now()->toDateString(),
                'idempotency_key' => $data['idempotency_key'] ?? null,
                'status' => 'COMPLETED', // Directly completed for now
                'return_type' => $data['return_type'] ?? 'REFUND',
                'subtotal' => $subtotal,
                'discount' => $totalDiscount,
                'tax' => $totalTax,
                'refund_total' => $refundTotal,
                'customer_credit_amount' => $customerCreditAmount,
                'cash_refund_amount' => $cashRefundAmount,
                'exchange_difference' => $difference,
                'reason' => $data['reason'] ?? null,
                'notes' => $data['notes'] ?? null,
                'processed_by' => $data['processed_by'],
                'created_by' => $data['processed_by'],
            ]);

            // Save Items & update stock movements reference_id
            foreach ($processedItems as $pItem) {
                $pItem['sales_return_id'] = $salesReturn->id;
                SalesReturnItem::create($pItem);
                
                // Note: Updating the reference_id on the stock movement directly is complex here because we don't have its ID.
                // A better approach is to let InventoryService know the correct reference_id initially, but we didn't have it.
                // For simplicity, we can query the latest movement by returnNumber and update it.
                DB::table('stock_movements')
                    ->where('reference_number', $returnNumber)
                    ->where('reference_id', 0)
                    ->update(['reference_id' => $salesReturn->id]);
            }

            // Save Payments
            foreach ($payments as $payment) {
                $payment['sales_return_id'] = $salesReturn->id;
                SalesReturnPayment::create($payment);
            }

            // Customer Ledger
            if ($customerCreditAmount > 0) {
                $this->customerLedgerService->addAdjustment(
                    $companyId,
                    $originalSale->customer_id,
                    $customerCreditAmount,
                    'CREDIT', // We owe customer
                    'SALES_RETURN',
                    $salesReturn->id,
                    $returnNumber,
                    "Store credit from return {$returnNumber}"
                );
            }

            return $salesReturn->load(['items', 'payments', 'originalSale']);
        });
    }
}
