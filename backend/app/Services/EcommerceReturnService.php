<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalesReturn;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class EcommerceReturnService
{
    public function __construct(
        protected SalesReturnService $salesReturnService,
        protected TaxPostingService $taxPostingService
    ) {}

    /**
     * Process an online order return using canonical SalesReturnService.
     */
    public function processOnlineReturn(
        int $companyId,
        int $saleId,
        array $items,
        string $returnType = 'STORE_CREDIT', // STORE_CREDIT, REFUND, EXCHANGE
        ?string $reason = null,
        ?int $userId = null
    ): SalesReturn {
        return DB::transaction(function () use ($companyId, $saleId, $items, $returnType, $reason, $userId) {
            $sale = Sale::where('company_id', $companyId)->findOrFail($saleId);

            if ($sale->status !== 'COMPLETED') {
                throw new ConflictHttpException("Only completed orders can be returned.");
            }

            $totalRefund = 0;
            $returnItems = [];
            foreach ($items as $item) {
                $saleItem = SaleItem::where('sale_id', $sale->id)->findOrFail($item['sale_item_id']);
                $qty = (float) $item['quantity'];
                $proportion = $qty / (float) $saleItem->quantity;
                $itemRefundTotal = ($saleItem->unit_price * $qty) - ($saleItem->discount * $proportion) + ($saleItem->tax * $proportion);
                $totalRefund += $itemRefundTotal;

                $condition = strtoupper($item['condition'] ?? 'RESELLABLE');
                if ($condition === 'GOOD') {
                    $condition = 'RESELLABLE';
                }

                $returnItems[] = [
                    'original_sale_item_id' => $saleItem->id,
                    'return_quantity' => $qty,
                    'condition' => $condition,
                    'inventory_action' => $item['inventory_action'] ?? ($condition === 'RESELLABLE' ? 'RESTORE' : 'WRITE_OFF'),
                    'reason' => $item['reason'] ?? $reason,
                ];
            }

            $refundTotalRounded = round($totalRefund, 4);

            $mappedReturnType = match (strtoupper($returnType)) {
                'CUSTOMER_CREDIT', 'STORE_CREDIT' => 'STORE_CREDIT',
                'EXCHANGE' => 'EXCHANGE',
                default => 'REFUND',
            };

            $refundPaymentMethod = ($mappedReturnType === 'STORE_CREDIT') ? 'CUSTOMER_CREDIT' : 'CASH';

            $returnData = [
                'original_sale_id' => $sale->id,
                'return_type' => $mappedReturnType,
                'reason' => $reason ?? 'E-commerce customer return',
                'processed_by' => $userId,
                'items' => $returnItems,
                'refund_methods' => [
                    [
                        'method' => $refundPaymentMethod,
                        'amount' => $refundTotalRounded,
                        'notes' => 'E-commerce return refund',
                    ],
                ],
            ];

            // Reuses authoritative SalesReturnService
            $salesReturn = $this->salesReturnService->processReturn($companyId, $returnData);

            // Reverses output VAT via Phase 10 TaxPostingService
            $this->taxPostingService->postSalesReturnTax(
                companyId: $companyId,
                salesReturn: $salesReturn,
                taxCalculation: [
                    'taxable_amount' => (float) $salesReturn->subtotal,
                    'tax_amount' => (float) $salesReturn->tax,
                    'sd_amount' => 0,
                    'at_amount' => 0,
                    'total_tax_amount' => (float) $salesReturn->tax,
                    'is_inclusive' => false,
                ],
                userId: $userId
            );

            // Update original sale fulfillment_status
            $totalOriginalItemsQty = $sale->items()->sum('quantity');
            $totalReturnedItemsQty = SalesReturn::where('original_sale_id', $sale->id)
                ->where('status', 'COMPLETED')
                ->with('items')
                ->get()
                ->flatMap->items
                ->sum('return_quantity');

            if ($totalReturnedItemsQty >= $totalOriginalItemsQty) {
                $sale->update(['fulfillment_status' => 'RETURNED']);
            } else {
                $sale->update(['fulfillment_status' => 'PARTIALLY_RETURNED']);
            }

            AuditLog::log(
                $companyId,
                $userId,
                'ECOMMERCE_RETURN_PROCESSED',
                $salesReturn->id,
                'SalesReturn',
                "Processed online return {$salesReturn->return_number} for Order #{$sale->order_number} (Refund: ৳{$salesReturn->refund_total})."
            );

            return $salesReturn;
        });
    }
}
