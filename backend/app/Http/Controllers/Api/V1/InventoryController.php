<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\StockMovement;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function __construct(protected InventoryService $inventoryService) {}

    public function index(Request $request): JsonResponse
    {
        $query = Inventory::with(['warehouse', 'product', 'productVariant'])
            ->where('company_id', $request->attributes->get('company_id'));

        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->input('warehouse_id'));
        }
        if ($request->filled('product_id')) {
            $query->where('product_id', $request->input('product_id'));
        }
        if ($request->filled('product_variant_id')) {
            $query->where('product_variant_id', $request->input('product_variant_id'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->whereHas('product', function($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%");
            })->orWhereHas('productVariant', function($q) use ($search) {
                $q->where('sku', 'ilike', "%{$search}%")
                  ->orWhere('variant_name', 'ilike', "%{$search}%");
            });
        }

        $perPage = min((int) $request->input('per_page', 15), 100);
        return response()->json([
            'success' => true,
            'data' => $query->paginate($perPage)
        ]);
    }

    public function openingStock(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_id' => 'required|integer|exists:companies,id',
            'warehouse_id' => 'required|integer|exists:warehouses,id',
            'product_variant_id' => 'required|integer|exists:product_variants,id',
            'quantity' => 'required|numeric|min:0.0001',
            'unit_cost' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $movement = $this->inventoryService->addOpeningStock($data, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Opening stock recorded successfully.',
            'data' => $movement,
        ], 201);
    }

    public function adjustStock(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_id' => 'required|integer|exists:companies,id',
            'warehouse_id' => 'required|integer|exists:warehouses,id',
            'product_variant_id' => 'required|integer|exists:product_variants,id',
            'type' => 'required|in:add,subtract',
            'quantity' => 'required|numeric|min:0.0001',
            'reason' => 'required|string',
            'notes' => 'nullable|string',
        ]);

        $movement = $this->inventoryService->adjustStock($data, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Stock adjusted successfully.',
            'data' => $movement,
        ], 201);
    }

    public function recordDamageLoss(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_id' => 'required|integer|exists:companies,id',
            'warehouse_id' => 'required|integer|exists:warehouses,id',
            'product_variant_id' => 'required|integer|exists:product_variants,id',
            'type' => 'required|in:damage,loss',
            'quantity' => 'required|numeric|min:0.0001',
            'reason' => 'required|string',
            'notes' => 'nullable|string',
        ]);

        $movement = $this->inventoryService->recordDamageLoss($data, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => ucfirst($data['type']) . ' recorded successfully.',
            'data' => $movement,
        ], 201);
    }

    public function movements(Request $request): JsonResponse
    {
        $query = StockMovement::with(['warehouse', 'product', 'productVariant', 'creator'])
            ->where('company_id', $request->attributes->get('company_id'))
            ->latest();

        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->input('warehouse_id'));
        }
        if ($request->filled('product_variant_id')) {
            $query->where('product_variant_id', $request->input('product_variant_id'));
        }
        if ($request->filled('movement_type')) {
            $query->where('movement_type', $request->input('movement_type'));
        }

        $perPage = min((int) $request->input('per_page', 25), 100);
        return response()->json([
            'success' => true,
            'data' => $query->paginate($perPage)
        ]);
    }

    public function lowStock(Request $request): JsonResponse
    {
        // Simple foundation for low stock - joins to products to get reorder level
        $companyId = $request->attributes->get('company_id');
        
        $inventory = Inventory::with(['warehouse', 'product', 'productVariant'])
            ->where('company_id', $companyId)
            ->whereHas('product', function($q) {
                $q->whereColumn('inventories.available_quantity', '<=', 'products.reorder_level');
            })
            ->get();

        return response()->json([
            'success' => true,
            'data' => $inventory
        ]);
    }
}
