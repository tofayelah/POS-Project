<?php

namespace App\Services;

use App\Models\Inventory;
use Illuminate\Support\Collection;

class InventoryValuationService
{
    /**
     * Generate inventory valuation report.
     */
    public function getValuation(int $companyId, array $filters = []): array
    {
        $query = Inventory::with([
            'warehouse',
            'product.category',
            'product.brand',
            'productVariant'
        ])->where('company_id', $companyId);

        if (!empty($filters['warehouse_id'])) {
            $query->where('warehouse_id', $filters['warehouse_id']);
        }

        if (!empty($filters['category_id'])) {
            $query->whereHas('product', function ($q) use ($filters) {
                $q->where('category_id', $filters['category_id']);
            });
        }

        if (!empty($filters['brand_id'])) {
            $query->whereHas('product', function ($q) use ($filters) {
                $q->where('brand_id', $filters['brand_id']);
            });
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->whereHas('product', fn($p) => $p->where('name', 'ilike', "%{$search}%"))
                  ->orWhereHas('productVariant', fn($v) => $v->where('sku', 'ilike', "%{$search}%")->orWhere('variant_name', 'ilike', "%{$search}%"));
            });
        }

        $items = $query->get()->map(function ($inv) {
            $qty = (float) $inv->quantity;
            $unitCost = (float) ($inv->average_cost > 0 ? $inv->average_cost : ($inv->productVariant?->cost_price ?? 0));
            $sellingPrice = (float) ($inv->productVariant?->selling_price ?? $inv->product?->selling_price ?? 0);

            $costValue = round($qty * $unitCost, 4);
            $retailValue = round($qty * $sellingPrice, 4);
            $potentialProfit = round($retailValue - $costValue, 4);

            return [
                'inventory_id' => $inv->id,
                'warehouse_id' => $inv->warehouse_id,
                'warehouse_name' => $inv->warehouse?->name,
                'product_id' => $inv->product_id,
                'product_name' => $inv->product?->name,
                'variant_id' => $inv->product_variant_id,
                'variant_name' => $inv->productVariant?->variant_name,
                'sku' => $inv->productVariant?->sku,
                'category' => $inv->product?->category?->name,
                'brand' => $inv->product?->brand?->name,
                'quantity' => $qty,
                'available_quantity' => (float) $inv->available_quantity,
                'reserved_quantity' => (float) $inv->reserved_quantity,
                'unit_cost' => $unitCost,
                'selling_price' => $sellingPrice,
                'cost_value' => $costValue,
                'retail_value' => $retailValue,
                'potential_profit' => $potentialProfit,
                'margin_percent' => $retailValue > 0 ? round(($potentialProfit / $retailValue) * 100, 2) : 0,
            ];
        });

        $totalUnits = $items->sum('quantity');
        $totalCostValue = round($items->sum('cost_value'), 4);
        $totalRetailValue = round($items->sum('retail_value'), 4);
        $totalPotentialProfit = round($totalRetailValue - $totalCostValue, 4);

        return [
            'summary' => [
                'total_items' => $items->count(),
                'total_units' => $totalUnits,
                'total_cost_value' => $totalCostValue,
                'total_retail_value' => $totalRetailValue,
                'total_potential_profit' => $totalPotentialProfit,
                'average_margin_percent' => $totalRetailValue > 0 ? round(($totalPotentialProfit / $totalRetailValue) * 100, 2) : 0,
            ],
            'items' => $items->values(),
        ];
    }
}
