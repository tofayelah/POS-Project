<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\PurchaseOrderItem;
use App\Models\PurchaseRequisition;
use App\Models\SaleItem;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class ProcurementRecommendationService
{
    protected ProcurementPriceService $priceService;
    protected ProcurementRequisitionService $requisitionService;

    public function __construct(
        ProcurementPriceService $priceService,
        ProcurementRequisitionService $requisitionService
    ) {
        $this->priceService = $priceService;
        $this->requisitionService = $requisitionService;
    }

    /**
     * Compute deterministic procurement replenishment recommendations.
     * Generates 0 GL, 0 Stock movements, 0 inventory mutations, and 0 AP entries.
     */
    public function generateRecommendations(
        int $companyId,
        ?int $warehouseId = null,
        int $lookbackDays = 30,
        int $targetCoverageDays = 30
    ): array {
        $startDate = Carbon::now()->subDays($lookbackDays)->toDateString();

        $warehouse = $warehouseId
            ? Warehouse::where('company_id', $companyId)->find($warehouseId)
            : Warehouse::where('company_id', $companyId)->first();

        if (!$warehouse) {
            return [
                'warehouse' => null,
                'recommendations' => [],
                'summary' => [
                    'total_items_analyzed' => 0,
                    'items_needing_reorder' => 0,
                    'total_estimated_spend' => 0.0,
                ],
            ];
        }

        $variants = ProductVariant::whereHas('product', function ($q) use ($companyId) {
            $q->where('company_id', $companyId)->whereIn('status', ['active', 'ACTIVE']);
        })->with('product')->get();

        $recommendations = [];
        $totalEstimatedSpend = 0.0;

        foreach ($variants as $variant) {
            $product = $variant->product;
            if (!$product) {
                continue;
            }

            // 1. Current stock on hand
            $stockOnHand = (float) Inventory::where('warehouse_id', $warehouse->id)
                ->where('product_variant_id', $variant->id)
                ->value('quantity') ?? 0.0;

            // 2. Incoming open PO quantities
            $incomingPoQty = (float) PurchaseOrderItem::whereHas('purchaseOrder', function ($q) use ($warehouse, $companyId) {
                $q->where('company_id', $companyId)
                  ->where('warehouse_id', $warehouse->id)
                  ->whereIn('status', ['APPROVED', 'PARTIALLY_RECEIVED']);
            })
            ->where('product_variant_id', $variant->id)
            ->sum('pending_quantity');

            $netAvailable = $stockOnHand + $incomingPoQty;

            // 3. Historical Sales Velocity (daily run rate)
            $totalSalesPeriod = (float) SaleItem::whereHas('sale', function ($q) use ($companyId, $startDate) {
                $q->where('company_id', $companyId)
                  ->where('sale_date', '>=', $startDate)
                  ->whereIn('status', ['COMPLETED', 'POSTED']);
            })
            ->where('product_variant_id', $variant->id)
            ->sum('quantity');

            $dailyVelocity = $lookbackDays > 0 ? round($totalSalesPeriod / $lookbackDays, 2) : 0.0;

            // 4. Resolve Preferred / Best Supplier
            $preferredSupplier = null;
            if (!empty($product->supplier_id)) {
                $preferredSupplier = Supplier::where('company_id', $companyId)->find($product->supplier_id);
            }
            if (!$preferredSupplier) {
                $preferredSupplier = Supplier::where('company_id', $companyId)
                    ->where('status', 'ACTIVE')
                    ->whereIn('qualification_status', ['QUALIFIED', 'CONDITIONAL'])
                    ->first();
            }

            $leadTimeDays = $preferredSupplier ? ($preferredSupplier->agreed_lead_time_days ?? 7) : 7;
            $moq = $preferredSupplier ? (float) ($preferredSupplier->min_order_qty ?? 1) : 1.0;

            // 5. Safety Stock & Reorder Point
            $leadTimeDemand = round($dailyVelocity * $leadTimeDays, 2);
            $safetyStock = max((float) ($product->safety_stock ?? 0), round($leadTimeDemand * 0.5, 2), 5.0);
            $configuredReorder = (float) ($product->reorder_level ?? 0);
            $reorderPoint = max($configuredReorder, round($safetyStock + $leadTimeDemand, 2));

            // 6. Check if reorder triggered
            $needsReorder = ($netAvailable <= $reorderPoint) || ($stockOnHand <= 0);

            if ($needsReorder) {
                $targetCoverageDemand = round($dailyVelocity * $targetCoverageDays, 2);
                $idealTargetStock = $safetyStock + $targetCoverageDemand;
                $rawShortfall = max(0.0, $idealTargetStock - $netAvailable);

                // Apply MOQ
                $suggestedQty = max($rawShortfall, $moq, 1.0);
                $suggestedQty = ceil($suggestedQty);

                // Price resolution
                $priceInfo = $preferredSupplier
                    ? $this->priceService->resolveUnitPrice($companyId, $preferredSupplier->id, $variant->id, $suggestedQty)
                    : ['unit_price' => (float) ($variant->purchase_cost ?? 0), 'source' => 'DEFAULT', 'description' => 'Standard Cost'];

                $estimatedCost = round($suggestedQty * $priceInfo['unit_price'], 4);
                $totalEstimatedSpend += $estimatedCost;

                $urgency = 'MEDIUM';
                if ($stockOnHand <= 0) {
                    $urgency = 'CRITICAL';
                } elseif ($netAvailable <= ($reorderPoint * 0.5)) {
                    $urgency = 'HIGH';
                }

                $reason = "Stock on hand ({$stockOnHand}) + Incoming PO ({$incomingPoQty}) <= Reorder Point ({$reorderPoint}). "
                    . "Sales run rate: {$dailyVelocity} units/day. Shortfall is {$rawShortfall} units for {$targetCoverageDays} days coverage.";

                $recommendations[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'product_code' => $product->item_code ?? $product->sku ?? ('PRD-' . $product->id),
                    'product_variant_id' => $variant->id,
                    'variant_name' => $variant->name ?? 'Default',
                    'variant_sku' => $variant->sku ?? '',
                    'stock_on_hand' => $stockOnHand,
                    'incoming_po_quantity' => $incomingPoQty,
                    'net_available' => $netAvailable,
                    'daily_sales_velocity' => $dailyVelocity,
                    'lead_time_days' => $leadTimeDays,
                    'safety_stock' => $safetyStock,
                    'reorder_point' => $reorderPoint,
                    'moq' => $moq,
                    'recommended_quantity' => $suggestedQty,
                    'unit_cost' => $priceInfo['unit_price'],
                    'price_source' => $priceInfo['source'],
                    'estimated_line_cost' => $estimatedCost,
                    'urgency' => $urgency,
                    'preferred_supplier_id' => $preferredSupplier ? $preferredSupplier->id : null,
                    'preferred_supplier_name' => $preferredSupplier ? $preferredSupplier->name : 'N/A',
                    'reason' => $reason,
                ];
            }
        }

        // Sort by urgency then estimated cost
        $urgencyOrder = ['CRITICAL' => 1, 'HIGH' => 2, 'MEDIUM' => 3, 'LOW' => 4];
        usort($recommendations, function ($a, $b) use ($urgencyOrder) {
            $uA = $urgencyOrder[$a['urgency']] ?? 5;
            $uB = $urgencyOrder[$b['urgency']] ?? 5;
            if ($uA !== $uB) {
                return $uA <=> $uB;
            }
            return $b['estimated_line_cost'] <=> $a['estimated_line_cost'];
        });

        return [
            'warehouse' => [
                'id' => $warehouse->id,
                'name' => $warehouse->name,
                'code' => $warehouse->code ?? '',
            ],
            'summary' => [
                'total_items_analyzed' => $variants->count(),
                'items_needing_reorder' => count($recommendations),
                'total_estimated_spend' => round($totalEstimatedSpend, 2),
                'lookback_days' => $lookbackDays,
                'target_coverage_days' => $targetCoverageDays,
            ],
            'recommendations' => $recommendations,
        ];
    }

    /**
     * Convert selected recommendations into a standard Purchase Requisition in 1 step.
     */
    public function createRequisitionFromRecommendations(
        array $selectedItems,
        int $warehouseId,
        User $user,
        int $companyId,
        ?string $title = null
    ): PurchaseRequisition {
        $reqItems = [];
        foreach ($selectedItems as $item) {
            $reqItems[] = [
                'product_id' => $item['product_id'],
                'product_variant_id' => $item['product_variant_id'],
                'preferred_supplier_id' => $item['preferred_supplier_id'] ?? null,
                'requested_quantity' => $item['recommended_quantity'],
                'estimated_unit_cost' => $item['unit_cost'] ?? 0,
                'notes' => $item['reason'] ?? 'Auto-recommended reorder',
            ];
        }

        $data = [
            'warehouse_id' => $warehouseId,
            'title' => $title ?? ('Replenishment Requisition ' . date('Y-m-d')),
            'priority' => 'HIGH',
            'required_date' => now()->addDays(7)->toDateString(),
            'notes' => 'Generated automatically from Procurement Intelligence Replenishment Engine.',
            'items' => $reqItems,
        ];

        return $this->requisitionService->createRequisition($data, $user, $companyId);
    }
}
